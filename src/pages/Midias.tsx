import React, { useState, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { MediaLibraryItem } from '@/types/library'

const STORAGE_KEY = 'lumen_media_library'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

function loadMedia(): MediaLibraryItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as MediaLibraryItem[]) : []
  } catch {
    return []
  }
}

function saveMedia(list: MediaLibraryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* quota */
  }
}

type FilterType = 'all' | 'image' | 'video'
type SortType = 'recent' | 'old' | 'name'

export default function Midias() {
  const [items, setItems] = useState<MediaLibraryItem[]>(() => loadMedia())
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('recent')
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState<MediaLibraryItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newItems: MediaLibraryItem[] = []
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
        const dataUrl = await fileToDataUrl(f)
        newItems.push({
          id: uid('media'),
          name: f.name,
          type: isImage ? 'image' : 'video',
          dataUrl,
          size: f.size,
          createdAt: new Date().toISOString(),
        })
      }
      if (newItems.length > 0) {
        setItems((prev) => {
          const next = [newItems[0], ...newItems.slice(1), ...prev]
          saveMedia(next)
          return next
        })
        toast.success(`${newItems.length} mídia(s) adicionada(s)`)
      }
    } catch {
      toast.error('Falha no upload')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDelete = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((m) => m.id !== id)
      saveMedia(next)
      return next
    })
    setDeleteId(null)
    toast.success('Mídia excluída')
  }

  const filtered = useMemo(() => {
    let list = items.filter((m) => {
      if (filter !== 'all' && m.type !== filter) return false
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'recent')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'old') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return a.name.localeCompare(b.name)
    })
    return list
  }, [items, filter, sort, search])

  const formatSize = (b: number) => {
    if (b < 1024) return `${b}B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
    return `${(b / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <FolderOpen className="w-7 h-7 text-[#7C5CFC]" /> Mídias
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Biblioteca de imagens e vídeos. Arraste arquivos ou clique para enviar.
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
          accept="image/jpeg,image/png,video/mp4,video/webm"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {uploading ? (
          <span className="text-xs text-[#22D3EE]">Enviando...</span>
        ) : (
          <div className="text-center">
            <Upload className="w-7 h-7 text-[#9494A8] mx-auto mb-2" />
            <p className="text-xs text-white font-semibold">
              Arraste arquivos ou clique para enviar
            </p>
            <p className="text-[10px] text-[#9494A8] mt-1">JPEG/PNG até 10MB · MP4/WebM até 50MB</p>
          </div>
        )}
      </div>

      {/* Filtros e ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'image', 'video'] as const).map((f) => (
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
              {f === 'all' ? 'Todos' : f === 'image' ? 'Imagens' : 'Vídeos'}
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
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9494A8] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-10 h-10 text-[#9494A8]/40 mx-auto mb-3" />
          <p className="text-sm text-[#9494A8]">Nenhuma mídia na biblioteca ainda.</p>
        </div>
      ) : (
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
                {item.type === 'image' ? (
                  <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <video src={item.dataUrl} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-[10px] text-white font-bold px-2 py-1 rounded bg-black/60">
                    Ampliar
                  </span>
                </div>
                <span className="absolute top-2 left-2 p-1 rounded bg-black/60">
                  {item.type === 'image' ? (
                    <ImageIcon className="w-3 h-3 text-white" />
                  ) : (
                    <Film className="w-3 h-3 text-white" />
                  )}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-[#9494A8]">{formatSize(item.size)}</p>
                </div>
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="p-1.5 rounded-lg text-[#9494A8] hover:text-red-400 hover:bg-red-500/10 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl bg-[#0B0B10] border-white/10 text-white rounded-2xl p-2">
          <DialogHeader className="px-3 pt-2">
            <DialogTitle className="text-xs text-white">{lightbox?.name}</DialogTitle>
          </DialogHeader>
          {lightbox?.type === 'image' ? (
            <img
              src={lightbox.dataUrl}
              alt={lightbox.name}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
          ) : (
            <video
              src={lightbox?.dataUrl}
              controls
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
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
    </div>
  )
}
