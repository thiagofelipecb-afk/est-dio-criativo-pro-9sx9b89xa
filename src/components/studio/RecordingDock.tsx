/* =============================================================================
   LUMEN Studio — RecordingDock (Módulo 5)
   Barra fixa na base da Gravadora com controles de gravação respeitando a
   máquina de estados `RecordingState`. Não grava por si só — recebe callbacks
   do pai (Gravadora) que detém o stream/MediaRecorder. Assim a lógica de
   gravação via canvas.captureStream() permanece intacta.

   Refinamentos:
   - Botão GRAVAR 1.5x maior que os demais, cor primária LUMEN (roxo). Vira
     vermelho pulsante com borda animada em `recording`. Em `countdown` mostra
     "3... 2... 1...".
   - Reiniciar take (ícone reset) visível em `saved` ou `error`, com confirmação.
   - Timer MM:SS em fonte mono, pisca a cada segundo durante `recording`.
   - Atalhos: R (gravar, só em camera-ready), Espaço (pausa/continua),
     Esc (finaliza). Registrados pela Gravadora.
   - Estados desabilitados com opacidade reduzida + cursor-not-allowed.
   ========================================================================== */

import React, { useState } from 'react'
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Circle,
  Square,
  Pause,
  Play,
  Flag,
  Activity,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  MoreHorizontal,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  type RecordingState,
  recordingStateLabel,
  recordingStateColor,
  formatTimer,
  dockButtonsEnabled,
} from '@/lib/studio-recording-logic'

export interface RecordingDockProps {
  state: RecordingState
  /** Segundos decorridos de gravação. */
  elapsed: number
  /** Câmera ligada (stream ativo). */
  cameraOn: boolean
  /** Microfone ligado. */
  micOn: boolean
  /** Nível de áudio 0-100 (para o medidor rápido). */
  micLevel: number
  /** Contagem regressiva selecionada: 3, 5 ou 0 (desligado). */
  countdown: 3 | 5 | 0
  /** Valor atual exibido na contagem regressiva (3,2,1) ou null. */
  countdownValue?: number | null
  /** Mensagem de erro (quando state === 'error'). */
  errorMessage?: string
  /** Nome do último take salvo (para toast/confirmação). */
  lastTakeName?: string
  // Callbacks
  onToggleCamera: () => void
  onToggleMic: () => void
  onTestAudio: () => void
  onCountdownChange: (v: 3 | 5 | 0) => void
  onRecord: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onMarker: () => void
  /** Reiniciar/descartar o take atual (visível em saved/error). */
  onResetTake?: () => void
}

