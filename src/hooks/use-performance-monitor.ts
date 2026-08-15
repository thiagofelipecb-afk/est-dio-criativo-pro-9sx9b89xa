import { useEffect, useRef, useState } from 'react'

/* ===========================================================================
   LUMEN Studio — Monitor de Desempenho (FASE 2 / GAP 1)
   Monitora FPS via requestAnimationFrame e memória (quando disponível).
   Marca `degraded` quando o FPS cai abaixo de 24 por mais de 3 segundos,
   restaurando quando volta acima de 30 por mais de 5 segundos.
   Mensagens claras e NÃO técnicas — nunca toca na resolução de saída.
   =========================================================================== */

export interface PerformanceMonitorState {
  /** FPS médio dos últimos 10 frames (amostragem a cada 500ms). */
  fps: number
  /** True quando efeitos visuais opcionais devem ser reduzidos. */
  degraded: boolean
  /** Motivo amigável (pt-BR) quando degradado; null caso contrário. */
  degradationReason: string | null
  /** Memória JS usada em MB (apenas Chrome); null quando indisponível. */
  memoryMB: number | null
}

const DEGRADATION_REASON =
  'Queda de desempenho detectada. Alguns efeitos foram reduzidos para manter a fluidez.'

/** Limiar inferior: FPS abaixo deste por >3s ativa degradação. */
const LOW_FPS_THRESHOLD = 24
const LOW_FPS_HOLD_MS = 3000
/** Limiar de recuperação: FPS acima deste por >5s desativa degradação. */
const OK_FPS_THRESHOLD = 30
const OK_FPS_HOLD_MS = 5000
/** Janela de amostragem do FPS. */
const SAMPLE_INTERVAL_MS = 500
const FRAME_WINDOW = 10

export function usePerformanceMonitor(enabled: boolean = true): PerformanceMonitorState {
  const [state, setState] = useState<PerformanceMonitorState>({
    fps: 60,
    degraded: false,
    degradationReason: null,
    memoryMB: null,
  })

  const rafIdRef = useRef<number | null>(null)
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameTimesRef = useRef<number[]>([])
  const lastFrameTimeRef = useRef<number>(0)
  const lowSinceRef = useRef<number | null>(null)
  const okSinceRef = useRef<number | null>(null)
  const degradedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) {
      // Garante estado limpo quando desabilitado.
      setState({
        fps: 60,
        degraded: false,
        degradationReason: null,
        memoryMB: null,
      })
      return
    }

    lastFrameTimeRef.current = performance.now()

    const loop = (now: number) => {
      const last = lastFrameTimeRef.current
      const delta = now - last
      lastFrameTimeRef.current = now
      if (delta > 0) {
        const fps = 1000 / delta
        frameTimesRef.current.push(fps)
        if (frameTimesRef.current.length > FRAME_WINDOW) {
          frameTimesRef.current.shift()
        }
      }
      rafIdRef.current = requestAnimationFrame(loop)
    }
    rafIdRef.current = requestAnimationFrame(loop)

    const sample = () => {
      const frames = frameTimesRef.current
      if (frames.length === 0) return

      const avg = frames.reduce((a, b) => a + b, 0) / frames.length
      const now = Date.now()

      // Memória (Chrome-only via performance.memory).
      let memoryMB: number | null = null
      try {
        const mem = (performance as any).memory
        if (mem && typeof mem.usedJSHeapSize === 'number') {
          memoryMB = Math.round((mem.usedJSHeapSize / 1024 / 1024) * 10) / 10
        }
      } catch {
        /* noop */
      }

      const isDegraded = degradedRef.current

      // Lógica de degradação: FPS baixo por mais de LOW_FPS_HOLD_MS.
      if (avg < LOW_FPS_THRESHOLD) {
        if (lowSinceRef.current === null) lowSinceRef.current = now
        if (now - lowSinceRef.current >= LOW_FPS_HOLD_MS && !isDegraded) {
          degradedRef.current = true
          okSinceRef.current = null
          setState({
            fps: Math.round(avg),
            degraded: true,
            degradationReason: DEGRADATION_REASON,
            memoryMB,
          })
          return
        }
      } else {
        lowSinceRef.current = null
      }

      // Lógica de recuperação: FPS bom por mais de OK_FPS_HOLD_MS.
      if (isDegraded && avg > OK_FPS_THRESHOLD) {
        if (okSinceRef.current === null) okSinceRef.current = now
        if (now - okSinceRef.current >= OK_FPS_HOLD_MS) {
          degradedRef.current = false
          lowSinceRef.current = null
          okSinceRef.current = null
          setState({
            fps: Math.round(avg),
            degraded: false,
            degradationReason: null,
            memoryMB,
          })
          return
        }
      } else if (isDegraded) {
        okSinceRef.current = null
      }

      // Atualiza apenas fps/memory sem mudar estado de degradação.
      setState((prev) => ({
        ...prev,
        fps: Math.round(avg),
        memoryMB,
      }))
    }

    sampleTimerRef.current = setInterval(sample, SAMPLE_INTERVAL_MS)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      if (sampleTimerRef.current !== null) {
        clearInterval(sampleTimerRef.current)
        sampleTimerRef.current = null
      }
      frameTimesRef.current = []
      lowSinceRef.current = null
      okSinceRef.current = null
    }
  }, [enabled])

  return state
}
