import React, { useEffect, useRef, useState } from 'react';
import { Network, RefreshCw, Flame } from 'lucide-react';
import type { TelemetryPoint, AIInsight } from '../types/telemetry';

interface MicroserviceNode {
  id: string;
  name: string;
  type: 'gateway' | 'auth' | 'database' | 'ai' | 'queue' | 'cache';
  x: number;
  y: number;
  z: number;
  latency: number;
  load: number;
  status: 'healthy' | 'warning' | 'critical';
  connections: string[];
}

interface MicroserviceTopology3DProps {
  latestPoint: TelemetryPoint | null;
  insights: AIInsight[];
  onTriggerBurst?: () => void;
}

export const MicroserviceTopology3D: React.FC<MicroserviceTopology3DProps> = ({
  latestPoint,
  insights,
  onTriggerBurst
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [rotationAngle, setRotationAngle] = useState(0.4);

  // Microservice Cluster Nodes in 3D coordinates
  const nodesRef = useRef<MicroserviceNode[]>([
    { id: 'node_gw', name: 'API Gateway Edge', type: 'gateway', x: 0, y: 1.2, z: 0, latency: 12, load: 42, status: 'healthy', connections: ['node_auth', 'node_ai', 'node_cache'] },
    { id: 'node_auth', name: 'Auth Validation Service', type: 'auth', x: -1.8, y: 0.2, z: -0.8, latency: 18, load: 35, status: 'healthy', connections: ['node_db'] },
    { id: 'node_ai', name: 'vLLM Tensor Core Cluster', type: 'ai', x: 1.8, y: 0.2, z: 0.8, latency: 45, load: 68, status: 'healthy', connections: ['node_db'] },
    { id: 'node_cache', name: 'Redis Cache Cluster', type: 'cache', x: 0, y: -0.8, z: -1.6, latency: 4, load: 22, status: 'healthy', connections: ['node_db'] },
    { id: 'node_db', name: 'ClickHouse Columnar Replica', type: 'database', x: 0, y: -1.2, z: 0.5, latency: 28, load: 54, status: 'healthy', connections: [] },
    { id: 'node_queue', name: 'Kafka Ingestion Queue', type: 'queue', x: -1.2, y: 0.8, z: 1.5, latency: 8, load: 48, status: 'healthy', connections: ['node_gw'] }
  ]);

  // Update node statuses dynamically based on real-time telemetry & anomalies
  useEffect(() => {
    if (!latestPoint) return;
    const isAnomaly = latestPoint.isAnomaly || (latestPoint.zScore && latestPoint.zScore > 3.0);

    nodesRef.current = nodesRef.current.map(node => {
      let lat = latestPoint.latency;
      let load = latestPoint.cpuLoad;
      let status: MicroserviceNode['status'] = 'healthy';

      if (node.type === 'ai') {
        lat = latestPoint.modelInference;
        load = latestPoint.gpuLoad;
      } else if (node.type === 'gateway') {
        lat = Math.round(latestPoint.latency * 0.4);
      }

      if (isAnomaly) {
        status = latestPoint.zScore && latestPoint.zScore >= 4.5 ? 'critical' : 'warning';
      } else if (load > 80 || lat > 100) {
        status = 'warning';
      }

      return { ...node, latency: Math.round(lat), load: Math.round(load), status };
    });
  }, [latestPoint, insights]);

  // 3D Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = rotationAngle;

    const render3D = () => {
      if (!canvas || !ctx) return;

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
      const fov = 300;
      const centerX = width / 2;
      const centerY = height / 2;

      angle += 0.005;

      // Clear
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid Floor in 3D
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gz = -3; gz <= 3; gz += 1) {
        const p1 = project3D(-3, -1.8, gz, angle, fov, centerX, centerY);
        const p2 = project3D(3, -1.8, gz, angle, fov, centerX, centerY);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      const projectedNodes: { node: MicroserviceNode; proj: { x: number; y: number; scale: number } }[] = [];

      // Project 3D Nodes
      nodesRef.current.forEach(node => {
        const proj = project3D(node.x, node.y, node.z, angle, fov, centerX, centerY);
        projectedNodes.push({ node, proj });
      });

      // Draw Connections (Curved Energy Streams)
      ctx.lineWidth = 1.5;
      projectedNodes.forEach(({ node, proj }) => {
        node.connections.forEach(targetId => {
          const target = projectedNodes.find(pn => pn.node.id === targetId);
          if (target) {
            const grad = ctx.createLinearGradient(proj.x, proj.y, target.proj.x, target.proj.y);
            grad.addColorStop(0, node.status === 'critical' ? 'rgba(244,63,94,0.6)' : 'rgba(56,189,248,0.5)');
            grad.addColorStop(1, 'rgba(52,211,153,0.3)');

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            ctx.lineTo(target.proj.x, target.proj.y);
            ctx.stroke();

            // Animated Energy Flow Pulse
            const pulseT = (performance.now() * 0.002) % 1;
            const px = proj.x + (target.proj.x - proj.x) * pulseT;
            const py = proj.y + (target.proj.y - proj.y) * pulseT;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = node.status === 'critical' ? '#f43f5e' : '#38bdf8';
            ctx.fill();
          }
        });
      });

      // Draw 3D Nodes
      projectedNodes.forEach(({ node, proj }) => {
        const radius = Math.max(12, 18 * proj.scale);
        const isCrit = node.status === 'critical';
        const isWarn = node.status === 'warning';

        const color = isCrit ? '#f43f5e' : isWarn ? '#fbbf24' : '#34d399';

        // Outer Glow Aura & Shockwave Ring on Critical Anomaly
        ctx.shadowColor = color;
        ctx.shadowBlur = isCrit ? 25 : 10;

        if (isCrit) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius + Math.sin(performance.now() * 0.01) * 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isCrit ? 'rgba(244, 63, 94, 0.35)' : 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Node Title Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, proj.x, proj.y + radius + 14);

        // Latency Badge
        ctx.fillStyle = isCrit ? '#f43f5e' : 'var(--text-dim)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`${node.latency}ms | ${node.load}%`, proj.x, proj.y + radius + 26);
      });

      animFrameIdRef.current = requestAnimationFrame(render3D);
    };

    animFrameIdRef.current = requestAnimationFrame(render3D);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [rotationAngle]);

  function project3D(x: number, y: number, z: number, angle: number, fov: number, cx: number, cy: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos + 4.5;

    const scale = fov / rz;
    const px = cx + rx * scale * 45;
    const py = cy - y * scale * 45;

    return { x: px, y: py, scale: Math.max(0.4, Math.min(1.6, scale / 65)) };
  }

  return (
    <div className="glass-panel" ref={containerRef} style={{ padding: '16px', marginBottom: '20px', position: 'relative' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={18} color="var(--accent-purple)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ffffff' }}>
            3D Microservice Cluster Topology Graph
          </h2>
          <span className="badge badge-low" style={{ fontSize: '0.68rem', marginLeft: '6px' }}>
            Real-Time 3D Projection Engine
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onTriggerBurst && (
            <button
              onClick={onTriggerBurst}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#f87171',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Flame size={12} /> Inject 3D Anomaly Burst
            </button>
          )}

          <button
            onClick={() => setRotationAngle(r => r + 0.5)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} /> Orbit 3D Camera
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#070a12', height: '380px' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Cluster Legend Overlay */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }}></span>
          <span>Healthy (100% SLA)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></span>
          <span>High Load (&gt;80%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }}></span>
          <span>Critical Anomaly (&gt;3.5σ)</span>
        </div>
      </div>

    </div>
  );
};
