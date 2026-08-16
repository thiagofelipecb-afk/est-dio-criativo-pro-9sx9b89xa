/* =============================================================================
   LUMEN Studio — Segmentação de Pessoa (Selfie Segmentation)
   -----------------------------------------------------------------------------
   Pipeline de recorte da pessoa a partir do frame da câmera, usando
   `@mediapipe/selfie_segmentation` carregado via CDN com dynamic import
   (NUNCA import estático). Se o MediaPipe não estiver disponível, cai para um
   fallback visual (desfoque do elemento de vídeo via CSS) e reporta o status
   apropriado — a pessoa NUNCA é escondida.

   O resultado é uma máscara binária (ImageData RGBA) na resolução do canvas de
   composição, pronta para ser usada pelo compositor em
   `drawPersonMask(ctx, mask, ...)` via `globalCompositeOperation`.

   Status reportados (usados pelo BackgroundPanel):
     - 'loading'      → "Segmentação carregando..."
     - 'ready'        → "Fundo aplicado"
     - 'unavailable'  → "Segmentação indisponível (usando fallback)"
     - 'no-person'    → "Rosto não detectado"
   ========================================================================== */

/** Status da segmentação exibido no painel de Fundo. */
export type SegmentationStatus = 'loading' | 'ready' | 'unavailable' | 'no-person'

/** Saída de um frame de segmentação. */
export interface SegmentationOutput {
  /**
   * Máscara binária (ImageData RGBA) na resolução do canvas de composição.
   * Pixel = branco opaco (rgba 255,255,255,255) onde há pessoa; transparente
   * onde há fundo. `null` quando a segmentação não está disponível (fallback).
   */
  mask: ImageData | null
  /** Status atual do pipeline. */
  status: SegmentationStatus
  /** True quando a máscara foi realmente computada (não fallback). */
  processed: boolean
}

/**
 * Tipo estrutural mínimo esperado do `@mediapipe/selfie_segmentation`.
 * Mantido local para evitar import estático do pacote.
 */
interface SelfieSegmentationLike {
  setOptions(opts: { modelSelection?: 0 | 1; selfieMode?: boolean }): void
  onResults(cb: (res: SelfieSegmentationResults) => void): void
  send(input: { image: CanvasImageSource }): Promise<void> | void
  close?(): void
}

interface SelfieSegmentationResults {
  image: CanvasImageSource
  segmentationMask: CanvasImageSource
}

const SELFIE_SEGMENTATION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js'

/* -----------------------------------------------------------------------------
   Store de status de segmentação (assinável de fora do React).
   O StudioStage atualiza o status a cada frame; o BackgroundPanel assina para
   exibir "Segmentação carregando...", "indisponível", "Rosto não detectado"
   ou "Fundo aplicado".
   ------------------------------------------------------------------------- */
let _status: SegmentationStatus = 'loading'
const _statusListeners = new Set<(s: SegmentationStatus) => void>()

export function setSegmentationStatus(s: SegmentationStatus): void {
  if (s === _status) return
  _status = s
  for (const l of _statusListeners) {
    try {
      l(s)
    } catch {
      /* noop */
    }
  }
}

export function getSegmentationStatus(): SegmentationStatus {
  return _status
}

export function subscribeSegmentationStatus(l: (s: SegmentationStatus) => void): () => void {
  _statusListeners.add(l)
  return () => {
    _statusListeners.delete(l)
  }
}

let modulePromise: Promise<any> | null = null

/**
 * Carrega o `@mediapipe/selfie_segmentation` via CDN (script tag dinâmico) e
 * devolve o construtor. Nunca usa import estático. Em caso de falha (offline,
 * CSP, etc.) rejeita — o chamador trata o fallback.
 */
function loadSelfieSegmentationModule(): Promise<any> {
  if (modulePromise) return modulePromise
  modulePromise = (async () => {
    if (typeof window === 'undefined') throw new Error('no-window')
    const w = window as any
    // Já carregado?
    if (w.SelfieSegmentation) return w.SelfieSegmentation
    // Injeta script tag apontando para o CDN. O bundle UMD expõe
    // `window.SelfieSegmentation`.
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SELFIE_SEGMENTATION_CDN
      s.crossOrigin = 'anonymous'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('segmentation-cdn-failed'))
      document.head.appendChild(s)
    })
    if (!w.SelfieSegmentation) throw new Error('segmentation-not-exposed')
    return w.SelfieSegmentation
  })().catch((e) => {
    modulePromise = null
    throw e
  })
  return modulePromise
}

/**
 * Pipeline de segmentação de pessoa. Uma instância por StudioStage; reutilizada
 * a cada frame. O carregamento do modelo é explícito via `load()` (dinâmico,
 * com try/catch). `processFrame()` é síncrono em relação ao envio do frame e
 * devolve a máscara do último frame computado.
 */
