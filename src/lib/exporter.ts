/* =============================================================================
   LUMEN Studio — Exportador MP4 (Canvas → MediaRecorder)
   -----------------------------------------------------------------------------
   REGRA OBRIGATÓRIA: cada frame do MP4 é renderizado por `composeFrame` — a
   MESMA função usada pelo preview (StudioStage). NÃO existe lógica duplicada
   de fundo, split, crop, blur, artes, reação, título ou legendas aqui. Toda a
   renderização vive no compositor único (`studio-compositor.ts`).

   O exportador é responsável apenas por:
     - carregar o vídeo bruto e as mídias complementares (caches de <img>/<video>)
     - montar um `StudioComposition` por frame e chamar `composeFrame`
     - gerenciar MediaRecorder, AudioContext, segmentos da timeline, progresso
     - cleanup seguro de recursos (abort/desmonte)
   ========================================================================== */

import type {
  BackgroundConfig,
  BlockArt,
  BlockBRoll,
  BlockMediaAssignment,
  ExportProgress,
  ExportResult,
  MediaAsset,
  ReactionConfig,
  ReactionVideo,
  ScriptBlock,
  StageLayout,
  TimelineState,
  TitleConfig,
  CameraConfigLike,
} from '@/types/studio'
import type {
  AdjustmentsState,
  CaptionTrack,
  EffectsState,
  EditorAudioState,
} from '@/components/studio/editor-types'
import { adjustmentsToCssFilter, effectsToCssFilter } from '@/components/studio/editor-types'
import {
  composeFrame,
  DEFAULT_CAMERA_CROP,
  type CameraCrop,
  type SplitMediaLayer,
  type ArtLayer,
  type BRollLayer,
  type AssignmentLayer,
  type ReactionLayer,
  type StudioComposition,
} from '@/lib/studio-compositor'

/** Canvas alvo 1080×1920 (9:16). */
export const EXPORT_W = 1080
export const EXPORT_H = 1920

/** Codecs candidatos, do melhor para o pior fallback. */
const MP4_CANDIDATES = [
  'video/mp4;codecs=h264,aac',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export interface ExportOptions {
  /** URL (blob: ou http) do vídeo bruto gravado. */
  rawVideoUrl: string
  /** Duração do vídeo bruto em segundos. */
  rawVideoDuration: number
  /** Estado da timeline (segmentos + in/out). */
  timeline: TimelineState
  /** Configuração de fundo. */
  background: BackgroundConfig
  /** Configuração de título. */
  title: TitleConfig
  /** Blocos do roteiro (para identificar bloco ativo por tempo). */
  blocks: ScriptBlock[]
  /** Artes por blockId. */
  artsByBlock: Record<string, BlockArt[]>
  /** B-roll por blockId. */
  brollByBlock: Record<string, BlockBRoll | null>
  /** Vídeo de reação (opcional, modelo legado). */
  reaction?: ReactionVideo | null
  /** Configuração completa do vídeo de reação (novo modelo). */
  reactionConfig?: ReactionConfig | null
  /** FPS alvo (padrão 30). */
  fps?: number
  /**
   * Legado — desfoque de fundo aplicado ao vídeo (0 a 20px). Substituído por
   * `background.blurAmount` (0–100%) no compositor único. Mantido no tipo para
   * compatibilidade com chamadas existentes; NÃO é mais usado na renderização.
   */
  backgroundBlur?: number
  /**
   * NOVO (split screen) — Layout do palco da gravação. Quando é 'split-top'
   * ou 'split-bottom', o vídeo bruto ocupa apenas uma fatia vertical do
   * canvas e a mídia secundária ocupa a outra fatia.
   */
  stageLayout?: StageLayout
  /** NOVO (split screen) — URL da mídia (imagem/vídeo) da outra metade. */
  splitMediaUrl?: string
  /** NOVO (split screen) — Tipo da mídia da outra metade. */
  splitMediaType?: 'image' | 'video'
  /** NOVO (split screen) — Proporção (0–1) da altura da câmera. Padrão 0.6. */
  splitCameraRatio?: number
  /** Zoom digital + pan (1–4x) aplicado ao vídeo da câmera. Padrão 1x. */
  cameraCrop?: CameraCrop
  /** Nome base do projeto para o arquivo. */
  projectName: string
  /** Callback de progresso. */
  onProgress?: (p: ExportProgress) => void
  /** Sinal de cancelamento: retorna true quando o usuário pediu para cancelar. */
  shouldCancel?: () => boolean
  /** Legendas (CaptionTrack) do CaptionPanel — renderizadas no canvas. */
  captions?: CaptionTrack | null
  /** Ajustes de cor (brightness/contrast/...) aplicados via ctx.filter. */
  adjustments?: AdjustmentsState | null
  /** Efeitos visuais (presets de filtro) aplicados via ctx.filter. */
  effects?: EffectsState | null
  /** Estado de áudio do editor (fade in/out, ducking, volume). */
  editorAudio?: EditorAudioState | null
  /** PROMPT 3 — Atribuições de mídia por bloco (BlockMediaAssignment). */
  blockAssignments?: BlockMediaAssignment[]
  /** PROMPT 3 — Assets canônicos da biblioteca (para resolver assetId → URL). */
  mediaAssets?: MediaAsset[]
}

/** Detecta o melhor MIME type suportado pelo navegador. */
export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const c of MP4_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
        return c
      }
    } catch {
      /* noop */
    }
  }
  return null
}

