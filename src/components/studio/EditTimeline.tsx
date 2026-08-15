import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Play,
  Pause,
  Scissors,
  Trash2,
  Undo2,
  Redo2,
  SkipBack,
  SkipForward,
  Flag,
  Square,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TimelineState, TimelineSegment } from '@/types/studio'
import { extractWaveform, drawWaveform, syntheticWaveform, type WaveformData } from '@/lib/waveform'
import { computeEffectiveSegments, computeResultDuration } from '@/lib/exporter'

/* ===========================================================================
   EditTimeline — FASE 5
   Timeline não destrutiva do Modo Estúdio:
   - Waveform visual gerado via AudioContext
   - Cursor de reprodução que se move durante o play; clicar posiciona
   - Marcadores in (verde) e out (vermelho) arrastáveis; segmento destacado
   - Split (S) cria ponto de corte; Delete exclui segmento (não o vídeo bruto)
   - Desfazer/Refazer (Ctrl+Z / Ctrl+Shift+Z), histórico de 50 ações
   - Duração recalculada após cortes
   - Autosave a cada 5s sem alteração
   =========================================================================== */

interface EditTimelineProps {
  /** Estado da timeline (controlado). */
  state: TimelineState
  /** Callback para atualizar o estado (autosave/controle). */
  onChange: (state: TimelineState) => void
  /** Blob do vídeo bruto (para gerar o waveform). */
  rawBlob?: Blob | null
  /** URL do vídeo bruto (para carregar duração). */
  rawVideoUrl?: string
  /** Duração do vídeo bruto em segundos. */
  rawDuration: number
  /** Indica se está reproduzindo. */
  isPlaying: boolean
  /** Callback para alternar play/pause. */
  onTogglePlay: () => void
  /** Callback para buscar o vídeo bruto para um tempo. */
  onSeek: (time: number) => void
  /** Indicador de alterações não salvas (para antes de sair). */
  markDirty?: () => void
}

const HISTORY_LIMIT = 50
const AUTOSAVE_MS = 5000

function uid(): string {
  return 'seg-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)
}

function defaultTimeline(rawDuration: number): TimelineState {
  return {
    segments: [{ id: uid(), start: 0, end: rawDuration || 1, excluded: false, label: 'Principal' }],
    inPoint: 0,
    outPoint: rawDuration || 1,
    cursor: 0,
  }
}

