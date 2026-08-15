import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStudio } from '@/context/StudioContext'
import { Play, Pause, RotateCcw, X, ChevronUp, ChevronDown } from 'lucide-react'

const COLORS: Record<string, string> = {
  white: '#FFFFFF',
  green: '#22FF22',
  yellow: '#FFFF44',
}

export default function PrompterHUD() {
  const {
    scriptBlocks,
    gravadoraScript,
    activeBlockIndex,
    setActiveBlockIndex,
    isRecording,
    prompterConfig,
    updatePrompterConfig,
  } = useStudio()

  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const blocks = scriptBlocks
  const current = blocks[activeBlockIndex]
  const prev = blocks[activeBlockIndex - 1]
  const next = blocks[activeBlockIndex + 1]

  const advance = useCallback(() => {
    setActiveBlockIndex(Math.min(blocks.length - 1, activeBlockIndex + 1))
  }, [activeBlockIndex, blocks.length, setActiveBlockIndex])

  const back = useCallback(() => {
    setActiveBlockIndex(Math.max(0, activeBlockIndex - 1))
  }, [activeBlockIndex, setActiveBlockIndex])

  const restart = useCallback(() => {
    setActiveBlockIndex(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [setActiveBlockIndex])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      updatePrompterConfig({ reading: true })
      setIsPaused(false)
      return
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown, updatePrompterConfig])

  useEffect(() => {
    if (prompterConfig.mode !== 'continuous' || !prompterConfig.reading || isPaused) return
    const id = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += prompterConfig.speed * 0.8
      }
    }, 30)
    return () => clearInterval(id)
  }, [prompterConfig.mode, prompterConfig.reading, prompterConfig.speed, isPaused])

  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'arrowdown') {
        e.preventDefault()
        if (prompterConfig.mode === 'continuous' && prompterConfig.reading) {
          setIsPaused((p) => !p)
        } else {
          advance()
        }
      } else if (k === 'arrowup') {
        e.preventDefault()
        back()
      } else if (k === 'escape') {
        e.preventDefault()
        updatePrompterConfig({ reading: false })
        setIsPaused(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, back, prompterConfig.mode, prompterConfig.reading, updatePrompterConfig])

  const textColor = COLORS[prompterConfig.color] || '#FFFFFF'
  const fadeMask =
    'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)'

  const displayText = useMemo(() => {
    if (prompterConfig.mode === 'continuous') {
      return gravadoraScript || 'Digite seu roteiro no painel para iniciar...'
    }
    return current?.text || '(bloco vazio)'
  }, [prompterConfig.mode, gravadoraScript, current])

  if (!mounted) return null

  return createPortal(
    <div
      aria-label="Teleprompter HUD"
      role="region"
      className="fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
      style={{
        top: 12,
        width: 'min(880px, calc(100vw - 24px))',
      }}
    >
      <div
        className="relative rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden transition-all"
        style={{ backgroundColor: `rgba(11, 11, 16, ${prompterConfig.bgOpacity / 100})` }}
      >
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ WebkitMaskImage: fadeMask, maskImage: fadeMask }}
        />
        {countdown !== null ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-7xl font-extrabold text-[#22D3EE] animate-pulse">
              {countdown === 0 ? 'Gravar!' : countdown}
            </span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className={`relative z-0 max-h-[160px] overflow-y-auto px-6 py-4 text-center transition-all ${
              prompterConfig.mirror ? 'scale-x-[-1]' : ''
            }`}
            style={{ transform: `translateX(${prompterConfig.lensOffset}px)` }}
          >
            {prompterConfig.mode === 'blocks' ? (
              <div className="space-y-1">
                {prev && (
                  <p
                    className="font-medium leading-snug whitespace-pre-wrap"
                    style={{
                      fontSize: Math.max(18, prompterConfig.fontSize - 14),
                      color: textColor,
                      opacity: 0.3,
                    }}
                  >
                    {prev.text}
                  </p>
                )}
                <p
                  className="font-bold leading-snug whitespace-pre-wrap transition-all"
                  style={{ fontSize: prompterConfig.fontSize, color: textColor }}
                >
                  {displayText}
                </p>
                {next && (
                  <p
                    className="font-medium leading-snug whitespace-pre-wrap"
                    style={{
                      fontSize: Math.max(18, prompterConfig.fontSize - 14),
                      color: textColor,
                      opacity: 0.3,
                    }}
                  >
                    {next.text}
                  </p>
                )}
              </div>
            ) : (
              <p
                className="font-bold leading-relaxed whitespace-pre-wrap transition-all"
                style={{ fontSize: prompterConfig.fontSize, color: textColor }}
              >
                {displayText}
              </p>
            )}
          </div>
        )}

        {/* Floating Minimal Controls on HUD hover / during reading */}
        <div className="relative z-20 flex items-center justify-between px-4 py-1.5 border-t border-white/10 bg-black/40 text-xs">
          <div className="flex items-center gap-2 text-[#9494A8] font-mono text-[10px]">
            {isRecording && (
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
              </span>
            )}
            {prompterConfig.mode === 'blocks' && blocks.length > 0 && (
              <span>
                Bloco {activeBlockIndex + 1}/{blocks.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {prompterConfig.mode === 'continuous' ? (
              <button
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? 'Continuar' : 'Pausar'}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#1C1C27] text-white text-[11px] font-medium hover:bg-white/10"
              >
                {isPaused ? (
                  <Play className="w-3 h-3 fill-current" />
                ) : (
                  <Pause className="w-3 h-3" />
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={back}
                  disabled={activeBlockIndex === 0}
                  className="p-1 rounded text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={advance}
                  disabled={activeBlockIndex >= blocks.length - 1}
                  className="p-1 rounded text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={restart}
              className="p-1 rounded text-white hover:bg-white/10"
              title="Reiniciar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