/** Extensão de arquivo conforme o MIME type escolhido. */
export function mimeToExtension(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  return 'mp4'
}

/** Sanitiza nome de projeto para uso em nome de arquivo. */
export function sanitizeFilename(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'projeto'
  )
}

/**
 * Calcula os segmentos efetivos (não excluídos, dentro de in/out) e a
 * duração total resultante.
 */
export function computeEffectiveSegments(
  timeline: TimelineState,
  rawDuration: number,
): { start: number; end: number }[] {
  const inP = Math.max(0, Math.min(timeline.inPoint, rawDuration))
  const outP = Math.max(inP, Math.min(timeline.outPoint, rawDuration))
  const segs: { start: number; end: number }[] = []
  for (const s of timeline.segments) {
    if (s.excluded) continue
    const start = Math.max(s.start, inP)
    const end = Math.min(s.end, outP)
    if (end - start > 0.01) segs.push({ start, end })
  }
  // Se não há segmentos (timeline vazia), usa o intervalo in/out inteiro.
  if (segs.length === 0 && outP - inP > 0.01) {
    segs.push({ start: inP, end: outP })
  }
  return segs
}

/** Duração total resultante após cortes/exclusões. */
export function computeResultDuration(timeline: TimelineState, rawDuration: number): number {
  const segs = computeEffectiveSegments(timeline, rawDuration)
  return segs.reduce((acc, s) => acc + (s.end - s.start), 0)
}

/** Carrega um elemento de vídeo a partir de uma URL. */
function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.src = url
    v.crossOrigin = 'anonymous'
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onloadeddata = () => resolve(v)
    v.onerror = () => reject(new Error('Falha ao carregar o vídeo bruto.'))
  })
}

/** Carrega uma imagem a partir de uma URL/dataURL. */
function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem.'))
    img.src = url
  })
}

/** Identifica o bloco ativo em um determinado tempo do vídeo bruto. */
function findActiveBlock(blocks: ScriptBlock[], rawTime: number): ScriptBlock | null {
  if (blocks.length === 0) return null
  // PROMPT 3 — Quando os blocos não têm timing por bloco, estima
  // totalVideoDuration / numberOfBlocks para mapear currentTime → blockIndex.
  const totalEst = blocks.reduce((acc, b) => acc + (b.estimatedSeconds || 1), 0)
  const perBlock = totalEst / blocks.length
  const idx = Math.min(blocks.length - 1, Math.max(0, Math.floor(rawTime / perBlock)))
  return blocks[idx]
}

/* ===========================================================================
   PROMPT 74-76 / GAP 1 — Cleanup de exportação abandonada.
   Recursos de uma exportação em andamento, mantidos em um holder acessível
   externamente para que abort() possa liberá-los quando o componente que
   disparou a exportação for desmontado.
   =========================================================================== */

interface ExporterResources {
  recorder: MediaRecorder | null
  canvas: HTMLCanvasElement | null
  videoEl: HTMLVideoElement | null
  audioCtx: AudioContext | null
  stream: MediaStream | null
  /** Flag de cancelamento (substitui o antigo `cancelled` local). */
  cancelled: boolean
  /** True após resolve/reject — evita double-settle. */
  settled: boolean
  /** Object URL do resultado (para revogar em abort). */
  resultUrl: string | null
  /** Reject da promise em andamento (para abort manual quando recorder inativo). */
  reject: ((reason?: unknown) => void) | null
}

