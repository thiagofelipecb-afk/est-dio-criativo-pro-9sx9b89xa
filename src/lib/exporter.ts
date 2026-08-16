/* ===========================================================================
   src/lib/exporter.ts — FASE 5
   Pipeline de exportação MP4 real (1080×1920) usando Canvas + MediaRecorder.
   Renderiza frame a frame: vídeo bruto → cortes da timeline → fundo →
   B-roll do bloco ativo → artes → vídeo de reação → título.
   Sem simulações: gera um Blob de vídeo válido para download.
   =========================================================================== */

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
} from '@/types/studio'
import type {
  AdjustmentsState,
  CaptionCue,
  CaptionStyle,
  CaptionTrack,
  EffectsState,
  EditorAudioState,
} from '@/components/studio/editor-types'
import {
  CAPTION_PRESETS,
  adjustmentsToCssFilter,
  effectsToCssFilter,
} from '@/components/studio/editor-types'

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
  /** Vídeo de reação (opcional). */
  reaction?: ReactionVideo | null
  /** Configuração completa do vídeo de reação (novo modelo). */
  reactionConfig?: ReactionConfig | null
  /** FPS alvo (padrão 30). */
  fps?: number
  /** Desfoque de fundo aplicado ao vídeo (0 a 20px). Padrão 0 (sem blur). */
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

/** Desenha o fundo no canvas conforme a configuração. */
async function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  w: number,
  h: number,
  videoEl: HTMLVideoElement | null,
  cachedBgImage: HTMLImageElement | null,
): Promise<HTMLImageElement | null> {
  if (bg.type === 'none') {
    // Fundo padrão preto.
    ctx.fillStyle = '#0B0B10'
    ctx.fillRect(0, 0, w, h)
    return cachedBgImage
  }
  if (bg.type === 'blur' && videoEl) {
    // Desenha o frame do vídeo desfocado como fundo.
    ctx.save()
    ctx.filter = `blur(${(bg.blurAmount ?? 12) * 1.5}px) brightness(0.6)`
    ctx.drawImage(videoEl, 0, 0, w, h)
    ctx.restore()
    return cachedBgImage
  }
  if (bg.type === 'preset') {
    ctx.fillStyle = bg.presetColor || '#1E3A5F'
    ctx.fillRect(0, 0, w, h)
    return cachedBgImage
  }
  if (bg.type === 'image') {
    if (bg.imageDataUrl) {
      let img = cachedBgImage
      if (!img || img.src !== bg.imageDataUrl) {
        try {
          img = await loadImageElement(bg.imageDataUrl!)
        } catch {
          img = null
        }
      }
      if (img) {
        ctx.drawImage(img, 0, 0, w, h)
        return img
      }
    }
    ctx.fillStyle = '#0B0B10'
    ctx.fillRect(0, 0, w, h)
    return cachedBgImage
  }
  ctx.fillStyle = '#0B0B10'
  ctx.fillRect(0, 0, w, h)
  return cachedBgImage
}

/** Desenha o frame do vídeo bruto com enquadramento cover. */
/** Desenha o frame do vídeo bruto com enquadramento cover em um retângulo. */
function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  cover: number,
  mirror: boolean,
): void {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const scale = Math.max(w / vw, h / vh) * (1 + cover)
  const dw = vw * scale
  const dh = vh * scale
  const dx = (w - dw) / 2
  const dy = (h - dh) / 2
  ctx.save()
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, w - dx - dw, dy, dw, dh)
  } else {
    ctx.drawImage(video, dx, dy, dw, dh)
  }
  ctx.restore()
}

