import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { ScheduledPost, SocialPlatform } from '@/types/studio'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  Instagram,
  Youtube,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Hash,
  Flame,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Agendamento() {
  const navigate = useNavigate()
  const {
    scheduledPosts,
    schedulePost,
    updateScheduledPost,
    deleteScheduledPost,
    publishNowSimulated,
    projects,
  } = useStudio()

  // Platform Filter
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Create post modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postCaption, setPostCaption] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['instagram'])
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 4)
    return d.toISOString().slice(0, 16)
  })
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(
    'https://img.usecurling.com/p/600/1066?q=content+creator+studio&color=purple',
  )

  // Publishing simulation state
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const handleSimulatePublish = async (id: string) => {
    setPublishingId(id)
    toast.info('Simulando envio automático via API...', {
      description: 'Sincronizando vídeo, capa personalizada e legendas.',
    })

    await publishNowSimulated(id)
    setPublishingId(null)

    toast.success('Publicação realizada com sucesso!', {
      description: 'Vídeo distribuído para os canais selecionados.',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    })
  }

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postTitle.trim()) return

    schedulePost({
      title: postTitle,
      mediaUrl: selectedMediaUrl,
      mediaType: 'video',
      platforms: selectedPlatforms,
      scheduledDate: new Date(scheduledDate).toISOString(),
      caption: postCaption || 'Vídeo criado e publicado com LUMEN Studio AI 🚀',
      hashtags: ['#lumenstudio', '#reelsbrasil', '#marketingdigital', '#ia'],
      status: 'scheduled',
    })

    setIsCreateOpen(false)
    setPostTitle('')
    setPostCaption('')
    toast.success('Publicação agendada no calendário!', {
      description: 'A IA irá monitorar o melhor momento de entrega.',
    })
  }

  const handleSuggestBestTime = () => {
    const d = new Date()
    d.setHours(18, 30, 0, 0)
    if (d.getTime() < Date.now()) {
      d.setDate(d.getDate() + 1)
    }
    setScheduledDate(d.toISOString().slice(0, 16))
    toast.info('Horário de Pico Sugerido: 18:30 (Pico de Engajamento)')
  }

  const handleSuggestHashtags = () => {
    const suggested = ' #viral #foryou #conteudodigital #lumenstudio #dicasvideo #criatividade'
    setPostCaption((prev) => prev + suggested)
    toast.success('Hashtags virais inseridas na legenda!')
  }

  const filteredPosts = scheduledPosts.filter((p) => {
    if (platformFilter === 'all') return true
    return p.platforms.includes(platformFilter as any)
  })

  // Format date helper
  const formatPostDate = (iso: string) => {
    const d = new Date(iso)
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    return `${weekdays[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} às ${d
      .getHours()
      .toString()
      .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-[#7C5CFC]" />
            Agendamento & Calendário de Postagens
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Programe e automatize a distribuição de Reels, TikToks e Shorts no horário de maior
            engajamento.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Agendar Nova Publicação
        </Button>
      </div>

      {/* Platform Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#14141C] border border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              platformFilter === 'all'
                ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            Todas as Redes
          </button>
          <button
            onClick={() => setPlatformFilter('instagram')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              platformFilter === 'instagram'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Instagram className="w-3.5 h-3.5 text-pink-400" /> Instagram Reels
          </button>
          <button
            onClick={() => setPlatformFilter('tiktok')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              platformFilter === 'tiktok'
                ? 'bg-[#22D3EE] text-black shadow-md shadow-[#22D3EE]/30'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> TikTok
          </button>
          <button
            onClick={() => setPlatformFilter('youtube')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              platformFilter === 'youtube'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-400" /> YouTube Shorts
          </button>
        </div>

        <span className="text-xs text-[#9494A8]">
          Fila Ativa: <strong className="text-white">{filteredPosts.length} postagens</strong>
        </span>
      </div>

      {/* Main Grid: Calendar Mini Preview + Scheduled Inbox Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Monthly Calendar Grid Preview (5 cols) */}
        <div className="lg:col-span-5 bg-[#14141C] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#7C5CFC]" />
              Visão Mensal (Março 2025)
            </h3>
            <span className="text-[10px] text-[#22D3EE] font-bold">100% Sincronizado</span>
          </div>

          {/* Simulated Month Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <span key={d} className="text-[10px] text-[#9494A8] font-bold py-1">
                {d}
              </span>
            ))}

            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1
              const hasPost = dayNum === 12 || dayNum === 14 || dayNum === 18 || dayNum === 22
              const isToday = dayNum === 12

              return (
                <div
                  key={dayNum}
                  className={`h-12 rounded-xl p-1 flex flex-col justify-between border transition-all ${
                    isToday
                      ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white font-bold'
                      : hasPost
                        ? 'bg-[#1C1C27] border-white/15 text-white'
                        : 'bg-[#14141C] border-transparent text-[#9494A8]/60'
                  }`}
                >
                  <span className="text-[10px]">{dayNum}</span>
                  {hasPost && (
                    <div className="flex justify-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
                      {dayNum === 12 && <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#9494A8]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22D3EE]" /> Post Agendado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Publicado com Sucesso
            </span>
          </div>
        </div>

        {/* RIGHT: Scheduled Inbox Queue Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-[#22D3EE]" />
              Fila de Publicações (Inbox)
            </h3>
            <span className="text-xs text-[#9494A8]">Ordem cronológica</span>
          </div>

          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/30 transition-all shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                {/* Media Thumbnail + Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-16 h-20 rounded-xl bg-black/40 overflow-hidden shrink-0 border border-white/10">
                    <img
                      src={post.mediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 p-0.5 rounded bg-black/70 backdrop-blur-sm text-white">
                      {post.platforms.includes('instagram') && (
                        <Instagram className="w-3 h-3 text-pink-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs">
                        {post.title}
                      </h4>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          post.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30'
                        }`}
                      >
                        {post.status === 'published' ? 'Publicado' : 'Agendado'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#9494A8] line-clamp-1">{post.caption}</p>

                    <div className="flex items-center gap-3 text-[10px] text-[#22D3EE] font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatPostDate(post.scheduledDate)}
                      </span>
                      {post.analyticsEstimate && (
                        <span className="text-[#9494A8] hidden sm:inline">
                          ~{post.analyticsEstimate.views.toLocaleString()} views estimadas
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: Simulate Publish Button */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {post.status === 'scheduled' && (
                    <Button
                      size="sm"
                      onClick={() => handleSimulatePublish(post.id)}
                      disabled={publishingId === post.id}
                      className="bg-[#22D3EE] hover:bg-[#1CBAD1] text-black text-xs font-bold gap-1.5 shadow-md"
                    >
                      {publishingId === post.id ? (
                        <span>Publicando...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Publicar Agora
                        </>
                      )}
                    </Button>
                  )}

                  <button
                    onClick={() => {
                      deleteScheduledPost(post.id)
                      toast.success('Publicação removida da fila.')
                    }}
                    className="p-2 rounded-xl text-[#9494A8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Create Scheduled Post */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl bg-[#14141C] border-white/10 text-white rounded-2xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC]">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Agendar Nova Publicação</DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8]">
                  Vincule seu projeto, configure legendas com IA e escolha as redes de destino.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSchedule} className="space-y-3 pt-1">
            <div>
              <label className="text-xs text-[#9494A8] block mb-1">Título da Publicação</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Ex: 5 Dicas para Viralizar no TikTok"
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9494A8] block mb-1">Data e Hora de Envio</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[#9494A8] block mb-1">Otimização de Horário</label>
                <button
                  type="button"
                  onClick={handleSuggestBestTime}
                  className="w-full py-2 px-3 rounded-xl bg-[#7C5CFC]/15 hover:bg-[#7C5CFC]/25 border border-[#7C5CFC]/30 text-xs font-semibold text-[#22D3EE] flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Melhor Horário IA
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#9494A8]">Legenda do Post</label>
                <button
                  type="button"
                  onClick={handleSuggestHashtags}
                  className="text-[11px] text-[#22D3EE] hover:underline flex items-center gap-1"
                >
                  <Hash className="w-3 h-3" /> Sugerir Hashtags Virais
                </button>
              </div>
              <textarea
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                rows={3}
                placeholder="Escreva a legenda que vai acompanhar seu vídeo ou carrossel..."
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs text-[#9494A8]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold"
              >
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
