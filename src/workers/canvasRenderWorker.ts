import type { TelemetryPoint, MetricType } from '../types/telemetry';

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let width = 800;
let height = 400;
let activeMetric: MetricType = 'latency';
let dataPoints: TelemetryPoint[] = [];

let frameCount = 0;
let lastFpsCheck = performance.now();
let currentFps = 60;

// Interactive view transform
let zoomLevel = 1.0;
let panOffset = 0;

function drawGrid() {
  if (!ctx) return;
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
}

function getMetricValue(pt: TelemetryPoint, metric: MetricType): number {
  return pt[metric] as number;
}

function render() {
  if (!ctx || !canvas) return;

  // FPS calculation
  frameCount++;
  const now = performance.now();
  if (now - lastFpsCheck >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
    frameCount = 0;
    lastFpsCheck = now;
  }

  // Clear background
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, width, height);

  drawGrid();

  if (dataPoints.length < 2) {
    requestAnimationFrame(render);
    return;
  }

  // Determine min & max range for current metric
  let minVal = Infinity;
  let maxVal = -Infinity;
  const len = dataPoints.length;

  for (let i = 0; i < len; i++) {
    const v = getMetricValue(dataPoints[i], activeMetric);
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

  // Calculate pixel coordinates
  const stepX = (width / (len - 1)) * zoomLevel;
  const startX = width - (len - 1) * stepX + panOffset;

  // Area Fill Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  ctx.beginPath();
  ctx.moveTo(startX, height);

  for (let i = 0; i < len; i++) {
    const x = startX + i * stepX;
    const val = getMetricValue(dataPoints[i], activeMetric);
    const y = height - ((val - minVal) / range) * (height - 40) - 20;

    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.lineTo(startX + (len - 1) * stepX, height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Glow line path
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let i = 0; i < len; i++) {
    const x = startX + i * stepX;
    const val = getMetricValue(dataPoints[i], activeMetric);
    const y = height - ((val - minVal) / range) * (height - 40) - 20;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Reset shadow
  ctx.shadowBlur = 0;

  // Render Anomaly markers
  for (let i = 0; i < len; i++) {
    const pt = dataPoints[i];
    if (pt.isAnomaly || (pt.zScore && pt.zScore > 3.0)) {
      const x = startX + i * stepX;
      const val = getMetricValue(pt, activeMetric);
      const y = height - ((val - minVal) / range) * (height - 40) - 20;

      // Pulsing indicator ring
      ctx.beginPath();
      ctx.arc(x, y, 6 + Math.sin(now * 0.01) * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Draw current FPS overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(width - 120, 10, 110, 26);
  ctx.fillStyle = '#4ade80';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(`FPS: ${currentFps}`, width - 110, 27);

  requestAnimationFrame(render);
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT_CANVAS':
      canvas = payload.canvas;
      width = payload.width;
      height = payload.height;
      if (canvas) {
        ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
        requestAnimationFrame(render);
      }
      break;

    case 'RESIZE':
      width = payload.width;
      height = payload.height;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
      break;

    case 'UPDATE_DATA':
      dataPoints = payload.dataPoints || [];
      activeMetric = payload.activeMetric || activeMetric;
      break;

    case 'SET_METRIC':
      activeMetric = payload;
      break;

    case 'SET_VIEW_TRANSFORM':
      if (payload.zoom !== undefined) zoomLevel = payload.zoom;
      if (payload.pan !== undefined) panOffset = payload.pan;
      break;
  }
};