const COLOR_MAP: Record<string, { dot: string; text: string; bg: string }> = {
  red: { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  emerald: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  violet: {
    dot: 'bg-violet-500',
    text: 'text-violet-300',
    bg: 'bg-violet-500/10 border-violet-500/30',
  },
  slate: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
}

export function RecordingDock(props: RecordingDockProps) {
  const {
    state,
    elapsed,
    cameraOn,
    micOn,
    micLevel,
    countdown,
    countdownValue,
    errorMessage,
    lastTakeName,
    onToggleCamera,
    onToggleMic,
    onTestAudio,
    onCountdownChange,
    onRecord,
    onPause,
    onResume,
    onStop,
    onMarker,
    onResetTake,
  } = props

  const [confirmReset, setConfirmReset] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const enabled = dockButtonsEnabled(state)
  const colorKey = recordingStateColor(state)
  const color = COLOR_MAP[colorKey] ?? COLOR_MAP.slate
  const isRec = state === 'recording'
  const isPaused = state === 'paused'
  const isProcessing = state === 'processing' || state === 'stopping'
  const isCountdown = state === 'countdown'
  const isSavedOrError = state === 'saved' || state === 'error'

  // Timer pisca a cada segundo durante recording (segundo par/ímpar).
  const blinkOn = isRec ? elapsed % 2 === 0 : true

  return (
    <div className="absolute bottom-0 inset-x-0 z-50 h-16 px-3 sm:px-4 flex items-center gap-2 bg-black/70 backdrop-blur-xl border-t border-white/5">
      {/* 1. Câmera toggle */}
      <DockIconButton
        label={cameraOn ? 'Desligar câmera' : 'Ligar câmera'}
        active={cameraOn}
        disabled={!enabled.cameraToggle}
        onClick={onToggleCamera}
        activeColor="emerald"
        inactiveColor="red"
        icon={cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
      />

      {/* 2. Mic toggle */}
      <DockIconButton
        label={micOn ? 'Desligar microfone' : 'Ligar microfone'}
        active={micOn}
        disabled={!enabled.micToggle}
        onClick={onToggleMic}
        activeColor="emerald"
        inactiveColor="red"
        icon={micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      />

      {/* 3. Testar áudio (md+) */}
      <button
        onClick={onTestAudio}
        disabled={!enabled.test}
        title="Testar áudio"
        aria-label="Testar áudio"
        className="hidden md:flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-[#1C1C27] border border-white/10 text-[#9494A8] hover:text-white hover:border-[#7C5CFC]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Activity className="w-4 h-4" />
        <span className="hidden md:inline text-[10px] font-semibold">Testar</span>
        {/* mini VU */}
        <span className="hidden md:flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all ${micLevel > i * 18 ? 'bg-emerald-400' : 'bg-white/15'}`}
              style={{ height: `${6 + i * 2}px` }}
            />
          ))}
        </span>
      </button>

      {/* 4. Separador (md+) */}
      <span className="hidden md:block w-px h-7 bg-white/10 mx-0.5" />

      {/* 5. Contagem regressiva (md+) */}
      <div className="hidden md:flex items-center bg-[#1C1C27] border border-white/10 rounded-lg h-9 overflow-hidden">
        {(
          [
            { v: 0, label: 'Off' },
            { v: 3, label: '3s' },
            { v: 5, label: '5s' },
          ] as { v: 3 | 5 | 0; label: string }[]
        ).map((opt) => (
          <button
            key={opt.v}
            onClick={() => onCountdownChange(opt.v)}
            disabled={!enabled.countdown}
            className={`px-2 h-full text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              countdown === opt.v ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8] hover:text-white'
            }`}
            title={`Contagem ${opt.label}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 6. GRAVAR / Retomar — 1.5x maior. No mobile o label some (só ícone +
          countdown), mantendo o botão compacto. */}
      {isPaused ? (
        <button
          onClick={onResume}
          disabled={!enabled.record}
          className="flex items-center gap-2 px-3 md:px-5 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Continuar gravação"
        >
          <Play className="w-4 h-4 fill-current" />
          <span className="hidden md:inline">Continuar</span>
        </button>
      ) : (
        <button
          onClick={onRecord}
          disabled={!enabled.record && !isCountdown}
          className={`relative flex items-center gap-2 px-3 md:px-6 h-12 rounded-xl text-white text-sm font-extrabold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isRec
              ? 'bg-red-600 hover:bg-red-500 animate-rec-pulse ring-2 ring-red-400/60 ring-offset-2 ring-offset-black/70'
              : isCountdown
                ? 'bg-violet-600 cursor-wait'
                : 'bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:scale-105'
          }`}
          title={isRec ? 'Gravando...' : isCountdown ? 'Contagem regressiva...' : 'Gravar take (R)'}
        >
          <Circle className="w-4 h-4 fill-current" />
          {isCountdown ? (
            `${countdownValue ?? '...'}`
          ) : (
            <span className="hidden md:inline">
              {isRec ? 'GRAVANDO' : state === 'saved' ? 'NOVO TAKE' : 'GRAVAR'}
            </span>
          )}
        </button>
      )}

      {/* Mobile (<900px): menu "..." com controles secundários (testar áudio,
          contagem regressiva, pausar, finalizar, reiniciar, marcador). Em
          telas maiores esses controles aparecem inline (md+). */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[#1C1C27] border border-white/10 text-[#9494A8] hover:text-white hover:border-[#7C5CFC]/50 transition-all"
            title="Mais controles"
            aria-label="Mais controles"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-64 p-2 bg-[#0E0E15] border-white/10 text-white rounded-xl"
        >
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9494A8]">
              Controles
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1 rounded text-[#9494A8] hover:text-white"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5 pt-1.5">
            {/* Testar áudio */}
            <button
              onClick={() => {
                onTestAudio()
              }}
              disabled={!enabled.test}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[11px] text-[#9494A8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Activity className="w-4 h-4" /> Testar áudio ({micLevel}%)
            </button>
            {/* Contagem regressiva */}
            <div className="flex items-center bg-[#1C1C27] border border-white/10 rounded-lg h-9 overflow-hidden">
              {(
                [
                  { v: 0, label: 'Off' },
                  { v: 3, label: '3s' },
                  { v: 5, label: '5s' },
                ] as { v: 3 | 5 | 0; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => onCountdownChange(opt.v)}
                  disabled={!enabled.countdown}
                  className={`flex-1 px-2 h-full text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    countdown === opt.v
                      ? 'bg-[#7C5CFC] text-white'
                      : 'text-[#9494A8] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Pausar (só durante gravação) */}
            {isRec && (
              <button
                onClick={() => {
                  onPause()
                  setMenuOpen(false)
                }}
                disabled={!enabled.pause}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition-all"
              >
                <Pause className="w-4 h-4" /> Pausar
              </button>
            )}
            {/* Finalizar (durante gravação ou pausa) */}
            {(isRec || isPaused) && (
              <button
                onClick={() => {
                  onStop()
                  setMenuOpen(false)
                }}
                disabled={!enabled.stop}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-white text-[11px] font-bold hover:border-red-500/50 hover:text-red-300 transition-all"
              >
                <Square className="w-4 h-4 fill-current" /> Finalizar
              </button>
            )}
            {/* Marcador (durante gravação) */}
            {isRec && (
              <button
                onClick={() => {
                  onMarker()
                  setMenuOpen(false)
                }}
                disabled={!enabled.marker}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[#22D3EE] text-[11px] font-bold hover:border-[#22D3EE]/50 transition-all"
              >
                <Flag className="w-3.5 h-3.5" /> Marcador
              </button>
            )}
            {/* Reiniciar take (visível em saved/error) */}
            {isSavedOrError && onResetTake && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setConfirmReset(true)
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[#9494A8] text-[11px] font-bold hover:border-amber-500/50 hover:text-amber-300 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* 7. Pausar (md+) */}
      {isRec && (
        <button
          onClick={onPause}
          disabled={!enabled.pause}
          className="hidden md:flex items-center gap-1.5 px-3 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition-all"
          title="Pausar gravação (Espaço)"
        >
          <Pause className="w-4 h-4" /> Pausar
        </button>
      )}

      {/* 8. Finalizar (md+) */}
      {(isRec || isPaused) && (
        <button
          onClick={onStop}
          disabled={!enabled.stop}
          className="hidden md:flex items-center gap-1.5 px-3 h-10 rounded-xl bg-[#1C1C27] border border-white/10 text-white text-[11px] font-bold hover:border-red-500/50 hover:text-red-300 transition-all"
          title="Finalizar gravação (Esc)"
        >
          <Square className="w-4 h-4 fill-current" /> Finalizar
        </button>
      )}

      {/* 9. Reiniciar take (md+) */}
      {isSavedOrError && onResetTake && (
        <button
          onClick={() => setConfirmReset(true)}
          className="hidden md:flex items-center gap-1.5 px-3 h-10 rounded-xl bg-[#1C1C27] border border-white/10 text-[#9494A8] text-[11px] font-bold hover:border-amber-500/50 hover:text-amber-300 transition-all"
          title="Reiniciar take"
        >
          <RotateCcw className="w-4 h-4" /> Reiniciar
        </button>
      )}

      {/* 10. Marcador (md+) */}
      {isRec && (
        <button
          onClick={onMarker}
          disabled={!enabled.marker}
          className="hidden md:flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-[#1C1C27] border border-white/10 text-[#22D3EE] text-[10px] font-bold hover:border-[#22D3EE]/50 transition-all"
          title="Adicionar marcador de tempo"
        >
          <Flag className="w-3.5 h-3.5" /> Marcador
        </button>
      )}

      {/* 11. Timer — fonte mono, pisca durante recording */}
      <div className="flex items-center gap-1.5 ml-auto px-3 h-9 rounded-lg bg-[#0B0B10] border border-white/10">
        <Timer className={`w-3.5 h-3.5 ${isRec ? 'text-red-400' : 'text-[#9494A8]'}`} />
        <span
          className={`text-sm font-mono font-bold tabular-nums transition-opacity ${
            isRec
              ? blinkOn
                ? 'text-red-400 opacity-100'
                : 'text-red-400 opacity-50'
              : isPaused
                ? 'text-amber-400'
                : 'text-white/80'
          }`}
        >
          {formatTimer(elapsed)}
        </span>
      </div>

      {/* Indicador de estado (md+) */}
      <div
        className={`hidden md:flex items-center gap-1.5 px-2.5 h-9 rounded-lg border ${color.bg}`}
      >
        {isProcessing ? (
          <Loader2 className={`w-3.5 h-3.5 animate-spin ${color.text}`} />
        ) : state === 'saved' ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : state === 'error' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${color.dot} ${isRec ? 'animate-pulse' : ''}`} />
        )}
        <span className={`text-[10px] font-bold ${color.text}`}>{recordingStateLabel(state)}</span>
      </div>

      {/* Erro / take salvo (tooltip inline curto) */}
      {state === 'error' && errorMessage && (
        <span
          className="hidden lg:block text-[10px] text-red-300 max-w-[200px] truncate"
          title={errorMessage}
        >
          {errorMessage}
        </span>
      )}
      {state === 'saved' && lastTakeName && (
        <span
          className="hidden lg:block text-[10px] text-emerald-300 max-w-[180px] truncate"
          title={lastTakeName}
        >
          {lastTakeName}
        </span>
      )}
      {/* Mobile: indicador compacto de estado (ponto colorido) */}
      <span
        className={`md:hidden w-2.5 h-2.5 rounded-full ${color.dot} ${isRec ? 'animate-pulse' : ''}`}
        title={recordingStateLabel(state)}
      />

      {/* Confirmação de reinício de take */}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="bg-[#0E0E15] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" /> Descartar este take?
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#9494A8]">
              O take atual será descartado e o estúdio voltará ao estado parado. Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[11px] font-semibold text-[#9494A8] hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setConfirmReset(false)
                onResetTake?.()
              }}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all"
            >
              Descartar take
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------- Botão de toggle do dock ---------- */
function DockIconButton({
  label,
  active,
  disabled,
  onClick,
  activeColor,
  inactiveColor,
  icon,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
  activeColor: 'emerald' | 'red'
  inactiveColor: 'emerald' | 'red'
  icon: React.ReactNode
}) {
  const colorClasses = active
    ? activeColor === 'emerald'
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : 'border-red-500/40 bg-red-500/15 text-red-300'
    : inactiveColor === 'red'
      ? 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
      : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#7C5CFC]/50 ${colorClasses}`}
    >
      {icon}
      <span
        className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0B0B10] ${
          active ? 'bg-emerald-400' : 'bg-red-500'
        }`}
      />
    </button>
  )
}

export default RecordingDock
