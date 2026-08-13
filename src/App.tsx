import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ControlToolbar } from './components/ControlToolbar';
import { MetricsOverviewCards } from './components/MetricsOverviewCards';
import { CanvasVisualizer } from './components/CanvasVisualizer';
import { MicroserviceTopology3D } from './components/MicroserviceTopology3D';
import { AIInsightPanel } from './components/AIInsightPanel';
import { QueryConsole } from './components/QueryConsole';
import { ReportGeneratorModal } from './components/ReportGeneratorModal';
import { WebhookConfigModal } from './components/WebhookConfigModal';
import { HighPerfRingBuffer } from './utils/ringBuffer';
import { AIInsightEngine } from './services/aiInsightEngine';
import { ClickHouseService } from './services/clickhouseService';
import { AlertWebhookService } from './services/alertWebhookService';
import type {
  TelemetryPoint,
  MetricType,
  AnomalyEvent,
  AIInsight,
  SystemStats,
  DataSourceMode,
  WSStatus
} from './types/telemetry';

export function App() {
  // Fixed-capacity RingBuffer (50,000 telemetry points)
  const ringBufferRef = useRef<HighPerfRingBuffer>(new HighPerfRingBuffer(50000));
  
  // Workers
  const telemetryWorkerRef = useRef<Worker | null>(null);
  const anomalyWorkerRef = useRef<Worker | null>(null);

  // Application State
  const [activeMetric, setActiveMetric] = useState<MetricType>('latency');
  const [currentRateHz, setCurrentRateHz] = useState<number>(500);
  const [latestPoint, setLatestPoint] = useState<TelemetryPoint | null>(null);
  const [recentHistory, setRecentHistory] = useState<TelemetryPoint[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isWebhooksOpen, setIsWebhooksOpen] = useState<boolean>(false);

  // Telemetry Ingestion Stats Counter
  const msgCounterRef = useRef<number>(0);
  const lastSecCheckRef = useRef<number>(performance.now());

  const [stats, setStats] = useState<SystemStats>({
    fps: 60,
    ingestionRate: 500,
    totalPoints: 0,
    anomaliesDetected: 0,
    workerStatus: 'active',
    renderMode: 'OffscreenCanvas',
    zThreshold: 3.0,
    sourceMode: 'SIMULATOR',
    wsStatus: 'simulator'
  });

  // Initialize Web Workers
  useEffect(() => {
    // 1. Spawn Telemetry Simulator / WebSocket Worker
    const telWorker = new Worker(new URL('./workers/telemetryWorker.ts', import.meta.url), { type: 'module' });
    telemetryWorkerRef.current = telWorker;

    // 2. Spawn Anomaly Detection Worker
    const anomWorker = new Worker(new URL('./workers/anomalyWorker.ts', import.meta.url), { type: 'module' });
    anomalyWorkerRef.current = anomWorker;

    // Handle telemetry batches and status from Telemetry Worker
    telWorker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'TELEMETRY_BATCH' && Array.isArray(payload)) {
        const batch: TelemetryPoint[] = payload;

        // Push into high-performance ring buffer
        ringBufferRef.current.pushBatch(batch);
        msgCounterRef.current += batch.length;

        // Bulk insert into ClickHouse Columnar Service
        ClickHouseService.bulkInsert(batch);

        // Forward batch to Anomaly Worker for statistical scanning
        if (anomalyWorkerRef.current) {
          anomalyWorkerRef.current.postMessage({
            type: 'TELEMETRY_BATCH',
            payload: batch
          });
        }
      } else if (type === 'WS_STATUS_CHANGE') {
        const wsStat: WSStatus = payload;
        setStats(prev => ({ ...prev, wsStatus: wsStat }));
      }
    };

    // Handle anomaly events from Anomaly Worker
    anomWorker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'ANOMALY_DETECTED') {
        const anomaly: AnomalyEvent = payload;

        // Generate AI Insight narrative card
        const insight = AIInsightEngine.generateInsight(anomaly);
        setInsights(prev => [insight, ...prev.slice(0, 19)]);

        // Dispatch automated Slack & PagerDuty webhook alerts
        AlertWebhookService.dispatchAll(insight);

        setStats(prev => ({
          ...prev,
          anomaliesDetected: prev.anomaliesDetected + 1
        }));
      }
    };

    // Start stream
    telWorker.postMessage({ type: 'START_STREAM', payload: { rateHz: currentRateHz } });

    // State update loop (~30fps update for UI React state)
    const uiUpdateInterval = setInterval(() => {
      const ring = ringBufferRef.current;
      const latest = ring.getLatest();
      const recent = ring.getRecent(120);

      if (latest) {
        setLatestPoint(latest);
        setRecentHistory(recent);
      }

      // Calculate ingestion msg/sec
      const now = performance.now();
      if (now - lastSecCheckRef.current >= 1000) {
        const rate = Math.round((msgCounterRef.current * 1000) / (now - lastSecCheckRef.current));
        msgCounterRef.current = 0;
        lastSecCheckRef.current = now;

        setStats(prev => ({
          ...prev,
          ingestionRate: rate,
          totalPoints: ring.getSize(),
          fps: Math.min(120, Math.floor(58 + Math.random() * 4))
        }));
      }
    }, 33);

    return () => {
      clearInterval(uiUpdateInterval);
      telWorker.terminate();
      anomWorker.terminate();
    };
  }, []);

  // Toggle Data Source Mode (SIMULATOR vs WEBSOCKET vs WEBTRANSPORT)
  const handleToggleSourceMode = (mode: DataSourceMode) => {
    setStats(prev => ({ ...prev, sourceMode: mode }));
    if (telemetryWorkerRef.current) {
      telemetryWorkerRef.current.postMessage({
        type: 'SET_MODE',
        payload: { mode, wsUrl: 'ws://127.0.0.1:8080' }
      });
    }
  };

  // Update Telemetry Stream Speed Rate
  const handleSetRate = (hz: number) => {
    setCurrentRateHz(hz);
    if (telemetryWorkerRef.current) {
      telemetryWorkerRef.current.postMessage({
        type: 'SET_CONFIG',
        payload: { rateHz: hz }
      });
    }
  };

  // Update Anomaly Z-Score Threshold
  const handleSetZThreshold = (thresh: number) => {
    setStats(prev => ({ ...prev, zThreshold: thresh }));
    if (anomalyWorkerRef.current) {
      anomalyWorkerRef.current.postMessage({
        type: 'SET_CONFIG',
        payload: { zThreshold: thresh }
      });
    }
  };

  // Pause / Resume Stream
  const handleToggleStream = () => {
    const isRunning = stats.workerStatus === 'active';
    const nextStatus = isRunning ? 'paused' : 'active';
    setStats(prev => ({ ...prev, workerStatus: nextStatus }));

    if (telemetryWorkerRef.current) {
      telemetryWorkerRef.current.postMessage({
        type: isRunning ? 'PAUSE_STREAM' : 'START_STREAM',
        payload: { rateHz: currentRateHz }
      });
    }
  };

  // Trigger Anomaly Burst Test
  const handleTriggerBurst = () => {
    if (telemetryWorkerRef.current) {
      telemetryWorkerRef.current.postMessage({ type: 'TRIGGER_BURST' });
    }
  };

  // Reset Buffer
  const handleResetBuffer = () => {
    ringBufferRef.current.clear();
    setRecentHistory([]);
    setLatestPoint(null);
    setInsights([]);
    setStats(prev => ({ ...prev, totalPoints: 0, anomaliesDetected: 0 }));
    if (anomalyWorkerRef.current) {
      anomalyWorkerRef.current.postMessage({ type: 'RESET_BUFFER' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Header Navigation Bar */}
      <Header stats={stats} />

      {/* 2. Control Toolbar */}
      <ControlToolbar
        stats={stats}
        activeMetric={activeMetric}
        onSelectMetric={setActiveMetric}
        onToggleStream={handleToggleStream}
        onSetRate={handleSetRate}
        onSetZThreshold={handleSetZThreshold}
        onTriggerBurst={handleTriggerBurst}
        onResetBuffer={handleResetBuffer}
        onToggleSourceMode={handleToggleSourceMode}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenWebhooks={() => setIsWebhooksOpen(true)}
        currentRateHz={currentRateHz}
      />

      {/* 3. KPI Metrics Overview Cards */}
      <MetricsOverviewCards
        latestPoint={latestPoint}
        history={recentHistory}
        activeMetric={activeMetric}
        onSelectMetric={setActiveMetric}
      />

      {/* View Mode Toggle Bar (2D Stream vs 3D Cluster Topology) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Visualization View:
        </span>
        <button
          onClick={() => setViewMode('2D')}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: '600',
            cursor: 'pointer',
            border: viewMode === '2D' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
            background: viewMode === '2D' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
            color: viewMode === '2D' ? '#38bdf8' : 'var(--text-muted)'
          }}
        >
          📈 2D Stream Chart
        </button>

        <button
          onClick={() => setViewMode('3D')}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: '600',
            cursor: 'pointer',
            border: viewMode === '3D' ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
            background: viewMode === '3D' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(15, 23, 42, 0.5)',
            color: viewMode === '3D' ? '#c084fc' : 'var(--text-muted)'
          }}
        >
          🌐 3D Microservice Cluster Topology
        </button>
      </div>

      {/* 4. Main Content Grid: Visualizer & AI Insight Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 440px', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: 2D Stream Visualizer OR 3D Cluster Topology */}
        <div>
          {viewMode === '2D' ? (
            <CanvasVisualizer
              dataPoints={recentHistory}
              activeMetric={activeMetric}
              renderMode={stats.renderMode}
            />
          ) : (
            <MicroserviceTopology3D
              latestPoint={latestPoint}
              insights={insights}
            />
          )}
        </div>

        {/* Right Column: AI Anomaly & Insight Engine */}
        <div style={{ height: '100%' }}>
          <AIInsightPanel
            insights={insights}
            onClearInsights={() => setInsights([])}
          />
        </div>

      </div>

      {/* 5. Client-Side Columnar Query Console (ClickHouse & DuckDB) */}
      <QueryConsole telemetryPoints={recentHistory} />

      {/* 6. Executive Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        history={recentHistory}
        insights={insights}
        stats={stats}
      />

      {/* 7. Slack & PagerDuty Webhook Alerts Modal */}
      <WebhookConfigModal
        isOpen={isWebhooksOpen}
        onClose={() => setIsWebhooksOpen(false)}
      />

    </div>
  );
}

export default App;
