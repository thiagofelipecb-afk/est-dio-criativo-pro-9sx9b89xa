/* =============================================================================
   LUMEN Studio — Compositor Único (Canvas 2D) para Preview e Gravação
   -----------------------------------------------------------------------------
   REGRA OBRIGATÓRIA: a MESMA função `drawComposition` (exposta também como
   `composeFrame`) alimenta o preview ao vivo (rAF no <canvas> visível), a
   gravação (canvas.captureStream() + MediaRecorder), o snapshot, o thumbnail
   e a exportação. NÃO existe implementação paralela de renderização.

   Ordem de camadas (de baixo para cima):
     1. Fundo (cor, gradiente, imagem, vídeo ou blur do frame original)
     2. Pessoa recortada (segmentação) — quando há máscara
        OU câmera inteira (quando não há segmentação)
     3. Mídias complementares (arte, B-roll, quadro, atribuições de bloco)
     4. Vídeo de reação
     5. Títulos e legendas (overlays)

   A pessoa (câmera) é SEMPRE desenhada POR CIMA do fundo — selecionar uma
   cor, gradiente ou desfoque NUNCA esconde a pessoa. Cor = camada sólida
   atrás; pessoa visível na frente. Desfoque = fundo desfocado + pessoa nítida
   por cima (com segmentação) ou câmera nítida contida (sem segmentação).

   Tudo é determinístico e puro: a mesma entrada produz o mesmo frame.
   ========================================================================== */

import type {
  BackgroundConfig,
  StageLayout,
  TitleConfig,
  MediaAsset,
  CameraConfigLike,
} from '@/types/studio'
import type { CaptionTrack, CaptionCue, CaptionStyle } from '@/components/studio/editor-types'
import { CAPTION_PRESETS } from '@/components/studio/editor-types'

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

/** Camada de B-roll (imagem estática sobreposta ao canvas). */
export interface BRollLayer {
  imageEl: HTMLImageElement | null
}

/** Atribuição de mídia de bloco desenhada como overlay. */
export interface AssignmentLayer {
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
  /**
   * Fonte de câmera pré-processada (pipeline WebGL de retoque facial). Quando
   * fornecida, o compositor desenha ESTA fonte no lugar do `<video>` cru —
   * assim os efeitos WebGL aparecem tanto no preview quanto na gravação.
   * Pode ser um HTMLCanvasElement (saída do pipeline) ou o próprio vídeo.
   */
  cameraSource?: CanvasImageSource | null
  /**
   * Máscara de segmentação (ImageData RGBA, branco = pessoa) na resolução do
   * canvas. Quando presente (e segmentationEnabled), a pessoa é recortada e
   * desenhada sobre o fundo — sem cobrir a câmera inteira, preservando
   * cabelo/ombros/mãos.
   */
  segmentationMask?: ImageData | null
  split?: SplitMediaLayer | null
  splitMediaEl?: HTMLImageElement | HTMLVideoElement | null
  art?: ArtLayer | null
  /** B-roll do bloco ativo (imagem sobreposta). */
  broll?: BRollLayer | null
  /** Atribuições de mídia do bloco ativo (overlays ordenados). */
  assignments?: AssignmentLayer[] | null
  reaction?: ReactionLayer | null
  title?: TitleConfig | null
  /** Legendas (CaptionTrack) — desenhadas como camada de texto mais alta. */
  captions?: CaptionTrack | null
  /** Tempo em segundos (para títulos/legendas com duração limitada). */
  elapsedSec?: number
  /**
   * Filtro CSS opcional aplicado ao desenhar a câmera (pessoa). Quando
   * presente, substitui `cameraCssFilter(camera)` — usado pelo exportador para
   * aplicar ajustes/efeitos do Editor (AdjustmentsState/EffectsState) sem
   * duplicar a lógica de renderização do compositor.
   */
  cameraFilterOverride?: string
}

