import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStudio } from '@/context/StudioContext'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Play,
  Pause,
  RotateCcw,
  FlipHorizontal,
  X,
  ChevronUp,
  ChevronDown,
  AlignCenter,
  Type,
} from 'lucide-react'
import type { TeleprompterMode, TeleprompterTextColor } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   PrompterHUD — FASE 2B
   Teleprompter renderizado via portal no nível do Studio Shell, FORA do
   canvas 9:16 e da câmera. NÃO aparece no vídeo gravado nem na exportação,
   não desloca a câmera e permanece visível mesmo com o preview oculto.
   Acompanha o bloco atual (compartilhado via StudioContext) e sincroniza
   artes/B-roll ao avançar blocos.
   ─────────────────────────────────────────────────────────────────────────── */

const COLORS: Record<TeleprompterTextColor, string> = {
  white: '#FFFFFF',
  green: '#22FF22',
  yellow: '#FFFF44',
}

interface PrompterPrefs {
  fontSize: number
  speed: number
  color: TeleprompterTextColor
  bgOpacity: number // 0-80 (%)
  mirror: boolean
  mode: TeleprompterMode
  lensOffset: number // -100..+100 px
  countdown: 3 | 5 | 10
  reading: boolean
}

const DEFAULT_PREFS: PrompterPrefs = {
  fontSize: 48,
  speed: 3,
  color: 'white',
  bgOpacity: 50,
  mirror: false,
  mode: 'blocks',
  lensOffset: 0,
  countdown: 3,
  reading: false,
}

const PREFS_KEY = 'lumen_prompter_hud_prefs'

function loadPrefs(): PrompterPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<PrompterPrefs>) }
  } catch {
    /* noop */
  }
  return DEFAULT_PREFS
}