/** Handle retornado por createVideoExporter: a promise + abort(). */
export interface VideoExporterHandle {
  /** Promise que resolve com o resultado da exportação. */
  promise: Promise<ExportResult>
  /**
   * Aborta a exportação em andamento e libera TODOS os recursos criados
   * (MediaRecorder, canvas, vídeo, AudioContext, tracks e object URLs).
   * Seguro de chamar múltiplas vezes.
   */
  abort: () => void
}

/**
 * Cria uma exportação MP4 controlável de fora. Retorna SINCRONAMENTE um
 * handle com a promise da exportação e um método abort() — para que o
 * componente que disparou a exportação possa cancelá-la e liberar recursos
 * ao ser desmontado, mesmo durante o carregamento do vídeo bruto.
 */
export function createVideoExporter(opts: ExportOptions): VideoExporterHandle {
  const resources: ExporterResources = {
    recorder: null,
    canvas: null,
    videoEl: null,
    audioCtx: null,
    stream: null,
    cancelled: false,
    settled: false,
    resultUrl: null,
    reject: null,
  }

  const abort = () => {
    if (resources.settled) return
    resources.cancelled = true
    // Para o MediaRecorder se ativo (dispara onstop → fluxo de cancelamento).
    try {
      if (resources.recorder && resources.recorder.state !== 'inactive') {
        resources.recorder.stop()
      }
    } catch {
      /* noop */
    }
    // Libera tracks do stream imediatamente.
    try {
      resources.stream?.getTracks().forEach((t) => t.stop())
    } catch {
      /* noop */
    }
    // Pausa e limpa o elemento de vídeo bruto.
    try {
      resources.videoEl?.pause()
    } catch {
      /* noop */
    }
    if (resources.videoEl) {
      try {
        resources.videoEl.src = ''
        resources.videoEl.removeAttribute('src')
        resources.videoEl.load()
      } catch {
        /* noop */
      }
    }
    // Fecha o AudioContext (libera o recurso de áudio do navegador).
    try {
      resources.audioCtx?.close()
    } catch {
      /* noop */
    }
    // Zera o canvas para liberar a memória de framebuffer.
    if (resources.canvas) {
      resources.canvas.width = 0
      resources.canvas.height = 0
    }
    // Revoga object URL do resultado (se já criado).
    if (resources.resultUrl) {
      URL.revokeObjectURL(resources.resultUrl)
      resources.resultUrl = null
    }
    // Se o recorder não estava ativo (ex: ainda carregando vídeo), o onstop
    // não dispara — rejeitamos a promise manualmente para destravar o caller.
    if (!resources.recorder || resources.recorder.state === 'inactive') {
      resources.settled = true
      resources.reject?.(new Error('Exportação cancelada pelo usuário.'))
    }
  }

  const promise = runExport(opts, resources)
  return { promise, abort }
}

/** Wrapper legado: retorna apenas a promise (sem abort). */
export function exportVideo(opts: ExportOptions): Promise<ExportResult> {
  return createVideoExporter(opts).promise
}

/**
 * Executa a exportação MP4 real.
 *
 * Pipeline:
 *  1. Carrega o vídeo bruto em um <video> oculto.
 *  2. Cria um canvas 1080×1920 e captura seu stream via captureStream().
 *  3. Cria MediaRecorder sobre o stream do canvas.
 *  4. Percorre os segmentos efetivos, posicionando o vídeo bruto e
 *     desenhando cada frame no canvas via `composeFrame` (mesma função do
 *     preview) com requestAnimationFrame.
 *  5. Reporta progresso e permite cancelamento seguro.
 *
 * @returns Blob URL do vídeo final + metadados.
 */