export class SegmentationPipeline {
  private segmenter: SelfieSegmentationLike | null = null
  private loaded = false
  private loading = false
  private available = false
  private lastMask: ImageData | null = null
  /** Canvas auxiliar onde a máscara bruta é rasterizada na resolução alvo. */
  private maskCanvas: HTMLCanvasElement | null = null
  private maskCtx: CanvasRenderingContext2D | null = null
  private maskW = 0
  private maskH = 0
  /** Conta frames sem detecção de pessoa para declarar 'no-person'. */
  private emptyFrames = 0
  private status: SegmentationStatus = 'loading'

  /** Carrega o modelo de segmentação via dynamic import. Idempotente. */
  async load(): Promise<boolean> {
    if (this.loaded) return this.available
    this.loaded = true
    this.loading = true
    this.status = 'loading'
    try {
      const Ctor = await loadSelfieSegmentationModule()
      const seg: SelfieSegmentationLike = new Ctor({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`,
      })
      seg.setOptions({ modelSelection: 1, selfieMode: false })
      seg.onResults((res) => this.handleResults(res))
      this.segmenter = seg
      this.available = true
      this.status = 'ready'
    } catch {
      this.segmenter = null
      this.available = false
      this.status = 'unavailable'
    } finally {
      this.loading = false
    }
    return this.available
  }

  /** Segmentação disponível (modelo carregado com sucesso)? */
  get isAvailable(): boolean {
    return this.available
  }

  /** Status atual exibido no painel. */
  get currentStatus(): SegmentationStatus {
    return this.status
  }

  /** Processa um frame do vídeo. Retorna a máscara (ou null em fallback). */
  async processFrame(
    video: HTMLVideoElement,
    targetW: number,
    targetH: number,
  ): Promise<SegmentationOutput> {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) {
      return { mask: null, status: this.status, processed: false }
    }
    if (!this.available || !this.segmenter) {
      return { mask: null, status: 'unavailable', processed: false }
    }
    // Garante o canvas de máscara na resolução alvo.
    if (!this.maskCanvas || this.maskW !== targetW || this.maskH !== targetH) {
      this.maskCanvas = document.createElement('canvas')
      this.maskCanvas.width = targetW
      this.maskCanvas.height = targetH
      this.maskCtx = this.maskCanvas.getContext('2d')
      this.maskW = targetW
      this.maskH = targetH
    }
    try {
      await this.segmenter.send({ image: video })
    } catch {
      // Erro pontual de inferência — mantém a última máscara.
      return { mask: this.lastMask, status: this.status, processed: !!this.lastMask }
    }
    return {
      mask: this.lastMask,
      status: this.status,
      processed: !!this.lastMask,
    }
  }

  /**
   * Callback do MediaPipe: recebe a máscara de segmentação (CanvasImageSource)
   * e a rasteriza na resolução alvo como um ImageData binário.
   */
  private handleResults(res: SelfieSegmentationResults) {
    const ctx = this.maskCtx
    const canvas = this.maskCanvas
    if (!ctx || !canvas) return
    const W = canvas.width
    const H = canvas.height
    // Limpa e desenha a máscara (escala de cinza) redimensionada para W×H.
    ctx.save()
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(res.segmentationMask, 0, 0, W, H)
    ctx.restore()
    // Converte para binário: pixel > 127 → pessoa (branco opaco).
    let data: Uint8ClampedArray
    try {
      const img = ctx.getImageData(0, 0, W, H)
      data = img.data
    } catch {
      // canvas tainted (CORS) — sem máscara.
      this.lastMask = null
      return
    }
    let personPixels = 0
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] // canal R da máscara em escala de cinza
      const isPerson = v > 127 ? 255 : 0
      data[i] = isPerson
      data[i + 1] = isPerson
      data[i + 2] = isPerson
      data[i + 3] = isPerson ? 255 : 0
      if (isPerson) personPixels++
    }
    // Heurística de "rosto/pessoa não detectada": se a área de pessoa for
    // muito pequena (<0.5% do frame), consideramos sem detecção.
    const ratio = personPixels / (W * H)
    if (ratio < 0.005) {
      this.emptyFrames++
      if (this.emptyFrames > 3) {
        this.status = 'no-person'
        this.lastMask = null
        return
      }
    } else {
      this.emptyFrames = 0
      this.status = 'ready'
    }
    this.lastMask = new ImageData(data, W, H)
  }

  /** Libera recursos do segmentador. */
  dispose(): void {
    try {
      this.segmenter?.close?.()
    } catch {
      /* noop */
    }
    this.segmenter = null
    this.loaded = false
    this.available = false
    this.lastMask = null
    this.maskCanvas = null
    this.maskCtx = null
  }
}
