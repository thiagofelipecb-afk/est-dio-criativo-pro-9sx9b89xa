/* =============================================================================
   LUMEN Studio — PreFlightCheck (Módulo 6)
   Modal/overlay rápido exibido antes de iniciar a gravação. Avalia câmera,
   microfone, compositor, layout, roteiro, teleprompter, fundo, efeitos e
   mídia do bloco. Só BLOQUEIA por: câmera sem stream, microfone sem stream,
   compositor indisponível. Itens não-bloqueantes podem ser ignorados com
   "Iniciar mesmo assim".
   ========================================================================== */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Wrench } from 'lucide-react'
import {
  evaluatePreFlight,
  hasBlockingItems,
  countByStatus,
  type PreFlightInput,
  type PreFlightItem,
} from '@/lib/studio-recording-logic'

export interface PreFlightCheckProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  input: PreFlightInput
  onContinue: () => void
  onFix?: (itemId: string) => void
}

const STATUS_ICON: Record<PreFlightItem['status'], React.ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  block: <XCircle className="w-4 h-4 text-red-400" />,
  pending: <Loader2 className="w-4 h-4 text-[#9494A8] animate-spin" />,
}

const STATUS_LABEL: Record<PreFlightItem['status'], string> = {
  ok: 'OK',
  warning: 'Aviso',
  block: 'Bloqueio',
  pending: 'Verificando',
}

export function PreFlightCheck({
  open,
  onOpenChange,
  input,
  onContinue,
  onFix,
}: PreFlightCheckProps) {
  const items = evaluatePreFlight(input)
  const counts = countByStatus(items)
  const blocked = hasBlockingItems(items)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0E0E15] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#7C5CFC]" />
            Checklist pré-gravação
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#9494A8]">
            Verificamos tudo antes de gravar. Itens em vermelho bloqueiam; em
            amarelo são apenas avisos.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
            {counts.ok} OK
          </span>
          {counts.warning > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
              {counts.warning} avisos
            </span>
          )}
          {counts.block > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 font-bold">
              {counts.block} bloqueios
            </span>
          )}
        </div>

        {/* Lista de itens */}
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-2 rounded-lg border p-2 ${
                item.status === 'block'
                  ? 'border-red-500/30 bg-red-500/5'
                  : item.status === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-white/5 bg-[#14141C]'
              }`}
            >
              <span className="mt-0.5 shrink-0">{STATUS_ICON[item.status]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-white">{item.label}</span>
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      item.status === 'block'
                        ? 'text-red-300'
                        : item.status === 'warning'
                          ? 'text-amber-300'
                          : 'text-[#9494A8]'
                    }`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.detail && (
                  <p className="text-[10px] text-[#9494A8] leading-relaxed mt-0.5">
                    {item.detail}
                  </p>
                )}
              </div>
              {item.status === 'block' && onFix && (
                <button
                  onClick={() => onFix(item.id)}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-[#7C5CFC]/20 text-[#A78BFA] text-[9px] font-bold hover:bg-[#7C5CFC]/30 transition-all"
                  title="Corrigir"
                >
                  <Wrench className="w-3 h-3" /> Corrigir
                </button>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[11px] font-semibold text-[#9494A8] hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onContinue}
            disabled={blocked}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${
              blocked
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white hover:scale-105'
            }`}
            title={blocked ? 'Resolva os bloqueios antes de iniciar' : 'Iniciar gravação'}
          >
            {blocked ? 'Resolver bloqueios' : 'Iniciar mesmo assim'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PreFlightCheck