async function runExport(opts: ExportOptions, resources: ExporterResources): Promise<ExportResult> {
  const {
    rawVideoUrl,
    rawVideoDuration,
    timeline,
    background,
    title,
    blocks,
    artsByBlock,
    brollByBlock,
    reaction,
    reactionConfig,
    fps = 30,
    stageLayout,
    splitMediaUrl,
    splitMediaType,
    splitCameraRatio,
    cameraCrop,
    projectName,
    onProgress,
    shouldCancel,
    captions,
    adjustments,
    effects,
    editorAudio,
    blockAssignments,
    mediaAssets,
  } = opts

  // CSS filter combinado (ajustes + efeitos) — repassado ao compositor como
  // `cameraFilterOverride`. O compositor aplica ao desenhar a câmera (pessoa).
  const videoFilterCss = [
    adjustments ? adjustmentsToCssFilter(adjustments) : '',
    effects ? effectsToCssFilter(effects) : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Pré-carrega imagens de B-roll (thumbnail) para desenhar durante o render.
  const cachedBrollImages = new Map<string, HTMLImageElement>()
  for (const [blockId, broll] of Object.entries(brollByBlock)) {
    if (broll && broll.thumbnail) {
      try {
        cachedBrollImages.set(blockId, await loadImageElement(broll.thumbnail))
      } catch {
        /* ignora */
      }
    }
    if (broll && broll.url && !cachedBrollImages.has(blockId)) {
      // Tenta carregar a URL do vídeo como imagem — falha graciosamente.
      try {
        cachedBrollImages.set(blockId, await loadImageElement(broll.url))
      } catch {
        /* ignora */
      }
    }
  }

  // Transição entre segmentos (dissolve crossfade).
  const transitionType = effects?.transition || 'none'
  const transitionDuration = Math.max(0.1, effects?.transitionDuration || 0.5)

  // Áudio: setup de gain node para fade in/out e ducking.
  let gainNode: GainNode | null = null
  let analyserNode: AnalyserNode | null = null
  let srcNodeRef: MediaElementAudioSourceNode | null = null
  void srcNodeRef

  const emit = (p: ExportProgress) => onProgress?.(p)

  emit({ phase: 'preparing', percent: 0, message: 'Preparando renderização...' })

  const mimeType = pickSupportedMimeType()
  if (!mimeType) {
    const err = new Error('Seu navegador não suporta MediaRecorder. Use Chrome ou Edge.')
    emit({
      phase: 'error',
      percent: 0,
      message: 'A exportação falhou. Tente usar o Chrome ou Edge.',
      error: err.message,
    })
    throw err
  }

  emit({ phase: 'loading-video', percent: 2, message: 'Carregando vídeo bruto...' })

  const videoEl = await loadVideoElement(rawVideoUrl)
  videoEl.muted = true
  resources.videoEl = videoEl

  // Pré-carrega as artes como imagens para desenhar durante o render.
  const cachedArts = new Map<string, HTMLImageElement>()
  for (const [blockId, arts] of Object.entries(artsByBlock)) {
    for (const art of arts) {
      try {
        const img = await loadImageElement(art.dataUrl)
        cachedArts.set(art.id, img)
      } catch {
        /* ignora arte que não carregou */
      }
    }
    void blockId
  }

  // Pré-carrega a mídia secundária do split screen (apenas imagem).
  let cachedSplitImage: HTMLImageElement | null = null
  if (splitMediaUrl && splitMediaType === 'image') {
    try {
      cachedSplitImage = await loadImageElement(splitMediaUrl)
    } catch {
      cachedSplitImage = null
    }
  }

  // PROMPT 3 — Pré-carrega as imagens das atribuições de mídia por bloco.
  const cachedAssignmentImages = new Map<string, HTMLImageElement>()
  if (blockAssignments && mediaAssets) {
    for (const a of blockAssignments) {
      if (cachedAssignmentImages.has(a.assetId)) continue
      const asset = mediaAssets.find((m) => m.id === a.assetId)
      const url = asset?.publicUrl || asset?.thumbnailUrl
      if (!url) continue
      try {
        cachedAssignmentImages.set(a.assetId, await loadImageElement(url))
      } catch {
        /* ignora */
      }
    }
  }

  // Pré-carrega o vídeo de reação (novo modelo) para drawImage frame-a-frame.
  let reactionVideoEl: HTMLVideoElement | null = null
  if (reactionConfig && reactionConfig.enabled && reactionConfig.assetId && mediaAssets) {
    const reactionAsset = mediaAssets.find((m) => m.id === reactionConfig.assetId)
    const reactionUrl = reactionAsset?.publicUrl || ''
    if (reactionUrl) {
      try {
        reactionVideoEl = await loadVideoElement(reactionUrl)
        reactionVideoEl.muted = true
        // Seek para startOffsetMs.
        if (reactionConfig.startOffsetMs > 0) {
          try {
            reactionVideoEl.currentTime = reactionConfig.startOffsetMs / 1000
          } catch {
            /* noop */
          }
        }
        // Inicia a reprodução (muda para o frame) para o drawImage capturar.
        reactionVideoEl.play().catch(() => {})
      } catch {
        reactionVideoEl = null
      }
    }
  }

  emit({ phase: 'rendering', percent: 5, message: 'Renderizando... 5%' })

  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_W
  canvas.height = EXPORT_H
  resources.canvas = canvas
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do canvas.')
  }

  // Stream do canvas → MediaRecorder.
  const stream = canvas.captureStream(fps)
  resources.stream = stream
  // Tenta incluir o áudio do vídeo bruto.
  let audioStream: MediaStream | null = null
  try {
    const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioCtx = new AC()
    resources.audioCtx = audioCtx
    const dest = audioCtx.createMediaStreamDestination()
    const srcNode = audioCtx.createMediaElementSource(videoEl)
    srcNodeRef = srcNode
    // Gain node — controla volume geral, fades e ducking.
    gainNode = audioCtx.createGain()
    gainNode.gain.value = editorAudio ? Math.max(0, Math.min(1, editorAudio.voiceVolume / 100)) : 1
    // Analyser — usado para detectar fala (ducking).
    if (editorAudio?.ducking) {
      analyserNode = audioCtx.createAnalyser()
      analyserNode.fftSize = 1024
      srcNode.connect(analyserNode)
    }
    srcNode.connect(gainNode)
    gainNode.connect(dest)
    // Não conecta ao ctx.destination (evita eco de preview).
    audioStream = dest.stream
    for (const track of audioStream.getAudioTracks()) {
      stream.addTrack(track)
    }
  } catch {
    /* sem áudio — continua só com vídeo */
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  })
  resources.recorder = recorder
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  const effectiveSegments = computeEffectiveSegments(timeline, rawVideoDuration)
  const totalDuration = effectiveSegments.reduce((acc, s) => acc + (s.end - s.start), 0)

  if (totalDuration <= 0) {
    throw new Error(
      'Nenhum segmento válido para exportar. Verifique os marcadores in/out e os cortes.',
    )
  }

  const filename = `LUMEN_${sanitizeFilename(projectName)}_1080x1920.${mimeToExtension(mimeType)}`

  // Configuração de câmera mínima para o compositor. O filtro CSS combinado
  // (ajustes + efeitos do Editor) é repassado via `cameraFilterOverride`; a
  // vinheta vem do estado de ajustes. Assim o compositor aplica os mesmos
  // efeitos do preview, sem duplicar a lógica de renderização.
  const compositorCamera: CameraConfigLike = {
    brightness: 100,
    contrast: 100,
    beautySmooth: 0,
    vignette: adjustments?.vignette ?? 0,
  }
  const compositorCrop: CameraCrop = cameraCrop ?? DEFAULT_CAMERA_CROP
  const isSplit =
    stageLayout === 'split-top' || stageLayout === 'split-bottom' || stageLayout === 'split'
  const splitLayer: SplitMediaLayer | null =
    isSplit && splitMediaUrl
      ? {
          url: splitMediaUrl,
          type: splitMediaType || 'image',
          cameraRatio: splitCameraRatio ?? 0.6,
        }
      : null

  return new Promise<ExportResult>((resolve, reject) => {
    let currentSegmentIndex = 0
    let elapsedInResult = 0
    let rafId: number | null = null

    // Guarda o reject no holder para que abort() possa rejeitar manualmente
    // quando o recorder ainda não está ativo (fase de carregamento).
    resources.reject = reject

    const settleResolve = (value: ExportResult) => {
      if (resources.settled) return
      resources.settled = true
      resolve(value)
    }
    const settleReject = (reason: unknown) => {
      if (resources.settled) return
      resources.settled = true
      reject(reason as Error)
    }

    const cleanup = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      try {
        recorder.stream.getTracks().forEach((t) => t.stop())
      } catch {
        /* noop */
      }
      try {
        reactionVideoEl?.pause()
      } catch {
        /* noop */
      }
    }

    recorder.onstop = () => {
      if (resources.cancelled) {
        // Descarta o blob parcial — cancelamento seguro.
        emit({
          phase: 'cancelled',
          percent: 0,
          message: 'Exportação cancelada.',
        })
        cleanup()
        settleReject(new Error('Exportação cancelada pelo usuário.'))
        return
      }
      emit({
        phase: 'finalizing',
        percent: 95,
        message: 'Finalizando arquivo...',
      })
      const blob = new Blob(chunks, { type: mimeType })
      const url = URL.createObjectURL(blob)
      resources.resultUrl = url
      // Gera thumbnail do primeiro frame.
      let thumbnail: string | undefined
      try {
        thumbnail = canvas.toDataURL('image/jpeg', 0.7)
      } catch {
        /* noop */
      }
      emit({
        phase: 'done',
        percent: 100,
        message: 'Exportação concluída!',
      })
      cleanup()
      settleResolve({
        url,
        blob,
        duration: totalDuration,
        mimeType,
        filename,
        thumbnail,
      })
    }

    recorder.onerror = (e: any) => {
      const msg = e?.error?.message || 'Erro durante a gravação.'
      emit({
        phase: 'error',
        percent: 0,
        message: 'A exportação falhou. Tente usar o Chrome ou Edge.',
        error: msg,
      })
      cleanup()
      settleReject(new Error(msg))
    }

    // Aplica fades de áudio (gain) de acordo com o tempo resultante.
    const updateAudioGain = (resultTime: number) => {
      if (!gainNode || !editorAudio) return
      const baseVol = Math.max(0, Math.min(1, editorAudio.voiceVolume / 100))
      let gain = baseVol
      // Fade-in
      if (editorAudio.fadeIn > 0 && resultTime < editorAudio.fadeIn) {
        gain *= Math.max(0, resultTime / editorAudio.fadeIn)
      }
      // Fade-out
      if (editorAudio.fadeOut > 0 && resultTime > totalDuration - editorAudio.fadeOut) {
        const remaining = Math.max(0, totalDuration - resultTime)
        gain *= Math.max(0, remaining / editorAudio.fadeOut)
      }
      // Ducking: se houver fala detectada, reduz o volume (simula música baixa).
      // Aqui o gainNode controla o áudio do vídeo (voz), então o ducking só
      // faz sentido se houver música separada — mantemos o gain da voz estável.
      // (A redução de música seria aplicada num segundo gain node de música.)
      try {
        gainNode.gain.value = gain
      } catch {
        /* noop */
      }
    }

    // Detecção de fala para ducking (via analyser).
    const isVoiceActive = (): boolean => {
      if (!analyserNode) return false
      const buf = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      return rms > 0.04 // limiar aproximado de fala
    }
    void isVoiceActive

    const renderFrame = () => {
      if (resources.cancelled) return
      if (shouldCancel && shouldCancel()) {
        resources.cancelled = true
        try {
          recorder.stop()
        } catch {
          /* noop */
        }
        return
      }

      // Segmento atual
      const seg = effectiveSegments[currentSegmentIndex]
      if (!seg) {
        // Fim — para o recorder.
        try {
          recorder.stop()
        } catch {
          /* noop */
        }
        return
      }

      const rawTime = videoEl.currentTime
      const resultTime = elapsedInResult + (rawTime - seg.start)

      // Atualiza áudio (fades / ducking).
      updateAudioGain(resultTime)

      // Se passamos do fim do segmento, avança para o próximo.
      if (rawTime >= seg.end - 0.01) {
        currentSegmentIndex += 1
        elapsedInResult += seg.end - seg.start
        const next = effectiveSegments[currentSegmentIndex]
        if (!next) {
          try {
            recorder.stop()
          } catch {
            /* noop */
          }
          return
        }
        videoEl.currentTime = next.start
        videoEl.play().catch(() => {})
        rafId = requestAnimationFrame(renderFrame)
        return
      }

      // Calcula alpha de transição (dissolve) próximo ao fim do segmento.
      let transitionAlpha = 0 // 0 = sem transição
      if (transitionType === 'dissolve' && currentSegmentIndex < effectiveSegments.length - 1) {
        const remaining = seg.end - rawTime
        if (remaining < transitionDuration) {
          transitionAlpha = 1 - Math.max(0, remaining / transitionDuration)
        }
      }

      // === Renderização do frame ===
      // Cada frame do MP4 é desenhado EXATAMENTE por `composeFrame` — a mesma
      // função do preview. Nenhuma lógica de fundo/split/crop/blur/arte/reação/
      // título/legenda é duplicada aqui. O MP4 é pixel-idêntico ao preview.
      const activeBlock = findActiveBlock(blocks, rawTime)

      // Camada de arte do bloco ativo (primeira arte com imagem carregada).
      let artLayer: ArtLayer | null = null
      if (activeBlock) {
        const arts = artsByBlock[activeBlock.id] || []
        for (const art of arts) {
          const img = cachedArts.get(art.id)
          if (img) {
            artLayer = {
              asset: undefined,
              imageEl: img,
              fit: 'contain',
              positionX: 0.5,
              positionY: 0.5,
              scale: 1,
              backgroundColor: '#000000',
            }
            break
          }
        }
      }

      // Camada de B-roll do bloco ativo.
      let brollLayer: BRollLayer | null = null
      if (activeBlock) {
        const brollImg = cachedBrollImages.get(activeBlock.id) || null
        if (brollImg) brollLayer = { imageEl: brollImg }
      }

      // Atribuições de mídia do bloco ativo (overlays ordenados).
      let assignmentLayers: AssignmentLayer[] = []
      if (activeBlock && blockAssignments && blockAssignments.length > 0) {
        assignmentLayers = blockAssignments
          .filter((a) => a.blockId === activeBlock.id && a.enabled)
          .sort((a, b) => a.order - b.order)
          .map((a) => ({
            imageEl: cachedAssignmentImages.get(a.assetId) || null,
            fit: a.fit,
            positionX: a.positionX,
            positionY: a.positionY,
            scale: a.scale,
            backgroundColor: a.backgroundColor,
          }))
          .filter((a) => a.imageEl)
      }

      // Camada de reação (modelo novo com <video> pré-carregado).
      let reactionLayer: ReactionLayer | null = null
      if (reactionConfig && reactionConfig.enabled && reactionVideoEl) {
        reactionLayer = {
          video: reactionVideoEl,
          scale: reactionConfig.scale,
          position: reactionConfig.position,
          borderRadius: reactionConfig.borderRadius,
          borderWidth: reactionConfig.borderWidth,
          borderColor: reactionConfig.borderColor,
        }
      }
      // Modelo legado (ReactionVideo com dataUrl) não possui <video> pré-carregado
      // aqui; o compositor só suporta o modelo novo. Mantemos `reaction` no tipo
      // para compatibilidade, mas sem renderização duplicada.
      void reaction

      const composition: StudioComposition = {
        layout: stageLayout ?? 'full',
        background,
        camera: compositorCamera,
        cameraCrop: compositorCrop,
        cameraVideo: videoEl,
        cameraFilterOverride: videoFilterCss || undefined,
        split: splitLayer,
        splitMediaEl: cachedSplitImage,
        art: artLayer,
        broll: brollLayer,
        assignments: assignmentLayers.length > 0 ? assignmentLayers : null,
        reaction: reactionLayer,
        title,
        captions: captions ?? null,
        transitionAlpha,
      }
      composeFrame(ctx, EXPORT_W, EXPORT_H, composition, resultTime * 1000)

      // Progresso.
      const done = resultTime
      const percent = Math.min(94, Math.round((done / totalDuration) * 90) + 5)
      emit({
        phase: 'rendering',
        percent,
        message: `Renderizando... ${percent}%`,
      })

      rafId = requestAnimationFrame(renderFrame)
    }

    // Inicia: posiciona o vídeo no início do primeiro segmento.
    const firstSeg = effectiveSegments[0]
    videoEl.currentTime = firstSeg.start
    videoEl.muted = false
    videoEl.volume = 1

    // Inicia a reprodução do vídeo de reação junto com o vídeo bruto.
    if (reactionVideoEl) {
      try {
        if (reactionConfig?.startOffsetMs && reactionConfig.startOffsetMs > 0) {
          reactionVideoEl.currentTime = reactionConfig.startOffsetMs / 1000
        }
        reactionVideoEl.play().catch(() => {})
      } catch {
        /* noop */
      }
    }

    // Quando o seek terminar, inicia o recorder e a reprodução.
    const onSeeked = () => {
      videoEl.removeEventListener('seeked', onSeeked)
      try {
        recorder.start(100)
      } catch (e) {
        settleReject(e)
        return
      }
      videoEl.play().catch(() => {})
      rafId = requestAnimationFrame(renderFrame)
    }
    videoEl.addEventListener('seeked', onSeeked)
  })
}
