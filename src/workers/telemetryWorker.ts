import type { TelemetryPoint } from '../types/telemetry';

let isRunning = false;
let intervalMs = 2; // ~500 msg/sec (every 2ms generates a point, batched every 16ms ~60fps)
let timerId: any = null;
let currentId = 0;
let spikeProbability = 0.02; // 2% chance of spike

// Smooth random walk parameters
let baseLatency = 45;
let baseThroughput = 8500;
let baseCpu = 35;
let baseGpu = 40;
let baseError = 0.2;
let baseInference = 12;

function generatePoint(): TelemetryPoint {
  currentId++;
  const timestamp = Date.now();
  const isSpike = Math.random() < spikeProbability;

  // Random walk drift
  baseLatency += (Math.random() - 0.5) * 2;
  baseLatency = Math.max(10, Math.min(150, baseLatency));

  baseThroughput += (Math.random() - 0.5) * 200;
  baseThroughput = Math.max(2000, Math.min(20000, baseThroughput));

  baseCpu += (Math.random() - 0.5) * 1.5;
  baseCpu = Math.max(10, Math.min(95, baseCpu));

  baseGpu += (Math.random() - 0.5) * 2;
  baseGpu = Math.max(5, Math.min(98, baseGpu));

  baseInference += (Math.random() - 0.5) * 0.8;
  baseInference = Math.max(4, Math.min(80, baseInference));

  let latency = baseLatency + (Math.random() - 0.5) * 5;
  let throughput = baseThroughput + (Math.random() - 0.5) * 300;
  let cpuLoad = baseCpu + (Math.random() - 0.5) * 2;
  let gpuLoad = baseGpu + (Math.random() - 0.5) * 3;
  let errorRate = baseError + (Math.random() - 0.5) * 0.1;
  let modelInference = baseInference + (Math.random() - 0.5) * 2;

  // Inject dramatic statistical anomalies (3.5σ - 5σ) when spike occurs
  if (isSpike) {
    const spikeType = Math.floor(Math.random() * 4);
    if (spikeType === 0) {
      latency *= 4.5 + Math.random() * 2; // Huge latency spike (e.g. 250ms+)
    } else if (spikeType === 1) {
      cpuLoad = Math.min(100, cpuLoad * 2.5 + 30); // CPU maxout
    } else if (spikeType === 2) {
      errorRate += 4.5 + Math.random() * 3; // Error rate jump (5%+)
    } else {
      modelInference *= 5.0; // AI model inference delay spike
    }
  }

  return {
    id: currentId,
    timestamp,
    latency: Number(latency.toFixed(2)),
    throughput: Number(throughput.toFixed(0)),
    cpuLoad: Number(cpuLoad.toFixed(1)),
    gpuLoad: Number(gpuLoad.toFixed(1)),
    memoryUsage: Number((1024 + cpuLoad * 20 + Math.random() * 50).toFixed(0)),
    errorRate: Number(Math.max(0, errorRate).toFixed(2)),
    modelInference: Number(modelInference.toFixed(2))
  };
}

let batchBuffer: TelemetryPoint[] = [];

function tick() {
  if (!isRunning) return;

  // Generate 5-10 points per tick interval to simulate 500-1000 msg/sec
  const pointsPerTick = Math.max(1, Math.floor(16 / intervalMs));
  for (let i = 0; i < pointsPerTick; i++) {
    batchBuffer.push(generatePoint());
  }

  // Post batch to main thread every ~16ms frame boundary
  if (batchBuffer.length > 0) {
    self.postMessage({
      type: 'TELEMETRY_BATCH',
      payload: batchBuffer
    });
    batchBuffer = [];
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'START_STREAM':
      isRunning = true;
      if (payload?.rateHz) {
        intervalMs = Math.max(1, Math.floor(1000 / payload.rateHz));
      }
      if (!timerId) {
        timerId = setInterval(tick, 16);
      }
      break;

    case 'PAUSE_STREAM':
      isRunning = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      break;

    case 'SET_CONFIG':
      if (payload?.rateHz) {
        intervalMs = Math.max(1, Math.floor(1000 / payload.rateHz));
      }
      if (payload?.spikeProb !== undefined) {
        spikeProbability = payload.spikeProb;
      }
      break;

    case 'TRIGGER_BURST':
      // Force immediate burst of 100 anomaly points
      const burstPoints: TelemetryPoint[] = [];
      for (let i = 0; i < 50; i++) {
        const pt = generatePoint();
        pt.latency *= 5.0;
        pt.cpuLoad = 99.5;
        pt.errorRate = 8.2;
        burstPoints.push(pt);
      }
      self.postMessage({
        type: 'TELEMETRY_BATCH',
        payload: burstPoints
      });
      break;
  }
};
