import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScrollText,
  Camera,
  Mic,
  Maximize2,
  Minimize2,
  Square,
  Settings2,
  Eye,
  X,
  RotateCcw,
  Circle,
  FileVideo,
  Smartphone,
  Video as VideoIcon,
  Image as ImageIcon,
  Columns2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Play,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react'
import type { StageLayout } from '@/types/studio'
import { useStudio } from '@/context/StudioContext'
import { useMediaAssets } from '@/hooks/useMediaAssets'
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
import { MediaLibraryModal } from '@/components/MediaLibraryModal'
import { MediaPanel } from '@/components/studio/MediaPanel'
import { BlockArtStageOverlay } from '@/components/studio/BlockArtStageOverlay'
import {
  ReactionStageOverlay,
  type ReactionStageOverlayHandle,
} from '@/components/studio/ReactionStageOverlay'
import { toast } from 'sonner'

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
    saveDevicePreference,
    loadDevicePreference,
    saveRawVideo,
    backgroundConfig,
    titleConfig,
    setTitleConfig,
    scriptBlocks,
    gravadoraScript,
    stageConfig,
    updateStageConfig,
    syncArtsEnabled,
    setSyncArtsEnabled,
    reactionConfig,
  } = useStudio()
  // PROMPT 2 — Mídias rápidas e split agora vêm da fonte canônica (mesma de
  // /midias e /biblioteca). Não usamos mais useStudio().mediaLibrary.
  const { assets: mediaAssets } = useMediaAssets()
  // Mídias visuais (imagem/vídeo) para o seletor split.
  const visualMedia = mediaAssets
    .filter((m) => m.type === 'image' || m.type === 'video')
    .map((m) => ({
      id: m.id,
      title: m.name,
      type: m.type as 'image' | 'video',
      url: m.publicUrl || '',
      thumbnailUrl: m.thumbnailUrl,
      demo: !!(m.metadata as any)?.demo,
    }))

  // Tab selecionada no painel de configuração
  const [activeTab, setActiveTab] = useState('roteiro')

  // Dispositivos
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')

  // === Câmera: permissão explícita do usuário ===
  // Estados do fluxo de permissão:
  //  'idle'      → botão "Ativar Câmera" visível no centro do palco
  //  'requesting' → "Conectando..." (chamou getUserMedia)
  //  'ready'     → stream ativo, preview ao vivo
  //  'denied'    → permissão negada
  //  'error'     → outro erro de hardware/dispositivo
  const [camStatus, setCamStatus] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'error'>(
    'idle',
  )
  const [camError, setCamError] = useState<string>('')
  const [camPermissionBlocked, setCamPermissionBlocked] = useState<boolean>(false)

  /**
   * Ref usada para evitar a dupla inicialização do stream: quando
   * handleActivateCamera define selectedCamera/selectedMic e em seguida chama
   * startStream(), o useEffect que observa esses estados dispararia uma segunda
   * chamada a startStream(). Setamos essa ref antes de mudar os estados e a
   * consumimos no effect para pular o restart.
   */
  const skipRestartRef = useRef(false)

  // Stream da Câmera e Canvas
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recTimer, setRecTimer] = useState(0)
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  // Ref para o overlay de reação (elemento <video> da reação).
  const reactionOverlayRef = useRef<ReactionStageOverlayHandle | null>(null)
  // AudioContext de mixagem criado durante a gravação (para liberar depois).
  const mixAudioCtxRef = useRef<AudioContext | null>(null)

  // Medidor de Áudio
  const [micLevel, setMicLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  /**
   * Tenta enumerar dispositivos. Sem permissão prévia, os labels chegam vazios
   * (""), o que é esperado e NÃO é erro — apenas significa que ainda não
   * chamamos getUserMedia. Retornamos os devices mesmo sem label para que o
   * <select> tenha a quantidade certa de opções.
   */
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevs = devices.filter((d) => d.kind === 'videoinput')
      const audioDevs = devices.filter((d) => d.kind === 'audioinput')

      setCameras(videoDevs)
      setMics(audioDevs)
      return { videoDevs, audioDevs }
    } catch (err) {
      console.error('Erro ao listar dispositivos:', err)
      return { videoDevs: [], audioDevs: [] }
    }
  }, [])

  // Enumeração inicial (sem permissão — labels virão vazios até "Ativar Câmera").
  useEffect(() => {
    refreshDevices()
    const onDevChange = () => refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', onDevChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDevChange)
    }
  }, [refreshDevices])

  /** Configura o medidor de áudio (AnalyserNode) a partir de um stream. */
  const setupAudioAnalyser = useCallback((mediaStream: MediaStream) => {
    if (mediaStream.getAudioTracks().length === 0) return
    try {
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
    } catch {
      /* sem áudio — não bloqueia */
    }
  }, [])

  /** Inicia o stream a partir de um deviceId (ou default). */
  const startStream = useCallback(
    async (camId?: string, micId?: string) => {
      const cam = camId || selectedCamera
      const mic = micId || selectedMic

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: cam ? { exact: cam } : undefined,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: mic
          ? {
              deviceId: { exact: mic },
              echoCancellation: audioConfig.echoCancellation,
              noiseSuppression: audioConfig.noiseSuppression,
              autoGainControl: audioConfig.autoGainControl,
            }
          : false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Para o stream anterior se existir.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }

      streamRef.current = mediaStream
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setupAudioAnalyser(mediaStream)
      return mediaStream
    },
    [selectedCamera, selectedMic, audioConfig, setupAudioAnalyser],
  )

  /**
   * "Ativar Câmera" — clique explícito do usuário.
   * 1. Chama getUserMedia (dispara o diálogo de permissão do navegador).
   * 2. Com permissão concedida, chama enumerateDevices() novamente para
   *    popular cameras/mics com labels reais.
   * 3. Define selectedCamera/selectedMic e inicia o stream.
   * 4. Em caso de negação, mostra mensagem clara.
   */
  const handleActivateCamera = useCallback(async () => {
    setCamStatus('requesting')
    setCamError('')
    setCamPermissionBlocked(false)

    // === Bug 1: checar o estado real da permissão ANTES de getUserMedia ===
    // Quando o usuário já bloqueou a câmera em uma decisão anterior, o
    // getUserMedia rejeita com NotAllowedError instantaneamente, sem mostrar o
    // diálogo do navegador. Consultamos a Permissions API para detectar esse
    // caso e mostrar instruções claras de como desbloquear.
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
      if (status.state === 'denied') {
        setCamStatus('denied')
        setCamPermissionBlocked(true)
        setCamError(
          'A câmera está bloqueada nas configurações do seu navegador. Clique no ícone de cadeado na barra de endereço, vá em "Configurações do site" e mude a câmera para "Permitir".',
        )
        return
      }
      // 'prompt' ou 'granted' → proceder com getUserMedia (diálogo normal).
      status.onchange = () => {
        // Se o usuário desbloquear nas configurações do navegador enquanto a
        // mensagem de bloqueio estiver visível, volta ao estado idle.
        if (status.state !== 'denied' && camStatus === 'denied' && camPermissionBlocked) {
          setCamStatus('idle')
          setCamError('')
          setCamPermissionBlocked(false)
        }
      }
    } catch {
      // Permissions API indisponível (ex.: Firefox) — segue para getUserMedia,
      // que mostrará o diálogo normalmente ou rejeitará com NotAllowedError.
    }

    try {
      // 1. getUserMedia primeiro (dispara o diálogo de permissão).
      const probe = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: {
          echoCancellation: audioConfig.echoCancellation,
          noiseSuppression: audioConfig.noiseSuppression,
          autoGainControl: audioConfig.autoGainControl,
        },
      })
      // Permissão concedida — para o stream de probe, vamos recriar com o device certo.
      probe.getTracks().forEach((t) => t.stop())

      // 2. Re-enumerar dispositivos AGORA com labels reais.
      const saved = loadDevicePreference()
      const { videoDevs, audioDevs } = await refreshDevices()

      const camId =
        (saved.cameraId && videoDevs.find((d) => d.deviceId === saved.cameraId)?.deviceId) ||
        videoDevs[0]?.deviceId ||
        ''
      const micId =
        (saved.micId && audioDevs.find((d) => d.deviceId === saved.micId)?.deviceId) ||
        audioDevs[0]?.deviceId ||
        ''

      // === Bug extra: evitar a dupla inicialização do stream ===
      // Setamos a flag antes de mudar selectedCamera/selectedMic para que o
      // useEffect que observa esses estados NÃO dispare startStream() de novo.
      skipRestartRef.current = true

      if (camId) setSelectedCamera(camId)
      if (micId) setSelectedMic(micId)

      // 3. Inicia o stream real com o dispositivo escolhido.
      await startStream(camId, micId)
      setCamStatus('ready')
      toast.success('Câmera conectada com sucesso!')
    } catch (e: any) {
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCamStatus('denied')
        setCamPermissionBlocked(true)
        setCamError(
          'A câmera está bloqueada nas configurações do seu navegador. Clique no ícone de cadeado na barra de endereço, vá em "Configurações do site" e mude a câmera para "Permitir".',
        )
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCamStatus('error')
        setCamError('Nenhuma câmera ou microfone compatível foi encontrado.')
      } else if (name === 'NotReadableError') {
        setCamStatus('error')
        setCamError('A câmera está em uso por outro aplicativo. Feche-o e tente novamente.')
      } else {
        setCamStatus('error')
        setCamError(e?.message || 'Não foi possível acessar a câmera.')
      }
    }
  }, [
    audioConfig,
    loadDevicePreference,
    refreshDevices,
    startStream,
    camStatus,
    camPermissionBlocked,
  ])

  // Reinicia o stream quando o usuário troca de dispositivo (depois de ativar).
  useEffect(() => {
    if (camStatus !== 'ready') return
    // === Bug extra: pular quando a troca foi iniciada por handleActivateCamera ===
    if (skipRestartRef.current) {
      skipRestartRef.current = false
      return
    }
    let cancelled = false
    async function restart() {
      try {
        await startStream()
      } catch (e) {
        if (!cancelled) console.warn('Erro ao reiniciar stream:', e)
      }
    }
    restart()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, selectedMic])

  // Cleanup do stream ao desmontar.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close()
        } catch {
          /* noop */
        }
      }
      if (mixAudioCtxRef.current) {
        try {
          mixAudioCtxRef.current.close()
        } catch {
          /* noop */
        }
      }
    }
  }, [])

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

  // FASE 2D — Atalhos "F" (Modo Foco) e "Esc" (sair do foco / minimizar HUD)
  // são tratados centralmente no PrompterHUD para evitar duplicação de handlers.
  // Aqui permanece apenas a leitura de isFocusMode para o layout.
  useEffect(() => {
    if (!isFocusMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable)
          return
      }
      if (e.key.toLowerCase() === 'escape') {
        e.preventDefault()
        setIsFocusMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFocusMode, setIsFocusMode])

  // === Split screen: layout + mídia da outra metade ===
  const layout = stageConfig.layout
  const isSplit = layout === 'split-top' || layout === 'split-bottom' || layout === 'split'
  const splitMediaUrl = stageConfig.splitMediaUrl
  const splitMediaType: 'image' | 'video' = stageConfig.splitMediaType || 'image'
  const splitCameraRatio =
    typeof stageConfig.splitCameraRatio === 'number' ? stageConfig.splitCameraRatio : 0.6

  const [mediaModalOpen, setMediaModalOpen] = useState(false)

  const setLayout = useCallback(
    (next: StageLayout) => updateStageConfig({ layout: next }),
    [updateStageConfig],
  )

  const handleToggleRecord = () => {
    if (isRecording) {
      // Parar Gravação
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      // Pausa o vídeo de reação, se houver.
      try {
        reactionOverlayRef.current?.video?.pause()
      } catch {
        /* noop */
      }
      // Libera o AudioContext de mixagem.
      try {
        mixAudioCtxRef.current?.close()
      } catch {
        /* noop */
      }
      mixAudioCtxRef.current = null
      setIsRecording(false)
      toast.success('Gravação finalizada! Take salvo com sucesso.')
    } else {
      // Iniciar Gravação
      if (!stream) {
        toast.error('Câmera não conectada. Clique em "Ativar Câmera" primeiro.')
        return
      }
      recordedChunksRef.current = []

      const reactionVideoEl = reactionOverlayRef.current?.video || null
      const useReactionAudio =
        reactionConfig.enabled && !!reactionVideoEl && reactionConfig.audioMix !== 'voice-only'

      try {
        let recorderStream: MediaStream = stream

        if (useReactionAudio) {
          // Mixagem de áudio via Web Audio API.
          const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
          const audioCtx = new AC()
          mixAudioCtxRef.current = audioCtx
          const dest = audioCtx.createMediaStreamDestination()

          // Voz (microfone) — apenas se audioMix !== 'reaction-only'.
          if (reactionConfig.audioMix !== 'reaction-only') {
            try {
              const micSource = audioCtx.createMediaStreamSource(stream)
              micSource.connect(dest)
            } catch {
              /* noop */
            }
          }
          // Reação — apenas se audioMix !== 'voice-only'.
          if (reactionConfig.audioMix !== 'voice-only' && reactionVideoEl) {
            try {
              const reactionSource = audioCtx.createMediaElementSource(reactionVideoEl)
              const reactionGain = audioCtx.createGain()
              reactionGain.gain.value = Math.max(0, Math.min(1, reactionConfig.volume / 100))
              reactionSource.connect(reactionGain)
              reactionGain.connect(dest)
            } catch {
              /* noop */
            }
          }

          // Combina vídeo do stream original + áudio mixado.
          recorderStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ])
        }

        const recorder = new MediaRecorder(recorderStream, { mimeType: 'video/webm' })
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

        // Inicia o vídeo de reação do startOffsetMs.
        if (reactionConfig.enabled && reactionVideoEl) {
          try {
            if (reactionConfig.startOffsetMs > 0) {
              reactionVideoEl.currentTime = reactionConfig.startOffsetMs / 1000
            }
            // Durante a gravação, o vídeo de reação precisa ter áudio
            // "tocando" (mesmo muted=false para o MediaElementSource capturar).
            if (useReactionAudio) {
              reactionVideoEl.muted = false
            }
            reactionVideoEl.play().catch(() => {})
          } catch {
            /* noop */
          }
        }

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
            <span className="text-[10px] text-[#22D3EE] font-mono">HUD fixo no topo</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Modo de Leitura
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updatePrompterConfig({ mode: 'blocks' })}
                  className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                    prompterConfig.mode === 'blocks'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                      : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
                  }`}
                >
                  Blocos
                </button>
                <button
                  onClick={() => updatePrompterConfig({ mode: 'fixed' })}
                  className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                    prompterConfig.mode === 'fixed'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                      : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
                  }`}
                >
                  Nota Fixa
                </button>
                <button
                  onClick={() => updatePrompterConfig({ mode: 'continuous' })}
                  className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                    prompterConfig.mode === 'continuous'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                      : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
                  }`}
                >
                  Rolagem
                </button>
              </div>
              <p className="text-[9px] text-[#9494A8]/70 leading-relaxed mt-1">
                {prompterConfig.mode === 'blocks' &&
                  'Avança bloco por bloco com Seta ↓ / Espaço. Volta com Seta ↑.'}
                {prompterConfig.mode === 'fixed' &&
                  'Texto estático fixo no topo — ideal para anotações rápidas.'}
                {prompterConfig.mode === 'continuous' &&
                  'Rolagem automática — Espaço pausa/continua. Inicia junto com a gravação.'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Tamanho do Texto</span>
                <span className="font-mono">{prompterConfig.fontSize}px</span>
              </div>
              <Slider
                value={[prompterConfig.fontSize]}
                min={28}
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
                  max={8}
                  step={1}
                  onValueChange={(v) => updatePrompterConfig({ speed: v[0] })}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Cor do Texto
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'white', label: 'Branco', color: '#FFFFFF' },
                    { id: 'green', label: 'Ciano', color: '#22D3EE' },
                    { id: 'yellow', label: 'Amarelo', color: '#FFFF44' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updatePrompterConfig({ color: c.id })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                      prompterConfig.color === c.id
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                        : 'border-white/10 bg-[#1C1C27] text-[#9494A8]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

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
              <div>
                <span className="text-xs text-white">Espelhar Texto (Mirror)</span>
                <p className="text-[9px] text-[#9494A8]">Para uso com vidro refletivo</p>
              </div>
              <Switch
                checked={prompterConfig.mirror}
                onCheckedChange={(v) => updatePrompterConfig({ mirror: v })}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <span className="text-xs text-white">Iniciar com a Gravação</span>
                <p className="text-[9px] text-[#9494A8]">
                  Liga a leitura automaticamente ao gravar
                </p>
              </div>
              <Switch
                checked={prompterConfig.mode === 'continuous'}
                disabled={prompterConfig.mode !== 'continuous'}
                onCheckedChange={(v) => {
                  if (v) updatePrompterConfig({ mode: 'continuous', reading: true })
                }}
              />
            </div>

            <div className="rounded-lg border border-white/5 bg-[#14141C] p-2.5 text-[9px] text-[#9494A8] leading-relaxed">
              <span className="text-white font-semibold">Atalhos:</span> Espaço/↓ avança bloco ou
              pausa rolagem · ↑ volta bloco · F Modo Foco · Esc minimiza o HUD. Não disparam durante
              digitação.
            </div>

            {/* PROMPT 3 — Sincronização das artes com o teleprompter */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <span className="text-xs text-white">Sincronizar com artes</span>
                <p className="text-[9px] text-[#9494A8]">
                  O palco mostra a arte do bloco ativo do teleprompter
                </p>
              </div>
              <Switch checked={syncArtsEnabled} onCheckedChange={(v) => setSyncArtsEnabled(v)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="midias" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileVideo className="w-3.5 h-3.5 text-[#7C5CFC]" /> Mídias & B-Roll do Projeto
            </span>
          </div>

          {/* PROMPT 3 — Sub-tabs de mídia (Artes/Reação/Quadro/B-roll) */}
          <MediaPanel projectId={activeProjectId || 'temp'} />

          {/* === Split Screen: mídia da outra metade === */}
          <div className="rounded-xl border border-[#7C5CFC]/30 bg-[#7C5CFC]/5 p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <Columns2 className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Mídia da Tela Dividida
              </span>
            </div>
            <p className="text-[10px] text-[#9494A8] leading-relaxed">
              Selecione a imagem ou vídeo que ocupa a outra metade quando o layout é "Câmera em
              Cima" ou "Câmera em Baixo".
            </p>

            {splitMediaUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black h-28">
                  {splitMediaType === 'video' ? (
                    <video
                      src={splitMediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={splitMediaUrl}
                      alt="Mídia dividida"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-semibold text-white uppercase flex items-center gap-1">
                    {splitMediaType === 'video' ? (
                      <VideoIcon className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                    )}
                    {splitMediaType}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateStageConfig({ splitMediaUrl: undefined, splitMediaType: 'image' })
                  }
                  className="w-full py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-[10px] font-semibold text-red-300 transition-all"
                >
                  Remover mídia
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-white/10 rounded-lg gap-2">
                <ImageIcon className="w-6 h-6 text-[#9494A8]/50" />
                <p className="text-[10px] text-[#9494A8]">Nenhuma mídia selecionada</p>
              </div>
            )}

            <button
              onClick={() => setMediaModalOpen(true)}
              className="w-full py-2 rounded-lg bg-[#7C5CFC] hover:bg-[#6A48E0] text-[11px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <FileVideo className="w-3.5 h-3.5" /> Selecionar da Biblioteca
            </button>

            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Mídias rápidas
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                {visualMedia.slice(0, 6).map((m) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      updateStageConfig({
                        splitMediaUrl: m.url,
                        splitMediaType: m.type as 'image' | 'video',
                      })
                    }
                    className={`relative rounded-md overflow-hidden border h-16 transition-all ${
                      splitMediaUrl === m.url
                        ? 'border-[#22D3EE]'
                        : 'border-white/10 hover:border-[#7C5CFC]/50'
                    }`}
                    title={m.title}
                  >
                    <img
                      src={m.thumbnailUrl || m.url}
                      alt={m.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white px-1 py-0.5 truncate text-left">
                      {m.title}
                    </span>
                  </button>
                ))}
                {visualMedia.length === 0 && (
                  <p className="col-span-2 text-[10px] text-[#9494A8]/70 text-center py-2">
                    Nenhuma mídia na biblioteca ainda.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Proporção da Câmera</span>
                <span className="font-mono">{Math.round(splitCameraRatio * 100)}%</span>
              </div>
              <Slider
                value={[Math.round(splitCameraRatio * 100)]}
                min={30}
                max={80}
                step={5}
                onValueChange={(v) => updateStageConfig({ splitCameraRatio: v[0] / 100 })}
              />
              <p className="text-[9px] text-[#9494A8]/70">
                Altura da câmera no layout dividido. O restante é ocupado pela mídia.
              </p>
            </div>
          </div>

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
                {cameras.length === 0 && <option value="">Nenhum dispositivo detectado</option>}
                {cameras.map((c, idx) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Câmera ${idx + 1}`}
                  </option>
                ))}
              </select>
              {camStatus !== 'ready' && (
                <p className="text-[9px] text-amber-300/80 leading-relaxed">
                  Ative a câmera para ver os nomes reais dos dispositivos. Sua escolha será usada ao
                  ativar.
                </p>
              )}
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
                {mics.length === 0 && <option value="">Nenhum microfone detectado</option>}
                {mics.map((m, idx) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label || `Microfone ${idx + 1}`}
                  </option>
                ))}
              </select>
              {camStatus !== 'ready' && (
                <p className="text-[9px] text-amber-300/80 leading-relaxed">
                  Ative a câmera para ver os nomes reais dos dispositivos. Sua escolha será usada ao
                  ativar.
                </p>
              )}
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

  // === Componente reutilizável: overlay "Ativar Câmera" / erro ===
  const renderCameraGate = () => {
    if (camStatus === 'ready') return null
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0B0B10]/95 backdrop-blur-sm text-center px-4">
        {camStatus === 'idle' && (
          <>
            <div className="w-20 h-20 rounded-3xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-[#7C5CFC]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Câmera desativada</h3>
            <p className="text-xs text-[#9494A8] mb-5 max-w-[260px] leading-relaxed">
              O navegador exige sua autorização para acessar a câmera e o microfone. Clique abaixo
              para ativar.
            </p>
            <button
              onClick={handleActivateCamera}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-sm font-bold shadow-lg shadow-[#7C5CFC]/40 hover:scale-105 transition-all"
            >
              <Camera className="w-4 h-4" /> Ativar Câmera
            </button>
          </>
        )}
        {camStatus === 'requesting' && (
          <>
            <Loader2 className="w-10 h-10 text-[#7C5CFC] animate-spin mb-4" />
            <h3 className="text-base font-bold text-white mb-1">Conectando...</h3>
            <p className="text-xs text-[#9494A8]">Aguardando a permissão do navegador.</p>
          </>
        )}
        {(camStatus === 'denied' || camStatus === 'error') && (
          <>
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
                camPermissionBlocked
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              {camPermissionBlocked ? (
                <Lock className="w-10 h-10 text-amber-400" />
              ) : (
                <AlertCircle className="w-10 h-10 text-red-400" />
              )}
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {camStatus === 'denied'
                ? camPermissionBlocked
                  ? 'Câmera bloqueada'
                  : 'Permissão negada'
                : 'Erro de câmera'}
            </h3>
            <p className="text-xs text-[#9494A8] mb-5 max-w-[300px] leading-relaxed whitespace-pre-line">
              {camError}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleActivateCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1C1C27] border border-white/10 hover:border-[#7C5CFC] text-white text-xs font-bold transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // === Componente reutilizável: seletor de layout no palco ===
  const renderLayoutSelector = (compact = false) => {
    const options: { id: StageLayout; label: string; icon: React.ReactNode }[] = [
      { id: 'full', label: 'Câmera Cheia', icon: <Camera className="w-3.5 h-3.5" /> },
      {
        id: 'split-top',
        label: 'Câmera em Cima',
        icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
      },
      {
        id: 'split-bottom',
        label: 'Câmera em Baixo',
        icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
      },
    ]
    return (
      <div
        className={`flex items-center gap-1 bg-[#14141C]/90 backdrop-blur-md border border-white/10 rounded-full p-1 ${
          compact ? 'scale-90' : ''
        }`}
      >
        {options.map((o) => {
          const active =
            (o.id === 'full' && !isSplit) ||
            (o.id === 'split-top' && (layout === 'split-top' || layout === 'split')) ||
            (o.id === 'split-bottom' && layout === 'split-bottom')
          return (
            <button
              key={o.id}
              onClick={() => setLayout(o.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
                active
                  ? 'bg-[#7C5CFC] text-white shadow'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
              title={o.label}
            >
              {o.icon}
              <span className="hidden sm:inline">{o.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // === Componente reutilizável: palco 9:16 com split screen ===
  const renderStage = () => {
    const camFilter = `brightness(${cameraConfig.brightness}%) contrast(${cameraConfig.contrast}%) blur(${
      cameraConfig.beautySmooth > 0 ? cameraConfig.beautySmooth / 50 : 0
    }px)`

    return (
      <div className="relative aspect-[9/16] h-full max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#14141C]">
        <BackgroundRenderer config={backgroundConfig} />

        {isSplit ? (
          <div className="absolute inset-0 z-10 flex flex-col">
            {/* Determina a ordem das fatias conforme o layout */}
            {layout === 'split-bottom' ? (
              <>
                {/* Mídia em cima */}
                <div
                  className="w-full relative overflow-hidden bg-[#0B0B10]"
                  style={{ flex: `0 0 ${(1 - splitCameraRatio) * 100}%` }}
                >
                  {splitMediaUrl ? (
                    splitMediaType === 'video' ? (
                      <video
                        src={splitMediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={splitMediaUrl} alt="Mídia" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#9494A8] gap-1.5 p-3 text-center">
                      <ImageIcon className="w-6 h-6 opacity-50" />
                      <span className="text-[10px]">Selecione uma mídia na aba "Mídias"</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-black/60" />
                </div>
                {/* Câmera embaixo */}
                <div className="w-full relative overflow-hidden bg-black" style={{ flex: 1 }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ filter: camFilter }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Câmera em cima (split-top / split legacy) */}
                <div
                  className="w-full relative overflow-hidden bg-black"
                  style={{ flex: `0 0 ${splitCameraRatio * 100}%` }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ filter: camFilter }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-black/60" />
                </div>
                {/* Mídia embaixo */}
                <div className="w-full relative overflow-hidden bg-[#0B0B10]" style={{ flex: 1 }}>
                  {splitMediaUrl ? (
                    splitMediaType === 'video' ? (
                      <video
                        src={splitMediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={splitMediaUrl} alt="Mídia" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#9494A8] gap-1.5 p-3 text-center">
                      <ImageIcon className="w-6 h-6 opacity-50" />
                      <span className="text-[10px]">Selecione uma mídia na aba "Mídias"</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover relative z-10"
            style={{ filter: camFilter }}
          />
        )}

        {/* PROMPT 3 — Overlay de artes do bloco atual (sincronizado com o teleprompter). */}
        <BlockArtStageOverlay layout={layout} splitCameraRatio={splitCameraRatio} />

        {/* Vídeo de reação sobreposto ao palco. */}
        <ReactionStageOverlay ref={reactionOverlayRef} isRecording={isRecording} />

        <TitleOverlay
          config={titleConfig}
          onChange={(cfg) => setTitleConfig({ ...titleConfig, ...cfg })}
        />

        {renderCameraGate()}
      </div>
    )
  }

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

        {/* Palco Central 9:16 + seletor de layout */}
        <div className="flex-1 flex flex-col items-center justify-center my-4 overflow-hidden gap-3">
          {renderStage()}
          {renderLayoutSelector(true)}
        </div>

        {/* Footer Minimalista com Botão REC Flutuante */}
        <div className="relative z-50 flex items-center justify-center pb-2">
          <button
            onClick={handleToggleRecord}
            disabled={camStatus !== 'ready'}
            className={`flex items-center gap-3 px-8 py-4 rounded-full text-base font-extrabold shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
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
        <div className="flex-1 lg:w-[62%] flex flex-col items-center justify-center p-4 bg-[#0B0B10] relative overflow-hidden gap-3">
          {/* Palco 9:16 com split screen */}
          {renderStage()}

          {/* Seletor de layout + Controls Flutuantes no Canvas */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {renderLayoutSelector()}
            <div className="flex items-center gap-4 bg-[#14141C]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-[#9494A8]">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span className="font-mono">{micLevel}%</span>
              </span>
              <span>•</span>
              <span>Câmera Principal (1080p)</span>
            </div>
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

      <MediaLibraryModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        categoryFilter="all"
        onSelect={(item) => {
          if (item && (item.type === 'image' || item.type === 'video') && item.url) {
            updateStageConfig({
              splitMediaUrl: item.url,
              splitMediaType: item.type,
            })
            toast.success(`Mídia "${item.title}" selecionada para tela dividida.`)
          }
        }}
      />
    </div>
  )
}
