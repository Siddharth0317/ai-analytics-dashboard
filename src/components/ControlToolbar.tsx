import React from 'react';
import { Play, Pause, Flame, RefreshCw, Sliders, Zap } from 'lucide-react';
import type { MetricType, SystemStats } from '../types/telemetry';

interface ControlToolbarProps {
  stats: SystemStats;
  activeMetric: MetricType;
  onSelectMetric: (metric: MetricType) => void;
  onToggleStream: () => void;
  onSetRate: (hz: number) => void;
  onSetZThreshold: (thresh: number) => void;
  onTriggerBurst: () => void;
  onResetBuffer: () => void;
  currentRateHz: number;
}

const METRICS: { key: MetricType; label: string }[] = [
  { key: 'latency', label: 'P99 Latency' },
  { key: 'throughput', label: 'Throughput' },
  { key: 'cpuLoad', label: 'CPU Load' },
  { key: 'gpuLoad', label: 'GPU Load' },
  { key: 'errorRate', label: 'Error Rate' },
  { key: 'modelInference', label: 'AI Inference' }
];

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  stats,
  activeMetric,
  onSelectMetric,
  onToggleStream,
  onSetRate,
  onSetZThreshold,
  onTriggerBurst,
  onResetBuffer,
  currentRateHz
}) => {
  return (
    <div className="glass-panel" style={{ padding: '12px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Metric Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-dim)', marginRight: '4px', textTransform: 'uppercase' }}>
            Active Metric:
          </span>
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => onSelectMetric(m.key)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                border: activeMetric === m.key ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: activeMetric === m.key ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                color: activeMetric === m.key ? '#38bdf8' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Controls & Stream Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          
          {/* Stream Rate Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.5)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <Zap size={14} color="var(--accent-amber)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Rate:</span>
            {[100, 500, 1000, 2000].map(hz => (
              <button
                key={hz}
                onClick={() => onSetRate(hz)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  background: currentRateHz === hz ? 'var(--accent-amber)' : 'transparent',
                  color: currentRateHz === hz ? '#000000' : 'var(--text-muted)'
                }}
              >
                {hz}Hz
              </button>
            ))}
          </div>

          {/* Anomaly Z-Threshold Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.5)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <Sliders size={14} color="var(--accent-rose)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Z-Score:</span>
            <input
              type="range"
              min="2.5"
              max="4.5"
              step="0.1"
              value={stats.zThreshold}
              onChange={(e) => onSetZThreshold(parseFloat(e.target.value))}
              style={{ width: '60px', accentColor: 'var(--accent-rose)' }}
            />
            <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f87171' }}>
              {stats.zThreshold}σ
            </span>
          </div>

          {/* Burst Test Trigger */}
          <button
            onClick={onTriggerBurst}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Flame size={14} /> Inject Anomaly Burst
          </button>

          {/* Pause / Play Button */}
          <button
            onClick={onToggleStream}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid var(--accent-cyan)',
              background: stats.workerStatus === 'active' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(52, 211, 153, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {stats.workerStatus === 'active' ? (
              <>
                <Pause size={14} color="#38bdf8" /> Pause Stream
              </>
            ) : (
              <>
                <Play size={14} color="#34d399" /> Resume Stream
              </>
            )}
          </button>

          {/* Reset Buffer */}
          <button
            onClick={onResetBuffer}
            title="Reset telemetry buffer"
            style={{
              padding: '6px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: 'rgba(15, 23, 42, 0.4)',
              color: 'var(--text-muted)'
            }}
          >
            <RefreshCw size={14} />
          </button>

        </div>

      </div>
    </div>
  );
};
