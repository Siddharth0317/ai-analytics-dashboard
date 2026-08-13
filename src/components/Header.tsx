import React from 'react';
import { Activity, Zap, AlertTriangle, Database, Radio, Wifi, WifiOff } from 'lucide-react';
import type { SystemStats } from '../types/telemetry';

interface HeaderProps {
  stats: SystemStats;
}

export const Header: React.FC<HeaderProps> = ({ stats }) => {
  const isWs = stats.sourceMode === 'WEBSOCKET';

  return (
    <header className="glass-panel" style={{ padding: '14px 24px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: isWs ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isWs ? '0 0 16px rgba(52, 211, 153, 0.4)' : '0 0 16px rgba(56, 189, 248, 0.4)'
          }}>
            <Zap size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', color: '#ffffff' }}>
                ENTERPRISE AI ANALYTICS
              </h1>
              
              {/* Connection Status Badge */}
              {isWs ? (
                stats.wsStatus === 'connected' ? (
                  <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wifi size={12} color="#34d399" />
                    LIVE WS BACKEND CONNECTED
                  </span>
                ) : stats.wsStatus === 'connecting' ? (
                  <span className="badge badge-medium" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={12} color="#fbbf24" className="animate-pulse-glow" />
                    CONNECTING WS (127.0.0.1:8080)...
                  </span>
                ) : (
                  <span className="badge badge-high" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <WifiOff size={12} color="#f87171" />
                    WS BACKEND OFFLINE (npm run server)
                  </span>
                )
              ) : (
                <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="animate-pulse-glow" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }}></span>
                  SIMULATED STREAM
                </span>
              )}

            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isWs ? 'Connected to WebSocket Telemetry Server (ws://127.0.0.1:8080)' : 'Sub-second Hardware Accelerated Telemetry & Real-Time Anomaly Engine'}
            </p>
          </div>
        </div>

        {/* Real-time Telemetry Metrics Pill Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* FPS Counter */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Activity size={16} color="var(--accent-emerald)" />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Frame Rate</div>
              <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: '600', color: stats.fps >= 55 ? '#4ade80' : '#fbbf24' }}>
                {stats.fps} FPS
              </div>
            </div>
          </div>

          {/* Ingestion Speed */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Zap size={16} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Throughput</div>
              <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#38bdf8' }}>
                {stats.ingestionRate.toLocaleString()} msg/sec
              </div>
            </div>
          </div>

          {/* RingBuffer Capacity */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Database size={16} color="var(--accent-purple)" />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>RingBuffer</div>
              <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#c084fc' }}>
                {stats.totalPoints.toLocaleString()} pts
              </div>
            </div>
          </div>

          {/* Active Anomalies */}
          <div style={{
            background: stats.anomaliesDetected > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(15, 23, 42, 0.6)',
            border: stats.anomaliesDetected > 0 ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} color={stats.anomaliesDetected > 0 ? '#f43f5e' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Anomalies (&gt;{stats.zThreshold}σ)</div>
              <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: '600', color: stats.anomaliesDetected > 0 ? '#f43f5e' : '#f8fafc' }}>
                {stats.anomaliesDetected}
              </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
