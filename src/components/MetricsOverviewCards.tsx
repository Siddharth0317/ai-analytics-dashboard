import React from 'react';
import { Clock, Cpu, Gauge, AlertCircle, Bot, Zap } from 'lucide-react';
import type { TelemetryPoint, MetricType } from '../types/telemetry';

interface MetricsOverviewCardsProps {
  latestPoint: TelemetryPoint | null;
  history: TelemetryPoint[];
  activeMetric: MetricType;
  onSelectMetric: (metric: MetricType) => void;
}

export const MetricsOverviewCards: React.FC<MetricsOverviewCardsProps> = ({
  latestPoint,
  history,
  activeMetric,
  onSelectMetric
}) => {
  if (!latestPoint) return null;

  const cards: {
    key: MetricType;
    title: string;
    value: string;
    unit: string;
    color: string;
    icon: any;
    subtitle: string;
  }[] = [
    {
      key: 'latency',
      title: 'P99 Latency',
      value: `${latestPoint.latency}`,
      unit: 'ms',
      color: '#38bdf8',
      icon: Clock,
      subtitle: 'Avg: 42.5 ms'
    },
    {
      key: 'throughput',
      title: 'Throughput',
      value: `${latestPoint.throughput.toLocaleString()}`,
      unit: 'req/s',
      color: '#34d399',
      icon: Gauge,
      subtitle: 'Peak: 18.5k req/s'
    },
    {
      key: 'cpuLoad',
      title: 'CPU Load',
      value: `${latestPoint.cpuLoad}`,
      unit: '%',
      color: '#fbbf24',
      icon: Cpu,
      subtitle: 'Threads: 32 active'
    },
    {
      key: 'gpuLoad',
      title: 'GPU Utilization',
      value: `${latestPoint.gpuLoad}`,
      unit: '%',
      color: '#c084fc',
      icon: Zap,
      subtitle: 'WebGPU HW Accel'
    },
    {
      key: 'errorRate',
      title: 'Error Rate',
      value: `${latestPoint.errorRate}`,
      unit: '%',
      color: latestPoint.errorRate > 2.0 ? '#f43f5e' : '#a7f3d0',
      icon: AlertCircle,
      subtitle: 'SLA: < 0.50%'
    },
    {
      key: 'modelInference',
      title: 'AI Model Inference',
      value: `${latestPoint.modelInference}`,
      unit: 'ms',
      color: '#f472b6',
      icon: Bot,
      subtitle: 'vLLM Tensor Core'
    }
  ];

  // Helper to render mini SVG sparkline
  const renderSparkline = (key: MetricType, color: string) => {
    if (history.length < 2) return null;
    const recent = history.slice(-25);
    const vals = recent.map(p => p[key] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    const pointsStr = recent
      .map((p, i) => {
        const x = (i / (recent.length - 1)) * 100;
        const y = 30 - (((p[key] as number) - min) / range) * 24 - 3;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width="100%" height="32" viewBox="0 0 100 30" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />
      </svg>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = activeMetric === card.key;

        return (
          <div
            key={card.key}
            onClick={() => onSelectMetric(card.key)}
            className={`glass-panel ${isActive ? 'glass-panel-glow' : ''}`}
            style={{
              padding: '14px 16px',
              cursor: 'pointer',
              borderColor: isActive ? card.color : 'var(--border-color)',
              background: isActive ? 'rgba(30, 41, 59, 0.7)' : 'var(--bg-card)',
              transition: 'transform 0.15s ease, border-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>{card.title}</span>
              <Icon size={16} color={card.color} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
              <span className="font-mono" style={{ fontSize: '1.4rem', fontWeight: '700', color: card.color }}>
                {card.value}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '500' }}>{card.unit}</span>
            </div>

            <div style={{ marginTop: '6px' }}>
              {renderSparkline(card.key, card.color)}
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
};
