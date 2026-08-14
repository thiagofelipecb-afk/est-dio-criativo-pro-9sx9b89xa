import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStudio } from '@/context/StudioContext'
import {
  FolderOpen,
  Film,
  Music,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Plus,
  Upload,
} from 'lucide-react'

interface MediaLibraryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect?: (item: any) => void
  categoryFilter?: 'all' | 'video' | 'image' | 'audio'
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  categoryFilter = 'all',
}) => {
  const { mediaLibrary, addMediaItem, deleteMediaItem } = useStudio()
  const [filter, setFilter] = React.useState<'all' | 'video' | 'image' | 'audio'>(categoryFilter)
  const [uploadUrl, setUploadUrl] = React.useState('')
  const [uploadTitle, setUploadTitle] = React.useState('')
  const [uploadType, setUploadType] = React.useState<'video' | 'image' | 'audio'>('video')
  const [isAdding, setIsAdding] = React.useState(false)

  const filteredMedia = mediaLibrary.filter((m) => {
    if (filter === 'all') return true
    return m.type === filter
  })

  const handleAddSample = (type: 'video' | 'image' | 'audio') => {
    if (type === 'video') {
      addMediaItem({
        title: 'Clip de B-Roll Cinematográfico',
        type: 'video',
        url: 'https://img.usecurling.com/p/1080/1920?q=high+tech+workspace+neon&color=cyan',
        duration: 15,
        size: '22 MB',
        tags: ['cinematic', 'ia'],
        category: 'b-roll',
      })
    } else if (type === 'audio') {
      addMediaItem({
        title: 'Trilha Lo-Fi Chill',
        type: 'audio',
        url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
        duration: 90,
        size: '5.2 MB',
        tags: ['lofi', 'fundo'],
        category: 'music',
      })
    } else {
      addMediaItem({
        title: 'Overlay Abstrato Neon',
        type: 'image',
        url: 'https://img.usecurling.com/p/1080/1080?q=cyberpunk+grid+neon+glow',
        size: '1.2 MB',
        tags: ['overlay', 'neon'],
        category: 'upload',
      })
    }
  }

  const handleCustomUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTitle) return
    addMediaItem({
      title: uploadTitle,
      type: uploadType,
      url:
        uploadUrl ||
        (uploadType === 'video'
          ? 'https://img.usecurling.com/p/1080/1920?q=cinematic+technology'
          : uploadType === 'image'
            ? 'https://img.usecurling.com/p/1080/1080?q=creator+setup'
            : 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'),
      duration: uploadType === 'video' ? 30 : uploadType === 'audio' ? 120 : undefined,
      size: '15 MB',
      tags: ['importado'],
      category: 'upload',
    })
    setUploadTitle('')
    setUploadUrl('')
    setIsAdding(false)
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
                  Todas as suas gravações, trilhas de áudio, stickers e B-rolls disponíveis para
                  qualquer editor.
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAdding(!isAdding)}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" /> Importar Mídia
            </Button>
          </div>
        </DialogHeader>

        {isAdding && (
          <form
            onSubmit={handleCustomUpload}
            className="p-4 rounded-xl bg-[#1C1C27] border border-[#7C5CFC]/30 mt-2 space-y-3"
          >
            <h4 className="text-xs font-semibold text-[#22D3EE] uppercase tracking-wider">
              Adicionar Nova Mídia
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-[#9494A8]">Tipo</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="w-full mt-1 bg-[#14141C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-[#7C5CFC] outline-none"
                >
                  <option value="video">Vídeo</option>
                  <option value="image">Imagem</option>
                  <option value="audio">Áudio / Música</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] text-[#9494A8]">Título da Mídia</label>
                <input
                  type="text"
                  placeholder="Ex: Introdução Podcast 4K"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full mt-1 bg-[#14141C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-[#7C5CFC] outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="text-xs text-[#9494A8]"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs">
                Salvar na Biblioteca
              </Button>
            </div>
          </form>
        )}

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
          <div className="flex gap-2">
            <button
              onClick={() => handleAddSample('video')}
              className="text-[11px] text-[#22D3EE] hover:underline"
            >
              + B-Roll IA
            </button>
            <button
              onClick={() => handleAddSample('audio')}
              className="text-[11px] text-[#22D3EE] hover:underline"
            >
              + Trilha Sonora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1 py-1">
          {filteredMedia.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-[#9494A8] text-sm">
              Nenhuma mídia encontrada para este filtro.
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
                      src={item.url}
                      alt={item.title}
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

                  {item.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {Math.floor(item.duration / 60)}:
                      {(item.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-[#9494A8]">
                      {item.size || '10 MB'} • {item.category}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMediaItem(item.id)
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
