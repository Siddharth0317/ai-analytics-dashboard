import React, { useState } from 'react';
import { Bot, Sparkles, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { AIInsight } from '../types/telemetry';

interface AIInsightPanelProps {
  insights: AIInsight[];
  onClearInsights: () => void;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  insights,
  onClearInsights
}) => {
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ query: string; response: string }[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    setIsAsking(true);
    const q = userQuery;
    setUserQuery('');

    // Simulate instant streaming LLM response
    setTimeout(() => {
      let resp = `Diagnostic Analysis for query "${q}": Based on current 50,000+ telemetry points, P99 latency is hovering at baseline (42ms) with isolated Z-score deviations (>3.2σ) correlated with high CPU garbage collection pauses. Recommended mitigation: Enable Web Worker offloading for zero-copy binary serialization.`;
      
      if (q.toLowerCase().includes('cpu') || q.toLowerCase().includes('gc')) {
        resp = `CPU Analysis: High CPU load (95%+) detected on worker threads. Main-thread execution remains free at 60 FPS due to OffscreenCanvas rendering. Root cause: High-frequency JSON stringify operations. Fix: Use TypedArrays / ArrayBuffers.`;
      } else if (q.toLowerCase().includes('latency') || q.toLowerCase().includes('spike')) {
        resp = `Latency Spike Investigation: 3 anomalies detected above 3.5σ threshold. P99 latency peaked at 245ms due to database lock contention on secondary read replica node. Action: Triggered connection pool scaling.`;
      }

      setChatHistory(prev => [{ query: q, response: resp }, ...prev]);
      setIsAsking(false);
    }, 600);
  };

  const getSeverityBadge = (impactScore: number) => {
    if (impactScore >= 80) return <span className="badge badge-critical">CRITICAL IMPACT ({impactScore}%)</span>;
    if (impactScore >= 50) return <span className="badge badge-high">HIGH IMPACT ({impactScore}%)</span>;
    if (impactScore >= 30) return <span className="badge badge-medium">MEDIUM IMPACT ({impactScore}%)</span>;
    return <span className="badge badge-low">LOW IMPACT ({impactScore}%)</span>;
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(168, 85, 247, 0.4)'
          }}>
            <Bot size={18} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>
              AI ANOMALY & INSIGHT ENGINE
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Streaming Statistical Deviations (&gt;3σ) & Automated Root-Cause Analysis
            </div>
          </div>
        </div>

        {insights.length > 0 && (
          <button
            onClick={onClearInsights}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: 'rgba(15, 23, 42, 0.4)',
              color: 'var(--text-muted)'
            }}
          >
            Clear Feed
          </button>
        )}
      </div>

      {/* Interactive AI Query Input Bar */}
      <form onSubmit={handleAskAI} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Ask AI Analytics (e.g. 'Explain CPU spike' or 'Check SLA latency')..."
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.85rem',
            color: '#ffffff',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={isAsking}
          style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '0 16px',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={16} /> Ask AI
        </button>
      </form>

      {/* Chat / Query Response Cards */}
      {chatHistory.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {chatHistory.slice(0, 2).map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '8px'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>
                Q: {item.query}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#f8fafc', lineHeight: '1.4' }}>
                {item.response}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streaming Insight Cards List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', maxHeight: '420px' }}>
        {insights.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-dim)',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '8px',
            border: '1px dashed var(--border-color)'
          }}>
            <Sparkles size={32} color="var(--accent-purple)" style={{ marginBottom: '10px', opacity: 0.6 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Monitoring Streaming Telemetry...
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              No statistical anomalies (&gt;3σ) detected. AI Engine is scanning 500+ msg/sec.
            </div>
          </div>
        ) : (
          insights.map(insight => (
            <div
              key={insight.id}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--accent-rose)',
                borderRadius: '8px',
                padding: '14px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} color="#f43f5e" />
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff' }}>
                    {insight.title}
                  </span>
                </div>
                {getSeverityBadge(insight.impactScore)}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.4' }}>
                {insight.summary}
              </p>

              {/* Root Cause Card */}
              <div style={{
                background: 'rgba(7, 10, 18, 0.6)',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '0.78rem'
              }}>
                <div style={{ fontWeight: '700', color: '#fbbf24', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertOctagon size={14} /> AI Root Cause Analysis:
                </div>
                <div style={{ color: '#f8fafc' }}>
                  {insight.rootCause}
                </div>
              </div>

              {/* Recommended Action */}
              <div style={{
                background: 'rgba(52, 211, 153, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                marginBottom: '10px'
              }}>
                <div style={{ fontWeight: '700', color: '#34d399', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> Recommended Remediation:
                </div>
                <div style={{ color: '#f8fafc' }}>
                  {insight.recommendedAction}
                </div>
              </div>

              {/* Footer Meta Tags & Confidence */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {insight.tags.map(t => (
                    <span key={t} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                      #{t}
                    </span>
                  ))}
                </div>
                <span className="font-mono" style={{ color: '#38bdf8' }}>
                  AI Confidence: {(insight.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
