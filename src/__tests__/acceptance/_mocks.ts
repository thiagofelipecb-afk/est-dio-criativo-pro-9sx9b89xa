/* =============================================================================
   Mocks compartilhados para os testes de aceite da Gravadora (Seção 19).
   - CanvasRenderingContext2D gravador (registra cada chamada).
   - HTMLCanvasElement com captureStream().
   - MediaStream + MediaStreamTrack falsos.
   - MediaRecorder falso que acumula chunks e dispara onstop.
   - HTMLVideoElement / HTMLImageElement falsos com dimensões.

   Ambiente Vitest: node (sem DOM). Estes mocks evitam jsdom e permitem
   exercitar `drawComposition`/`composeFrame` e o fluxo de gravação de forma
   determinística.
   ========================================================================== */

export interface RecordedCall {
  op: string
  args: number[]
  /** Texto capturado em fillText/strokeText (opcional). */
  text?: string
}

/** Cria um CanvasRenderingContext2D que registra todas as chamadas. */
export function mockCtx() {
  const calls: RecordedCall[] = []
  const ctx = {
    save: () => calls.push({ op: 'save', args: [] }),
    restore: () => calls.push({ op: 'restore', args: [] }),
    clearRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ op: 'clearRect', args: [x, y, w, h] }),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ op: 'fillRect', args: [x, y, w, h] }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    filter: 'none',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowColor: 'rgba(0,0,0,0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    drawImage: (...args: unknown[]) => {
      // drawImage pode ter 3, 5 ou 9 args; normalizamos para números.
      const nums = (args.slice(1) as unknown[]).map((a) =>
        typeof a === 'number' ? a : typeof (a as any)?.width === 'number' ? (a as any).width : 0,
      )
      calls.push({ op: 'drawImage', args: nums })
    },
    beginPath: () => calls.push({ op: 'beginPath', args: [] }),
    rect: (x: number, y: number, w: number, h: number) =>
      calls.push({ op: 'rect', args: [x, y, w, h] }),
    clip: () => calls.push({ op: 'clip', args: [] }),
    translate: (x: number, y: number) => calls.push({ op: 'translate', args: [x, y] }),
    scale: (x: number, y: number) => calls.push({ op: 'scale', args: [x, y] }),
    stroke: () => calls.push({ op: 'stroke', args: [] }),
    fillText: (t: string, x: number, y: number) =>
      calls.push({ op: 'fillText', args: [x, y], text: String(t) }),
    strokeText: (t: string, x: number, y: number) =>
      calls.push({ op: 'strokeText', args: [x, y], text: String(t) }),
    measureText: (t: string) => ({ width: String(t).length * 10 }),
    arcTo: (...a: number[]) => calls.push({ op: 'arcTo', args: a }),
    moveTo: (x: number, y: number) => calls.push({ op: 'moveTo', args: [x, y] }),
    closePath: () => calls.push({ op: 'closePath', args: [] }),
    setLineDash: (d: number[]) => calls.push({ op: 'setLineDash', args: d }),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ op: 'strokeRect', args: [x, y, w, h] }),
    fill: () => calls.push({ op: 'fill', args: [] }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    getImageData: (x: number, y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => {},
  } as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

/** Falso HTMLVideoElement com dimensões de webcam. */
export function fakeVideo(w = 1280, h = 720): HTMLVideoElement {
  return {
    videoWidth: w,
    videoHeight: h,
    readyState: 4,
    currentTime: 0,
    duration: 0,
    muted: true,
    volume: 1,
    play: () => Promise.resolve(),
    pause: () => {},
    load: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLVideoElement
}

/** Falso HTMLImageElement com dimensões naturais. */
export function fakeImage(w = 800, h = 600): HTMLImageElement {
  return {
    naturalWidth: w,
    naturalHeight: h,
    width: w,
    height: h,
    complete: true,
  } as unknown as HTMLImageElement
}

/** Falso HTMLCanvasElement com captureStream(). */
export function fakeCanvas(ctx: CanvasRenderingContext2D, w = 1080, h = 1920) {
  const stream = fakeMediaStream()
  const canvas = {
    width: w,
    height: h,
    getContext: () => ctx,
    captureStream: (_fps?: number) => stream,
    mozCaptureStream: (_fps?: number) => stream,
    toDataURL: () => 'data:image/jpeg;base64,mock',
  } as unknown as HTMLCanvasElement
  return { canvas, stream }
}

/** Falso MediaStreamTrack. */
export function fakeTrack(kind: 'video' | 'audio' = 'video'): MediaStreamTrack {
  return {
    kind,
    id: kind + '-' + Math.random().toString(36).slice(2, 8),
    label: 'mock-' + kind,
    enabled: true,
    muted: false,
    readyState: 'live',
    stop: () => {},
    getSettings: () => ({}),
    getCapabilities: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaStreamTrack
}

/** Falso MediaStream com tracks de vídeo/áudio. */
export function fakeMediaStream(): MediaStream {
  const video = fakeTrack('video')
  const audio = fakeTrack('audio')
  return {
    id: 'stream-' + Math.random().toString(36).slice(2, 8),
    active: true,
    getVideoTracks: () => [video],
    getAudioTracks: () => [audio],
    getTracks: () => [video, audio],
    addTrack: () => {},
    removeTrack: () => {},
    stop: () => {},
  } as unknown as MediaStream
}

/** Estado gravado por um MediaRecorder falso. */
export interface MockRecorderState {
  chunks: Blob[]
  state: 'inactive' | 'recording' | 'paused'
  started: boolean
  stopped: boolean
  ondataavailable: ((e: { data: Blob }) => void) | null
  onstop: (() => void) | null
  onerror: ((e: unknown) => void) | null
  mimeType: string
}

/** Cria um MediaRecorder falso. Retorna o estado e o "constructor". */
export function mockMediaRecorderFactory(): {
  instances: MockRecorderState[]
  MediaRecorder: typeof MediaRecorder
} {
  const instances: MockRecorderState[] = []
  class FakeMediaRecorder {
    state: MockRecorderState['state'] = 'inactive'
    mimeType: string
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    stream: MediaStream
    static isTypeSupported(mime: string) {
      return /webm|mp4/i.test(mime)
    }
    constructor(stream: MediaStream, opts?: { mimeType?: string }) {
      this.stream = stream
      this.mimeType = opts?.mimeType || 'video/webm'
      const st: MockRecorderState = {
        chunks: [],
        state: 'inactive',
        started: false,
        stopped: false,
        ondataavailable: null,
        onstop: null,
        onerror: null,
        mimeType: this.mimeType,
      }
      instances.push(st)
      ;(this as any)._st = st
    }
    start(_ms?: number) {
      const st = (this as any)._st as MockRecorderState
      st.state = 'recording'
      st.started = true
      this.state = 'recording'
      st.ondataavailable = this.ondataavailable
      st.onstop = this.onstop
      st.onerror = this.onerror
    }
    pause() {
      const st = (this as any)._st as MockRecorderState
      st.state = 'paused'
      this.state = 'paused'
    }
    resume() {
      const st = (this as any)._st as MockRecorderState
      st.state = 'recording'
      this.state = 'recording'
    }
    stop() {
      const st = (this as any)._st as MockRecorderState
      st.state = 'inactive'
      st.stopped = true
      this.state = 'inactive'
      // Empurra um chunk e dispara onstop.
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: this.mimeType })
      st.chunks.push(blob)
      this.ondataavailable?.({ data: blob })
      this.onstop?.()
    }
  }
  return { instances, MediaRecorder: FakeMediaRecorder as unknown as typeof MediaRecorder }
}

/** Helpers para inspeção das chamadas gravadas. */
export function callsNamed(calls: RecordedCall[], op: string): RecordedCall[] {
  return calls.filter((c) => c.op === op)
}

export function hasCall(calls: RecordedCall[], op: string): boolean {
  return calls.some((c) => c.op === op)
}

/**
 * Índice da primeira chamada de um tipo. Retorna -1 se não houver.
 */
export function indexOfCall(calls: RecordedCall[], op: string): number {
  return calls.findIndex((c) => c.op === op)
}

/**
 * Configura globals mínimas (window, document, localStorage, AudioContext)
 * para permitir que módulos de produção sejam importados sob ambiente node.
 */
export function ensureBrowserGlobals() {
  const g = globalThis as any
  if (!g.window) g.window = g
  if (!g.document) {
    g.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCtx().ctx,
            captureStream: () => fakeMediaStream(),
            toDataURL: () => 'data:image/jpeg;base64,mock',
          }
        }
        if (tag === 'video') return fakeVideo()
        if (tag === 'img' || tag === 'image') return fakeImage()
        return {}
      },
      body: { appendChild: () => {}, removeChild: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
    }
  }
  if (!g.localStorage) {
    const store: Record<string, string> = {}
    g.localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v)
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
    }
  }
  if (!g.AudioContext) {
    g.AudioContext = class {
      createMediaStreamDestination() {
        return { stream: fakeMediaStream(), connect: () => {} }
      }
      createMediaStreamSource() {
        return { connect: () => {} }
      }
      createMediaElementSource() {
        return { connect: () => {} }
      }
      createGain() {
        return { gain: { value: 1 }, connect: () => {} }
      }
      createAnalyser() {
        return {
          fftSize: 0,
          frequencyBinCount: 0,
          getByteTimeDomainData: () => {},
          connect: () => {},
        }
      }
      close() {}
      resume() {
        return Promise.resolve()
      }
      get currentTime() {
        return 0
      }
      get destination() {
        return {}
      }
    }
  }
  if (!g.requestAnimationFrame) {
    g.requestAnimationFrame = (cb: FrameRequestCallback) => {
      return 0
    }
    g.cancelAnimationFrame = () => {}
  }
  if (!g.Image) g.Image = function () {}
  if (!g.URL) {
    g.URL = {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => {},
    }
  }
}