export default function PrompterHUD() {
  const { scriptBlocks, gravadoraScript, activeBlockIndex, setActiveBlockIndex, isRecording } =
    useStudio()

  const [prefs, setPrefs] = useState<PrompterPrefs>(loadPrefs)
  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  // Persiste preferências
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* quota */
    }
  }, [prefs])

  const update = useCallback(<K extends keyof PrompterPrefs>(key: K, value: PrompterPrefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Portal só no cliente (SSR-safe)
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

  /* Contagem regressiva antes da leitura */
  const startCountdown = useCallback(() => {
    setCountdown(prefs.countdown)
  }, [prefs.countdown])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      setPrefs((p) => ({ ...p, reading: true }))
      setIsPaused(false)
      return
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  /* Rolagem contínua (modo continuous) */
  useEffect(() => {
    if (prefs.mode !== 'continuous' || !prefs.reading || isPaused) return
    const id = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += prefs.speed * 0.8
      }
    }, 30)
    return () => clearInterval(id)
  }, [prefs.mode, prefs.reading, prefs.speed, isPaused])

  /* Atalhos de teclado (não disparam durante digitação em inputs) */
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
        if (prefs.mode === 'continuous' && prefs.reading) {
          setIsPaused((p) => !p)
        } else {
          advance()
        }
      } else if (k === 'arrowup') {
        e.preventDefault()
        back()
      } else if (k === 'escape') {
        e.preventDefault()
        setPrefs((p) => ({ ...p, reading: false }))
        setIsPaused(false)
      } else if (k === 'f') {
        e.preventDefault()
        // Modo foco é tratado no contexto/Gravadora; aqui apenas garantimos
        // que não conflite com a rolagem.
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, back, prefs.mode, prefs.reading])

  const textColor = COLORS[prefs.color]
  const fadeMask =
    'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)'

  const displayText = useMemo(() => {
    if (prefs.mode === 'continuous') {
      return gravadoraScript || 'Digite seu roteiro no painel inferior para iniciar...'
    }
    return current?.text || '(bloco vazio)'
  }, [prefs.mode, gravadoraScript, current])

  if (!mounted) return null

  return createPortal(
    <div
      aria-label="Teleprompter"
      role="region"
      className="fixed left-1/2 -translate-x-1/2 z-[60] pointer-events-auto"
      style={{
        top: 12,
        width: 'min(880px, calc(100vw - 24px))',
      }}
    >
      {/* Linha de leitura principal */}
      <div
        className="relative rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden"
        style={{ backgroundColor: `rgba(11, 11, 16, ${prefs.bgOpacity / 100})` }}
      >
        {/* Máscara de fade nas bordas */}
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
        ) : prefs.reading ? (
          <div
            ref={scrollRef}
            className={`relative z-0 max-h-[160px] overflow-y-auto px-6 py-4 text-center ${
              prefs.mirror ? 'scale-x-[-1]' : ''
            }`}
            style={{ transform: `translateX(${prefs.lensOffset}px)` }}
          >
            {prefs.mode === 'blocks' ? (
              <div className="space-y-1">
                {prev && (
                  <p
                    className="font-medium leading-snug whitespace-pre-wrap"
                    style={{
                      fontSize: Math.max(18, prefs.fontSize - 14),
                      color: textColor,
                      opacity: 0.3,
                    }}
                  >
                    {prev.text}
                  </p>
                )}
                <p
                  className="font-bold leading-snug whitespace-pre-wrap"
                  style={{ fontSize: prefs.fontSize, color: textColor }}
                >
                  {displayText}
                </p>
                {next && (
                  <p
                    className="font-medium leading-snug whitespace-pre-wrap"
                    style={{
                      fontSize: Math.max(18, prefs.fontSize - 14),
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
                className="font-bold leading-relaxed whitespace-pre-wrap"
                style={{ fontSize: prefs.fontSize, color: textColor }}
              >
                {displayText}
              </p>
            )}
          </div>
        ) : (
          /* Modo configuração */
          <div className="relative z-0 px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Type className="w-3.5 h-3.5 text-[#22D3EE]" />
                Prompter HUD
                {isRecording && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                  </span>
                )}
                {blocks.length > 0 && prefs.mode === 'blocks' && (
                  <span className="text-[10px] font-mono text-[#9494A8] ml-1">
                    Bloco {activeBlockIndex + 1}/{blocks.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPrefs((p) => ({ ...p, reading: true }))}
                  disabled={blocks.length === 0 && prefs.mode === 'blocks'}
                  aria-label="Iniciar leitura"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                >
                  <Play className="w-3 h-3 fill-current" /> Ler
                </button>
                <button
                  onClick={startCountdown}
                  disabled={blocks.length === 0 && prefs.mode === 'blocks'}
                  aria-label={`Iniciar com contagem de ${prefs.countdown} segundos`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1C1C27] text-[#9494A8] hover:text-white text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                >
                  {prefs.countdown}s
                </button>
              </div>
            </div>

            {/* Linha de controles compactos */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Modo */}
              <div className="flex items-center gap-1 bg-[#1C1C27] rounded-lg p-0.5">
                {(
                  [
                    { id: 'blocks', label: 'Blocos' },
                    { id: 'fixed', label: 'Nota Fixa' },
                    { id: 'continuous', label: 'Rolagem' },
                  ] as { id: TeleprompterMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => update('mode', m.id)}
                    aria-pressed={prefs.mode === m.id}
                    aria-label={`Modo ${m.label}`}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] ${
                      prefs.mode === m.id
                        ? 'bg-[#7C5CFC] text-white'
                        : 'text-[#9494A8] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Cor */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'white', c: '#FFFFFF' },
                    { id: 'green', c: '#22FF22' },
                    { id: 'yellow', c: '#FFFF44' },
                  ] as { id: TeleprompterTextColor; c: string }[]
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => update('color', c.id)}
                    aria-label={`Cor ${c.id}`}
                    aria-pressed={prefs.color === c.id}
                    className={`w-4 h-4 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] ${
                      prefs.color === c.id ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c.c }}
                  />
                ))}
              </div>

              {/* Espelho */}
              <label className="flex items-center gap-1 text-[10px] text-[#9494A8]">
                <FlipHorizontal className="w-3 h-3" />
                <span className="sr-only">Espelhamento para vidro refletivo</span>
                <Switch checked={prefs.mirror} onCheckedChange={(v) => update('mirror', v)} />
              </label>

              {/* Contagem */}
              <label className="flex items-center gap-1 text-[10px] text-[#9494A8]">
                <span>Contagem</span>
                <select
                  value={prefs.countdown}
                  onChange={(e) => update('countdown', Number(e.target.value) as 3 | 5 | 10)}
                  aria-label="Duração da contagem regressiva"
                  className="bg-[#1C1C27] border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
                >
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </label>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#9494A8]">
                  <span>Fonte</span>
                  <span className="font-mono">{prefs.fontSize}px</span>
                </div>
                <Slider
                  value={[prefs.fontSize]}
                  min={28}
                  max={72}
                  step={1}
                  onValueChange={(v) => update('fontSize', v[0])}
                  aria-label="Tamanho da fonte"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#9494A8]">
                  <span>Velocidade</span>
                  <span className="font-mono">{prefs.speed}x</span>
                </div>
                <Slider
                  value={[prefs.speed]}
                  min={1}
                  max={8}
                  step={1}
                  onValueChange={(v) => update('speed', v[0])}
                  aria-label="Velocidade da rolagem"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#9494A8]">
                  <span>Fundo</span>
                  <span className="font-mono">{prefs.bgOpacity}%</span>
                </div>
                <Slider
                  value={[prefs.bgOpacity]}
                  min={0}
                  max={80}
                  step={5}
                  onValueChange={(v) => update('bgOpacity', v[0])}
                  aria-label="Opacidade do fundo"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#9494A8]">
                  <span className="flex items-center gap-0.5">
                    <AlignCenter className="w-2.5 h-2.5" /> Lente
                  </span>
                  <span className="font-mono">{prefs.lensOffset}px</span>
                </div>
                <Slider
                  value={[prefs.lensOffset]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={(v) => update('lensOffset', v[0])}
                  aria-label="Alinhar com a lente"
                />
              </div>
            </div>
          </div>
        )}

        {/* Barra de controles de leitura (visível durante leitura) */}
        {prefs.reading && (
          <div className="relative z-20 flex items-center justify-center gap-2 py-1.5 border-t border-white/10 bg-black/40">
            {prefs.mode === 'continuous' ? (
              <button
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? 'Continuar rolagem' : 'Pausar rolagem'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C1C27] text-white text-[11px] font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3 h-3 fill-current" /> Continuar
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" /> Pausar
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={back}
                  disabled={activeBlockIndex === 0}
                  aria-label="Voltar bloco"
                  className="p-1 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono text-[#9494A8]">
                  {activeBlockIndex + 1}/{Math.max(1, blocks.length)}
                </span>
                <button
                  onClick={advance}
                  disabled={activeBlockIndex >= blocks.length - 1}
                  aria-label="Avançar bloco"
                  className="p-1 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={restart}
              aria-label="Voltar ao início"
              className="p-1 rounded-lg text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPrefs((p) => ({ ...p, reading: false }))}
              aria-label="Fechar leitura (Esc)"
              className="p-1 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
