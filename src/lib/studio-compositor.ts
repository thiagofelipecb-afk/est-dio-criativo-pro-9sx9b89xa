/* =============================================================================
   LUMEN Studio — Compositor Único (Canvas 2D) para Preview e Gravação
   -----------------------------------------------------------------------------
   REGRA OBRIGATÓRIA: a MESMA função `drawComposition` alimenta o preview ao
   vivo (rAF no <canvas> visível), a gravação (canvas.captureStream() + MediaRecorder),
   o snapshot, o thumbnail e a exportação. NÃO existe implementação paralela.

   Ordem mínima de camadas (de baixo para cima):
     fundo → imagem/quadro/B-roll → reação → câmera/recorte → título → overlay

   A câmera (pessoa) é sempre desenhada POR CIMA do fundo — selecionar uma cor
   ou desfoque NUNCA esconde a pessoa. Cor = camada sólida atrás; pessoa visível.
   Desfoque = fundo desfocado + câmera nítida por cima.

   Tudo é determinístico e puro: a mesma entrada produz o mesmo frame.
   ========================================================================== */

import type {
  BackgroundConfig,
  StageLayout,
  TitleConfig,
  MediaAsset,
  CameraConfigLike,
} from '@/types/studio'

export type AspectRatioId = '9:16' | '16:9' | '1:1' | '4:5'

export const ASPECT_DIMENSIONS: Record<AspectRatioId, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
}

/** Filtros CSS de imagem aplicáveis no canvas via ctx.filter. */
export function cameraCssFilter(cam: CameraConfigLike): string {
  const b = Math.max(0, cam.brightness / 100)
  const c = Math.max(0, cam.contrast / 100)
  const sat = Math.max(0, (cam.saturation ?? 100) / 100)
  // beautySmooth → leve desfoque bilateral simulado com blur tênue.
  const beautyBlur = cam.beautySmooth > 0 ? (cam.beautySmooth / 100) * 0.8 : 0
  const smoothBlur = (cam.smoothness ?? 0) > 0 ? (cam.smoothness / 100) * 1.5 : 0
  const blur = beautyBlur + smoothBlur
  const parts = [
    `brightness(${b.toFixed(3)})`,
    `contrast(${c.toFixed(3)})`,
    `saturate(${sat.toFixed(3)})`,
  ]
  // Temperatura de cor: positiva = mais quente (sepia + leve hue-rotate);
  // negativa = mais fria (hue-rotate para o azul).
  const temp = cam.temperature ?? 0
  if (temp > 0) {
    parts.push(`sepia(${(temp / 100).toFixed(3)})`)
    parts.push(`hue-rotate(${(-temp / 2).toFixed(1)}deg)`)
  } else if (temp < 0) {
    parts.push(`hue-rotate(${(-temp / 2).toFixed(1)}deg)`)
    parts.push(`saturate(${(1 + Math.abs(temp) / 200).toFixed(3)})`)
  }
  if (blur > 0) parts.push(`blur(${blur.toFixed(2)}px)`)
  return parts.join(' ')
}

/** Desenha uma vinheta radial (overlay escuro nas bordas) sobre a área. */
function drawVignette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  amount: number,
) {
  if (amount <= 0) return
  const cx = x + w / 2
  const cy = y + h / 2
  const r0 = Math.min(w, h) * 0.3
  const r1 = Math.max(w, h) * 0.75
  const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1)
  const a = Math.max(0, Math.min(1, amount / 100))
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, `rgba(0,0,0,${a.toFixed(3)})`)
  ctx.save()
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

/** Enquadramento digital (crop + scale) do vídeo da câmera. */
export interface CameraCrop {
  /** Zoom 1.0 = sem zoom; >1 amplia (crop central). */
  zoom: number
  /** Deslocamento horizontal normalizado -1..1 (0 = centro). */
  panX: number
  /** Deslocamento vertical normalizado -1..1 (0 = centro). */
  panY: number
  /** Espelhar horizontalmente (só preview). */
  mirror: boolean
}

export const DEFAULT_CAMERA_CROP: CameraCrop = { zoom: 1, panX: 0, panY: 0, mirror: false }

/** Cache de HTMLImageElement para fundos de imagem (data URLs). */
const bgImageCache: Record<string, HTMLImageElement> = {}

export interface SplitMediaLayer {
  url: string
  type: 'image' | 'video'
  /** Proporção (0..1) da altura ocupada pela CÂMERA no layout dividido. */
  cameraRatio: number
}