/**
 * Estado completo da composição usado por `composeFrame` — a ponte entre o
 * exportador (que possui caches de mídia) e o compositor único. O preview
 * (StudioStage) monta um `CompositionInputs` equivalente e chama a MESMA
 * `drawComposition`; o exportador monta um `StudioComposition` e chama
 * `composeFrame`, que internamente delega a `drawComposition`. Logo, há uma
 * ÚNICA implementação de renderização.
 */
export interface StudioComposition {
  layout: StageLayout
  background: BackgroundConfig
  camera: CameraConfigLike
  cameraCrop: CameraCrop
  cameraVideo: HTMLVideoElement | null
  cameraSource?: CanvasImageSource | null
  segmentationMask?: ImageData | null
  split?: SplitMediaLayer | null
  splitMediaEl?: HTMLImageElement | HTMLVideoElement | null
  art?: ArtLayer | null
  broll?: BRollLayer | null
  assignments?: AssignmentLayer[] | null
  reaction?: ReactionLayer | null
  title?: TitleConfig | null
  captions?: CaptionTrack | null
  /** Filtro CSS aplicado à câmera (ajustes/efeitos do Editor). */
  cameraFilterOverride?: string
  /** Alpha de transição (dissolve) entre segmentos — overlay escuro. */
  transitionAlpha?: number
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

/**
 * Desenha a fonte da câmera (vídeo cru ou canvas WebGL pré-processado) aplicando
 * zoom/pan/espelhamento. Aceita tanto HTMLVideoElement quanto HTMLCanvasElement
 * como fonte — quando é um canvas do pipeline de retoque, os efeitos já estão
 * aplicados e o `ctx.filter` global (brilho/contraste/etc.) é aplicado por cima.
 */
function drawCameraSource(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  crop: CameraCrop,
  filter: string,
) {
  if (!srcW || !srcH) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(dx, dy, dw, dh)
  ctx.clip()

  const zoom = Math.max(1, crop.zoom)
  // Região de origem (crop) centralizada + pan.
  const baseW = srcW / zoom
  const baseH = srcH / zoom
  const maxPanX = (srcW - baseW) / 2
  const maxPanY = (srcH - baseH) / 2
  const sx = srcW / 2 - baseW / 2 + crop.panX * maxPanX
  const sy = srcH / 2 - baseH / 2 + crop.panY * maxPanY

  ctx.filter = filter || 'none'
  if (crop.mirror) {
    ctx.translate(dx + dw, dy)
    ctx.scale(-1, 1)
    ctx.drawImage(source, sx, sy, baseW, baseH, 0, 0, dw, dh)
  } else {
    ctx.drawImage(source, sx, sy, baseW, baseH, dx, dy, dw, dh)
  }
  ctx.filter = 'none'
  ctx.restore()
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
  drawCameraSource(ctx, video, vw, vh, dx, dy, dw, dh, crop, filter)
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

/* -----------------------------------------------------------------------------
   Offscreen canvases para a máscara de segmentação (reutilizados por frame).
   ------------------------------------------------------------------------- */
let _personOffCanvas: HTMLCanvasElement | null = null
let _maskCanvas: HTMLCanvasElement | null = null

function getPersonOffscreen(w: number, h: number): HTMLCanvasElement {
  if (!_personOffCanvas) _personOffCanvas = document.createElement('canvas')
  if (_personOffCanvas.width !== w) _personOffCanvas.width = w
  if (_personOffCanvas.height !== h) _personOffCanvas.height = h
  return _personOffCanvas
}

function maskToCanvas(mask: ImageData): HTMLCanvasElement {
  if (!_maskCanvas) _maskCanvas = document.createElement('canvas')
  if (_maskCanvas.width !== mask.width) _maskCanvas.width = mask.width
  if (_maskCanvas.height !== mask.height) _maskCanvas.height = mask.height
  const mctx = _maskCanvas.getContext('2d')
  if (mctx) mctx.putImageData(mask, 0, 0)
  return _maskCanvas
}

/**
 * NOVA — Renderiza a máscara da pessoa sobre o fundo usando os dados de
 * segmentação. A câmera (pessoa nítida) é desenhada em um canvas offscreen na
 * resolução do compositor, recortada pela máscara binária via
 * `destination-in`, e então compostada sobre o fundo. Preserva cabelo,
 * ombros e mãos (bordas suaves da máscara). NÃO cobre a câmera inteira —
 * apenas os pixels onde a máscara é opaca.
 */
export function drawPersonMask(
  ctx: CanvasRenderingContext2D,
  input: CompositionInputs,
  W: number,
  H: number,
) {
  const mask = input.segmentationMask
  const src = input.cameraSource ?? input.cameraVideo
  if (!src || !mask) return
  const srcEl = src as HTMLVideoElement
  const srcW =
    (srcEl as HTMLVideoElement).videoWidth ||
    (src as HTMLCanvasElement).width ||
    (input.cameraVideo?.videoWidth ?? 0)
  const srcH =
    (srcEl as HTMLVideoElement).videoHeight ||
    (src as HTMLCanvasElement).height ||
    (input.cameraVideo?.videoHeight ?? 0)
  if (!srcW || !srcH) return

  const off = getPersonOffscreen(W, H)
  const octx = off.getContext('2d')
  if (!octx) return
  octx.clearRect(0, 0, W, H)
  // Desenha a câmera (pessoa nítida) com zoom/pan/filter no offscreen.
  octx.save()
  octx.beginPath()
  octx.rect(0, 0, W, H)
  octx.clip()
  drawCameraSource(
    octx,
    src,
    srcW,
    srcH,
    0,
    0,
    W,
    H,
    input.cameraCrop,
    input.cameraFilterOverride ?? cameraCssFilter(input.camera),
  )
  octx.restore()
  // Recorta pela máscara: mantém apenas os pixels da pessoa.
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(maskToCanvas(mask), 0, 0, W, H)
  octx.globalCompositeOperation = 'source-over'
  // Compõe sobre o fundo já desenhado no canvas principal.
  ctx.drawImage(off, 0, 0, W, H)
}

/**
 * Função única de renderização. Chamada a cada frame (preview) e durante a
 * gravação/exportação (via `composeFrame`). Qualquer diferença entre preview e
 * arquivo gravado seria um bug aqui — não há segunda implementação.
 */
export function drawComposition(input: CompositionInputs): void {
  const { ctx, width: W, height: H } = input
  ctx.save()
  ctx.clearRect(0, 0, W, H)

  // 1) FUNDO (camada mais baixa).
  drawBackground(ctx, input, W, H)

  // Determina se a segmentação está ativa (máscara presente + habilitada).
  const segActive =
    !!input.background.segmentationEnabled &&
    !!input.segmentationMask &&
    input.background.type !== 'none'

  const isSplit =
    input.layout === 'split-top' || input.layout === 'split-bottom' || input.layout === 'split'

  // 2) PESSOA / CÂMERA
  if (isSplit && input.split && input.splitMediaEl) {
    // Layout dividido NÃO usa segmentação (a câmera ocupa uma fatia inteira).
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
  } else if (segActive) {
    // Segmentação ativa: recorta a pessoa e desenha sobre o fundo. NÃO redesenha
    // o fundo nem a câmera inteira — apenas a pessoa mascarada.
    drawPersonMask(ctx, input, W, H)
    // Vinheta opcional sobre a pessoa.
    if ((input.camera.vignette ?? 0) > 0) {
      drawVignette(ctx, 0, 0, W, H, input.camera.vignette ?? 0)
    }
  } else {
    // Layout cheio sem segmentação. Quando há um fundo visível
    // (cor/gradiente/imagem/desfoque/remoção), a câmera é desenhada CONTIDA
    // (letterbox) para que o fundo apareça ATRÁS da pessoa ao redor do vídeo.
    // Com fundo 'none', a câmera preenche tudo (cover).
    const contain = input.background.type !== 'none'
    drawCameraArea(ctx, input, 0, 0, W, H, contain)
  }

  // 3) MÍDIAS COMPLEMENTARES (B-roll, atribuições, arte) — sobre a pessoa.
  if (input.broll && input.broll.imageEl) {
    drawBroll(ctx, input.broll, W, H)
  }
  if (input.assignments && input.assignments.length > 0) {
    for (const a of input.assignments) {
      if (a.imageEl) drawAssignment(ctx, a, W, H)
    }
  }
  if (input.art && input.art.imageEl) {
    drawArt(ctx, input.art, W, H)
  }

  // 4) REAÇÃO (overlay de vídeo no canto).
  if (input.reaction && input.reaction.video) {
    drawReaction(ctx, input.reaction, W, H)
  }

  // 5) TÍTULO (camada de texto).
  if (input.title && input.title.enabled && input.title.text) {
    drawTitle(ctx, input.title, W, H, input.elapsedSec ?? 0)
  }

  // 6) LEGENDAS (camada de texto mais alta).
  if (input.captions) {
    drawCaptions(ctx, input.captions, input.elapsedSec ?? 0, W, H)
  }

  ctx.restore()
}

/**
 * Ponte de exportação: monta um `CompositionInputs` a partir de um
 * `StudioComposition` e delega à ÚNICA `drawComposition`. O exportador chama
 * esta função frame a frame; o preview monta o `CompositionInputs` diretamente
 * e também chama `drawComposition`. Uma só implementação de renderização.
 *
 * `currentTimeMs` é o tempo resultante (do vídeo editado) em milissegundos.
 */
export function composeFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  composition: StudioComposition,
  currentTimeMs: number,
): void {
  const input: CompositionInputs = {
    ctx,
    width: W,
    height: H,
    layout: composition.layout,
    background: composition.background,
    camera: composition.camera,
    cameraCrop: composition.cameraCrop,
    cameraVideo: composition.cameraVideo,
    cameraSource: composition.cameraSource ?? null,
    segmentationMask: composition.segmentationMask ?? null,
    split: composition.split ?? null,
    splitMediaEl: composition.splitMediaEl ?? null,
    art: composition.art ?? null,
    broll: composition.broll ?? null,
    assignments: composition.assignments ?? null,
    reaction: composition.reaction ?? null,
    title: composition.title ?? null,
    captions: composition.captions ?? null,
    cameraFilterOverride: composition.cameraFilterOverride,
    elapsedSec: (currentTimeMs ?? 0) / 1000,
  }
  drawComposition(input)
  // Transição dissolve: overlay escuro sobre o frame (mesma lógica do
  // exportador legado, agora integrada ao compositor único).
  if (composition.transitionAlpha && composition.transitionAlpha > 0) {
    ctx.save()
    ctx.fillStyle = `rgba(0,0,0,${composition.transitionAlpha.toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

/** Converte a intensidade de desfoque (0–100%) em px de blur no canvas. */
function blurPx(bg: BackgroundConfig): number {
  const a = Math.max(0, Math.min(100, bg.blurAmount ?? 50))
  return (a / 100) * 30
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
  if (bg.type === 'gradient') {
    const c1 = bg.gradientColor1 || '#7C5CFC'
    const c2 = bg.gradientColor2 || '#22D3EE'
    const angle = ((bg.gradientAngle ?? 135) * Math.PI) / 180
    const cx = W / 2
    const cy = H / 2
    const len = Math.abs(W * Math.cos(angle)) / 2 + Math.abs(H * Math.sin(angle)) / 2
    const x0 = cx - Math.cos(angle) * len
    const y0 = cy - Math.sin(angle) * len
    const x1 = cx + Math.cos(angle) * len
    const y1 = cy + Math.sin(angle) * len
    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    return
  }
  if (bg.type === 'image' && bg.imageDataUrl) {
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
      drawMediaFit(ctx, img, 0, 0, W, H, bg.imageFit ?? 'cover')
    }
    return
  }
  if (bg.type === 'blur') {
    // Fundo desfocado = vídeo da câmera desfocado. A pessoa nítida é desenhada
    // depois, por cima — pessoa visível, só fundo borrado. Com segmentação,
    // a pessoa é recortada (sem halo/vazamento); sem segmentação, a câmera
    // nítida contida aparece sobre o desfoque.
    if (input.cameraVideo && input.cameraVideo.videoWidth) {
      ctx.save()
      ctx.filter = `blur(${Math.max(4, blurPx(bg))}px)`
      drawMediaFit(ctx, input.cameraVideo, 0, 0, W, H, 'cover')
      ctx.filter = 'none'
      ctx.restore()
    } else {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, W, H)
    }
    return
  }
  if (bg.type === 'removal') {
    // Remoção de fundo: o fundo real é substituído por uma cor sólida (ou
    // preto). A pessoa é recortada pela máscara e desenhada por cima. Se a
    // segmentação falhar, o compositor cai para o caminho sem segmentação
    // (câmera contida) — a pessoa nunca é escondida.
    ctx.fillStyle = bg.presetColor || '#000000'
    ctx.fillRect(0, 0, W, H)
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
  const srcVideo = input.cameraVideo
  const src = input.cameraSource ?? srcVideo
  const srcEl = src as HTMLVideoElement
  const srcW =
    (srcEl as HTMLVideoElement).videoWidth ||
    (src as HTMLCanvasElement).width ||
    (srcVideo?.videoWidth ?? 0)
  const srcH =
    (srcEl as HTMLVideoElement).videoHeight ||
    (src as HTMLCanvasElement).height ||
    (srcVideo?.videoHeight ?? 0)
  if (contain && srcW && srcH) {
    const targetRatio = dw / dh
    const srcRatio = srcW / srcH
    if (srcRatio > targetRatio) {
      camDh = dw / srcRatio
      camDy = dy + (dh - camDh) / 2
    } else {
      camDw = dh * srcRatio
      camDx = dx + (dw - camDw) / 2
    }
  }
  if (src && srcW && srcH) {
    drawCameraSource(
      ctx,
      src,
      srcW,
      srcH,
      camDx,
      camDy,
      camDw,
      camDh,
      input.cameraCrop,
      // CORREÇÃO (Seção 19 — Cenários 7/8): o filtro de câmera (ajustes de
      // aparência/efeitos do Editor, ex.: redução de brilho do preset Natural)
      // deve ser aplicado também no caminho sem segmentação e no split — não
      // apenas em drawPersonMask. Sem isto, o preview e a gravação ficariam
      // sem o efeito facial sempre que a segmentação estivesse desligada.
      input.cameraFilterOverride ?? cameraCssFilter(input.camera),
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

/** Desenha o B-roll (imagem) cobrindo o canvas. */
function drawBroll(ctx: CanvasRenderingContext2D, broll: BRollLayer, W: number, H: number) {
  const el = broll.imageEl
  if (!el) return
  const iw = (el as HTMLImageElement).naturalWidth || (el as HTMLImageElement).width
  const ih = (el as HTMLImageElement).naturalHeight || (el as HTMLImageElement).height
  if (!iw || !ih) return
  ctx.save()
  drawImageCover(ctx, el, 0, 0, W, H)
  ctx.restore()
}

/** Desenha uma atribuição de mídia (overlay posicionado). */
function drawAssignment(ctx: CanvasRenderingContext2D, a: AssignmentLayer, W: number, H: number) {
  const el = a.imageEl
  if (!el) return
  const iw = (el as HTMLImageElement).naturalWidth || (el as HTMLImageElement).width
  const ih = (el as HTMLImageElement).naturalHeight || (el as HTMLImageElement).height
  if (!iw || !ih) return
  ctx.save()
  ctx.fillStyle = a.backgroundColor || '#000000'
  ctx.fillRect(0, 0, W, H)
  const scale = a.scale
  let dw: number
  let dh: number
  if (a.fit === 'cover') {
    const s = Math.max(W / iw, H / ih) * scale
    dw = iw * s
    dh = ih * s
  } else if (a.fit === 'fill') {
    dw = W * scale
    dh = H * scale
  } else {
    const s = Math.min(W / iw, H / ih) * scale
    dw = iw * s
    dh = ih * s
  }
  const cx = W * a.positionX
  const cy = H * a.positionY
  const dx = cx - dw / 2
  const dy = cy - dh / 2
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  ctx.clip()
  ctx.drawImage(el, dx, dy, dw, dh)
  ctx.restore()
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height
  if (!iw || !ih) return
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
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

/* =============================================================================
   LEGENDAS — desenhadas no próprio compositor (camada de texto mais alta).
   Movidas do exporter para que preview e exportação compartilhem a MESMA
   renderização. Nenhuma lógica duplicada.
   ========================================================================== */

function resolveCaptionStyle(
  track: CaptionTrack | null | undefined,
  cue: CaptionCue,
): CaptionStyle {
  const presetId = cue.style || track?.preset || 'clean-center'
  const preset = CAPTION_PRESETS.find((p) => p.id === presetId)
  return preset ? { ...preset.style } : { ...CAPTION_PRESETS[0].style }
}

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

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  track: CaptionTrack | null | undefined,
  resultTime: number,
  w: number,
  h: number,
): void {
  if (!track || !track.cues || track.cues.length === 0) return
  const cue = track.cues.find((c) => resultTime >= c.startTime && resultTime <= c.endTime)
  if (!cue) return

  const style = resolveCaptionStyle(track, cue)
  const animation = cue.animation || track.preset || 'fade'
  const pos = cue.position

  const cueDur = Math.max(0.01, cue.endTime - cue.startTime)
  const cueProgress = Math.max(0, Math.min(1, (resultTime - cue.startTime) / cueDur))

  const fontPx = (style.fontSize / 1080) * w
  const weight = style.fontWeight
  const family = style.fontFamily || 'Inter'
  ctx.save()
  ctx.font = `${weight} ${fontPx}px ${family}, Arial, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = style.align as CanvasTextAlign

  let text = cue.text || ''
  if (style.uppercase) text = text.toUpperCase()

  const maxWidthPx = (style.maxWidth / 100) * w
  const lines = wrapCaptionText(ctx, text, maxWidthPx).slice(0, style.lines || 2)
  const lineHeight = fontPx * (style.lineHeight || 1.2)
  const blockHeight = lines.length * lineHeight

  const cx = pos ? pos.x : 0.5
  let cyN = pos ? pos.y : undefined
  if (cyN === undefined) {
    const topY = captionVerticalY(style, blockHeight, h)
    cyN = (topY + blockHeight / 2) / h
  }

  const centerY = cyN * h
  const topY = centerY - blockHeight / 2

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
    offsetY = Math.sin(cueProgress * Math.PI) * fontPx * 0.3
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

  let y = topY
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const tw = ctx.measureText(ln).width

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
        roundRect(ctx, bgX, bgY, bgW, bgH, radius)
        ctx.fill()
      } else {
        ctx.fillRect(bgX, bgY, bgW, bgH)
      }
    }

    if (style.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.85)'
      ctx.shadowBlur = fontPx * 0.18
      ctx.shadowOffsetY = fontPx * 0.06
    }

    if (style.outline) {
      ctx.lineWidth = Math.max(2, fontPx * 0.08)
      ctx.strokeStyle = '#000000'
      ctx.lineJoin = 'round'
      ctx.miterLimit = 2
      ctx.strokeText(ln, xAnchor, y)
    }

    if (animation === 'karaoke' || animation === 'highlight') {
      const words = ln.split(' ')
      const activeColor = style.activeColor || '#22D3EE'
      const baseColor = style.color || '#FFFFFF'
      const activeWordIdx = (() => {
        const cw = cue.words || []
        for (let wi = 0; wi < cw.length; wi++) {
          if (resultTime >= cw[wi].start && resultTime < cw[wi].end) return wi
        }
        let last = -1
        for (let wi = 0; wi < cw.length; wi++) {
          if (resultTime >= cw[wi].start) last = wi
        }
        return last
      })()
      let cursorX = xAnchor
      if (style.align === 'center') {
        cursorX = xAnchor - tw / 2
      } else if (style.align === 'right') {
        cursorX = xAnchor - tw
      }
      const spaceW = ctx.measureText(' ').width
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
