import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Type,
  Image as ImageIcon,
  Shapes,
  Smile,
  Square,
  Circle,
  Minus,
  Save,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  CarouselV2,
  CarouselSlideV2,
  CarouselText,
  CarouselElement,
  CarouselSticker,
} from '@/types/library'
import { CAROUSEL_EMOJIS, CAROUSEL_FONTS } from '@/lib/libraryData'

const STORAGE_KEY = 'lumen_carousels_v2'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

function newSlide(order: number): CarouselSlideV2 {
  return {
    id: uid('slide'),
    background: '#14141C',
    backgroundType: 'color',
    backgroundFit: 'cover',
    texts: [],
    elements: [],
    stickers: [],
    order,
  }
}

function newCarousel(): CarouselV2 {
  const now = new Date().toISOString()
  return {
    id: uid('car'),
    name: 'Novo Carrossel',
    aspectRatio: '1:1',
    slides: [newSlide(0)],
    createdAt: now,
    updatedAt: now,
  }
}

function loadCarousels(): CarouselV2[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as CarouselV2[]) : []
  } catch {
    return []
  }
}

function saveCarousels(list: CarouselV2[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* quota */
  }
}

export default function Carrossel() {
  const [carousels, setCarousels] = useState<CarouselV2[]>(() => loadCarousels())
  const [activeId, setActiveId] = useState<string | null>(() => null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [dragging, setDragging] = useState<
    | { type: 'text'; id: string }
    | { type: 'element'; id: string }
    | { type: 'sticker'; id: string }
    | null
  >(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Inicia um carrossel ativo (novo ou primeiro existente)
  const activeCarousel: CarouselV2 = React.useMemo(() => {
    if (activeId) {
      const found = carousels.find((c) => c.id === activeId)
      if (found) return found
    }
    if (carousels.length > 0) return carousels[0]
    const created = newCarousel()
    return created
  }, [activeId, carousels])

  const persist = useCallback(
    (updated: CarouselV2) => {
      setCarousels((prev) => {
        const exists = prev.some((c) => c.id === updated.id)
        if (exists) return prev.map((c) => (c.id === updated.id ? updated : c))
        return [updated, ...prev]
      })
      saveCarousels(
        carousels.some((c) => c.id === updated.id)
          ? carousels.map((c) => (c.id === updated.id ? updated : c))
          : [updated, ...carousels],
      )
    },
    [carousels],
  )

  const updateCarousel = (updater: (c: CarouselV2) => CarouselV2) => {
    const updated = {
      ...updater(activeCarousel),
      updatedAt: new Date().toISOString(),
    }
    persist(updated)
  }

  const currentSlide = activeCarousel.slides[currentSlideIndex] || activeCarousel.slides[0]

  const updateSlide = (
    updates: Partial<CarouselSlideV2> | ((s: CarouselSlideV2) => Partial<CarouselSlideV2>),
  ) => {
    updateCarousel((c) => ({
      ...c,
      slides: c.slides.map((s, i) => {
        if (i !== currentSlideIndex) return s
        const patch = typeof updates === 'function' ? updates(s) : updates
        return { ...s, ...patch }
      }),
    }))
  }

  // --- Ações globais ---
  const handleAddSlide = () => {
    updateCarousel((c) => ({
      ...c,
      slides: [...c.slides, newSlide(c.slides.length)],
    }))
    setCurrentSlideIndex(activeCarousel.slides.length)
    toast.success('Slide adicionado')
  }

  const handleDuplicateSlide = () => {
    const dup: CarouselSlideV2 = {
      ...currentSlide,
      id: uid('slide'),
      texts: currentSlide.texts.map((t) => ({ ...t, id: uid('text') })),
      elements: currentSlide.elements.map((e) => ({ ...e, id: uid('el') })),
      stickers: currentSlide.stickers.map((s) => ({ ...s, id: uid('stk') })),
    }
    updateCarousel((c) => {
      const slides = [...c.slides]
      slides.splice(currentSlideIndex + 1, 0, dup)
      return { ...c, slides }
    })
    setCurrentSlideIndex(currentSlideIndex + 1)
    toast.success('Slide duplicado')
  }

  const handleDeleteSlide = () => {
    if (activeCarousel.slides.length <= 1) {
      toast.warning('O carrossel precisa ter pelo menos 1 slide.')
      return
    }
    updateCarousel((c) => ({
      ...c,
      slides: c.slides.filter((_, i) => i !== currentSlideIndex),
    }))
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
    toast.success('Slide removido')
  }

  const moveSlide = (dir: -1 | 1) => {
    const target = currentSlideIndex + dir
    if (target < 0 || target >= activeCarousel.slides.length) return
    updateCarousel((c) => {
      const slides = [...c.slides]
      ;[slides[currentSlideIndex], slides[target]] = [slides[target], slides[currentSlideIndex]]
      return { ...c, slides }
    })
    setCurrentSlideIndex(target)
  }

  // --- Upload de fundo ---
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    updateSlide({ background: url, backgroundType: 'image' })
    toast.success('Imagem de fundo adicionada')
    e.target.value = ''
  }

  // --- Adicionar texto ---
  const addText = () => {
    const newText: CarouselText = {
      id: uid('text'),
      content: 'Novo texto',
      fontFamily: 'Inter',
      fontSize: 28,
      color: '#FFFFFF',
      x: 50,
      y: 50,
    }
    updateSlide((s) => ({ ...s, texts: [...s.texts, newText] }))
  }

  // --- Adicionar forma ---
  const addShape = (type: 'rectangle' | 'circle' | 'line') => {
    const newEl: CarouselElement = {
      id: uid('el'),
      type,
      color: '#7C5CFC',
      opacity: 1,
      x: 30,
      y: 30,
      width: 120,
      height: type === 'line' ? 6 : 120,
    }
    updateSlide((s) => ({ ...s, elements: [...s.elements, newEl] }))
  }

  // --- Adicionar sticker ---
  const addSticker = (emoji: string) => {
    const newStk: CarouselSticker = {
      id: uid('stk'),
      emoji,
      size: 48,
      x: 50,
      y: 50,
    }
    updateSlide((s) => ({ ...s, stickers: [...s.stickers, newStk] }))
  }

  // --- Atualizar item ---
  const updateText = (id: string, updates: Partial<CarouselText>) =>
    updateSlide((s) => ({
      ...s,
      texts: s.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))

  const updateElement = (id: string, updates: Partial<CarouselElement>) =>
    updateSlide((s) => ({
      ...s,
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))

  const updateSticker = (id: string, updates: Partial<CarouselSticker>) =>
    updateSlide((s) => ({
      ...s,
      stickers: s.stickers.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    }))

  const deleteText = (id: string) =>
    updateSlide((s) => ({ ...s, texts: s.texts.filter((t) => t.id !== id) }))
  const deleteElement = (id: string) =>
    updateSlide((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== id) }))
  const deleteSticker = (id: string) =>
    updateSlide((s) => ({ ...s, stickers: s.stickers.filter((st) => st.id !== id) }))

  // --- Arrastar ---
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'text' | 'element' | 'sticker',
    id: string,
  ) => {
    e.stopPropagation()
    setDragging({ type, id })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const cx = Math.max(0, Math.min(100, x))
    const cy = Math.max(0, Math.min(100, y))
    if (dragging.type === 'text') updateText(dragging.id, { x: cx, y: cy })
    else if (dragging.type === 'element') updateElement(dragging.id, { x: cx, y: cy })
    else updateSticker(dragging.id, { x: cx, y: cy })
  }

  const handlePointerUp = () => setDragging(null)

  // --- Exportar ---
  const handleExport = () => {
    saveCarousels(
      carousels.some((c) => c.id === activeCarousel.id)
        ? carousels.map((c) => (c.id === activeCarousel.id ? activeCarousel : c))
        : [activeCarousel, ...carousels],
    )
    toast.success('Carrossel salvo no localStorage (lumen_carousels_v2)!', {
      description: `${activeCarousel.slides.length} slides exportados.`,
    })
  }

  // --- Estilo do fundo ---
  const bgStyle = (): React.CSSProperties => {
    if (currentSlide.backgroundType === 'image' && currentSlide.background) {
      return {
        backgroundImage: `url(${currentSlide.background})`,
        backgroundSize: currentSlide.backgroundFit,
        backgroundPosition: 'center',
      }
    }
    return { backgroundColor: currentSlide.background }
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto gap-4 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#7C5CFC]" />
            Criar Carrossel
          </h1>
          <p className="text-xs text-[#9494A8]">
            Monte carrosséis com slides, textos, formas e stickers. Arraste os elementos no canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="border-white/10 text-xs gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Carrossel
          </Button>
        </div>
      </div>

      {/* Nome + proporção */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={activeCarousel.name}
            onChange={(e) => updateCarousel((c) => ({ ...c, name: e.target.value }))}
            placeholder="Nome do carrossel"
            className="bg-[#14141C] border-white/10 text-xs text-white"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['1:1', '16:9'] as const).map((r) => (
            <button
              key={r}
              onClick={() => updateCarousel((c) => ({ ...c, aspectRatio: r }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                activeCarousel.aspectRatio === r
                  ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                  : 'bg-[#1C1C27] text-[#9494A8] border-white/10'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[560px]">
        {/* Sidebar esquerda: miniaturas */}
        <div className="lg:col-span-3 bg-[#14141C] border border-white/10 rounded-2xl p-3 space-y-2 overflow-y-auto">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/5">
            <Layers className="w-3.5 h-3.5 text-[#7C5CFC]" /> Slides
          </h3>
          {activeCarousel.slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`w-full relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentSlideIndex
                  ? 'border-[#7C5CFC] shadow-lg shadow-[#7C5CFC]/30'
                  : 'border-white/10 hover:border-white/30'
              }`}
              style={{
                backgroundColor: slide.backgroundType === 'image' ? '#000' : slide.background,
                backgroundImage:
                  slide.backgroundType === 'image' ? `url(${slide.background})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold">
                {idx + 1}
              </span>
              <span className="absolute bottom-1 right-1 flex gap-0.5">
                {slide.texts.length > 0 && <Type className="w-2.5 h-2.5 text-white" />}
                {slide.stickers.length > 0 && <Smile className="w-2.5 h-2.5 text-white" />}
              </span>
            </button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddSlide}
            className="w-full border-dashed border-white/20 text-xs text-white hover:bg-white/5 gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Slide
          </Button>
        </div>

        {/* Canvas central */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#07070A] rounded-2xl border border-white/10 p-6 relative">
          <button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="absolute left-4 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 border border-white/10 z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() =>
              setCurrentSlideIndex(
                Math.min(activeCarousel.slides.length - 1, currentSlideIndex + 1),
              )
            }
            disabled={currentSlideIndex === activeCarousel.slides.length - 1}
            className="absolute right-4 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 border border-white/10 z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute top-4 flex items-center gap-2 z-20">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/10">
              Slide {currentSlideIndex + 1} de {activeCarousel.slides.length}
            </span>
          </div>

          <div className="absolute top-4 right-16 flex items-center gap-1 z-20">
            <button
              onClick={handleDuplicateSlide}
              className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/10"
              title="Duplicar slide"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteSlide}
              className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-red-400 border border-white/10"
              title="Remover slide"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`relative rounded-2xl shadow-2xl border border-white/15 overflow-hidden cursor-default ${
              activeCarousel.aspectRatio === '1:1'
                ? 'w-[380px] aspect-square'
                : 'w-[480px] aspect-video'
            }`}
            style={bgStyle()}
          >
            {/* Elementos */}
            {currentSlide.elements.map((el) => (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, 'element', el.id)}
                className="absolute cursor-move"
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.width,
                  height: el.height,
                  opacity: el.opacity,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {el.type === 'rectangle' && (
                  <div className="w-full h-full rounded" style={{ backgroundColor: el.color }} />
                )}
                {el.type === 'circle' && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: el.color }}
                  />
                )}
                {el.type === 'line' && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: el.color }}
                  />
                )}
              </div>
            ))}

            {/* Textos */}
            {currentSlide.texts.map((t) => (
              <div
                key={t.id}
                onPointerDown={(e) => handlePointerDown(e, 'text', t.id)}
                className="absolute cursor-move select-none"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: t.fontFamily,
                  fontSize: t.fontSize,
                  color: t.color,
                  fontWeight: t.bold ? 700 : 400,
                  fontStyle: t.italic ? 'italic' : 'normal',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'center',
                }}
              >
                {t.content}
              </div>
            ))}

            {/* Stickers */}
            {currentSlide.stickers.map((st) => (
              <div
                key={st.id}
                onPointerDown={(e) => handlePointerDown(e, 'sticker', st.id)}
                className="absolute cursor-move select-none"
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  fontSize: st.size,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {st.emoji}
              </div>
            ))}
          </div>

          {/* Faixa de slides */}
          <div className="w-full mt-4 flex items-center gap-2 overflow-x-auto pb-1 justify-center max-w-xl">
            <button
              onClick={() => moveSlide(-1)}
              disabled={currentSlideIndex === 0}
              className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {activeCarousel.slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  idx === currentSlideIndex
                    ? 'bg-[#7C5CFC] border-white/40 text-white'
                    : 'bg-[#14141C] border-white/10 text-[#9494A8] hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
            <button
              onClick={() => moveSlide(1)}
              disabled={currentSlideIndex === activeCarousel.slides.length - 1}
              className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Painel direito: ferramentas */}
        <div className="lg:col-span-3 bg-[#14141C] border border-white/10 rounded-2xl p-4 space-y-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/5">
            <Type className="w-3.5 h-3.5 text-[#7C5CFC]" /> Ferramentas do Slide
          </h3>

          {/* Fundo */}
          <div className="space-y-2">
            <span className="text-[11px] text-[#9494A8]">Fundo</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  currentSlide.backgroundType === 'color' ? currentSlide.background : '#14141C'
                }
                onChange={(e) =>
                  updateSlide({ background: e.target.value, backgroundType: 'color' })
                }
                className="w-10 h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
              <label className="flex-1 cursor-pointer">
                <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-xs text-white hover:border-white/20">
                  <ImageIcon className="w-3.5 h-3.5" /> Upload imagem
                </div>
              </label>
            </div>
            {currentSlide.backgroundType === 'image' && (
              <div className="flex items-center gap-1">
                {(['cover', 'contain', 'fill'] as const).map((fit) => (
                  <button
                    key={fit}
                    onClick={() => updateSlide({ backgroundFit: fit })}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                      currentSlide.backgroundFit === fit
                        ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                        : 'bg-[#1C1C27] text-[#9494A8] border-white/10'
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Adicionar texto */}
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

          {/* Adicionar formas */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-[#9494A8]">Formas</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => addShape('rectangle')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[#1C1C27] border border-white/10 hover:border-white/20"
              >
                <Square className="w-4 h-4 text-[#7C5CFC]" />
                <span className="text-[9px] text-[#9494A8]">Retângulo</span>
              </button>
              <button
                onClick={() => addShape('circle')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[#1C1C27] border border-white/10 hover:border-white/20"
              >
                <Circle className="w-4 h-4 text-[#22D3EE]" />
                <span className="text-[9px] text-[#9494A8]">Círculo</span>
              </button>
              <button
                onClick={() => addShape('line')}
                className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[#1C1C27] border border-white/10 hover:border-white/20"
              >
                <Minus className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-[9px] text-[#9494A8]">Linha</span>
              </button>
            </div>
          </div>

          {/* Emojis */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-[#9494A8]">Stickers</span>
            <div className="grid grid-cols-5 gap-1">
              {CAROUSEL_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="aspect-square rounded-lg bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC]/40 text-lg flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Editar itens do slide atual */}
          {(currentSlide.texts.length > 0 ||
            currentSlide.elements.length > 0 ||
            currentSlide.stickers.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-[#9494A8]">Itens do slide</span>
              {currentSlide.texts.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg bg-[#1C1C27] border border-white/10 p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#7C5CFC] font-bold">TEXTO</span>
                    <button
                      onClick={() => deleteText(t.id)}
                      className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    value={t.content}
                    onChange={(e) => updateText(t.id, { content: e.target.value })}
                    rows={2}
                    className="w-full bg-[#0e0e15] border border-white/5 rounded p-1.5 text-[11px] text-white resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => updateText(t.id, { color: e.target.value })}
                      className="w-7 h-6 rounded bg-transparent border border-white/10 cursor-pointer"
                    />
                    <select
                      value={t.fontFamily}
                      onChange={(e) => updateText(t.id, { fontFamily: e.target.value })}
                      className="flex-1 bg-[#0e0e15] border border-white/5 rounded px-1 py-1 text-[10px] text-white"
                    >
                      {CAROUSEL_FONTS.map((f) => (
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
                      max={96}
                      value={t.fontSize}
                      onChange={(e) => updateText(t.id, { fontSize: Number(e.target.value) })}
                      className="flex-1 accent-[#7C5CFC]"
                    />
                    <span className="text-[10px] text-[#9494A8] w-8">{t.fontSize}px</span>
                  </div>
                </div>
              ))}
              {currentSlide.elements.map((el) => (
                <div
                  key={el.id}
                  className="rounded-lg bg-[#1C1C27] border border-white/10 p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#22D3EE] font-bold uppercase">
                      {el.type}
                    </span>
                    <button
                      onClick={() => deleteElement(el.id)}
                      className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="color"
                    value={el.color}
                    onChange={(e) => updateElement(el.id, { color: e.target.value })}
                    className="w-full h-7 rounded bg-transparent border border-white/10 cursor-pointer"
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={el.opacity}
                    onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })}
                    className="w-full accent-[#22D3EE]"
                  />
                </div>
              ))}
              {currentSlide.stickers.map((st) => (
                <div
                  key={st.id}
                  className="rounded-lg bg-[#1C1C27] border border-white/10 p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{st.emoji}</span>
                    <button
                      onClick={() => deleteSticker(st.id)}
                      className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="range"
                    min={24}
                    max={120}
                    value={st.size}
                    onChange={(e) => updateSticker(st.id, { size: Number(e.target.value) })}
                    className="w-full accent-[#F59E0B]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[#0B0B10] border-white/10 text-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#7C5CFC]" /> Preview do Carrossel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {activeCarousel.slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`relative rounded-xl border border-white/10 overflow-hidden ${
                  activeCarousel.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
                }`}
                style={
                  slide.backgroundType === 'image'
                    ? {
                        backgroundImage: `url(${slide.background})`,
                        backgroundSize: slide.backgroundFit,
                        backgroundPosition: 'center',
                      }
                    : { backgroundColor: slide.background }
                }
              >
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-bold z-10">
                  {idx + 1}
                </span>
                {slide.elements.map((el) => (
                  <div
                    key={el.id}
                    className="absolute"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: el.width,
                      height: el.height,
                      opacity: el.opacity,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {el.type === 'rectangle' && (
                      <div
                        className="w-full h-full rounded"
                        style={{ backgroundColor: el.color }}
                      />
                    )}
                    {el.type === 'circle' && (
                      <div
                        className="w-full h-full rounded-full"
                        style={{ backgroundColor: el.color }}
                      />
                    )}
                    {el.type === 'line' && (
                      <div
                        className="w-full h-full rounded-full"
                        style={{ backgroundColor: el.color }}
                      />
                    )}
                  </div>
                ))}
                {slide.texts.map((t) => (
                  <div
                    key={t.id}
                    className="absolute"
                    style={{
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontFamily: t.fontFamily,
                      fontSize: t.fontSize,
                      color: t.color,
                      fontWeight: t.bold ? 700 : 400,
                      fontStyle: t.italic ? 'italic' : 'normal',
                      whiteSpace: 'pre-wrap',
                      textAlign: 'center',
                    }}
                  >
                    {t.content}
                  </div>
                ))}
                {slide.stickers.map((st) => (
                  <div
                    key={st.id}
                    className="absolute"
                    style={{
                      left: `${st.x}%`,
                      top: `${st.y}%`,
                      fontSize: st.size,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {st.emoji}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