/** Desenha o frame do vídeo bruto em cover dentro de um retângulo arbitrário. */
function drawVideoCoverRect(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rect: { x: number; y: number; w: number; h: number },
  mirror: boolean,
): void {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const scale = Math.max(rect.w / vw, rect.h / vh)
  const dw = vw * scale
  const dh = vh * scale
  const dx = rect.x + (rect.w - dw) / 2
  const dy = rect.y + (rect.h - dh) / 2
  ctx.save()
  if (mirror) {
    // Espelha horizontalmente dentro do retângulo (origem no canto sup. esq.).
    ctx.translate(rect.x + rect.w, rect.y)
    ctx.scale(-1, 1)
    // Após a transformação, x=0 corresponde a rect.x+rect.w; desenhamos o
    // vídeo espelhado dentro do retângulo.
    const mx = rect.w - (dx - rect.x) - dw
    ctx.drawImage(video, mx, dy - rect.y, dw, dh)
  } else {
    ctx.drawImage(video, dx, dy, dw, dh)
  }
  ctx.restore()
}

/** Desenha B-roll do bloco ativo. */
function drawBRoll(
  ctx: CanvasRenderingContext2D,
  broll: BlockBRoll | null | undefined,
  w: number,
  h: number,
  cachedBrollImage: HTMLImageElement | null,
): void {
  if (!broll || !broll.url || !cachedBrollImage) return
  // Desenha a imagem/vídeo do B-roll sobre o canvas, cobrindo a área toda.
  ctx.save()
  ctx.globalAlpha = 1
  drawImageCover(ctx, cachedBrollImage, 0, 0, w, h)
  ctx.restore()
}

/** Desenha as artes do bloco ativo. */
function drawArts(
  ctx: CanvasRenderingContext2D,
  arts: BlockArt[] | undefined,
  w: number,
  h: number,
  cachedArts: Map<string, HTMLImageElement>,
): void {
  if (!arts || arts.length === 0) return
  for (const art of arts) {
    let img = cachedArts.get(art.id)
    if (!img) {
      // Carregamento assíncrono seria ideal, mas no pipeline frame-a-frame
      // usamos apenas as artes já carregadas para não travar o render.
      continue
    }
    const maxW = w * 0.8
    const maxH = h * 0.8
    const ratio = Math.min(maxW / img.width, maxH / img.height)
    const dw = img.width * ratio
    const dh = img.height * ratio
    const dx = (w - dw) / 2
    const dy = (h - dh) / 2
    ctx.drawImage(img, dx, dy, dw, dh)
  }
}

/**
 * Desenha o vídeo de reação em um canto (ou split).
 * Aceita tanto o modelo legado (ReactionVideo) quanto o novo (ReactionConfig).
 * O elemento <video> deve estar pré-carregado e em reprodução para que
 * drawImage capture o frame atual.
 */