export interface ReactionLayer {
  video: HTMLVideoElement | null
  scale: number
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'split'
  borderRadius: number
  borderWidth: number
  borderColor: string
}

export interface ArtLayer {
  asset: MediaAsset | undefined
  imageEl: HTMLImageElement | null
  fit: 'contain' | 'cover' | 'fill'
  positionX: number
  positionY: number
  scale: number
  backgroundColor: string
}

export interface CompositionInputs {
  /** Canvas-alvo (preview ou offscreen para gravação). */
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  layout: StageLayout
  background: BackgroundConfig
  camera: CameraConfigLike
  cameraCrop: CameraCrop
  /** Vídeo da webcam (elemento <video> com srcObject = stream). */
  cameraVideo: HTMLVideoElement | null
  split?: SplitMediaLayer | null
  splitMediaEl?: HTMLImageElement | HTMLVideoElement | null
  art?: ArtLayer | null
  reaction?: ReactionLayer | null
  title?: TitleConfig | null
  /** Tempo em segundos (para títulos com duração limitada). */
  elapsedSec?: number
}

/** Desenha um elemento de mídia (imagem ou vídeo) com object-fit. */
function drawMediaFit(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  fit: 'contain' | 'cover' | 'fill',
) {
  const iw = (el as HTMLVideoElement).videoWidth || (el as HTMLImageElement).naturalWidth || dw
  const ih = (el as HTMLVideoElement).videoHeight || (el as HTMLImageElement).naturalHeight || dh
  if (!iw || !ih) {
    ctx.drawImage(el, dx, dy, dw, dh)
    return
  }
  if (fit === 'fill') {
    ctx.drawImage(el, dx, dy, dw, dh)
    return
  }
  const targetRatio = dw / dh
  const srcRatio = iw / ih
  let w = dw
  let h = dh
  if (fit === 'contain') {
    if (srcRatio > targetRatio) {
      w = dw
      h = dw / srcRatio
    } else {
      h = dh
      w = dh * srcRatio
    }
  } else {
    // cover
    if (srcRatio > targetRatio) {
      h = dh
      w = dh * srcRatio
    } else {
      w = dw
      h = dw / srcRatio
    }
  }
  const x = dx + (dw - w) / 2
  const y = dy + (dh - h) / 2
  ctx.drawImage(el, x, y, w, h)
}

/** Desenha o vídeo da câmera aplicando zoom/pan/espelhamento. */
function drawCamera(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  crop: CameraCrop,
  filter: string,
) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(dx, dy, dw, dh)
  ctx.clip()

  const zoom = Math.max(1, crop.zoom)
  // Região de origem (crop) centralizada + pan.
  const baseW = vw / zoom
  const baseH = vh / zoom
  const maxPanX = (vw - baseW) / 2
  const maxPanY = (vh - baseH) / 2
  const sx = vw / 2 - baseW / 2 + crop.panX * maxPanX
  const sy = vh / 2 - baseH / 2 + crop.panY * maxPanY

  ctx.filter = filter || 'none'
  if (crop.mirror) {
    ctx.translate(dx + dw, dy)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, baseW, baseH, 0, 0, dw, dh)
  } else {
    ctx.drawImage(video, sx, sy, baseW, baseH, dx, dy, dw, dh)
  }
  ctx.filter = 'none'
  ctx.restore()
}

/** Desenha um retângulo arredondado. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/**
 * Função única de renderização. Chamada a cada frame (preview) e durante a
 * gravação. Qualquer diferença entre preview e arquivo gravado seria um bug
 * aqui — não há segunda implementação.
 */
