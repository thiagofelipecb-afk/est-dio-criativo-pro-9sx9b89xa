import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStudio } from '@/context/StudioContext'
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Settings2,
} from 'lucide-react'

/** Converte um hex (#RRGGBB) para rgba com alpha 0..1. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return `rgba(11,11,16,${alpha})`
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

/* ───────────────────────────────────────────────────────────────────────────
   PrompterHUD — Teleprompter overlay da Gravadora
   ───────────────────────────────────────────────────────────────────────────
   CORREÇÃO: o HUD é renderizado FORA do contêiner da câmera via React portal
   (`createPortal(... , document.body)`). Ele usa `position: fixed` no topo da
   janela (top ~14px), centralizado horizontalmente, z-index 9999. Assim:

   - Não é ancestral do contêiner da câmera/canvas 1080×1920.
   - A gravação (MediaRecorder sobre o stream da webcam) NUNCA captura o texto,
     pois o HUD vive em uma camada DOM separada, não desenhada no canvas.
   - Ocultar o preview da câmera (stageConfig.previewHidden) NÃO oculta o HUD.
   - Continua visível no Modo Foco (Layout.tsx isGravadoraFocus) porque é fixed
     no body, independente do que o Layout renderiza.

   Modos (preservados do StudioContext):
     - 'blocks'     → Avança bloco por bloco (setas/espaço)
     - 'fixed'      → Nota fixa (texto estático, sem rolagem nem blocos)
     - 'continuous' → Rolagem contínua automática
   ─────────────────────────────────────────────────────────────────────────── */

const COLORS: Record<string, string> = {
  white: '#FFFFFF',
  green: '#22D3EE',
  yellow: '#FFFF44',
}