export default function EditTimeline({
  state,
  onChange,
  rawBlob,
  rawVideoUrl,
  rawDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  markDirty,
}: EditTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [waveform, setWaveform] = useState<WaveformData | null>(null)
  const [waveformLoading, setWaveformLoading] = useState(false)
  const [draggingMarker, setDraggingMarker] = useState<'in' | 'out' | 'cursor' | null>(null)

  // Histórico de undo/redo (50 ações).
  const undoStack = useRef<TimelineState[]>([])
  const redoStack = useRef<TimelineState[]>([])
  const [historyTick, setHistoryTick] = useState(0) // força re-render dos botões

  const safeDuration = Math.max(0.1, rawDuration || 1)

  // Inicializa timeline se vier vazia ou inconsistente.
  useEffect(() => {
    if (!state || !state.segments || state.segments.length === 0 || (state.outPoint ?? 0) <= 0) {
      onChange(defaultTimeline(safeDuration))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeDuration])

  // Gera waveform a partir do blob do vídeo bruto.
  useEffect(() => {
    let cancelled = false
    async function gen() {
      if (!rawBlob) {
        setWaveform(syntheticWaveform(safeDuration, 400))
        return
      }
      setWaveformLoading(true)
      try {
        const data = await extractWaveform(rawBlob, 400)
        if (!cancelled) setWaveform(data)
      } catch {
        // Codec não suportado / sem áudio → fallback sintético.
        if (!cancelled) setWaveform(syntheticWaveform(safeDuration, 400))
      } finally {
        if (!cancelled) setWaveformLoading(false)
      }
    }
    gen()
    return () => {
      cancelled = true
    }
  }, [rawBlob, safeDuration])

  // Desenha o waveform no canvas.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveform) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    const inFrac = state.inPoint / safeDuration
    const outFrac = state.outPoint / safeDuration
    drawWaveform(ctx, waveform, rect.width, rect.height, '#7C5CFC', {
      inFraction: inFrac,
      outFraction: outFrac,
      dimColor: 'rgba(124, 92, 252, 0.2)',
    })
    // Segmentos excluídos ficam cinza.
    for (const seg of state.segments) {
      if (!seg.excluded) continue
      const x1 = (seg.start / safeDuration) * rect.width
      const x2 = (seg.end / safeDuration) * rect.width
      ctx.fillStyle = 'rgba(100, 100, 100, 0.35)'
      ctx.fillRect(x1, 0, Math.max(2, x2 - x1), rect.height)
    }
    // Divisores de corte.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    for (const seg of state.segments) {
      const x = (seg.end / safeDuration) * rect.width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
    }
  }, [waveform, state, safeDuration])

  // Autosave a cada 5s de inatividade.
  const lastChangeRef = useRef<number>(Date.now())
  useEffect(() => {
    lastChangeRef.current = Date.now()
    markDirty?.()
    const id = setInterval(() => {
      if (Date.now() - lastChangeRef.current >= AUTOSAVE_MS) {
        // Dispara o autosave via onChange (idempotente: estado já está no pai).
        onChange(state)
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  /* ── Histórico ────────────────────────────────────────────────────────── */
  const pushHistory = useCallback((prev: TimelineState) => {
    undoStack.current.push(prev)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []
    setHistoryTick((t) => t + 1)
  }, [])

  const commit = useCallback(
    (next: TimelineState) => {
      pushHistory(state)
      onChange(next)
    },
    [state, onChange, pushHistory],
  )

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) {
      toast.info('Nada para desfazer.')
      return
    }
    redoStack.current.push(state)
    onChange(prev)
    setHistoryTick((t) => t + 1)
  }, [state, onChange])

  const handleRedo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) {
      toast.info('Nada para refazer.')
      return
    }
    undoStack.current.push(state)
    onChange(next)
    setHistoryTick((t) => t + 1)
  }, [state, onChange])

  /* ── Operações de timeline ────────────────────────────────────────────── */
  const handleSplit = useCallback(() => {
    const cursor = state.cursor
    // Encontra segmento que contém o cursor (não excluído).
    const seg = state.segments.find(
      (s) => !s.excluded && cursor > s.start + 0.05 && cursor < s.end - 0.05,
    )
    if (!seg) {
      toast.warning('Posicione o cursor no meio de um segmento para dividir.')
      return
    }
    const left: TimelineSegment = { ...seg, end: cursor }
    const right: TimelineSegment = {
      id: uid(),
      start: cursor,
      end: seg.end,
      excluded: false,
      label: seg.label,
    }
    const nextSegments = state.segments
      .filter((s) => s.id !== seg.id)
      .concat([left, right])
      .sort((a, b) => a.start - b.start)
    commit({ ...state, segments: nextSegments })
    toast.success('Segmento dividido no cursor!')
  }, [state, commit])

  const handleDeleteSegmentAtCursor = useCallback(() => {
    const cursor = state.cursor
    const seg = state.segments.find((s) => !s.excluded && cursor >= s.start && cursor <= s.end)
    if (!seg) {
      toast.warning('Nenhum segmento ativo no cursor para excluir.')
      return
    }
    const nextSegments = state.segments.map((s) => (s.id === seg.id ? { ...s, excluded: true } : s))
    commit({ ...state, segments: nextSegments })
    toast.success('Segmento excluído (vídeo bruto preservado).')
  }, [state, commit])

  /* ── Seek por clique no waveform ──────────────────────────────────────── */
  const seekFromClientX = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
      const t = (x / rect.width) * safeDuration
      onChange({ ...state, cursor: t })
      onSeek(t)
    },
    [state, onChange, onSeek, safeDuration],
  )

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    seekFromClientX(e.clientX)
  }

  /* ── Arraste dos marcadores in/out ────────────────────────────────────── */
  const onMarkerMouseDown = (which: 'in' | 'out') => (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggingMarker(which)
  }

  useEffect(() => {
    if (!draggingMarker) return
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      const t = (x / rect.width) * safeDuration
      if (draggingMarker === 'in') {
        const inP = Math.min(t, state.outPoint - 0.1)
        onChange({ ...state, inPoint: Math.max(0, inP) })
      } else if (draggingMarker === 'out') {
        const outP = Math.max(t, state.inPoint + 0.1)
        onChange({ ...state, outPoint: Math.min(safeDuration, outP) })
      }
    }
    const onUp = () => setDraggingMarker(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingMarker, state, onChange, safeDuration])

  /* ── Atalhos de teclado: S (split), Delete (excluir), Ctrl+Z/Shift+Z ─── */
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
        return
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleSplit()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDeleteSegmentAtCursor()
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        onTogglePlay()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const t = Math.max(0, state.cursor - 5)
        onChange({ ...state, cursor: t })
        onSeek(t)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const t = Math.min(safeDuration, state.cursor + 5)
        onChange({ ...state, cursor: t })
        onSeek(t)
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    handleSplit,
    handleDeleteSegmentAtCursor,
    handleUndo,
    handleRedo,
    onTogglePlay,
    onChange,
    onSeek,
    state,
    safeDuration,
  ])

  void historyTick // re-render dos botões undo/redo
  void rawVideoUrl

  /* ── Derivados ────────────────────────────────────────────────────────── */
  const resultDuration = computeResultDuration(state, safeDuration)
  const effectiveSegs = computeEffectiveSegments(state, safeDuration)
  const cursorPct = (state.cursor / safeDuration) * 100
  const inPct = (state.inPoint / safeDuration) * 100
  const outPct = (state.outPoint / safeDuration) * 100

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="border-t border-white/10 bg-[#14141C] flex flex-col shrink-0">
      {/* Toolbar */}
      <div className="h-9 px-3 border-b border-white/5 flex items-center justify-between text-xs bg-[#171722]">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            className="h-7 px-2.5 text-xs text-white hover:bg-white/10 gap-1.5"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-[#22D3EE]" />
            ) : (
              <Play className="w-3.5 h-3.5 text-[#22D3EE]" />
            )}
            {isPlaying ? 'Pausar' : 'Reproduzir'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({ ...state, cursor: 0 })
              onSeek(0)
            }}
            className="h-7 px-2 text-xs text-[#9494A8] hover:text-white gap-1"
            title="Voltar ao início"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSplit}
            className="h-7 px-2.5 text-xs text-white hover:bg-white/10 gap-1.5"
            title="Dividir no cursor (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-[#7C5CFC]" /> Dividir (S)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSegmentAtCursor}
            className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 gap-1"
            title="Excluir segmento (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.current.length === 0}
            className="h-7 px-2 text-xs text-[#9494A8] hover:text-white disabled:opacity-30"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.current.length === 0}
            className="h-7 px-2 text-xs text-[#9494A8] hover:text-white disabled:opacity-30"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[#9494A8]">
          <span className="flex items-center gap-1">
            <Flag className="w-3 h-3 text-emerald-400" />
            In {fmt(state.inPoint)}
          </span>
          <span className="flex items-center gap-1">
            <Square className="w-3 h-3 text-red-400" />
            Out {fmt(state.outPoint)}
          </span>
          <span className="text-white font-mono">
            {fmt(state.cursor)} / {fmt(resultDuration)}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#7C5CFC]/20 text-[#7C5CFC] font-semibold">
            {effectiveSegs.length} segmento{effectiveSegs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Waveform + marcadores */}
      <div ref={containerRef} className="relative h-28 px-3 py-2">
        <canvas
          ref={canvasRef}
          onMouseDown={onCanvasMouseDown}
          className="w-full h-full rounded-lg bg-[#0B0B10] border border-white/5 cursor-pointer"
        />
        {/* Cursor de reprodução */}
        <div
          className="absolute top-2 bottom-2 w-0.5 bg-[#22D3EE] z-20 pointer-events-none shadow-[0_0_8px_#22D3EE]"
          style={{ left: `calc(${cursorPct}% + 12px)` }}
        >
          <div className="w-2.5 h-2.5 bg-[#22D3EE] rounded-full -ml-[5px] -mt-1" />
        </div>
        {/* Marcador In (verde) */}
        <div
          onMouseDown={onMarkerMouseDown('in')}
          className="absolute top-1 bottom-1 w-1 bg-emerald-500 z-30 cursor-ew-resize rounded-full shadow-[0_0_6px_#10b981]"
          style={{ left: `calc(${inPct}% + 12px)` }}
          title="Arraste para mover o marcador de entrada"
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-emerald-500" />
        </div>
        {/* Marcador Out (vermelho) */}
        <div
          onMouseDown={onMarkerMouseDown('out')}
          className="absolute top-1 bottom-1 w-1 bg-red-500 z-30 cursor-ew-resize rounded-full shadow-[0_0_6px_#ef4444]"
          style={{ left: `calc(${outPct}% + 12px)` }}
          title="Arraste para mover o marcador de saída"
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
        </div>
        {/* Loading do waveform */}
        {waveformLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#9494A8]">
            Gerando waveform...
          </div>
        )}
      </div>

      {/* Tempo + dica */}
      <div className="h-6 px-3 flex items-center justify-between text-[10px] text-[#9494A8] border-t border-white/5">
        <span>
          Clique no waveform para posicionar · <kbd className="px-1 bg-white/10 rounded">S</kbd>{' '}
          dividir · <kbd className="px-1 bg-white/10 rounded">Del</kbd> excluir ·{' '}
          <kbd className="px-1 bg-white/10 rounded">Espaço</kbd> play/pause
        </span>
        <span>
          Bruto: {fmt(safeDuration)} · Resultante:{' '}
          <span className="text-white font-semibold">{fmt(resultDuration)}</span>
        </span>
      </div>
    </div>
  )
}
