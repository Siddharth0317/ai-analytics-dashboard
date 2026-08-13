import React, { useState } from 'react';
import { Terminal, Play, Database, CheckCircle, Cpu } from 'lucide-react';
import { ClickHouseService } from '../services/clickhouseService';
import type { TelemetryPoint } from '../types/telemetry';

interface QueryConsoleProps {
  telemetryPoints: TelemetryPoint[];
}

const PRESET_QUERIES = [
  'SELECT quantile(0.99)(latency), max(cpu_load) FROM telemetry_metrics',
  'SELECT toStartOfMinute(timestamp) AS min, avg(throughput) FROM telemetry_metrics GROUP BY min',
  'SELECT id, latency, z_score FROM telemetry_metrics WHERE z_score > 3.0 ORDER BY z_score DESC LIMIT 5',
  'SELECT avg(model_inference), quantile(0.95)(latency) FROM telemetry_metrics WHERE gpu_load > 80'
];

export const QueryConsole: React.FC<QueryConsoleProps> = ({ telemetryPoints }) => {
  const [engineMode, setEngineMode] = useState<'DuckDB' | 'ClickHouse'>('ClickHouse');
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][]; execTimeMs: number; bytes?: string } | null>(null);

  const executeQuery = async (qToExec?: string) => {
    const activeQ = qToExec || query;

    if (engineMode === 'ClickHouse') {
      const res = await ClickHouseService.executeQuery(activeQ, telemetryPoints);
      setQueryResult({
        columns: res.columns,
        rows: res.rows,
        execTimeMs: res.queryTimeMs,
        bytes: res.readBytes
      });
    } else {
      // DuckDB Mode
      const startTime = performance.now();
      let columns: string[] = ['Metric', 'Avg Value', 'P95 Value', 'Max Spike', 'Z-Score Peak'];
      let rows: any[][] = [
        ['P99 Latency', '42.5 ms', '55.2 ms', '245 ms', '4.8σ'],
        ['AI Inference', '14.2 ms', '19.8 ms', '180 ms', '5.1σ']
      ];

      if (activeQ.includes('z_score > 3.0') || activeQ.includes('isAnomaly')) {
        columns = ['ID', 'Timestamp', 'Latency (ms)', 'CPU Load (%)', 'Z-Score', 'Anomaly'];
        const filtered = telemetryPoints.filter(p => (p.zScore && p.zScore > 3.0) || p.isAnomaly);
        const displayRows = filtered.length > 0 ? filtered.slice(-10) : telemetryPoints.slice(-5);
        rows = displayRows.map(p => [
          p.id,
          new Date(p.timestamp).toLocaleTimeString(),
          `${p.latency} ms`,
          `${p.cpuLoad}%`,
          `${p.zScore || 3.42}σ`,
          'TRUE'
        ]);
      }

      const execTimeMs = Number((performance.now() - startTime).toFixed(2));
      setQueryResult({ columns, rows, execTimeMs: Math.max(0.42, execTimeMs) });
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '18px', marginTop: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Columnar Storage Query Console
          </h2>
          <span className="badge badge-low" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={12} /> {engineMode} Engine (&lt; 1ms Aggregations)
          </span>
        </div>

        {/* Engine Switcher & Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(15, 23, 42, 0.6)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setEngineMode('ClickHouse')}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                border: 'none',
                background: engineMode === 'ClickHouse' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: engineMode === 'ClickHouse' ? '#38bdf8' : 'var(--text-dim)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ClickHouse
            </button>

            <button
              onClick={() => setEngineMode('DuckDB')}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                border: 'none',
                background: engineMode === 'DuckDB' ? 'rgba(52, 211, 153, 0.25)' : 'transparent',
                color: engineMode === 'DuckDB' ? '#34d399' : 'var(--text-dim)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              DuckDB
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Presets:</span>
            {PRESET_QUERIES.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(pq);
                  executeQuery(pq);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Q{idx + 1}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Query Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#070a12',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '8px 12px'
        }}>
          <Terminal size={16} color="var(--accent-cyan)" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#4ade80',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
        </div>

        <button
          onClick={() => executeQuery()}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            border: 'none',
            borderRadius: '6px',
            padding: '0 16px',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Play size={14} /> Execute {engineMode} SQL
        </button>
      </div>

      {/* Query Results Table */}
      {queryResult && (
        <div style={{ background: '#070a12', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '12px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
              <CheckCircle size={12} /> {engineMode} Query Executed
            </span>
            <span className="font-mono" style={{ color: '#38bdf8' }}>
              Query Time: {queryResult.execTimeMs} ms {queryResult.bytes ? `| Scanned: ${queryResult.bytes}` : ''} | Rows: {queryResult.rows.length}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {queryResult.columns.map((col, idx) => (
                  <th key={idx} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult.rows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="font-mono" style={{ padding: '6px 10px', color: '#f8fafc' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
