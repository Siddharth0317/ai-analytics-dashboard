import type { TelemetryPoint, DataSourceMode, WSStatus } from '../types/telemetry';
import { BinaryProtobufCodec } from '../utils/binaryProtobuf';

let isRunning = false;
let intervalMs = 2; // ~500 msg/sec
let timerId: any = null;
let currentId = 0;
let spikeProbability = 0.02;

let sourceMode: DataSourceMode = 'SIMULATOR';
let wsUrl = 'ws://127.0.0.1:8080';
let socket: WebSocket | null = null;
let reconnectTimer: any = null;

// Smooth random walk parameters (for SIMULATOR mode)
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

  if (isSpike) {
    const spikeType = Math.floor(Math.random() * 4);
    if (spikeType === 0) latency *= 4.5;
    else if (spikeType === 1) cpuLoad = Math.min(100, cpuLoad * 2.5 + 30);
    else if (spikeType === 2) errorRate += 4.5;
    else modelInference *= 5.0;
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

function tickSimulator() {
  if (!isRunning || sourceMode !== 'SIMULATOR') return;

  const pointsPerTick = Math.max(1, Math.floor(16 / intervalMs));
  for (let i = 0; i < pointsPerTick; i++) {
    batchBuffer.push(generatePoint());
  }

  if (batchBuffer.length > 0) {
    self.postMessage({ type: 'TELEMETRY_BATCH', payload: batchBuffer });
    batchBuffer = [];
  }
}

function notifyWsStatus(status: WSStatus) {
  self.postMessage({ type: 'WS_STATUS_CHANGE', payload: status });
}

function connectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }

  notifyWsStatus('connecting');

  try {
    socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      notifyWsStatus('connected');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (sourceMode === 'WEBTRANSPORT') {
        socket?.send(JSON.stringify({ type: 'SET_BINARY_FORMAT', binary: true }));
      }
    };

    socket.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary Protobuf ArrayBuffer Unpacking
        const decodedPoints = BinaryProtobufCodec.decodeBatch(event.data);
        self.postMessage({ type: 'TELEMETRY_BATCH', payload: decodedPoints });
      } else {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TELEMETRY_BATCH' && Array.isArray(data.payload)) {
            self.postMessage({ type: 'TELEMETRY_BATCH', payload: data.payload });
          }
        } catch (err) {
          console.error('[Worker] WS JSON parse error:', err);
        }
      }
    };

    socket.onerror = (err) => {
      console.warn('[Worker] Connection error:', err);
      notifyWsStatus('disconnected');
    };

    socket.onclose = () => {
      notifyWsStatus('disconnected');
      if (sourceMode === 'WEBSOCKET' || sourceMode === 'WEBTRANSPORT') {
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };
  } catch (err) {
    notifyWsStatus('disconnected');
  }
}

function switchMode(newMode: DataSourceMode, targetWsUrl?: string) {
  sourceMode = newMode;
  if (targetWsUrl) wsUrl = targetWsUrl;

  if (sourceMode === 'WEBSOCKET' || sourceMode === 'WEBTRANSPORT') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    connectWebSocket();
  } else {
    if (socket) {
      socket.close();
      socket = null;
    }
    notifyWsStatus('simulator');
    if (isRunning && !timerId) {
      timerId = setInterval(tickSimulator, 16);
    }
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
      if (sourceMode === 'SIMULATOR' && !timerId) {
        timerId = setInterval(tickSimulator, 16);
      } else if ((sourceMode === 'WEBSOCKET' || sourceMode === 'WEBTRANSPORT') && !socket) {
        connectWebSocket();
      }
      break;

    case 'PAUSE_STREAM':
      isRunning = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      if (socket) {
        socket.close();
        socket = null;
      }
      notifyWsStatus('disconnected');
      break;

    case 'SET_MODE':
      switchMode(payload.mode, payload.wsUrl);
      break;

    case 'SET_CONFIG':
      if (payload?.rateHz) {
        intervalMs = Math.max(1, Math.floor(1000 / payload.rateHz));
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'SET_RATE', rateHz: payload.rateHz }));
        }
      }
      if (payload?.spikeProb !== undefined) {
        spikeProbability = payload.spikeProb;
      }
      break;

    case 'TRIGGER_BURST':
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'TRIGGER_BURST' }));
      } else {
        const burstPoints: TelemetryPoint[] = [];
        for (let i = 0; i < 50; i++) {
          const pt = generatePoint();
          pt.latency *= 5.0;
          pt.cpuLoad = 99.5;
          pt.errorRate = 8.2;
          burstPoints.push(pt);
        }
        self.postMessage({ type: 'TELEMETRY_BATCH', payload: burstPoints });
      }
      break;
  }
};