export function drawComposition(input: CompositionInputs): void {
  const { ctx, width: W, height: H } = input
  ctx.save()
  ctx.clearRect(0, 0, W, H)

  // 1) FUNDO (camada mais baixa). A pessoa (câmera) é desenhada DEPOIS, por
  //    cima — cor/desfoque nunca escondem a pessoa.
  drawBackground(ctx, input, W, H)

  const isSplit =
    input.layout === 'split-top' || input.layout === 'split-bottom' || input.layout === 'split'

  if (isSplit && input.split && input.splitMediaEl) {
    const ratio = Math.max(0.2, Math.min(0.8, input.split.cameraRatio))
    const camH = Math.round(H * ratio)
    const mediaH = H - camH
    if (input.layout === 'split-bottom') {
      // mídia em cima, câmera embaixo
      drawMediaArea(ctx, input.splitMediaEl, input.split.type, 0, 0, W, mediaH, 'cover')
      drawDivider(ctx, 0, mediaH, W)
      drawCameraArea(ctx, input, 0, mediaH, W, camH)
    } else {
      // câmera em cima, mídia embaixo (split-top / split legacy)
      drawCameraArea(ctx, input, 0, 0, W, camH)
      drawDivider(ctx, 0, camH, W)
      drawMediaArea(ctx, input.splitMediaEl, input.split.type, 0, camH, W, mediaH, 'cover')
    }
  } else {
    // layout cheio. Quando há um fundo visível (cor/imagem/desfoque), a câmera
    // é desenhada CONTIDA (letterbox) para que o fundo apareça ATRÁS da pessoa
    // ao redor do vídeo. Com fundo 'none', a câmera preenche tudo (cover).
    const contain = input.background.type !== 'none'
    drawCameraArea(ctx, input, 0, 0, W, H, contain)
  }

  // 3) ARTE do bloco ativo (sobre a câmera, abaixo do título).
  if (input.art && input.art.imageEl) {
    drawArt(ctx, input.art, W, H)
  }

  // 4) REAÇÃO (overlay de vídeo no canto).
  if (input.reaction && input.reaction.video) {
    drawReaction(ctx, input.reaction, W, H)
  }

  // 5) TÍTULO (camada mais alta de texto).
  if (input.title && input.title.enabled && input.title.text) {
    drawTitle(ctx, input.title, W, H, input.elapsedSec ?? 0)
  }

  ctx.restore()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  input: CompositionInputs,
  W: number,
  H: number,
) {
  const bg = input.background
  if (bg.type === 'preset' && bg.presetColor) {
    ctx.fillStyle = bg.presetColor
    ctx.fillRect(0, 0, W, H)
    return
  }
  if (bg.type === 'image' && bg.imageDataUrl) {
    // Fundo de imagem: desenha a imagem cover sobre todo o canvas. A câmera
    // (pessoa) é desenhada depois, por cima, em modo contain — visível.
    if (!bgImageCache[bg.imageDataUrl]) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = bg.imageDataUrl
      bgImageCache[bg.imageDataUrl] = img
    }
    const img = bgImageCache[bg.imageDataUrl]
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    if (img.complete && img.naturalWidth) {
      drawMediaFit(ctx, img, 0, 0, W, H, 'cover')
    }
    return
  }
  if (bg.type === 'blur') {
    // Fundo desfocado = vídeo da câmera desfocado. A câmera nítida é desenhada
    // depois, por cima — pessoa visível, só fundo borrado.
    if (input.cameraVideo && input.cameraVideo.videoWidth) {
      ctx.save()
      ctx.filter = `blur(${Math.max(4, bg.blurAmount ?? 12)}px)`
      ctx.drawImage(input.cameraVideo, 0, 0, W, H)
      ctx.filter = 'none'
      ctx.restore()
    } else {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, W, H)
    }
    return
  }
  // none
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(x, y - 1, w, 2)
}

function drawCameraArea(
  ctx: CanvasRenderingContext2D,
  input: CompositionInputs,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  contain = false,
) {
  // Calcula a área de destino da câmera. Em modo "contain" (com fundo visível),
  // centralizamos o vídeo preservando a proporção, deixando o fundo aparecer
  // ao redor. Em modo "cover" (padrão, sem fundo), a câmera preenche tudo.
  let camDx = dx
  let camDy = dy
  let camDw = dw
  let camDh = dh
  if (contain && input.cameraVideo && input.cameraVideo.videoWidth) {
    const vw = input.cameraVideo.videoWidth
    const vh = input.cameraVideo.videoHeight
    const targetRatio = dw / dh
    const srcRatio = vw / vh
    if (srcRatio > targetRatio) {
      // vídeo mais largo → encaixa largura, altura menor
      camDh = dw / srcRatio
      camDy = dy + (dh - camDh) / 2
    } else {
      camDw = dh * srcRatio
      camDx = dx + (dw - camDw) / 2
    }
  }
  if (input.cameraVideo && input.cameraVideo.videoWidth) {
    drawCamera(
      ctx,
      input.cameraVideo,
      camDx,
      camDy,
      camDw,
      camDh,
      input.cameraCrop,
      cameraCssFilter(input.camera),
    )
  } else {
    ctx.fillStyle = '#0B0B10'
    ctx.fillRect(dx, dy, dw, dh)
  }
  // Vinheta opcional (após a câmera, abaixo das camadas de texto/overlay).
  if ((input.camera.vignette ?? 0) > 0) {
    drawVignette(ctx, dx, dy, dw, dh, input.camera.vignette ?? 0)
  }
}

