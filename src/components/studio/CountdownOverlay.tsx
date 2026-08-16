/* =============================================================================
   LUMEN Studio — CountdownOverlay (Módulo 7)
   Sobreposição fullscreen da contagem regressiva. Mostra "3", "2", "1" com
   animação scale+fade (CSS `animate-countdown-pop`) e, no último frame, uma
   bolinha vermelha de REC (●) por 500ms. Cancelável com Esc (callback onCancel).

   O beep (OscillatorNode 800Hz/1000Hz) é disparado pela Gravadora junto com
   cada mudança de `value` — este componente é puramente visual.
   ========================================================================== */

import { useEffect, useState } from 'react'

export interface CountdownOverlayProps {
  /** Valor atual da contagem (3, 2, 1) ou 0 (bolinha REC final) ou null (oculto). */
  value: number | null
  /** Callback chamado ao cancelar (Esc). */
  onCancel: () => void
}

export function CountdownOverlay({ value, onCancel }: CountdownOverlayProps) {
  const [visible, setVisible] = useState<number | null>(value)

  // Sincroniza com a prop e reinicia a animação a cada mudança de número.
  useEffect(() => {
    setVisible(value)
  }, [value])

  // Esc cancela a contagem.
  useEffect(() => {
    if (value === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onCancel])

  if (value === null) return null

  const isRecDot = visible === 0

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none"
      role="dialog"
      aria-label={`Contagem regressiva: ${isRecDot ? 'gravando' : value}`}
    >
      {isRecDot ? (
        <span
          key="rec-dot"
          className="flex items-center justify-center w-28 h-28 rounded-full bg-red-600 shadow-2xl shadow-red-600/50 animate-rec-dot-flash"
        >
          <span className="w-10 h-10 rounded-full bg-white/90" />
        </span>
      ) : (
        <span
          key={`num-${visible}`}
          className="text-9xl font-extrabold text-white animate-countdown-pop drop-shadow-[0_0_40px_rgba(124,92,252,0.5)]"
        >
          {visible}
        </span>
      )}
      <span className="absolute bottom-10 text-[10px] text-white/40 font-mono">
        Esc para cancelar
      </span>
    </div>
  )
}

export default CountdownOverlay
