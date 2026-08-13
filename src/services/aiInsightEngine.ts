import type { AnomalyEvent, AIInsight, MetricType } from '../types/telemetry';

// Knowledge base of root causes & remediation actions indexed by metric & severity
const ROOT_CAUSE_TEMPLATES: Record<MetricType, { cause: string; action: string; tags: string[] }[]> = {
  latency: [
    {
      cause: 'Database lock contention & thread pool exhaustion in secondary replica node.',
      action: 'Scale read-replica pool, review connection pool max-lifetime settings, and trigger auto-index optimization.',
      tags: ['Database', 'Thread Lock', 'Latency']
    },
    {
      cause: 'Upstream gateway microservice HTTP socket buffer queue overflow under high concurrency.',
      action: 'Enable HTTP/2 multiplexing and increase edge API gateway backpressure threshold.',
      tags: ['Gateway', 'Network', 'Backpressure']
    }
  ],
  throughput: [
    {
      cause: 'Ingress DDoS / bot traffic surge targeting unthrottled search endpoint.',
      action: 'Activate Rate Limiting Rule #402 and enable Cloudflare Web Application Firewall (WAF) challenge mode.',
      tags: ['Security', 'DDoS', 'Throughput']
    }
  ],
  cpuLoad: [
    {
      cause: 'Garbage Collection (GC) stop-the-world pause triggered by high-frequency JSON payload deserialization on main thread.',
      action: 'Migrate JSON parsing to Web Workers with zero-copy ArrayBuffer transfer buffers.',
      tags: ['Memory GC', 'CPU Spike', 'Optimization']
    }
  ],
  gpuLoad: [
    {
      cause: 'WebGPU / OffscreenCanvas pipeline buffer reallocation stall during viewport resizes.',
      action: 'Pre-allocate static OffscreenCanvas GPU texture buffers and reuse vertex array objects.',
      tags: ['GPU', 'OffscreenCanvas', 'Rendering']
    }
  ],
  errorRate: [
    {
      cause: 'Cascading timeout failures in downstream Auth token validation service.',
      action: 'Trigger circuit-breaker pattern, fallback to cached JWT validation keys.',
      tags: ['Auth', 'CircuitBreaker', 'Failures']
    }
  ],
  modelInference: [
    {
      cause: 'LLM KV-cache memory paging thrashing on CUDA tensor core cluster during parallel multi-turn prompt generation.',
      action: 'Enable PagedAttention vLLM memory management and auto-route requests to idle Tensor Core worker node.',
      tags: ['LLM', 'vLLM', 'TensorCore', 'Inference']
    }
  ]
};

export class AIInsightEngine {
  public static generateInsight(anomaly: AnomalyEvent): AIInsight {
    const templates = ROOT_CAUSE_TEMPLATES[anomaly.metric] || ROOT_CAUSE_TEMPLATES.latency;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const impactScore = Math.min(99, Math.round(anomaly.zScore * 18));
    const confidence = Math.min(0.99, Number((0.85 + anomaly.zScore * 0.02).toFixed(2)));

    const title = `${anomaly.metric.toUpperCase()} Anomaly Detected (${anomaly.zScore}σ Deviation)`;
    const summary = `Statistical anomaly flagged at ${new Date(anomaly.timestamp).toLocaleTimeString()}: ${anomaly.metric} surged to ${anomaly.value} (baseline mean: ${anomaly.mean}, stdDev: ${anomaly.stdDev}).`;

    return {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      anomalyId: anomaly.id,
      timestamp: anomaly.timestamp,
      title,
      summary,
      rootCause: template.cause,
      impactScore,
      recommendedAction: template.action,
      confidence,
      metricsAffected: [anomaly.metric],
      tags: template.tags
    };
  }
}
