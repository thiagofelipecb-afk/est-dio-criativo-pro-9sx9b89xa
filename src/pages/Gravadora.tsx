import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  ScrollText,
  Image,
  Type,
  Camera,
  Mic,
  Maximize2,
  Minimize2,
  Video,
  Play,
  Square,
  Settings2,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
  ChevronRight,
  Eye,
  X,
  RotateCcw,
  Check,
  PanelRightClose,
  PanelRightOpen,
  Circle,
  FileVideo,
  Monitor,
  Smartphone,
} from 'lucide-react'
import { useStudio } from '@/context/StudioContext'
import { ScriptPanel } from '@/components/ScriptPanel'
import { BackgroundPanel } from '@/components/studio/BackgroundPanel'
import { TitlePanel } from '@/components/studio/TitlePanel'
import PrompterHUD from '@/components/studio/PrompterHUD'
import BackgroundRenderer from '@/components/studio/BackgroundRenderer'
import TitleOverlay from '@/components/studio/TitleOverlay'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { TeleprompterTextColor, TeleprompterMode } from '@/types/studio'

export default function Gravadora() {
  const navigate = useNavigate()
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    isRecording,
    setIsRecording,
    isFocusMode,
    setIsFocusMode,
    cameraConfig,
    updateCameraConfig,
    prompterConfig,
    updatePrompterConfig,
    audioConfig,
    updateAudioConfig,
    stageConfig,
    updateStageConfig,
    saveDevicePreference,
    loadDevicePreference,
    saveRawVideo,
    backgroundConfig,
    titleConfig,
    setTitleConfig,
    scriptBlocks,
    gravadoraScript,
  } = useStudio()

  // Tab selecionada no painel de configuração
  const [activeTab, setActiveTab] = useState('roteiro')

  // Dispositivos
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')

  // Stream da Câmera e Canvas
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recTimer, setRecTimer] = useState(0)
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Medidor de Áudio
  const [micLevel, setMicLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Dispositivos
  useEffect(() => {
    async function initDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevs = devices.filter((d) => d.kind === 'videoinput')
        const audioDevs = devices.filter((d) => d.kind === 'audioinput')

        setCameras(videoDevs)
        setMics(audioDevs)

        const saved = loadDevicePreference()
        if (saved.cameraId && videoDevs.some((d) => d.deviceId === saved.cameraId)) {
          setSelectedCamera(saved.cameraId)
        } else if (videoDevs.length > 0) {
          setSelectedCamera(videoDevs[0].deviceId)
        }

        if (saved.micId && audioDevs.some((d) => d.deviceId === saved.micId)) {
          setSelectedMic(saved.micId)
        } else if (audioDevs.length > 0) {
          setSelectedMic(audioDevs[0].deviceId)
        }
      } catch (err) {
        console.error('Erro ao listar dispositivos:', err)
      }
    }
    initDevices()
  }, [loadDevicePreference])

  // Iniciar Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null

    async function startStream() {
      try {
        if (!selectedCamera) return

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: selectedMic
            ? {
                deviceId: { exact: selectedMic },
                echoCancellation: audioConfig.echoCancellation,
                noiseSuppression: audioConfig.noiseSuppression,
                autoGainControl: audioConfig.autoGainControl,
              }
            : false,
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        currentStream = mediaStream
        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        // Setup Analyser de Áudio
        if (selectedMic && mediaStream.getAudioTracks().length > 0) {
          const AC = window.AudioContext || (window as any).webkitAudioContext
          const ac = new AC()
          audioContextRef.current = ac
          const source = ac.createMediaStreamSource(mediaStream)
          const analyser = ac.createAnalyser()
          analyser.fftSize = 64
          source.connect(analyser)
          analyserRef.current = analyser

          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          const updateMeter = () => {
            if (!analyserRef.current) return
            analyser.getByteFrequencyData(dataArray)
            const sum = dataArray.reduce((acc, val) => acc + val, 0)
            const avg = sum / dataArray.length
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)))
            requestAnimationFrame(updateMeter)
          }
          updateMeter()
        }
      } catch (e) {
        console.warn('Erro ao acessar webcam:', e)
      }
    }

    startStream()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [selectedCamera, selectedMic, audioConfig.noiseSuppression, audioConfig.echoCancellation])

  // Timer de Gravação
  useEffect(() => {
    if (isRecording) {
      setRecTimer(0)
      recIntervalRef.current = setInterval(() => {
        setRecTimer((t) => t + 1)
      }, 1000)
    } else {
      if (recIntervalRef.current) clearInterval(recIntervalRef.current)
    }
    return () => {
      if (recIntervalRef.current) clearInterval(recIntervalRef.current)
    }
  }, [isRecording])

  // FASE 2D — Atalho "F" alterna Modo Foco; "Esc" sai do Modo Foco.
  // Não dispara quando o usuário está digitando em inputs/textarea/select.
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'f') {
        e.preventDefault()
        setIsFocusMode(!isFocusMode)
      } else if (k === 'escape' && isFocusMode) {
        e.preventDefault()
        setIsFocusMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFocusMode, setIsFocusMode])

  const handleToggleRecord = () => {
    if (isRecording) {
      // Parar Gravação
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
      toast.success('Gravação finalizada! Take salvo com sucesso.')
    } else {
      // Iniciar Gravação
      if (!stream) {
        toast.error('Câmera não conectada.')
        return
      }
      recordedChunksRef.current = []
      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data)
        }
        recorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
          if (activeProjectId) {
            await saveRawVideo(activeProjectId, blob, recTimer, 'video/webm')
          }
        }
        recorder.start(1000)
        mediaRecorderRef.current = recorder
        setIsRecording(true)
        toast.info('Gravação iniciada...')
      } catch {
        setIsRecording(true)
      }
    }
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const activeProject = projects.find((p) => p.id === activeProjectId)

  // FASE 2B — PrompterHUD visível apenas quando há roteiro (blocos ou texto)
  const hasScript = scriptBlocks.length > 0 || gravadoraScript.trim().length > 0

  // Painel lateral de configurações (Desktop & Mobile Drawer)
  const renderConfigTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      <div className="px-3 pt-2.5 bg-[#0E0E15] border-b border-white/5 shrink-0">
        <TabsList className="grid grid-cols-7 gap-1 bg-[#1C1C27] p-1 rounded-xl h-auto">
          <TabsTrigger
            value="roteiro"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Roteiro"
          >
            Roteiro
          </TabsTrigger>
          <TabsTrigger
            value="prompter"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Teleprompter"
          >
            Prompter
          </TabsTrigger>
          <TabsTrigger
            value="midias"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Mídias"
          >
            Mídias
          </TabsTrigger>
          <TabsTrigger
            value="fundo"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Fundo"
          >
            Fundo
          </TabsTrigger>
          <TabsTrigger
            value="titulo"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Título"
          >
            Título
          </TabsTrigger>
          <TabsTrigger
            value="camera"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Câmera"
          >
            Câmera
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            className="text-[10px] py-1.5 px-0.5 rounded-lg data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
            title="Áudio"
          >
            Áudio
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-[#0E0E15]">
        <TabsContent value="roteiro" className="h-full m-0 p-0">
          <ScriptPanel />
        </TabsContent>

        <TabsContent value="prompter" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5 text-[#7C5CFC]" /> Configurações do Prompter
            </span>
            <span className="text-[10px] text-[#22D3EE] font-mono">HUD Ativo</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Modo de Leitura
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updatePrompterConfig({ mode: 'blocks' })}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    prompterConfig.mode === 'blocks'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                      : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
                  }`}
                >
                  Por Blocos (Seta / Espaço)
                </button>
                <button
                  onClick={() => updatePrompterConfig({ mode: 'continuous' })}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    prompterConfig.mode === 'continuous'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                      : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
                  }`}
                >
                  Rolagem Contínua
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Tamanho do Texto</span>
                <span className="font-mono">{prompterConfig.fontSize}px</span>
              </div>
              <Slider
                value={[prompterConfig.fontSize]}
                min={24}
                max={72}
                step={2}
                onValueChange={(v) => updatePrompterConfig({ fontSize: v[0] })}
              />
            </div>

            {prompterConfig.mode === 'continuous' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#9494A8]">
                  <span>Velocidade de Rolagem</span>
                  <span className="font-mono">{prompterConfig.speed}x</span>
                </div>
                <Slider
                  value={[prompterConfig.speed]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(v) => updatePrompterConfig({ speed: v[0] })}
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Opacidade do Fundo HUD</span>
                <span className="font-mono">{prompterConfig.bgOpacity}%</span>
              </div>
              <Slider
                value={[prompterConfig.bgOpacity]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => updatePrompterConfig({ bgOpacity: v[0] })}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-white">Espelhar Texto (Mirror)</span>
              <Switch
                checked={prompterConfig.mirror}
                onCheckedChange={(v) => updatePrompterConfig({ mirror: v })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="midias" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileVideo className="w-3.5 h-3.5 text-[#7C5CFC]" /> Mídias & B-Roll do Projeto
            </span>
          </div>
          <p className="text-xs text-[#9494A8]">
            Insira cortes, imagens e sobreposições diretamente durante a gravação do seu take.
          </p>
          <button
            onClick={() => navigate('/midias')}
            className="w-full py-2.5 rounded-xl bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
          >
            Abrir Gerenciador de Mídias
          </button>
        </TabsContent>

        <TabsContent value="fundo" className="h-full m-0 p-0">
          <BackgroundPanel />
        </TabsContent>

        <TabsContent value="titulo" className="h-full m-0 p-0">
          <TitlePanel />
        </TabsContent>

        <TabsContent value="camera" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#7C5CFC]" /> Controles de Câmera
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Dispositivo de Vídeo
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value)
                  saveDevicePreference(e.target.value, selectedMic)
                }}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
              >
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Câmera ${c.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Brilho</span>
                <span className="font-mono">{cameraConfig.brightness}%</span>
              </div>
              <Slider
                value={[cameraConfig.brightness]}
                min={50}
                max={150}
                step={1}
                onValueChange={(v) => updateCameraConfig({ brightness: v[0] })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Contraste</span>
                <span className="font-mono">{cameraConfig.contrast}%</span>
              </div>
              <Slider
                value={[cameraConfig.contrast]}
                min={50}
                max={150}
                step={1}
                onValueChange={(v) => updateCameraConfig({ contrast: v[0] })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Suavização de Pele (Beauty)</span>
                <span className="font-mono">{cameraConfig.beautySmooth}%</span>
              </div>
              <Slider
                value={[cameraConfig.beautySmooth]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => updateCameraConfig({ beautySmooth: v[0] })}
              />
            </div>

            {/* FASE 2E — Câmera do Celular: honestamente "Em desenvolvimento" */}
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1C1C27] p-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#9494A8]" />
                  <div>
                    <p className="text-xs font-semibold text-white">Câmera do Celular</p>
                    <p className="text-[10px] text-[#9494A8]">
                      Use a câmera traseira do seu celular como fonte de vídeo
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-full whitespace-nowrap">
                  Em desenvolvimento
                </span>
              </div>
              <p className="text-[10px] text-[#9494A8]/70 mt-1.5 leading-relaxed">
                Em desenvolvimento — disponível em breve. A conexão via QR Code / WebRTC ainda não
                está ativa. Por enquanto, utilize a webcam conectada ao seu computador.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audio" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-[#7C5CFC]" /> Cadeia de Áudio
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Microfone de Entrada
              </label>
              <select
                value={selectedMic}
                onChange={(e) => {
                  setSelectedMic(e.target.value)
                  saveDevicePreference(selectedCamera, e.target.value)
                }}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
              >
                {mics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label || `Microfone ${m.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Nível do Microfone</span>
                <span className="font-mono">{micLevel}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#1C1C27] rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded-full transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="text-xs text-white">Supressão de Ruído IA</p>
                <p className="text-[10px] text-[#9494A8]">Elimina chiados e ruídos de fundo</p>
              </div>
              <Switch
                checked={audioConfig.noiseSuppression}
                onCheckedChange={(v) => updateAudioConfig({ noiseSuppression: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white">Cancelamento de Eco</p>
                <p className="text-[10px] text-[#9494A8]">Evita retorno do áudio da sala</p>
              </div>
              <Switch
                checked={audioConfig.echoCancellation}
                onCheckedChange={(v) => updateAudioConfig({ echoCancellation: v })}
              />
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )

  // MODO FOCO TOTAL
  if (isFocusMode) {
    return (
      <div className="relative w-screen h-screen bg-[#000000] overflow-hidden flex flex-col justify-between p-6 select-none">
        {/* Portal Prompter HUD no topo — apenas quando há roteiro */}
        {hasScript && <PrompterHUD />}

        {/* Header Minimalista do Modo Foco */}
        <div className="relative z-50 flex items-center justify-between bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full animate-pulse">
              <Circle className="w-2.5 h-2.5 fill-current" /> Modo Foco Pro
            </span>
            <span className="text-sm font-mono text-white font-semibold">
              {activeProject ? activeProject.title : 'Vídeo sem título'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer de gravação */}
            {isRecording && (
              <span className="text-lg font-mono font-extrabold text-red-400 bg-red-500/10 px-3 py-1 rounded-xl border border-red-500/30">
                {formatTimer(recTimer)}
              </span>
            )}

            {/* Medidor Mic */}
            <div className="flex items-center gap-2 bg-[#1C1C27] px-3 py-1.5 rounded-xl border border-white/10">
              <Mic className="w-4 h-4 text-[#22D3EE]" />
              <div className="w-16 h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-red-500"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            {/* Botão Sair do Modo Foco */}
            <button
              onClick={() => setIsFocusMode(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
            >
              <Minimize2 className="w-4 h-4" /> Sair do Foco (Esc)
            </button>
          </div>
        </div>

        {/* Palco Central 9:16 */}
        <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
          <div className="relative aspect-[9/16] h-full max-h-[82vh] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-[#0B0B10]">
            <BackgroundRenderer config={backgroundConfig} />
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover relative z-10"
              style={{
                filter: `brightness(${cameraConfig.brightness}%) contrast(${cameraConfig.contrast}%) blur(${
                  cameraConfig.beautySmooth > 0 ? cameraConfig.beautySmooth / 50 : 0
                }px)`,
              }}
            />
            <TitleOverlay
              config={titleConfig}
              onChange={(cfg) => setTitleConfig({ ...titleConfig, ...cfg })}
            />
          </div>
        </div>

        {/* Footer Minimalista com Botão REC Flutuante */}
        <div className="relative z-50 flex items-center justify-center pb-2">
          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-3 px-8 py-4 rounded-full text-base font-extrabold shadow-2xl transition-all transform hover:scale-105 ${
              isRecording
                ? 'bg-red-600 text-white shadow-red-600/50 animate-pulse'
                : 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white shadow-[#7C5CFC]/50'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 fill-current" /> Parar Gravação ({formatTimer(recTimer)})
              </>
            ) : (
              <>
                <Circle className="w-5 h-5 fill-current text-red-500 animate-ping" /> Gravar Take
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // MODO PADRÃO
  return (
    <div className="flex flex-col h-screen w-full bg-[#0B0B10] overflow-hidden">
      {/* Prompter HUD Renderizado Via Portal — apenas quando há roteiro */}
      {hasScript && <PrompterHUD />}

      {/* Header Compacto da Gravadora */}
      <header className="h-14 bg-[#0E0E15] border-b border-white/5 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
            <Circle className="w-2 h-2 fill-current animate-pulse" /> Ao Vivo
          </span>

          <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
            {activeProject ? activeProject.title : 'Estúdio de Gravação'}
          </span>

          <span className="text-[10px] text-[#9494A8] bg-[#1C1C27] px-2 py-0.5 rounded border border-white/10 font-mono hidden sm:inline">
            1080x1920 (9:16)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Record Button */}
          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 animate-pulse'
                : 'bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] text-white shadow-lg shadow-[#7C5CFC]/20'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> {formatTimer(recTimer)}
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 fill-current text-red-400" /> Gravar Take
              </>
            )}
          </button>

          {/* Toggle Modo Foco */}
          <button
            onClick={() => setIsFocusMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC] text-xs font-semibold text-white transition-all"
            title="Ocultar tudo e focar apenas no palco e prompter"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#22D3EE]" /> Modo Foco
          </button>

          {/* Sair */}
          <button
            onClick={() => navigate('/projetos')}
            className="p-1.5 rounded-xl text-[#9494A8] hover:bg-white/5 hover:text-white"
            title="Sair do Estúdio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Dual-Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Esquerda (62% Desktop / Full Mobile): Palco & Canvas 9:16 */}
        <div className="flex-1 lg:w-[62%] flex flex-col items-center justify-center p-4 bg-[#0B0B10] relative overflow-hidden">
          {/* Enquadramento do Palco */}
          <div className="relative aspect-[9/16] h-full max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#14141C]">
            <BackgroundRenderer config={backgroundConfig} />
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover relative z-10"
              style={{
                filter: `brightness(${cameraConfig.brightness}%) contrast(${cameraConfig.contrast}%) blur(${
                  cameraConfig.beautySmooth > 0 ? cameraConfig.beautySmooth / 50 : 0
                }px)`,
              }}
            />
            <TitleOverlay
              config={titleConfig}
              onChange={(cfg) => setTitleConfig({ ...titleConfig, ...cfg })}
            />
          </div>

          {/* Controls Flutuantes no Canvas */}
          <div className="mt-3 flex items-center gap-4 bg-[#14141C]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-[#9494A8]">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span className="font-mono">{micLevel}%</span>
            </span>
            <span>•</span>
            <span>Câmera Principal (1080p)</span>
          </div>
        </div>

        {/* Direita (38% Desktop): Painel de Configurações Único */}
        <div className="hidden lg:block lg:w-[38%] border-l border-white/5 bg-[#0E0E15] h-full">
          {renderConfigTabs()}
        </div>

        {/* Mobile / Tablet (<1180px) Drawer de Configuração */}
        <div className="lg:hidden absolute bottom-4 right-4 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7C5CFC] text-white text-xs font-bold shadow-xl">
                <Settings2 className="w-4 h-4" /> Configurações
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] sm:w-[400px] p-0 bg-[#0E0E15] border-white/10"
            >
              <SheetHeader className="px-4 py-3 border-b border-white/5">
                <SheetTitle className="text-xs font-bold text-white uppercase">
                  Painel de Estúdio
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-60px)]">{renderConfigTabs()}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}
