export interface TelemetryPoint {
  id: number;
  timestamp: number;
  latency: number;       // ms
  throughput: number;    // req/sec
  cpuLoad: number;       // %
  gpuLoad: number;       // %
  memoryUsage: number;   // MB
  errorRate: number;     // %
  modelInference: number;// ms
  zScore?: number;
  isAnomaly?: boolean;
}

export type MetricType = 'latency' | 'throughput' | 'cpuLoad' | 'gpuLoad' | 'errorRate' | 'modelInference';

export interface AnomalyEvent {
  id: string;
  timestamp: number;
  metric: MetricType;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIInsight {
  id: string;
  anomalyId?: string;
  timestamp: number;
  title: string;
  summary: string;
  rootCause: string;
  impactScore: number; // 0 - 100
  recommendedAction: string;
  confidence: number;  // 0 - 1.0
  metricsAffected: MetricType[];
  tags: string[];
  streaming?: boolean;
}

export interface SystemStats {
  fps: number;
  ingestionRate: number; // msg/sec
  totalPoints: number;
  anomaliesDetected: number;
  workerStatus: 'active' | 'paused' | 'error';
  renderMode: 'OffscreenCanvas' | 'MainThread';
  zThreshold: number;
}

export type WorkerMessageType =
  | 'START_STREAM'
  | 'PAUSE_STREAM'
  | 'SET_CONFIG'
  | 'TELEMETRY_BATCH'
  | 'ANOMALY_DETECTED'
  | 'TRIGGER_BURST'
  | 'RESET_BUFFER';

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: any;
  buffer?: ArrayBuffer;
}
