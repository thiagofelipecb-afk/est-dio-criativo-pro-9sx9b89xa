import React, { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FolderOpen,
  Upload,
  Trash2,
  Image as ImageIcon,
  Film,
  X,
  ChevronDown,
  Search,
  Music,
  Pencil,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMediaAssets } from '@/hooks/useMediaAssets'
import { formatBytes } from '@/services/mediaService'
import type { MediaAsset } from '@/types/studio'

type FilterType = 'all' | 'image' | 'video' | 'audio'
type SortType = 'recent' | 'old' | 'name' | 'size'
type ViewMode = 'grid' | 'list'

const ACCEPTED_ACCEPT =
  'image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg'

function formatDuration(ms?: number): string {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`
}

export default function Midias() {
  const { assets, addFromFile, removeAsset, update, loading, error } = useMediaAssets()

  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('recent')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('grid')
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    let ok = 0
    let fail = 0
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      try {
        await addFromFile(f)
        ok++
      } catch (e: any) {
        fail++
        toast.error(`${f.name}: ${e?.message || 'falha no upload'}`)
      }
    }
    if (ok > 0) toast.success(`${ok} mídia(s) adicionada(s)`)
    if (ok === 0 && fail === 0) toast.error('Nenhum arquivo válido.')
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = (id: string) => {
    removeAsset(id)
    setDeleteId(null)
    toast.success('Mídia excluída')
  }

  const handleRename = (id: string) => {
    const name = renameValue.trim()
    if (!name) {
      setRenameId(null)
      return
    }
    update(id, { name })
    setRenameId(null)
    toast.success('Mídia renomeada')
  }

  const filtered = useMemo(() => {
    let list = assets.filter((m) => {
      if (filter !== 'all' && m.type !== filter) return false
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'recent')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'old') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sort === 'size') return b.sizeBytes - a.sizeBytes
      return a.name.localeCompare(b.name)
    })
    return list
  }, [assets, filter, sort, search])

  const isDemo = (m: MediaAsset) => !!(m.metadata as any)?.demo

  const renderThumb = (m: MediaAsset, className = 'w-full h-full object-cover') => {
    const thumb = m.thumbnailUrl || m.publicUrl
    if (m.type === 'audio') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-[#1C1C27]">
          <Music className="w-8 h-8 text-emerald-400" />
        </div>
      )
    }
    if (m.type === 'video') {
      return (
        <>
          {thumb ? (
            <img src={thumb} alt={m.name} className={className} loading="lazy" />
          ) : (
            <video src={m.publicUrl} className={className} muted preload="metadata" />
          )}
        </>
      )
    }
    return <img src={thumb} alt={m.name} className={className} loading="lazy" />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <FolderOpen className="w-7 h-7 text-[#7C5CFC]" /> Mídias
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Biblioteca canônica de imagens, vídeos e áudios. Mesma fonte usada na Biblioteca,
            Gravadora e Editor.
          </p>
        </div>
      </div>

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
          isDragging
            ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
            : 'border-white/15 hover:border-[#7C5CFC]/50 bg-[#14141C]/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ACCEPT}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {uploading || loading ? (
          <span className="text-xs text-[#22D3EE] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Processando...
          </span>
        ) : (
          <div className="text-center">
            <Upload className="w-7 h-7 text-[#9494A8] mx-auto mb-2" />
            <p className="text-xs text-white font-semibold">
              Arraste arquivos ou clique para enviar
            </p>
            <p className="text-[10px] text-[#9494A8] mt-1">
              JPEG/PNG/WebP até 10MB · MP4/WebM até 100MB · MP3/WAV/OGG até 30MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200">{error}</p>
        </div>
      )}

      {/* Filtros e ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'image', 'video', 'audio'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === f
                  ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
            >
              {f === 'all' && <FolderOpen className="w-3.5 h-3.5" />}
              {f === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
              {f === 'video' && <Film className="w-3.5 h-3.5" />}
              {f === 'audio' && <Music className="w-3.5 h-3.5" />}
              {f === 'all'
                ? 'Todos'
                : f === 'image'
                  ? 'Imagens'
                  : f === 'video'
                    ? 'Vídeos'
                    : 'Áudios'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9494A8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-[#14141C] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] w-40"
            />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="appearance-none bg-[#14141C] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="recent">Mais recentes</option>
              <option value="old">Mais antigos</option>
              <option value="name">Nome A-Z</option>
              <option value="size">Tamanho</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9494A8] pointer-events-none" />
          </div>
          <div className="flex items-center gap-0.5 bg-[#14141C] border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md ${view === 'grid' ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8]'}`}
              title="Grade"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md ${view === 'list' ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8]'}`}
              title="Lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-10 h-10 text-[#9494A8]/40 mx-auto mb-3" />
          <p className="text-sm text-[#9494A8]">
            {assets.length === 0
              ? 'Nenhuma mídia na biblioteca ainda. Envie um arquivo acima.'
              : 'Nenhuma mídia corresponde aos filtros.'}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl bg-[#14141C] border border-white/10 hover:border-[#7C5CFC]/40 transition-all overflow-hidden"
            >
              <div
                className="relative aspect-square bg-black/40 cursor-pointer"
                onClick={() => setLightbox(item)}
              >
                {renderThumb(item)}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-[10px] text-white font-bold px-2 py-1 rounded bg-black/60">
                    Ampliar
                  </span>
                </div>
                <span className="absolute top-2 left-2 p-1 rounded bg-black/60">
                  {item.type === 'image' && <ImageIcon className="w-3 h-3 text-white" />}
                  {item.type === 'video' && <Film className="w-3 h-3 text-white" />}
                  {item.type === 'audio' && <Music className="w-3 h-3 text-white" />}
                </span>
                {isDemo(item) && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/80 text-[9px] font-bold text-black">
                    Demonstração
                  </span>
                )}
                {item.durationMs ? (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-white font-mono">
                    {formatDuration(item.durationMs)}
                  </span>
                ) : null}
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-[#9494A8]">
                    {formatBytes(item.sizeBytes)}
                    {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => {
                      setRenameId(item.id)
                      setRenameValue(item.name)
                    }}
                    className="p-1.5 rounded-lg text-[#9494A8] hover:text-[#22D3EE] hover:bg-[#22D3EE]/10"
                    title="Renomear"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-1.5 rounded-lg text-[#9494A8] hover:text-red-400 hover:bg-red-500/10"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#14141C] border border-white/10 overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2.5 border-b border-white/5 last:border-0 hover:bg-white/5"
            >
              <div
                className="w-14 h-14 rounded-lg overflow-hidden bg-black/40 cursor-pointer shrink-0"
                onClick={() => setLightbox(item)}
              >
                {renderThumb(item)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-semibold truncate">{item.name}</p>
                <p className="text-[10px] text-[#9494A8]">
                  {item.type} · {formatBytes(item.sizeBytes)}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                  {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ''}
                </p>
              </div>
              {isDemo(item) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-[9px] font-bold text-black">
                  Demonstração
                </span>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => {
                    setRenameId(item.id)
                    setRenameValue(item.name)
                  }}
                  className="p-1.5 rounded-lg text-[#9494A8] hover:text-[#22D3EE] hover:bg-[#22D3EE]/10"
                  title="Renomear"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="p-1.5 rounded-lg text-[#9494A8] hover:text-red-400 hover:bg-red-500/10"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / preview */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl bg-[#0B0B10] border-white/10 text-white rounded-2xl p-2">
          <DialogHeader className="px-3 pt-2">
            <DialogTitle className="text-xs text-white flex items-center gap-2">
              {lightbox?.name}
              {lightbox && isDemo(lightbox) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-[9px] font-bold text-black">
                  Demonstração
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {lightbox?.type === 'image' && (
            <img
              src={lightbox.publicUrl}
              alt={lightbox.name}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
          )}
          {lightbox?.type === 'video' && (
            <video
              src={lightbox.publicUrl}
              controls
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
          )}
          {lightbox?.type === 'audio' && (
            <div className="p-6 flex flex-col items-center gap-3">
              <Music className="w-12 h-12 text-emerald-400" />
              <audio src={lightbox.publicUrl} controls className="w-full" />
            </div>
          )}
          {lightbox && (
            <div className="px-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-[#9494A8]">
              <span>Tipo: {lightbox.type}</span>
              <span>Tamanho: {formatBytes(lightbox.sizeBytes)}</span>
              <span>Duração: {formatDuration(lightbox.durationMs)}</span>
              <span>
                Dimensões:{' '}
                {lightbox.width && lightbox.height ? `${lightbox.width}×${lightbox.height}` : '—'}
              </span>
              <span className="col-span-2">MIME: {lightbox.mimeType}</span>
              <span className="col-span-2">
                ID: <span className="font-mono">{lightbox.id}</span>
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm bg-[#14141C] border-white/10 text-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" /> Excluir mídia?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#9494A8]">
            Esta ação não pode ser desfeita. A mídia será removida permanentemente da biblioteca.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(null)} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600 text-white text-xs"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renomear */}
      <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
        <DialogContent className="max-w-sm bg-[#14141C] border-white/10 text-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#22D3EE]" /> Renomear mídia
            </DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameId) handleRename(renameId)
            }}
            className="w-full bg-[#0B0B10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRenameId(null)} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => renameId && handleRename(renameId)}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
