import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Download,
  FileImage,
  Type,
  Shapes,
  Square,
  Circle,
  Minus,
  Star,
  Triangle as TriangleIcon,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  X,
  LayoutTemplate,
} from 'lucide-react'
import { toast } from 'sonner'
import type { StaticPostV2, StaticPostElement } from '@/types/library'
import { STATIC_FONTS, STATIC_TEMPLATES } from '@/lib/libraryData'

const STORAGE_KEY = 'lumen_static_posts_v2'
const CANVAS_W = 1080
const CANVAS_H = 1080
const GRID = 20

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

function newPost(): StaticPostV2 {
  const now = new Date().toISOString()
  return {
    id: uid('sp'),
    name: 'Novo Post Estático',
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    backgroundColor: '#0B0B10',
    backgroundType: 'color',
    elements: [],
    createdAt: now,
    updatedAt: now,
  }
}

function loadPosts(): StaticPostV2[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as StaticPostV2[]) : []
  } catch {
    return []
  }
}

function savePosts(list: StaticPostV2[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* quota */
  }
}

const snapToGrid = (v: number) => Math.round(v / GRID) * GRID

export default function PostEstatico() {
  const [posts, setPosts] = useState<StaticPostV2[]>(() => loadPosts())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedElId, setSelectedElId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(
    null,
  )
  const canvasRef = useRef<HTMLDivElement>(null)

  const activePost: StaticPostV2 = useMemo(() => {
    if (activeId) {
      const found = posts.find((p) => p.id === activeId)
      if (found) return found
    }
    if (posts.length > 0) return posts[0]
    return newPost()
  }, [activeId, posts])

  const persist = useCallback((updated: StaticPostV2) => {
    setPosts((prev) => {
      const exists = prev.some((p) => p.id === updated.id)
      const next = exists
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...prev]
      savePosts(next)
      return next
    })
  }, [])

  const updatePost = (updater: (p: StaticPostV2) => StaticPostV2) => {
    persist({ ...updater(activePost), updatedAt: new Date().toISOString() })
  }

  const selectedEl = activePost.elements.find((e) => e.id === selectedElId) || null

  // --- Adicionar elementos ---
  const addText = () => {
    const el: StaticPostElement = {
      id: uid('el'),
      type: 'text',
      content: 'Novo texto',
      x: 200,
      y: 200,
      width: 400,
      height: 80,
      color: '#FFFFFF',
      fontFamily: 'Inter',
      fontSize: 48,
      align: 'center',
      bold: false,
      italic: false,
    }
    updatePost((p) => ({ ...p, elements: [...p.elements, el] }))
    setSelectedElId(el.id)
  }

  const addShape = (shape: 'rectangle' | 'circle' | 'line' | 'star' | 'triangle') => {
    const el: StaticPostElement = {
      id: uid('el'),
      type: 'shape',
      content: '',
      x: 300,
      y: 300,
      width: 200,
      height: 200,
      color: '#7C5CFC',
      shape,
      opacity: 1,
    }
    updatePost((p) => ({ ...p, elements: [...p.elements, el] }))
    setSelectedElId(el.id)
  }

  const addLine = () => {
    const el: StaticPostElement = {
      id: uid('el'),
      type: 'line',
      content: '',
      x: 200,
      y: 400,
      width: 600,
      height: 6,
      color: '#22D3EE',
      opacity: 1,
    }
    updatePost((p) => ({ ...p, elements: [...p.elements, el] }))
    setSelectedElId(el.id)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Envie uma imagem')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem acima de 10MB')
      return
    }
    const url = await fileToDataUrl(file)
    const el: StaticPostElement = {
      id: uid('el'),
      type: 'image',
      content: '',
      x: 200,
      y: 200,
      width: 400,
      height: 400,
      color: '#FFFFFF',
      imageUrl: url,
      opacity: 1,
    }
    updatePost((p) => ({ ...p, elements: [...p.elements, el] }))
    setSelectedElId(el.id)
    toast.success('Imagem adicionada')
    e.target.value = ''
  }

  // --- Atualizar/excluir elemento ---
  const updateEl = (id: string, updates: Partial<StaticPostElement>) =>
    updatePost((p) => ({
      ...p,
      elements: p.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))

  const deleteEl = (id: string) => {
    updatePost((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) }))
    if (selectedElId === id) setSelectedElId(null)
  }

  // --- Camadas ---
  const moveLayer = (id: string, dir: 'up' | 'down') => {
    updatePost((p) => {
      const els = [...p.elements]
      const idx = els.findIndex((e) => e.id === id)
      if (idx === -1) return p
      if (dir === 'up' && idx < els.length - 1) {
        ;[els[idx], els[idx + 1]] = [els[idx + 1], els[idx]]
      } else if (dir === 'down' && idx > 0) {
        ;[els[idx], els[idx - 1]] = [els[idx - 1], els[idx]]
      }
      return { ...p, elements: els }
    })
  }

  // --- Arrastar ---
  const handlePointerDown = (e: React.PointerEvent, el: StaticPostElement) => {
    e.stopPropagation()
    setSelectedElId(el.id)
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scale = rect.width / CANVAS_W
    const offsetX = e.clientX - rect.left - el.x * scale
    const offsetY = e.clientY - rect.top - el.y * scale
    setDragging({ id: el.id, offsetX, offsetY })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scale = rect.width / CANVAS_W
    let x = (e.clientX - rect.left - dragging.offsetX) / scale
    let y = (e.clientY - rect.top - dragging.offsetY) / scale
    x = snapToGrid(Math.max(0, Math.min(CANVAS_W - 10, x)))
    y = snapToGrid(Math.max(0, Math.min(CANVAS_H - 10, y)))
    updateEl(dragging.id, { x, y })
  }

  const handlePointerUp = () => setDragging(null)

  // --- Templates ---
  const applyTemplate = (tpl: (typeof STATIC_TEMPLATES)[number]) => {
    updatePost((p) => ({
      ...p,
      backgroundColor: tpl.backgroundColor,
      backgroundType: tpl.backgroundType,
      backgroundGradient: tpl.backgroundGradient,
      elements: tpl.elements.map((e) => ({ ...e, id: uid('el') })),
      name: `${tpl.name} — ${new Date().toLocaleDateString('pt-BR')}`,
    }))
    setSelectedElId(null)
    toast.success(`Template "${tpl.name}" aplicado`)
  }

  // --- Fundo ---
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Envie uma imagem')
      return
    }
    const url = await fileToDataUrl(file)
    updatePost((p) => ({ ...p, backgroundType: 'image', backgroundImage: url }))
    e.target.value = ''
  }

  // --- Exportar PNG ---
  const handleExport = () => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Não foi possível criar o canvas')
      return
    }
    // Fundo
    if (activePost.backgroundType === 'color') {
      ctx.fillStyle = activePost.backgroundColor
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    } else if (activePost.backgroundType === 'image' && activePost.backgroundImage) {
      // Async: não bloqueia, mas para simplicidade usa gradient fallback
      ctx.fillStyle = activePost.backgroundColor
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    }

    const renderElements = async () => {
      // Imagem de fundo
      if (activePost.backgroundType === 'image' && activePost.backgroundImage) {
        try {
          const img = await loadImage(activePost.backgroundImage)
          ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
        } catch {
          /* noop */
        }
      }
      for (const el of activePost.elements) {
        ctx.save()
        ctx.globalAlpha = el.opacity ?? 1
        if (el.type === 'text') {
          ctx.fillStyle = el.color
          ctx.font = `${el.bold ? 'bold ' : ''}${el.italic ? 'italic ' : ''}${el.fontSize}px ${el.fontFamily || 'Inter'}`
          ctx.textAlign = el.align || 'left'
          ctx.textBaseline = 'top'
          const lines = el.content.split('\n')
          lines.forEach((line, i) => {
            ctx.fillText(line, el.x, el.y + i * (el.fontSize || 24) * 1.2)
          })
        } else if (el.type === 'image' && el.imageUrl) {
          try {
            const img = await loadImage(el.imageUrl)
            ctx.drawImage(img, el.x, el.y, el.width, el.height)
          } catch {
            /* noop */
          }
        } else if (el.type === 'shape' && el.shape) {
          ctx.fillStyle = el.color
          if (el.shape === 'rectangle') {
            ctx.fillRect(el.x, el.y, el.width, el.height)
          } else if (el.shape === 'circle') {
            ctx.beginPath()
            ctx.arc(
              el.x + el.width / 2,
              el.y + el.height / 2,
              Math.min(el.width, el.height) / 2,
              0,
              Math.PI * 2,
            )
            ctx.fill()
          } else if (el.shape === 'star') {
            drawStar(
              ctx,
              el.x + el.width / 2,
              el.y + el.height / 2,
              Math.min(el.width, el.height) / 2,
            )
          } else if (el.shape === 'triangle') {
            ctx.beginPath()
            ctx.moveTo(el.x + el.width / 2, el.y)
            ctx.lineTo(el.x + el.width, el.y + el.height)
            ctx.lineTo(el.x, el.y + el.height)
            ctx.closePath()
            ctx.fill()
          }
        } else if (el.type === 'line') {
          ctx.fillStyle = el.color
          ctx.fillRect(el.x, el.y, el.width, el.height)
        }
        ctx.restore()
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Falha ao gerar PNG')
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activePost.name || 'post'}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('PNG exportado com sucesso!')
      }, 'image/png')
    }
    renderElements()
  }

  // Fundo CSS
  const bgCss = (): React.CSSProperties => {
    if (activePost.backgroundType === 'image' && activePost.backgroundImage) {
      return {
        backgroundImage: `url(${activePost.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    if (activePost.backgroundType === 'gradient' && activePost.backgroundGradient) {
      return { background: `linear-gradient(135deg, ${activePost.backgroundColor})` }
    }
    return { backgroundColor: activePost.backgroundColor }
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto gap-4 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <FileImage className="w-6 h-6 text-amber-400" />
            Criar Post Estático
          </h1>
          <p className="text-xs text-[#9494A8]">
            Canvas 1080×1080 com fundo, texto, formas e camadas. Exporte como PNG.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleExport}
          className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Exportar como PNG
        </Button>
      </div>

      {/* Templates */}
      <div className="rounded-2xl bg-[#14141C] border border-white/10 p-3 space-y-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5 text-[#7C5CFC]" /> Templates
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATIC_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className="p-3 rounded-xl bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 text-left transition-all"
            >
              <div
                className={`w-full aspect-square rounded-lg mb-2 bg-gradient-to-br ${tpl.backgroundGradient || 'from-slate-800 to-slate-900'}`}
                style={
                  tpl.backgroundType === 'color'
                    ? { backgroundColor: tpl.backgroundColor }
                    : undefined
                }
              />
              <span className="text-xs font-semibold text-white">{tpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[560px]">
        {/* Canvas + camadas */}
        <div className="lg:col-span-8 flex flex-col items-center gap-3 bg-[#07070A] rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-2 w-full">
            <Input
              value={activePost.name}
              onChange={(e) => updatePost((p) => ({ ...p, name: e.target.value }))}
              className="bg-[#14141C] border-white/10 text-xs text-white flex-1"
              placeholder="Nome do post"
            />
          </div>
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={() => setSelectedElId(null)}
            className="relative w-full max-w-[480px] aspect-square rounded-xl border border-white/15 overflow-hidden shadow-2xl"
            style={bgCss()}
          >
            {/* Grade (snap 20px) */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: `${(GRID / CANVAS_W) * 100}% ${(GRID / CANVAS_H) * 100}%`,
              }}
            />
            {activePost.elements.map((el) => (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, el)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedElId(el.id)
                }}
                className={`absolute cursor-move select-none ${selectedElId === el.id ? 'ring-2 ring-[#22D3EE]' : ''}`}
                style={{
                  left: `${(el.x / CANVAS_W) * 100}%`,
                  top: `${(el.y / CANVAS_H) * 100}%`,
                  width: `${(el.width / CANVAS_W) * 100}%`,
                  height: `${(el.height / CANVAS_H) * 100}%`,
                  opacity: el.opacity ?? 1,
                }}
              >
                {el.type === 'text' && (
                  <div
                    style={{
                      fontFamily: el.fontFamily,
                      fontSize: 'clamp(8px, 4vw, 28px)',
                      color: el.color,
                      fontWeight: el.bold ? 700 : 400,
                      fontStyle: el.italic ? 'italic' : 'normal',
                      textAlign: el.align,
                      whiteSpace: 'pre-wrap',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                    }}
                  >
                    {el.content}
                  </div>
                )}
                {el.type === 'image' && el.imageUrl && (
                  <img src={el.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
                {el.type === 'shape' && el.shape === 'rectangle' && (
                  <div className="w-full h-full" style={{ backgroundColor: el.color }} />
                )}
                {el.type === 'shape' && el.shape === 'circle' && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: el.color }}
                  />
                )}
                {el.type === 'shape' && el.shape === 'triangle' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    <polygon points="50,0 100,100 0,100" fill={el.color} />
                  </svg>
                )}
                {el.type === 'shape' && el.shape === 'star' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    <polygon
                      points="50,5 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38"
                      fill={el.color}
                    />
                  </svg>
                )}
                {el.type === 'line' && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: el.color }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Camadas */}
          {activePost.elements.length > 0 && (
            <div className="w-full max-w-[480px] rounded-xl bg-[#14141C] border border-white/10 p-2 space-y-1">
              <span className="text-[10px] text-[#9494A8] font-bold uppercase px-1">Camadas</span>
              {[...activePost.elements].reverse().map((el, revIdx) => {
                const idx = activePost.elements.length - 1 - revIdx
                return (
                  <div
                    key={el.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${
                      selectedElId === el.id ? 'bg-[#7C5CFC]/20' : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedElId(el.id)}
                  >
                    <span className="text-[10px] text-[#9494A8] w-4">{idx + 1}</span>
                    <span className="text-xs text-white flex-1 truncate">
                      {el.type === 'text' ? el.content : el.type === 'shape' ? el.shape : 'imagem'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveLayer(el.id, 'up')
                      }}
                      className="p-1 rounded text-[#9494A8] hover:text-white"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveLayer(el.id, 'down')
                      }}
                      className="p-1 rounded text-[#9494A8] hover:text-white"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteEl(el.id)
                      }}
                      className="p-1 rounded text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Painel direito: ferramentas */}
        <div className="lg:col-span-4 bg-[#14141C] border border-white/10 rounded-2xl p-4 space-y-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/5">
            <Shapes className="w-3.5 h-3.5 text-amber-400" /> Ferramentas
          </h3>

          {/* Fundo */}
          <div className="space-y-2">
            <span className="text-[11px] text-[#9494A8]">Fundo</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => updatePost((p) => ({ ...p, backgroundType: 'color' }))}
                className={`py-1.5 rounded-lg text-[10px] font-bold border ${
                  activePost.backgroundType === 'color'
                    ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                    : 'bg-[#1C1C27] text-[#9494A8] border-white/10'
                }`}
              >
                Cor
              </button>
              <button
                onClick={() => updatePost((p) => ({ ...p, backgroundType: 'gradient' }))}
                className={`py-1.5 rounded-lg text-[10px] font-bold border ${
                  activePost.backgroundType === 'gradient'
                    ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                    : 'bg-[#1C1C27] text-[#9494A8] border-white/10'
                }`}
              >
                Gradiente
              </button>
              <label
                className={`py-1.5 rounded-lg text-[10px] font-bold border text-center cursor-pointer ${
                  activePost.backgroundType === 'image'
                    ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                    : 'bg-[#1C1C27] text-[#9494A8] border-white/10'
                }`}
              >
                <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                Imagem
              </label>
            </div>
            {activePost.backgroundType === 'color' && (
              <input
                type="color"
                value={activePost.backgroundColor}
                onChange={(e) => updatePost((p) => ({ ...p, backgroundColor: e.target.value }))}
                className="w-full h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            )}
            {activePost.backgroundType === 'gradient' && (
              <input
                type="color"
                value={activePost.backgroundColor}
                onChange={(e) => updatePost((p) => ({ ...p, backgroundColor: e.target.value }))}
                className="w-full h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            )}
          </div>

          {/* Texto */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-[#9494A8]">Texto</span>
            <Button
              size="sm"
              variant="outline"
              onClick={addText}
              className="w-full border-white/10 text-xs gap-1.5"
            >
              <Type className="w-3.5 h-3.5" /> Adicionar Texto
            </Button>
          </div>

          {/* Formas */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-[#9494A8]">Elementos</span>
            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={() => addShape('rectangle')}
                className="aspect-square rounded-lg bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 flex items-center justify-center"
                title="Retângulo"
              >
                <Square className="w-4 h-4 text-[#7C5CFC]" />
              </button>
              <button
                onClick={() => addShape('circle')}
                className="aspect-square rounded-lg bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 flex items-center justify-center"
                title="Círculo"
              >
                <Circle className="w-4 h-4 text-[#22D3EE]" />
              </button>
              <button
                onClick={() => addShape('triangle')}
                className="aspect-square rounded-lg bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 flex items-center justify-center"
                title="Triângulo"
              >
                <TriangleIcon className="w-4 h-4 text-[#F59E0B]" />
              </button>
              <button
                onClick={() => addShape('star')}
                className="aspect-square rounded-lg bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 flex items-center justify-center"
                title="Estrela"
              >
                <Star className="w-4 h-4 text-[#EC4899]" />
              </button>
              <button
                onClick={addLine}
                className="aspect-square rounded-lg bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 flex items-center justify-center"
                title="Linha"
              >
                <Minus className="w-4 h-4 text-[#10B981]" />
              </button>
            </div>
          </div>

          {/* Mídia */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-[#9494A8]">Mídia</span>
            <label className="cursor-pointer block">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-xs text-white hover:border-white/20">
                <ImageIcon className="w-3.5 h-3.5" /> Upload imagem
              </div>
            </label>
          </div>

          {/* Propriedades do elemento selecionado */}
          {selectedEl && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9494A8]">Propriedades</span>
                <button
                  onClick={() => deleteEl(selectedEl.id)}
                  className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {selectedEl.type === 'text' && (
                <>
                  <textarea
                    value={selectedEl.content}
                    onChange={(e) => updateEl(selectedEl.id, { content: e.target.value })}
                    rows={2}
                    className="w-full bg-[#1C1C27] border border-white/10 rounded p-2 text-xs text-white resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedEl.color}
                      onChange={(e) => updateEl(selectedEl.id, { color: e.target.value })}
                      className="w-8 h-8 rounded bg-transparent border border-white/10 cursor-pointer"
                    />
                    <select
                      value={selectedEl.fontFamily}
                      onChange={(e) => updateEl(selectedEl.id, { fontFamily: e.target.value })}
                      className="flex-1 bg-[#1C1C27] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      {STATIC_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={12}
                      max={120}
                      value={selectedEl.fontSize}
                      onChange={(e) =>
                        updateEl(selectedEl.id, { fontSize: Number(e.target.value) })
                      }
                      className="flex-1 accent-[#7C5CFC]"
                    />
                    <span className="text-[10px] text-[#9494A8] w-10">{selectedEl.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['left', 'center', 'right'] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => updateEl(selectedEl.id, { align: a })}
                        className={`flex-1 py-1 rounded text-[10px] font-bold ${
                          selectedEl.align === a
                            ? 'bg-[#7C5CFC] text-white'
                            : 'bg-[#1C1C27] text-[#9494A8]'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateEl(selectedEl.id, { bold: !selectedEl.bold })}
                      className={`flex-1 py-1.5 rounded text-xs font-bold ${selectedEl.bold ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8]'}`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateEl(selectedEl.id, { italic: !selectedEl.italic })}
                      className={`flex-1 py-1.5 rounded text-xs italic ${selectedEl.italic ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8]'}`}
                    >
                      I
                    </button>
                  </div>
                </>
              )}
              {selectedEl.type === 'shape' && (
                <input
                  type="color"
                  value={selectedEl.color}
                  onChange={(e) => updateEl(selectedEl.id, { color: e.target.value })}
                  className="w-full h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                />
              )}
              {selectedEl.type === 'line' && (
                <input
                  type="color"
                  value={selectedEl.color}
                  onChange={(e) => updateEl(selectedEl.id, { color: e.target.value })}
                  className="w-full h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                />
              )}
              {(selectedEl.type === 'shape' ||
                selectedEl.type === 'image' ||
                selectedEl.type === 'line') && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#9494A8]">Opacidade</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={selectedEl.opacity ?? 1}
                    onChange={(e) => updateEl(selectedEl.id, { opacity: Number(e.target.value) })}
                    className="flex-1 accent-[#22D3EE]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Helpers de desenho ---
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('img load fail'))
    img.src = src
  })
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const spikes = 5
  const outer = r
  const inner = r * 0.4
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outer)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner)
    rot += step
  }
  ctx.lineTo(cx, cy - outer)
  ctx.closePath()
  ctx.fill()
}
