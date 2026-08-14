import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ScrollText,
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Minimize,
  FlipHorizontal,
  Type,
  Clock,
  Sparkles,
  Camera,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Teleprompter() {
  const navigate = useNavigate()
  const { teleprompterScript, setTeleprompterScript } = useStudio()

  // Fullscreen & presentation states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Settings
  const [speed, setSpeed] = useState(3)
  const [fontSize, setFontSize] = useState(36)
  const [isMirrored, setIsMirrored] = useState(false)
  const [invertColors, setInvertColors] = useState(false) // default: dark background with white text

  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Word count & read time estimation
  const words = teleprompterScript.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const estimatedSeconds = Math.ceil((wordCount / 130) * 60) // ~130 words per min avg

  const formatReadTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
  }

  // Scroll ticker
  useEffect(() => {
    let interval: any
    if (isScrolling && scrollRef.current) {
      interval = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += speed * 0.8
        }
      }, 30)
    }
    return () => clearInterval(interval)
  }, [isScrolling, speed])

  // Countdown handler
  const handleStartPresentation = () => {
    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer)
          setCountdown(null)
          setIsScrolling(true)
          toast.success('Apresentação iniciada!')
          return null
        }
        return prev ? prev - 1 : null
      })
    }, 1000)
  }

  const handleResetScroll = () => {
    setIsScrolling(false)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }

  return (
    <div
      className={`h-full flex flex-col p-4 sm:p-6 max-w-6xl mx-auto gap-4 overflow-y-auto animate-fade-in ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-black' : ''
      }`}
    >
      {/* Header */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-indigo-400" />
              Teleprompter Profissional
            </h1>
            <p className="text-xs text-[#9494A8]">
              Leitura fluida com controle de velocidade, modo espelho para vidro refletivo e
              estimativa de tempo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/gravadora')}
              className="border-white/10 text-xs text-white hover:bg-white/5 gap-1.5"
            >
              <Camera className="w-4 h-4 text-red-400" /> Ir para Gravadora
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold gap-1.5"
            >
              <Maximize className="w-4 h-4" /> Modo Tela Cheia
            </Button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[460px]">
        {/* LEFT / CENTER: Scrolling Prompter Display (8 cols) */}
        <div
          className={`lg:col-span-8 rounded-2xl border relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
            invertColors
              ? 'bg-white text-black border-slate-300'
              : 'bg-[#07070A] text-white border-white/10'
          }`}
        >
          {/* Eye Level Guide / Focus Line */}
          <div className="absolute top-1/3 left-0 right-0 h-16 pointer-events-none border-y border-[#7C5CFC]/30 bg-[#7C5CFC]/5 z-20 flex items-center justify-end px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC] bg-black/60 px-2 py-0.5 rounded-md">
              Linha de Olhar
            </span>
          </div>

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-40 animate-fade-in">
              <span className="text-8xl font-extrabold text-[#22D3EE] animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Scrolling Text Container */}
          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto px-8 sm:px-12 py-32 space-y-6 select-none scrollbar-none transition-transform duration-200 ${
              isMirrored ? 'scale-x-[-1]' : ''
            }`}
          >
            <p
              className="font-bold leading-relaxed tracking-wide text-center"
              style={{ fontSize: `${fontSize}px` }}
            >
              {teleprompterScript ||
                'Digite seu roteiro na caixa de preparação ao lado para iniciar o teleprompter...'}
            </p>
          </div>

          {/* Floating Live Bar in Prompter */}
          <div className="p-3 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between z-30">
            <div className="flex items-center gap-2">
              {isScrolling ? (
                <Button
                  size="sm"
                  onClick={() => setIsScrolling(false)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5"
                >
                  <Pause className="w-4 h-4" /> Pausar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStartPresentation}
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white font-bold text-xs gap-1.5 shadow-lg shadow-[#7C5CFC]/30"
                >
                  <Play className="w-4 h-4 fill-current" /> Iniciar Apresentação (3s)
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetScroll}
                className="text-xs text-[#9494A8] hover:text-white"
                title="Voltar ao início"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {isFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="text-xs text-[#9494A8] hover:text-white"
              >
                <Minimize className="w-4 h-4 mr-1" /> Sair da Tela Cheia
              </Button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Script Editor & Controls (4 cols) */}
        {!isFullscreen && (
          <div className="lg:col-span-4 bg-[#14141C] border border-white/10 rounded-2xl p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Preparação do Roteiro
              </h3>
              <span className="text-[10px] font-mono text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-0.5 rounded">
                {wordCount} palavras • ~{formatReadTime(estimatedSeconds)}
              </span>
            </div>

            <textarea
              value={teleprompterScript}
              onChange={(e) => setTeleprompterScript(e.target.value)}
              rows={6}
              placeholder="Digite ou cole aqui o seu roteiro completo..."
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />

            {/* Adjustments */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span>Velocidade de Rolagem</span>
                  <span>{speed}x</span>
                </div>
                <Slider
                  value={[speed]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(val) => setSpeed(val[0])}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span>Tamanho do Texto</span>
                  <span>{fontSize}px</span>
                </div>
                <Slider
                  value={[fontSize]}
                  min={20}
                  max={60}
                  step={2}
                  onValueChange={(val) => setFontSize(val[0])}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#9494A8] flex items-center gap-1.5">
                  <FlipHorizontal className="w-3.5 h-3.5" /> Modo Espelhado (Vidro)
                </span>
                <Switch checked={isMirrored} onCheckedChange={setIsMirrored} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9494A8]">Inverter Cores (Preto no Branco)</span>
                <Switch checked={invertColors} onCheckedChange={setInvertColors} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
