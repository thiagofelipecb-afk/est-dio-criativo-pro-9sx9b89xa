import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from 'lucide-react'
import { useWhiteboard, fileToDataUrl } from '@/hooks/use-block-media'
import { toast } from 'sonner'
import type { WhiteboardElement, WhiteboardTool, WhiteboardGroup } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   Whiteboard — FASE 3.3
   Quadro editável estilo Excalidraw. Canvas 9:16 (lógico 1080×1920), ferramentas
   (seleção, retângulo, elipse, seta, linha, brush, texto, imagem, borracha),
   cores, espessura, undo/redo, limpar, zoom, painel de camadas (visibilidade,
   bloqueio, reordenar), agrupar/desagrupar, alinhamento e exportar coluna
   central como PNG. Mouse E touch. Persiste em localStorage.
   ─────────────────────────────────────────────────────────────────────────── */

const LOGICAL_W = 1080
const LOGICAL_H = 1920
const DISPLAY_H = 300
const DISPLAY_W = (DISPLAY_H * LOGICAL_W) / LOGICAL_H // ~169

const COLORS = ['#FFFFFF', '#EF4444', '#3B82F6', '#22C55E', '#FBBF24', '#A855F7']

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

function renderElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  if (!el.visible) return
  ctx.save()
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (el.type === 'rectangle') {
    ctx.strokeRect(el.x, el.y, el.width, el.height)
  } else if (el.type === 'ellipse') {
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(el.x, el.y)
    ctx.lineTo(el.x + el.width, el.y + el.height)
    ctx.stroke()
  } else if (el.type === 'arrow') {
    drawArrow(ctx, el.x, el.y, el.x + el.width, el.y + el.height, el.color, el.strokeWidth)
  } else if (el.type === 'brush' && el.points && el.points.length > 0) {
    ctx.beginPath()
    ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y)
    }
    ctx.stroke()
  } else if (el.type === 'text' && el.text) {
    const fontSize = Math.max(20, el.strokeWidth * 8)
    ctx.font = `bold ${fontSize}px Inter, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(el.text, el.x, el.y)
  } else if (el.type === 'image' && el.dataUrl) {
    const img = (el as any)._img as HTMLImageElement | undefined
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, el.x, el.y, el.width || img.naturalWidth, el.height || img.naturalHeight)
    }
  }
  ctx.restore()
}

export function Whiteboard() {
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

  /* Mantém zoom sincronizado com o estado persistido (carregamento inicial). */
  useEffect(() => {
    setZoom(whiteboard.zoom ?? 1)
  }, [whiteboard.zoom])

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

    // Fundo
    ctx.fillStyle = '#0F0F15'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    // Coluna central segura (apenas guia visual sutil)
    const safeW = LOGICAL_W * 0.8
    const safeX = (LOGICAL_W - safeW) / 2
    ctx.save()
    ctx.strokeStyle = 'rgba(124,92,252,0.15)'
    ctx.setLineDash([12, 12])
    ctx.lineWidth = 2
    ctx.strokeRect(safeX, 0, safeW, LOGICAL_H)
    ctx.restore()

    for (const el of elements) {
      if (el.type === 'image' && el.dataUrl) {
        const img = imgCache.current.get(el.id)
        ;(el as any)._img = img
      }
      renderElement(ctx, el)
    }

    // Seleção
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
  }, [elements, selectedIds, zoom])

  useEffect(() => {
    render()
  }, [render])

  /* ── Coordenadas lógicas a partir de evento ponteiro ─────────────────── */
  const toLogical = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (clientX - rect.left) / rect.width
    const py = (clientY - rect.top) / rect.height
    return { x: px * LOGICAL_W, y: py * LOGICAL_H }
  }, [])

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
      }
      return
    }

    if (tool === 'text') {
      setTextEditing({ x, y })
      setTextValue('')
      return
    }

    if (tool === 'image') {
      // dispara file picker
      fileInputRef.current?.click()
      pendingImagePosRef.current = { x, y }
      return
    }

    // Criação de elemento (rectangle, ellipse, line, arrow, brush)
    pushHistory()
    const baseEl: WhiteboardElement = {
      id: uid('el'),
      type: tool,
      x,
      y,
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
    const drag = dragRef.current
    if (!drag) return
    const { x, y } = toLogical(e.clientX, e.clientY)
    if (drag.mode === 'brush' && drag.creating) {
      const el = drag.creating
      el.points!.push({ x: x - el.x, y: y - el.y })
      commit([...elements])
    } else if (drag.mode === 'create' && drag.creating) {
      const el = drag.creating
      el.width = x - drag.startX
      el.height = y - drag.startY
      commit([...elements])
    } else if (drag.mode === 'move' && drag.moveStarts) {
      const dx = x - drag.startX
      const dy = y - drag.startY
      const next = elements.map((el) => {
        const start = drag.moveStarts!.get(el.id)
        if (!start) return el
        return { ...el, x: start.x + dx, y: start.y + dy }
      })
      commit(next)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      const target = e.currentTarget as HTMLElement
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
    dragRef.current = null
  }

  /* ── Texto: confirma criação ─────────────────────────────────────────── */
  const confirmText = () => {
    if (!textEditing) return
    if (textValue.trim()) {
      pushHistory()
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
  }

  /* ── Zoom persistente ────────────────────────────────────────────────── */
  useEffect(() => {
    setWhiteboard({ ...whiteboard, zoom })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

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

  /* ── Agrupar / Desagrupar ────────────────────────────────────────────── */
  const groupSelected = () => {
    if (selectedIds.size < 2) {
      toast.warning('Selecione 2+ elementos (Shift+clique).')
      return
    }
    const g: WhiteboardGroup = { id: uid('grp'), memberIds: Array.from(selectedIds) }
    setWhiteboard({ ...whiteboard, groups: [...groups, g] })
    toast.success('Elementos agrupados.')
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
  }

  /* ── Alinhamento (múltipla seleção) ──────────────────────────────────── */
  const align = (axis: 'h' | 'v', pos: 'start' | 'center' | 'end') => {
    if (selectedIds.size < 2) {
      toast.warning('Selecione 2+ elementos para alinhar.')
      return
    }
    const sel = elements.filter((el) => selectedIds.has(el.id))
    if (axis === 'h') {
      // alinhamento vertical (topo/meio/base) → alinha Y
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

  /* ── Exportar coluna central como PNG ────────────────────────────────── */
  const exportPNG = () => {
    const safeW = LOGICAL_W * 0.8
    const safeX = (LOGICAL_W - safeW) / 2
    const off = document.createElement('canvas')
    off.width = safeW
    off.height = LOGICAL_H
    const ctx = off.getContext('2d')!
    ctx.fillStyle = '#0F0F15'
    ctx.fillRect(0, 0, safeW, LOGICAL_H)
    ctx.translate(-safeX, 0)
    for (const el of elements) {
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
  }

  const TOOL_BUTTONS: { id: WhiteboardTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-3.5 h-3.5" />, label: 'Seleção' },
    { id: 'rectangle', icon: <Square className="w-3.5 h-3.5" />, label: 'Retângulo' },
    { id: 'ellipse', icon: <Circle className="w-3.5 h-3.5" />, label: 'Círculo' },
    { id: 'arrow', icon: <ArrowRight className="w-3.5 h-3.5" />, label: 'Seta' },
    { id: 'line', icon: <Minus className="w-3.5 h-3.5" />, label: 'Linha' },
    { id: 'brush', icon: <Pencil className="w-3.5 h-3.5" />, label: 'Lápis' },
    { id: 'text', icon: <Type className="w-3.5 h-3.5" />, label: 'Texto' },
    { id: 'image', icon: <ImagePlus className="w-3.5 h-3.5" />, label: 'Imagem' },
    { id: 'eraser', icon: <Eraser className="w-3.5 h-3.5" />, label: 'Borracha' },
  ]

  const canUndo = undoStack.current.length > 0
  const canRedo = redoStack.current.length > 0

  return (
    <div className="flex h-full">
      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
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
              title={b.label}
            >
              {b.icon}
            </button>
          ))}

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

          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Desfazer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-[#9494A8] hover:text-white hover:bg-[#7C5CFC]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refazer"
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

        {/* Grupo / alinhamento */}
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

          <div className="flex-1" />

          {/* Zoom */}
          <div className="flex items-center gap-1 w-28">
            <span className="text-[9px] text-[#9494A8]">Zoom</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#7C5CFC]"
            />
            <span className="text-[9px] text-[#9494A8] font-mono w-7">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

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
                cursor: tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {textEditing && (
              <div
                className="absolute z-20"
                style={{
                  left: (textEditing.x / LOGICAL_W) * DISPLAY_W * zoom,
                  top: (textEditing.y / LOGICAL_H) * DISPLAY_H * zoom,
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

      {/* Painel de camadas */}
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
    }
    return map[el.type] + (el.type === 'text' && el.text ? `: ${el.text.slice(0, 12)}` : '')
  }, [el.type, el.text])
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
