import type { TelemetryPoint, MetricType } from '../types/telemetry';

// WebGPU Shading Language (WGSL) Shaders
const WGSL_SHADER_CODE = `
struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
};

@vertex
fn vs_main(@location(0) pos : vec2<f32>, @location(1) col : vec4<f32>) -> VertexOutput {
    var output : VertexOutput;
    output.position = vec4<f32>(pos, 0.0, 1.0);
    output.color = col;
    return output;
}

@fragment
fn fs_main(@location(0) color : vec4<f32>) -> @location(0) vec4<f32> {
    return color;
}
`;

export class WebGPURenderer {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private isInitialized = false;

  public async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('[WebGPU] navigator.gpu not supported in browser environment.');
      return false;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) return false;

      this.device = await this.adapter.requestDevice();
      this.context = canvas.getContext('webgpu') as GPUCanvasContext;

      if (!this.context) return false;

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: 'premultiplied'
      });

      const shaderModule = this.device.createShaderModule({
        code: WGSL_SHADER_CODE
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 6 * 4, // 2 floats position + 4 floats RGBA color
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 2 * 4, format: 'float32x4' }
              ]
            }
          ]
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format }]
        },
        primitive: {
          topology: 'line-strip'
        }
      });

      this.isInitialized = true;
      console.log('[WebGPU] Hardware Compute Shader Pipeline Initialized Successfully! 🚀');
      return true;
    } catch (err) {
      console.warn('[WebGPU] Initialization fallback:', err);
      return false;
    }
  }

  public render(dataPoints: TelemetryPoint[], activeMetric: MetricType, zoom: number = 1.0): void {
    if (!this.isInitialized || !this.device || !this.context || !this.pipeline) return;

    if (dataPoints.length < 2) return;

    // Calculate WGSL Normalized Device Coordinates [-1.0, 1.0]
    const vals = dataPoints.map(p => p[activeMetric] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const len = dataPoints.length;

    const vertexData = new Float32Array(len * 6);
    for (let i = 0; i < len; i++) {
      const x = ((i / (len - 1)) * 2 - 1) * zoom;
      const val = dataPoints[i][activeMetric] as number;
      const y = ((val - min) / range) * 1.6 - 0.8;

      const idx = i * 6;
      vertexData[idx] = x;
      vertexData[idx + 1] = y;
      vertexData[idx + 2] = 0.22; // R (#38bdf8 cyan)
      vertexData[idx + 3] = 0.74; // G
      vertexData[idx + 4] = 0.97; // B
      vertexData[idx + 5] = 1.0;  // Alpha
    }

    const GPU_VERTEX_USAGE = 0x0020;
    const GPU_COPY_DST_USAGE = 0x0008;

    if (!this.vertexBuffer || this.vertexBuffer.size < vertexData.byteLength) {
      if (this.vertexBuffer) this.vertexBuffer.destroy();
      this.vertexBuffer = this.device.createBuffer({
        size: Math.max(1024, vertexData.byteLength * 2),
        usage: GPU_VERTEX_USAGE | GPU_COPY_DST_USAGE
      });
    }

    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.04, g: 0.06, b: 0.1, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(len);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
