import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MousePointer2,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  ImagePlus,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Group as GroupIcon,
  Ungroup,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Layers,
  Grid,
  Hand,
  Diamond as DiamondIcon,
  Frame,
  Globe,
  MousePointerClick,
  Brain,
  Shapes,
  Pipette,
  Bell,
  Plus,
  Minimize2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Search,
  Command as CommandIcon,
  ArrowLeft,
  X,
  FlipHorizontal,
  FlipVertical,
  Link2,
  Palette,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import {
  useWhiteboard,
  fileToDataUrl,
  readWhiteboardScene,
  writeWhiteboardScene,
  writeWhiteboardPreview,
} from '@/hooks/use-block-media'
import { toast } from 'sonner'
import type {
  WhiteboardElement,
  WhiteboardTool,
  WhiteboardGroup,
  WhiteboardState,
} from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   Whiteboard — FASE 3.3 + GRUPO G (Prompts 45–52)
   Quadro editável estilo Excalidraw. Canvas 9:16 (lógico 1080×1920).

   ADITIVO: todas as funcionalidades originais (seleção, retângulo, elipse,
   seta, linha, brush, texto, imagem, borracha, cores, espessura, undo/redo,
   limpar, zoom, camadas, agrupar, alinhamento, exportar PNG, mouse+touch,
   persistência) foram preservadas. Os Prompts 45–52 acrescentam:
   - Rota dedicada /estudio/quadro com header (P45)
   - Ferramentas diamond + pan + atalhos de teclado + tooltips (P46)
   - Extras: frame, embed, laser, mermaid, biblioteca de formas, conta-gotas,
     notificações (P47)
   - Zoom/Pan/Zen/Grade/Snap/Preview/Tema/Localizar/Paleta de comandos (P48)
   - Clipboard, duplicação, copiar/colar estilo, copiar PNG (P49)
   - Enviar frente/trás, flip H/V (P50)
   - Editar pontos, curvas, crop, link, fill/font, fluxograma por Tab (P51)
   - "Usar este quadro" + preview no Estúdio (P52)
   ─────────────────────────────────────────────────────────────────────────── */

const LOGICAL_W = 1080
const LOGICAL_H = 1920
const DISPLAY_H = 300
const DISPLAY_W = (DISPLAY_H * LOGICAL_W) / LOGICAL_H // ~169
const GRID_SIZE = 50

const COLORS = ['#FFFFFF', '#EF4444', '#3B82F6', '#22C55E', '#FBBF24', '#A855F7']

/** Atalhos de teclado das ferramentas (P46). */
const TOOL_SHORTCUTS: Record<string, WhiteboardTool> = {
  q: 'select',
  v: 'select',
  '1': 'select',
  h: 'pan',
  r: 'rectangle',
  '2': 'rectangle',
  d: 'diamond',
  '3': 'diamond',
  o: 'ellipse',
  '4': 'ellipse',
  a: 'arrow',
  '5': 'arrow',
  l: 'line',
  '6': 'line',
  p: 'brush',
  '7': 'brush',
  t: 'text',
  '8': 'text',
  '9': 'image',
  e: 'eraser',
  '0': 'eraser',
  f: 'frame',
  k: 'laser',
}

function uid(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 9)
}

/** Caixa de colisão de um elemento em coordenadas lógicas. */
function bbox(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'brush' && el.points && el.points.length > 0) {
    const xs = el.points.map((p) => p.x)
    const ys = el.points.map((p) => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return {
      x: el.x + minX,
      y: el.y + minY,
      w: Math.max(...xs) - minX,
      h: Math.max(...ys) - minY,
    }
  }
  return {
    x: Math.min(el.x, el.x + el.width),
    y: Math.min(el.y, el.y + el.height),
    w: Math.abs(el.width),
    h: Math.abs(el.height),
  }
}

function hitTest(el: WhiteboardElement, px: number, py: number): boolean {
  const b = bbox(el)
  const pad = 12
  return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad
}

/** Desenha uma seta com ponta. */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  strokeWidth: number,
) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = strokeWidth
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = Math.max(12, strokeWidth * 3)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
}

/** Desenha um losango (diamond) dentro do bbox do elemento. */
function drawDiamond(ctx: CanvasRenderingContext2D, el: WhiteboardElement, fill?: string) {
  const x = Math.min(el.x, el.x + el.width)
  const y = Math.min(el.y, el.y + el.height)
  const w = Math.abs(el.width)
  const h = Math.abs(el.height)
  const cx = x + w / 2
  const cy = y + h / 2
  ctx.beginPath()
  ctx.moveTo(cx, y)
  ctx.lineTo(x + w, cy)
  ctx.lineTo(cx, y + h)
  ctx.lineTo(x, cy)
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.stroke()
}

/** Desenha uma forma pré-definida via Path2D (P47 — biblioteca de formas). */
function drawShape(ctx: CanvasRenderingContext2D, el: WhiteboardElement, fill?: string) {
  const x = Math.min(el.x, el.x + el.width)
  const y = Math.min(el.y, el.y + el.height)
  const w = Math.abs(el.width)
  const h = Math.abs(el.height)
  const cx = x + w / 2
  const cy = y + h / 2
  ctx.beginPath()
  switch (el.shapeType) {
    case 'star': {
      const spikes = 5
      const outer = Math.min(w, h) / 2
      const inner = outer * 0.5
      let rot = -Math.PI / 2
      const step = Math.PI / spikes
      ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer)
      for (let i = 0; i < spikes; i++) {
        rot += step
        ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner)
        rot += step
        ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer)
      }
      ctx.closePath()
      break
    }
    case 'triangle':
      ctx.moveTo(cx, y)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
      break
    case 'cloud': {
      // Nuvem simplificada: arcos sobrepostos.
      const r = Math.min(w, h) / 3
      ctx.moveTo(x + r, y + h)
      ctx.arc(x + r, cy, r, Math.PI, 0, false)
      ctx.arc(cx, y + r * 0.4, r * 1.1, Math.PI, 0, false)
      ctx.arc(x + w - r, cy, r, Math.PI, 0, false)
      ctx.lineTo(x + w, y + h)
      ctx.closePath()
      break
    }
    case 'heart': {
      const topY = y + h * 0.3
      ctx.moveTo(cx, y + h)
      ctx.bezierCurveTo(x - w * 0.2, topY + h * 0.2, x + w * 0.15, y - h * 0.1, cx, topY)
      ctx.bezierCurveTo(x + w * 0.85, y - h * 0.1, x + w * 1.2, topY + h * 0.2, cx, y + h)
      ctx.closePath()
      break
    }
    case 'checkmark': {
      ctx.moveTo(x + w * 0.15, cy + h * 0.1)
      ctx.lineTo(cx, y + h * 0.8)
      ctx.lineTo(x + w * 0.85, y + h * 0.2)
      break
    }
    case 'x': {
      ctx.moveTo(x + w * 0.2, y + h * 0.2)
      ctx.lineTo(x + w * 0.8, y + h * 0.8)
      ctx.moveTo(x + w * 0.8, y + h * 0.2)
      ctx.lineTo(x + w * 0.2, y + h * 0.8)
      break
    }
    default:
      ctx.rect(x, y, w, h)
  }
  if (fill && el.shapeType !== 'checkmark' && el.shapeType !== 'x') {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.stroke()
}

/** Desenha um elemento frame (borda tracejada, cantos arredondados). */
function drawFrame(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  const x = Math.min(el.x, el.x + el.width)
  const y = Math.min(el.y, el.y + el.height)
  const w = Math.abs(el.width)
  const h = Math.abs(el.height)
  ctx.save()
  ctx.strokeStyle = '#7C5CFC'
  ctx.lineWidth = 3
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 12)
  ctx.stroke()
  ctx.restore()
  if (el.label) {
    ctx.save()
    ctx.setLineDash([])
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.fillStyle = '#7C5CFC'
    ctx.textBaseline = 'top'
    ctx.fillText(el.label, x + 12, y + 8)
    ctx.restore()
  }
}

/** Desenha um elemento embed (retângulo com globo + URL). */
function drawEmbed(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  const x = Math.min(el.x, el.x + el.width)
  const y = Math.min(el.y, el.y + el.height)
  const w = Math.abs(el.width)
  const h = Math.abs(el.height)
  ctx.save()
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.strokeRect(x, y, w, h)
  ctx.fillStyle = 'rgba(124,92,252,0.08)'
  ctx.fillRect(x, y, w, h)
  const cx = x + w / 2
  const cy = y + h / 2
  const r = Math.min(w, h) * 0.15
  ctx.strokeStyle = el.color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx, cy + r)
  ctx.stroke()
  if (el.embedUrl) {
    ctx.fillStyle = el.color
    ctx.font = '14px Inter, sans-serif'
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    const url = el.embedUrl.length > 28 ? el.embedUrl.slice(0, 28) + '…' : el.embedUrl
    ctx.fillText(url, cx, cy + r + 8)
    ctx.textAlign = 'left'
  }
  ctx.restore()
}

