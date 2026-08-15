import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  Instagram,
  Youtube,
  Flame,
  Clock,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Upload,
  Hash,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Post, PostPlatform, PostStatus } from '@/types/library'

const STORAGE_KEY = 'lumen_posts'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PLATFORM_META: Record<
  PostPlatform,
  { label: string; icon: typeof Instagram; color: string }
> = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
  tiktok: { label: 'TikTok', icon: Flame, color: 'text-[#22D3EE]' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-400' },
}

const STATUS_META: Record<PostStatus, { label: string; color: string; bg: string }> = {
  scheduled: {
    label: 'Agendado',
    color: 'text-[#7C5CFC]',
    bg: 'bg-[#7C5CFC]/20 border-[#7C5CFC]/30',
  },
  draft: { label: 'Rascunho', color: 'text-[#9494A8]', bg: 'bg-white/5 border-white/10' },
  published: {
    label: 'Publicado',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 border-emerald-500/30',
  },
  failed: { label: 'Falha', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
}

function loadPosts(): Post[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as Post[]) : []
  } catch {
    return []
  }
}

function savePosts(posts: Post[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
  } catch {
    /* quota */
  }
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} às ${d
    .getHours()
    .toString()
    .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function Agendamento() {
  const [posts, setPosts] = useState<Post[]>(() => loadPosts())
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [statusFilter, setStatusFilter] = useState<'all' | PostStatus>('all')
  const [platformFilter, setPlatformFilter] = useState<'all' | PostPlatform>('all')

  // Modal de criação/edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    caption: '',
    mediaUrls: [] as string[],
    platforms: ['instagram'] as PostPlatform[],
    scheduledAt: '',
    hashtags: [] as string[],
  })
  const [hashtagInput, setHashtagInput] = useState('')
  const [uploading, setUploading] = useState(false)

  // Persistência
  useEffect(() => {
    savePosts(posts)
  }, [posts])

  // Simulação de publicação ao carregar: posts scheduled com data passada → published
  useEffect(() => {
    const now = Date.now()
    const due = posts.filter(
      (p) => p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= now,
    )
    if (due.length === 0) return
    setPosts((prev) =>
      prev.map((p) =>
        due.some((d) => d.id === p.id)
          ? { ...p, status: 'published', updatedAt: new Date().toISOString() }
          : p,
      ),
    )
    due.forEach((p) => {
      const names = p.platforms.map((pl) => PLATFORM_META[pl].label).join('/')
      toast.success(`📢 Post publicado no ${names} (simulação)`, {
        description: p.title,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calendário
  const today = new Date()
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const days: { date: Date | null; posts: Post[] }[] = []
    for (let i = 0; i < startOffset; i++) days.push({ date: null, posts: [] })
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      const dayPosts = posts.filter(
        (p) =>
          new Date(p.scheduledAt).getDate() === d &&
          new Date(p.scheduledAt).getMonth() === month &&
          new Date(p.scheduledAt).getFullYear() === year,
      )
      days.push({ date, posts: dayPosts })
    }
    return days
  }, [viewMonth, posts])

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

  // Filtros da fila
  const filteredPosts = useMemo(() => {
    return posts
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false
        if (platformFilter !== 'all' && !p.platforms.includes(platformFilter)) return false
        return true
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [posts, statusFilter, platformFilter])

  // Handlers do modal
  const openCreate = () => {
    setEditingId(null)
    const d = new Date()
    d.setHours(d.getHours() + 2, 0, 0, 0)
    setForm({
      title: '',
      caption: '',
      mediaUrls: [],
      platforms: ['instagram'],
      scheduledAt: d.toISOString().slice(0, 16),
      hashtags: [],
    })
    setHashtagInput('')
    setIsModalOpen(true)
  }

  const openEdit = (post: Post) => {
    setEditingId(post.id)
    setForm({
      title: post.title,
      caption: post.caption,
      mediaUrls: [...post.mediaUrls],
      platforms: [...post.platforms],
      scheduledAt: new Date(post.scheduledAt).toISOString().slice(0, 16),
      hashtags: [...post.hashtags],
    })
    setHashtagInput('')
    setIsModalOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const isImage = f.type.startsWith('image/')
        const isVideo = f.type.startsWith('video/')
        if (isImage && f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name}: imagem acima de 10MB`)
          continue
        }
        if (isVideo && f.size > 50 * 1024 * 1024) {
          toast.error(`${f.name}: vídeo acima de 50MB`)
          continue
        }
        if (!isImage && !isVideo) {
          toast.error(`${f.name}: formato não suportado`)
          continue
        }
        urls.push(await fileToDataUrl(f))
      }
      setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, ...urls] }))
      toast.success(`${urls.length} mídia(s) adicionada(s)`)
    } catch {
      toast.error('Falha no upload')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeMedia = (idx: number) => {
    setForm((f) => ({ ...f, mediaUrls: f.mediaUrls.filter((_, i) => i !== idx) }))
  }

  const togglePlatform = (pl: PostPlatform) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(pl)
        ? f.platforms.filter((p) => p !== pl)
        : [...f.platforms, pl],
    }))
  }

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (!tag) return
    if (form.hashtags.includes(`#${tag}`)) {
      setHashtagInput('')
      return
    }
    setForm((f) => ({ ...f, hashtags: [...f.hashtags, `#${tag}`] }))
    setHashtagInput('')
  }

  const removeHashtag = (tag: string) => {
    setForm((f) => ({ ...f, hashtags: f.hashtags.filter((t) => t !== tag) }))
  }

  const handleHashtagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addHashtag()
    }
  }

  const handleSubmit = (status: PostStatus) => {
    if (!form.title.trim()) {
      toast.error('Informe um título')
      return
    }
    if (form.platforms.length === 0) {
      toast.error('Selecione ao menos uma plataforma')
      return
    }
    const now = new Date().toISOString()
    if (editingId) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                title: form.title,
                caption: form.caption,
                mediaUrls: form.mediaUrls,
                platforms: form.platforms,
                scheduledAt: new Date(form.scheduledAt).toISOString(),
                status,
                hashtags: form.hashtags,
                updatedAt: now,
              }
            : p,
        ),
      )
      toast.success('Postagem atualizada!')
    } else {
      const newPost: Post = {
        id: uid('post'),
        title: form.title,
        caption: form.caption,
        mediaUrls: form.mediaUrls,
        platforms: form.platforms,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        status,
        hashtags: form.hashtags,
        createdAt: now,
        updatedAt: now,
      }
      setPosts((prev) => [newPost, ...prev])
      toast.success(status === 'draft' ? 'Rascunho salvo!' : 'Postagem agendada!')
    }
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    toast.success('Postagem excluída')
  }

  const prevMonth = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])
  const nextMonth = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])

  const defaultThumb =
    'https://img.usecurling.com/p/600/600?q=social+media+post+purple&color=purple'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-[#7C5CFC]" />
            Agendamento de Postagens
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Programe suas publicações no Instagram, TikTok e YouTube. A publicação é simulada
            automaticamente ao chegar a data.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nova Postagem
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 p-3 rounded-2xl bg-[#14141C] border border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'scheduled', 'published', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s
                  ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
            >
              {s === 'all' ? 'Todas' : STATUS_META[s].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto border-t border-white/5 pt-2">
          <span className="text-[11px] text-[#9494A8] shrink-0">Plataforma:</span>
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              platformFilter === 'all'
                ? 'bg-white/10 text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            Todas
          </button>
          {(['instagram', 'tiktok', 'youtube'] as const).map((pl) => {
            const meta = PLATFORM_META[pl]
            const Icon = meta.icon
            return (
              <button
                key={pl}
                onClick={() => setPlatformFilter(pl)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  platformFilter === pl
                    ? 'bg-white/10 text-white'
                    : 'text-[#9494A8] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${meta.color}`} /> {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </h3>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] text-[#22D3EE] font-bold">
            {posts.filter((p) => p.status === 'scheduled').length} agendadas
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-[10px] text-[#9494A8] font-bold py-1">
              {d}
            </span>
          ))}
          {calendarDays.map((day, i) => {
            if (!day.date) return <div key={`empty-${i}`} className="h-20" />
            const isToday = isSameDay(day.date, today)
            return (
              <div
                key={i}
                className={`h-20 rounded-xl p-1 flex flex-col gap-1 border transition-all overflow-hidden ${
                  isToday
                    ? 'bg-[#7C5CFC]/15 border-[#7C5CFC] text-white'
                    : day.posts.length > 0
                      ? 'bg-[#1C1C27] border-white/15 text-white'
                      : 'bg-[#14141C] border-transparent text-[#9494A8]/60'
                }`}
              >
                <span className={`text-[10px] ${isToday ? 'font-bold text-[#7C5CFC]' : ''}`}>
                  {day.date.getDate()}
                </span>
                {day.posts.length > 0 && (
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {day.posts.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5 bg-black/40"
                        title={p.title}
                      >
                        <img
                          src={p.mediaUrls[0] || defaultThumb}
                          alt=""
                          className="w-5 h-5 rounded object-cover shrink-0"
                        />
                        <span className="text-[9px] text-white truncate">{p.title}</span>
                      </div>
                    ))}
                    {day.posts.length > 2 && (
                      <span className="text-[9px] text-[#22D3EE] px-1">
                        +{day.posts.length - 2}
                      </span>
                    )}
                    <span className="text-[9px] text-[#22D3EE] font-bold mt-auto">
                      {day.posts.length} post(s)
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fila / Inbox */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-[#22D3EE]" />
            Fila de Postagens
          </h3>
          <span className="text-xs text-[#9494A8]">{filteredPosts.length} postagens</span>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e0e15]/60 py-16 text-center">
            <CalendarIcon className="w-10 h-10 text-[#9494A8]/40 mx-auto mb-3" />
            <p className="text-sm text-[#9494A8]">Nenhuma postagem encontrada.</p>
            <Button
              onClick={openCreate}
              size="sm"
              className="mt-4 bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Criar primeira postagem
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const statusMeta = STATUS_META[post.status]
              return (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-20 h-20 rounded-xl bg-black/40 overflow-hidden shrink-0 border border-white/10">
                      <img
                        src={post.mediaUrls[0] || defaultThumb}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 flex gap-0.5">
                        {post.platforms.map((pl) => {
                          const Icon = PLATFORM_META[pl].icon
                          return (
                            <div key={pl} className="p-0.5 rounded bg-black/70 backdrop-blur-sm">
                              <Icon className={`w-3 h-3 ${PLATFORM_META[pl].color}`} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate max-w-xs">
                          {post.title}
                        </h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.color}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9494A8] line-clamp-1">
                        {post.caption || 'Sem legenda'}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-[#22D3EE] font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(post.scheduledAt)}
                        </span>
                      </div>
                      {post.hashtags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {post.hashtags.slice(0, 4).map((h) => (
                            <span
                              key={h}
                              className="text-[9px] text-[#7C5CFC] bg-[#7C5CFC]/10 px-1.5 py-0.5 rounded"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => openEdit(post)}
                      className="p-2 rounded-xl text-[#9494A8] hover:text-white hover:bg-white/5 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 rounded-xl text-[#9494A8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-[#14141C] border-white/10 text-white rounded-2xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC]">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {editingId ? 'Editar Postagem' : 'Nova Postagem'}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8]">
                  Configure mídia, legenda, plataformas e horário de publicação.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload de mídia */}
            <div>
              <label className="text-xs text-[#9494A8] block mb-1.5">Mídia (imagem ou vídeo)</label>
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-[#7C5CFC]/50 cursor-pointer transition-colors bg-[#1C1C27]/50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,video/mp4,video/webm"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <span className="text-xs text-[#22D3EE]">Enviando...</span>
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-[#9494A8] mx-auto mb-1" />
                    <span className="text-xs text-[#9494A8]">
                      Clique para enviar (JPEG/PNG até 10MB, MP4/WebM até 50MB)
                    </span>
                  </div>
                )}
              </label>
              {form.mediaUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {form.mediaUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute top-1 right-1 p-1 rounded bg-black/70 text-red-400 hover:bg-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Título */}
            <div>
              <label className="text-xs text-[#9494A8] block mb-1">Título</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: 5 Dicas para Viralizar no TikTok"
                className="bg-[#1C1C27] border-white/10 text-xs text-white"
              />
            </div>

            {/* Legenda */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#9494A8]">Legenda</label>
                <span
                  className={`text-[10px] ${form.caption.length > 2200 ? 'text-red-400' : 'text-[#9494A8]'}`}
                >
                  {form.caption.length}/2200
                </span>
              </div>
              <textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value.slice(0, 2200) })}
                rows={4}
                placeholder="Escreva a legenda da publicação..."
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none"
              />
            </div>

            {/* Plataformas */}
            <div>
              <label className="text-xs text-[#9494A8] block mb-1.5">Plataformas</label>
              <div className="flex items-center gap-4">
                {(['instagram', 'tiktok', 'youtube'] as const).map((pl) => {
                  const meta = PLATFORM_META[pl]
                  const Icon = meta.icon
                  const checked = form.platforms.includes(pl)
                  return (
                    <label
                      key={pl}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => togglePlatform(pl)} />
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <span className="text-xs text-white">{meta.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Data e hora */}
            <div>
              <label className="text-xs text-[#9494A8] block mb-1">Data e Hora</label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="bg-[#1C1C27] border-white/10 text-xs text-white"
              />
            </div>

            {/* Hashtags */}
            <div>
              <label className="text-xs text-[#9494A8] block mb-1">Hashtags</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9494A8]" />
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKey}
                    placeholder="Digite e pressione Enter"
                    className="bg-[#1C1C27] border-white/10 text-xs text-white pl-9"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addHashtag}
                  className="border-white/10 text-xs"
                >
                  Adicionar
                </Button>
              </div>
              {form.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-[11px] text-[#7C5CFC] bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 px-2 py-1 rounded-lg"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs text-[#9494A8]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit('draft')}
              className="border-white/10 text-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Salvar Rascunho
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit('scheduled')}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