function drawReaction(
  ctx: CanvasRenderingContext2D,
  reaction: ReactionVideo | null | undefined,
  w: number,
  h: number,
  reactionConfig?: ReactionConfig | null,
  reactionVideoEl?: HTMLVideoElement | null,
): void {
  // Modelo novo: ReactionConfig + elemento <video> pré-carregado.
  if (reactionConfig && reactionConfig.enabled && reactionVideoEl) {
    const vw = reactionVideoEl.videoWidth
    const vh = reactionVideoEl.videoHeight
    if (!vw || !vh) return
    const scale = reactionConfig.scale
    const boxW = w * scale
    const boxH = boxW // quadrado (canto)
    const offset = Math.round(w * 0.015) // ~16px em canvas 1080
    let x = 0
    let y = 0
    switch (reactionConfig.position) {
      case 'top-left':
        x = offset
        y = offset
        break
      case 'top-right':
        x = w - boxW - offset
        y = offset
        break
      case 'bottom-left':
        x = offset
        y = h - boxH - offset
        break
      case 'split': {
        // Metade inferior do canvas.
        const splitH = h * 0.5
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, h - splitH, w, splitH)
        ctx.clip()
        drawVideoCoverRect(
          ctx,
          reactionVideoEl,
          {
            x: 0,
            y: h - splitH,
            w,
            h: splitH,
          },
          false,
        )
        ctx.restore()
        return
      }
      case 'bottom-right':
      default:
        x = w - boxW - offset
        y = h - boxH - offset
    }
    ctx.save()
    // Clip com cantos arredondados.
    const r = Math.min(reactionConfig.borderRadius, boxW / 2, boxH / 2)
    if (r > 0) {
      roundRectPath(ctx, x, y, boxW, boxH, r)
      ctx.clip()
    }
    // Desenha o vídeo em cover dentro da caixa.
    drawVideoCoverRect(ctx, reactionVideoEl, { x, y, w: boxW, h: boxH }, false)
    ctx.restore()
    // Borda (após o vídeo, sem clip).
    if (reactionConfig.borderWidth > 0) {
      ctx.save()
      ctx.strokeStyle = reactionConfig.borderColor
      ctx.lineWidth = reactionConfig.borderWidth
      if (r > 0) {
        roundRectPath(ctx, x, y, boxW, boxH, r)
        ctx.stroke()
      } else {
        ctx.strokeRect(x, y, boxW, boxH)
      }
      ctx.restore()
    }
    return
  }

  // Modelo legado (placeholder).
  if (!reaction || !reaction.dataUrl) return
  const sizePct = reaction.size
  const boxW = w * sizePct
  const boxH = boxW * (16 / 9)
  let x = 0
  let y = 0
  switch (reaction.corner) {
    case 'top-left':
      x = w * 0.02
      y = h * 0.02
      break
    case 'top-right':
      x = w - boxW - w * 0.02
      y = h * 0.02
      break
    case 'bottom-left':
      x = w * 0.02
      y = h - boxH - h * 0.02
      break
    case 'bottom-right':
    default:
      x = w - boxW - w * 0.02
      y = h - boxH - h * 0.02
  }
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(x, y, boxW, boxH)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 4
  ctx.strokeRect(x, y, boxW, boxH)
  ctx.restore()
}

/**
 * NOVO (split screen) — Calcula os retângulos (área da câmera e área da mídia
 * secundária) dentro do canvas 1080×1920 conforme o layout dividido.
 * Retorna null quando o layout NÃO é dividido.
 */
function computeSplitRects(
  layout: StageLayout | undefined,
  ratio: number | undefined,
  w: number,
  h: number,
): {
  camera: { x: number; y: number; w: number; h: number }
  media: { x: number; y: number; w: number; h: number }
} | null {
  const isSplit = layout === 'split-top' || layout === 'split-bottom' || layout === 'split'
  if (!isSplit) return null
  const r = Math.min(0.9, Math.max(0.2, ratio ?? 0.6))
  const camH = Math.round(h * r)
  const medH = h - camH
  if (layout === 'split-bottom') {
    // mídia em cima, câmera embaixo
    return {
      media: { x: 0, y: 0, w, h: medH },
      camera: { x: 0, y: medH, w, h: camH },
    }
  }
  // split-top (e legado 'split'): câmera em cima, mídia embaixo
  return {
    camera: { x: 0, y: 0, w, h: camH },
    media: { x: 0, y: camH, w, h: medH },
  }
}

/** Desenha uma imagem com cover dentro de um retângulo. */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

/** NOVO (split screen) — Desenha a mídia secundária (imagem) na metade não-câmera. */
function drawSplitMediaImage(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  img: HTMLImageElement | null,
) {
  ctx.save()
  ctx.fillStyle = '#0B0B10'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.restore()
  if (img) drawImageCover(ctx, img, rect.x, rect.y, rect.w, rect.h)
}

/** Resolve o CaptionStyle a partir do preset da track ou da cue. */
function resolveCaptionStyle(
  track: CaptionTrack | null | undefined,
  cue: CaptionCue,
): CaptionStyle {
  const presetId = cue.style || track?.preset || 'clean-center'
  const preset = CAPTION_PRESETS.find((p) => p.id === presetId)
  return preset ? { ...preset.style } : { ...CAPTION_PRESETS[0].style }
}

/** Quebra o texto em linhas respeitando o maxWidth (px). */
function wrapCaptionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidthPx && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Calcula a posição Y (topo do bloco de texto) conforme o alinhamento vertical. */
function captionVerticalY(style: CaptionStyle, blockHeight: number, h: number): number {
  switch (style.vertical) {
    case 'top':
      return h * 0.06
    case 'middle':
      return (h - blockHeight) / 2
    case 'bottom':
    default:
      return h - blockHeight - h * 0.1
  }
}

