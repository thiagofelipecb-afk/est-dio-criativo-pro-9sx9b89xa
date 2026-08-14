import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
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
} from 'lucide-react'
import { toast } from 'sonner'

export default function Index() {
  const navigate = useNavigate()
  const { projects, scheduledPosts, setIsCreateModalOpen, createProject, setActiveProjectId } =
    useStudio()

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
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
