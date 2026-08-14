import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { usePlatform } from '@/context/PlatformContext'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Camera,
  Layers,
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  Play,
  Share2,
  Eye,
  Heart,
  Video,
  FileImage,
  Flame,
  ChevronRight,
  Tv,
  Compass,
  PenSquare,
  GitBranch,
  Boxes,
  Megaphone,
  Headphones,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

export default function Index() {
  const navigate = useNavigate()
  const { projects, scheduledPosts, setIsCreateModalOpen, createProject, setActiveProjectId } =
    useStudio()
  const {
    hasBrandOS,
    brandProfile,
    jobs,
    contentItems,
    ideas,
    funnelDiagnosis,
    ecosystem,
    funnelPlans,
    pageProjects,
    videoScripts,
    adCreations,
    salesScripts,
    scheduleEvents,
  } = usePlatform()

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12
      ? 'Bom dia, Marcos ☀️'
      : currentHour < 18
        ? 'Boa tarde, Marcos 🌤️'
        : 'Boa noite, Marcos 🌙'

  const scheduledCount = scheduledPosts.filter((p) => p.status === 'scheduled').length
  const draftsCount = projects.filter((p) => p.status === 'draft').length

  const featuredTemplates = [
    {
      id: 'tmpl-1',
      title: 'Hook Viral em 3 Passos',
      category: 'Reels / TikTok',
      duration: '30s',
      tag: 'Alta Retenção',
      image: 'https://img.usecurling.com/p/600/800?q=cinematic+portrait+neon&color=purple',
      type: 'reel' as const,
    },
    {
      id: 'tmpl-2',
      title: 'Cortes Dinâmicos Podcast',
      category: 'Cortes / Shorts',
      duration: '45s',
      tag: 'Legendas Auto',
      image: 'https://img.usecurling.com/p/600/800?q=podcaster+microphone+dark&color=cyan',
      type: 'reel' as const,
    },
    {
      id: 'tmpl-3',
      title: 'Review Tech & Unboxing',
      category: 'YouTube 4K',
      duration: '8min',
      tag: 'Widescreen',
      image: 'https://img.usecurling.com/p/600/800?q=gadget+unboxing+studio&color=purple',
      type: 'youtube' as const,
    },
    {
      id: 'tmpl-4',
      title: 'Carrossel Educativo 5 Slides',
      category: 'Instagram',
      duration: '5 slides',
      tag: 'Design Pro',
      image: 'https://img.usecurling.com/p/600/800?q=infographic+slides+neon',
      type: 'carousel' as const,
    },
  ]

  const handleUseTemplate = (template: (typeof featuredTemplates)[0]) => {
    if (template.type === 'carousel') {
      navigate('/carrossel')
      toast.success(`Template "${template.title}" carregado no Editor de Carrossel!`)
    } else {
      const newProj = createProject({
        title: `${template.title} (Template)`,
        type: template.type,
        aspectRatio: template.type === 'youtube' ? '16:9' : '9:16',
        thumbnail: template.image,
      })
      navigate(`/editor/${newProj.id}`)
      toast.success(`Template "${template.title}" duplicado para seu novo projeto!`)
    }
  }

  const modules = [
    {
      num: 1,
      title: 'Posicionamento',
      desc: 'Brand OS: oferta, ICP, voz, prova',
      path: '/modulo-1',
      icon: Compass,
      color: '#7C5CFC',
    },
    {
      num: 2,
      title: 'Conteúdo',
      desc: 'Posts, stories, reels, carrosséis',
      path: '/modulo-2',
      icon: PenSquare,
      color: '#22D3EE',
    },
    {
      num: 3,
      title: 'Funis',
      desc: 'Raio-X, ecossistema, planos',
      path: '/modulo-3',
      icon: GitBranch,
      color: '#7C5CFC',
    },
    {
      num: 4,
      title: 'Ativos',
      desc: 'Páginas e roteiros de vídeo',
      path: '/modulo-4',
      icon: Boxes,
      color: '#22D3EE',
    },
    {
      num: 5,
      title: 'Escala',
      desc: 'Anúncios e biblioteca',
      path: '/modulo-5',
      icon: Megaphone,
      color: '#7C5CFC',
    },
    {
      num: 6,
      title: 'Vendas',
      desc: 'Assistente, scripts, social',
      path: '/modulo-6',
      icon: Headphones,
      color: '#22D3EE',
    },
  ]

  // ===== Progresso dos Módulos (baseado em dados reais) =====
  // Se não houver Brand OS, todos os módulos mostram 0%.
  const diagFilled = Object.values(funnelDiagnosis.current).filter(
    (v) => String(v).trim() !== '',
  ).length
  const funnelApproved = ecosystem?.status === 'aprovado'
  const pendingChecklists = funnelPlans.reduce(
    (acc, p) =>
      acc + (p.checklist?.filter((c) => !c.concluido_em && c.prioridade !== 'baixa').length || 0),
    0,
  )

  const moduleProgress = hasBrandOS
    ? [
        {
          num: 1,
          title: 'Posicionamento',
          pct: 100, // Brand OS existe => módulo base concluído
          path: '/modulo-1',
          hint: 'Brand OS ativo',
        },
        {
          num: 2,
          title: 'Conteúdo',
          pct: Math.min(100, Math.round((contentItems.length / 5) * 100)),
          path: '/modulo-2',
          hint: `${contentItems.length} conteúdo(s) • ${ideas.length} ideia(s)`,
        },
        {
          num: 3,
          title: 'Funis',
          pct: Math.min(
            100,
            Math.round(
              (diagFilled >= 8 ? 33 : (diagFilled / 8) * 33) +
                (ecosystem ? 34 : 0) +
                (funnelApproved ? 33 : 0),
            ),
          ),
          path: '/funis',
          hint: `${diagFilled}/12 Raio-X • ${funnelPlans.length} plano(s) • ${pendingChecklists} checklist pendente(s)`,
        },
        {
          num: 4,
          title: 'Ativos',
          pct: Math.min(100, Math.round(((pageProjects.length + videoScripts.length) / 4) * 100)),
          path: '/modulo-4',
          hint: `${pageProjects.length} página(s) • ${videoScripts.length} roteiro(s)`,
        },
        {
          num: 5,
          title: 'Escala',
          pct: Math.min(100, Math.round((adCreations.length / 3) * 100)),
          path: '/modulo-5',
          hint: `${adCreations.length} anúncio(s) criado(s)`,
        },
        {
          num: 6,
          title: 'Vendas',
          pct: Math.min(100, Math.round((salesScripts.length / 3) * 100)),
          path: '/modulo-6',
          hint: `${salesScripts.length} script(s) salvos`,
        },
      ]
    : [
        {
          num: 1,
          title: 'Posicionamento',
          pct: 0,
          path: '/modulo-1',
          hint: 'Configure seu Brand OS primeiro',
        },
        {
          num: 2,
          title: 'Conteúdo',
          pct: 0,
          path: '/modulo-2',
          hint: 'Configure seu Brand OS primeiro',
        },
        { num: 3, title: 'Funis', pct: 0, path: '/funis', hint: 'Configure seu Brand OS primeiro' },
        {
          num: 4,
          title: 'Ativos',
          pct: 0,
          path: '/modulo-4',
          hint: 'Configure seu Brand OS primeiro',
        },
        {
          num: 5,
          title: 'Escala',
          pct: 0,
          path: '/modulo-5',
          hint: 'Configure seu Brand OS primeiro',
        },
        {
          num: 6,
          title: 'Vendas',
          pct: 0,
          path: '/modulo-6',
          hint: 'Configure seu Brand OS primeiro',
        },
      ]

  // ===== Gerações Recentes (últimos 5 jobs de qualquer módulo) =====
  const recentJobs = [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  const kindLabel: Record<string, string> = {
    'brand-os': 'Brand OS',
    sales_assist: 'Vendas',
    analise_biblioteca: 'Biblioteca',
    analise_anuncio: 'Anúncio',
  }
  const jobModule = (kind: string): { label: string; path: string } => {
    if (kind === 'brand-os') return { label: 'Posicionamento', path: '/modulo-1' }
    if (kind === 'sales_assist') return { label: 'Vendas', path: '/modulo-6' }
    if (kind === 'analise_anuncio' || kind === 'analise_biblioteca')
      return { label: 'Escala', path: '/modulo-5' }
    return { label: 'Plataforma', path: '/' }
  }
  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'agora'
    if (min < 60) return `há ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
    const d = Math.floor(h / 24)
    return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  }

  // ===== Próximas Ações (derivadas dos dados reais) =====
  const nextActions: { text: string; path: string; icon: React.ReactNode }[] = []
  if (!hasBrandOS) {
    nextActions.push({
      text: 'Configurar Brand OS no Posicionamento',
      path: '/modulo-1',
      icon: <Compass className="w-3.5 h-3.5" />,
    })
  } else {
    if (diagFilled < 8)
      nextActions.push({
        text: `Preencher Raio-X do funil (${diagFilled}/12 campos)`,
        path: '/funis',
        icon: <GitBranch className="w-3.5 h-3.5" />,
      })
    if (ecosystem && ecosystem.status === 'recomendado' && !funnelApproved)
      nextActions.push({
        text: 'Aprovar ecossistema de funis recomendado',
        path: '/funis',
        icon: <GitBranch className="w-3.5 h-3.5" />,
      })
    if (pendingChecklists > 0)
      nextActions.push({
        text: `Concluir ${pendingChecklists} item(ns) de checklist do funil`,
        path: '/funis',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      })
    if (funnelPlans.length > 0 && pageProjects.length === 0)
      nextActions.push({
        text: 'Gerar página de captura para o funil aprovado',
        path: '/modulo-4',
        icon: <Boxes className="w-3.5 h-3.5" />,
      })
    if (contentItems.length === 0)
      nextActions.push({
        text: 'Gerar primeiro conteúdo no Módulo 2',
        path: '/modulo-2',
        icon: <PenSquare className="w-3.5 h-3.5" />,
      })
    if (brandProfile.research.length === 0)
      nextActions.push({
        text: 'Preencher Pesquisa Completa do Brand OS',
        path: '/modulo-1',
        icon: <Compass className="w-3.5 h-3.5" />,
      })
  }
  const displayActions = nextActions.slice(0, 5)

  // ===== Mini Calendário (próximos 7 dias) =====
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
  const dayHasEvents = (d: Date) => {
    const dayStr = d.toISOString().slice(0, 10)
    const schedEv = scheduleEvents.some((e) => e.date?.slice(0, 10) === dayStr)
    const schedPost = scheduledPosts.some((p) => p.scheduledDate?.slice(0, 10) === dayStr)
    return schedEv || schedPost
  }
  const weekdayShort = (d: Date) =>
    d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')

  // ===== Academy transversal — atalho =====
  const academyProgress = (() => {
    try {
      const saved = localStorage.getItem('lumen_academy_progress')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })()
  const academyCompleted = Object.values(academyProgress).filter((v: any) => v?.completed)
    .length as number
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Onboarding Banner — completar posicionamento */}
      {!hasBrandOS && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7C5CFC]/20 via-[#14141C] to-[#22D3EE]/15 border border-[#7C5CFC]/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Complete seu Posicionamento (Brand OS)
              </h3>
              <p className="text-xs text-[#9494A8] mt-0.5">
                A base de marca alimenta todos os geradores de IA da plataforma. Comece pelo Módulo
                1.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/modulo-1')}
            className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-xs gap-1.5 shrink-0"
          >
            <Compass className="w-4 h-4" /> Iniciar Módulo 1
          </Button>
        </div>
      )}

      {/* Vídeo introdutório */}
      <div className="relative overflow-hidden rounded-2xl bg-[#14141C] border border-white/10 aspect-video max-h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] mb-2">
            <PlayCircle className="w-7 h-7" />
          </div>
          <p className="text-xs text-[#9494A8]">Vídeo introdutório — bem-vindo à plataforma</p>
        </div>
      </div>

      {/* 1. Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1C27] via-[#14141C] to-[#0B0B10] border border-white/10 p-6 sm:p-8 shadow-2xl">
        {/* Glow Effects Background */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-[#7C5CFC]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-60 h-60 bg-[#22D3EE]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 text-xs font-semibold text-[#22D3EE]">
              <Sparkles className="w-3.5 h-3.5 text-[#22D3EE] animate-pulse" />
              <span>LUMEN IA v3.2 Ativo • 8 modelos generativos prontos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {greeting}
            </h1>
            <p className="text-sm sm:text-base text-[#9494A8]">
              Você tem{' '}
              <span className="text-white font-semibold">{scheduledCount} postagens agendadas</span>{' '}
              e <span className="text-white font-semibold">{draftsCount} rascunhos</span> em
              andamento. O que vamos criar hoje?
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] hover:opacity-90 text-white font-bold text-sm px-5 py-5 rounded-xl shadow-lg shadow-[#7C5CFC]/30 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Iniciar Nova Criação
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/gravadora')}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-sm px-4 py-5 rounded-xl transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-red-400" />
              Gravar ao Vivo
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Quick Access (4 Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#7C5CFC]" />
            Acesso Rápido ao Estúdio
          </h2>
          <span className="text-xs text-[#9494A8]">Fluxos mais utilizados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/gravadora')}
            className="group p-5 rounded-2xl bg-[#14141C] hover:bg-[#1C1C27] border border-white/5 hover:border-red-500/40 transition-all duration-200 text-left relative overflow-hidden flex flex-col justify-between h-40 shadow-lg glow-card-hover"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                REC
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-red-400 transition-colors">
                Gravar Agora
              </h3>
              <p className="text-xs text-[#9494A8] mt-1 line-clamp-2">
                Webcam, câmera do celular, teleprompter integrado e filtros em tempo real
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              const p = createProject({ title: 'Edição Rápida com IA', type: 'reel' })
              navigate(`/editor/${p.id}`)
            }}
            className="group p-5 rounded-2xl bg-[#14141C] hover:bg-[#1C1C27] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 text-left relative overflow-hidden flex flex-col justify-between h-40 shadow-lg glow-card-hover"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30">
                IA PRO
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-[#7C5CFC] transition-colors">
                Editar com IA
              </h3>
              <p className="text-xs text-[#9494A8] mt-1 line-clamp-2">
                Legendas sincronizadas, cortes de pausas e ritmo musical inteligente
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/carrossel')}
            className="group p-5 rounded-2xl bg-[#14141C] hover:bg-[#1C1C27] border border-white/5 hover:border-emerald-500/40 transition-all duration-200 text-left relative overflow-hidden flex flex-col justify-between h-40 shadow-lg glow-card-hover"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Multi-Slide
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                Criar Carrossel
              </h3>
              <p className="text-xs text-[#9494A8] mt-1 line-clamp-2">
                Design contínuo, templates prontos para Instagram e LinkedIn
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/agendamento')}
            className="group p-5 rounded-2xl bg-[#14141C] hover:bg-[#1C1C27] border border-white/5 hover:border-[#22D3EE]/40 transition-all duration-200 text-left relative overflow-hidden flex flex-col justify-between h-40 shadow-lg glow-card-hover"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30">
                Multi-Redes
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-[#22D3EE] transition-colors">
                Agendar Post
              </h3>
              <p className="text-xs text-[#9494A8] mt-1 line-clamp-2">
                Programação para Instagram Reels, TikTok e Shorts com melhor horário
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 2.5 Plataforma de Marketing e Vendas com IA — 6 Módulos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C5CFC]" />
            Plataforma de Marketing e Vendas com IA
          </h2>
          <span className="text-xs text-[#9494A8]">
            {hasBrandOS ? `Brand OS ativo • v${brandProfile.activeVersion}` : 'Onboarding pendente'}
          </span>
        </div>
        {hasBrandOS && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9494A8]">
            <span className="text-[#9494A8]">Contexto ativo:</span>
            {brandProfile.base.niche && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white">
                {brandProfile.base.niche}
                {brandProfile.base.subniche ? ` • ${brandProfile.base.subniche}` : ''}
              </span>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {modules.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.num}
                onClick={() => navigate(m.path)}
                className="group p-4 rounded-2xl bg-[#14141C] hover:bg-[#1C1C27] border border-white/5 hover:border-[#7C5CFC]/40 transition-all text-left flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: `${m.color}1a`,
                      color: m.color,
                      border: `1px solid ${m.color}33`,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-[#9494A8]">M{m.num}</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-[#7C5CFC] transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-[10px] text-[#9494A8] mt-0.5 line-clamp-2">{m.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. Recent Projects */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Projetos Recentes</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-[#9494A8] font-medium">
              {projects.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projetos')}
            className="text-xs text-[#7C5CFC] hover:text-[#906BFC] hover:bg-[#7C5CFC]/10 gap-1"
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 3).map((proj) => (
            <div
              key={proj.id}
              onClick={() => {
                setActiveProjectId(proj.id)
                if (proj.type === 'carousel') navigate('/carrossel')
                else if (proj.type === 'post') navigate('/post')
                else navigate(`/editor/${proj.id}`)
              }}
              className="group rounded-2xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/40 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-lg"
            >
              <div className="relative aspect-video w-full bg-[#1C1C27] overflow-hidden">
                <img
                  src={proj.thumbnail}
                  alt={proj.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white">
                  {proj.type === 'reel' && <Video className="w-3 h-3 text-[#7C5CFC]" />}
                  {proj.type === 'youtube' && <Tv className="w-3 h-3 text-red-400" />}
                  {proj.type === 'carousel' && <Layers className="w-3 h-3 text-emerald-400" />}
                  {proj.type === 'post' && <FileImage className="w-3 h-3 text-amber-400" />}
                  <span>{proj.type}</span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#22D3EE]" />
                  <span>{proj.duration > 0 ? `${proj.duration}s` : 'Multi'}</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <span className="p-3 rounded-full bg-[#7C5CFC] text-white shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-1.5">
                <h4 className="text-sm font-bold text-white group-hover:text-[#7C5CFC] transition-colors truncate">
                  {proj.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-[#9494A8]">
                  <span>
                    {proj.aspectRatio} • {proj.resolution || '1080p'}
                  </span>
                  <span className="capitalize">{proj.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Featured Templates Carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
              Modelos em Destaque
            </h2>
            <p className="text-xs text-[#9494A8]">Estruturas validadas para viralizar nas redes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {featuredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleUseTemplate(template)}
              className="group relative rounded-2xl bg-[#14141C] border border-white/5 hover:border-[#22D3EE]/50 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-lg"
            >
              <div className="relative aspect-[4/5] w-full bg-[#1C1C27] overflow-hidden">
                <img
                  src={template.image}
                  alt={template.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B10] via-black/40 to-transparent" />

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/30 text-[10px] font-bold text-[#22D3EE] backdrop-blur-md">
                  {template.tag}
                </span>

                <div className="absolute bottom-3 left-3 right-3 space-y-1">
                  <span className="text-[10px] font-semibold text-[#9494A8] uppercase tracking-wider block">
                    {template.category} • {template.duration}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#22D3EE] transition-colors leading-tight">
                    {template.title}
                  </h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Statistics of the Week */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Desempenho & Estatísticas da Semana
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#14141C] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9494A8]">
              <span>Publicações Agendadas</span>
              <Calendar className="w-4 h-4 text-[#7C5CFC]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              {scheduledPosts.length}{' '}
              <span className="text-xs font-medium text-emerald-400 font-sans">+2 novas</span>
            </p>
            <p className="text-[11px] text-[#9494A8]">Instagram, TikTok e YouTube Shorts</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#14141C] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9494A8]">
              <span>Alcance Estimado por IA</span>
              <Eye className="w-4 h-4 text-[#22D3EE]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              105.1K <span className="text-xs font-medium text-emerald-400 font-sans">↑ 24%</span>
            </p>
            <p className="text-[11px] text-[#9494A8]">Baseado nas hashtags e horários de pico</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#14141C] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9494A8]">
              <span>Taxa de Engajamento Médio</span>
              <Heart className="w-4 h-4 text-pink-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              7.9% <span className="text-xs font-medium text-[#22D3EE] font-sans">Excelente</span>
            </p>
            <p className="text-[11px] text-[#9494A8]">Média dos últimos 14 vídeos postados</p>
          </div>
        </div>
      </section>

      {/* 6. Progresso dos Módulos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#7C5CFC]" />
            Progresso dos Módulos
          </h2>
          <span className="text-xs text-[#9494A8]">
            {hasBrandOS ? 'Calculado com base nos seus dados' : 'Pendente — configure o Brand OS'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {moduleProgress.map((m) => {
            const blocked = m.pct === 0 && !hasBrandOS
            const card = (
              <button
                key={m.num}
                onClick={() => navigate(m.path)}
                className="group p-4 rounded-2xl bg-[#14141C] hover:bg-[#1C1C27] border border-white/5 hover:border-[#7C5CFC]/40 transition-all text-left flex flex-col gap-2 w-full"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#9494A8]">M{m.num}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      m.pct === 100
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : m.pct > 0
                          ? 'bg-[#7C5CFC]/15 text-[#7C5CFC] border border-[#7C5CFC]/30'
                          : 'bg-white/5 text-[#9494A8] border border-white/10'
                    }`}
                  >
                    {m.pct}% completo
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-[#7C5CFC] transition-colors">
                  {m.title}
                </h3>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#9494A8] line-clamp-1">{m.hint}</p>
              </button>
            )
            return blocked ? (
              <Tooltip key={m.num}>
                <TooltipTrigger asChild>{card}</TooltipTrigger>
                <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                  Configure seu Brand OS primeiro
                </TooltipContent>
              </Tooltip>
            ) : (
              card
            )
          })}
        </div>
      </section>

      {/* 7. Gerações Recentes + Próximas Ações + Mini Calendário */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gerações Recentes */}
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#22D3EE]" />
            Gerações Recentes
          </h3>
          {recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Zap className="w-6 h-6 text-[#9494A8]/50 mb-2" />
              <p className="text-xs text-[#9494A8]">
                Nenhuma geração ainda. Use os módulos para gerar conteúdo com IA.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => {
                const mod = jobModule(job.kind)
                const label = kindLabel[job.kind] || job.kind
                return (
                  <button
                    key={job.id}
                    onClick={() => navigate(mod.path)}
                    className="w-full flex items-center gap-3 rounded-lg bg-[#0e0e15]/60 border border-white/5 hover:border-[#7C5CFC]/40 p-2.5 text-left transition-all"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : job.status === 'failed'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20'
                      }`}
                    >
                      {job.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : job.status === 'failed' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {label} <span className="text-[#9494A8] font-normal">• {mod.label}</span>
                      </p>
                      <p className="text-[10px] text-[#9494A8] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {relativeTime(job.createdAt)}
                        <span className="capitalize">• {job.status}</span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Próximas Ações */}
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[#7C5CFC]" />
            Próximas Ações
          </h3>
          {displayActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-xs text-emerald-300 font-medium">
                Tudo em dia! Nenhuma ação pendente detectada.
              </p>
              <p className="text-[10px] text-[#9494A8] mt-1">
                Continue criando e escalando seus conteúdos.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayActions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-3 rounded-lg bg-[#0e0e15]/60 border border-white/5 hover:border-[#7C5CFC]/40 p-2.5 text-left transition-all group"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20">
                    {a.icon}
                  </span>
                  <span className="text-xs text-slate-200 group-hover:text-white flex-1 line-clamp-2">
                    {a.text}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9494A8] shrink-0 group-hover:text-[#7C5CFC]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mini Calendário */}
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#22D3EE]" />
              Próximos 7 dias
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/agendamento')}
              className="h-6 text-[11px] text-[#22D3EE] hover:bg-[#22D3EE]/10 px-2 gap-1"
            >
              Ver agenda <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {next7.map((d, i) => {
              const hasEvents = dayHasEvents(d)
              const isToday = i === 0
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 border ${
                    isToday
                      ? 'bg-[#7C5CFC]/15 border-[#7C5CFC]/40'
                      : 'bg-[#0e0e15]/60 border-white/5'
                  }`}
                >
                  <span className="text-[9px] uppercase text-[#9494A8]">{weekdayShort(d)}</span>
                  <span
                    className={`text-xs font-bold ${isToday ? 'text-[#7C5CFC]' : 'text-white'}`}
                  >
                    {d.getDate()}
                  </span>
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      hasEvents ? 'bg-[#22D3EE]' : 'bg-transparent'
                    }`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#9494A8] pt-1">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE]" /> conteúdo agendado
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/academy')}
              className="h-6 text-[11px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-2 gap-1 ml-auto"
            >
              Academy ({academyCompleted} concluídas) <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer info */}
      <footer className="pt-8 pb-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9494A8] gap-4">
        <div>
          <span className="font-semibold text-white">LUMEN Studio Pro</span> • Plataforma
          Inteligente de Gravação, Edição e Distribuição
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              toast.info('Termos de Uso LUMEN')
            }}
            className="hover:text-white"
          >
            Termos
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              toast.info('Política de Privacidade')
            }}
            className="hover:text-white"
          >
            Privacidade
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              toast.info('Suporte Técnico: suporte@lumenstudio.ai')
            }}
            className="hover:text-white"
          >
            Contato
          </a>
        </div>
      </footer>
    </div>
  )
}
