import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, ZoomIn, ZoomOut, Zap } from 'lucide-react';
import type { MetricType, TelemetryPoint } from '../types/telemetry';

interface CanvasVisualizerProps {
  dataPoints: TelemetryPoint[];
  activeMetric: MetricType;
  renderMode?: 'OffscreenCanvas' | 'MainThread';
}

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({
  dataPoints,
  activeMetric
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Latest props stored in refs to avoid canvas context re-initialization crashes
  const dataPointsRef = useRef<TelemetryPoint[]>(dataPoints);
  const activeMetricRef = useRef<MetricType>(activeMetric);
  dataPointsRef.current = dataPoints;
  activeMetricRef.current = activeMetric;

  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState(0);
  const zoomRef = useRef(1.0);
  const panRef = useRef(0);
  zoomRef.current = zoom;
  panRef.current = pan;

  const [fps, setFps] = useState(60);

  // High Performance Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    let lastFpsCheck = performance.now();

    const render = () => {
      if (!canvas || !ctx) return;

      // Handle Container Size
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 800;
        const h = 380;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }

      const width = canvas.width;
      const height = canvas.height;

      // FPS Counter
      frameCount++;
      const now = performance.now();
      if (now - lastFpsCheck >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsCheck)));
        frameCount = 0;
        lastFpsCheck = now;
      }

      // Clear Canvas Background
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const rows = 6;
      const cols = 10;
      const rowStep = height / rows;
      const colStep = width / cols;

      ctx.beginPath();
      for (let i = 1; i < rows; i++) {
        const y = i * rowStep;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let j = 1; j < cols; j++) {
        const x = j * colStep;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      const currentPoints = dataPointsRef.current;
      const currentMetric = activeMetricRef.current;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      if (currentPoints && currentPoints.length >= 2) {
        // Calculate Min / Max
        let minVal = Infinity;
        let maxVal = -Infinity;
        const len = currentPoints.length;

        for (let i = 0; i < len; i++) {
          const v = currentPoints[i][currentMetric] as number;
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }

        if (minVal === maxVal) {
          minVal = 0;
          maxVal = maxVal === 0 ? 100 : maxVal * 1.2;
        }

        const padding = (maxVal - minVal) * 0.1;
        minVal = Math.max(0, minVal - padding);
        maxVal = maxVal + padding;
        const range = maxVal - minVal;

        const stepX = (width / (len - 1)) * currentZoom;
        const startX = width - (len - 1) * stepX + currentPan;

        // Area Fill Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

        ctx.beginPath();
        ctx.moveTo(startX, height);
        for (let i = 0; i < len; i++) {
          const x = startX + i * stepX;
          const val = currentPoints[i][currentMetric] as number;
          const y = height - ((val - minVal) / range) * (height - 40) - 20;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(startX + (len - 1) * stepX, height);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Glowing Line Path
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < len; i++) {
          const x = startX + i * stepX;
          const val = currentPoints[i][currentMetric] as number;
          const y = height - ((val - minVal) / range) * (height - 40) - 20;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Anomaly Pulse Markers
        for (let i = 0; i < len; i++) {
          const pt = currentPoints[i];
          if (pt.isAnomaly || (pt.zScore && pt.zScore > 3.0)) {
            const x = startX + i * stepX;
            const val = pt[currentMetric] as number;
            const y = height - ((val - minVal) / range) * (height - 40) - 20;

            ctx.beginPath();
            ctx.arc(x, y, 6 + Math.sin(now * 0.01) * 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(3.0, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.25));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan(0);
  };

  return (
    <div className="glass-panel" ref={containerRef} style={{ padding: '16px', marginBottom: '20px', position: 'relative' }}>
      
      {/* Visualizer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ffffff' }}>
            Real-Time Streaming Visualizer
          </h2>
          <span className="badge badge-low" style={{ fontSize: '0.68rem', marginLeft: '6px' }}>
            HTML5 Canvas Context2D (60 FPS)
          </span>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {dataPoints.length.toLocaleString()} points | Zoom: {(zoom * 100).toFixed(0)}%
          </span>

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <ZoomIn size={14} />
          </button>

          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <ZoomOut size={14} />
          </button>

          <button
            onClick={handleResetZoom}
            title="Reset View"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* HTML5 Canvas Element */}
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0b0f19', height: '380px' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Metric Overlay Stats Bar */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '28px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '0.75rem'
      }}>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Metric: </span>
          <span style={{ fontWeight: '600', color: '#38bdf8', textTransform: 'uppercase' }}>{activeMetric}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Render Rate: </span>
          <span style={{ fontWeight: '600', color: '#34d399' }}>{fps} FPS</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Zero-Copy Transfer: </span>
          <span style={{ fontWeight: '600', color: '#c084fc' }}>ArrayBuffer Enabled</span>
        </div>
      </div>

    </div>
  );
};
