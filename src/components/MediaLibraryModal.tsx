import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMediaAssets } from '@/hooks/useMediaAssets'
import { formatBytes } from '@/services/mediaService'
import { FolderOpen, Film, Music, Image as ImageIcon, Trash2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MediaLibraryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect?: (item: any) => void
  categoryFilter?: 'all' | 'video' | 'image' | 'audio'
}

const ACCEPTED_ACCEPT =
  'image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg'

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  categoryFilter = 'all',
}) => {
  // PROMPT 2 — fonte canônica única (lumen_media_assets).
  const { assets, addFromFile, removeAsset, loading } = useMediaAssets()
  const [filter, setFilter] = React.useState<'all' | 'video' | 'image' | 'audio'>(categoryFilter)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const filteredMedia = assets.filter((m) => {
    if (filter === 'all') return true
    return m.type === filter
  })

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    let ok = 0
    for (let i = 0; i < files.length; i++) {
      try {
        await addFromFile(files[i])
        ok++
      } catch (e: any) {
        toast.error(`${files[i].name}: ${e?.message || 'falha'}`)
      }
    }
    if (ok > 0) toast.success(`${ok} mídia(s) adicionada(s)`)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return null
    const s = Math.round(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#14141C]/95 border-white/10 backdrop-blur-2xl text-white p-6 shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30">
                <FolderOpen className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Biblioteca de Mídias Compartilhada
                </DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8]">
                  Mesma fonte usada em /midias, /biblioteca, Gravadora e Editor.
                </DialogDescription>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_ACCEPT}
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs gap-1.5"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}{' '}
              Enviar Arquivo
            </Button>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between border-b border-white/10 pb-2 mt-2">
          <div className="flex gap-2">
            {(['all', 'video', 'image', 'audio'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === t
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#9494A8] hover:text-white bg-white/5'
                }`}
              >
                {t === 'all' && 'Tudo'}
                {t === 'video' && 'Vídeos'}
                {t === 'image' && 'Imagens'}
                {t === 'audio' && 'Áudios'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1 py-1">
          {filteredMedia.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-[#9494A8] text-sm">
              Nenhuma mídia encontrada. Envie um arquivo para começar.
            </div>
          ) : (
            filteredMedia.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-[#1C1C27] border border-white/5 hover:border-[#7C5CFC]/50 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  if (onSelect) {
                    onSelect(item)
                    onOpenChange(false)
                  }
                }}
              >
                <div className="relative h-28 w-full bg-black/40 overflow-hidden">
                  {item.type === 'video' || item.type === 'image' ? (
                    <img
                      src={item.thumbnailUrl || item.publicUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-950/40 to-[#14141C] text-[#7C5CFC]">
                      <Music className="w-8 h-8 animate-pulse" />
                      <span className="text-[10px] text-[#9494A8] mt-1">Trilha Áudio</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white uppercase flex items-center gap-1">
                    {item.type === 'video' && <Film className="w-3 h-3 text-cyan-400" />}
                    {item.type === 'image' && <ImageIcon className="w-3 h-3 text-amber-400" />}
                    {item.type === 'audio' && <Music className="w-3 h-3 text-purple-400" />}
                    {item.type}
                  </div>

                  {(item.metadata as any)?.demo && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/80 text-[9px] font-bold text-black">
                      Demo
                    </span>
                  )}

                  {item.durationMs && formatDuration(item.durationMs) && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {formatDuration(item.durationMs)}
                    </span>
                  )}
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-[#9494A8]">
                      {formatBytes(item.sizeBytes)} • {item.source}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeAsset(item.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all"
                    title="Excluir Mídia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
