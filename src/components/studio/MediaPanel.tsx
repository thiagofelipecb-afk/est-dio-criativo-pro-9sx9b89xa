import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Upload, Search, Trash2, Plus, Film, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { assetManager } from '@/lib/asset-manager'
import { useStudio } from '@/context/StudioContext'
import {
  EditorMediaItem,
  editorKey,
  loadEditorState,
  saveEditorState,
} from '@/components/studio/editor-types'

interface MediaPanelProps {
  projectId: string
}

export function MediaPanel({ projectId }: MediaPanelProps) {
  const { scriptBlocks, mediaLibrary, addMediaItem } = useStudio()
  const storageKey = editorKey(projectId, 'media')

  const [items, setItems] = useState<EditorMediaItem[]>(() =>
    loadEditorState<EditorMediaItem[]>(projectId, 'media', []),
  )
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [brollByBlock, setBrollByBlock] = useState<Record<string, string>>(() =>
    loadEditorState<Record<string, string>>(projectId, 'broll_by_block', {}),
  )
  const fileRef = useRef<HTMLInputElement | null>(null)

  const persist = useCallback(
    (next: EditorMediaItem[]) => {
      setItems(next)
      saveEditorState(projectId, 'media', next)
    },
    [projectId],
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newItems: EditorMediaItem[] = []
    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      if (!isVideo && !isImage) continue
      try {
        const asset = await assetManager.addAsset(file, 'upload', {
          type: isVideo ? 'video' : 'image',
        })
        const url = asset.objectUrl || asset.dataUrl || URL.createObjectURL(file)
        newItems.push({
          id: 'med-' + Math.random().toString(36).slice(2, 9),
          name: file.name,
          type: isVideo ? 'video' : 'image',
          url,
          duration: undefined,
          scale: 1,
          x: 0.5,
          y: 0.5,
          opacity: 100,
          timelineDuration: 5,
          z: 1,
        })
      } catch {
        toast.error(`Falha ao importar ${file.name}.`)
      }
    }
    persist([...items, ...newItems])
    if (newItems.length > 0) toast.success(`${newItems.length} mídia(s) importada(s).`)
    e.target.value = ''
  }

  const handleAddToTimeline = (item: EditorMediaItem) => {
    toast.success(`"${item.name}" adicionada à timeline.`)
    // Dispara evento para o editor capturar (opcional — overlay visual).
    window.dispatchEvent(new CustomEvent('lumen-editor-add-media', { detail: { item, projectId } }))
  }

  const handleRemove = (id: string) => {
    persist(items.filter((i) => i.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  )

  const updateSelected = (patch: Partial<EditorMediaItem>) => {
    if (!selected) return
    persist(items.map((i) => (i.id === selected.id ? { ...i, ...patch } : i)))
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    return items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  }, [items, search])

  const setBlockMedia = (blockId: string, mediaId: string) => {
    const next = { ...brollByBlock, [blockId]: mediaId }
    setBrollByBlock(next)
    saveEditorState(projectId, 'broll_by_block', next)
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="w-full h-8 text-[11px] bg-[#7C5CFC] hover:bg-[#6A48E0] gap-1"
      >
        <Upload className="w-3.5 h-3.5" /> Importar imagem/vídeo
      </Button>

      <div className="relative">
        <Search className="w-3 h-3 text-[#9494A8] absolute left-2 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar mídias..."
          className="w-full bg-[#1C1C27] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-white focus:outline-none"
        />
      </div>

      {/* Biblioteca */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white">Biblioteca ({filtered.length})</h4>
        {filtered.length === 0 ? (
          <p className="text-[11px] text-[#9494A8]">Nenhuma mídia importada. Use o botão acima.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`rounded-lg border overflow-hidden cursor-pointer transition-colors ${selectedId === item.id ? 'border-[#7C5CFC]' : 'border-white/5 hover:border-white/20'}`}
              >
                <div className="aspect-video bg-[#0B0B10] flex items-center justify-center">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-1.5 flex items-center justify-between gap-1">
                  <span className="text-[9px] text-white truncate flex items-center gap-1">
                    {item.type === 'video' ? (
                      <Film className="w-2.5 h-2.5 text-pink-400" />
                    ) : (
                      <ImageIcon className="w-2.5 h-2.5 text-cyan-400" />
                    )}
                    {item.name}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToTimeline(item)
                      }}
                      className="p-1 text-[#22D3EE] hover:bg-[#22D3EE]/10 rounded"
                      title="Adicionar à timeline"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(item.id)
                      }}
                      className="p-1 text-[#9494A8] hover:text-red-400 rounded"
                      title="Remover"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Propriedades da mídia selecionada */}
      {selected && (
        <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2">
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
            {selected.name}
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Escala</span>
              <span className="font-mono">{selected.scale.toFixed(2)}</span>
            </div>
            <Slider
              value={[Math.round(selected.scale * 100)]}
              min={10}
              max={200}
              step={5}
              onValueChange={(v) => updateSelected({ scale: v[0] / 100 })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-[#9494A8]">
                <span>X</span>
                <span className="font-mono">{selected.x.toFixed(2)}</span>
              </div>
              <Slider
                value={[Math.round(selected.x * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => updateSelected({ x: v[0] / 100 })}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-[#9494A8]">
                <span>Y</span>
                <span className="font-mono">{selected.y.toFixed(2)}</span>
              </div>
              <Slider
                value={[Math.round(selected.y * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => updateSelected({ y: v[0] / 100 })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Opacidade</span>
              <span className="font-mono">{selected.opacity}%</span>
            </div>
            <Slider
              value={[selected.opacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => updateSelected({ opacity: v[0] })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-[#9494A8]">Duração (s)</label>
              <input
                type="number"
                min={0.1}
                step={0.5}
                value={selected.timelineDuration}
                onChange={(e) => updateSelected({ timelineDuration: Number(e.target.value) || 1 })}
                className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-[#9494A8]">Camada (z)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={selected.z}
                onChange={(e) => updateSelected({ z: Number(e.target.value) || 0 })}
                className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRemove(selected.id)}
            className="w-full h-7 text-[10px] border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
          >
            <Trash2 className="w-3 h-3" /> Remover mídia
          </Button>
        </div>
      )}

      {/* B-roll por bloco */}
      {scriptBlocks.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2">
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">
            B-roll por bloco
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {scriptBlocks.map((block, idx) => (
              <div key={block.id} className="flex items-center gap-2">
                <span
                  className="text-[10px] text-[#9494A8] shrink-0 w-16 truncate"
                  title={block.text}
                >
                  Bloco {idx + 1}
                </span>
                <select
                  value={brollByBlock[block.id] || ''}
                  onChange={(e) => setBlockMedia(block.id, e.target.value)}
                  className="flex-1 bg-[#14141C] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                >
                  <option value="">— Nenhuma —</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MediaPanel
