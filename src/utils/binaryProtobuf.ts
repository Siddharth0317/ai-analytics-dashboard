import type { TelemetryPoint } from '../types/telemetry';

/**
 * High-Speed Binary Protobuf / Datagram Encoder & Decoder
 * Binary Payload Layout (36 bytes fixed size):
 * Offset  0 (uint32) : ID
 * Offset  4 (float64): Timestamp
 * Offset 12 (float32): Latency
 * Offset 16 (float32): Throughput
 * Offset 20 (float32): CpuLoad
 * Offset 24 (float32): GpuLoad
 * Offset 28 (float32): ErrorRate
 * Offset 32 (float32): ModelInference
 */
export class BinaryProtobufCodec {
  public static encodePoint(pt: TelemetryPoint): ArrayBuffer {
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

  public static decodePoint(buffer: ArrayBuffer, offset: number = 0): TelemetryPoint {
    const view = new DataView(buffer, offset, 36);

    const id = view.getUint32(0, true);
    const timestamp = view.getFloat64(4, true);
    const latency = Number(view.getFloat32(12, true).toFixed(2));
    const throughput = Number(view.getFloat32(16, true).toFixed(0));
    const cpuLoad = Number(view.getFloat32(20, true).toFixed(1));
    const gpuLoad = Number(view.getFloat32(24, true).toFixed(1));
    const errorRate = Number(view.getFloat32(28, true).toFixed(2));
    const modelInference = Number(view.getFloat32(32, true).toFixed(2));

    return {
      id,
      timestamp,
      latency,
      throughput,
      cpuLoad,
      gpuLoad,
      memoryUsage: Number((1024 + cpuLoad * 20).toFixed(0)),
      errorRate,
      modelInference
    };
  }

  public static decodeBatch(buffer: ArrayBuffer): TelemetryPoint[] {
    const count = Math.floor(buffer.byteLength / 36);
    const points: TelemetryPoint[] = new Array(count);

    for (let i = 0; i < count; i++) {
      points[i] = this.decodePoint(buffer, i * 36);
    }
    return points;
  }
}
