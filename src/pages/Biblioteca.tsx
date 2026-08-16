import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { useStudio } from '@/context/StudioContext'
import { useMediaAssets } from '@/hooks/useMediaAssets'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import { ModuleHeader, EmptyState, inputClass } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Library,
  Eye,
  Sparkles,
  ArrowRight,
  Trash2,
  Search,
  Film,
  Image as ImageIcon,
  Music,
  Shapes,
  LayoutTemplate,
  Clock,
  Type,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/types/studio'
import type { CapturedCreative } from '@/types/platform'
import { formatBytes } from '@/services/mediaService'

type Tab = 'Todos' | 'Midias' | 'Elementos' | 'Modelos' | 'Capturados'
type SortBy = 'data' | 'nome'

// ---------- Elementos (overlay, sticker, forma, texto decorativo) ----------
interface ElementoItem {
  id: string
  nome: string
  tipo: 'overlay' | 'sticker' | 'forma' | 'texto'
  cor: string
  createdAt: string
}

const DEFAULT_ELEMENTOS: ElementoItem[] = [
  {
    id: 'el-demo-1',
    nome: 'Overlay Neon Glow',
    tipo: 'overlay',
    cor: '#7C5CFC',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'el-demo-2',
    nome: 'Sticker Seta Destaque',
    tipo: 'sticker',
    cor: '#22D3EE',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

function useElementos() {
  const [elementos, setElementos] = useState<ElementoItem[]>(() => {
    try {
      const saved = localStorage.getItem('lumen_elementos')
      return saved ? JSON.parse(saved) : DEFAULT_ELEMENTOS
    } catch {
      return DEFAULT_ELEMENTOS
    }
  })
  useEffect(() => {
    localStorage.setItem('lumen_elementos', JSON.stringify(elementos))
  }, [elementos])
  return { elementos, setElementos }
}

// ---------- Modelos (templates) ----------
interface ModeloItem {
  id: string
  nome: string
  categoria: string
  formato: string
  thumbnail: string
  createdAt: string
  // se vier de um projeto real, guarda o id
  projectId?: string
}

const DEFAULT_MODELOS: ModeloItem[] = [
  {
    id: 'tmpl-reels-rapido',
    nome: 'Reels Rápido',
    categoria: 'Reels',
    formato: '9:16',
    thumbnail: 'https://img.usecurling.com/p/600/1066?q=fast+reels+vertical&color=purple',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'tmpl-tiktok-trend',
    nome: 'TikTok Trend',
    categoria: 'TikTok',
    formato: '9:16',
    thumbnail: 'https://img.usecurling.com/p/600/1066?q=tiktok+trend+neon&color=cyan',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tmpl-youtube-intro',
    nome: 'YouTube Intro',
    categoria: 'YouTube',
    formato: '16:9',
    thumbnail: 'https://img.usecurling.com/p/600/338?q=youtube+intro+studio&color=purple',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'tmpl-story-dia-a-dia',
    nome: 'Story Dia a Dia',
    categoria: 'Stories',
    formato: '9:16',
    thumbnail: 'https://img.usecurling.com/p/600/1066?q=daily+story+vertical&color=cyan',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
]

function useModelos(projects: Project[]) {
  const [extraModelos, setExtraModelos] = useState<ModeloItem[]>(() => {
    try {
      const saved = localStorage.getItem('lumen_templates')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    localStorage.setItem('lumen_templates', JSON.stringify(extraModelos))
  }, [extraModelos])

  // templates vindos de projetos marcados como template (se existirem)
  const fromProjects: ModeloItem[] = projects
    .filter((p) => (p as any).template === true)
    .map((p) => ({
      id: `proj-${p.id}`,
      nome: p.title,
      categoria: p.type,
      formato: p.aspectRatio,
      thumbnail: p.thumbnail,
      createdAt: p.createdAt,
      projectId: p.id,
    }))

  // Sempre inclui os 4 templates demo + extras + de projetos
  const modelos = useMemo(
    () => [...fromProjects, ...extraModelos, ...DEFAULT_MODELOS],
    [fromProjects, extraModelos],
  )
  return { modelos, setExtraModelos }
}

const elementoIcon: Record<ElementoItem['tipo'], React.ReactNode> = {
  overlay: <LayersSmall />,
  sticker: <Sparkles className="w-3.5 h-3.5" />,
  forma: <Shapes className="w-3.5 h-3.5" />,
  texto: <Type className="w-3.5 h-3.5" />,
}

function LayersSmall() {
  return <Shapes className="w-3.5 h-3.5" />
}

const mediaTypeIcon = (t: 'image' | 'video' | 'audio') => {
  if (t === 'video') return <Film className="w-3.5 h-3.5 text-[#7C5CFC]" />
  if (t === 'audio') return <Music className="w-3.5 h-3.5 text-emerald-400" />
  return <ImageIcon className="w-3.5 h-3.5 text-[#22D3EE]" />
}

const formatDurationMs = (ms?: number) => {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

export default function Biblioteca() {
  const { capturedCreatives, updateCapturedCreative, deleteCapturedCreative } = usePlatform()
  // PROMPT 2 — Mídias agora vêm da fonte canônica (useMediaAssets), a mesma
  // usada por /midias, Gravadora e Editor. Não usamos mais useStudio().mediaLibrary.
  const { assets: mediaAssets, removeAsset } = useMediaAssets()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()

  const { elementos } = useElementos()
  // usamos projects apenas para detectar templates; puxamos via StudioContext
  const { projects } = useStudio()
  const { modelos } = useModelos(projects)

  const [tab, setTab] = useState<Tab>('Todos')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('data')
  const [loading, setLoading] = useState(false)

  const counts = {
    Todos: mediaAssets.length + elementos.length + modelos.length + capturedCreatives.length,
    Midias: mediaAssets.length,
    Elementos: elementos.length,
    Modelos: modelos.length,
    Capturados: capturedCreatives.length,
  }

  // Filtragem por busca (nome/título) + ordenação
  const matchQuery = (text: string) =>
    !query.trim() || text.toLowerCase().includes(query.trim().toLowerCase())

  const sortItems = <T extends { nome?: string; title?: string; createdAt?: string }>(
    arr: T[],
  ): T[] => {
    const sorted = [...arr].sort((a, b) => {
      if (sortBy === 'nome') {
        const an = (a.nome || a.title || '').toLowerCase()
        const bn = (b.nome || b.title || '').toLowerCase()
        return an.localeCompare(bn)
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })
    return sorted
  }

  const filteredMedia = sortItems(
    mediaAssets.filter((m) => matchQuery(m.name)).map((m) => ({ ...m, title: m.name })),
  )
  const filteredElementos = sortItems(elementos.filter((e) => matchQuery(e.nome)))
  const filteredModelos = sortItems(modelos.filter((m) => matchQuery(m.nome)))
  const filteredCapturados = sortItems(
    capturedCreatives
      .filter((c) => matchQuery(c.caption))
      .map((c) => ({
        ...c,
        nome: c.caption,
        title: c.caption,
      })) as (CapturedCreative & { nome: string; title: string })[],
  )

  const analyze = async (id: string) => {
    setLoading(true)
    await generate('analise_biblioteca', () => {}, 1000)
    updateCapturedCreative(id, {
      analysis:
        'Análise estrutural: gancho → tensão → solução → prova → CTA. Padrão de alta performance. Adaptável ao seu nicho.',
    })
    setLoading(false)
    toast.success('Análise gerada!')
  }

  const showMedia = tab === 'Todos' || tab === 'Midias'
  const showElementos = tab === 'Todos' || tab === 'Elementos'
  const showModelos = tab === 'Todos' || tab === 'Modelos'
  const showCapturados = tab === 'Todos' || tab === 'Capturados'

  const isEmpty =
    filteredMedia.length === 0 &&
    filteredElementos.length === 0 &&
    filteredModelos.length === 0 &&
    filteredCapturados.length === 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Biblioteca"
        description="Acervo global unificado: mídias, elementos, modelos e criativos capturados. Busque, filtre e ordene em um só lugar."
        icon={<Library className="w-5 h-5" />}
        accent="#22D3EE"
      />

      {/* Filtros + busca + ordenação */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['Todos', 'Midias', 'Elementos', 'Modelos', 'Capturados'] as Tab[]).map((f) => (
            <button
              key={f}
              onClick={() => setTab(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === f ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              {f === 'Midias' ? 'Mídias' : f === 'Capturados' ? 'Capturados' : f} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9494A8]" />
            <input
              type="text"
              aria-label="Buscar na biblioteca"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou título…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-[#9494A8]">Ordenar:</span>
            <button
              onClick={() => setSortBy('data')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${sortBy === 'data' ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              Data
            </button>
            <button
              onClick={() => setSortBy('nome')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${sortBy === 'nome' ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              Nome
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Library className="w-6 h-6" />}
          title="Nada encontrado"
          description="Ajuste a busca ou capture criativos via extensão (Configurações). Mídias vêm do Estúdio Criativo, elementos e modelos já vêm prontos."
        />
      ) : (
        <div className="space-y-8">
          {/* Mídias */}
          {showMedia && filteredMedia.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-[#7C5CFC]" /> Mídias ({filteredMedia.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredMedia.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-[#14141C] border border-white/5 overflow-hidden hover:border-[#7C5CFC]/40 transition-all"
                  >
                    <div className="relative aspect-video bg-[#1C1C27] overflow-hidden">
                      {m.type === 'audio' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-[#1C1C27]">
                          <Music className="w-8 h-8 text-emerald-400" />
                        </div>
                      ) : (
                        <img
                          src={m.thumbnailUrl || m.publicUrl}
                          alt={m.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white flex items-center gap-1 capitalize">
                        {mediaTypeIcon(m.type)} {m.type}
                      </span>
                      {(m.metadata as any)?.demo && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-500/80 text-[9px] font-bold text-black">
                          Demonstração
                        </span>
                      )}
                      {m.durationMs != null && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-white flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {formatDurationMs(m.durationMs)}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                        <button
                          onClick={() => {
                            removeAsset(m.id)
                            toast.success('Mídia removida.')
                          }}
                          className="text-red-400 hover:bg-red-500/10 p-1 rounded shrink-0"
                          aria-label="Remover mídia"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#9494A8]">
                        <span>{formatBytes(m.sizeBytes)}</span>
                        <span>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Elementos */}
          {showElementos && filteredElementos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shapes className="w-4 h-4 text-[#22D3EE]" /> Elementos ({filteredElementos.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredElementos.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl bg-[#14141C] border border-white/5 p-3 space-y-2 hover:border-[#22D3EE]/40 transition-all"
                  >
                    <div
                      className="aspect-video rounded-lg flex items-center justify-center"
                      style={{ background: `${e.cor}1a`, border: `1px solid ${e.cor}40` }}
                    >
                      <span style={{ color: e.cor }}>{elementoIcon[e.tipo]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[9px] capitalize">
                        {e.tipo}
                      </Badge>
                      <span
                        className="h-3 w-3 rounded-full border border-white/20"
                        style={{ background: e.cor }}
                        title={e.cor}
                      />
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{e.nome}</p>
                    <p className="text-[10px] text-[#9494A8]">
                      {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Modelos */}
          {showModelos && filteredModelos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-[#7C5CFC]" /> Modelos (
                {filteredModelos.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredModelos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      toast.success(`Modelo "${m.nome}" selecionado.`)
                      navigate('/projetos')
                    }}
                    className="group rounded-xl bg-[#14141C] border border-white/5 overflow-hidden hover:border-[#7C5CFC]/40 transition-all text-left"
                  >
                    <div className="relative aspect-video bg-[#1C1C27] overflow-hidden">
                      <img
                        src={m.thumbnail}
                        alt={m.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white">
                        {m.categoria}
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-[#22D3EE]">
                        {m.formato}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-[#7C5CFC] transition-colors">
                        {m.nome}
                      </p>
                      <p className="text-[10px] text-[#9494A8]">
                        {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Criativos Capturados */}
          {showCapturados && filteredCapturados.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" /> Criativos Capturados (
                {filteredCapturados.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCapturados.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                        {c.source}
                      </Badge>
                      <button
                        onClick={() => {
                          deleteCapturedCreative(c.id)
                          toast.success('Removido.')
                        }}
                        className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                        aria-label="Remover criativo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-3">{c.caption}</p>
                    {c.transcript && (
                      <p className="text-[10px] text-[#9494A8] italic line-clamp-2">
                        Transcrição: {c.transcript}
                      </p>
                    )}
                    {c.analysis && (
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 text-[11px] text-emerald-300">
                        {c.analysis}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-[11px] h-7 gap-1"
                        onClick={() => analyze(c.id)}
                        disabled={loading}
                      >
                        <Eye className="w-3 h-3" /> {c.analysis ? 'Ver' : 'Analisar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-[11px] h-7 gap-1"
                        onClick={() => toast.success('Recriado!')}
                      >
                        <Sparkles className="w-3 h-3" /> Recriar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-[11px] h-7 gap-1"
                        onClick={() => toast.success('Adaptado ao seu nicho!')}
                      >
                        <ArrowRight className="w-3 h-3" /> Adaptar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// (helpers removidos — useNavigate importado diretamente do react-router-dom)
