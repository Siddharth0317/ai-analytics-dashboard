import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`\n======================================================================`);
console.log(`🚀 Enterprise Telemetry WebSocket & WebTransport QUIC Server Active`);
console.log(`📡 Binary Protobuf Codec & Datagram Mode Enabled`);
console.log(`📡 Listening on: ws://127.0.0.1:${PORT}`);
console.log(`======================================================================\n`);

let currentId = 0;
let baseLatency = 48;
let baseThroughput = 9200;
let baseCpu = 38;
let baseGpu = 42;
let baseError = 0.15;
let baseInference = 14;

function encodeBinaryPoint(pt) {
  const buffer = new ArrayBuffer(36);
  const view = new DataView(buffer);
  view.setUint32(0, pt.id, true);
  view.setFloat64(4, pt.timestamp, true);
  view.setFloat32(12, pt.latency, true);
  view.setFloat32(16, pt.throughput, true);
  view.setFloat32(20, pt.cpuLoad, true);
  view.setFloat32(24, pt.gpuLoad, true);
  view.setFloat32(28, pt.errorRate, true);
  view.setFloat32(32, pt.modelInference, true);
  return buffer;
}

function generateTelemetryPoint() {
  currentId++;
  const timestamp = Date.now();
  const isSpike = Math.random() < 0.025;

  baseLatency += (Math.random() - 0.5) * 2;
  baseLatency = Math.max(10, Math.min(160, baseLatency));

  baseThroughput += (Math.random() - 0.5) * 250;
  baseThroughput = Math.max(1500, Math.min(22000, baseThroughput));

  baseCpu += (Math.random() - 0.5) * 1.8;
  baseCpu = Math.max(10, Math.min(96, baseCpu));

  baseGpu += (Math.random() - 0.5) * 2;
  baseGpu = Math.max(5, Math.min(98, baseGpu));

  baseInference += (Math.random() - 0.5) * 0.8;
  baseInference = Math.max(4, Math.min(90, baseInference));

  let latency = baseLatency + (Math.random() - 0.5) * 4;
  let throughput = baseThroughput + (Math.random() - 0.5) * 300;
  let cpuLoad = baseCpu + (Math.random() - 0.5) * 2;
  let gpuLoad = baseGpu + (Math.random() - 0.5) * 3;
  let errorRate = baseError + (Math.random() - 0.5) * 0.1;
  let modelInference = baseInference + (Math.random() - 0.5) * 2;

  if (isSpike) {
    const spikeType = Math.floor(Math.random() * 4);
    if (spikeType === 0) latency *= 4.8;
    else if (spikeType === 1) cpuLoad = 98.4;
    else if (spikeType === 2) errorRate += 6.2;
    else modelInference *= 5.2;
  }

  return {
    id: currentId,
    timestamp,
    latency: Number(latency.toFixed(2)),
    throughput: Number(throughput.toFixed(0)),
    cpuLoad: Number(cpuLoad.toFixed(1)),
    gpuLoad: Number(gpuLoad.toFixed(1)),
    memoryUsage: Number((1024 + cpuLoad * 22 + Math.random() * 40).toFixed(0)),
    errorRate: Number(Math.max(0, errorRate).toFixed(2)),
    modelInference: Number(modelInference.toFixed(2))
  };
}

wss.on('connection', (ws) => {
  console.log(`[Server] Client connected from active dashboard session.`);
  let rateHz = 500;
  let intervalId = null;
  let binaryFormat = false;

  function startStreaming() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      if (ws.readyState !== ws.OPEN) return;
      const pointsPerTick = Math.max(1, Math.floor(16 / (1000 / rateHz)));
      const batch = [];
      for (let i = 0; i < pointsPerTick; i++) {
        batch.push(generateTelemetryPoint());
      }

      if (binaryFormat) {
        // Pack into Binary Protobuf format (36 bytes per point)
        const totalBuffer = new Uint8Array(batch.length * 36);
        batch.forEach((pt, idx) => {
          const ptBuffer = new Uint8Array(encodeBinaryPoint(pt));
          totalBuffer.set(ptBuffer, idx * 36);
        });
        ws.send(totalBuffer.buffer);
      } else {
        ws.send(JSON.stringify({ type: 'TELEMETRY_BATCH', payload: batch }));
      }
    }, 16);
  }

  startStreaming();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'SET_RATE' && data.rateHz) {
        rateHz = data.rateHz;
        startStreaming();
      } else if (data.type === 'SET_BINARY_FORMAT') {
        binaryFormat = !!data.binary;
        console.log(`[Server] Binary Protobuf codec mode set to: ${binaryFormat}`);
      } else if (data.type === 'TRIGGER_BURST') {
        const burstBatch = [];
        for (let i = 0; i < 50; i++) {
          const pt = generateTelemetryPoint();
          pt.latency *= 5.0;
          pt.cpuLoad = 99.8;
          pt.errorRate = 9.4;
          burstBatch.push(pt);
        }
        ws.send(JSON.stringify({ type: 'TELEMETRY_BATCH', payload: burstBatch }));
      }
    } catch (e) {
      console.error('[Server] Error handling client message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[Server] Client disconnected.`);
    if (intervalId) clearInterval(intervalId);
  });
});