function drawMediaArea(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement,
  type: 'image' | 'video',
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  fit: 'contain' | 'cover' | 'fill',
) {
  const ready = type === 'video' ? (el as HTMLVideoElement).videoWidth > 0 : true
  if (!ready) {
    ctx.fillStyle = '#0B0B10'
    ctx.fillRect(dx, dy, dw, dh)
    return
  }
  drawMediaFit(ctx, el, dx, dy, dw, dh, fit)
}

function drawArt(ctx: CanvasRenderingContext2D, art: ArtLayer, W: number, H: number) {
  const el = art.imageEl
  if (!el || !el.complete || !el.naturalWidth) return
  // Quadro inferior de arte (40% da altura) com fundo da cor configurada.
  const panelH = H * 0.4
  const y = H - panelH
  ctx.save()
  ctx.fillStyle = art.backgroundColor || '#000000'
  ctx.fillRect(0, y, W, panelH)
  drawMediaFit(ctx, el, 0, y, W, panelH, art.fit)
  ctx.restore()
}

function drawReaction(ctx: CanvasRenderingContext2D, r: ReactionLayer, W: number, H: number) {
  const v = r.video
  if (!v || !v.videoWidth) return
  const size = Math.max(0.1, Math.min(0.4, r.scale)) * Math.min(W, H)
  const margin = W * 0.03
  let x = margin
  let y = margin
  if (r.position.includes('right')) x = W - size - margin
  if (r.position.includes('bottom')) y = H - size - margin
  if (r.position === 'split') {
    // split = lado a lado: reação ocupa metade direita
    x = W / 2
    y = 0
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, W / 2, H)
    ctx.clip()
    drawMediaFit(ctx, v, x, y, W / 2, H, 'cover')
    ctx.restore()
    return
  }
  ctx.save()
  roundRect(ctx, x, y, size, size, r.borderRadius)
  ctx.clip()
  drawMediaFit(ctx, v, x, y, size, size, 'cover')
  ctx.restore()
  if (r.borderWidth > 0) {
    ctx.strokeStyle = r.borderColor
    ctx.lineWidth = r.borderWidth
    roundRect(ctx, x, y, size, size, r.borderRadius)
    ctx.stroke()
  }
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: TitleConfig,
  W: number,
  H: number,
  elapsedSec: number,
) {
  if (title.duration === 'seconds' && elapsedSec > title.durationSeconds) return
  const fontSize = (title.fontSize / 1080) * W
  const fontFamily =
    title.font === 'Anton'
      ? 'Anton, sans-serif'
      : title.font === 'Caveat'
        ? 'Caveat, cursive'
        : 'Montserrat, sans-serif'
  ctx.save()
  ctx.font = `bold ${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'top'
  const maxW = (title.width / 100) * W
  const lines = wrapText(ctx, title.text, maxW)
  const lineH = fontSize * 1.15
  const blockH = lines.length * lineH
  let x = (W - maxW) / 2
  if (title.alignment === 'left') x = W * 0.08
  if (title.alignment === 'right') x = W - maxW - W * 0.08
  let y = H * 0.5 - blockH / 2
  if (title.position === 'top') y = H * 0.06
  if (title.position === 'bottom') y = H - blockH - H * 0.08
  if (title.position === 'custom') {
    x = title.normalizedX * (W - maxW)
    y = title.normalizedY * (H - blockH)
  }
  if (title.bgEnabled && title.bgColor !== 'transparent') {
    ctx.fillStyle = title.bgColor
    ctx.fillRect(
      x - fontSize * 0.3,
      y - fontSize * 0.2,
      maxW + fontSize * 0.6,
      blockH + fontSize * 0.4,
    )
  }
  ctx.fillStyle = title.color
  ctx.textAlign = title.alignment === 'center' ? 'center' : title.alignment
  const tx =
    title.alignment === 'center' ? x + maxW / 2 : title.alignment === 'right' ? x + maxW : x
  lines.forEach((ln, i) => {
    ctx.fillText(ln, tx, y + i * lineH)
  })
  ctx.restore()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = w
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Carrega um elemento de mídia (imagem ou vídeo) a partir de uma URL. */
export function loadMediaElement(
  url: string,
  type: 'image' | 'video',
): Promise<HTMLImageElement | HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    if (type === 'image') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    } else {
      const v = document.createElement('video')
      v.src = url
      v.muted = true
      v.loop = true
      v.playsInline = true
      v.crossOrigin = 'anonymous'
      v.onloadeddata = () => resolve(v)
      v.onerror = reject
      v.load()
    }
  })
}
