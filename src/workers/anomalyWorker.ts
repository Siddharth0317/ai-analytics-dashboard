import type { TelemetryPoint, AnomalyEvent, MetricType } from '../types/telemetry';

let zThreshold = 3.0;
const windowSize = 100;

// Metric histories
const metricsHistory: Record<MetricType, number[]> = {
  latency: [],
  throughput: [],
  cpuLoad: [],
  gpuLoad: [],
  errorRate: [],
  modelInference: []
};

function computeStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}

function processPoint(point: TelemetryPoint) {
  const metrics: MetricType[] = ['latency', 'throughput', 'cpuLoad', 'gpuLoad', 'errorRate', 'modelInference'];

  for (const metric of metrics) {
    const val = point[metric] as number;
    const history = metricsHistory[metric];

    if (history.length >= windowSize) {
      const { mean, stdDev } = computeStats(history);

      if (stdDev > 0.001) {
        const zScore = Math.abs((val - mean) / stdDev);

        if (zScore >= zThreshold) {
          let severity: AnomalyEvent['severity'] = 'low';
          if (zScore >= 6.0) severity = 'critical';
          else if (zScore >= 4.5) severity = 'high';
          else if (zScore >= 3.5) severity = 'medium';

          const anomaly: AnomalyEvent = {
            id: `anom_${point.id}_${metric}_${Date.now()}`,
            timestamp: point.timestamp,
            metric,
            value: val,
            mean: Number(mean.toFixed(2)),
            stdDev: Number(stdDev.toFixed(2)),
            zScore: Number(zScore.toFixed(2)),
            threshold: zThreshold,
            severity
          };

          self.postMessage({
            type: 'ANOMALY_DETECTED',
            payload: anomaly
          });
        }
      }

      history.shift();
    }

    history.push(val);
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'TELEMETRY_BATCH' && Array.isArray(payload)) {
    for (const pt of payload) {
      processPoint(pt);
    }
  } else if (type === 'SET_CONFIG') {
    if (payload?.zThreshold) {
      zThreshold = payload.zThreshold;
    }
  } else if (type === 'RESET_BUFFER') {
    for (const key in metricsHistory) {
      metricsHistory[key as MetricType] = [];
    }
  }
};
