import { useCallback, useEffect, useRef, useState } from 'react'

/* ───────────────────────────────────────────────────────────────────────────
   use-teleprompter — FASE 2
   Lógica compartilhada de rolagem contínua (modo Nota Fixa), extraída do
   Teleprompter.tsx standalone para reuso na aba Teleprompter da Gravadora.
   Não altera o Teleprompter.tsx — este hook é consumido apenas pelo painel
   integrado.
   ─────────────────────────────────────────────────────────────────────────── */

export interface UseTeleprompterOptions {
  speed: number
  active?: boolean
}

export function useTeleprompter({ speed, active = false }: UseTeleprompterOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const start = useCallback(() => {
    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer)
          setCountdown(null)
          setIsScrolling(true)
          return null
        }
        return prev ? prev - 1 : null
      })
    }, 1000)
  }, [])

  const pause = useCallback(() => setIsScrolling(false), [])

  const reset = useCallback(() => {
    setIsScrolling(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  useEffect(() => {
    if (!active) {
      setIsScrolling(false)
      setCountdown(null)
    }
  }, [active])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (isScrolling && scrollRef.current) {
      interval = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += speed * 0.8
        }
      }, 30)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isScrolling, speed])

  return {
    scrollRef,
    isScrolling,
    countdown,
    start,
    pause,
    reset,
    setIsScrolling,
  }
}
