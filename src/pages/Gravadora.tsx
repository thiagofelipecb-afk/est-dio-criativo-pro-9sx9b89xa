import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Camera,
  Mic,
  MicOff,
  VideoOff,
  Sparkles,
  QrCode,
  ScrollText,
  Play,
  Square,
  Pause,
  RotateCcw,
  CheckCircle2,
  FolderPlus,
  Sliders,
  Grid,
  Sun,
  Contrast,
  Smile,
  Image,
  Eye,
  Trash2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Gravadora() {
  const navigate = useNavigate()
  const { addMediaItem, createProject, teleprompterScript, setTeleprompterScript } = useStudio()

  // Video and Device state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [permissionErrorModal, setPermissionErrorModal] = useState(false)

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')

  // Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedSeconds, setRecordedSeconds] = useState(0)
  const timerRef = useRef<any>(null)

  // Recorded clips buffer
  const [recordedClips, setRecordedClips] = useState<
    { id: string; url: string; duration: number; timeString: string; blob?: Blob }[]
  >([])

  // Studio Adjustments
  const [showGrid, setShowGrid] = useState(true)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [beautySmooth, setBeautySmooth] = useState(40)
  const [bgMode, setBgMode] = useState<'none' | 'blur' | 'virtual' | 'chroma'>('none')
  const [bgBlurAmount, setBgBlurAmount] = useState(12)
  const [virtualBgUrl, setVirtualBgUrl] = useState(
    'https://img.usecurling.com/p/1920/1080?q=modern+studio+cyberpunk+dark',
  )

  // In-studio teleprompter
  const [showTeleprompter, setShowTeleprompter] = useState(true)
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(3)
  const [teleprompterOpacity, setTeleprompterOpacity] = useState(85)
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(20)
  const [isPromptScrolling, setIsPromptScrolling] = useState(false)
  const promptContainerRef = useRef<HTMLDivElement | null>(null)

  // Mobile QR simulation modal
  const [showMobileQR, setShowMobileQR] = useState(false)

  // Initialize camera stream
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      }

      const userStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(userStream)
      setHasPermission(true)
      setPermissionErrorModal(false)

      if (videoRef.current) {
        videoRef.current.srcObject = userStream
      }

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
    } catch (err) {
      console.warn('Erro ao acessar webcam:', err)
      setHasPermission(false)
      setPermissionErrorModal(true)
    }
  }

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [selectedCamera, selectedMic])

  // Recording Timer loop
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording, isPaused])

  // Teleprompter Auto-scroll
  useEffect(() => {
    let scrollInterval: any
    if (isPromptScrolling && promptContainerRef.current) {
      scrollInterval = setInterval(() => {
        if (promptContainerRef.current) {
          promptContainerRef.current.scrollTop += teleprompterSpeed * 0.75
        }
      }, 50)
    }
    return () => clearInterval(scrollInterval)
  }, [isPromptScrolling, teleprompterSpeed])

  const handleToggleRecord = () => {
    if (!isRecording) {
      // Start recording
      setIsRecording(true)
      setIsPaused(false)
      setRecordedSeconds(0)
      setIsPromptScrolling(true)
      toast.info('Gravação iniciada! Roteiro rolando.')
    } else {
      // Stop and add clip
      setIsRecording(false)
      setIsPaused(false)
      setIsPromptScrolling(false)

      const newClip = {
        id: 'clip-' + Date.now(),
        url: 'https://img.usecurling.com/p/1080/1920?q=podcaster+talking+studio+light&color=purple',
        duration: Math.max(1, recordedSeconds),
        timeString: formatTimer(recordedSeconds),
      }

      setRecordedClips((prev) => [newClip, ...prev])
      toast.success(
        `Take ${recordedClips.length + 1} gravado com sucesso (${formatTimer(recordedSeconds)})!`,
      )
      setRecordedSeconds(0)
    }
  }

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
    setIsPromptScrolling(isPaused)
  }

  const handleSaveToMediaLibrary = (clip: (typeof recordedClips)[0]) => {
    addMediaItem({
      title: `Gravação Estúdio (${clip.timeString})`,
      type: 'video',
      url: clip.url,
      duration: clip.duration,
      size: `${(clip.duration * 1.5).toFixed(1)} MB`,
      tags: ['estúdio', 'gravação', 'ao-vivo'],
      category: 'recording',
    })
    toast.success('Take salvo na Biblioteca de Mídias!')
  }

  const handleSendToEditor = (clip: (typeof recordedClips)[0]) => {
    const newProj = createProject({
      title: `Edição Take Estúdio (${clip.timeString})`,
      type: 'reel',
      duration: clip.duration,
      thumbnail: clip.url,
      scriptText: teleprompterScript,
      clips: [
        {
          id: 'clip-rec-main',
          track: 'video',
          name: 'Take de Câmera',
          startTime: 0,
          duration: clip.duration,
          sourceUrl: clip.url,
          mediaType: 'video',
          volume: 100,
        },
      ],
    })
    navigate(`/editor/${newProj.id}`)
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 max-w-[1600px] mx-auto gap-4 overflow-y-auto animate-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-red-500" />
              Estúdio de Gravação
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-rec-pulse" />
              Ao Vivo
            </span>
          </div>
          <p className="text-xs text-[#9494A8]">
            Capture takes em alta qualidade com teleprompter embutido, iluminação e isolamento de
            fundo.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileQR(true)}
            className="border-white/10 bg-[#14141C] text-xs text-white hover:bg-white/5 gap-1.5"
          >
            <QrCode className="w-4 h-4 text-[#22D3EE]" />
            Usar Câmera do Celular
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (recordedClips.length === 0) {
                toast.warning('Grave pelo menos um take antes de abrir o editor!')
                return
              }
              handleSendToEditor(recordedClips[0])
            }}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold text-white gap-1.5 shadow-lg shadow-[#7C5CFC]/25"
          >
            <Sparkles className="w-4 h-4" /> Editar Último Take no Editor
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Live Preview / Right Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[500px]">
        {/* LEFT: Live Video Monitor & Teleprompter (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          <div className="relative flex-1 min-h-[380px] bg-[#07070A] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Camera Video Stream or Simulated Visuals */}
            {hasPermission && stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100 transition-all"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) blur(${
                    bgMode === 'blur' ? bgBlurAmount / 6 : 0
                  }px) saturate(${100 + beautySmooth / 2}%)`,
                }}
              />
            ) : (
              /* Fallback Simulated Camera Feed */
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                <img
                  src="https://img.usecurling.com/p/1080/1920?q=podcaster+creator+microphone+speaking&color=purple"
                  alt="Simulação de Câmera"
                  className="w-full h-full object-cover transition-all"
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) blur(${
                      bgMode === 'blur' ? bgBlurAmount / 6 : 0
                    }px)`,
                  }}
                />
                {!hasPermission && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <VideoOff className="w-10 h-10 text-red-400 animate-pulse" />
                    <div>
                      <h3 className="font-bold text-white text-base">Prévia Simulada Ativa</h3>
                      <p className="text-xs text-[#9494A8] max-w-sm mt-1">
                        Câmera local desativada ou não autorizada. Você pode testar todos os
                        controles de gravação e teleprompter normalmente!
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={startCamera}
                      className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs"
                    >
                      Solicitar Acesso à Webcam
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Virtual Background Replacement Overlay */}
            {bgMode === 'virtual' && (
              <div
                className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen bg-cover bg-center"
                style={{ backgroundImage: `url(${virtualBgUrl})` }}
              />
            )}

            {/* Rule of Thirds Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10">
                <div className="border-r border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-b border-white/15" />
                <div className="border-r border-white/15" />
                <div className="border-r border-white/15" />
                <div />
              </div>
            )}

            {/* In-Studio Overlay Teleprompter */}
            {showTeleprompter && (
              <div
                ref={promptContainerRef}
                className="absolute top-4 left-4 right-4 max-h-40 overflow-y-auto rounded-xl p-4 border border-white/15 transition-all text-center select-none shadow-2xl backdrop-blur-md"
                style={{
                  backgroundColor: `rgba(11, 11, 16, ${teleprompterOpacity / 100})`,
                }}
              >
                <p
                  className="font-bold text-white leading-relaxed tracking-wide transition-all"
                  style={{ fontSize: `${teleprompterFontSize}px` }}
                >
                  {teleprompterScript}
                </p>
              </div>
            )}

            {/* Top Indicator & REC Pulse Status */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {isRecording ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/90 text-white backdrop-blur-md shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-rec-pulse" />
                  <span className="text-xs font-bold font-mono tracking-wider">
                    REC {formatTimer(recordedSeconds)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 text-[#9494A8] backdrop-blur-md text-[11px] font-mono border border-white/10">
                  <span>PRONTO</span>
                </div>
              )}
            </div>

            {/* Bottom Floating Quick Control Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/15 p-2 rounded-2xl shadow-2xl z-30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className={`text-xs px-2.5 py-1.5 rounded-xl ${
                  showGrid ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]' : 'text-[#9494A8]'
                }`}
                title="Grade de Terços"
              >
                <Grid className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTeleprompter(!showTeleprompter)}
                className={`text-xs px-2.5 py-1.5 rounded-xl ${
                  showTeleprompter ? 'bg-[#22D3EE]/20 text-[#22D3EE]' : 'text-[#9494A8]'
                }`}
                title="Teleprompter na Tela"
              >
                <ScrollText className="w-4 h-4" />
              </Button>

              {/* Central Big RECORD Button */}
              <button
                onClick={handleToggleRecord}
                className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
                  isRecording
                    ? 'w-14 h-14 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/50 scale-105'
                    : 'w-14 h-14 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                }`}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 text-white fill-current" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white" />
                )}
              </button>

              {isRecording && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePauseResume}
                  className="text-xs px-2.5 py-1.5 rounded-xl text-white hover:bg-white/10"
                  title={isPaused ? 'Retomar Gravação' : 'Pausar Gravação'}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4 text-emerald-400 fill-current" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* List of recorded takes below the camera */}
          <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-[#7C5CFC]" />
                Takes Gravados Nesta Sessão ({recordedClips.length})
              </span>
              <span className="text-[11px] text-[#9494A8]">
                Clique para enviar ao editor ou salvar na biblioteca
              </span>
            </div>

            {recordedClips.length === 0 ? (
              <p className="text-xs text-[#9494A8] py-4 text-center">
                Nenhum take gravado ainda. Clique no botão vermelho acima para gravar o primeiro
                take!
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 pt-1">
                {recordedClips.map((clip, idx) => (
                  <div
                    key={clip.id}
                    className="group relative w-48 shrink-0 bg-[#1C1C27] rounded-xl border border-white/10 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-black/40">
                      <img src={clip.url} alt="Take" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {clip.timeString}
                      </span>
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#7C5CFC] text-[9px] font-bold text-white">
                        Take #{recordedClips.length - idx}
                      </span>
                    </div>

                    <div className="p-2 flex items-center justify-between gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleSendToEditor(clip)}
                        className="h-7 text-[10px] bg-[#7C5CFC] hover:bg-[#6A48E0] text-white flex-1"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveToMediaLibrary(clip)}
                        className="h-7 px-2 text-[10px] text-[#22D3EE] hover:bg-[#22D3EE]/10"
                        title="Salvar na Biblioteca"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Studio Control Panel (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* 1. Device Selection Box */}
          <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-[#7C5CFC]" />
              Dispositivos de Entrada
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-[#9494A8] flex items-center gap-1 mb-1">
                  <Camera className="w-3.5 h-3.5" /> Câmera Principal
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                >
                  <option value="">Webcam Padrão / Câmera Integrada</option>
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Câmera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#9494A8] flex items-center gap-1 mb-1">
                  <Mic className="w-3.5 h-3.5" /> Microfone de Captura
                </label>
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                >
                  <option value="">Microfone Padrão do Sistema</option>
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microfone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Live Filters & Virtual Background */}
          <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
              Iluminação & Filtros em Tempo Real
            </h3>

            <div className="space-y-3 pt-1">
              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" /> Iluminação de Estúdio
                  </span>
                  <span>{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  min={50}
                  max={150}
                  step={1}
                  onValueChange={(val) => setBrightness(val[0])}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-[#7C5CFC]" /> Contraste Cinematográfico
                  </span>
                  <span>{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  min={50}
                  max={150}
                  step={1}
                  onValueChange={(val) => setContrast(val[0])}
                />
              </div>

              {/* Beauty Mode */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span className="flex items-center gap-1">
                    <Smile className="w-3 h-3 text-pink-400" /> Suavização de Pele (Beleza)
                  </span>
                  <span>{beautySmooth}%</span>
                </div>
                <Slider
                  value={[beautySmooth]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(val) => setBeautySmooth(val[0])}
                />
              </div>

              {/* Background Modes */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="text-[11px] text-[#9494A8] block">Tratamento de Fundo</label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'none', label: 'Original' },
                    { id: 'blur', label: 'Desfocar' },
                    { id: 'virtual', label: 'Cenário' },
                    { id: 'chroma', label: 'Chroma' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setBgMode(m.id as any)}
                      className={`py-1.5 rounded-lg font-medium text-[11px] transition-colors ${
                        bgMode === m.id
                          ? 'bg-[#7C5CFC] text-white'
                          : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {bgMode === 'blur' && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-[#9494A8]">
                      <span>Intensidade do Desfoque</span>
                      <span>{bgBlurAmount}px</span>
                    </div>
                    <Slider
                      value={[bgBlurAmount]}
                      min={4}
                      max={25}
                      step={1}
                      onValueChange={(val) => setBgBlurAmount(val[0])}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Teleprompter Controls in Recording Studio */}
          <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <ScrollText className="w-3.5 h-3.5 text-[#22D3EE]" />
                Roteiro do Teleprompter
              </h3>
              <button
                onClick={() => setIsPromptScrolling(!isPromptScrolling)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isPromptScrolling
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/10 text-[#9494A8]'
                }`}
              >
                {isPromptScrolling ? 'Rolando' : 'Pausado'}
              </button>
            </div>

            <textarea
              value={teleprompterScript}
              onChange={(e) => setTeleprompterScript(e.target.value)}
              rows={3}
              placeholder="Digite ou cole aqui o texto que você vai falar no vídeo..."
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] text-[#9494A8] block">
                  Velocidade: {teleprompterSpeed}x
                </span>
                <Slider
                  value={[teleprompterSpeed]}
                  min={1}
                  max={8}
                  step={1}
                  onValueChange={(v) => setTeleprompterSpeed(v[0])}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#9494A8] block">
                  Tamanho: {teleprompterFontSize}px
                </span>
                <Slider
                  value={[teleprompterFontSize]}
                  min={14}
                  max={36}
                  step={2}
                  onValueChange={(v) => setTeleprompterFontSize(v[0])}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: QR Code for Mobile Phone Camera */}
      <Dialog open={showMobileQR} onOpenChange={setShowMobileQR}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 text-center space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Usar Câmera do Celular (4K HDR)</DialogTitle>
            <DialogDescription className="text-xs text-[#9494A8]">
              Aponte a câmera do seu smartphone para o QR Code abaixo para sincronizar a gravação
              como webcam sem fio.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              {/* Simulated QR Code Graphic */}
              <div className="w-44 h-44 bg-black p-2 rounded-lg flex flex-col justify-between items-center text-white">
                <div className="flex justify-between w-full">
                  <div className="w-8 h-8 border-4 border-white" />
                  <div className="w-8 h-8 border-4 border-white" />
                </div>
                <div className="text-center font-bold text-xs">LUMEN CONNECT</div>
                <div className="flex justify-between w-full">
                  <div className="w-8 h-8 border-4 border-white" />
                  <div className="w-4 h-4 bg-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-[#9494A8] space-y-1">
            <p>1. Abra a câmera do iPhone/Android</p>
            <p>2. Toque no link de conexão local segura</p>
            <p>3. Use a câmera traseira com resolução máxima</p>
          </div>

          <Button
            onClick={() => setShowMobileQR(false)}
            className="w-full bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold py-2"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
