/* =============================================================================
   LUMEN Studio — SplitPreviewDialog
   --------------------------------------------------------------------------
   Modal de preview da divisão do roteiro em blocos. Mostra a lista de blocos
   que serão criados, seletor de preset no topo, aviso quando já existem
   blocos, contagem total e botões Aplicar/Cancelar.
   Usa `splitScriptIntoBlocks` (lib/script-split) — divisão determinística
   funcional conforme spec: quebra por `---`/`--`, parágrafos duplos, frases
   quando longo, respeitando máximo de palavras por preset.
   ========================================================================== */
import React, { useEffect, useMemo, useState } from 'react'
import { Scissors, AlertTriangle, Check, X, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  splitScriptIntoBlocks,
  SPLIT_PRESET_DEFS,
  formatDurationLabel,
  totalDurationSeconds,
  type SplitPresetId,
} from '@/lib/script-split'
import type { ScriptBlock } from '@/types/studio'

export interface SplitPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  text: string
  /** Número de blocos já existentes (para aviso de substituição). */
  existingBlockCount: number
  /** Preset inicial. */
  initialPreset?: SplitPresetId
  onApply: (blocks: ScriptBlock[], preset: SplitPresetId, customSeconds?: number) => void
}

export function SplitPreviewDialog({
  open,
  onOpenChange,
  text,
  existingBlockCount,
  initialPreset = 'medium',
  onApply,
}: SplitPreviewDialogProps) {
  const [preset, setPreset] = useState<SplitPresetId>(initialPreset)
  const [customSeconds, setCustomSeconds] = useState(30)

  useEffect(() => {
    if (open) setPreset(initialPreset)
  }, [open, initialPreset])

  const blocks = useMemo<ScriptBlock[]>(
    () => splitScriptIntoBlocks(text, preset, customSeconds),
    [text, preset, customSeconds],
  )

  const totalSeconds = totalDurationSeconds(blocks)

  const handleApply = () => {
    if (blocks.length === 0) return
    onApply(blocks, preset, preset === 'custom' ? customSeconds : undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#14141C] border-white/10 text-white max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="w-4 h-4 text-[#7C5CFC]" />
            Dividir roteiro em blocos
          </DialogTitle>
        </DialogHeader>

        {/* Seletor de preset */}
        <div className="space-y-2">
          <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">Preset</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {SPLIT_PRESET_DEFS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`text-[10px] py-1.5 px-2 rounded-lg border transition-all text-left ${
                  preset === p.id
                    ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white'
                    : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Segundos por bloco</span>
                <span className="font-mono">{customSeconds}s</span>
              </div>
              <Slider
                value={[customSeconds]}
                min={5}
                max={120}
                step={5}
                onValueChange={(v) => setCustomSeconds(v[0])}
              />
            </div>
          )}
        </div>

        {/* Aviso de substituição */}
        {existingBlockCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Isso substituirá seus {existingBlockCount}{' '}
              {existingBlockCount === 1 ? 'bloco atual' : 'blocos atuais'}.
            </span>
          </div>
        )}

        {/* Contagem */}
        <div className="flex items-center gap-3 text-[11px] text-[#9494A8]">
          <span className="font-semibold text-white">
            {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDurationLabel(totalSeconds)} total
          </span>
        </div>

        {/* Lista de blocos */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#9494A8]">
              Nenhum bloco a partir deste texto. Cole ou escreva um roteiro primeiro.
            </div>
          ) : (
            blocks.map((b, i) => (
              <div
                key={b.id}
                className="rounded-lg border border-white/5 bg-[#1C1C27] px-3 py-2 flex items-start gap-3"
              >
                <span className="shrink-0 w-6 h-6 rounded-md bg-white/5 text-[10px] font-bold flex items-center justify-center text-white/70">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/90 leading-snug line-clamp-2">
                    {b.text.slice(0, 80)}
                    {b.text.length > 80 ? '…' : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-[#9494A8] font-mono">
                  {formatDurationLabel(b.estimatedSeconds)}
                </span>
              </div>
            ))
          )}
        </div>

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
            onClick={handleApply}
            disabled={blocks.length === 0}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white"
          >
            <Check className="w-4 h-4" /> Aplicar ({blocks.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SplitPreviewDialog
