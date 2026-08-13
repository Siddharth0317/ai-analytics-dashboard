import type { TelemetryPoint } from '../types/telemetry';

export class HighPerfRingBuffer {
  private capacity: number;
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private points: TelemetryPoint[];
  
  // High speed typed arrays for rapid statistical calculations
  private timestamps: Float64Array;
  private latencies: Float32Array;
  private throughputs: Float32Array;
  private cpuLoads: Float32Array;
  private gpuLoads: Float32Array;
  private errorRates: Float32Array;
  private modelInferences: Float32Array;

  constructor(capacity: number = 50000) {
    this.capacity = capacity;
    this.points = new Array<TelemetryPoint>(capacity);
    this.timestamps = new Float64Array(capacity);
    this.latencies = new Float32Array(capacity);
    this.throughputs = new Float32Array(capacity);
    this.cpuLoads = new Float32Array(capacity);
    this.gpuLoads = new Float32Array(capacity);
    this.errorRates = new Float32Array(capacity);
    this.modelInferences = new Float32Array(capacity);
  }

  public push(point: TelemetryPoint): void {
    const idx = this.head;
    this.points[idx] = point;
    this.timestamps[idx] = point.timestamp;
    this.latencies[idx] = point.latency;
    this.throughputs[idx] = point.throughput;
    this.cpuLoads[idx] = point.cpuLoad;
    this.gpuLoads[idx] = point.gpuLoad;
    this.errorRates[idx] = point.errorRate;
    this.modelInferences[idx] = point.modelInference;

    this.head = (this.head + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  public pushBatch(points: TelemetryPoint[]): void {
    for (let i = 0; i < points.length; i++) {
      this.push(points[i]);
    }
  }

  public getSize(): number {
    return this.size;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  public getRecent(count: number): TelemetryPoint[] {
    const fetchCount = Math.min(count, this.size);
    const result: TelemetryPoint[] = new Array(fetchCount);
    let curr = (this.head - fetchCount + this.capacity) % this.capacity;

    for (let i = 0; i < fetchCount; i++) {
      result[i] = this.points[curr];
      curr = (curr + 1) % this.capacity;
    }
    return result;
  }

  public getLatest(): TelemetryPoint | null {
    if (this.size === 0) return null;
    const lastIdx = (this.head - 1 + this.capacity) % this.capacity;
    return this.points[lastIdx];
  }

  /**
   * Fast O(N) calculation of mean and stdDev for sliding window
   */
  public computeStats(metric: 'latency' | 'throughput' | 'cpuLoad' | 'gpuLoad' | 'errorRate' | 'modelInference', windowSize: number = 100): { mean: number; stdDev: number } {
    if (this.size === 0) return { mean: 0, stdDev: 0 };
    
    const count = Math.min(windowSize, this.size);
    let arr: Float32Array;
    switch (metric) {
      case 'latency': arr = this.latencies; break;
      case 'throughput': arr = this.throughputs; break;
      case 'cpuLoad': arr = this.cpuLoads; break;
      case 'gpuLoad': arr = this.gpuLoads; break;
      case 'errorRate': arr = this.errorRates; break;
      case 'modelInference': arr = this.modelInferences; break;
    }

    let sum = 0;
    let curr = (this.head - count + this.capacity) % this.capacity;
    for (let i = 0; i < count; i++) {
      sum += arr[curr];
      curr = (curr + 1) % this.capacity;
    }

    const mean = sum / count;

    let varianceSum = 0;
    curr = (this.head - count + this.capacity) % this.capacity;
    for (let i = 0; i < count; i++) {
      const diff = arr[curr] - mean;
      varianceSum += diff * diff;
      curr = (curr + 1) % this.capacity;
    }

    const stdDev = Math.sqrt(varianceSum / count);
    return { mean, stdDev };
  }
}
