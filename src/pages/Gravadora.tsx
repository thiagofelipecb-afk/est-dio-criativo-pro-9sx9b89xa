import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScrollText,
  Camera,
  Mic,
  Maximize2,
  Minimize2,
  Square,
  Settings2,
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
import { StudioStage, type StudioStageHandle } from '@/components/studio/StudioStage'
import {
  DEFAULT_CAMERA_CROP,
  loadMediaElement,
  type CameraCrop,
  type SplitMediaLayer,
  type ArtLayer,
} from '@/lib/studio-compositor'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MediaLibraryModal } from '@/components/MediaLibraryModal'
import { MediaPanel } from '@/components/studio/MediaPanel'
import {
  ReactionStageOverlay,
  type ReactionStageOverlayHandle,
} from '@/components/studio/ReactionStageOverlay'
import { RecordingDock } from '@/components/studio/RecordingDock'
import { PreFlightCheck } from '@/components/studio/PreFlightCheck'
import { StudioAccordionPanel } from '@/components/studio/StudioAccordionPanel'
import { EmptyScriptCard } from '@/components/studio/EmptyScriptCard'
import { SplitPreviewDialog } from '@/components/studio/SplitPreviewDialog'
import { CountdownOverlay } from '@/components/studio/CountdownOverlay'
import {
  type PreFlightInput,
  type AspectRatioOption,
  type SplitModeId,
  isActivelyRecording,
} from '@/lib/studio-recording-logic'
import { useRecordingStateMachine } from '@/hooks/use-recording-state-machine'
import { singleBlockFromText, type SplitPresetId } from '@/lib/script-split'
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
    setRecordingState: setContextRecordingState,
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
    setGravadoraScript: useStudioSetGravadoraScript,
    setScriptBlocks: useStudioSetScriptBlocks,
    stageConfig,
    updateStageConfig,
    syncArtsEnabled,
    setSyncArtsEnabled,
    reactionConfig,
    activeBlockIndex,
    artBlockIndex,
    getAssignmentsForBlock,
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

  // === Compositor único (canvas) ===
  // StudioStage renderiza TODA a composição (fundo, câmera, split, arte,
  // reação, título) no MESMO canvas. A gravação usa canvas.captureStream() —
  // preview e arquivo gravado são idênticos.
  const stageRef = useRef<StudioStageHandle | null>(null)
  // Enquadramento digital (zoom + pan + espelhamento). Persistido por projeto.
  const [cameraCrop, setCameraCrop] = useState<CameraCrop>(() => {
    try {
      const saved = localStorage.getItem('lumen_gravadora_camera_crop')
      if (saved) return { ...DEFAULT_CAMERA_CROP, ...JSON.parse(saved) }
    } catch {
      /* noop */
    }
    return DEFAULT_CAMERA_CROP
  })
  useEffect(() => {
    localStorage.setItem('lumen_gravadora_camera_crop', JSON.stringify(cameraCrop))
  }, [cameraCrop])

  // Elemento <video> oculto que recebe o stream da webcam. O StudioStage lê
  // dele para desenhar no canvas.
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)

  // Elemento de mídia carregado para a tela dividida (imagem ou vídeo).
  const [splitMediaEl, setSplitMediaEl] = useState<HTMLImageElement | HTMLVideoElement | null>(null)

  // Capacidades reais do dispositivo de câmera (getCapabilities/getSettings).
  const [cameraCapabilities, setCameraCapabilities] = useState<{
    maxWidth: number
    maxHeight: number
    maxFrameRate: number
    zoom: { min: number; max: number; step: number } | null
    supportedResolutions: string[]
  } | null>(null)

  // Medidor de Áudio
  const [micLevel, setMicLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // === Módulos 5/6/7 — Máquina de estados da gravação + checklist ===
  // Hook canônico da máquina de estados. Toda mutação de `recordingState`
  // passa por aqui (transições validadas). O StudioContext espelha o estado
  // para leitura compartilhada por outros componentes do estúdio.
  const rsm = useRecordingStateMachine()
  const recordingState = rsm.state
  useEffect(() => {
    setContextRecordingState(recordingState)
  }, [recordingState, setContextRecordingState])

  const [preFlightOpen, setPreFlightOpen] = useState(false)
  const [countdownOverlay, setCountdownOverlay] = useState<number | null>(null)
  const [markers, setMarkers] = useState<number[]>([])
  // Refs do scheduler de contagem para permitir cancelamento (Esc).
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownCancelledRef = useRef(false)
  const [recordingSettings, setRecordingSettings] = useState<{
    format: string
    quality: string
    countdown: 3 | 5 | 0
    autoSave: boolean
    takeName: string
  }>(() => {
    try {
      const saved = localStorage.getItem('lumen_recording_settings')
      if (saved) return JSON.parse(saved)
    } catch {
      /* noop */
    }
    return {
      format: 'video/webm',
      quality: 'high',
      countdown: 3,
      autoSave: true,
      takeName: 'take-001',
    }
  })
  useEffect(() => {
    localStorage.setItem('lumen_recording_settings', JSON.stringify(recordingSettings))
  }, [recordingSettings])

  // Configurações de layout/aparência do acordeão (estado local — não altera o
  // compositor, apenas refletido nos controles; o layout real continua sendo
  // stageConfig para preservar o que já funciona).
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('9:16')
  const [splitMode, setSplitMode] = useState<SplitModeId>('full')
  const [margin, setMargin] = useState(0)
  const [spacing, setSpacing] = useState(0)
  const [borderRadiusVal, setBorderRadiusVal] = useState(0)
  const [borderWidthVal, setBorderWidthVal] = useState(0)

  // Aparência (retoque facial) — estado local. MediaPipe/WebGL carregados
  // sob demanda; se indisponível, o painel mostra o aviso apropriado.
  const [beauty, setBeautyState] = useState({
    skinSmooth: 0,
    shineReduction: 0,
    toneUniformity: 0,
    rednessReduction: 0,
    wrinkleSmooth: 0,
    eyeEnhance: 0,
    nasolabial: 0,
    darkCircles: 0,
    facialLighting: 0,
    selectiveSharpness: 0,
    intensity: 0,
  })
  const setBeauty = useCallback(
    (u: Partial<typeof beauty>) => setBeautyState((p) => ({ ...p, ...u })),
    [],
  )
  const [mediapipeAvailable, setMediapipeAvailable] = useState(false)
  const [mediapipeLoading, setMediapipeLoading] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const webglAvailable =
    typeof window !== 'undefined' &&
    (() => {
      try {
        return !!document.createElement('canvas').getContext('webgl')
      } catch {
        return false
      }
    })()
  // Pipeline de aparência. Não usamos @mediapipe/tasks-vision (quebrava o build
  // e adicionaria ~8MB). Em vez disso, tentamos a FaceDetector API nativa do
  // navegador quando disponível para habilitar os controles faciais refinados;
  // quando indisponível, os ajustes GLOBAIS de imagem (brilho, contraste,
  // saturação, temperatura, suavização, vinheta) continuam 100% funcionais —
  // eles são aplicados no compositor via ctx.filter e mudam visivelmente o
  // preview e a gravação. O botão "Carregar modelo facial" apenas ativa a
  // detecção opcional; os presets de aparência funcionam independentemente.
  const faceDetectorRef = useRef<any>(null)
  const loadMediapipe = useCallback(async () => {
    setMediapipeLoading(true)
    try {
      // Tenta a Shape Detection API (FaceDetector). Disponível em alguns
      // Chromium-based browsers por trás de flag/experimentos.
      const FD = (window as any).FaceDetector
      if (typeof FD === 'function') {
        faceDetectorRef.current = new FD({ fastMode: true, maxDetectedFaces: 1 })
        // Probe rápido: se conseguir criar, consideramos disponível. A detecção
        // real acontece no loop de composição; se não houver rosto, os controles
        // globais continuam atuando.
        setMediapipeAvailable(true)
        toast.success('Detecção facial ativada. Ajustes de imagem já estão ativos.')
      } else {
        // Sem FaceDetector nativa: os ajustes globais de imagem continuam
        // funcionando (são aplicados no compositor). Apenas os controles faciais
        // refinados por região ficam limitados.
        setMediapipeAvailable(false)
        toast.info(
          'Ajustes de imagem globais ativos. Detecção facial por região não é suportada neste navegador.',
        )
      }
    } catch {
      setMediapipeAvailable(false)
      toast.info('Ajustes de imagem globais ativos. Detecção facial indisponível.')
    } finally {
      setMediapipeLoading(false)
    }
  }, [])

  // Sincroniza recordingState com camStatus (quando a câmera liga/desliga fora
  // do fluxo de gravação, ex.: handleActivateCamera). O beforeunload e a
  // validação de transições agora vivem no hook useRecordingStateMachine.
  useEffect(() => {
    if (camStatus === 'requesting' && recordingState === 'idle') {
      rsm.transition('requesting-permissions')
    } else if (camStatus === 'ready' && recordingState === 'requesting-permissions') {
      rsm.transition('camera-ready')
    } else if (camStatus === 'denied' && recordingState === 'requesting-permissions') {
      rsm.setErrorMessage(
        'Permissão de câmera negada. Autorize o acesso nas configurações do navegador.',
      )
      rsm.forceState('error')
    } else if (camStatus === 'error' && recordingState === 'requesting-permissions') {
      rsm.setErrorMessage(camError || 'Dispositivo de câmera ocupado ou indisponível.')
      rsm.forceState('error')
    } else if (camStatus === 'idle' && recordingState === 'camera-ready') {
      // Câmera desligada manualmente → volta a idle.
      rsm.transition('idle')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camStatus])

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

      // Conecta o stream ao <video> oculto que alimenta o compositor canvas.
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = mediaStream
        hiddenVideoRef.current.play().catch(() => {})
      }

      // Detecta capacidades reais da câmera (getCapabilities/getSettings).
      try {
        const track = mediaStream.getVideoTracks()[0]
        if (track) {
          const caps = (track as any).getCapabilities?.() ?? {}
          const settings = track.getSettings?.() ?? {}
          const maxW = Math.max(caps.width?.max || 0, settings.width || 0, 1280)
          const maxH = Math.max(caps.height?.max || 0, settings.height || 0, 720)
          const maxFps = Math.max(caps.frameRate?.max || 0, settings.frameRate || 0, 30)
          const zoom =
            caps.zoom && typeof caps.zoom.max === 'number'
              ? {
                  min: caps.zoom.min ?? 100,
                  max: caps.zoom.max,
                  step: caps.zoom.step ?? 10,
                }
              : null
          const supported: string[] = []
          if (maxH >= 720) supported.push('720p')
          if (maxH >= 1080) supported.push('1080p')
          if (maxH >= 1440) supported.push('1440p')
          if (maxH >= 2160) supported.push('4K')
          setCameraCapabilities({
            maxWidth: maxW,
            maxHeight: maxH,
            maxFrameRate: maxFps,
            zoom,
            supportedResolutions: supported,
          })
        }
      } catch {
        /* getCapabilities pode não existir — ignoramos silenciosamente */
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

  // === Fluxo de roteiro frontal ===
  // Estado sem roteiro: card central no palco. Visível quando não há blocos E
  // não estamos em modo foco E a câmera está pronta/idle (não bloqueia o gate).
  const [splitPreviewOpen, setSplitPreviewOpen] = useState(false)
  const [splitText, setSplitText] = useState('')
  const [splitPreset, setSplitPreset] = useState<SplitPresetId>('medium')
  // Descarta o card central manualmente (ex.: usuário começou a digitar no
  // painel lateral). Volta a aparecer quando blocos são limpos.
  const [dismissEmptyCard, setDismissEmptyCard] = useState(false)

  // Aliases locais para os setters do StudioContext (não são hooks quando usados
  // como valores dentro de callbacks — apenas referências estáveis).
  const setBlocks = useStudioSetScriptBlocks
  const setScript = useStudioSetGravadoraScript

  const showEmptyScriptCard = scriptBlocks.length === 0 && !isFocusMode && !dismissEmptyCard

  // Abre o preview de divisão a partir do EmptyScriptCard.
  const handleDivideFromEmpty = useCallback((text: string) => {
    setSplitText(text)
    setSplitPreviewOpen(true)
  }, [])

  // "Usar texto inteiro": cria 1 bloco e inicia.
  const handleUseWholeFromEmpty = useCallback(
    (text: string) => {
      const blocks = singleBlockFromText(text)
      if (blocks.length === 0) {
        toast.warning('Escreva ou cole seu roteiro primeiro.')
        return
      }
      setBlocks(blocks)
      setScript(text)
      setDismissEmptyCard(true)
      toast.success('Roteiro criado como bloco único.')
    },
    // setBlocks/setScript são identidades estáveis do useStudio (useCallback).
    [],
  )

  // "Salvar como rascunho": persiste o texto bruto no localStorage.
  const handleSaveDraftFromEmpty = useCallback((text: string) => {
    try {
      localStorage.setItem('lumen_script_draft', text)
      toast.success('Rascunho salvo localmente.')
    } catch {
      toast.error('Não foi possível salvar o rascunho.')
    }
  }, [])

  // Aplica a divisão vinda do preview.
  const handleApplySplit = useCallback(
    (blocks: import('@/types/studio').ScriptBlock[], preset: SplitPresetId) => {
      setSplitPreset(preset)
      setBlocks(blocks)
      setScript(blocks.map((b) => b.text).join('\n\n'))
      setDismissEmptyCard(true)
      toast.success(`${blocks.length} blocos criados.`)
    },
    [],
  )

  const setLayout = useCallback(
    (next: StageLayout) => updateStageConfig({ layout: next }),
    [updateStageConfig],
  )

  // === Carrega o elemento de mídia (imagem/vídeo) da tela dividida ===
  // O compositor precisa de um HTMLImageElement/HTMLVideoElement pronto para
  // drawImage. Recarrega sempre que a URL ou o tipo muda. Para vídeos, damos
  // play() imediato (muted+loop) e mantemos a referência em splitMediaVideoRef
  // para garantir que permaneça tocando durante a gravação — o captureStream()
  // do canvas só captura o que está desenhado no momento, então o vídeo precisa
  // estar em play para aparecer no arquivo gravado.
  const splitMediaVideoRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (!splitMediaUrl) {
      // Limpa vídeo anterior.
      if (splitMediaVideoRef.current) {
        try {
          splitMediaVideoRef.current.pause()
        } catch {
          /* noop */
        }
        splitMediaVideoRef.current = null
      }
      setSplitMediaEl(null)
      return
    }
    let cancelled = false
    loadMediaElement(splitMediaUrl, splitMediaType)
      .then((el) => {
        if (cancelled) return
        setSplitMediaEl(el)
        if (splitMediaType === 'video') {
          const v = el as HTMLVideoElement
          splitMediaVideoRef.current = v
          v.muted = true
          v.loop = true
          v.playsInline = true
          v.play().catch(() => {
            /* autoplay pode ser bloqueado; o compositor desenha o frame atual */
          })
        }
      })
      .catch(() => {
        if (!cancelled) setSplitMediaEl(null)
      })
    return () => {
      cancelled = true
    }
  }, [splitMediaUrl, splitMediaType])

  // === Arte do bloco ativo (alimenta o compositor) ===
  // Resolve a arte do bloco atual (sincronizado com o teleprompter quando
  // syncArtsEnabled está ligado) e carrega o HTMLImageElement correspondente.
  const activeBlockArt = useMemo(() => {
    const idx = syncArtsEnabled ? activeBlockIndex : artBlockIndex
    const block = scriptBlocks[idx]
    if (!block) return null
    const assignments = getAssignmentsForBlock(block.id)
    if (assignments.length === 0) return null
    const assignment = assignments[0]
    const asset = mediaAssets.find((a) => a.id === assignment.assetId)
    if (!asset) return null
    return { assignment, asset }
  }, [
    syncArtsEnabled,
    activeBlockIndex,
    artBlockIndex,
    scriptBlocks,
    getAssignmentsForBlock,
    mediaAssets,
  ])

  // Imagem da arte do bloco ativo (carregada para drawImage no canvas).
  const [artImageEl, setArtImageEl] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!activeBlockArt) {
      setArtImageEl(null)
      return
    }
    const { asset } = activeBlockArt
    const url = asset.publicUrl || asset.thumbnailUrl || ''
    if (!url) {
      setArtImageEl(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!cancelled) setArtImageEl(img)
    }
    img.onerror = () => {
      if (!cancelled) setArtImageEl(null)
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [activeBlockArt])

  // Camada de arte consolidada para o compositor (ArtLayer).
  const activeArtLayer: ArtLayer | null = useMemo(() => {
    if (!activeBlockArt || !artImageEl) return null
    const a = activeBlockArt.assignment
    return {
      asset: activeBlockArt.asset,
      imageEl: artImageEl,
      fit: a.fit,
      positionX: a.positionX,
      positionY: a.positionY,
      scale: a.scale,
      backgroundColor: a.backgroundColor,
    }
  }, [activeBlockArt, artImageEl])

  // === Módulos 5/6/7 — Fluxo de gravação via RecordingDock + PreFlightCheck ===
  // Inicia o MediaRecorder (gravação via canvas.captureStream permanece intacta).
  const startRecording = useCallback(() => {
    if (!stream) {
      rsm.setErrorMessage('Câmera não conectada.')
      rsm.forceState('error')
      toast.error('Câmera não conectada. Clique em "Ativar Câmera" primeiro.')
      return
    }
    // Guarda: não permitir gravar sem stream válido de câmera.
    if (stream.getVideoTracks().length === 0) {
      rsm.setErrorMessage('Stream de câmera inválido.')
      rsm.forceState('error')
      toast.error('Stream de câmera inválido. Reinicie a câmera.')
      return
    }
    // Guarda: não permitir dois gravadores simultâneos.
    if (
      rsm.recorderActive ||
      (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
    ) {
      toast.warning('Já existe uma gravação em andamento.')
      return
    }
    recordedChunksRef.current = []
    setMarkers([])
    rsm.setRecorderActive(true)

    const reactionVideoEl = reactionOverlayRef.current?.video || null
    const useReactionAudio =
      reactionConfig.enabled && !!reactionVideoEl && reactionConfig.audioMix !== 'voice-only'

    try {
      // === Gravação via canvas.captureStream() (compositor único) ===
      // O vídeo gravado vem do MESMO canvas do preview — preview e arquivo são
      // idênticos. As tracks de áudio (microfone e/ou mix de reação) são
      // adicionadas ao stream do canvas.
      const canvasStream = stageRef.current?.captureStream(30)
      if (!canvasStream) {
        rsm.setErrorMessage('Compositor indisponível.')
        rsm.forceState('error')
        rsm.setRecorderActive(false)
        toast.error('Erro ao iniciar o compositor de vídeo.')
        return
      }

      let recorderStream: MediaStream

      if (useReactionAudio) {
        const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
        const audioCtx = new AC()
        mixAudioCtxRef.current = audioCtx
        const dest = audioCtx.createMediaStreamDestination()

        if (reactionConfig.audioMix !== 'reaction-only') {
          try {
            const micSource = audioCtx.createMediaStreamSource(stream)
            micSource.connect(dest)
          } catch {
            /* noop */
          }
        }
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

        // Vídeo do canvas + áudio mixado (mic + reação) do AudioContext.
        recorderStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ])
      } else {
        // Vídeo do canvas + áudio do microfone (stream bruto).
        recorderStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ])
      }

      const recorder = new MediaRecorder(recorderStream, { mimeType: recordingSettings.format })
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        rsm.forceState('processing')
        try {
          const blob = new Blob(recordedChunksRef.current, { type: recordingSettings.format })
          if (activeProjectId) {
            await saveRawVideo(activeProjectId, blob, recTimer, recordingSettings.format)
          }
          const name = recordingSettings.takeName || `take-${Date.now()}`
          rsm.setLastTakeName(`${name}.webm`)
          rsm.forceState('saved')
          toast.success(`Take salvo: ${name}.webm`)
        } catch (err) {
          // Em caso de erro, tenta salvar take parcial (chunks coletados até então).
          try {
            if (recordedChunksRef.current.length > 0 && activeProjectId) {
              const partialBlob = new Blob(recordedChunksRef.current, {
                type: recordingSettings.format,
              })
              await saveRawVideo(activeProjectId, partialBlob, recTimer, recordingSettings.format)
              toast.warning('Take parcial salvo devido a erro.')
            }
          } catch {
            /* noop — melhor esforço */
          }
          rsm.setErrorMessage('Falha ao salvar o take.')
          rsm.forceState('error')
          toast.error('Erro ao processar o take.')
        } finally {
          rsm.setRecorderActive(false)
        }
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder

      if (reactionConfig.enabled && reactionVideoEl) {
        try {
          if (reactionConfig.startOffsetMs > 0) {
            reactionVideoEl.currentTime = reactionConfig.startOffsetMs / 1000
          }
          if (useReactionAudio) reactionVideoEl.muted = false
          reactionVideoEl.play().catch(() => {})
        } catch {
          /* noop */
        }
      }

      setIsRecording(true)
      rsm.forceState('recording')
      toast.info('Gravação iniciada...')
    } catch (err: any) {
      rsm.setErrorMessage(err?.message || 'Não foi possível iniciar a gravação.')
      rsm.forceState('error')
      rsm.setRecorderActive(false)
      toast.error('Erro ao iniciar a gravação.')
    }
  }, [
    stream,
    reactionConfig,
    recordingSettings,
    activeProjectId,
    saveRawVideo,
    recTimer,
    setIsRecording,
    rsm,
  ])

  // Solicita gravação → abre o checklist pré-gravação.
  const onRequestRecord = useCallback(() => {
    if (isActivelyRecording(recordingState)) return
    setPreFlightOpen(true)
  }, [recordingState])

  // Continua após o checklist (ignorando avisos não-bloqueantes). Inicia a
  // contagem regressiva visual (com beep) e ao final chama startRecording.
  const onPreFlightContinue = useCallback(() => {
    setPreFlightOpen(false)
    const cd = recordingSettings.countdown
    if (cd === 0) {
      startRecording()
      return
    }
    // countdown: transição validada camera-ready → countdown.
    if (!rsm.transition('countdown')) return
    countdownCancelledRef.current = false
    let n = cd
    setCountdownOverlay(n)
    playBeep()
    const tick = () => {
      if (countdownCancelledRef.current) return
      n -= 1
      if (n <= 0) {
        // Último frame: bolinha vermelha de REC por 500ms antes de gravar.
        setCountdownOverlay(0)
        playBeep(1000)
        countdownTimerRef.current = setTimeout(() => {
          setCountdownOverlay(null)
          startRecording()
        }, 500)
      } else {
        setCountdownOverlay(n)
        playBeep()
        countdownTimerRef.current = setTimeout(tick, 1000)
      }
    }
    countdownTimerRef.current = setTimeout(tick, 1000)
  }, [recordingSettings.countdown, startRecording, rsm])

  // Cancela a contagem regressiva (Esc) e volta para camera-ready.
  const cancelCountdown = useCallback(() => {
    countdownCancelledRef.current = true
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setCountdownOverlay(null)
    rsm.transition('camera-ready')
  }, [rsm])

  const handlePauseRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.pause()
      setIsRecording(false)
      rsm.transition('paused')
      toast.info('Gravação pausada.')
    } catch {
      /* noop */
    }
  }, [setIsRecording, rsm])

  const handleResumeRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.resume()
      setIsRecording(true)
      rsm.transition('recording')
      toast.info('Gravação retomada.')
    } catch {
      /* noop */
    }
  }, [setIsRecording, rsm])

  const handleStopRecording = useCallback(() => {
    rsm.transition('stopping')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    try {
      reactionOverlayRef.current?.video?.pause()
    } catch {
      /* noop */
    }
    try {
      mixAudioCtxRef.current?.close()
    } catch {
      /* noop */
    }
    mixAudioCtxRef.current = null
    setIsRecording(false)
    // onstop do recorder transita para 'processing' -> 'saved'.
  }, [rsm, setIsRecording])

  // Reiniciar/descartar o take atual: volta para idle (ou camera-ready se a
  // câmera ainda estiver ligada). Limpa marcadores e chunks.
  const handleResetTake = useCallback(() => {
    rsm.reset()
    setMarkers([])
    recordedChunksRef.current = []
    setIsRecording(false)
    // Se a câmera continua ligada, reflete camera-ready.
    if (camStatus === 'ready') {
      rsm.forceState('camera-ready')
    }
    toast.info('Take descartado. Pronto para novo take.')
  }, [rsm, setIsRecording, camStatus])

  const handleAddMarker = useCallback(() => {
    setMarkers((m) => [...m, recTimer])
    toast.success(`Marcador adicionado em ${formatTimer(recTimer)}`)
  }, [recTimer])

  // Toggle câmera pelo dock.
  const handleDockToggleCamera = useCallback(() => {
    if (camStatus === 'ready') {
      // Desligar câmera.
      if (isActivelyRecording(recordingState)) {
        toast.warning('Pare a gravação antes de desligar a câmera.')
        return
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStream(null)
      setCamStatus('idle')
      rsm.forceState('idle')
    } else {
      handleActivateCamera()
    }
  }, [camStatus, recordingState, handleActivateCamera, rsm])

  const handleDockToggleMic = useCallback(() => {
    if (!streamRef.current) return
    const tracks = streamRef.current.getAudioTracks()
    if (tracks.length === 0) return
    const enabled = !tracks[0].enabled
    tracks.forEach((t) => (t.enabled = enabled))
    toast.info(enabled ? 'Microfone ativado.' : 'Microfone mutado.')
  }, [])

  // Beep da contagem regressiva (Web Audio oscillator, 800Hz/1000Hz, 100ms).
  const playBeep = useCallback((freq = 800) => {
    try {
      const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const ctx = audioContextRef.current ?? new AC()
      audioContextRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch {
      /* noop — áudio é melhor esforço */
    }
  }, [])

  const handleTestAudio = useCallback(() => {
    toast.info(`Nível atual do microfone: ${micLevel}%`)
  }, [micLevel])

  const handleFixPreFlight = useCallback(
    (itemId: string) => {
      setPreFlightOpen(false)
      if (itemId === 'camera' || itemId === 'mic') {
        handleActivateCamera()
      }
    },
    [handleActivateCamera],
  )

  // Dismiss do erro (error → idle).
  const handleDismissError = useCallback(() => {
    rsm.dismissError()
    if (camStatus === 'ready') rsm.forceState('camera-ready')
  }, [rsm, camStatus])

  // Atalhos de teclado da gravação: R (gravar), Espaço (pausa/continua),
  // Esc (finaliza ou cancela contagem). Não disparam durante digitação.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const editing =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if (editing) return

      // Esc: finaliza gravação OU cancela contagem regressiva.
      if (e.key === 'Escape') {
        if (recordingState === 'countdown') {
          e.preventDefault()
          cancelCountdown()
        } else if (recordingState === 'recording' || recordingState === 'paused') {
          e.preventDefault()
          handleStopRecording()
        }
        return
      }
      // Espaço: pausa/continua (só durante gravação).
      if (e.code === 'Space') {
        if (recordingState === 'recording') {
          e.preventDefault()
          handlePauseRecording()
        } else if (recordingState === 'paused') {
          e.preventDefault()
          handleResumeRecording()
        }
        return
      }
      // R: inicia gravação (só em camera-ready).
      if (e.key === 'r' || e.key === 'R') {
        if (recordingState === 'camera-ready') {
          e.preventDefault()
          onRequestRecord()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    recordingState,
    cancelCountdown,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    onRequestRecord,
  ])

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

  // === Componente reutilizável: palco 9:16 (compositor único) ===
  // O StudioStage é a ÚNICA fonte de verdade visual: fundo, câmera, split,
  // arte, reação e título são desenhados no MESMO canvas. A gravação usa
  // canvas.captureStream() — preview e arquivo gravado são idênticos.
  // O <video> oculto da reação (ReactionStageOverlay) continua montado fora
  // do palco visual para alimentar o compositor e o AudioContext de mixagem.
  const renderStage = () => {
    return (
      <div className="relative aspect-[9/16] h-full max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#14141C]">
        <StudioStage
          ref={stageRef}
          aspect="9:16"
          layout={layout}
          background={backgroundConfig}
          camera={cameraConfig}
          cameraCrop={cameraCrop}
          cameraVideo={hiddenVideoRef.current}
          split={
            isSplit && splitMediaUrl
              ? { url: splitMediaUrl, type: splitMediaType, cameraRatio: splitCameraRatio }
              : null
          }
          splitMediaEl={splitMediaEl}
          art={activeArtLayer}
          reaction={
            reactionConfig.enabled && reactionOverlayRef.current?.video
              ? {
                  video: reactionOverlayRef.current.video,
                  scale: reactionConfig.scale,
                  position: reactionConfig.position,
                  borderRadius: reactionConfig.borderRadius,
                  borderWidth: reactionConfig.borderWidth,
                  borderColor: reactionConfig.borderColor,
                }
              : null
          }
          title={titleConfig.enabled ? titleConfig : null}
          showGuides={!isRecording}
          className="w-full h-full"
        />

        {renderCameraGate()}

        {/* Card central do estado sem roteiro (sobre o palco). */}
        {showEmptyScriptCard && (
          <EmptyScriptCard
            value={gravadoraScript}
            onTextChange={useStudioSetGravadoraScript}
            onDivide={handleDivideFromEmpty}
            onUseWhole={handleUseWholeFromEmpty}
            onSaveDraft={handleSaveDraftFromEmpty}
          />
        )}
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
            onClick={isActivelyRecording(recordingState) ? handleStopRecording : onRequestRecord}
            disabled={camStatus !== 'ready' && !isActivelyRecording(recordingState)}
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
          {/* Record Button (header) — dispara o checklist pré-gravação */}
          <button
            onClick={isActivelyRecording(recordingState) ? handleStopRecording : onRequestRecord}
            disabled={camStatus !== 'ready' && !isActivelyRecording(recordingState)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
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

      {/* Main Container Dual-Column Layout — altura reserva para o dock (~64px) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative pb-16">
        {/* Esquerda (62% Desktop / Full Mobile): Palco & Canvas 9:16 */}
        <div className="flex-1 lg:w-[62%] flex flex-col items-center justify-center p-4 bg-[#0B0B10] relative overflow-hidden gap-3">
          {/* Palco 9:16 com split screen */}
          {renderStage()}

          {/* Contagem regressiva central (Módulo 7) — overlay fullscreen com
              animação scale+fade e bolinha vermelha de REC no último frame. */}
          <CountdownOverlay value={countdownOverlay} onCancel={cancelCountdown} />

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

        {/* Direita (38% Desktop): Painel em Acordeões (Módulo 4) */}
        <div className="hidden lg:block lg:w-[38%] border-l border-white/5 bg-[#0E0E15] h-full">
          <StudioAccordionPanel
            projectId={activeProjectId || 'temp'}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            splitMode={splitMode}
            onSplitModeChange={setSplitMode}
            splitCameraRatio={stageConfig.splitCameraRatio ?? 0.6}
            onSplitCameraRatioChange={(v) => updateStageConfig({ splitCameraRatio: v })}
            margin={margin}
            onMarginChange={setMargin}
            spacing={spacing}
            onSpacingChange={setSpacing}
            borderRadius={borderRadiusVal}
            onBorderRadiusChange={setBorderRadiusVal}
            borderWidth={borderWidthVal}
            onBorderWidthChange={setBorderWidthVal}
            cameras={cameras}
            selectedCamera={selectedCamera}
            onSelectCamera={(id) => {
              setSelectedCamera(id)
              saveDevicePreference(id, selectedMic)
            }}
            cameraCapabilities={cameraCapabilities}
            cameraConfig={cameraConfig}
            updateCameraConfig={updateCameraConfig}
            camStatus={camStatus}
            beauty={beauty}
            setBeauty={setBeauty}
            faceDetected={faceDetected}
            mediapipeLoading={mediapipeLoading}
            mediapipeAvailable={mediapipeAvailable}
            webglAvailable={webglAvailable}
            onLoadMediapipe={loadMediapipe}
            mics={mics}
            selectedMic={selectedMic}
            onSelectMic={(id) => {
              setSelectedMic(id)
              saveDevicePreference(selectedCamera, id)
            }}
            audioConfig={audioConfig}
            updateAudioConfig={updateAudioConfig}
            micLevel={micLevel}
            recordingSettings={recordingSettings}
            setRecordingSettings={(u) => setRecordingSettings((p) => ({ ...p, ...u }))}
            gravadoraScript={gravadoraScript}
            setGravadoraScript={useStudioSetGravadoraScript}
            setScriptBlocks={useStudioSetScriptBlocks}
          />
        </div>

        {/* Mobile / Tablet (<1180px) Drawer de Configuração */}
        <div className="lg:hidden absolute bottom-20 right-4 z-40">
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
              <div className="h-[calc(100vh-60px)]">
                {/* Mobile reutiliza as tabs legadas para não duplicar a árvore */}
                {renderConfigTabs()}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Dock de Gravação fixo (Módulo 5) — acima do palco, abaixo do HUD */}
        <RecordingDock
          state={recordingState}
          elapsed={recTimer}
          cameraOn={camStatus === 'ready'}
          micOn={stream?.getAudioTracks().some((t) => t.enabled) ?? false}
          micLevel={micLevel}
          countdown={recordingSettings.countdown}
          errorMessage={rsm.errorMessage}
          lastTakeName={rsm.lastTakeName}
          countdownValue={countdownOverlay}
          onToggleCamera={handleDockToggleCamera}
          onToggleMic={handleDockToggleMic}
          onTestAudio={handleTestAudio}
          onCountdownChange={(v) => setRecordingSettings((p) => ({ ...p, countdown: v }))}
          onRecord={onRequestRecord}
          onPause={handlePauseRecording}
          onResume={handleResumeRecording}
          onStop={handleStopRecording}
          onMarker={handleAddMarker}
          onResetTake={handleResetTake}
        />

        {/* Checklist pré-gravação (Módulo 6) */}
        <PreFlightCheck
          open={preFlightOpen}
          onOpenChange={setPreFlightOpen}
          onContinue={onPreFlightContinue}
          onFix={handleFixPreFlight}
          input={{
            cameraStream: stream && stream.getVideoTracks().length > 0 ? stream : null,
            micStream: stream && stream.getAudioTracks().length > 0 ? stream : null,
            composerReady: !!stageRef.current || !!stream,
            resolution: cameraCapabilities
              ? { width: cameraCapabilities.maxWidth, height: cameraCapabilities.maxHeight }
              : null,
            fps: cameraCapabilities?.maxFrameRate ?? null,
            micLevel,
            layout: stageConfig.layout,
            hasScript,
            teleprompterConfigured: !!prompterConfig.mode,
            backgroundOk: backgroundConfig.type !== 'none' || !backgroundConfig.segmentationEnabled,
            effectsActive: beauty.intensity > 0,
            blockMediaLoaded: false,
          }}
        />
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

      {/* Modal de preview da divisão do roteiro em blocos. */}
      <SplitPreviewDialog
        open={splitPreviewOpen}
        onOpenChange={setSplitPreviewOpen}
        text={splitText}
        existingBlockCount={scriptBlocks.length}
        initialPreset={splitPreset}
        onApply={handleApplySplit}
      />
    </div>
  )
}
