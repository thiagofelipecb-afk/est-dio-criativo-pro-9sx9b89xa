import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { Project, TimelineClip, SubtitleBlock, AISuggestion } from '@/types/studio'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Scissors,
  Layers,
  Type,
  Music,
  Sliders,
  Plus,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Save,
  Download,
  Calendar,
  Eye,
  Camera,
  Wand2,
  CheckCircle2,
  Split,
  ZoomIn,
  ZoomOut,
  Palette,
  Film,
  Sparkle,
  ArrowRight,
  Flame,
  Clock,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function EditorVideo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getProjectById,
    updateProject,
    mediaLibrary,
    addMediaItem,
    addAiSuggestion,
    appliedAiSuggestions,
    revertAiSuggestion,
    schedulePost,
  } = useStudio()

  const project = getProjectById(id || '')

  // Fallback project if not found or created on the fly
  const [currentProject, setCurrentProject] = useState<Project | null>(() => {
    return (
      project || {
        id: id || 'proj-temp',
        title: 'Edição de Vídeo com IA',
        type: 'reel',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: 30,
        thumbnail: 'https://img.usecurling.com/p/600/1066?q=video+editor+neon&color=purple',
        aspectRatio: '9:16',
        resolution: '1080p',
        status: 'draft',
        clips: [
          {
            id: 'c-main',
            track: 'video',
            name: 'Clipe Principal',
            startTime: 0,
            duration: 20,
            sourceUrl:
              'https://img.usecurling.com/p/1080/1920?q=podcaster+studio+talking&color=purple',
            mediaType: 'video',
            volume: 100,
          },
        ],
        subtitles: [],
      }
    )
  })

  // History stack for undo/redo
  const [history, setHistory] = useState<Project[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const pushHistory = (newProjState: Project) => {
    const updatedHistory = history.slice(0, historyIndex + 1)
    setHistory([...updatedHistory, newProjState])
    setHistoryIndex(updatedHistory.length)
    setCurrentProject(newProjState)
    if (id) {
      updateProject(id, newProjState)
    }
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setCurrentProject(prev)
      if (id) updateProject(id, prev)
      toast.info('Ação desfeita.')
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setCurrentProject(next)
      if (id) updateProject(id, next)
      toast.info('Ação refeita.')
    }
  }

  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null)

  // Timeline zoom
  const [timelineZoom, setTimelineZoom] = useState(25) // pixels per second

  // AI Assistant Modal/Sidebar state
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiActionMessage, setAiActionMessage] = useState('')
  const [aiSuggestionsList, setAiSuggestionsList] = useState<
    { id: string; type: string; title: string; desc: string; payload: any }[]
  >([])

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportResolution, setExportResolution] = useState<'1080p' | '4K' | '720p'>('1080p')
  const [exportFormat, setExportFormat] = useState<'mp4' | 'mov' | 'webm'>('mp4')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  // Subtitle editor state
  const [newSubText, setNewSubText] = useState('')
  const [subFontSize, setSubFontSize] = useState(28)
  const [subColor, setSubColor] = useState('#FFFFFF')
  const [subBgColor, setSubBgColor] = useState('#7C5CFC')
  const [subAnimation, setSubAnimation] = useState<'none' | 'bounce' | 'slide' | 'fade' | 'pop'>(
    'bounce',
  )

  // Selected clip for properties
  const selectedClip = currentProject?.clips.find((c) => c.id === selectedClipId)

  // Playback timer ticker
  useEffect(() => {
    let interval: any
    if (isPlaying && currentProject) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= currentProject.duration) {
            setIsPlaying(false)
            return 0
          }
          return Math.min(currentProject.duration, prev + 0.1)
        })
      }, 100)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentProject?.duration])

  if (!currentProject) return null

  // 1. AI Actions
  const handleRunAi = (actionType: string) => {
    setIsAiLoading(true)
    setAiActionMessage('Processando inteligência artificial...')

    setTimeout(() => {
      setIsAiLoading(false)

      if (actionType === 'subtitles') {
        const generatedSubs: SubtitleBlock[] = [
          {
            id: 'sub-auto-1',
            startTime: 0,
            endTime: 4.5,
            text: 'Descubra agora a regra dos 3 primeiros segundos.',
            style: {
              fontSize: 28,
              color: '#FFFFFF',
              bgColor: '#7C5CFC',
              fontFamily: 'Inter',
              shadow: true,
              animation: 'bounce',
            },
          },
          {
            id: 'sub-auto-2',
            startTime: 4.6,
            endTime: 9.8,
            text: 'Cortes rápidos aumentam a retenção em 75% no TikTok.',
            style: {
              fontSize: 28,
              color: '#22D3EE',
              bgColor: '#14141C',
              fontFamily: 'Inter',
              shadow: true,
              animation: 'pop',
            },
          },
          {
            id: 'sub-auto-3',
            startTime: 10.0,
            endTime: 16.2,
            text: 'Aplique esta técnica em todos os seus Reels!',
            style: {
              fontSize: 32,
              color: '#FBBF24',
              bgColor: '#14141C',
              fontFamily: 'Inter',
              shadow: true,
              animation: 'bounce',
            },
          },
        ]
        const updated = {
          ...currentProject,
          subtitles: generatedSubs,
        }
        pushHistory(updated)
        toast.success('Legendas automáticas geradas com destaque por palavra!')
      } else if (actionType === 'cuts') {
        // Cut pauses
        const updatedClips: TimelineClip[] = [
          {
            id: 'cut-1',
            track: 'video',
            name: 'Gancho (Sem Silêncio)',
            startTime: 0,
            duration: 8,
            sourceUrl: currentProject.clips[0]?.sourceUrl,
            mediaType: 'video',
            volume: 100,
          },
          {
            id: 'cut-2',
            track: 'video',
            name: 'Explicação Dinâmica',
            startTime: 8,
            duration: 12,
            sourceUrl: currentProject.clips[0]?.sourceUrl,
            mediaType: 'video',
            volume: 100,
            transitionIn: 'slide',
          },
        ]
        const updated = {
          ...currentProject,
          clips: [...updatedClips, ...currentProject.clips.filter((c) => c.track !== 'video')],
          duration: 20,
        }
        pushHistory(updated)
        toast.success('4 pausas e silêncios cortados automaticamente!')
      } else if (actionType === 'music') {
        const musicClip: TimelineClip = {
          id: 'audio-ai-' + Date.now(),
          track: 'audio',
          name: 'Trilha Sonora: Cyber Pulse Beat',
          startTime: 0,
          duration: currentProject.duration,
          mediaType: 'audio',
          volume: 30,
          fadeIn: 1,
          fadeOut: 2,
          ducking: true,
        }
        const updated = {
          ...currentProject,
          clips: [...currentProject.clips.filter((c) => c.track !== 'audio'), musicClip],
        }
        pushHistory(updated)
        toast.success('Trilha sonora adicionada com ducking automático!')
      } else if (actionType === 'broll') {
        const brollClip: TimelineClip = {
          id: 'broll-ai-' + Date.now(),
          track: 'insert',
          name: 'B-Roll Tecnológico',
          startTime: 3,
          duration: 4,
          sourceUrl: 'https://img.usecurling.com/p/1080/1920?q=high+tech+workspace+neon&color=cyan',
          mediaType: 'image',
          x: 50,
          y: 50,
        }
        const updated = {
          ...currentProject,
          clips: [...currentProject.clips, brollClip],
        }
        pushHistory(updated)
        toast.success('B-roll contextual inserido no ponto de retenção!')
      }
    }, 1200)
  }

  // 2. Timeline actions
  const handleSplitClip = () => {
    if (!selectedClip || selectedClip.track !== 'video') {
      toast.warning('Selecione um clipe de vídeo para cortar na posição atual da agulha.')
      return
    }
    const relativeTime = currentTime - selectedClip.startTime
    if (relativeTime <= 1 || relativeTime >= selectedClip.duration - 1) {
      toast.warning('Posicione a agulha de reprodução no meio do clipe selecionado para dividir.')
      return
    }

    const firstHalf: TimelineClip = {
      ...selectedClip,
      duration: relativeTime,
      name: `${selectedClip.name} (Parte 1)`,
    }
    const secondHalf: TimelineClip = {
      ...selectedClip,
      id: 'clip-' + Date.now(),
      startTime: currentTime,
      duration: selectedClip.duration - relativeTime,
      name: `${selectedClip.name} (Parte 2)`,
      transitionIn: 'dissolve',
    }

    const updatedClips = currentProject.clips
      .filter((c) => c.id !== selectedClip.id)
      .concat([firstHalf, secondHalf])

    pushHistory({ ...currentProject, clips: updatedClips })
    setSelectedClipId(secondHalf.id)
    toast.success('Clipe dividido na posição atual!')
  }

  const handleDeleteSelectedClip = () => {
    if (!selectedClipId) return
    const updatedClips = currentProject.clips.filter((c) => c.id !== selectedClipId)
    pushHistory({ ...currentProject, clips: updatedClips })
    setSelectedClipId(null)
    toast.success('Elemento removido da timeline.')
  }

  const handleAddInsert = (type: 'sticker' | 'shape' | 'text', content: string) => {
    const newInsert: TimelineClip = {
      id: 'insert-' + Date.now(),
      track: 'insert',
      name: content,
      startTime: currentTime,
      duration: 5,
      mediaType: type,
      content: content,
      x: 50,
      y: 50,
      scale: 1,
    }
    pushHistory({
      ...currentProject,
      clips: [...currentProject.clips, newInsert],
    })
    setSelectedClipId(newInsert.id)
    toast.success(`Elemento "${content}" adicionado!`)
  }

  const handleAddSubtitleManual = () => {
    if (!newSubText.trim()) return
    const newSub: SubtitleBlock = {
      id: 'sub-' + Date.now(),
      startTime: currentTime,
      endTime: Math.min(currentProject.duration, currentTime + 3.5),
      text: newSubText.trim(),
      style: {
        fontSize: subFontSize,
        color: subColor,
        bgColor: subBgColor,
        fontFamily: 'Inter',
        shadow: true,
        animation: subAnimation,
      },
    }
    pushHistory({
      ...currentProject,
      subtitles: [...currentProject.subtitles, newSub],
    })
    setNewSubText('')
    toast.success('Legenda adicionada!')
  }

  // 3. Export Simulation
  const handleStartExport = () => {
    setIsExporting(true)
    setExportProgress(10)
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          setIsExportModalOpen(false)
          toast.success(`Vídeo renderizado com sucesso em ${exportResolution}!`, {
            description: 'Download do arquivo iniciado.',
          })
          return 100
        }
        return prev + 20
      })
    }, 400)
  }

  const handleQuickSchedule = () => {
    schedulePost({
      title: currentProject.title,
      mediaUrl: currentProject.thumbnail,
      mediaType: 'video',
      platforms: ['instagram', 'tiktok'],
      scheduledDate: new Date(Date.now() + 3600000 * 4).toISOString(),
      caption: `Confira meu novo vídeo criado no LUMEN Studio com IA! 🚀🔥 #lumenstudio #criador #ia`,
      hashtags: ['#lumenstudio', '#reels', '#edicaovideo', '#ia'],
      status: 'scheduled',
    })
    navigate('/agendamento')
    toast.success('Projeto adicionado à Fila de Agendamento!')
  }

  // Active subtitles on screen at current time
  const activeSubtitle = currentProject.subtitles.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime,
  )

  // Active inserts on screen
  const activeInserts = currentProject.clips.filter(
    (c) =>
      c.track === 'insert' && currentTime >= c.startTime && currentTime <= c.startTime + c.duration,
  )

  return (
    <div className="h-full flex flex-col bg-[#0B0B10] text-white select-none overflow-hidden animate-fade-in">
      {/* 1. TOP ACTION BAR */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-[#14141C] shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projetos')}
            className="text-xs text-[#9494A8] hover:text-white"
          >
            ← Voltar
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
            {currentProject.title}
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] font-semibold">
            {currentProject.aspectRatio}
          </span>
        </div>

        {/* Center: Undo/Redo & Save */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-8 px-2 text-[#9494A8] hover:text-white disabled:opacity-30"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 px-2 text-[#9494A8] hover:text-white disabled:opacity-30"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (id) updateProject(id, currentProject)
              toast.success('Projeto salvo com sucesso!')
            }}
            className="h-8 px-2.5 text-xs text-white hover:bg-white/10 gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-[#22D3EE]" /> Salvar
          </Button>
        </div>

        {/* Right CTAs: Teleprompter, Export, Schedule */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/teleprompter')}
            className="h-8 text-xs border-white/10 text-[#9494A8] hover:text-white hover:bg-white/5 hidden md:flex items-center gap-1.5"
          >
            Teleprompter
          </Button>

          <Button
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="h-8 bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-white text-xs font-semibold gap-1.5 shadow-md shadow-[#7C5CFC]/30"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>

          <Button
            size="sm"
            onClick={handleQuickSchedule}
            className="h-8 bg-[#22D3EE] hover:bg-[#1CBAD1] text-black text-xs font-bold gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> Agendar
          </Button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (Preview + AI Panel + Properties Panel) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        {/* CENTER PREVIEW (6 cols on large screen) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[#07070A] flex flex-col items-center justify-center p-3 relative overflow-hidden">
          {/* Aspect Ratio Video Canvas Container */}
          <div
            className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center transition-all ${
              currentProject.aspectRatio === '9:16'
                ? 'h-[85%] aspect-[9/16]'
                : currentProject.aspectRatio === '16:9'
                  ? 'w-[90%] aspect-[16/9]'
                  : 'h-[85%] aspect-square'
            }`}
          >
            {/* Base Video Thumbnail / Playback Display */}
            <img
              src={currentProject.clips[0]?.sourceUrl || currentProject.thumbnail}
              alt="Preview"
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{
                filter:
                  selectedClip?.filter === 'cinematic'
                    ? 'contrast(120%) saturate(130%)'
                    : selectedClip?.filter === 'vintage'
                      ? 'sepia(40%) contrast(90%)'
                      : selectedClip?.filter === 'neon'
                        ? 'hue-rotate(90deg) contrast(140%)'
                        : 'none',
              }}
            />

            {/* Dynamic Active Subtitle on Player */}
            {activeSubtitle && (
              <div
                className={`absolute bottom-12 left-6 right-6 text-center select-none pointer-events-none transition-all ${
                  activeSubtitle.style?.animation === 'bounce'
                    ? 'animate-bounce'
                    : activeSubtitle.style?.animation === 'pop'
                      ? 'scale-110'
                      : ''
                }`}
              >
                <span
                  className="px-3 py-1.5 rounded-xl font-extrabold tracking-wide drop-shadow-2xl inline-block"
                  style={{
                    fontSize: `${activeSubtitle.style?.fontSize || 26}px`,
                    color: activeSubtitle.style?.color || '#FFFFFF',
                    backgroundColor: activeSubtitle.style?.bgColor || 'rgba(0,0,0,0.7)',
                    textShadow: activeSubtitle.style?.shadow
                      ? '0 4px 12px rgba(0,0,0,0.8)'
                      : 'none',
                  }}
                >
                  {activeSubtitle.text}
                </span>
              </div>
            )}

            {/* Dynamic Active Inserts (Stickers, Arrows, Overlays) */}
            {activeInserts.map((ins) => (
              <div
                key={ins.id}
                className="absolute z-20 cursor-move p-2 rounded-xl bg-black/60 border border-[#7C5CFC]/60 backdrop-blur-md shadow-xl text-white text-xs font-bold animate-fade-in"
                style={{
                  top: `${ins.y || 50}%`,
                  left: `${ins.x || 50}%`,
                  transform: `translate(-50%, -50%) scale(${ins.scale || 1})`,
                }}
              >
                {ins.mediaType === 'image' && ins.sourceUrl ? (
                  <img
                    src={ins.sourceUrl}
                    alt="B-roll"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <span>{ins.content || ins.name}</span>
                )}
              </div>
            ))}

            {/* Center Play Button Overlay on Pause */}
            {!isPlaying && (
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#7C5CFC]/90 hover:bg-[#7C5CFC] text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition-transform hover:scale-110 z-30"
              >
                <Play className="w-6 h-6 fill-current ml-1" />
              </button>
            )}
          </div>

          {/* Scrubber Player Controls Bar */}
          <div className="w-full max-w-xl mt-2 px-4 py-2 rounded-xl bg-[#14141C]/80 backdrop-blur-md border border-white/5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTime(0)}
                className="p-1.5 rounded-lg text-[#9494A8] hover:text-white"
                title="Voltar ao Início"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg text-white bg-[#7C5CFC] hover:bg-[#6A48E0]"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={() => setCurrentTime(currentProject.duration)}
                className="p-1.5 rounded-lg text-[#9494A8] hover:text-white"
                title="Avançar ao Fim"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Time Indicator */}
            <div className="font-mono text-xs text-white">
              {currentTime.toFixed(1)}s / {currentProject.duration.toFixed(1)}s
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 w-28">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-[#9494A8] hover:text-white"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => {
                  setVolume(val[0])
                  setIsMuted(false)
                }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Properties & AI Toolkit (5 cols on large screen) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-[#14141C] border-l border-white/10 flex flex-col h-full overflow-hidden">
          <Tabs defaultValue="ai" className="flex-1 flex flex-col min-h-0">
            <div className="px-3 pt-2 border-b border-white/5">
              <TabsList className="w-full bg-[#1C1C27] grid grid-cols-4 p-1 rounded-xl">
                <TabsTrigger
                  value="ai"
                  className="text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7C5CFC] data-[state=active]:to-[#22D3EE] data-[state=active]:text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-[#22D3EE]" /> IA Pro
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <Type className="w-3.5 h-3.5 mr-1" /> Legendas
                </TabsTrigger>
                <TabsTrigger value="inserts" className="text-xs">
                  <Layers className="w-3.5 h-3.5 mr-1" /> Inserts
                </TabsTrigger>
                <TabsTrigger value="effects" className="text-xs">
                  <Palette className="w-3.5 h-3.5 mr-1" /> Efeitos
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: AI Assistant Toolkit */}
            <TabsContent
              value="ai"
              className="flex-1 overflow-y-auto p-4 space-y-4 focus:outline-none"
            >
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#7C5CFC]/15 via-[#1C1C27] to-[#22D3EE]/10 border border-[#7C5CFC]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#22D3EE] animate-pulse" />
                    Assistente de Edição por IA
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C5CFC]/30 text-[#7C5CFC]">
                    GPT-4 Vision Video
                  </span>
                </div>
                <p className="text-[11px] text-[#9494A8]">
                  Execute comandos neurais para acelerar o ritmo, sincronizar legendas e reter a
                  audiência.
                </p>
              </div>

              {isAiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-[#7C5CFC] border-t-transparent animate-spin" />
                    <Sparkles className="w-5 h-5 text-[#22D3EE] absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">IA LUMEN Processando...</h4>
                    <p className="text-xs text-[#9494A8] mt-1">{aiActionMessage}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => handleRunAi('subtitles')}
                    className="w-full text-left p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-[#7C5CFC]/20 text-[#7C5CFC] group-hover:scale-110 transition-transform">
                        <Type className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#7C5CFC] transition-colors">
                          Gerar Legendas Automáticas
                        </h4>
                        <p className="text-[10px] text-[#9494A8]">
                          Reconhecimento de fala com animação e cor por palavra
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9494A8] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => handleRunAi('cuts')}
                    className="w-full text-left p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
                        <Scissors className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                          Cortar Pausas & Silêncios
                        </h4>
                        <p className="text-[10px] text-[#9494A8]">
                          Elimina gaguejos e momentos vazios automaticamente
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9494A8] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => handleRunAi('music')}
                    className="w-full text-left p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                        <Music className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          Adicionar Trilha & Ajustar Ritmo
                        </h4>
                        <p className="text-[10px] text-[#9494A8]">
                          Corta takes no beat e aplica ducking na voz
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9494A8] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => handleRunAi('broll')}
                    className="w-full text-left p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-[#22D3EE]/20 text-[#22D3EE] group-hover:scale-110 transition-transform">
                        <Film className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#22D3EE] transition-colors">
                          Preencher Vazios com B-Roll
                        </h4>
                        <p className="text-[10px] text-[#9494A8]">
                          Insere mídias contextuais nos momentos de tédio
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9494A8] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#9494A8]">Desfazer última alteração de IA:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      className="border-white/10 text-xs text-[#9494A8] hover:text-white"
                    >
                      Desfazer IA
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Text & Subtitles */}
            <TabsContent
              value="text"
              className="flex-1 overflow-y-auto p-4 space-y-4 focus:outline-none"
            >
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Adicionar Nova Legenda
                </h4>
                <div className="space-y-2">
                  <textarea
                    value={newSubText}
                    onChange={(e) => setNewSubText(e.target.value)}
                    placeholder="Digite o texto da legenda para o momento atual..."
                    className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                    rows={2}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#9494A8]">Cor do Texto</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={subColor}
                          onChange={(e) => setSubColor(e.target.value)}
                          className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-white">{subColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#9494A8]">Cor de Fundo</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={subBgColor}
                          onChange={(e) => setSubBgColor(e.target.value)}
                          className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-white">{subBgColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-[#9494A8]">
                      <span>Tamanho da Fonte</span>
                      <span>{subFontSize}px</span>
                    </div>
                    <Slider
                      value={[subFontSize]}
                      min={16}
                      max={48}
                      step={1}
                      onValueChange={(val) => setSubFontSize(val[0])}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#9494A8]">Animação</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['bounce', 'pop', 'slide', 'fade'] as const).map((anim) => (
                        <button
                          key={anim}
                          onClick={() => setSubAnimation(anim)}
                          className={`py-1 text-[10px] rounded-lg font-medium capitalize ${
                            subAnimation === anim
                              ? 'bg-[#7C5CFC] text-white'
                              : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'
                          }`}
                        >
                          {anim}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleAddSubtitleManual}
                    className="w-full bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold mt-2"
                  >
                    Inserir Legenda no Frame Atual
                  </Button>
                </div>

                {/* Subtitles list in project */}
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-white">
                    Blocos de Legenda ({currentProject.subtitles.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {currentProject.subtitles.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          setCurrentTime(sub.startTime)
                          setSelectedSubtitleId(sub.id)
                        }}
                        className={`p-2 rounded-xl bg-[#1C1C27] border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          selectedSubtitleId === sub.id
                            ? 'border-[#7C5CFC] text-white'
                            : 'border-white/5 text-[#9494A8] hover:text-white'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono text-[10px] text-[#22D3EE] mr-2">
                            {sub.startTime.toFixed(1)}s
                          </span>
                          <span>{sub.text}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const updated = currentProject.subtitles.filter((s) => s.id !== sub.id)
                            pushHistory({ ...currentProject, subtitles: updated })
                          }}
                          className="p-1 text-[#9494A8] hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Inserts & Stickers */}
            <TabsContent
              value="inserts"
              className="flex-1 overflow-y-auto p-4 space-y-4 focus:outline-none"
            >
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Inserir Elementos & Overlays
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddInsert('sticker', '🔥 VIRAL')}
                    className="p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-xs font-semibold text-white flex items-center gap-2"
                  >
                    <span>🔥</span> Sticker "VIRAL"
                  </button>
                  <button
                    onClick={() => handleAddInsert('sticker', '⚡ ATENÇÃO')}
                    className="p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-xs font-semibold text-white flex items-center gap-2"
                  >
                    <span>⚡</span> Sticker "ATENÇÃO"
                  </button>
                  <button
                    onClick={() => handleAddInsert('shape', '👉 OLHE AQUI')}
                    className="p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-xs font-semibold text-white flex items-center gap-2"
                  >
                    <span>👉</span> Seta Indicadora
                  </button>
                  <button
                    onClick={() => handleAddInsert('shape', '💡 DICA DE OURO')}
                    className="p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-xs font-semibold text-white flex items-center gap-2"
                  >
                    <span>💡</span> Dica de Ouro
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-white">Inserts na Cena Atual</h4>
                  {activeInserts.length === 0 ? (
                    <p className="text-xs text-[#9494A8]">Nenhum elemento neste frame.</p>
                  ) : (
                    activeInserts.map((ins) => (
                      <div
                        key={ins.id}
                        className="p-2.5 rounded-xl bg-[#1C1C27] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-white">{ins.name}</span>
                        <button
                          onClick={() => {
                            const updated = currentProject.clips.filter((c) => c.id !== ins.id)
                            pushHistory({ ...currentProject, clips: updated })
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Visual Effects & Filters */}
            <TabsContent
              value="effects"
              className="flex-1 overflow-y-auto p-4 space-y-4 focus:outline-none"
            >
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Filtros Cinematográficos
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'cinematic', label: 'Cinematic Pro' },
                    { id: 'vintage', label: 'Vintage 90s' },
                    { id: 'neon', label: 'Cyberpunk Neon' },
                    { id: 'matte', label: 'Dark Matte' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (selectedClip) {
                          const updated = currentProject.clips.map((c) =>
                            c.id === selectedClip.id ? { ...c, filter: f.id } : c,
                          )
                          pushHistory({ ...currentProject, clips: updated })
                          toast.success(`Filtro "${f.label}" aplicado ao clipe!`)
                        } else {
                          toast.info('Selecione um clipe de vídeo na timeline primeiro.')
                        }
                      }}
                      className="p-3 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-left font-medium text-white transition-colors"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-white">Transições Suportadas</h4>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {['dissolver', 'deslizar', 'zoom', 'wipe', 'glitch'].map((trans) => (
                      <button
                        key={trans}
                        onClick={() => toast.success(`Transição ${trans} configurada!`)}
                        className="py-2 px-1 rounded-lg bg-[#1C1C27] text-[#9494A8] hover:text-white capitalize text-center"
                      >
                        {trans}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 3. MULTI-TRACK TIMELINE (Bottom Zone) */}
      <div className="h-48 border-t border-white/10 bg-[#14141C] flex flex-col shrink-0">
        {/* Timeline Toolbar */}
        <div className="h-9 px-4 border-b border-white/5 flex items-center justify-between text-xs bg-[#171722]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSplitClip}
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5 text-[#22D3EE]" /> Dividir (Faca)
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteSelectedClip}
              disabled={!selectedClipId}
              className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-30 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Apagar
            </Button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-2">
            <ZoomOut className="w-3.5 h-3.5 text-[#9494A8]" />
            <Slider
              value={[timelineZoom]}
              min={10}
              max={60}
              step={5}
              className="w-24"
              onValueChange={(val) => setTimelineZoom(val[0])}
            />
            <ZoomIn className="w-3.5 h-3.5 text-[#9494A8]" />
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-2 relative select-none">
          {/* Timeline Ruler & Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none transition-all shadow-[0_0_8px_red]"
            style={{ left: `${currentTime * timelineZoom + 96}px` }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1 shadow" />
          </div>

          <div className="space-y-1.5 min-w-[800px]">
            {/* TRACK 1: TEXT & SUBTITLES */}
            <div className="flex items-center h-8">
              <span className="w-24 text-[10px] font-bold text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3 text-[#7C5CFC]" /> Legendas
              </span>
              <div className="flex-1 h-7 bg-[#1C1C27] rounded-lg relative overflow-hidden border border-white/5">
                {currentProject.subtitles.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setCurrentTime(sub.startTime)
                      setSelectedSubtitleId(sub.id)
                    }}
                    className={`absolute top-1 bottom-1 rounded px-2 text-[10px] font-bold truncate flex items-center cursor-pointer transition-all ${
                      selectedSubtitleId === sub.id
                        ? 'bg-[#7C5CFC] text-white shadow'
                        : 'bg-[#7C5CFC]/40 text-purple-200 hover:bg-[#7C5CFC]/60'
                    }`}
                    style={{
                      left: `${sub.startTime * timelineZoom}px`,
                      width: `${Math.max(30, (sub.endTime - sub.startTime) * timelineZoom)}px`,
                    }}
                  >
                    {sub.text}
                  </div>
                ))}
              </div>
            </div>

            {/* TRACK 2: INSERTS & OVERLAYS */}
            <div className="flex items-center h-8">
              <span className="w-24 text-[10px] font-bold text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#22D3EE]" /> Overlays
              </span>
              <div className="flex-1 h-7 bg-[#1C1C27] rounded-lg relative overflow-hidden border border-white/5">
                {currentProject.clips
                  .filter((c) => c.track === 'insert')
                  .map((clip) => (
                    <div
                      key={clip.id}
                      onClick={() => {
                        setSelectedClipId(clip.id)
                        setCurrentTime(clip.startTime)
                      }}
                      className={`absolute top-1 bottom-1 rounded px-2 text-[10px] font-bold truncate flex items-center cursor-pointer transition-all ${
                        selectedClipId === clip.id
                          ? 'bg-[#22D3EE] text-black shadow'
                          : 'bg-[#22D3EE]/30 text-cyan-200 hover:bg-[#22D3EE]/50'
                      }`}
                      style={{
                        left: `${clip.startTime * timelineZoom}px`,
                        width: `${Math.max(30, clip.duration * timelineZoom)}px`,
                      }}
                    >
                      {clip.name}
                    </div>
                  ))}
              </div>
            </div>

            {/* TRACK 3: MAIN VIDEO TRACK */}
            <div className="flex items-center h-10">
              <span className="w-24 text-[10px] font-bold text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3 text-white" /> Vídeo
              </span>
              <div className="flex-1 h-9 bg-[#1C1C27] rounded-lg relative overflow-hidden border border-white/5">
                {currentProject.clips
                  .filter((c) => c.track === 'video')
                  .map((clip) => (
                    <div
                      key={clip.id}
                      onClick={() => {
                        setSelectedClipId(clip.id)
                        setCurrentTime(clip.startTime)
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg px-2.5 text-xs font-semibold truncate flex items-center justify-between cursor-pointer border transition-all ${
                        selectedClipId === clip.id
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-white/40 shadow-lg'
                          : 'bg-violet-950/60 text-slate-200 border-white/10 hover:bg-violet-900/60'
                      }`}
                      style={{
                        left: `${clip.startTime * timelineZoom}px`,
                        width: `${Math.max(40, clip.duration * timelineZoom)}px`,
                      }}
                    >
                      <span className="truncate">{clip.name}</span>
                      <span className="text-[10px] opacity-70 font-mono">
                        {clip.duration.toFixed(1)}s
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* TRACK 4: AUDIO TRACK */}
            <div className="flex items-center h-8">
              <span className="w-24 text-[10px] font-bold text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
                <Music className="w-3 h-3 text-emerald-400" /> Áudio
              </span>
              <div className="flex-1 h-7 bg-[#1C1C27] rounded-lg relative overflow-hidden border border-white/5">
                {currentProject.clips
                  .filter((c) => c.track === 'audio')
                  .map((clip) => (
                    <div
                      key={clip.id}
                      onClick={() => {
                        setSelectedClipId(clip.id)
                        setCurrentTime(clip.startTime)
                      }}
                      className={`absolute top-1 bottom-1 rounded px-2 text-[10px] font-bold truncate flex items-center cursor-pointer transition-all ${
                        selectedClipId === clip.id
                          ? 'bg-emerald-500 text-black shadow'
                          : 'bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/50'
                      }`}
                      style={{
                        left: `${clip.startTime * timelineZoom}px`,
                        width: `${Math.max(30, clip.duration * timelineZoom)}px`,
                      }}
                    >
                      🎵 {clip.name}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. EXPORT MODAL */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 space-y-4 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC]">
                <Download className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Exportar Vídeo Pro</DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8]">
                  Renderize com aceleração por GPU e taxa de bits otimizada para algoritmos.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isExporting ? (
            <div className="py-6 space-y-3 text-center">
              <div className="w-full bg-[#1C1C27] h-3 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] h-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-xs text-white font-medium">
                Renderizando em {exportResolution}... {exportProgress}%
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#9494A8] block mb-1">Resolução</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1080p', '4K', '720p'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setExportResolution(res)}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                        exportResolution === res
                          ? 'bg-[#7C5CFC] text-white'
                          : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9494A8] block mb-1">Formato</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['mp4', 'mov', 'webm'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                        exportFormat === fmt
                          ? 'bg-[#22D3EE] text-black'
                          : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExportModalOpen(false)}
              className="text-xs text-[#9494A8]"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleStartExport}
              disabled={isExporting}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold"
            >
              Iniciar Renderização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