/** Indicador de link (corrente) no canto superior direito do elemento. */
function drawLinkIndicator(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  if (!el.link) return
  const b = bbox(el)
  ctx.save()
  ctx.fillStyle = '#22D3EE'
  ctx.beginPath()
  ctx.arc(b.x + b.w + 4, b.y - 4, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#0F0F15'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(b.x + b.w - 2, b.y - 8)
  ctx.lineTo(b.x + b.w + 10, b.y + 4)
  ctx.stroke()
  ctx.restore()
}

function renderElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  if (!el.visible) return
  ctx.save()
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (el.type === 'rectangle') {
    if (el.fillColor) {
      ctx.save()
      ctx.fillStyle = el.fillColor
      ctx.fillRect(el.x, el.y, el.width, el.height)
      ctx.restore()
    }
    ctx.strokeRect(el.x, el.y, el.width, el.height)
  } else if (el.type === 'diamond') {
    drawDiamond(ctx, el, el.fillColor)
  } else if (el.type === 'ellipse') {
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, Math.PI * 2)
    if (el.fillColor) {
      ctx.save()
      ctx.fillStyle = el.fillColor
      ctx.fill()
      ctx.restore()
    }
    ctx.stroke()
  } else if (el.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(el.x, el.y)
    if (el.curved) {
      const mx = (el.x + (el.x + el.width)) / 2
      const my = (el.y + (el.y + el.height)) / 2
      const off = Math.hypot(el.width, el.height) * 0.2
      ctx.quadraticCurveTo(mx + off, my - off, el.x + el.width, el.y + el.height)
    } else {
      ctx.lineTo(el.x + el.width, el.y + el.height)
    }
    ctx.stroke()
  } else if (el.type === 'arrow') {
    if (el.curved) {
      const mx = (el.x + (el.x + el.width)) / 2
      const my = (el.y + (el.y + el.height)) / 2
      const off = Math.hypot(el.width, el.height) * 0.2
      // Desenha a curva manualmente e a ponta no fim.
      ctx.beginPath()
      ctx.moveTo(el.x, el.y)
      ctx.quadraticCurveTo(mx + off, my - off, el.x + el.width, el.y + el.height)
      ctx.stroke()
      const angle = Math.atan2(el.y + el.height - (my - off), el.x + el.width - (mx + off))
      const headLen = Math.max(12, el.strokeWidth * 3)
      ctx.beginPath()
      ctx.moveTo(el.x + el.width, el.y + el.height)
      ctx.lineTo(
        el.x + el.width - headLen * Math.cos(angle - Math.PI / 6),
        el.y + el.height - headLen * Math.sin(angle - Math.PI / 6),
      )
      ctx.lineTo(
        el.x + el.width - headLen * Math.cos(angle + Math.PI / 6),
        el.y + el.height - headLen * Math.sin(angle + Math.PI / 6),
      )
      ctx.closePath()
      ctx.fill()
    } else {
      drawArrow(ctx, el.x, el.y, el.x + el.width, el.y + el.height, el.color, el.strokeWidth)
    }
  } else if (el.type === 'brush' && el.points && el.points.length > 0) {
    ctx.beginPath()
    ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y)
    }
    ctx.stroke()
  } else if (el.type === 'text' && el.text) {
    const fontSize = el.fontSize ?? Math.max(20, el.strokeWidth * 8)
    ctx.font = `bold ${fontSize}px ${el.fontFamily || 'Inter'}, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(el.text, el.x, el.y)
  } else if (el.type === 'image' && el.dataUrl) {
    const img = (el as any)._img as HTMLImageElement | undefined
    if (img && img.complete && img.naturalWidth > 0) {
      if (el.crop) {
        ctx.drawImage(
          img,
          el.crop.x,
          el.crop.y,
          el.crop.w,
          el.crop.h,
          el.x,
          el.y,
          el.width || img.naturalWidth,
          el.height || img.naturalHeight,
        )
      } else {
        ctx.drawImage(img, el.x, el.y, el.width || img.naturalWidth, el.height || img.naturalHeight)
      }
    }
  } else if (el.type === 'frame') {
    drawFrame(ctx, el)
  } else if (el.type === 'embed') {
    drawEmbed(ctx, el)
  } else if (el.type === 'shape') {
    drawShape(ctx, el, el.fillColor)
  }
  ctx.restore()
  drawLinkIndicator(ctx, el)
}

interface WhiteboardProps {
  /** Modo standalone: exibe header dedicado da rota /estudio/quadro (P45). */
  standalone?: boolean
}

export function Whiteboard({ standalone = false }: WhiteboardProps) {
  const navigate = useNavigate()
  const { whiteboard, setWhiteboard } = useWhiteboard()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tool, setTool] = useState<WhiteboardTool>('select')
  const [color, setColor] = useState(COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(whiteboard.zoom ?? 1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmClear, setConfirmClear] = useState(false)
  const [textEditing, setTextEditing] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState('')

  // PROMPT 48 — Estado de canvas (pan, grid, snap, zen, tema, modo preview).
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [showGrid, setShowGrid] = useState<boolean>(whiteboard.showGrid ?? false)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(whiteboard.snapToGrid ?? false)
  const [zenMode, setZenMode] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(whiteboard.theme ?? 'dark')
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>(whiteboard.viewMode ?? 'editor')
  const [findQuery, setFindQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [commandIndex, setCommandIndex] = useState(0)

  // PROMPT 47 — Extras (laser, embed, mermaid, biblioteca, conta-gotas, notifs).
  const [embedOpen, setEmbedOpen] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')
  const [mermaidOpen, setMermaidOpen] = useState(false)
  const [mermaidText, setMermaidText] = useState('')
  const [shapeOpen, setShapeOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; text: string; t: number }[]>([])
  const laserTrailRef = useRef<{ x: number; y: number; t: number }[]>([])
  const laserAnimRef = useRef<number | null>(null)
  const spaceDownRef = useRef(false)
  const panDragRef = useRef<{
    pointerId?: number
    startX: number
    startY: number
    offX: number
    offY: number
  } | null>(null)

  // PROMPT 49 — Clipboard interno e estilo.
  const clipboardRef = useRef<WhiteboardElement[]>([])
  const styleClipboardRef = useRef<{ color?: string; strokeWidth?: number } | null>(null)

  // PROMPT 51 — Edição de endpoints de linha e crop.
  const [lineEditing, setLineEditing] = useState<string | null>(null)
  const [cropEditing, setCropEditing] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const undoStack = useRef<WhiteboardElement[][]>([])
  const redoStack = useRef<WhiteboardElement[][]>([])
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map())

  // Drag state
  const dragRef = useRef<{
    pointerId?: number
    startX: number
    startY: number
    mode: 'create' | 'move' | 'brush'
    creating?: WhiteboardElement
    moveStarts?: Map<string, { x: number; y: number }>
  } | null>(null)

  const elements = whiteboard.elements
  const groups = whiteboard.groups

  const addNotification = useCallback((text: string) => {
    setNotifications((prev) => [{ id: uid('ntf'), text, t: Date.now() }, ...prev].slice(0, 5))
  }, [])

  /* Mantém zoom sincronizado com o estado persistido (carregamento inicial). */
  useEffect(() => {
    setZoom(whiteboard.zoom ?? 1)
  }, [whiteboard.zoom])

  /* PROMPT 52 — Em modo standalone, carrega a cena dedicada se existir. */
  useEffect(() => {
    if (!standalone) return
    const scene = readWhiteboardScene()
    if (scene) {
      setWhiteboard(scene)
      setZoom(scene.zoom ?? 1)
      setShowGrid(scene.showGrid ?? false)
      setSnapToGrid(scene.snapToGrid ?? false)
      setTheme(scene.theme ?? 'dark')
      setViewMode(scene.viewMode ?? 'editor')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone])

  /* Pré-carrega imagens dos elementos image para render no canvas. */
  useEffect(() => {
    for (const el of elements) {
      if (el.type === 'image' && el.dataUrl && !imgCache.current.has(el.id)) {
        const img = new Image()
        img.src = el.dataUrl
        imgCache.current.set(el.id, img)
      }
    }
  }, [elements])

  const commit = useCallback(
    (next: WhiteboardElement[]) => {
      setWhiteboard({ ...whiteboard, elements: next })
    },
    [whiteboard, setWhiteboard],
  )

  const pushHistory = useCallback(() => {
    undoStack.current.push([...elements])
    if (undoStack.current.length > 40) undoStack.current.shift()
    redoStack.current = []
  }, [elements])

  /* PROMPT 48 — Snap to grid. */
  const snap = useCallback(
    (v: number) => (snapToGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v),
    [snapToGrid],
  )

  /* ── Render ──────────────────────────────────────────────────────────── */
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const displayW = DISPLAY_W * zoom
    const displayH = DISPLAY_H * zoom
    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr
      canvas.height = displayH * dpr
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale((dpr * displayW) / LOGICAL_W, (dpr * displayH) / LOGICAL_H)

    // Pan (offset)
    ctx.translate(offsetX, offsetY)

    // Fundo (tema claro/escuro — P48)
    ctx.fillStyle = theme === 'light' ? '#F5F5F5' : '#0F0F15'
    ctx.fillRect(
      -offsetX,
      -offsetY,
      LOGICAL_W + Math.abs(offsetX) * 2,
      LOGICAL_H + Math.abs(offsetY) * 2,
    )

    // Grade (P48)
    if (showGrid && viewMode === 'editor') {
      ctx.save()
      ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let gx = 0; gx <= LOGICAL_W; gx += GRID_SIZE) {
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, LOGICAL_H)
        ctx.stroke()
      }
      for (let gy = 0; gy <= LOGICAL_H; gy += GRID_SIZE) {
        ctx.beginPath()
        ctx.moveTo(0, gy)
        ctx.lineTo(LOGICAL_W, gy)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Coluna central segura (apenas guia visual, não em preview/zen)
    if (viewMode === 'editor' && !zenMode) {
      const safeW = LOGICAL_W * 0.8
      const safeX = (LOGICAL_W - safeW) / 2
      ctx.save()
      ctx.strokeStyle = 'rgba(124,92,252,0.15)'
      ctx.setLineDash([12, 12])
      ctx.lineWidth = 2
      ctx.strokeRect(safeX, 0, safeW, LOGICAL_H)
      ctx.restore()
    }

    for (const el of elements) {
      if (el.type === 'image' && el.dataUrl) {
        const img = imgCache.current.get(el.id)
        ;(el as any)._img = img
      }
      renderElement(ctx, el)
    }

    // PROMPT 47 — Laser trail (não persiste, some em 1.5s).
    const now = performance.now()
    const liveTrail = laserTrailRef.current.filter((p) => now - p.t < 1500)
    laserTrailRef.current = liveTrail
    if (liveTrail.length > 1) {
      ctx.save()
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.shadowColor = '#EF4444'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.moveTo(liveTrail[0].x, liveTrail[0].y)
      for (let i = 1; i < liveTrail.length; i++) {
        ctx.lineTo(liveTrail[i].x, liveTrail[i].y)
      }
      ctx.stroke()
      ctx.restore()
    }

    // Seleção (não em preview)
    if (viewMode === 'editor') {
      for (const id of selectedIds) {
        const el = elements.find((e) => e.id === id)
        if (!el) continue
        const b = bbox(el)
        ctx.save()
        ctx.strokeStyle = '#22D3EE'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 8])
        ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16)
        ctx.restore()
      }

      // PROMPT 51 — Handles de edição de endpoints de linha/seta.
      if (lineEditing) {
        const el = elements.find((e) => e.id === lineEditing)
        if (el && (el.type === 'line' || el.type === 'arrow')) {
          const drawHandle = (hx: number, hy: number) => {
            ctx.save()
            ctx.fillStyle = '#22D3EE'
            ctx.strokeStyle = '#0F0F15'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(hx, hy, 10, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
            ctx.restore()
          }
          drawHandle(el.x, el.y)
          drawHandle(el.x + el.width, el.y + el.height)
          if (el.curved) {
            const mx = (el.x + (el.x + el.width)) / 2
            const my = (el.y + (el.y + el.height)) / 2
            const off = Math.hypot(el.width, el.height) * 0.2
            drawHandle(mx + off, my - off)
          }
        }
      }

      // PROMPT 51 — Overlay de crop de imagem.
      if (cropEditing) {
        const el = elements.find((e) => e.id === cropEditing)
        if (el && el.type === 'image') {
          ctx.save()
          ctx.strokeStyle = '#22D3EE'
          ctx.lineWidth = 2
          ctx.setLineDash([8, 8])
          ctx.strokeRect(el.x, el.y, el.width, el.height)
          ctx.restore()
        }
      }
    }

    // Continua animando se houver trilha de laser viva.
    if (liveTrail.length > 0 && laserAnimRef.current === null) {
      const tick = () => {
        laserAnimRef.current = null
        render()
      }
      laserAnimRef.current = requestAnimationFrame(tick)
    }
  }, [
    elements,
    selectedIds,
    zoom,
    offsetX,
    offsetY,
    showGrid,
    snapToGrid,
    theme,
    viewMode,
    zenMode,
    lineEditing,
    cropEditing,
  ])

  useEffect(() => {
    render()
  }, [render])

  /* ── Coordenadas lógicas a partir de evento ponteiro ─────────────────── */
  const toLogical = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const px = (clientX - rect.left) / rect.width
      const py = (clientY - rect.top) / rect.height
      return { x: px * LOGICAL_W - offsetX, y: py * LOGICAL_H - offsetY }
    },
    [offsetX, offsetY],
  )

  /* ── Handlers de ponteiro (mouse + touch) ────────────────────────────── */
  const onPointerDown = (e: React.PointerEvent) => {
    if (textEditing) return
    const { x, y } = toLogical(e.clientX, e.clientY)
    const target = e.currentTarget as HTMLElement
    try {
      target.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }

    // PROMPT 48 — Pan (ferramenta ou Space temporário).
    if (tool === 'pan' || spaceDownRef.current) {
      panDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offX: offsetX,
        offY: offsetY,
      }
      return
    }

    // PROMPT 47 — Conta-gotas (eyedropper).
    if (tool === 'eyedropper') {
      try {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const px = Math.floor((e.clientX - rect.left) * dpr)
        const py = Math.floor((e.clientY - rect.top) * dpr)
        const data = ctx.getImageData(px, py, 1, 1).data
        const hex =
          '#' + [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('')
        setColor(hex.toUpperCase())
        toast.success(`Cor capturada: ${hex}`)
        setTool('select')
        addNotification('Conta-gotas: cor ' + hex)
      } catch {
        toast.error('Não foi possível capturar a cor.')
      }
      return
    }

    // PROMPT 47 — Laser pointer: inicia trilha temporária.
    if (tool === 'laser') {
      laserTrailRef.current.push({ x, y, t: performance.now() })
      dragRef.current = {
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        mode: 'brush',
        creating: undefined,
      }
      return
    }

    // PROMPT 51 — Edição de endpoints de linha.
    if (lineEditing) {
      const el = elements.find((e2) => e2.id === lineEditing)
      if (el && (el.type === 'line' || el.type === 'arrow')) {
        const distStart = Math.hypot(x - el.x, y - el.y)
        const distEnd = Math.hypot(x - (el.x + el.width), y - (el.y + el.height))
        if (distStart < 20 || distEnd < 20) {
          pushHistory()
          const next = elements.map((e2) => {
            if (e2.id !== el.id) return e2
            if (distStart < 20) return { ...e2, x, y }
            return { ...e2, width: x - e2.x, height: y - e2.y }
          })
          commit(next)
          return
        }
      }
      setLineEditing(null)
    }

    // Modo preview: sem seleção/edição.
    if (viewMode === 'preview') return

    if (tool === 'select') {
      const hit = [...elements]
        .reverse()
        .find((el) => el.visible && !el.locked && hitTest(el, x, y))
      if (hit) {
        let nextSel: Set<string>
        if (e.shiftKey) {
          nextSel = new Set(selectedIds)
          if (nextSel.has(hit.id)) nextSel.delete(hit.id)
          else nextSel.add(hit.id)
        } else {
          nextSel = new Set([hit.id])
        }
        setSelectedIds(nextSel)
        const moveStarts = new Map<string, { x: number; y: number }>()
        for (const id of nextSel) {
          const el = elements.find((e2) => e2.id === id)
          if (el) moveStarts.set(id, { x: el.x, y: el.y })
        }
        dragRef.current = { pointerId: e.pointerId, startX: x, startY: y, mode: 'move', moveStarts }
      } else {
        setSelectedIds(new Set())
      }
      return
    }

    if (tool === 'eraser') {
      const hit = [...elements].reverse().find((el) => el.visible && hitTest(el, x, y))
      if (hit) {
        pushHistory()
        commit(elements.filter((el) => el.id !== hit.id))
        setSelectedIds(new Set())
        addNotification('Elemento apagado')
      }
      return
    }

    if (tool === 'text') {
      setTextEditing({ x: snap(x), y: snap(y) })
      setTextValue('')
      return
    }

    if (tool === 'image') {
      // dispara file picker
      fileInputRef.current?.click()
      pendingImagePosRef.current = { x, y }
      return
    }

    // PROMPT 47 — Frame, embed, shape: não criam por arraste direto (exceto shape/frame).
    if (tool === 'frame' || tool === 'shape' || tool === 'embed') {
      // Criam via arraste como retângulo base.
      pushHistory()
      const baseEl: WhiteboardElement = {
        id: uid('el'),
        type: tool,
        x: snap(x),
        y: snap(y),
        width: 0,
        height: 0,
        color,
        strokeWidth,
        visible: true,
        locked: false,
        ...(tool === 'frame' ? { label: 'Frame' } : {}),
        ...(tool === 'embed' ? { embedUrl: embedUrl || '' } : {}),
        ...(tool === 'shape' ? { shapeType: 'star' as const } : {}),
      }
      dragRef.current = {
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        mode: 'create',
        creating: baseEl,
      }
      commit([...elements, baseEl])
      return
    }

    // Criação de elemento (rectangle, ellipse, diamond, line, arrow, brush)
    pushHistory()
    const baseEl: WhiteboardElement = {
      id: uid('el'),
      type: tool,
      x: snap(x),
      y: snap(y),
      width: 0,
      height: 0,
      color,
      strokeWidth,
      visible: true,
      locked: false,
    }
    if (tool === 'brush') {
      baseEl.points = [{ x: 0, y: 0 }]
      dragRef.current = {
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        mode: 'brush',
        creating: baseEl,
      }
      commit([...elements, baseEl])
      addNotification('Traço criado')
    } else {
      dragRef.current = {
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        mode: 'create',
        creating: baseEl,
      }
      commit([...elements, baseEl])
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    // PROMPT 48 — Pan drag.
    const pan = panDragRef.current
    if (pan) {
      const dx =
        (e.clientX - pan.startX) *
        (LOGICAL_W / (canvasRef.current?.getBoundingClientRect().width || 1))
      const dy =
        (e.clientY - pan.startY) *
        (LOGICAL_H / (canvasRef.current?.getBoundingClientRect().height || 1))
      setOffsetX(pan.offX + dx)
      setOffsetY(pan.offY + dy)
      return
    }

    const drag = dragRef.current
    if (!drag) return
    const { x, y } = toLogical(e.clientX, e.clientY)

    // PROMPT 47 — Laser trail.
    if (tool === 'laser') {
      laserTrailRef.current.push({ x, y, t: performance.now() })
      render()
      return
    }

    if (drag.mode === 'brush' && drag.creating) {
      const el = drag.creating
      el.points!.push({ x: x - el.x, y: y - el.y })
      commit([...elements])
    } else if (drag.mode === 'create' && drag.creating) {
      const el = drag.creating
      el.width = snap(x) - snap(drag.startX)
      el.height = snap(y) - snap(drag.startY)
      commit([...elements])
    } else if (drag.mode === 'move' && drag.moveStarts) {
      const dx = x - drag.startX
      const dy = y - drag.startY
      const next = elements.map((el) => {
        const start = drag.moveStarts!.get(el.id)
        if (!start) return el
        return {
          ...el,
          x: snap(start.x + dx),
          y: snap(start.y + dy),
        }
      })
      commit(next)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (panDragRef.current?.pointerId === e.pointerId) {
      const target = e.currentTarget as HTMLElement
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
      panDragRef.current = null
      return
    }
    if (dragRef.current?.pointerId === e.pointerId) {
      const target = e.currentTarget as HTMLElement
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
    if (dragRef.current?.mode === 'create' && dragRef.current.creating) {
      const el = dragRef.current.creating
      if (Math.abs(el.width) < 5 && Math.abs(el.height) < 5) {
        // clique sem arrasto — remove elemento vazio
        commit(elements.filter((e2) => e2.id !== el.id))
      } else {
        addNotification('Elemento criado')
      }
    }
    dragRef.current = null
  }

  /* ── Duplo-clique: editar texto, endpoints de linha, ou curva. ──────── */
  const onDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = toLogical(e.clientX, e.clientY)
    const hit = [...elements].reverse().find((el) => el.visible && hitTest(el, x, y))
    if (!hit) return
    if (hit.type === 'text') {
      setTextEditing({ x: hit.x, y: hit.y })
      setTextValue(hit.text || '')
      setSelectedIds(new Set([hit.id]))
    } else if (hit.type === 'line' || hit.type === 'arrow') {
      setLineEditing(hit.id)
      setSelectedIds(new Set([hit.id]))
      toast.info('Arraste os pontos para editar a linha.')
    }
  }

  /* ── Texto: confirma criação ─────────────────────────────────────────── */
  const confirmText = () => {
    if (!textEditing) return
    if (textValue.trim()) {
      pushHistory()
      // Se havia um elemento selecionado de texto, atualiza; senão cria.
      const existing =
        selectedIds.size === 1
          ? elements.find((e) => e.id === [...selectedIds][0] && e.type === 'text')
          : undefined
      if (existing) {
        commit(elements.map((e) => (e.id === existing.id ? { ...e, text: textValue } : e)))
      } else {
        const el: WhiteboardElement = {
          id: uid('el'),
          type: 'text',
          x: textEditing.x,
          y: textEditing.y,
          width: 0,
          height: 0,
          text: textValue,
          color,
          strokeWidth,
          visible: true,
          locked: false,
        }
        commit([...elements, el])
        addNotification('Texto criado')
      }
    }
    setTextEditing(null)
    setTextValue('')
    setTool('select')
  }

  /* ── Imagem: upload e posicionamento ─────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingImagePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/image\/(jpeg|png)/.test(file.type)) {
      toast.warning('Apenas JPEG e PNG.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      const img = new Image()
      img.src = dataUrl
      await new Promise((res) => {
        img.onload = res
      })
      const pos = pendingImagePosRef.current
      // Escala para no máx 40% da largura lógica
      const maxW = LOGICAL_W * 0.4
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      pushHistory()
      const el: WhiteboardElement = {
        id: uid('el'),
        type: 'image',
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        color: '#FFFFFF',
        strokeWidth: 1,
        visible: true,
        locked: false,
        dataUrl,
      }
      imgCache.current.set(el.id, img)
      commit([...elements, el])
      setTool('select')
      addNotification('Imagem inserida')
    } catch {
      toast.error('Falha ao ler imagem.')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ── Undo / Redo / Clear ─────────────────────────────────────────────── */
  const undo = () => {
    const prev = undoStack.current.pop()
    if (prev) {
      redoStack.current.push([...elements])
      commit(prev)
      setSelectedIds(new Set())
    }
  }
  const redo = () => {
    const next = redoStack.current.pop()
    if (next) {
      undoStack.current.push([...elements])
      commit(next)
      setSelectedIds(new Set())
    }
  }
  const clearAll = () => {
    pushHistory()
    commit([])
    setSelectedIds(new Set())
    setConfirmClear(false)
    toast.info('Quadro limpo.')
    addNotification('Quadro limpo')
  }

  /* ── Zoom persistente + estado de canvas ─────────────────────────────── */
  useEffect(() => {
    setWhiteboard({
      ...whiteboard,
      zoom,
      showGrid,
      snapToGrid,
      theme,
      viewMode,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, showGrid, snapToGrid, theme, viewMode])

  /* ── Camadas: toggle visibilidade, bloqueio, deletar, reordenar ──────── */
  const toggleVisible = (id: string) => {
    commit(elements.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el)))
  }
  const toggleLock = (id: string) => {
    commit(elements.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el)))
  }
  const deleteEl = (id: string) => {
    pushHistory()
    commit(elements.filter((el) => el.id !== id))
    setSelectedIds((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
    addNotification('Camada deletada')
  }
  const moveLayer = (id: string, dir: -1 | 1) => {
    const idx = elements.findIndex((el) => el.id === id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= elements.length) return
    const next = [...elements]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    pushHistory()
    commit(next)
  }

  /* ── PROMPT 50 — Enviar para frente/trás (extremos) + flip ───────────── */
  const bringToFront = () => {
    if (selectedIds.size === 0) return
    pushHistory()
    const sel = elements.filter((e) => selectedIds.has(e.id))
    const rest = elements.filter((e) => !selectedIds.has(e.id))
    commit([...rest, ...sel])
    addNotification('Enviado para frente')
  }
  const sendToBack = () => {
    if (selectedIds.size === 0) return
    pushHistory()
    const sel = elements.filter((e) => selectedIds.has(e.id))
    const rest = elements.filter((e) => !selectedIds.has(e.id))
    commit([...sel, ...rest])
    addNotification('Enviado para trás')
  }
  const flipHorizontal = () => {
    if (selectedIds.size === 0) return
    pushHistory()
    commit(
      elements.map((el) =>
        selectedIds.has(el.id) ? { ...el, width: -el.width, x: el.x + el.width } : el,
      ),
    )
    addNotification('Invertido horizontalmente')
  }
  const flipVertical = () => {
    if (selectedIds.size === 0) return
    pushHistory()
    commit(
      elements.map((el) =>
        selectedIds.has(el.id) ? { ...el, height: -el.height, y: el.y + el.height } : el,
      ),
    )
    addNotification('Invertido verticalmente')
  }

  /* ── Agrupar / Desagrupar ────────────────────────────────────────────── */
  const groupSelected = () => {
    if (selectedIds.size < 2) {
      toast.warning('Selecione 2+ elementos (Shift+clique).')
      return
    }
    const g: WhiteboardGroup = { id: uid('grp'), memberIds: Array.from(selectedIds) }
    setWhiteboard({ ...whiteboard, groups: [...groups, g] })
    toast.success('Elementos agrupados.')
    addNotification('Elementos agrupados')
  }
  const ungroupSelected = () => {
    const memberIds = new Set(selectedIds)
    const remaining = groups.filter((g) => !g.memberIds.some((id) => memberIds.has(id)))
    if (remaining.length === groups.length) {
      toast.info('Nenhum grupo contém os elementos selecionados.')
      return
    }
    setWhiteboard({ ...whiteboard, groups: remaining })
    toast.info('Grupo desfeito.')
    addNotification('Grupo desfeito')
  }

  /* ── Alinhamento (múltipla seleção) ──────────────────────────────────── */
  const align = (axis: 'h' | 'v', pos: 'start' | 'center' | 'end') => {
    if (selectedIds.size < 2) {
      toast.warning('Selecione 2+ elementos para alinhar.')
      return
    }
    const sel = elements.filter((el) => selectedIds.has(el.id))
    if (axis === 'h') {
      const minTop = Math.min(...sel.map((el) => bbox(el).y))
      const maxBottom = Math.max(...sel.map((el) => bbox(el).y + bbox(el).h))
      const center = (minTop + maxBottom) / 2
      const next = elements.map((el) => {
        if (!selectedIds.has(el.id)) return el
        const b = bbox(el)
        let newY = el.y
        if (pos === 'start') newY = el.y + (minTop - b.y)
        else if (pos === 'center') newY = el.y + (center - (b.y + b.h / 2))
        else newY = el.y + (maxBottom - (b.y + b.h))
        return { ...el, y: newY }
      })
      pushHistory()
      commit(next)
    } else {
      const minLeft = Math.min(...sel.map((el) => bbox(el).x))
      const maxRight = Math.max(...sel.map((el) => bbox(el).x + bbox(el).w))
      const center = (minLeft + maxRight) / 2
      const next = elements.map((el) => {
        if (!selectedIds.has(el.id)) return el
        const b = bbox(el)
        let newX = el.x
        if (pos === 'start') newX = el.x + (minLeft - b.x)
        else if (pos === 'center') newX = el.x + (center - (b.x + b.w / 2))
        else newX = el.x + (maxRight - (b.x + b.w))
        return { ...el, x: newX }
      })
      pushHistory()
      commit(next)
    }
  }

  /* ── PROMPT 48 — Zoom to fit / zoom to selection ─────────────────────── */
  const zoomToFit = () => {
    if (elements.length === 0) {
      setZoom(1)
      setOffsetX(0)
      setOffsetY(0)
      return
    }
    const minX = Math.min(...elements.map((e) => bbox(e).x))
    const minY = Math.min(...elements.map((e) => bbox(e).y))
    const maxX = Math.max(...elements.map((e) => bbox(e).x + bbox(e).w))
    const maxY = Math.max(...elements.map((e) => bbox(e).y + bbox(e).h))
    const w = maxX - minX || 1
    const h = maxY - minY || 1
    const zx = LOGICAL_W / w
    const zy = LOGICAL_H / h
    setZoom(Math.min(2, Math.max(0.5, Math.min(zx, zy) * 0.9)))
    setOffsetX(-minX)
    setOffsetY(-minY)
    toast.info('Ajustado a todos os elementos.')
  }
  const zoomToSelection = () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione elementos para ajustar.')
      return
    }
    const sel = elements.filter((e) => selectedIds.has(e.id))
    const minX = Math.min(...sel.map((e) => bbox(e).x))
    const minY = Math.min(...sel.map((e) => bbox(e).y))
    const maxX = Math.max(...sel.map((e) => bbox(e).x + bbox(e).w))
    const maxY = Math.max(...sel.map((e) => bbox(e).y + bbox(e).h))
    const w = maxX - minX || 1
    const h = maxY - minY || 1
    const zx = LOGICAL_W / w
    const zy = LOGICAL_H / h
    setZoom(Math.min(2, Math.max(0.5, Math.min(zx, zy) * 0.8)))
    setOffsetX(-minX)
    setOffsetY(-minY)
    toast.info('Ajustado à seleção.')
  }

  /* ── PROMPT 49 — Clipboard, duplicar, copiar/colar estilo ────────────── */
  const selectedElements = elements.filter((e) => selectedIds.has(e.id))
  const copySelection = () => {
    if (selectedElements.length === 0) {
      toast.warning('Nada selecionado.')
      return
    }
    clipboardRef.current = selectedElements.map((e) => ({ ...e }))
    toast.success(`${selectedElements.length} elemento(s) copiado(s).`)
    addNotification('Copiado')
  }
  const cutSelection = () => {
    if (selectedElements.length === 0) {
      toast.warning('Nada selecionado.')
      return
    }
    clipboardRef.current = selectedElements.map((e) => ({ ...e }))
    pushHistory()
    commit(elements.filter((e) => !selectedIds.has(e.id)))
    setSelectedIds(new Set())
    toast.success('Recortado.')
    addNotification('Recortado')
  }
  const pasteClipboard = (offset = 30) => {
    if (clipboardRef.current.length === 0) {
      toast.warning('Área de transferência vazia.')
      return
    }
    pushHistory()
    const newOnes = clipboardRef.current.map((e) => ({
      ...e,
      id: uid('el'),
      x: e.x + offset,
      y: e.y + offset,
      points: e.points ? e.points.map((p) => ({ ...p })) : undefined,
    }))
    commit([...elements, ...newOnes])
    setSelectedIds(new Set(newOnes.map((e) => e.id)))
    toast.success(`${newOnes.length} elemento(s) colado(s).`)
    addNotification('Colado')
  }
  const pasteAsText = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        toast.warning('Sem texto no clipboard do sistema.')
        return
      }
      pushHistory()
      const el: WhiteboardElement = {
        id: uid('el'),
        type: 'text',
        x: 200,
        y: 200,
        width: 0,
        height: 0,
        text,
        color,
        strokeWidth,
        visible: true,
        locked: false,
      }
      commit([...elements, el])
      toast.success('Texto colado.')
      addNotification('Texto colado')
    } catch {
      toast.error('Não foi possível ler o clipboard do sistema.')
    }
  }
  const selectAll = () => {
    setSelectedIds(new Set(elements.filter((e) => e.visible).map((e) => e.id)))
  }
  const duplicateSelection = () => {
    if (selectedElements.length === 0) {
      toast.warning('Nada selecionado.')
      return
    }
    pushHistory()
    const newOnes = selectedElements.map((e) => ({
      ...e,
      id: uid('el'),
      x: e.x + 30,
      y: e.y + 30,
      points: e.points ? e.points.map((p) => ({ ...p })) : undefined,
    }))
    commit([...elements, ...newOnes])
    setSelectedIds(new Set(newOnes.map((e) => e.id)))
    toast.success('Duplicado.')
    addNotification('Duplicado')
  }
  const copyAsPNG = async () => {
    const safeW = LOGICAL_W * 0.8
    const safeX = (LOGICAL_W - safeW) / 2
    const targets = selectedElements.length > 0 ? selectedElements : elements
    if (targets.length === 0) {
      toast.warning('Nada para copiar.')
      return
    }
    const off = document.createElement('canvas')
    off.width = safeW
    off.height = LOGICAL_H
    const ctx = off.getContext('2d')!
    ctx.fillStyle = theme === 'light' ? '#F5F5F5' : '#0F0F15'
    ctx.fillRect(0, 0, safeW, LOGICAL_H)
    ctx.translate(-safeX, 0)
    for (const el of targets) {
      if (el.type === 'image' && el.dataUrl) {
        ;(el as any)._img = imgCache.current.get(el.id)
      }
      renderElement(ctx, el)
    }
    try {
      off.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Falha ao gerar PNG.')
          return
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          toast.success('PNG copiado para a área de transferência.')
          addNotification('PNG copiado')
        } catch {
          toast.error('Navegador não suporta copiar imagem.')
        }
      }, 'image/png')
    } catch {
      toast.error('Falha ao copiar PNG.')
    }
  }
  const copyStyle = () => {
    if (selectedElements.length === 0) return
    const first = selectedElements[0]
    styleClipboardRef.current = { color: first.color, strokeWidth: first.strokeWidth }
    toast.success('Estilo copiado.')
  }
  const pasteStyle = () => {
    if (!styleClipboardRef.current) {
      toast.warning('Sem estilo copiado.')
      return
    }
    if (selectedIds.size === 0) return
    const { color: c, strokeWidth: sw } = styleClipboardRef.current
    pushHistory()
    commit(
      elements.map((el) =>
        selectedIds.has(el.id)
          ? { ...el, color: c ?? el.color, strokeWidth: sw ?? el.strokeWidth }
          : el,
      ),
    )
    toast.success('Estilo aplicado.')
    addNotification('Estilo aplicado')
  }

  /* ── PROMPT 51 — Curva, crop, link, fill, fonte ──────────────────────── */
  const toggleCurved = () => {
    if (selectedIds.size === 0) return
    pushHistory()
    commit(
      elements.map((el) =>
        selectedIds.has(el.id) && (el.type === 'line' || el.type === 'arrow')
          ? { ...el, curved: !el.curved }
          : el,
      ),
    )
  }
  const applyCrop = () => {
    if (selectedIds.size !== 1) {
      toast.warning('Selecione uma imagem.')
      return
    }
    const el = elements.find((e) => selectedIds.has(e.id))
    if (!el || el.type !== 'image') {
      toast.warning('Selecione uma imagem.')
      return
    }
    // Crop simples: usa o bbox atual como região (fallback demo).
    setCropEditing(el.id)
    toast.info('Crop ativado. Arraste a imagem para definir a região (demo).')
  }
  const confirmCrop = () => {
    if (!cropEditing) return
    const el = elements.find((e) => e.id === cropEditing)
    if (!el || el.type !== 'image') {
      setCropEditing(null)
      return
    }
    pushHistory()
    commit(
      elements.map((e) =>
        e.id === el.id
          ? {
              ...e,
              crop: { x: 0, y: 0, w: 100, h: 100 },
            }
          : e,
      ),
    )
    setCropEditing(null)
    toast.success('Recorte aplicado.')
    addNotification('Imagem recortada')
  }
  const openLinkDialog = () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione um elemento.')
      return
    }
    const el = elements.find((e) => selectedIds.has(e.id))
    setLinkUrl(el?.link || '')
    setLinkOpen(true)
  }
  const applyLink = () => {
    pushHistory()
    commit(
      elements.map((el) => (selectedIds.has(el.id) ? { ...el, link: linkUrl || undefined } : el)),
    )
    setLinkOpen(false)
    toast.success('Link atualizado.')
    addNotification('Link atualizado')
  }
  const setFill = (fillColor: string | undefined) => {
    if (selectedIds.size === 0) return
    pushHistory()
    commit(elements.map((el) => (selectedIds.has(el.id) ? { ...el, fillColor } : el)))
  }
  const setFontFamily = (ff: string) => {
    if (selectedIds.size === 0) return
    pushHistory()
    commit(
      elements.map((el) =>
        selectedIds.has(el.id) && el.type === 'text' ? { ...el, fontFamily: ff } : el,
      ),
    )
  }
  const adjustFontSize = (delta: number) => {
    if (selectedIds.size === 0) return
    pushHistory()
    commit(
      elements.map((el) =>
        selectedIds.has(el.id) && el.type === 'text'
          ? { ...el, fontSize: Math.max(8, (el.fontSize ?? 32) + delta) }
          : el,
      ),
    )
  }

  /* ── PROMPT 51 — Fluxograma por Tab ──────────────────────────────────── */
  const flowchartNext = (reverse = false) => {
    if (selectedIds.size !== 1) return
    const el = elements.find((e) => selectedIds.has(e.id))
    if (!el || el.type !== 'rectangle') return
    const offset = reverse ? -150 : 150
    const newX = el.x + el.width + offset
    const newY = el.y
    pushHistory()
    const rectEl: WhiteboardElement = {
      id: uid('el'),
      type: 'rectangle',
      x: newX,
      y: newY,
      width: el.width,
      height: el.height,
      color: el.color,
      strokeWidth: el.strokeWidth,
      visible: true,
      locked: false,
    }
    const arrowEl: WhiteboardElement = {
      id: uid('el'),
      type: 'arrow',
      x: el.x + el.width,
      y: el.y + el.height / 2,
      width: newX - (el.x + el.width),
      height: 0,
      color: el.color,
      strokeWidth: el.strokeWidth,
      visible: true,
      locked: false,
    }
    commit([...elements, rectEl, arrowEl])
    setSelectedIds(new Set([rectEl.id]))
    addNotification('Fluxograma: novo nó')
  }

  /* ── PROMPT 47 — Extras: embed, mermaid, biblioteca de formas ────────── */
  const createEmbed = () => {
    if (!embedUrl.trim()) {
      toast.warning('Cole uma URL.')
      return
    }
    pushHistory()
    const el: WhiteboardElement = {
      id: uid('el'),
      type: 'embed',
      x: 200,
      y: 200,
      width: 400,
      height: 300,
      color,
      strokeWidth,
      visible: true,
      locked: false,
      embedUrl: embedUrl.trim(),
    }
    commit([...elements, el])
    setEmbedOpen(false)
    setEmbedUrl('')
    toast.success('Embed inserido.')
    addNotification('Embed inserido')
  }
  const createMermaidText = () => {
    toast.info('Recurso Mermaid disponível em breve. Cole seu diagrama como texto.')
    if (mermaidText.trim()) {
      pushHistory()
      const el: WhiteboardElement = {
        id: uid('el'),
        type: 'text',
        x: 200,
        y: 200,
        width: 0,
        height: 0,
        text: mermaidText,
        color,
        strokeWidth,
        visible: true,
        locked: false,
        fontFamily: 'mono',
      }
      commit([...elements, el])
      addNotification('Diagrama Mermaid colado como texto')
    }
    setMermaidOpen(false)
    setMermaidText('')
  }
  const insertShape = (shapeType: NonNullable<WhiteboardElement['shapeType']>) => {
    pushHistory()
    const el: WhiteboardElement = {
      id: uid('el'),
      type: 'shape',
      x: 300,
      y: 300,
      width: 200,
      height: 200,
      color,
      strokeWidth,
      visible: true,
      locked: false,
      shapeType,
    }
    commit([...elements, el])
    setShapeOpen(false)
    addNotification('Forma inserida: ' + shapeType)
  }

  /* ── PROMPT 48 — Localizar no canvas ─────────────────────────────────── */
  const findElement = () => {
    if (!findQuery.trim()) return
    const match = elements.find(
      (e) => e.type === 'text' && e.text && e.text.toLowerCase().includes(findQuery.toLowerCase()),
    )
    if (match) {
      setSelectedIds(new Set([match.id]))
      const b = bbox(match)
      setOffsetX(-b.x + LOGICAL_W / 2 - b.w / 2)
      setOffsetY(-b.y + LOGICAL_H / 2 - b.h / 2)
      toast.success('Elemento encontrado.')
    } else {
      toast.warning('Nenhum elemento de texto encontrado.')
    }
  }

  /* ── PROMPT 48 — Paleta de comandos ──────────────────────────────────── */
  const commands = useMemo(
    () => [
      { label: 'Seleção (V)', action: () => setTool('select') },
      { label: 'Pan (H)', action: () => setTool('pan') },
      { label: 'Retângulo (R)', action: () => setTool('rectangle') },
      { label: 'Losango (D)', action: () => setTool('diamond') },
      { label: 'Elipse (O)', action: () => setTool('ellipse') },
      { label: 'Seta (A)', action: () => setTool('arrow') },
      { label: 'Linha (L)', action: () => setTool('line') },
      { label: 'Lápis (P)', action: () => setTool('brush') },
      { label: 'Texto (T)', action: () => setTool('text') },
      { label: 'Imagem (9)', action: () => setTool('image') },
      { label: 'Borracha (E)', action: () => setTool('eraser') },
      { label: 'Frame (F)', action: () => setTool('frame') },
      { label: 'Laser (K)', action: () => setTool('laser') },
      { label: 'Conta-gotas', action: () => setTool('eyedropper') },
      { label: 'Desfazer (Ctrl+Z)', action: undo },
      { label: 'Refazer (Ctrl+Shift+Z)', action: redo },
      { label: 'Selecionar tudo (Ctrl+A)', action: selectAll },
      { label: 'Duplicar (Ctrl+D)', action: duplicateSelection },
      { label: 'Copiar (Ctrl+C)', action: copySelection },
      { label: 'Colar (Ctrl+V)', action: () => pasteClipboard() },
      { label: 'Recortar (Ctrl+X)', action: cutSelection },
      { label: 'Copiar PNG', action: copyAsPNG },
      { label: 'Enviar para frente (Ctrl+])', action: bringToFront },
      { label: 'Enviar para trás (Ctrl+[)', action: sendToBack },
      { label: 'Inverter horizontal', action: flipHorizontal },
      { label: 'Inverter vertical', action: flipVertical },
      { label: 'Modo Zen (Ctrl+Shift+Z)', action: () => setZenMode((v) => !v) },
      { label: 'Alternar grade', action: () => setShowGrid((v) => !v) },
      { label: 'Alternar snap', action: () => setSnapToGrid((v) => !v) },
      { label: 'Alternar tema', action: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) },
      { label: 'Modo Preview', action: () => setViewMode('preview') },
      { label: 'Modo Editor', action: () => setViewMode('editor') },
      { label: 'Ajustar a todos', action: zoomToFit },
      { label: 'Zoom à seleção', action: zoomToSelection },
      { label: 'Exportar PNG', action: exportPNG },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elements, selectedIds, whiteboard],
  )
  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(commandQuery.toLowerCase()),
  )
  const runCommand = (idx: number) => {
    const cmd = filteredCommands[idx]
    if (cmd) {
      cmd.action()
      setCommandOpen(false)
      setCommandQuery('')
    }
  }

  /* ── PROMPT 52 — Exportar coluna central como PNG ────────────────────── */
  function exportPNG() {
    const safeW = LOGICAL_W * 0.8
    const safeX = (LOGICAL_W - safeW) / 2
    const off = document.createElement('canvas')
    off.width = safeW
    off.height = LOGICAL_H
    const ctx = off.getContext('2d')!
    ctx.fillStyle = theme === 'light' ? '#F5F5F5' : '#0F0F15'
    ctx.fillRect(0, 0, safeW, LOGICAL_H)
    ctx.translate(-safeX, 0)
    // PROMPT 52 — Apenas elementos que intersectam a coluna central.
    for (const el of elements) {
      const b = bbox(el)
      if (b.x + b.w < safeX || b.x > safeX + safeW) continue
      if (el.type === 'image' && el.dataUrl) {
        ;(el as any)._img = imgCache.current.get(el.id)
      }
      renderElement(ctx, el)
    }
    const dataUrl = off.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'lumen-quadro.png'
    a.click()
    toast.success('Quadro exportado (coluna central).')
    addNotification('PNG exportado')
  }

  /* ── PROMPT 52 — "Usar este quadro" ──────────────────────────────────── */
  const useThisBoard = () => {
    const safeW = LOGICAL_W * 0.8
    const safeX = (LOGICAL_W - safeW) / 2
    const off = document.createElement('canvas')
    off.width = safeW
    off.height = LOGICAL_H
    const ctx = off.getContext('2d')!
    ctx.fillStyle = theme === 'light' ? '#F5F5F5' : '#0F0F15'
    ctx.fillRect(0, 0, safeW, LOGICAL_H)
    ctx.translate(-safeX, 0)
    for (const el of elements) {
      const b = bbox(el)
      if (b.x + b.w < safeX || b.x > safeX + safeW) continue
      if (el.type === 'image' && el.dataUrl) {
        ;(el as any)._img = imgCache.current.get(el.id)
      }
      renderElement(ctx, el)
    }
    const dataUrl = off.toDataURL('image/png')
    // Salva preview e cena editável em chaves dedicadas.
    writeWhiteboardPreview(dataUrl)
    const sceneSnapshot: WhiteboardState = {
      elements: elements.map((e) => ({
        ...e,
        points: e.points ? e.points.map((p) => ({ ...p })) : undefined,
      })),
      groups: groups.map((g) => ({ ...g })),
      zoom,
      showGrid,
      snapToGrid,
      theme,
      viewMode,
    }
    writeWhiteboardScene(sceneSnapshot)
    // Também atualiza o rascunho automático.
    setWhiteboard(sceneSnapshot)
    toast.success('Quadro aplicado ao Estúdio! ✨')
    addNotification('Quadro aplicado ao Estúdio')
    navigate('/gravadora')
  }

  /* ── Cancelar (descarta alterações não confirmadas) ──────────────────── */
  const cancelBoard = () => {
    // Restaura a última cena confirmada (se houver).
    const scene = readWhiteboardScene()
    if (scene) {
      setWhiteboard(scene)
    }
    navigate('/gravadora')
  }

  /* ── PROMPT 46 — Atalhos de teclado globais ──────────────────────────── */
  useEffect(() => {
    const isEditing = () => {
      if (textEditing) return true
      const tag = document.activeElement?.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select'
    }
    const onKeyDown = (e: KeyboardEvent) => {
      // Space para pan temporário (não dispara em inputs).
      if (e.code === 'Space' && !isEditing()) {
        spaceDownRef.current = true
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
        e.preventDefault()
        return
      }
      if (isEditing()) return

      // PROMPT 48 — Modo Zen (Ctrl+Shift+Z), Paleta (Ctrl+K), Localizar (Ctrl+F).
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        setZenMode((v) => !v)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((v) => !v)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setFindOpen((v) => !v)
        return
      }

      // PROMPT 49 — Clipboard / duplicar / selecionar tudo.
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase()
        if (k === 'x') {
          e.preventDefault()
          cutSelection()
          return
        }
        if (k === 'c' && !e.shiftKey) {
          e.preventDefault()
          copySelection()
          return
        }
        if (k === 'c' && e.shiftKey) {
          e.preventDefault()
          copyStyle()
          return
        }
        if (k === 'v' && !e.shiftKey) {
          e.preventDefault()
          pasteClipboard()
          return
        }
        if (k === 'v' && e.shiftKey) {
          e.preventDefault()
          // Colar como texto simples OU colar estilo (ambos em Ctrl+Shift+V
          // conforme prompts 49 — prioriza texto do sistema, senão estilo).
          pasteAsText()
          return
        }
        if (k === 'a') {
          e.preventDefault()
          selectAll()
          return
        }
        if (k === 'd') {
          e.preventDefault()
          duplicateSelection()
          return
        }
        if (e.key === ']') {
          e.preventDefault()
          bringToFront()
          return
        }
        if (e.key === '[') {
          e.preventDefault()
          sendToBack()
          return
        }
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
          return
        }
        if (k === 'y' || (k === 'z' && e.shiftKey)) {
          e.preventDefault()
          redo()
          return
        }
        return
      }

      // PROMPT 48 — Page Up/Down (scroll vertical).
      if (e.key === 'PageUp') {
        e.preventDefault()
        setOffsetY((v) => v + 200)
        return
      }
      if (e.key === 'PageDown') {
        e.preventDefault()
        setOffsetY((v) => v - 200)
        return
      }

      // ESC sai de modos especiais.
      if (e.key === 'Escape') {
        if (zenMode) setZenMode(false)
        if (lineEditing) setLineEditing(null)
        if (cropEditing) setCropEditing(null)
        if (commandOpen) setCommandOpen(false)
        if (findOpen) setFindOpen(false)
        setTool('select')
        return
      }

      // PROMPT 51 — Fluxograma por Tab após retângulo selecionado.
      if (e.key === 'Tab') {
        e.preventDefault()
        flowchartNext(e.shiftKey)
        return
      }

      // Atalhos de ferramentas.
      const key = e.key.toLowerCase()
      const mapped = TOOL_SHORTCUTS[key]
      if (mapped) {
        setTool(mapped)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false
        if (canvasRef.current && tool !== 'pan') {
          canvasRef.current.style.cursor =
            tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    textEditing,
    elements,
    selectedIds,
    tool,
    zenMode,
    lineEditing,
    cropEditing,
    commandOpen,
    findOpen,
  ])

  const TOOL_BUTTONS: {
    id: WhiteboardTool
    icon: React.ReactNode
    label: string
    shortcut?: string
  }[] = [
    {
      id: 'select',
      icon: <MousePointer2 className="w-3.5 h-3.5" />,
      label: 'Seleção',
      shortcut: 'V',
    },
    { id: 'pan', icon: <Hand className="w-3.5 h-3.5" />, label: 'Mover tela', shortcut: 'H' },
    {
      id: 'rectangle',
      icon: <Square className="w-3.5 h-3.5" />,
      label: 'Retângulo',
      shortcut: 'R',
    },
    {
      id: 'diamond',
      icon: <DiamondIcon className="w-3.5 h-3.5" />,
      label: 'Losango',
      shortcut: 'D',
    },
    { id: 'ellipse', icon: <Circle className="w-3.5 h-3.5" />, label: 'Círculo', shortcut: 'O' },
    { id: 'arrow', icon: <ArrowRight className="w-3.5 h-3.5" />, label: 'Seta', shortcut: 'A' },
    { id: 'line', icon: <Minus className="w-3.5 h-3.5" />, label: 'Linha', shortcut: 'L' },
    { id: 'brush', icon: <Pencil className="w-3.5 h-3.5" />, label: 'Lápis', shortcut: 'P' },
    { id: 'text', icon: <Type className="w-3.5 h-3.5" />, label: 'Texto', shortcut: 'T' },
    { id: 'image', icon: <ImagePlus className="w-3.5 h-3.5" />, label: 'Imagem', shortcut: '9' },
    { id: 'eraser', icon: <Eraser className="w-3.5 h-3.5" />, label: 'Borracha', shortcut: 'E' },
  ]

  const EXTRA_BUTTONS: {
    id: string
    icon: React.ReactNode
    label: string
    shortcut?: string
    onClick: () => void
  }[] = [
    {
      id: 'frame',
      icon: <Frame className="w-3.5 h-3.5" />,
      label: 'Frame',
      shortcut: 'F',
      onClick: () => setTool('frame'),
    },
    {
      id: 'embed',
      icon: <Globe className="w-3.5 h-3.5" />,
      label: 'Web Embed',
      onClick: () => setEmbedOpen(true),
    },
    {
      id: 'laser',
      icon: <MousePointerClick className="w-3.5 h-3.5" />,
      label: 'Ponteiro Laser',
      shortcut: 'K',
      onClick: () => setTool('laser'),
    },
    {
      id: 'mermaid',
      icon: <Brain className="w-3.5 h-3.5" />,
      label: 'Mermaid → Excalidraw',
      onClick: () => setMermaidOpen(true),
    },
    {
      id: 'shapes',
      icon: <Shapes className="w-3.5 h-3.5" />,
      label: 'Biblioteca de formas',
      onClick: () => setShapeOpen(true),
    },
    {
      id: 'eyedropper',
      icon: <Pipette className="w-3.5 h-3.5" />,
      label: 'Conta-gotas',
      onClick: () => setTool('eyedropper'),
    },
  ]

  const canUndo = undoStack.current.length > 0
  const canRedo = redoStack.current.length > 0

  /* Cursor do canvas conforme ferramenta. */
  const canvasCursor = useMemo(() => {
    if (tool === 'pan') return spaceDownRef.current ? 'grabbing' : 'grab'
    if (tool === 'laser') return 'crosshair'
    if (tool === 'eyedropper') return 'crosshair'
    if (viewMode === 'preview') return 'default'
    return tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'
  }, [tool, viewMode])

  /* ── PROMPT 48 — Modo Zen: só canvas em tela cheia. ──────────────────── */
  if (zenMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            touchAction: 'none',
            cursor: canvasCursor,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <button
          onClick={() => setZenMode(false)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
          title="Sair do Modo Zen (Esc)"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* PROMPT 45 — Header dedicado da rota /estudio/quadro */}
      {standalone && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1E1E2A] shrink-0 bg-[#0B0B10]">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7C5CFC]" />
              Quadro — LUMEN Studio
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30 text-[10px] font-bold">
              9:16
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelBoard}
              className="px-3 py-1.5 rounded-lg text-xs text-[#9494A8] hover:text-white hover:bg-white/5"
              title="Cancelar (volta sem salvar a versão atual)"
            >
              Cancelar
            </button>
            <button
              onClick={() => navigate('/gravadora')}
              className="px-3 py-1.5 rounded-lg text-xs text-white bg-[#1E1E2A] hover:bg-[#2A2A3A] flex items-center gap-1.5"
              title="Voltar ao Estúdio"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Estúdio
            </button>
            <button
              onClick={useThisBoard}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C5CFC] hover:bg-[#6A48E0] flex items-center gap-1.5 shadow-lg shadow-[#7C5CFC]/25"
              title="Usar este quadro no Estúdio"
            >
              <Check className="w-3.5 h-3.5" /> Usar este quadro
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Coluna principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar (oculta em preview) */}
          {viewMode === 'editor' && (
            <>
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1E1E2A] shrink-0 flex-wrap">
                {TOOL_BUTTONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setTool(b.id)}
                    className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                      tool === b.id
                        ? 'bg-[#7C5CFC] text-white'
                        : 'bg-[#1E1E2A] text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20'
                    }`}
                    title={b.shortcut ? `${b.label} (${b.shortcut})` : b.label}
                  >
                    {b.icon}
                  </button>
                ))}

                <div className="w-px h-5 bg-[#1E1E2A] mx-0.5" />

                {/* Extras (P47) */}
                {EXTRA_BUTTONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={b.onClick}
                    className={`p-1.5 rounded-md transition-colors bg-[#1E1E2A] text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                      tool === b.id ? 'bg-[#7C5CFC] text-white' : ''
                    }`}
                    title={b.shortcut ? `${b.label} (${b.shortcut})` : b.label}
                  >
                    {b.icon}
                  </button>
                ))}

                {/* Notificações (P47) */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative p-1.5 rounded-md bg-[#1E1E2A] text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                    title="Notificações"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#7C5CFC]" />
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#14141C] border border-[#1E1E2A] rounded-lg shadow-xl z-30 p-1.5">
                      <p className="text-[9px] font-bold text-white uppercase tracking-wider px-1 py-0.5">
                        Últimas ações
                      </p>
                      {notifications.length === 0 ? (
                        <p className="text-[9px] text-[#9494A8] px-1 py-1">Sem notificações.</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className="text-[10px] text-[#9494A8] px-1 py-1 hover:text-white"
                          >
                            {n.text}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="w-px h-5 bg-[#1E1E2A] mx-0.5" />

                {/* Cores */}
                <div className="flex items-center gap-0.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-4 h-4 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                        color === c ? 'border-white scale-110' : 'border-[#1E1E2A]'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    className="w-4 h-4 rounded-full border-2 border-[#1E1E2A] bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
                    title="Cor customizada"
                  />
                </div>

                <div className="w-px h-5 bg-[#1E1E2A] mx-0.5" />

                {/* Espessura */}
                <div className="flex items-center gap-1 w-20">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-full accent-[#7C5CFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                    title="Espessura"
                  />
                  <span className="text-[9px] text-[#9494A8] font-mono w-4">{strokeWidth}</span>
                </div>

                <div className="flex-1" />

                {/* PROMPT 48 — Modo de visualização, tema, zen, grid, snap.
                    Este botão vive dentro do bloco `viewMode === 'editor'`,
                    então ao clicar alternamos para Preview. */}
                <button
                  onClick={() => setViewMode('preview')}
                  className="p-1.5 rounded-md text-[10px] font-semibold text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alternar Editor/Preview"
                >
                  Preview
                </button>
                <button
                  onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                  className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alternar tema claro/escuro"
                >
                  {theme === 'dark' ? '🌙' : '☀️'}
                </button>
                <button
                  onClick={() => setShowGrid((v) => !v)}
                  className={`p-1.5 rounded-md ${
                    showGrid
                      ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]'
                      : 'text-[#9494A8] hover:text-white hover:bg-white/5'
                  }`}
                  title="Grade (50px)"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSnapToGrid((v) => !v)}
                  className={`p-1.5 rounded-md ${
                    snapToGrid
                      ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]'
                      : 'text-[#9494A8] hover:text-white hover:bg-white/5'
                  }`}
                  title="Snap à grade"
                >
                  <Shapes className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZenMode(true)}
                  className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Modo Zen (Ctrl+Shift+Z)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFindOpen((v) => !v)}
                  className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Localizar (Ctrl+F)"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCommandOpen(true)}
                  className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Paleta de comandos (Ctrl+K)"
                >
                  <CommandIcon className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-5 bg-[#1E1E2A] mx-0.5" />

                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Refazer (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                {confirmClear ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-red-300">Limpar?</span>
                    <button
                      onClick={clearAll}
                      className="text-[9px] text-red-400 hover:bg-red-500/20 px-1.5 py-0.5 rounded font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-[9px] text-[#9494A8] hover:text-white px-1.5 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="p-1.5 rounded-md text-[#9494A8] hover:text-red-400 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                    title="Limpar quadro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={exportPNG}
                  className="flex items-center gap-1 p-1.5 rounded-md text-[#22D3EE] hover:bg-[#22D3EE]/10 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                  title="Exportar coluna central como PNG"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
              </div>

              {/* Grupo / alinhamento + transformações (P50) */}
              <div className="flex items-center gap-1 px-2 py-1 border-b border-white/5 shrink-0 flex-wrap">
                <button
                  onClick={groupSelected}
                  className="flex items-center gap-1 text-[9px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-1.5 py-0.5 rounded"
                >
                  <GroupIcon className="w-3 h-3" /> Agrupar
                </button>
                <button
                  onClick={ungroupSelected}
                  className="flex items-center gap-1 text-[9px] text-[#9494A8] hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded"
                >
                  <Ungroup className="w-3 h-3" /> Desagrupar
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  onClick={() => align('v', 'start')}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alinhar à esquerda"
                >
                  <AlignStartVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => align('v', 'center')}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Centralizar horizontal"
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => align('v', 'end')}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alinhar à direita"
                >
                  <AlignEndVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => align('h', 'start')}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alinhar ao topo"
                >
                  <AlignStartHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => align('h', 'center')}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Centralizar vertical"
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => align('h', 'end')}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alinhar à base"
                >
                  <AlignEndHorizontal className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                {/* P50 — Frente/trás extremos + flip */}
                <button
                  onClick={bringToFront}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Enviar para frente (Ctrl+])"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={sendToBack}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Enviar para trás (Ctrl+[)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={flipHorizontal}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Inverter horizontalmente"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={flipVertical}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Inverter verticalmente"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
                {/* P51 — Curva, crop, link, fill, fonte */}
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  onClick={toggleCurved}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Alternar curva"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={applyCrop}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Recortar imagem"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={openLinkDialog}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Adicionar/atualizar link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFill(color)}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Preenchimento (cor atual)"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFill(undefined)}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Sem preenchimento"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <select
                  onChange={(e) => setFontFamily(e.target.value)}
                  defaultValue=""
                  className="text-[9px] bg-[#1C1C27] border border-white/10 rounded px-1 py-0.5 text-white"
                  title="Família de fonte"
                >
                  <option value="">Fonte…</option>
                  <option value="Inter">Inter</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Mono</option>
                </select>
                <button
                  onClick={() => adjustFontSize(2)}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 text-[10px] font-bold"
                  title="Aumentar fonte"
                >
                  A+
                </button>
                <button
                  onClick={() => adjustFontSize(-2)}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 text-[10px] font-bold"
                  title="Diminuir fonte"
                >
                  A−
                </button>
                {/* P49 — Clipboard */}
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  onClick={duplicateSelection}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 text-[9px]"
                  title="Duplicar (Ctrl+D)"
                >
                  Dup
                </button>
                <button
                  onClick={copyAsPNG}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 text-[9px]"
                  title="Copiar como PNG"
                >
                  PNG
                </button>
                <button
                  onClick={copyStyle}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 text-[9px]"
                  title="Copiar estilo (Ctrl+Shift+C)"
                >
                  ⎘
                </button>
                <button
                  onClick={pasteStyle}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 text-[9px]"
                  title="Colar estilo"
                >
                  ⎈
                </button>

                <div className="flex-1" />

                {/* PROMPT 48 — Zoom avançado */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                    className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                    title="Diminuir zoom"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-20 accent-[#7C5CFC]"
                  />
                  <button
                    onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                    className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                    title="Aumentar zoom"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setZoom(1)
                      setOffsetX(0)
                      setOffsetY(0)
                    }}
                    className="px-1.5 py-0.5 rounded text-[9px] text-[#9494A8] hover:text-white hover:bg-white/5 font-mono"
                    title="Reset zoom"
                  >
                    100%
                  </button>
                  <button
                    onClick={zoomToFit}
                    className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                    title="Ajustar a todos"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={zoomToSelection}
                    className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                    title="Zoom à seleção"
                  >
                    <MousePointer2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[9px] text-[#9494A8] font-mono w-9">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              </div>

              {/* Localizar (P48) */}
              {findOpen && (
                <div className="flex items-center gap-1 px-2 py-1 border-b border-white/5">
                  <Search className="w-3 h-3 text-[#9494A8]" />
                  <input
                    autoFocus
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') findElement()
                    }}
                    placeholder="Localizar texto no canvas..."
                    className="flex-1 bg-transparent text-[10px] text-white outline-none"
                  />
                  <button onClick={findElement} className="text-[9px] text-[#7C5CFC]">
                    Buscar
                  </button>
                  <button
                    onClick={() => setFindOpen(false)}
                    className="text-[#9494A8] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Botão para sair do modo Preview (P48) */}
          {viewMode === 'preview' && (
            <div className="absolute top-2 right-2 z-20">
              <button
                onClick={() => setViewMode('editor')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-[#7C5CFC] hover:bg-[#6A48E0] shadow-lg"
                title="Voltar ao modo Editor"
              >
                Sair do Preview
              </button>
            </div>
          )}
          {/* Canvas + edição de texto */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-3 bg-[#07070A]"
          >
            <div className="relative" style={{ width: DISPLAY_W * zoom, height: DISPLAY_H * zoom }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: DISPLAY_W * zoom,
                  height: DISPLAY_H * zoom,
                  touchAction: 'none',
                  cursor: canvasCursor,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onDoubleClick={onDoubleClick}
              />
              {textEditing && (
                <div
                  className="absolute z-20"
                  style={{
                    left: ((textEditing.x + offsetX) / LOGICAL_W) * DISPLAY_W * zoom,
                    top: ((textEditing.y + offsetY) / LOGICAL_H) * DISPLAY_H * zoom,
                  }}
                >
                  <input
                    autoFocus
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    onBlur={confirmText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmText()
                      if (e.key === 'Escape') {
                        setTextEditing(null)
                        setTextValue('')
                        setTool('select')
                      }
                    }}
                    placeholder="digite e Enter..."
                    className="bg-black/80 border border-[#7C5CFC] text-white text-xs px-1.5 py-0.5 rounded outline-none min-w-32"
                    style={{ color }}
                  />
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleImagePick}
          />
        </div>

        {/* Painel de camadas (oculto em preview) */}
        {viewMode === 'editor' && (
          <div className="w-44 shrink-0 bg-[#14141C] border-l border-[#1E1E2A] flex flex-col">
            <div className="px-2 py-1.5 border-b border-[#1E1E2A] shrink-0">
              <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#7C5CFC]" /> Camadas ({elements.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
              {elements.length === 0 ? (
                <p className="text-[9px] text-[#A78BFA]/50 text-center py-3">
                  Sem camadas. Desenhe no quadro.
                </p>
              ) : (
                [...elements].reverse().map((el) => {
                  const top =
                    elements.length - 1 - [...elements].reverse().findIndex((e) => e.id === el.id)
                  return (
                    <LayerRow
                      key={el.id}
                      el={el}
                      index={top}
                      total={elements.length}
                      selected={selectedIds.has(el.id)}
                      onSelect={(shift) => {
                        if (shift) {
                          setSelectedIds((prev) => {
                            const n = new Set(prev)
                            if (n.has(el.id)) n.delete(el.id)
                            else n.add(el.id)
                            return n
                          })
                        } else {
                          setSelectedIds(new Set([el.id]))
                        }
                      }}
                      onToggleVisible={() => toggleVisible(el.id)}
                      onToggleLock={() => toggleLock(el.id)}
                      onDelete={() => deleteEl(el.id)}
                      onMoveUp={() => moveLayer(el.id, 1)}
                      onMoveDown={() => moveLayer(el.id, -1)}
                    />
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* PROMPT 47 — Modal: Web Embed */}
      {embedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#14141C] border border-[#1E1E2A] rounded-xl p-4 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#7C5CFC]" /> Web Embed
              </h3>
              <button
                onClick={() => setEmbedOpen(false)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://exemplo.com"
              className="w-full bg-[#1C1C27] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#7C5CFC]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEmbedOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9494A8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={createEmbed}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C5CFC] hover:bg-[#6A48E0]"
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT 47 — Modal: Mermaid */}
      {mermaidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#14141C] border border-[#1E1E2A] rounded-xl p-4 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#7C5CFC]" /> Mermaid → Excalidraw
              </h3>
              <button
                onClick={() => setMermaidOpen(false)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[#9494A8]">
              Recurso Mermaid disponível em breve. Cole seu diagrama como texto.
            </p>
            <textarea
              autoFocus
              value={mermaidText}
              onChange={(e) => setMermaidText(e.target.value)}
              rows={6}
              placeholder={'graph TD\n  A-->B'}
              className="w-full bg-[#1C1C27] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#7C5CFC] font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMermaidOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9494A8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={createMermaidText}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C5CFC] hover:bg-[#6A48E0]"
              >
                Inserir como texto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT 47 — Drawer: Biblioteca de formas */}
      {shapeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60">
          <div className="bg-[#14141C] border-l border-[#1E1E2A] w-72 h-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shapes className="w-4 h-4 text-[#7C5CFC]" /> Biblioteca de formas
              </h3>
              <button
                onClick={() => setShapeOpen(false)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'star', label: 'Estrela' },
                  { id: 'triangle', label: 'Triângulo' },
                  { id: 'cloud', label: 'Nuvem' },
                  { id: 'heart', label: 'Coração' },
                  { id: 'checkmark', label: 'Checkmark' },
                  { id: 'x', label: 'X' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => insertShape(s.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#1C1C27] hover:bg-[#7C5CFC]/20 text-white text-[10px]"
                >
                  <span className="text-lg">
                    {s.id === 'star'
                      ? '★'
                      : s.id === 'triangle'
                        ? '▲'
                        : s.id === 'cloud'
                          ? '☁'
                          : s.id === 'heart'
                            ? '♥'
                            : s.id === 'checkmark'
                              ? '✓'
                              : '✗'}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROMPT 51 — Modal: Link */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#14141C] border border-[#1E1E2A] rounded-xl p-4 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#7C5CFC]" /> Link do elemento
              </h3>
              <button
                onClick={() => setLinkOpen(false)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://exemplo.com"
              className="w-full bg-[#1C1C27] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#7C5CFC]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLinkOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9494A8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={applyLink}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C5CFC] hover:bg-[#6A48E0]"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT 48 — Paleta de comandos */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 p-4">
          <div className="bg-[#14141C] border border-[#1E1E2A] rounded-xl w-full max-w-md overflow-hidden">
            <input
              autoFocus
              value={commandQuery}
              onChange={(e) => {
                setCommandQuery(e.target.value)
                setCommandIndex(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setCommandIndex((i) => Math.min(filteredCommands.length - 1, i + 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setCommandIndex((i) => Math.max(0, i - 1))
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  runCommand(commandIndex)
                }
                if (e.key === 'Escape') {
                  setCommandOpen(false)
                  setCommandQuery('')
                }
              }}
              placeholder="Digite um comando..."
              className="w-full bg-transparent border-b border-white/10 px-4 py-3 text-sm text-white outline-none"
            />
            <div className="max-h-64 overflow-y-auto">
              {filteredCommands.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => runCommand(i)}
                  className={`w-full text-left px-4 py-2 text-xs ${i === commandIndex ? 'bg-[#7C5CFC]/20 text-white' : 'text-[#9494A8] hover:bg-white/5'}`}
                >
                  {c.label}
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <p className="px-4 py-3 text-xs text-[#9494A8]">Nenhum comando encontrado.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LayerRow({
  el,
  index,
  total,
  selected,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  el: WhiteboardElement
  index: number
  total: number
  selected: boolean
  onSelect: (shift: boolean) => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const label = useMemo(() => {
    const map: Record<WhiteboardTool, string> = {
      select: 'Seleção',
      rectangle: 'Retângulo',
      ellipse: 'Elipse',
      arrow: 'Seta',
      line: 'Linha',
      brush: 'Traço',
      text: 'Texto',
      image: 'Imagem',
      eraser: 'Borracha',
      diamond: 'Losango',
      pan: 'Pan',
      frame: 'Frame',
      embed: 'Embed',
      shape: 'Forma',
      laser: 'Laser',
      eyedropper: 'Conta-gotas',
    }
    let l = map[el.type]
    if (el.type === 'shape' && el.shapeType) l += ': ' + el.shapeType
    if (el.type === 'text' && el.text) l += `: ${el.text.slice(0, 12)}`
    if (el.type === 'embed' && el.embedUrl) l += ': ' + el.embedUrl.slice(0, 12)
    return l
  }, [el.type, el.text, el.shapeType, el.embedUrl])
  return (
    <div
      onClick={(e) => onSelect(e.shiftKey)}
      className={`rounded-md border px-1.5 py-1 cursor-pointer transition-colors ${
        selected
          ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
          : 'border-white/5 bg-[#1C1C27] hover:border-white/15'
      }`}
    >
      <div className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: el.color }} />
        <span className="text-[9px] text-white truncate flex-1">{label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisible()
          }}
          className="text-[#9494A8] hover:text-white"
          title={el.visible ? 'Ocultar' : 'Mostrar'}
        >
          {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          className="text-[#9494A8] hover:text-white"
          title={el.locked ? 'Desbloquear' : 'Bloquear'}
        >
          {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>
      </div>
      <div className="flex items-center gap-0.5 mt-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          disabled={index === total - 1}
          className="text-[8px] text-[#9494A8] hover:text-white disabled:opacity-20 px-1"
        >
          ▲
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          disabled={index === 0}
          className="text-[8px] text-[#9494A8] hover:text-white disabled:opacity-20 px-1"
        >
          ▼
        </button>
        <span className="text-[8px] text-[#9494A8]/60 ml-1">#{index + 1}</span>
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-[#9494A8] hover:text-red-400"
          title="Deletar camada"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default Whiteboard
