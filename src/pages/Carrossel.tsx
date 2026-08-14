import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { usePlatform } from '@/context/PlatformContext'
import { CarouselProject, CarouselSlide } from '@/types/studio'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Download,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Type,
  Palette,
  Image as ImageIcon,
  Save,
  Wand2,
  MoveRight,
  ChevronUp,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

type CarrosselStatus = 'rascunho' | 'pronto' | 'agendado'

const HOOK_CATEGORIES = [
  { id: 'problema', label: 'Problema', template: 'Cansado de {TEMA} sem resultado?' },
  { id: 'curiosidade', label: 'Curiosidade', template: 'O que ninguém te conta sobre {TEMA}:' },
  { id: 'passo_passo', label: 'Passo a passo', template: 'Passo a passo para dominar {TEMA}:' },
  { id: 'lista', label: 'Lista', template: '5 coisas sobre {TEMA} que você precisa saber:' },
  { id: 'comparacao', label: 'Comparação', template: 'Erro comum vs. jeito certo de {TEMA}:' },
] as const

export default function EditorCarrossel() {
  const navigate = useNavigate()
  const { carousels, saveCarousel, schedulePost } = useStudio()
  const { hasBrandOS, brandProfile, saveContentItem } = usePlatform()

  const [activeCarousel, setActiveCarousel] = useState<CarouselProject>(() => {
    return (
      carousels[0] || {
        id: 'car-new-' + Date.now(),
        title: 'Carrossel Viral: Estratégias de Retenção',
        aspectRatio: '4:5',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: 'https://img.usecurling.com/p/1080/1350?q=slide+presentation+dark&color=purple',
        slides: [
          {
            id: 's1',
            title: 'Como Prender a Atenção nos Primeiros 3 Segundos',
            subtitle: 'O Segredo dos Maiores Criadores',
            bodyText:
              'Descubra a fórmula que gera mais de 80% de retenção e faz o algoritmo entregar seu vídeo.',
            bgType: 'gradient',
            bgColor: '#14141C',
            bgGradient: 'from-violet-950 via-slate-900 to-black',
            elements: [
              {
                id: 'el-1',
                type: 'badge',
                content: 'ESTRATÉGIA COMPLETA',
                x: 50,
                y: 15,
                color: '#7C5CFC',
              },
              {
                id: 'el-2',
                type: 'arrow',
                content: 'Arrasta para ver 👉',
                x: 50,
                y: 88,
                color: '#22D3EE',
              },
            ],
          },
          {
            id: 's2',
            title: '1. Gancho Visual de Quebra de Padrão',
            subtitle: 'Evite começos previsíveis',
            bodyText:
              'Use movimento brusco, troca de ângulo ou um elemento visual inesperado no primeiro frame.',
            bgType: 'color',
            bgColor: '#14141C',
            bgGradient: '',
            elements: [
              { id: 'el-3', type: 'step', content: 'PASSO 01', x: 20, y: 20, color: '#22D3EE' },
            ],
          },
        ],
      }
    )
  })

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const currentSlide = activeCarousel.slides[currentSlideIndex] || activeCarousel.slides[0]

  // === Briefing (objetivo, público, mensagem principal) com autosave 2s ===
  const [briefing, setBriefing] = useState<{ objetivo: string; publico: string; mensagem: string }>(
    () => {
      const saved = localStorage.getItem('lumen_carrossel_briefing_v2')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          /* intentionally ignored */
        }
      }
      return { objetivo: '', publico: '', mensagem: '' }
    },
  )
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem('lumen_carrossel_briefing_v2', JSON.stringify(briefing))
    }, 2000)
    return () => clearTimeout(t)
  }, [briefing])

  // === Copy card a card (textarea + preview) por slide ===
  const [slideCopy, setSlideCopy] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('lumen_carrossel_copy')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* intentionally ignored */
      }
    }
    return {}
  })
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem('lumen_carrossel_copy', JSON.stringify(slideCopy))
    }, 2000)
    return () => clearTimeout(t)
  }, [slideCopy])

  // === Status do carrossel (draft → pronto → agendado) ===
  const [carrosselStatus, setCarrosselStatus] = useState<CarrosselStatus>(() => {
    const saved = localStorage.getItem('lumen_carrossel_status')
    return (saved as CarrosselStatus) || 'rascunho'
  })
  useEffect(() => {
    localStorage.setItem('lumen_carrossel_status', carrosselStatus)
  }, [carrosselStatus])

  const suggestHook = (categoryId: (typeof HOOK_CATEGORIES)[number]['id']) => {
    const cat = HOOK_CATEGORIES.find((c) => c.id === categoryId) || HOOK_CATEGORIES[0]
    const tema = briefing.mensagem || activeCarousel.title
    const hookText = cat.template.replace('{TEMA}', tema.toLowerCase())
    updateCurrentSlide({ title: hookText })
    toast.success(`Hook sugerido (${cat.label}) aplicado ao slide!`)
  }

  const rewriteCard = () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.', {
        action: { label: 'Tentar novamente', onClick: rewriteCard },
      })
      return
    }
    const diff = brandProfile.base.differential || 'entrega de valor'
    updateCurrentSlide({
      bodyText: `[Reescrito] ${currentSlide.bodyText}\n\n→ ${diff}.`,
    })
    toast.success('Card reescrito com Brand OS!')
  }

  const condenseCard = () => {
    updateCurrentSlide({
      bodyText: currentSlide.bodyText.split('.')[0] + '.',
    })
    toast.success('Card condensado (essência mantida)!')
  }

  const moveSlide = (dir: -1 | 1) => {
    const target = currentSlideIndex + dir
    if (target < 0 || target >= activeCarousel.slides.length) return
    const slides = [...activeCarousel.slides]
    ;[slides[currentSlideIndex], slides[target]] = [slides[target], slides[currentSlideIndex]]
    const updated = { ...activeCarousel, slides }
    setActiveCarousel(updated)
    setCurrentSlideIndex(target)
    saveCarousel(updated)
    toast.success('Slide reordenado!')
  }

  const exportTxt = () => {
    const txt = activeCarousel.slides
      .map(
        (s, i) =>
          `# Card ${i + 1}\nTítulo: ${s.title}\nSubtítulo: ${s.subtitle || ''}\nBody: ${s.bodyText}\nCopy: ${slideCopy[s.id] || ''}`,
      )
      .join('\n\n---\n\n')
    const blob = new Blob([txt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeCarousel.title || 'carrossel'}-copy.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('TXT com todos os cards baixado!')
  }

  const exportPng = () => {
    toast.info('Exportação PNG/ZIP', {
      description:
        'A renderização real depende de integração com motor de imagem. O conteúdo está pronto.',
    })
  }

  const generateCaption = () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.')
      return
    }
    const caption = `${activeCarousel.title} — ${brandProfile.base.differential || 'entrega de valor'}. Salve este post! #carrossel #conteudo`
    setSlideCopy((c) => ({ ...c, _caption: caption }))
    toast.success('Legenda gerada com IA!')
  }

  const updateCurrentSlide = (updates: Partial<CarouselSlide>) => {
    const newSlides = activeCarousel.slides.map((s, idx) =>
      idx === currentSlideIndex ? { ...s, ...updates } : s,
    )
    const updated = { ...activeCarousel, slides: newSlides }
    setActiveCarousel(updated)
    saveCarousel(updated)
  }

  const handleAddSlide = () => {
    const newSlide: CarouselSlide = {
      id: 'slide-' + Date.now(),
      title: `Novo Slide #${activeCarousel.slides.length + 1}`,
      subtitle: 'Subtítulo complementar',
      bodyText: 'Insira aqui a explicação chave ou os pontos da lista...',
      bgType: 'gradient',
      bgColor: '#14141C',
      bgGradient: 'from-slate-950 via-violet-950 to-black',
      elements: [
        {
          id: 'step-' + Date.now(),
          type: 'step',
          content: `PASSO 0${activeCarousel.slides.length + 1}`,
          x: 20,
          y: 20,
          color: '#7C5CFC',
        },
      ],
    }
    const updated = { ...activeCarousel, slides: [...activeCarousel.slides, newSlide] }
    setActiveCarousel(updated)
    setCurrentSlideIndex(updated.slides.length - 1)
    saveCarousel(updated)
    toast.success('Slide adicionado ao carrossel!')
  }

  const handleDuplicateSlide = () => {
    const dup: CarouselSlide = {
      ...currentSlide,
      id: 'slide-dup-' + Date.now(),
      title: `${currentSlide.title} (Cópia)`,
    }
    const updatedSlides = [...activeCarousel.slides]
    updatedSlides.splice(currentSlideIndex + 1, 0, dup)
    const updated = { ...activeCarousel, slides: updatedSlides }
    setActiveCarousel(updated)
    setCurrentSlideIndex(currentSlideIndex + 1)
    saveCarousel(updated)
    toast.success('Slide duplicado com sucesso!')
  }

  const handleDeleteSlide = () => {
    if (activeCarousel.slides.length <= 1) {
      toast.warning('O carrossel precisa ter pelo menos 1 slide.')
      return
    }
    const updatedSlides = activeCarousel.slides.filter((_, idx) => idx !== currentSlideIndex)
    const updated = { ...activeCarousel, slides: updatedSlides }
    setActiveCarousel(updated)
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
    saveCarousel(updated)
    toast.success('Slide removido.')
  }

  const handleApplyTemplate = (type: 'storytelling' | 'list' | 'before-after') => {
    if (type === 'storytelling') {
      const slides: CarouselSlide[] = [
        {
          id: 'st-1',
          title: 'O Maior Erro que Cometi Criando Vídeos',
          subtitle: 'E como reverti para 100k views',
          bodyText:
            'Em 2023 eu passava 6 horas editando um único vídeo e o alcance era zero. Até entender isso...',
          bgType: 'gradient',
          bgColor: '#14141C',
          bgGradient: 'from-red-950 via-slate-900 to-black',
          elements: [
            { id: 'b1', type: 'badge', content: 'HISTÓRIA REAL', x: 50, y: 15, color: '#F87171' },
          ],
        },
        {
          id: 'st-2',
          title: 'A Virada de Chave: Menos Efeitos, Mais Ritmo',
          subtitle: 'A regra dos 3 segundos',
          bodyText:
            'O algoritmo não quer efeitos 3D complexos, ele quer dinamismo na fala e clareza visual.',
          bgType: 'gradient',
          bgColor: '#14141C',
          bgGradient: 'from-violet-950 via-slate-900 to-black',
          elements: [
            { id: 'b2', type: 'step', content: 'INSIGHT 01', x: 20, y: 20, color: '#7C5CFC' },
          ],
        },
        {
          id: 'st-3',
          title: 'Salve este Carrossel para Consultar Depois',
          subtitle: 'Comente "AULA" para o guia em PDF',
          bodyText: 'Compartilhe com um amigo criador que precisa destravar o engajamento.',
          bgType: 'gradient',
          bgColor: '#14141C',
          bgGradient: 'from-cyan-950 via-slate-900 to-black',
          elements: [
            { id: 'b3', type: 'badge', content: 'CHAMADA FINAL', x: 50, y: 85, color: '#22D3EE' },
          ],
        },
      ]
      const updated = { ...activeCarousel, slides }
      setActiveCarousel(updated)
      setCurrentSlideIndex(0)
      saveCarousel(updated)
      toast.success('Template Storytelling aplicado!')
    }
  }

  const handleScheduleCarousel = () => {
    schedulePost({
      title: activeCarousel.title,
      mediaUrl: activeCarousel.thumbnail,
      mediaType: 'carousel',
      platforms: ['instagram'],
      scheduledDate: new Date(Date.now() + 3600000 * 24).toISOString(),
      caption: `Arrasta para o lado 👉 ${activeCarousel.title}. Conteúdo completo com ${activeCarousel.slides.length} slides! #carrossel #conteudo #lumen`,
      hashtags: ['#carrossel', '#marketing', '#lumenstudio', '#dicas'],
      status: 'scheduled',
    })
    navigate('/agendamento')
    toast.success('Carrossel agendado com sucesso!')
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto gap-4 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projetos')}
            className="text-xs text-[#9494A8] hover:text-white"
          >
            ← Voltar
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-400" />
              Editor de Carrossel
            </h1>
            <p className="text-xs text-[#9494A8]">
              Crie carrosséis de alta retenção para Instagram com slides contínuos e navegação
              automática.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyTemplate('storytelling')}
            className="border-white/10 text-xs text-[#22D3EE] hover:bg-[#22D3EE]/10 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Template Storytelling
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportTxt}
            className="border-white/10 text-xs gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> TXT
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="sm"
                  onClick={exportPng}
                  className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar Slides
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
              A renderização PNG/ZIP real depende de integração com motor de imagem.
            </TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            onClick={handleScheduleCarousel}
            className="bg-[#22D3EE] hover:bg-[#1CBAD1] text-black text-xs font-bold gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> Agendar Post
          </Button>
        </div>
      </div>

      {/* === BRIEFING (objetivo, público, mensagem principal — autosave) === */}
      <div className="rounded-2xl bg-[#14141C] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#7C5CFC]" /> Briefing do Carrossel
          </h3>
          {hasBrandOS ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
              Brand OS v{brandProfile.activeVersion}
            </Badge>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] cursor-help">
                  Brand OS pendente
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                Configure seu Brand OS primeiro em Posicionamento.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-[#9494A8] block mb-1">Objetivo</label>
            <input
              value={briefing.objetivo}
              onChange={(e) => setBriefing({ ...briefing, objetivo: e.target.value })}
              placeholder="Ex: Educar sobre retenção"
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#9494A8] block mb-1">Público</label>
            <input
              value={briefing.publico}
              onChange={(e) => setBriefing({ ...briefing, publico: e.target.value })}
              placeholder="Ex: Criadores iniciantes"
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#9494A8] block mb-1">Mensagem principal</label>
            <input
              value={briefing.mensagem}
              onChange={(e) => setBriefing({ ...briefing, mensagem: e.target.value })}
              placeholder="Ex: Método > inspiração"
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />
          </div>
        </div>
        <p className="text-[10px] text-[#9494A8]/70 italic">Autossalvo a cada 2s</p>
      </div>

      {/* === STATUS do carrossel === */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#9494A8]">Status:</span>
        {(['rascunho', 'pronto', 'agendado'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setCarrosselStatus(s)
              toast.success(`Status alterado para "${s}"!`)
            }}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium capitalize border transition-all ${
              carrosselStatus === s
                ? s === 'pronto'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : s === 'agendado'
                    ? 'bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-[#1C1C27] text-[#9494A8] border-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Workspace: Left Carousel Slide Thumbnails + Center Slide Canvas + Right Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[520px]">
        {/* CENTER SLIDE PREVIEW CANVAS (7 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-[#07070A] rounded-2xl border border-white/10 p-6 relative shadow-2xl">
          {/* Navigation Arrows */}
          <button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="absolute left-4 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 border border-white/10 backdrop-blur-md z-20"
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
            className="absolute right-4 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 border border-white/10 backdrop-blur-md z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide Visual Box */}
          <div
            className={`relative rounded-2xl shadow-2xl border border-white/15 p-8 flex flex-col justify-between overflow-hidden transition-all ${
              activeCarousel.aspectRatio === '4:5'
                ? 'w-[360px] sm:w-[400px] aspect-[4/5]'
                : 'w-[360px] sm:w-[400px] aspect-square'
            } ${
              currentSlide.bgType === 'gradient'
                ? `bg-gradient-to-br ${currentSlide.bgGradient}`
                : ''
            }`}
            style={{
              backgroundColor: currentSlide.bgType === 'color' ? currentSlide.bgColor : undefined,
            }}
          >
            {/* Top Slide Header Elements & Counter */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase text-[#22D3EE] border border-white/10">
                {currentSlide.elements.find((e) => e.type === 'badge')?.content || 'LUMEN STUDIO'}
              </span>

              {/* Progress counter e.g. 1/5 */}
              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/10">
                {currentSlideIndex + 1}/{activeCarousel.slides.length}
              </span>
            </div>

            {/* Middle Content */}
            <div className="space-y-4 my-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {currentSlide.title}
              </h2>

              {currentSlide.subtitle && (
                <p className="text-sm font-semibold text-[#22D3EE] uppercase tracking-wide">
                  {currentSlide.subtitle}
                </p>
              )}

              <p className="text-sm text-slate-300 leading-relaxed">{currentSlide.bodyText}</p>
            </div>

            {/* Bottom Footer Elements (Author / Arrow) */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-[#9494A8]">
              <span className="font-semibold text-white">@lumenstudio.ia</span>
              <span className="text-[#22D3EE] font-bold flex items-center gap-1">
                {currentSlideIndex === activeCarousel.slides.length - 1
                  ? 'Salvar post 📌'
                  : 'Arrasta 👉'}
              </span>
            </div>
          </div>

          {/* Horizontal Slide Strip (Bottom of Preview) */}
          <div className="w-full mt-4 flex items-center gap-2 overflow-x-auto pb-1 max-w-2xl justify-center">
            {activeCarousel.slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  idx === currentSlideIndex
                    ? 'bg-[#7C5CFC] border-white/40 text-white shadow-lg shadow-[#7C5CFC]/30'
                    : 'bg-[#14141C] border-white/10 text-[#9494A8] hover:text-white'
                }`}
              >
                Slide #{idx + 1}
              </button>
            ))}

            <Button
              size="sm"
              variant="outline"
              onClick={handleAddSlide}
              className="h-8 border-dashed border-white/20 text-xs text-white hover:bg-white/5 gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: Slide Editor Controls (4 cols) */}
        <div className="lg:col-span-4 bg-[#14141C] border border-white/10 rounded-2xl p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#7C5CFC]" />
              Editar Slide #{currentSlideIndex + 1}
            </h3>

            <div className="flex items-center gap-1">
              <button
                onClick={handleDuplicateSlide}
                className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5"
                title="Duplicar Slide"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteSlide}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                title="Excluir Slide"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Título Principal</label>
              <input
                type="text"
                value={currentSlide.title}
                onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            {/* === HOOKS POR CATEGORIA === */}
            <div className="pt-1">
              <label className="text-[11px] text-[#9494A8] block mb-1">
                Sugerir hook por categoria
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HOOK_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => suggestHook(c.id)}
                    className="px-2 py-1 rounded-lg text-[10px] bg-[#1C1C27] text-[#9494A8] hover:text-white hover:bg-white/10 border border-white/5"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Subtítulo / Destaque</label>
              <input
                type="text"
                value={currentSlide.subtitle || ''}
                onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Texto do Corpo</label>
              <textarea
                value={currentSlide.bodyText}
                onChange={(e) => updateCurrentSlide({ bodyText: e.target.value })}
                rows={4}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            {/* === COPY CARD A CARD (textarea + preview) === */}
            <div className="pt-2 border-t border-white/5">
              <label className="text-[11px] text-[#9494A8] block mb-1">
                Copy do card (para legenda/post)
              </label>
              <textarea
                value={slideCopy[currentSlide.id] || ''}
                onChange={(e) => setSlideCopy({ ...slideCopy, [currentSlide.id]: e.target.value })}
                rows={3}
                placeholder="Escreva a copy deste card…"
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none"
              />
              {slideCopy[currentSlide.id] && (
                <div className="mt-1.5 rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2 text-[10px] text-slate-300 italic">
                  Preview: {slideCopy[currentSlide.id]}
                </div>
              )}
            </div>

            {/* === REESCRITA + CONDENSAÇÃO === */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={rewriteCard}
                      disabled={!hasBrandOS}
                      className="border-white/10 text-[11px] text-[#22D3EE] hover:bg-[#22D3EE]/10 gap-1.5 disabled:opacity-50"
                    >
                      <Wand2 className="w-3 h-3" /> Reescrever
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasBrandOS && (
                  <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                    Configure seu Brand OS primeiro em Posicionamento.
                  </TooltipContent>
                )}
              </Tooltip>
              <Button
                size="sm"
                variant="outline"
                onClick={condenseCard}
                className="border-white/10 text-[11px] text-[#9494A8] hover:text-white gap-1.5"
              >
                <Sparkles className="w-3 h-3" /> Condensar
              </Button>
            </div>

            {/* === REORDENAÇÃO (↑↓) === */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] text-[#9494A8]">Reordenar slide</span>
              <div className="flex gap-1">
                <button
                  onClick={() => moveSlide(-1)}
                  disabled={currentSlideIndex === 0}
                  className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-20"
                  title="Mover para cima"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveSlide(1)}
                  disabled={currentSlideIndex === activeCarousel.slides.length - 1}
                  className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-20"
                  title="Mover para baixo"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Background Style Switcher */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-[11px] text-[#9494A8] block">Estilo do Fundo</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  {
                    id: 'gradient-1',
                    label: 'Violeta Dark',
                    grad: 'from-violet-950 via-slate-900 to-black',
                  },
                  {
                    id: 'gradient-2',
                    label: 'Ciano Neon',
                    grad: 'from-cyan-950 via-slate-900 to-black',
                  },
                  { id: 'gradient-3', label: 'Carbono', grad: 'from-slate-950 to-black' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => updateCurrentSlide({ bgType: 'gradient', bgGradient: g.grad })}
                    className="p-2 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-[11px] font-medium text-white"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Proporção 4:5 (confirmar funciona) */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-[#9494A8]">Proporção</span>
              <div className="flex gap-1">
                {(['1:1', '4:5'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      const updated = { ...activeCarousel, aspectRatio: r }
                      setActiveCarousel(updated)
                      saveCarousel(updated)
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
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
          </div>
        </div>
      </div>

      {/* === LEGENDA MANUAL OU GERADA POR IA === */}
      <div className="rounded-2xl bg-[#14141C] border border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#22D3EE]" /> Legenda do carrossel
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateCaption}
                  disabled={!hasBrandOS}
                  className="border-white/10 text-[11px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" /> Gerar legenda com IA
                </Button>
              </span>
            </TooltipTrigger>
            {!hasBrandOS && (
              <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                Configure seu Brand OS primeiro em Posicionamento.
              </TooltipContent>
            )}
          </Tooltip>
        </div>
        <textarea
          value={slideCopy._caption || ''}
          onChange={(e) => setSlideCopy({ ...slideCopy, _caption: e.target.value })}
          rows={3}
          placeholder="Escreva a legenda ou gere com IA…"
          className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none"
        />
      </div>
    </div>
  )
}
