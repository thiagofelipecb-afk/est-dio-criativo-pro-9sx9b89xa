import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Scissors,
  Youtube,
  Upload,
  Sparkles,
  Play,
  Pause,
  Clock,
  Share2,
  Calendar,
  CheckCircle2,
  Download,
  Flame,
  Volume2,
  Wand2,
  Layers,
  Zap,
  Film,
  Hash,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { getOverlayById, getSfxById, getTrackById } from '@/lib/assets-pack'
import { supabase } from '@/lib/supabase/client'

interface GeneratedClip {
  id: string
  title: string
  description: string
  hashtags: string[]
  startTime: number
  endTime: number
  duration: number
  viralScore: number
  hookSummary: string
  wordTimestamps: { word: string; start: number; end: number; highlight?: boolean }[]
  previewUrl: string
  appliedOverlay?: string[]
  appliedSfx?: string[]
  appliedMusic?: string
  isExported?: boolean
}

const DURATION_OPTIONS = ['15s', '30s', '60s', '90s', '120s', 'Personalizado']

export default function AIClipper() {
  const navigate = useNavigate()

  // Inputs
  const [sourceType, setSourceType] = useState<'youtube' | 'upload'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedDuration, setSelectedDuration] = useState('60s')
  const [customDuration, setCustomDuration] = useState('45')

  // Pipeline de Processamento
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressStep, setProgressStep] = useState<number>(0)
  const [processingStatus, setProcessingStepStatus] = useState<string>('')

  // Resultado dos Clipes
  const [clips, setClips] = useState<GeneratedClip[]>([])
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Exportação em Lote
  const [isBatchExporting, setIsBatchExporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)

  const activeClip = clips.find((c) => c.id === activeClipId) || clips[0]

  // Upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        toast.error('O arquivo deve ter no máximo 200MB')
        return
      }
      setUploadedFile(file)
      toast.success(`Arquivo ${file.name} carregado!`)
    }
  }

  // Executar Pipeline Auto-Clipper IA
  const handleStartClipping = async () => {
    if (sourceType === 'youtube' && !youtubeUrl.trim()) {
      toast.error('Informe a URL do vídeo do YouTube')
      return
    }
    if (sourceType === 'upload' && !uploadedFile) {
      toast.error('Faça o upload do arquivo MP4')
      return
    }

    setIsProcessing(true)
    setProgressStep(10)
    setProcessingStepStatus('Extraindo faixa de áudio em alta fidelidade...')

    // Simulação do Pipeline em etapas reais
    setTimeout(() => {
      setProgressStep(35)
      setProcessingStepStatus('Transcrevendo áudio palavra a palavra (OpenAI Whisper)...')
    }, 1500)

    setTimeout(() => {
      setProgressStep(65)
      setProcessingStepStatus('Analisando retenção e trechos virais com GPT-4o...')
    }, 3500)

    setTimeout(() => {
      setProgressStep(85)
      setProcessingStepStatus('Geração de títulos, legendas Hormozi e reframe 9:16...')
    }, 5500)

    setTimeout(() => {
      setProgressStep(100)
      setProcessingStepStatus('Injetando transições, SFX e sincronizando áudio...')

      // Mock de Clipes Gerados em Nível Profissional
      const generated: GeneratedClip[] = [
        {
          id: 'clip-1',
          title: 'O Maior Erro dos Criadores de Conteúdo em 2026',
          description:
            'Estratégia para aumentar a retenção nos primeiros 3 segundos de Reels e TikTok.',
          hashtags: ['#MarketingDigital', '#CriadoresDeConteudo', '#Visualizacoes', '#ReelsViral'],
          startTime: 12,
          endTime: 72,
          duration: 60,
          viralScore: 98,
          hookSummary: 'Pergunta provocativa + revelação de bastidores de engajamento.',
          previewUrl:
            'https://img.usecurling.com/p/1080/1920?q=podcaster+talking+mic+neon&color=purple',
          // IA escolheu: tom de marketing/revelação → HUD cyber + seta vermelha + woosh impactante
          appliedOverlay: ['ov-cyber-1', 'ov-arrow-1'],
          appliedSfx: ['sfx-woosh-1', 'sfx-cliques-2'],
          appliedMusic: 'cc-8',
          wordTimestamps: [
            { word: 'SE', start: 0, end: 0.2 },
            { word: 'VOCÊ', start: 0.2, end: 0.4, highlight: true },
            { word: 'AINDA', start: 0.4, end: 0.6 },
            { word: 'FAZ', start: 0.6, end: 0.8 },
            { word: 'ISSO', start: 0.8, end: 1.1, highlight: true },
            { word: 'ESTÁ', start: 1.1, end: 1.3 },
            { word: 'PERDENDO', start: 1.3, end: 1.7, highlight: true },
            { word: 'MILHARES', start: 1.7, end: 2.1 },
            { word: 'DE', start: 2.1, end: 2.3 },
            { word: 'PLAYERS!', start: 2.3, end: 2.8, highlight: true },
          ],
        },
        {
          id: 'clip-2',
          title: 'Como Vender Sem Parecer Chato na Internet',
          description:
            'A técnica de storytelling com ducking de áudio que converte seguidores em clientes pagantes.',
          hashtags: ['#Vendas', '#Storytelling', '#Copywriting', '#LumenStudio'],
          startTime: 140,
          endTime: 185,
          duration: 45,
          viralScore: 94,
          hookSummary: 'Quebra de objeção imediata com exemplo de bastidores.',
          previewUrl: 'https://img.usecurling.com/p/1080/1920?q=business+man+explaining+stage',
          // IA escolheu: storytelling/vendas → film burn quente + bokeh + notificação
          appliedOverlay: ['ov-burn-1', 'ov-soft-bokeh'],
          appliedSfx: ['sfx-msg-1', 'sfx-woosh-2'],
          appliedMusic: 'cc-5',
          wordTimestamps: [
            { word: 'NINGUÉM', start: 0, end: 0.3, highlight: true },
            { word: 'GOSTA', start: 0.3, end: 0.5 },
            { word: 'DE', start: 0.5, end: 0.6 },
            { word: 'ANÚNCIO,', start: 0.6, end: 1.0, highlight: true },
            { word: 'MAS', start: 1.0, end: 1.2 },
            { word: 'TODO', start: 1.2, end: 1.4 },
            { word: 'MUNDO', start: 1.4, end: 1.6 },
            { word: 'AMAR', start: 1.6, end: 1.9, highlight: true },
            { word: 'HISTÓRIAS!', start: 1.9, end: 2.5, highlight: true },
          ],
        },
        {
          id: 'clip-3',
          title: '3 Ferramentas de IA Que Substituem uma Equipe',
          description:
            'Economize horas de edição utilizando inteligência artificial sincronizada com trilhas CapCut.',
          hashtags: ['#IA', '#Produtividade', '#FerramentasIA', '#TechBR'],
          startTime: 290,
          endTime: 320,
          duration: 30,
          viralScore: 91,
          hookSummary: 'Lista rápida com alto valor percebido e ganchos dinâmicos.',
          previewUrl: 'https://img.usecurling.com/p/1080/1920?q=futuristic+interface+ai+purple',
          // IA escolheu: tech/IA → circuito neon + glitch retro + cliques + teclado
          appliedOverlay: ['ov-cyber-2', 'ov-retro-2'],
          appliedSfx: ['sfx-cliques-1', 'sfx-teclado-1'],
          appliedMusic: 'cc-3',
          wordTimestamps: [
            { word: 'ESSAS', start: 0, end: 0.2 },
            { word: 'TRÊS', start: 0.2, end: 0.4, highlight: true },
            { word: 'IAS', start: 0.4, end: 0.6, highlight: true },
            { word: 'VÃO', start: 0.6, end: 0.8 },
            { word: 'MUDAR', start: 0.8, end: 1.1, highlight: true },
            { word: 'SEU', start: 1.1, end: 1.3 },
            { word: 'JOGO!', start: 1.3, end: 1.8, highlight: true },
          ],
        },
      ]

      setClips(generated)
      setActiveClipId(generated[0].id)
      setIsProcessing(false)
      toast.success('3 clipes virais extraídos e formatados em 9:16!')
    }, 7500)
  }

  // Agendar Clipe para Postagem
  const handleScheduleClip = (clip: GeneratedClip) => {
    try {
      const savedPosts = JSON.parse(localStorage.getItem('lumen_posts') || '[]')
      const d = new Date()
      d.setHours(d.getHours() + 4)

      const newPost = {
        id: `post-clipper-${Date.now()}`,
        title: clip.title,
        caption: `${clip.description}\n\n${clip.hashtags.join(' ')}`,
        mediaUrls: [clip.previewUrl],
        platforms: ['instagram', 'tiktok'],
        scheduledAt: d.toISOString(),
        status: 'scheduled',
        hashtags: clip.hashtags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      savedPosts.unshift(newPost)
      localStorage.setItem('lumen_posts', JSON.stringify(savedPosts))
      toast.success(`Clip "${clip.title}" agendado no Calendário de Postagens!`, {
        action: {
          label: 'Ver no Agendamento',
          onClick: () => navigate('/agendamento'),
        },
      })
    } catch {
      toast.error('Falha ao agendar postagem')
    }
  }

  // Exportação em Lote
  const handleBatchExport = () => {
    if (clips.length === 0) return
    setIsBatchExporting(true)
    setBatchProgress(0)

    const interval = setInterval(() => {
      setBatchProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setIsBatchExporting(false)
          setClips((prev) => prev.map((c) => ({ ...c, isExported: true })))
          toast.success('Lote exportado com sucesso em MP4 1080p (9:16).')
          return 100
        }
        return p + 20
      })
    }, 600)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white tracking-wider">
              LUMEN Studio Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 mt-1">
            <Scissors className="w-8 h-8 text-[#7C5CFC]" /> Auto-Clipper IA
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1 max-w-2xl">
            Transforme podcasts e vídeos longos do YouTube em cortes verticais virais (9:16) com
            legendas dinâmicas Alex Hormozi. A IA analisa cada trecho e escolhe automaticamente os
            melhores overlays, SFX e trilhas CapCut — combinando efeitos diferentes por clipe de
            acordo com o tom e o conteúdo de cada momento.
          </p>
        </div>
        {clips.length > 0 && (
          <Button
            onClick={handleBatchExport}
            disabled={isBatchExporting}
            className="bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/30 gap-2 shrink-0"
          >
            {isBatchExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Exportando Lote ({batchProgress}%)
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Exportar Todos os Clipes (Lote MP4)
              </>
            )}
          </Button>
        )}
      </div>

      {/* 1. Painel de Entrada de Mídia */}
      <div className="bg-[#14141C] border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[#22D3EE]" /> 1. Fonte do Vídeo e Configuração
        </h2>

        {/* Alternador YouTube vs Upload */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSourceType('youtube')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              sourceType === 'youtube'
                ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white'
                : 'border-white/10 text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500" /> Link do YouTube
          </button>
          <button
            onClick={() => setSourceType('upload')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              sourceType === 'upload'
                ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white'
                : 'border-white/10 text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-4 h-4 text-[#22D3EE]" /> Upload MP4 Local
          </button>
        </div>

        {/* Input conforme opção */}
        {sourceType === 'youtube' ? (
          <div>
            <label className="text-xs text-[#9494A8] block mb-1.5">Cole a URL do Vídeo</label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="bg-[#1C1C27] border-white/10 text-xs text-white"
            />
          </div>
        ) : (
          <div>
            <label className="text-xs text-[#9494A8] block mb-1.5">Arquivo de Vídeo MP4</label>
            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-white/15 hover:border-[#7C5CFC]/50 cursor-pointer transition-colors bg-[#1C1C27]/50">
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-[#9494A8] mb-1" />
              <span className="text-xs text-[#9494A8]">
                {uploadedFile ? uploadedFile.name : 'Clique para selecionar o MP4 (até 200MB)'}
              </span>
            </label>
          </div>
        )}

        {/* Seleção de Duração */}
        <div>
          <label className="text-xs text-[#9494A8] block mb-2">Duração Alvo dos Clipes</label>
          <div className="flex items-center gap-2 flex-wrap">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedDuration(opt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedDuration === opt
                    ? 'bg-[#7C5CFC] border-[#7C5CFC] text-white'
                    : 'bg-[#1C1C27] border-white/10 text-[#9494A8] hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
            {selectedDuration === 'Personalizado' && (
              <div className="flex items-center gap-1.5 ml-2">
                <Input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="w-20 h-8 bg-[#1C1C27] border-white/10 text-xs text-white"
                />
                <span className="text-xs text-[#9494A8]">segundos</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Disparo */}
        <Button
          onClick={handleStartClipping}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-[#7C5CFC] via-[#906BFC] to-[#22D3EE] text-white font-extrabold text-sm py-3 rounded-xl shadow-xl shadow-[#7C5CFC]/25 hover:opacity-95 transition-all gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processando Auto-Clipper IA...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 animate-pulse" /> Processar Vídeo & Gerar Clipes Virais
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar do Pipeline */}
      {isProcessing && (
        <div className="p-6 rounded-2xl bg-[#14141C] border border-[#7C5CFC]/40 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-white font-bold">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#22D3EE] animate-spin" /> {processingStatus}
            </span>
            <span>{progressStep}%</span>
          </div>
          <Progress value={progressStep} className="h-2 bg-white/10" />
        </div>
      )}

      {/* 2. Resultados dos Clipes e Preview Individual */}
      {clips.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" /> Clipes Sugeridos pela IA ({clips.length})
            </h2>
            <span className="text-xs text-[#22D3EE] font-mono font-bold">
              Formato Vertical 9:16 Preparado
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Cards de Clipes */}
            <div className="space-y-3 lg:col-span-1">
              {clips.map((clip) => {
                const isActive = activeClipId === clip.id
                return (
                  <div
                    key={clip.id}
                    onClick={() => setActiveClipId(clip.id)}
                    className={`p-4 rounded-2xl bg-[#14141C] border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isActive
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 shadow-lg shadow-[#7C5CFC]/20'
                        : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Score {clip.viralScore}/100
                        </span>
                        <span className="text-[10px] text-[#9494A8] font-mono">
                          {clip.duration}s
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-white truncate">{clip.title}</h3>
                      <p className="text-[11px] text-[#9494A8] line-clamp-2">{clip.hookSummary}</p>
                    </div>
                    {clip.isExported && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Preview Individual e Detalhes do Clipe Selecionado */}
            {activeClip && (
              <div className="lg:col-span-2 bg-[#14141C] border border-white/10 rounded-2xl p-6 space-y-6 flex flex-col md:flex-row gap-6">
                {/* Canvas Simulator 9:16 com Legendas Hormozi e Overlays */}
                <div className="relative w-full md:w-64 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl shrink-0 flex flex-col items-center justify-between p-4 group">
                  <img
                    src={activeClip.previewUrl}
                    alt={activeClip.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-85"
                  />

                  {/* Badge de Efeitos Escolhidos pela IA */}
                  <div className="relative z-10 self-start bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white flex flex-col gap-0.5 max-w-[150px]">
                    <span className="text-[#22D3EE] font-extrabold uppercase tracking-wide">
                      Overlays IA
                    </span>
                    {(activeClip.appliedOverlay ?? []).map((oid) => {
                      const ov = getOverlayById(oid)
                      return (
                        <span key={oid} className="text-white/90 truncate">
                          • {ov ? `${ov.category}: ${ov.name}` : oid}
                        </span>
                      )
                    })}
                    <span className="text-[#FBBF24] font-extrabold uppercase tracking-wide mt-0.5">
                      SFX IA
                    </span>
                    {(activeClip.appliedSfx ?? []).map((sid) => {
                      const sfx = getSfxById(sid)
                      return (
                        <span key={sid} className="text-white/90 truncate">
                          • {sfx ? `${sfx.category}: ${sfx.name}` : sid}
                        </span>
                      )
                    })}
                    {(() => {
                      const track = activeClip.appliedMusic
                        ? getTrackById(activeClip.appliedMusic)
                        : undefined
                      return (
                        <span className="text-[#7C5CFC] font-extrabold uppercase tracking-wide mt-0.5 truncate">
                          {track ? `${track.title} (${track.genre})` : activeClip.appliedMusic}
                        </span>
                      )
                    })()}
                    <span className="text-[#9494A8] mt-0.5">Ducking CapCut: -18dB</span>
                  </div>

                  {/* Legenda Dinâmica Estilo Alex Hormozi */}
                  <div className="relative z-10 my-auto text-center px-2">
                    <div className="bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl space-y-1">
                      <p className="text-xs font-black tracking-wide text-white uppercase flex flex-wrap justify-center gap-1">
                        {activeClip.wordTimestamps.map((wt, i) => (
                          <span
                            key={i}
                            className={
                              wt.highlight
                                ? 'text-[#FBBF24] bg-[#FBBF24]/20 px-1 rounded animate-pulse'
                                : 'text-white'
                            }
                          >
                            {wt.word}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>

                  {/* Botão Play Simulado */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="relative z-10 p-3 rounded-full bg-[#7C5CFC] text-white shadow-xl hover:scale-110 transition-transform mb-2"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Detalhes, Título, Hashtags e Agendamento */}
                <div className="flex-1 space-y-4 min-w-0">
                  <div>
                    <span className="text-[10px] text-[#22D3EE] font-extrabold uppercase tracking-wider">
                      Título Viral Otimizado
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{activeClip.title}</h3>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#9494A8] font-bold uppercase tracking-wider block mb-1">
                      Descrição & Legenda
                    </span>
                    <p className="text-xs text-[#9494A8] bg-[#1C1C27] p-3 rounded-xl border border-white/5">
                      {activeClip.description}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#9494A8] font-bold uppercase tracking-wider block mb-1">
                      Hashtags Recomendadas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeClip.hashtags.map((h) => (
                        <span
                          key={h}
                          className="text-[11px] text-[#7C5CFC] bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 px-2 py-0.5 rounded-lg font-mono"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => handleScheduleClip(activeClip)}
                      className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold px-4 py-2 rounded-xl gap-2"
                    >
                      <Calendar className="w-4 h-4" /> Agendar Postagem
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.success('Clip exportado individualmente!')
                        setClips((prev) =>
                          prev.map((c) =>
                            c.id === activeClip.id ? { ...c, isExported: true } : c,
                          ),
                        )
                      }}
                      className="border-white/10 text-xs text-white hover:bg-white/5 gap-2"
                    >
                      <Download className="w-4 h-4" /> Baixar MP4
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