export default function PrompterHUD() {
  const {
    scriptBlocks,
    gravadoraScript,
    activeBlockIndex,
    setActiveBlockIndex,
    isRecording,
    isFocusMode,
    setIsFocusMode,
    prompterConfig,
    updatePrompterConfig,
  } = useStudio()

  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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

  // Countdown interno (3,2,1) para iniciar a leitura contínua.
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

  // Rolagem contínua
  useEffect(() => {
    if (prompterConfig.mode !== 'continuous' || !prompterConfig.reading || isPaused) return
    const id = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += prompterConfig.speed * 0.8
      }
    }, 30)
    return () => clearInterval(id)
  }, [prompterConfig.mode, prompterConfig.reading, prompterConfig.speed, isPaused])

  // Auto-start: quando a gravação inicia, liga a leitura automaticamente.
  useEffect(() => {
    if (isRecording) {
      if (prompterConfig.mode === 'continuous' && !prompterConfig.reading) {
        updatePrompterConfig({ reading: true })
        setIsPaused(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  // Atalhos de teclado — NÃO disparam durante digitação em input/textarea/select/contenteditable.
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
        if (prompterConfig.mode === 'continuous') {
          if (prompterConfig.reading) setIsPaused((p) => !p)
          else updatePrompterConfig({ reading: true })
        } else if (prompterConfig.mode === 'blocks') {
          advance()
        }
      } else if (k === 'arrowup') {
        e.preventDefault()
        if (prompterConfig.mode === 'blocks') back()
      } else if (k === 'escape') {
        e.preventDefault()
        setMinimized(true)
        updatePrompterConfig({ reading: false })
        setIsPaused(false)
      } else if (k === 't') {
        // Atalho T: ocultar/minimizar o HUD (alternar).
        e.preventDefault()
        setMinimized((m) => !m)
      } else if (k === 'f') {
        e.preventDefault()
        setIsFocusMode(!isFocusMode)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    advance,
    back,
    prompterConfig.mode,
    prompterConfig.reading,
    updatePrompterConfig,
    isFocusMode,
    setIsFocusMode,
  ])

  const textColor = COLORS[prompterConfig.color] || '#FFFFFF'
  const fadeMask =
    'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)'

  const displayText = useMemo(() => {
    if (prompterConfig.mode === 'continuous' || prompterConfig.mode === 'fixed') {
      return gravadoraScript || 'Digite seu roteiro no painel para iniciar...'
    }
    return current?.text || '(bloco vazio)'
  }, [prompterConfig.mode, gravadoraScript, current])

  if (!mounted) return null

  // Container fixo no topo da janela, centralizado, z-9999, fora do canvas.
  // Posicionado PRÓXIMO à câmera, sem sobrepor o cabeçalho (top: 14px) nem os
  // botões da Gravadora. É uma camada de leitura independente do painel de
  // configuração — nunca entra no canvas de composição.
  const hudWidth = Math.max(
    320,
    Math.min(prompterConfig.width, typeof window !== 'undefined' ? window.innerWidth - 24 : 1200),
  )
  return createPortal(
    <div
      aria-label="Teleprompter HUD"
      role="region"
      className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
      style={{
        top: 14,
        width: hudWidth,
      }}
    >
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-xs text-white shadow-2xl hover:bg-black/80"
          title="Mostrar teleprompter (T)"
        >
          <Eye className="w-3.5 h-3.5 text-[#22D3EE]" /> Mostrar Teleprompter
        </button>
      ) : (
        <div
          className="relative rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden transition-all"
          style={{
            backgroundColor: hexToRgba(prompterConfig.bgColor, prompterConfig.bgOpacity / 100),
          }}
        >
          {/* Máscara de fade nas bordas superior/inferior */}
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
              className={`relative z-0 overflow-y-auto px-6 py-3 text-center transition-all ${
                prompterConfig.mirror ? 'scale-x-[-1]' : ''
              }`}
              style={{
                transform: `translateX(${prompterConfig.lensOffset}px)`,
                maxHeight: prompterConfig.height,
              }}
            >
              {prompterConfig.mode === 'blocks' ? (
                <div className="space-y-1">
                  {prev && (
                    <p
                      className="font-medium leading-snug whitespace-pre-wrap"
                      style={{
                        fontSize: Math.max(18, prompterConfig.fontSize - 14),
                        color: textColor,
                        opacity: 0.35,
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
                        opacity: 0.35,
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

          {/* Barra de controles flutuante */}
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
              {prompterConfig.mode === 'fixed' && <span className="text-[#22D3EE]">Nota Fixa</span>}
              {prompterConfig.mode === 'continuous' && (
                <span className="text-[#22D3EE]">
                  {prompterConfig.reading ? (isPaused ? 'Pausado' : 'Rolando') : 'Parado'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {prompterConfig.mode === 'continuous' ? (
                <button
                  onClick={() => {
                    if (!prompterConfig.reading) {
                      updatePrompterConfig({ reading: true })
                      setIsPaused(false)
                    } else {
                      setIsPaused((p) => !p)
                    }
                  }}
                  aria-label={isPaused ? 'Continuar' : 'Pausar'}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#1C1C27] text-white text-[11px] font-medium hover:bg-white/10"
                >
                  {isPaused || !prompterConfig.reading ? (
                    <Play className="w-3 h-3 fill-current" />
                  ) : (
                    <Pause className="w-3 h-3" />
                  )}
                </button>
              ) : prompterConfig.mode === 'blocks' ? (
                <>
                  <button
                    onClick={back}
                    disabled={activeBlockIndex === 0}
                    className="p-1 rounded text-white hover:bg-white/10 disabled:opacity-30"
                    title="Bloco anterior (Seta ↑)"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={advance}
                    disabled={activeBlockIndex >= blocks.length - 1}
                    className="p-1 rounded text-white hover:bg-white/10 disabled:opacity-30"
                    title="Próximo bloco (Seta ↓ / Espaço)"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </>
              ) : null}

              <button
                onClick={restart}
                className="p-1 rounded text-white hover:bg-white/10"
                title="Voltar ao início"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setMinimized(true)}
                className="p-1 rounded text-white hover:bg-white/10"
                title="Minimizar (T / Esc)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => updatePrompterConfig({ reading: !prompterConfig.reading })}
                className={`p-1 rounded hover:bg-white/10 ${
                  prompterConfig.reading ? 'text-[#22D3EE]' : 'text-white'
                }`}
                title="Alternar leitura"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`p-1 rounded hover:bg-white/10 ${
                  isFocusMode ? 'text-[#22D3EE]' : 'text-white'
                }`}
                title="Modo Foco (F)"
              >
                <span className="text-[10px] font-bold">F</span>
              </button>

              <button
                onClick={() => setShowSettings((s) => !s)}
                className={`p-1 rounded hover:bg-white/10 ${
                  showSettings ? 'text-[#22D3EE]' : 'text-white'
                }`}
                title="Ajustes do teleprompter"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  updatePrompterConfig({ reading: false })
                  setIsPaused(false)
                }}
                className="p-1 rounded text-white hover:bg-white/10"
                title="Fechar HUD"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Painel de ajustes do teleprompter (largura, altura, fonte, cores,
              espelhamento). Camada independente — NÃO entra no canvas. */}
          {showSettings && (
            <div className="relative z-30 border-t border-white/10 bg-black/80 backdrop-blur-md px-4 py-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <label className="block">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                    Largura
                  </span>
                  <input
                    type="range"
                    min={320}
                    max={1400}
                    step={10}
                    value={prompterConfig.width}
                    onChange={(e) => updatePrompterConfig({ width: Number(e.target.value) })}
                    className="w-full accent-[#7C5CFC]"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">Altura</span>
                  <input
                    type="range"
                    min={80}
                    max={400}
                    step={10}
                    value={prompterConfig.height}
                    onChange={(e) => updatePrompterConfig({ height: Number(e.target.value) })}
                    className="w-full accent-[#7C5CFC]"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                    Fonte ({prompterConfig.fontSize}px)
                  </span>
                  <input
                    type="range"
                    min={18}
                    max={96}
                    step={1}
                    value={prompterConfig.fontSize}
                    onChange={(e) => updatePrompterConfig({ fontSize: Number(e.target.value) })}
                    className="w-full accent-[#7C5CFC]"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                    Opacidade fundo ({prompterConfig.bgOpacity}%)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={prompterConfig.bgOpacity}
                    onChange={(e) => updatePrompterConfig({ bgOpacity: Number(e.target.value) })}
                    className="w-full accent-[#7C5CFC]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <label className="block">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                    Cor do texto
                  </span>
                  <div className="flex gap-1 mt-1">
                    {(['white', 'green', 'yellow'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => updatePrompterConfig({ color: c })}
                        className={`w-6 h-6 rounded-full border-2 ${
                          prompterConfig.color === c ? 'border-[#7C5CFC]' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: COLORS[c] }}
                        title={c}
                      />
                    ))}
                  </div>
                </label>
                <label className="block">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                    Cor do fundo
                  </span>
                  <input
                    type="color"
                    value={prompterConfig.bgColor}
                    onChange={(e) => updatePrompterConfig({ bgColor: e.target.value })}
                    className="w-full h-7 mt-1 rounded bg-transparent border border-white/10 cursor-pointer"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-[10px] text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prompterConfig.mirror}
                    onChange={(e) => updatePrompterConfig({ mirror: e.target.checked })}
                    className="accent-[#7C5CFC]"
                  />
                  Espelhar texto
                </label>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-[10px] text-[#9494A8] hover:text-white"
                >
                  Fechar ajustes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
