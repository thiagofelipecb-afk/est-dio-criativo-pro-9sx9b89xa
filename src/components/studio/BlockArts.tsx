import React, { useRef, useState } from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { useBlockArts, fileToDataUrl } from '@/hooks/use-block-media'
import { toast } from 'sonner'
import type { BlockArt } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   BlockArts — FASE 3.1
   Seção de artes (imagens) anexadas a um bloco de roteiro. Múltiplas artes,
   miniaturas em lista horizontal, adição via file picker, remoção com
   confirmação. Persiste em localStorage (key por bloco).
   ─────────────────────────────────────────────────────────────────────────── */

export interface BlockArtsProps {
  blockId: string
  /** Quando true, eventos de clique não propagam para o card pai. */
  stopPropagation?: boolean
}

export function BlockArts({ blockId, stopPropagation = true }: BlockArtsProps) {
  const { arts, addArt, removeArt } = useBlockArts(blockId)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const stop = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
  }

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter((f) => /image\/(jpeg|png)/.test(f.type))
    if (valid.length !== files.length) {
      toast.warning('Apenas JPEG e PNG são suportados.')
    }
    valid.forEach(async (f) => {
      try {
        const dataUrl = await fileToDataUrl(f)
        addArt(dataUrl, f.name)
      } catch {
        toast.error('Falha ao ler imagem.')
      }
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div onClick={stop} className="mt-2 rounded-lg border border-[#1E1E2A] bg-black/30 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <ImagePlus className="w-3 h-3 text-[#7C5CFC]" /> Artes do bloco
          {arts.length > 0 && (
            <span className="text-[8px] text-[#9494A8] font-normal normal-case">
              ({arts.length})
            </span>
          )}
        </span>
        <button
          onClick={(e) => {
            stop(e)
            fileRef.current?.click()
          }}
          className="flex items-center gap-1 text-[9px] bg-[#7C5CFC]/10 hover:bg-[#7C5CFC]/20 text-[#7C5CFC] px-1.5 py-0.5 rounded font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
        >
          <ImagePlus className="w-3 h-3" /> Adicionar arte
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={handlePick}
        />
      </div>

      {arts.length === 0 ? (
        <button
          onClick={(e) => {
            stop(e)
            fileRef.current?.click()
          }}
          className="w-full flex flex-col items-center justify-center gap-1 py-3 border border-dashed border-[#2A2A3A] rounded-md text-[#A78BFA]/50 hover:border-[#7C5CFC]/50 hover:text-[#A78BFA]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[9px]">Arraste ou clique para adicionar</span>
        </button>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {arts.map((art) => (
            <ArtThumb
              key={art.id}
              art={art}
              confirming={confirmRemoveId === art.id}
              onAskRemove={() => setConfirmRemoveId(art.id)}
              onCancelRemove={() => setConfirmRemoveId(null)}
              onConfirmRemove={() => {
                removeArt(art.id)
                setConfirmRemoveId(null)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ArtThumb({
  art,
  confirming,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}: {
  art: BlockArt
  confirming: boolean
  onAskRemove: () => void
  onCancelRemove: () => void
  onConfirmRemove: () => void
}) {
  return (
    <div className="relative group shrink-0">
      <img
        src={art.dataUrl}
        alt={art.name ?? 'arte'}
        className="w-12 h-12 object-cover rounded-md border border-white/10"
      />
      {confirming ? (
        <div className="absolute inset-0 bg-black/80 rounded-md flex flex-col items-center justify-center gap-0.5">
          <span className="text-[7px] text-red-300 text-center leading-tight">Remover?</span>
          <div className="flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onConfirmRemove()
              }}
              className="text-[7px] text-red-400 hover:bg-red-500/20 px-1 rounded font-bold"
            >
              Sim
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancelRemove()
              }}
              className="text-[7px] text-[#9494A8] hover:text-white px-1 rounded"
            >
              Não
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAskRemove()
          }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remover arte"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

export default BlockArts
