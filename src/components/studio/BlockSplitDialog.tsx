/* =============================================================================
   LUMEN Studio — BlockSplitDialog
   --------------------------------------------------------------------------
   Modal para dividir UM bloco em dois. Textarea editável com o texto do bloco;
   o usuário posiciona a quebra (linha em branco ou cursor). Ao confirmar,
   pergunta o que fazer com as mídias associadas:
     - Duplicar        → copia artes/B-roll para o novo bloco
     - Mover para novo → transfere tudo para o novo bloco, original fica vazio
     - Manter original → mantém tudo no bloco original
   ========================================================================== */
import React, { useEffect, useMemo, useState } from 'react'
import { Scissors, Copy, ArrowRight, Anchor, AlertTriangle, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScriptBlock } from '@/types/studio'
import { estimateDurationSeconds, formatDurationLabel } from '@/lib/script-split'

export type MediaSplitMode = 'duplicate' | 'move' | 'keep'

export interface BlockSplitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  block: ScriptBlock | null
  /** Número de mídias (artes + B-roll) associadas ao bloco. */
  mediaCount?: number
  onConfirm: (blockId: string, before: string, after: string, mode: MediaSplitMode) => void
}

export function BlockSplitDialog({
  open,
  onOpenChange,
  block,
  mediaCount = 0,
  onConfirm,
}: BlockSplitDialogProps) {
  const [text, setText] = useState('')
  // posição do cursor (índice) que marca a divisão.
  const [splitAt, setSplitAt] = useState<number>(0)
  const [mode, setMode] = useState<MediaSplitMode>('keep')
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (open && block) {
      setText(block.text)
      // por padrão, divide no meio do texto
      setSplitAt(Math.floor(block.text.length / 2))
      setMode('keep')
    }
  }, [open, block])

  const { before, after } = useMemo(() => {
    const safe = Math.max(0, Math.min(splitAt, text.length))
    return { before: text.slice(0, safe), after: text.slice(safe) }
  }, [text, splitAt])

  const beforeSec = estimateDurationSeconds(before)
  const afterSec = estimateDurationSeconds(after)

  const handleSelect = () => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    if (start != null && start > 0 && start < text.length) {
      setSplitAt(start)
    }
  }

  const handleConfirm = () => {
    if (!block) return
    if (!before.trim() || !after.trim()) {
      return
    }
    onConfirm(block.id, before.trim(), after.trim(), mode)
    onOpenChange(false)
  }

  if (!block) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#14141C] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="w-4 h-4 text-[#7C5CFC]" />
            Dividir bloco
          </DialogTitle>
        </DialogHeader>

        <p className="text-[11px] text-[#9494A8] -mt-1">
          Posicione o cursor onde deseja dividir e clique em <b>Marcar divisão</b>. O texto antes do
          cursor vira o bloco original; o resto vira um novo bloco logo abaixo.
        </p>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSplitAt(Math.min(splitAt, e.target.value.length))
          }}
          rows={7}
          className="w-full bg-[#0B0B10] border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed resize-none focus:outline-none focus:border-[#7C5CFC] font-mono"
        />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSelect}
            className="border-white/10 bg-[#1C1C27] text-xs"
          >
            <Anchor className="w-3.5 h-3.5" /> Marcar divisão no cursor
          </Button>
          <span className="text-[10px] text-[#9494A8]">
            divisão na posição <span className="font-mono text-white">{splitAt}</span>
          </span>
        </div>

        {/* Preview da divisão */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-[#1C1C27] p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-[#9494A8]">Original</span>
              <span className="text-[10px] font-mono text-[#22D3EE]">
                {formatDurationLabel(beforeSec)}
              </span>
            </div>
            <p className="text-[11px] text-white/80 leading-snug line-clamp-3 min-h-[2.5rem]">
              {before.trim() || <span className="text-[#9494A8]/50">vazio</span>}
            </p>
          </div>
          <div className="rounded-lg border border-[#7C5CFC]/30 bg-[#7C5CFC]/5 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-[#9494A8]">
                Novo bloco
              </span>
              <span className="text-[10px] font-mono text-[#7C5CFC]">
                {formatDurationLabel(afterSec)}
              </span>
            </div>
            <p className="text-[11px] text-white/80 leading-snug line-clamp-3 min-h-[2.5rem]">
              {after.trim() || <span className="text-[#9494A8]/50">vazio</span>}
            </p>
          </div>
        </div>

        {/* Mídias associadas */}
        {mediaCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Este bloco possui {mediaCount}{' '}
                {mediaCount === 1 ? 'mídia associada' : 'mídias associadas'}. O que fazer com elas?
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <ModeButton
                active={mode === 'duplicate'}
                onClick={() => setMode('duplicate')}
                icon={<Copy className="w-3.5 h-3.5" />}
                label="Duplicar"
                hint="Copia para o novo"
              />
              <ModeButton
                active={mode === 'move'}
                onClick={() => setMode('move')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                label="Mover"
                hint="Para o novo bloco"
              />
              <ModeButton
                active={mode === 'keep'}
                onClick={() => setMode('keep')}
                icon={<Anchor className="w-3.5 h-3.5" />}
                label="Manter"
                hint="No original"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-[#9494A8] hover:text-white"
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!before.trim() || !after.trim()}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white"
          >
            <Check className="w-4 h-4" /> Dividir bloco
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-[10px] font-semibold transition-all',
        active
          ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white'
          : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white',
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="text-[9px] font-normal opacity-70">{hint}</span>
    </button>
  )
}

export default BlockSplitDialog