/**
 * Desenha as legendas no canvas. Percorre as cues da CaptionTrack e desenha
 * aquela cujo intervalo [startTime, endTime] contém o tempo resultante atual.
 * Aplica estilo (fonte, cor, fundo, contorno, sombra), animação e posição.
 */
function drawCaptions(
  ctx: CanvasRenderingContext2D,
  track: CaptionTrack | null | undefined,
  resultTime: number,
  w: number,
  h: number,
): void {
  if (!track || !track.cues || track.cues.length === 0) return
  // Usa o tempo resultante (do vídeo editado) — as cues do CaptionPanel são
  // timeline-space; como o editor só tem um clipe principal, resultTime ≈ raw.
  const cue = track.cues.find((c) => resultTime >= c.startTime && resultTime <= c.endTime)
  if (!cue) return

  const style = resolveCaptionStyle(track, cue)
  const animation = cue.animation || track.preset || 'fade'
  const pos = cue.position // {x,y} normalizado ou undefined

  // Progresso dentro da cue para animações.
  const cueDur = Math.max(0.01, cue.endTime - cue.startTime)
  const cueProgress = Math.max(0, Math.min(1, (resultTime - cue.startTime) / cueDur))

  // Fonte
  const fontPx = (style.fontSize / 1080) * w
  const weight = style.fontWeight
  const family = style.fontFamily || 'Inter'
  ctx.save()
  ctx.font = `${weight} ${fontPx}px ${family}, Arial, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = style.align as CanvasTextAlign

  // Texto (caixa alta opcional)
  let text = cue.text || ''
  if (style.uppercase) text = text.toUpperCase()

  // Largura máxima
  const maxWidthPx = (style.maxWidth / 100) * w
  const lines = wrapCaptionText(ctx, text, maxWidthPx).slice(0, style.lines || 2)
  const lineHeight = fontPx * (style.lineHeight || 1.2)
  const blockHeight = lines.length * lineHeight

  // Posição X/Y (normalizada). Default: centralizado horizontalmente e base.
  const cx = pos ? pos.x : 0.5
  let cyN = pos ? pos.y : undefined
  if (cyN === undefined) {
    // usa vertical preset
    const topY = captionVerticalY(style, blockHeight, h)
    cyN = (topY + blockHeight / 2) / h
  }

  // Alvo Y do centro do bloco
  const centerY = cyN * h
  const topY = centerY - blockHeight / 2

  // Animações — calculam alpha/offset/scale.
  let alpha = Math.min(1, style.opacity / 100)
  let offsetY = 0
  let scale = 1
  if (animation === 'fade') {
    const fade = 0.12
    if (cueProgress < fade) alpha *= cueProgress / fade
    else if (cueProgress > 1 - fade) alpha *= (1 - cueProgress) / fade
  } else if (animation === 'pop') {
    const p = Math.min(1, cueProgress / 0.15)
    scale = 0.7 + 0.3 * p
  } else if (animation === 'bounce') {
    const p = cueProgress
    offsetY = Math.sin(p * Math.PI) * fontPx * 0.3
  } else if (animation === 'slide') {
    const p = Math.min(1, cueProgress / 0.18)
    offsetY = (1 - p) * fontPx * 0.6
    alpha *= p
  } else if (animation === 'typewriter') {
    const total = text.length
    const visible = Math.floor(cueProgress * total)
    if (visible < total) text = text.slice(0, visible)
  }
  alpha = Math.max(0, Math.min(1, alpha))

  ctx.globalAlpha = alpha
  ctx.translate(0, offsetY)
  if (scale !== 1) {
    ctx.translate(cx * w, centerY)
    ctx.scale(scale, scale)
    ctx.translate(-cx * w, -centerY)
  }

  // Posição X do texto conforme alinhamento.
  let xAnchor: number
  if (style.align === 'left') {
    xAnchor = cx * w - maxWidthPx / 2
  } else if (style.align === 'right') {
    xAnchor = cx * w + maxWidthPx / 2
  } else {
    xAnchor = cx * w
  }

  const pad = (style.padding / 1080) * w
  const radius = (style.borderRadius / 1080) * w

  // Desenha cada linha
  let y = topY
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const metrics = ctx.measureText(ln)
    const tw = metrics.width

    // Fundo
    if (style.background && style.background !== 'transparent') {
      let bgX: number
      if (style.align === 'left') bgX = xAnchor - pad
      else if (style.align === 'right') bgX = xAnchor - tw - pad
      else bgX = xAnchor - tw / 2 - pad
      const bgY = y - pad / 2
      const bgW = tw + pad * 2
      const bgH = lineHeight + pad
      ctx.fillStyle = style.background
      if (radius > 0) {
        roundRectPath(ctx, bgX, bgY, bgW, bgH, radius)
        ctx.fill()
      } else {
        ctx.fillRect(bgX, bgY, bgW, bgH)
      }
    }

    // Sombra
    if (style.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.85)'
      ctx.shadowBlur = fontPx * 0.18
      ctx.shadowOffsetY = fontPx * 0.06
    }

    // Contorno
    if (style.outline) {
      ctx.lineWidth = Math.max(2, fontPx * 0.08)
      ctx.strokeStyle = '#000000'
      ctx.lineJoin = 'round'
      ctx.miterLimit = 2
      ctx.strokeText(ln, xAnchor, y)
    }

    // Texto — animação karaoke/highlight colore a palavra ativa.
    if (animation === 'karaoke' || animation === 'highlight') {
      const words = ln.split(' ')
      const activeColor = style.activeColor || '#22D3EE'
      const baseColor = style.color || '#FFFFFF'
      // palavra ativa global baseada no tempo
      const activeWordIdx = (() => {
        const cw = cue.words || []
        for (let wi = 0; wi < cw.length; wi++) {
          if (resultTime >= cw[wi].start && resultTime < cw[wi].end) return wi
        }
        // destaca até a última palavra já falada
        let last = -1
        for (let wi = 0; wi < cw.length; wi++) {
          if (resultTime >= cw[wi].start) last = wi
        }
        return last
      })()
      // mede cada palavra e desenha com cor apropriada
      let cursorX = xAnchor
      if (style.align === 'center') {
        // centraliza o bloco de linha
        cursorX = xAnchor - tw / 2
      } else if (style.align === 'right') {
        cursorX = xAnchor - tw
      }
      const spaceW = ctx.measureText(' ').width
      // conta offset de palavras já desenhadas nas linhas anteriores
      let globalWordIdx = 0
      for (let li = 0; li < i; li++) globalWordIdx += lines[li].split(' ').length
      ctx.textAlign = 'left'
      for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi]
        const isKaraoke = animation === 'karaoke'
        const isActive = isKaraoke
          ? globalWordIdx + wi === activeWordIdx
          : globalWordIdx + wi <= activeWordIdx
        ctx.fillStyle = isActive ? activeColor : baseColor
        ctx.fillText(word, cursorX, y)
        cursorX += ctx.measureText(word).width + spaceW
      }
      ctx.textAlign = style.align as CanvasTextAlign
    } else {
      ctx.fillStyle = style.color
      ctx.fillText(ln, xAnchor, y)
    }

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    y += lineHeight
  }

  ctx.restore()
}

/** Caminho de retângulo arredondado (para fundos de legenda/título). */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Desenha o título conforme a configuração. */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: TitleConfig,
  w: number,
  h: number,
  elapsedSeconds: number,
): void {
  if (!title.enabled || !title.text) return
  // Respeita duração limitada.
  if (title.duration === 'seconds' && elapsedSeconds > title.durationSeconds) {
    return
  }
  const fontSize = (title.fontSize / 1080) * w // escala relativa ao canvas
  const fontStack =
    title.font === 'Anton'
      ? `${fontSize}px Anton, Impact, sans-serif`
      : title.font === 'Montserrat'
        ? `${fontSize}px Montserrat, Arial, sans-serif`
        : `${fontSize}px Caveat, cursive`
  ctx.save()
  ctx.font = fontStack
  ctx.textAlign = title.alignment as CanvasTextAlign
  ctx.textBaseline = 'middle'
  const boxW = (title.width / 100) * w
  const x =
    title.alignment === 'left'
      ? title.normalizedX * w
      : title.alignment === 'right'
        ? title.normalizedX * w + boxW
        : title.normalizedX * w + boxW / 2
  const y = title.normalizedY * h
  // Quebra em linhas para caber na largura.
  const words = title.text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > boxW && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const lineHeight = fontSize * 1.1
  const totalH = lines.length * lineHeight
  let startY = y - totalH / 2 + lineHeight / 2
  for (const ln of lines) {
    if (title.bgEnabled && title.bgColor !== 'transparent') {
      const metrics = ctx.measureText(ln)
      const tw = metrics.width
      const bx =
        title.alignment === 'left'
          ? x - 8
          : title.alignment === 'right'
            ? x - tw - 8
            : x - tw / 2 - 8
      ctx.fillStyle = title.bgColor
      ctx.fillRect(bx, startY - lineHeight / 2, tw + 16, lineHeight)
    }
    ctx.fillStyle = title.color
    // sombra sutil para legibilidade (sempre aplicada)
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fillText(ln, x, startY)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    startY += lineHeight
  }
  ctx.restore()
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

/** PROMPT 3 — Desenha uma atribuição de mídia (BlockMediaAssignment) no canvas. */
function drawBlockMediaAssignment(
  ctx: CanvasRenderingContext2D,
  assignment: BlockMediaAssignment,
  img: HTMLImageElement,
  w: number,
  h: number,
  rect?: { x: number; y: number; w: number; h: number },
): void {
  const target = rect ?? { x: 0, y: 0, w, h }
  // Fundo configurável da atribuição.
  ctx.save()
  ctx.fillStyle = assignment.backgroundColor || '#000000'
  ctx.fillRect(target.x, target.y, target.w, target.h)
  ctx.restore()

  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return

  const scale = assignment.scale
  let dw: number
  let dh: number
  if (assignment.fit === 'cover') {
    const s = Math.max(target.w / iw, target.h / ih) * scale
    dw = iw * s
    dh = ih * s
  } else if (assignment.fit === 'fill') {
    dw = target.w * scale
    dh = target.h * scale
  } else {
    // contain
    const s = Math.min(target.w / iw, target.h / ih) * scale
    dw = iw * s
    dh = ih * s
  }
  const cx = target.x + target.w * assignment.positionX
  const cy = target.y + target.h * assignment.positionY
  const dx = cx - dw / 2
  const dy = cy - dh / 2
  ctx.save()
  // Recorta ao retângulo alvo para não vazar em layouts divididos.
  ctx.beginPath()
  ctx.rect(target.x, target.y, target.w, target.h)
  ctx.clip()
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()
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
 *     desenhando cada frame no canvas com requestAnimationFrame.
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
    backgroundBlur = 0,
    stageLayout,
    splitMediaUrl,
    splitMediaType,
    splitCameraRatio,
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
  const splitRects = computeSplitRects(stageLayout, splitCameraRatio, EXPORT_W, EXPORT_H)

  // CSS filter combinado (ajustes + efeitos) — aplicado ao drawImage do vídeo.
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
  let cachedBgImage: HTMLImageElement | null = null
  if (background.type === 'image' && background.imageDataUrl) {
    try {
      cachedBgImage = await loadImageElement(background.imageDataUrl)
    } catch {
      cachedBgImage = null
    }
  }
  // Pré-carrega a mídia secundária do split screen (apenas imagem).
  let cachedSplitImage: HTMLImageElement | null = null
  if (splitRects && splitMediaType === 'image' && splitMediaUrl) {
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
      void isVoiceActive

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

      // Desenha o frame.
      drawBackground(ctx, background, EXPORT_W, EXPORT_H, videoEl, cachedBgImage)

      // Aplica o CSS filter de ajustes+efeitos ao desenhar o vídeo.
      const filterCss = videoFilterCss || undefined

      if (splitRects) {
        // Layout dividido: câmera numa fatia + mídia noutra fatia.
        drawSplitMediaImage(ctx, splitRects.media, cachedSplitImage)
        if (backgroundBlur > 0 || filterCss) {
          ctx.save()
          ctx.filter = [backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : '', filterCss]
            .filter(Boolean)
            .join(' ')
          drawVideoCoverRect(ctx, videoEl, splitRects.camera, true)
          ctx.restore()
        } else {
          drawVideoCoverRect(ctx, videoEl, splitRects.camera, true)
        }
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        const divY = splitRects.camera.y + splitRects.camera.h
        ctx.fillRect(0, divY - 1, EXPORT_W, 2)
        ctx.restore()
      } else {
        // Layout cheio: vídeo cobre todo o canvas.
        if (backgroundBlur > 0 || filterCss) {
          ctx.save()
          ctx.filter = [backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : '', filterCss]
            .filter(Boolean)
            .join(' ')
          drawVideoCover(ctx, videoEl, EXPORT_W, EXPORT_H, 0, true)
          ctx.restore()
        } else {
          drawVideoCover(ctx, videoEl, EXPORT_W, EXPORT_H, 0, true)
        }
      }

      // Transição dissolve: escurece o frame no fim do segmento (crossfade simples).
      if (transitionAlpha > 0) {
        ctx.save()
        ctx.fillStyle = `rgba(0,0,0,${transitionAlpha.toFixed(3)})`
        ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)
        ctx.restore()
      }

      const activeBlock = findActiveBlock(blocks, rawTime)
      if (activeBlock) {
        const arts = artsByBlock[activeBlock.id] || []
        drawArts(ctx, arts, EXPORT_W, EXPORT_H, cachedArts)
        const broll = brollByBlock[activeBlock.id] || null
        drawBRoll(ctx, broll, EXPORT_W, EXPORT_H, cachedBrollImages.get(activeBlock.id) || null)

        // PROMPT 3 — Desenha as atribuições de mídia (BlockMediaAssignment) do bloco ativo.
        if (blockAssignments && blockAssignments.length > 0) {
          const blockAssigns = blockAssignments
            .filter((a) => a.blockId === activeBlock.id && a.enabled)
            .sort((a, b) => a.order - b.order)
          for (const a of blockAssigns) {
            const img = cachedAssignmentImages.get(a.assetId)
            if (!img) continue
            // Posiciona conforme o layout: full = overlay total; split = área complementar.
            if (splitRects) {
              drawBlockMediaAssignment(ctx, a, img, EXPORT_W, EXPORT_H, splitRects.media)
            } else {
              drawBlockMediaAssignment(ctx, a, img, EXPORT_W, EXPORT_H)
            }
          }
        }
      }
      drawReaction(ctx, reaction, EXPORT_W, EXPORT_H, reactionConfig, reactionVideoEl)
      drawTitle(ctx, title, EXPORT_W, EXPORT_H, resultTime)
      drawCaptions(ctx, captions, resultTime, EXPORT_W, EXPORT_H)

      // Vinheta (overlay) — quando ajuste > 0.
      if (adjustments && adjustments.vignette > 0) {
        ctx.save()
        const v = adjustments.vignette
        const grad = ctx.createRadialGradient(
          EXPORT_W / 2,
          EXPORT_H / 2,
          Math.min(EXPORT_W, EXPORT_H) * (1 - v / 100) * 0.5,
          EXPORT_W / 2,
          EXPORT_H / 2,
          Math.max(EXPORT_W, EXPORT_H) * 0.7,
        )
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, `rgba(0,0,0,${(v / 100).toFixed(3)})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)
        ctx.restore()
      }

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
