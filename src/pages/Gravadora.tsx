import React, { useState, useEffect, useRef, useCallback } from 'react'
// FASE 3 — sincroniza IDs dos blocos do roteiro (vindos do StudioContext) para
// os overlays de artes/b-roll por bloco.
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Camera,
  Mic,
  VideoOff,
  Sparkles,
  QrCode,
  ScrollText,
  Play,
  Square,
  Pause,
  FolderPlus,
  Sliders,
  Grid,
  Sun,
  Contrast,
  Smile,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Columns2,
  RectangleHorizontal,
  ShieldCheck,
  AlertCircle,
  AudioLines,
  Volume2,
  RefreshCw,
  Loader2,
  Check,
  Image as ImageIcon,
  Video,
  Film,
  PenLine,
  Save,
  AlertTriangle,
  Package,
  Zap,
  Cloud,
  CloudOff,
  CloudCheck,
  Upload,
} from 'lucide-react'
import { ImportTake } from '@/components/studio/ImportTake'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  StageLayout,
  LowerPanelMode,
  AudioConfig,
  RecordingTake,
  ProjectSnapshot,
  BlockArt,
  BlockBRoll,
} from '@/types/studio'
import ScriptPanel from '@/components/ScriptPanel'
import { PanelBottom, GripHorizontal, RotateCcw } from 'lucide-react'
import {
  useReactionVideo,
  useWhiteboard,
  readBlockArts,
  readBlockBRoll,
  readReactionVideo,
  readWhiteboardPreview,
} from '@/hooks/use-block-media'
import { ExternalLink } from 'lucide-react'
import { BackgroundRenderer } from '@/components/studio/BackgroundRenderer'
import { TitleOverlay } from '@/components/studio/TitleOverlay'
import { useStudioMode, blockedMessage, type StudioAction } from '@/hooks/use-studio-mode'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'
import { useRecordingGuard } from '@/hooks/use-recording-guard'
import { useDraftStore } from '@/hooks/use-draft-store'
import { assetManager } from '@/lib/asset-manager'
import { useMemo } from 'react'
import {
  RECOVERY_MANIFEST_SCHEMA_VERSION,
  type RecoveryManifest,
  type CaptureDevice,
} from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   LUMEN Studio — Núcleo do Estúdio de Gravação (FASE 1)
   Canvas vertical 1080×1920 (9:16), layout Dividido/Câmera cheia, atalho T,
   enquadramento cover, modo foco (F), ocultar preview, guias de Botões/Legenda,
   cadeia de áudio completa (Web Audio API) + medidor de nível + devicechange.
   ─────────────────────────────────────────────────────────────────────────── */

const CANVAS_W = 1080
const CANVAS_H = 1920

/* ── Helpers de desenho para o canvas compositor (CORREÇÃO 2) ────────────── */

/** Desenha uma fonte (video/image) preenchendo o retângulo (object-cover). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || w
  const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || h
  if (!sw || !sh) return
  const srcRatio = sw / sh
  const dstRatio = w / h
  let dw = w
  let dh = h
  if (srcRatio > dstRatio) {
    dh = h
    dw = h * srcRatio
  } else {
    dw = w
    dh = w / srcRatio
  }
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(src, dx, dy, dw, dh)
}

/** Desenha object-cover com escala extra (cameraCover/cameraScale). */
function drawCoverScaled(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) {
  const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || w
  const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || h
  if (!sw || !sh) return
  const srcRatio = sw / sh
  const dstRatio = w / h
  let dw = w
  let dh = h
  if (srcRatio > dstRatio) {
    dh = h
    dw = h * srcRatio
  } else {
    dw = w
    dh = w / srcRatio
  }
  dw *= scale
  dh *= scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(src, dx, dy, dw, dh)
}

/** Desenha object-contain com padding máximo relativo (maxRatio do retângulo). */
function drawContain(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  maxRatio = 1,
) {
  const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || w
  const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || h
  if (!sw || !sh) return
  const srcRatio = sw / sh
  const dstRatio = w / h
  let dw = w * maxRatio
  let dh = (w * maxRatio) / srcRatio
  if (srcRatio < dstRatio) {
    dh = h * maxRatio
    dw = h * maxRatio * srcRatio
  }
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(src, dx, dy, dw, dh)
}

/** Desenha o título (overlay) no canvas compositor. */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  cfg: import('@/types/studio').TitleConfig,
  canvasW: number,
  canvasH: number,
) {
  const fontSize = Math.round((cfg.fontSize / 1080) * canvasW)
  ctx.save()
  ctx.font = `bold ${fontSize}px ${cfg.font}, sans-serif`
  ctx.textAlign = cfg.alignment as CanvasTextAlign
  ctx.textBaseline = 'middle'
  let px = canvasW / 2
  if (cfg.alignment === 'left') px = canvasW * 0.1
  else if (cfg.alignment === 'right') px = canvasW * 0.9
  let py = canvasH * 0.5
  if (cfg.position === 'top') py = canvasH * 0.12
  else if (cfg.position === 'bottom') py = canvasH * 0.88
  else if (cfg.position === 'custom') {
    px = cfg.normalizedX * canvasW
    py = cfg.normalizedY * canvasH
  }
  if (cfg.bgEnabled && cfg.bgColor && cfg.bgColor !== 'transparent') {
    const metrics = ctx.measureText(cfg.text)
    const tw = metrics.width + fontSize
    const th = fontSize * 1.4
    let bx = px
    if (cfg.alignment === 'center') bx = px - tw / 2
    else if (cfg.alignment === 'right') bx = px - tw
    ctx.fillStyle = cfg.bgColor
    ctx.beginPath()
    ctx.roundRect(bx, py - th / 2, tw, th, fontSize * 0.3)
    ctx.fill()
  }
  ctx.fillStyle = cfg.color
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = fontSize * 0.2
  ctx.fillText(cfg.text, px, py)
  ctx.restore()
}

export default function Gravadora() {
  const navigate = useNavigate()
  const {
    addMediaItem,
    createProject,
    teleprompterScript,
    setTeleprompterScript,
    scriptBlocks,
    backgroundConfig,
    setBackgroundConfig,
    titleConfig,
    setTitleConfig,
    stageConfig,
    updateStageConfig,
    audioConfig,
    updateAudioConfig,
    saveDevicePreference,
    loadDevicePreference,
    saveRawVideo,
    loadRawVideo,
    clearRawVideo,
    saveProjectSnapshot,
    recoverInterruptedRecording,
    updateProject,
  } = useStudio()

  /* ═══════════════════════════════════════════════════════════════════════
     FASE 2 / GAP 1 — Monitor de desempenho do preview.
     Quando o FPS cai abaixo de 24 por >3s, reduz efeitos visuais opcionais
     (blur de fundo, suavização de beleza, grade de terços, guias de segurança)
     para manter a fluidez. NUNCA altera a resolução do canvas (1080×1920),
     MediaRecorder, áudio ou qualquer coisa que afete o arquivo de saída.
     Quando o FPS volta acima de 30 por >5s, restaura os valores anteriores.
     performanceMode: 'auto' ativa o monitor; 'quality' desativa; 'performance'
     força degradação permanente. Padrão 'auto'.
     ═══════════════════════════════════════════════════════════════════════ */
  const perfMode = stageConfig.performanceMode ?? 'auto'
  const perfMonitorEnabled = perfMode === 'auto'
  const { degraded: perfDegraded, degradationReason } = usePerformanceMonitor(perfMonitorEnabled)
  const effectiveDegraded = perfDegraded || perfMode === 'performance'

  // Lembra os valores anteriores dos efeitos para restaurá-los quando a
  // degradação terminar (não os defaults — o que o usuário tinha selecionado).
  const savedEffectsRef = useRef<{
    bgMode: 'none' | 'blur' | 'virtual' | 'chroma'
    beautySmooth: number
    showGrid: boolean
    showSafeGuides: boolean
  } | null>(null)

  // Dispara a degradação/restauração. Roda apenas quando `effectiveDegraded`
  // muda de valor para evitar sobrescrever ajustes manuais do usuário a cada
  // render.
  const prevDegradedRef = useRef<boolean>(effectiveDegraded)
  useEffect(() => {
    if (effectiveDegraded === prevDegradedRef.current) return
    prevDegradedRef.current = effectiveDegraded

    if (effectiveDegraded) {
      // Salva o estado atual (apenas na primeira entrada em degradação).
      if (!savedEffectsRef.current) {
        savedEffectsRef.current = {
          bgMode,
          beautySmooth,
          showGrid,
          showSafeGuides,
        }
      }
      // Desativa efeitos opcionais — preserva gravação e áudio.
      if (bgMode !== 'none') setBgMode('none')
      if (beautySmooth !== 0) setBeautySmooth(0)
      if (showGrid) setShowGrid(false)
      if (showSafeGuides) setShowSafeGuides(false)
    } else {
      // Restaura os valores que o usuário tinha selecionado.
      const saved = savedEffectsRef.current
      if (saved) {
        setBgMode(saved.bgMode)
        setBeautySmooth(saved.beautySmooth)
        setShowGrid(saved.showGrid)
        setShowSafeGuides(saved.showSafeGuides)
        savedEffectsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDegraded])

  // Vínculo do(s) take(s) desta sessão com seus projetos em Meus Projetos.
  // Mapa takeId → projectId (para que "Editar" abra o projeto com snapshot,
  // e não crie um projeto novo paralelo).
  const takeProjectMapRef = useRef<Record<string, string>>({})

  /* ═══════════════════════════════════════════════════════════════════════
     PROMPT 68 / GAP 2 — Draft Store (autosave local + remoto + indicador).
     Snapshot ao vivo montado via useMemo; o hook cuida de debounce (2s),
     idempotência por hash, conflito e sync Supabase.
     ═══════════════════════════════════════════════════════════════════════ */
  const DRAFT_PROJECT_ID = 'gravadora-session'

  // Registra IDs de ativos da sessão para revogação no cleanup.
  const sessionAssetIdsRef = useRef<Set<string>>(new Set())

  /* ── FASE 6 — Máquina de Estados do Modo Estúdio ─────────────────────────
     Camada ADICIONAL de validação. Não substitui isRecording/isPaused/etc. */
  const { mode, transition, allowedActions, label } = useStudioMode()

  /** Guarda de ação: retorna false e exibe toast.warning se bloqueada. */
  const guard = useCallback(
    (action: StudioAction): boolean => {
      if (allowedActions.has(action)) return true
      toast.warning(blockedMessage(mode, action) ?? 'Ação não permitida neste estado.')
      return false
    },
    [allowedActions, mode],
  )

  // Botões/controles desativados conforme o estado do Modo Estúdio.
  // Botão Gravar/Parar (toggle): habilitado em PROMPTER (gravar), RECORDING e
  // PAUSED (parar); desativado nos demais.
  const recBtnDisabled = mode !== 'prompter' && mode !== 'recording' && mode !== 'paused'
  // Pausar/Retomar: só faz sentido durante gravação ativa/pausada.
  const pauseBtnDisabled = mode === 'processing' || mode === 'error'
  // Ativar Câmera: desativado quando a câmera já está ativa ou ocupada.
  const cameraBtnDisabled =
    mode === 'prompter' || mode === 'recording' || mode === 'paused' || mode === 'processing'
  // Selects de câmera/mic: desativados durante gravação/processamento.
  const deviceSelectDisabled = mode === 'recording' || mode === 'paused' || mode === 'processing'

  /* ── Video / Device state ──────────────────────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [permissionErrorModal, setPermissionErrorModal] = useState(false)

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')

  /* ── Recording state ───────────────────────────────────────────────────── */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedSeconds, setRecordedSeconds] = useState(0)
  const timerRef = useRef<any>(null)
  const [recordedClips, setRecordedClips] = useState<RecordingTake[]>([])

  /* ── Stage config (canvas 9:16) ──────────────────────────────────────────
     GAP 2/3 — inicializados a partir do `stageConfig` persistido em
     localStorage (lumen_gravadora_stage). Alterações são gravadas via
     `updateStageConfig` com debounce no contexto. */
  const [stageLayout, setStageLayout] = useState<StageLayout>(stageConfig.layout ?? 'split')
  const [lowerPanelMode, setLowerPanelMode] = useState<LowerPanelMode>(
    stageConfig.lowerPanelMode ?? 'none',
  )
  /* GAP 2 — cameraCover é o "enquadramento" do slider (0–1, padrão 1).
     Inicializado a partir do stageConfig persistido em localStorage e
     sincronizado de volta (debounced) via updateStageConfig. */
  const [cameraCover, setCameraCover] = useState(stageConfig.cameraCover ?? 1)
  const [showGrid, setShowGrid] = useState(true) // grade de terços (legado)
  // GAP 3 — showSafeGuides persiste (padrão OFF, mas respeita o salvo).
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(stageConfig.showGuides ?? false)
  const [previewHidden, setPreviewHidden] = useState(stageConfig.previewHidden ?? false)
  const [focusMode, setFocusMode] = useState(stageConfig.focusMode ?? false)

  // Sincroniza mudanças locais → contexto (persistência debounced).
  // Layout/preview/foco/painel inferior são preferências de UI instantâneas,
  // mas também persistimos para reabertura consistente.
  useEffect(() => {
    updateStageConfig({ layout: stageLayout })
  }, [stageLayout, updateStageConfig])
  useEffect(() => {
    updateStageConfig({ lowerPanelMode })
  }, [lowerPanelMode, updateStageConfig])
  // GAP 2 — cameraCover (enquadramento) persiste entre recarregamentos.
  useEffect(() => {
    updateStageConfig({ cameraCover })
  }, [cameraCover, updateStageConfig])
  useEffect(() => {
    updateStageConfig({ previewHidden })
  }, [previewHidden, updateStageConfig])
  useEffect(() => {
    updateStageConfig({ focusMode })
  }, [focusMode, updateStageConfig])
  // GAP 3 — showGuides (guias de zona segura)
  useEffect(() => {
    updateStageConfig({ showGuides: showSafeGuides })
  }, [showSafeGuides, updateStageConfig])

  const liveSnapshot = useMemo<ProjectSnapshot>(() => {
    const artsByBlock: Record<string, BlockArt[]> = {}
    const brollByBlock: Record<string, BlockBRoll | null> = {}
    for (const b of scriptBlocks) {
      artsByBlock[b.id] = readBlockArts(b.id)
      brollByBlock[b.id] = readBlockBRoll(b.id)
    }
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      projectId: DRAFT_PROJECT_ID,
      title: 'Sessão Gravadora',
      blocks: scriptBlocks,
      scriptText: teleprompterScript,
      artsByBlock,
      brollByBlock,
      background: backgroundConfig,
      titleConfig,
      audio: audioConfig,
      stageLayout,
      cameraCover,
      takes: recordedClips,
      timeline: {
        segments: [
          { id: 'seg-live', start: 0, end: Math.max(1, recordedSeconds), excluded: false },
        ],
        inPoint: 0,
        outPoint: Math.max(1, recordedSeconds),
        cursor: 0,
      },
      rawVideoDuration: Math.max(1, recordedSeconds),
    }
  }, [
    scriptBlocks,
    teleprompterScript,
    backgroundConfig,
    titleConfig,
    audioConfig,
    stageLayout,
    cameraCover,
    recordedClips,
    recordedSeconds,
  ])
  const draftStore = useDraftStore(DRAFT_PROJECT_ID, liveSnapshot)

  /* ── Audio config + Web Audio pipeline ───────────────────────────────────
     CORREÇÃO 1 — audioConfig vem do StudioContext (persistido em
     lumen_gravadora_audio com debounce 500ms). Ajustes nos toggles/slider
     chamam updateAudioConfig, que grava no localStorage. */
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  /* GAP 5 — Source node do áudio do vídeo de reação (conectado ao destination
     apenas quando includeReactionAudio está ligado). */
  const reactionAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const reactionAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const [audioLevel, setAudioLevel] = useState(0) // 0..1 para o medidor
  const rafLevelRef = useRef<number | null>(null)
  /* useRef para mostrar o aviso de suporte UMA vez por campo divergente. */
  const audioSupportWarnedRef = useRef(false)
  /* CORREÇÃO 4 — Suporte a echoCancellation detectado via track.getSettings(). */
  const [echoCancellationSupported, setEchoCancellationSupported] = useState<boolean | null>(null)
  /* CORREÇÃO 3 — isProcessing local (salvamento do take) para o guard de navegação. */
  const [isProcessing, setIsProcessing] = useState(false)
  // Mantém um ref sempre atualizado de stopRecording para uso no guard de navegação.
  const stopRecordingRef = useRef<() => void>(() => {})

  /* ── Live filters (legado, mantido) ────────────────────────────────────── */
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [beautySmooth, setBeautySmooth] = useState(40)
  const [bgMode, setBgMode] = useState<'none' | 'blur' | 'virtual' | 'chroma'>('none')
  const [bgBlurAmount, setBgBlurAmount] = useState(12)
  const [virtualBgUrl] = useState(
    'https://img.usecurling.com/p/1920/1080?q=modern+studio+cyberpunk+dark',
  )

  /* ── In-studio teleprompter (legado, mantido) ──────────────────────────── */
  const [showTeleprompter, setShowTeleprompter] = useState(true)
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(3)
  const [teleprompterOpacity, setTeleprompterOpacity] = useState(85)
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(20)
  const [isPromptScrolling, setIsPromptScrolling] = useState(false)
  const promptContainerRef = useRef<HTMLDivElement | null>(null)

  /* ── Mobile QR (legado) ────────────────────────────────────────────────── */
  const [showMobileQR, setShowMobileQR] = useState(false)

  /* ── Loading state da câmera (getUserMedia pendente) ───────────────────── */
  const [cameraStarting, setCameraStarting] = useState(false)

  /* ── Indicador visual de take gravado (checkmark verde por 2s) ─────────── */
  const [showTakeSuccess, setShowTakeSuccess] = useState(false)

  /* ── GAP 70 — Modal de Importação de Take (Vídeo + Manifesto JSON) ─────── */
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  /* ── FASE 2: Lower Panel (Roteiro / Teleprompter por blocos) ───────────── */
  const [showLowerPanel, setShowLowerPanel] = useState(false)
  const [lowerPanelHeight, setLowerPanelHeight] = useState(38) // % da altura
  const [teleprompterActive, setTeleprompterActive] = useState(false)
  const [syncArts, setSyncArts] = useState(true)
  const [autoStartOnRecord, setAutoStartOnRecord] = useState(false)
  const draggingPanelRef = useRef(false)
  const panelDragStartY = useRef(0)
  const panelDragStartH = useRef(0)

  /* ── FASE 3 — Camadas e Mídias ─────────────────────────────────────────── */
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [scriptBlockIds, setScriptBlockIds] = useState<string[]>([])
  const { reaction } = useReactionVideo()

  /* GAP 5 — Toggle "Incluir áudio da reação na gravação" (desligado por padrão).
     Estado local da Gravadora, passado ao ReactionVideoPanel via ScriptPanel. */
  const [includeReactionAudio, setIncludeReactionAudio] = useState(false)

  /* GAP 3 — Navegação independente de artes (syncArts desligado).
     currentArtIndex percorre as artes do bloco atual sem avançar o bloco.
     dismissedArtTip esconde a mensagem "Nenhuma arte carregada" (local, não
     persistido). */
  const [currentArtIndex, setCurrentArtIndex] = useState(0)
  const [dismissedArtTip, setDismissedArtTip] = useState(false)
  // Força re-render periódico para refletir mudanças de localStorage nos overlays
  // quando o usuário edita artes/broll no painel inferior.
  const [, setOverlayTick] = useState(0)
  useEffect(() => {
    const i = setInterval(() => setOverlayTick((t) => t + 1), 600)
    return () => clearInterval(i)
  }, [])

  // Refs de vídeo para os overlays (reação + b-roll)
  const reactionVideoRef = useRef<HTMLVideoElement | null>(null)
  const brollVideoRef = useRef<HTMLVideoElement | null>(null)

  // Sempre lê o estado persistido mais recente para os overlays.
  // Declarados antes do canvas compositor (CORREÇÃO 2) para que drawCompositorFrame
  // possa referenciá-los dentro do useCallback sem uso-antes-de-declaração.
  const currentReaction = reaction ?? readReactionVideo()
  const currentBlockId = scriptBlockIds[activeBlockIndex]
  const currentArts = currentBlockId ? readBlockArts(currentBlockId) : []
  const currentBRoll = currentBlockId ? readBlockBRoll(currentBlockId) : null

  /* ═══════════════════════════════════════════════════════════════════════
     CORREÇÃO 2 — Canvas compositor 1080×1920.
     O MediaRecorder passa a gravar `canvasRef.captureStream(30)` combinado
     com o audio track do microfone, em vez do stream bruto da câmera.
     Assim fundo, título, artes e B-roll entram no vídeo final.
     Um loop de render (rAF) desenha a composição a cada frame.
     ═══════════════════════════════════════════════════════════════════════ */
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const compositorRafRef = useRef<number | null>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const artImgsRef = useRef<Map<string, HTMLImageElement>>(new Map())

  /** Garante que um HTMLImageElement carregado exista para um dataUrl (cache). */
  const getLoadedImage = (dataUrl: string): HTMLImageElement => {
    let img = artImgsRef.current.get(dataUrl)
    if (!img) {
      img = new Image()
      img.src = dataUrl
      artImgsRef.current.set(dataUrl, img)
    }
    return img
  }

  /** Desenha um frame da composição no canvas compositor. */
  const drawCompositorFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fundo base
    ctx.save()
    ctx.fillStyle = '#0B0B10'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.restore()

    // Layout dividido: câmera em cima (1.3), painel inferior (0.7)
    const cameraRatio = stageLayout === 'split' ? 1.3 / (1.3 + 0.7) : 1
    const cameraH = Math.round(CANVAS_H * cameraRatio)
    const panelY = cameraH
    const panelH = CANVAS_H - cameraH

    // ── Fundo da área de câmera ──────────────────────────────────────────
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, CANVAS_W, cameraH)
    ctx.clip()
    if (backgroundConfig.type === 'preset' && backgroundConfig.presetColor) {
      ctx.fillStyle = backgroundConfig.presetColor
      ctx.fillRect(0, 0, CANVAS_W, cameraH)
    } else if (backgroundConfig.type === 'image' && backgroundConfig.imageDataUrl) {
      const bgImg =
        bgImgRef.current ??
        (bgImgRef.current = (() => {
          const i = new Image()
          i.src = backgroundConfig.imageDataUrl!
          return i
        })())
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        drawCover(ctx, bgImg, 0, 0, CANVAS_W, cameraH)
      }
    } else if (backgroundConfig.type === 'blur') {
      // fundo preto; o blur será aplicado sobre a câmera abaixo
      ctx.fillStyle = '#0B0B10'
      ctx.fillRect(0, 0, CANVAS_W, cameraH)
    }
    ctx.restore()

    // ── Câmera (video element) ───────────────────────────────────────────
    const video = videoRef.current
    if (video && video.videoWidth > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, CANVAS_W, cameraH)
      ctx.clip()
      const scale = 1 + cameraCover
      if (backgroundConfig.type === 'blur') {
        ctx.filter = `blur(${(backgroundConfig.blurAmount ?? 12) * 2}px)`
      }
      drawCoverScaled(ctx, video, 0, 0, CANVAS_W, cameraH, scale)
      ctx.filter = 'none'
      ctx.restore()
    }

    // ── B-roll (sobre a área de câmera, como no preview) ─────────────────
    if (currentBRoll && currentBRoll.url && brollVideoRef.current) {
      const bv = brollVideoRef.current
      if (bv.videoWidth > 0) {
        ctx.save()
        ctx.globalAlpha = 1
        drawCover(ctx, bv, 0, 0, CANVAS_W, cameraH)
        ctx.restore()
      }
    }

    // ── Artes do bloco (contidas na área de câmera) ─────────────────────
    if (syncArts && currentArts.length > 0) {
      for (const art of currentArts) {
        const img = getLoadedImage(art.dataUrl)
        if (img.complete && img.naturalWidth > 0) {
          drawContain(ctx, img, 0, 0, CANVAS_W, cameraH, 0.8)
        }
      }
    }

    // ── Vídeo de reação (canto configurável) ─────────────────────────────
    if (currentReaction && currentReaction.dataUrl && reactionVideoRef.current) {
      const rv = reactionVideoRef.current
      if (rv.videoWidth > 0) {
        const sizePx = Math.round(CANVAS_W * currentReaction.size)
        const margin = Math.round(CANVAS_W * 0.015)
        let rx = 0
        let ry = 0
        switch (currentReaction.corner) {
          case 'top-left':
            rx = margin
            ry = margin
            break
          case 'top-right':
            rx = CANVAS_W - sizePx - margin
            ry = margin
            break
          case 'bottom-left':
            rx = margin
            ry = cameraH - sizePx - margin
            break
          case 'bottom-right':
            rx = CANVAS_W - sizePx - margin
            ry = cameraH - sizePx - margin
            break
        }
        const rh = Math.round(sizePx * (16 / 9))
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(rx, ry, sizePx, rh, 12)
        ctx.clip()
        drawCover(ctx, rv, rx, ry, sizePx, rh)
        ctx.restore()
      }
    }

    // ── Painel inferior (split) ──────────────────────────────────────────
    if (stageLayout === 'split') {
      ctx.save()
      ctx.fillStyle = '#0B0B10'
      ctx.fillRect(0, panelY, CANVAS_W, panelH)
      // Conteúdo do painel conforme lowerPanelMode
      if (lowerPanelMode === 'arts' && syncArts && currentArts.length > 0) {
        const img = getLoadedImage(currentArts[0].dataUrl)
        if (img.complete && img.naturalWidth > 0) {
          drawContain(ctx, img, 0, panelY, CANVAS_W, panelH, 1)
        }
      } else if (
        lowerPanelMode === 'reaction' &&
        currentReaction &&
        currentReaction.dataUrl &&
        reactionVideoRef.current
      ) {
        const rv = reactionVideoRef.current
        if (rv.videoWidth > 0) {
          drawContain(ctx, rv, 0, panelY, CANVAS_W, panelH, 1)
        }
      } else if (
        lowerPanelMode === 'broll' &&
        currentBRoll &&
        currentBRoll.url &&
        brollVideoRef.current
      ) {
        const bv = brollVideoRef.current
        if (bv.videoWidth > 0) {
          drawCover(ctx, bv, 0, panelY, CANVAS_W, panelH)
        }
      }
      ctx.restore()
    }

    // ── Título (overlay sobre todo o canvas) ─────────────────────────────
    if (titleConfig.enabled && titleConfig.text) {
      const showTitle =
        titleConfig.duration === 'full' || recordedSeconds <= (titleConfig.durationSeconds || 5)
      if (showTitle) {
        drawTitle(ctx, titleConfig, CANVAS_W, CANVAS_H)
      }
    }
  }, [
    backgroundConfig,
    stageLayout,
    cameraCover,
    currentBRoll,
    currentArts,
    syncArts,
    currentReaction,
    lowerPanelMode,
    titleConfig,
    recordedSeconds,
  ])

  /* Loop do compositor: roda enquanto há stream ativo. */
  useEffect(() => {
    if (!stream) return
    let cancelled = false
    const loop = () => {
      if (cancelled) return
      drawCompositorFrame()
      compositorRafRef.current = requestAnimationFrame(loop)
    }
    compositorRafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      if (compositorRafRef.current) cancelAnimationFrame(compositorRafRef.current)
    }
  }, [stream, drawCompositorFrame])

  /* GAP 1 — Estado do quadro (whiteboard) para a parte inferior do canvas.
     Lido do mesmo localStorage que o WhiteboardPanel edita, para que o
     conteúdo inferior reflita exatamente o que o usuário desenhou. */
  const { whiteboard } = useWhiteboard()
  /* PROMPT 52 — Preview PNG do quadro gerado por "Usar este quadro"
     (rota /estudio/quadro). Exibido no painel inferior quando disponível,
     substituindo o placeholder "Quadro vazio". */
  const [boardPreview, setBoardPreview] = useState<string | null>(() => readWhiteboardPreview())
  // Rele o preview quando o painel inferior muda para o modo Quadro.
  useEffect(() => {
    if (lowerPanelMode === 'board') {
      setBoardPreview(readWhiteboardPreview())
    }
  }, [lowerPanelMode])

  /* ═══════════════════════════════════════════════════════════════════════
     Web Audio: configura o AudioContext, GainNode e AnalyserNode sobre o
     stream de microfone ativo. Idempotente — recria quando o stream muda.
     ═══════════════════════════════════════════════════════════════════════ */
  const setupAudioPipeline = useCallback(
    (mediaStream: MediaStream) => {
      const audioTracks = mediaStream.getAudioTracks()
      if (audioTracks.length === 0) return

      // Limpa pipeline anterior
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect()
        } catch {
          /* noop */
        }
        sourceNodeRef.current = null
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect()
        } catch {
          /* noop */
        }
        analyserRef.current = null
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect()
        } catch {
          /* noop */
        }
        gainNodeRef.current = null
      }

      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') ctx.resume()

        const source = ctx.createMediaStreamSource(mediaStream)
        const gain = ctx.createGain()
        gain.gain.value = audioConfig.manualGain

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.8

        // source → gain → analyser → (destination NÃO conectado: evita eco/feedback)
        source.connect(gain)
        gain.connect(analyser)

        sourceNodeRef.current = source
        gainNodeRef.current = gain
        analyserRef.current = analyser
      } catch (err) {
        console.warn('[Gravadora] Falha ao montar pipeline de áudio:', err)
      }
    },
    [audioConfig.manualGain],
  )

  /* Atualiza o ganho em tempo real quando o slider muda. */
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        audioConfig.manualGain,
        audioCtxRef.current.currentTime,
        0.01,
      )
    }
  }, [audioConfig.manualGain])

  /* GAP 5 — Mixagem do áudio do vídeo de reação na gravação.
     Quando includeReactionAudio está ligado, captura o áudio do <video> de
     reação via AudioContext e o encaminha para um MediaStreamDestinationNode,
     cujo track é adicionado ao MediaStream gravado pelo MediaRecorder.
     Quando desligado, desconecta (o <video> permanece muted durante a
     gravação, evitando eco). O MediaElementAudioSourceNode é criado uma
     única vez por elemento (reaproveitado do ref). */
  useEffect(() => {
    const videoEl = reactionVideoRef.current
    if (!videoEl || !currentReaction?.dataUrl) {
      // Sem vídeo de reação: garante desconexão.
      if (reactionAudioSourceRef.current && reactionAudioDestRef.current) {
        try {
          reactionAudioSourceRef.current.disconnect(reactionAudioDestRef.current)
        } catch {
          /* noop */
        }
      }
      return
    }
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current

    try {
      // Cria o source node uma única vez (não pode recriar para o mesmo elemento).
      if (!reactionAudioSourceRef.current) {
        reactionAudioSourceRef.current = ctx.createMediaElementSource(videoEl)
      }
      if (!reactionAudioDestRef.current) {
        reactionAudioDestRef.current = ctx.createMediaStreamDestination()
      }
      const source = reactionAudioSourceRef.current
      const dest = reactionAudioDestRef.current

      // Reconecta conforme o toggle (desconecta tudo antes para evitar duplicação).
      try {
        source.disconnect()
      } catch {
        /* noop */
      }
      if (includeReactionAudio) {
        source.connect(dest)
      }
      // Garante que o elemento não está muted quando capturamos o áudio.
      videoEl.muted = !includeReactionAudio
    } catch (err) {
      console.warn('[Gravadora] Falha ao configurar áudio da reação:', err)
    }
  }, [includeReactionAudio, currentReaction?.dataUrl])

  /* Loop de leitura do AnalyserNode → atualiza o medidor de nível. */
  useEffect(() => {
    const analyser = analyserRef.current
    if (!analyser) {
      setAudioLevel(0)
      return
    }
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      // RMS aprox normalizado 0..1
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      // Normalização perceptiva simples (multiplica para sensibilidade)
      const level = Math.min(1, rms * 2.2)
      setAudioLevel(level)
      rafLevelRef.current = requestAnimationFrame(tick)
    }
    rafLevelRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafLevelRef.current) cancelAnimationFrame(rafLevelRef.current)
    }
  }, [])

  /* ═══════════════════════════════════════════════════════════════════════
     getUserMedia — chamado apenas por gesto do usuário (clique). A troca de
     dispositivo reinicia a câmera apenas se já houver permissão.
     Aplica MediaTrackConstraints com a cadeia de áudio configurada.
     ═══════════════════════════════════════════════════════════════════════ */
  const startCamera = async () => {
    setCameraStarting(true)
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }

      const audioConstraints: MediaTrackConstraints = selectedMic
        ? {
            deviceId: { exact: selectedMic },
            noiseSuppression: audioConfig.noiseSuppression,
            autoGainControl: audioConfig.autoGainControl,
            echoCancellation: audioConfig.echoCancellation,
          }
        : {
            noiseSuppression: audioConfig.noiseSuppression,
            autoGainControl: audioConfig.autoGainControl,
            echoCancellation: audioConfig.echoCancellation,
          }

      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: audioConstraints,
      }

      const userStream = await navigator.mediaDevices.getUserMedia(constraints)
      transition('prompter')
      setStream(userStream)
      setHasPermission(true)
      setPermissionErrorModal(false)

      if (videoRef.current) {
        videoRef.current.srcObject = userStream
      }

      // Configura o pipeline Web Audio (ganho manual + medidor)
      setupAudioPipeline(userStream)

      // CORREÇÃO 1 — Verifica suporte real da cadeia de áudio via track.getSettings().
      // Mostra toast UMA vez quando o navegador/dispositivo diverge do solicitado.
      const audioTrack = userStream.getAudioTracks()[0]
      if (audioTrack) {
        try {
          const settings = audioTrack.getSettings()
          const checks: {
            key: 'noiseSuppression' | 'echoCancellation' | 'autoGainControl'
            label: string
          }[] = [
            { key: 'noiseSuppression', label: 'Redução de ruído' },
            { key: 'echoCancellation', label: 'Cancelamento de eco' },
            { key: 'autoGainControl', label: 'Ganho automático' },
          ]
          for (const c of checks) {
            const requested = audioConfig[c.key]
            const effective = (settings as any)[c.key]
            if (requested && effective === false && !audioSupportWarnedRef.current) {
              toast.warning(`⚠️ ${c.label} não é suportado pelo seu navegador/dispositivo.`)
            }
          }
          audioSupportWarnedRef.current = true
          // CORREÇÃO 4 — Detecta suporte a echoCancellation para o banner do modo reação.
          setEchoCancellationSupported(
            settings.echoCancellation === undefined ? true : settings.echoCancellation === true,
          )
        } catch {
          /* getSettings pode falhar em alguns navegadores — ignora */
        }
      }

      // Listener de fim de track → desconexão de dispositivo durante gravação
      userStream.getTracks().forEach((track) => {
        track.addEventListener('ended', handleTrackEnded)
      })

      // Enumera dispositivos (labels só ficam disponíveis após permissão)
      const devices = await navigator.mediaDevices.enumerateDevices()
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
    } catch (err: any) {
      console.warn('[Gravadora] Erro ao acessar webcam:', err?.name || err, err?.message || '')
      transition('error')
      setHasPermission(false)
      setPermissionErrorModal(true)
    } finally {
      setCameraStarting(false)
    }
  }

  /* Desconexão de dispositivo durante a gravação: pausa (não trava). */
  const handleTrackEnded = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause()
      } catch {
        /* noop */
      }
      setIsPaused(true)
      setIsPromptScrolling(false)
      transition('error')
      toast.warning('Dispositivo desconectado durante a gravação. Pausando por segurança.')
    } else {
      toast.warning('Dispositivo de câmera/microfone desconectado.')
    }
  }, [transition])

  /* Reinicia a câmera quando a cadeia de áudio (toggles) muda — só se já
     tivermos permissão, para não pedir getUserMedia sem gesto do usuário. */
  const restartWithAudioConstraints = useCallback(async () => {
    if (hasPermission !== true || !stream) return
    // Troca os applyConstraints no track de áudio existente quando possível
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      try {
        await audioTrack.applyConstraints({
          noiseSuppression: audioConfig.noiseSuppression,
          autoGainControl: audioConfig.autoGainControl,
          echoCancellation: audioConfig.echoCancellation,
        })
        return
      } catch (err) {
        console.warn('[Gravadora] applyConstraints falhou, reiniciando stream:', err)
      }
    }
    // Fallback: reinicia o stream inteiro
    await startCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasPermission,
    stream,
    audioConfig.noiseSuppression,
    audioConfig.autoGainControl,
    audioConfig.echoCancellation,
  ])

  useEffect(() => {
    restartWithAudioConstraints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioConfig.noiseSuppression, audioConfig.autoGainControl, audioConfig.echoCancellation])

  /* ═══════════════════════════════════════════════════════════════════════
     FASE 2 / GAP 2 — Persistência da preferência de dispositivo.
     Ao montar, carrega a preferência salva (câmera/mic) e inicializa os
     selects. A validação de existência do deviceId acontece depois que os
     dispositivos são enumerados (após permissão), no effect abaixo.
     ═══════════════════════════════════════════════════════════════════════ */
  const didLoadDevicePrefRef = useRef(false)
  useEffect(() => {
    if (didLoadDevicePrefRef.current) return
    didLoadDevicePrefRef.current = true
    const saved = loadDevicePreference()
    if (saved.cameraId) setSelectedCamera(saved.cameraId)
    if (saved.micId) setSelectedMic(saved.micId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Validação: quando os dispositivos são enumerados (após permissão),
     verifica se os deviceIds salvos ainda existem. Se não existirem, volta
     ao padrão do sistema e avisa o usuário com toast. Roda uma única vez. */
  const didValidateDevicesRef = useRef(false)
  useEffect(() => {
    if (didValidateDevicesRef.current) return
    if (hasPermission !== true) return
    if (videoDevices.length === 0 && audioDevices.length === 0) return
    didValidateDevicesRef.current = true

    const saved = loadDevicePreference()
    let changed = false
    if (saved.cameraId && !videoDevices.some((d) => d.deviceId === saved.cameraId)) {
      setSelectedCamera('')
      changed = true
    }
    if (saved.micId && !audioDevices.some((d) => d.deviceId === saved.micId)) {
      setSelectedMic('')
      changed = true
    }
    if (changed) {
      toast.warning('Dispositivo salvo não encontrado. Usando o padrão do sistema.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, videoDevices, audioDevices])

  /* Troca de dispositivo reinicia a câmera se já houver permissão.
     GAP 2 — também persiste a preferência (apenas quando hasPermission,
     ou seja, labels estão disponíveis e a escolha é válida). */
  useEffect(() => {
    if (hasPermission === true) {
      startCamera()
      saveDevicePreference(selectedCamera, selectedMic)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, selectedMic])

  /* devicechange: reenumera dispositivos quando um novo for conectado/removido. */
  useEffect(() => {
    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
      } catch {
        /* noop */
      }
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  /* Cleanup ao desmontar. */
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      if (rafLevelRef.current) cancelAnimationFrame(rafLevelRef.current)
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect()
        } catch {
          /* noop */
        }
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect()
        } catch {
          /* noop */
        }
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect()
        } catch {
          /* noop */
        }
      }
      /* GAP 5 — desconecta o source do áudio da reação. */
      if (reactionAudioSourceRef.current) {
        try {
          reactionAudioSourceRef.current.disconnect()
        } catch {
          /* noop */
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          /* noop */
        }
      }
      /* PROMPT 67 / GAP 1 — Revoga todos os ativos da sessão atual no
         assetManager (object URLs, liberação de memória). */
      for (const id of sessionAssetIdsRef.current) {
        assetManager.revokeAsset(id)
      }
      sessionAssetIdsRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Recording timer loop. */
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

  /* Teleprompter auto-scroll. */
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

  /* ═══════════════════════════════════════════════════════════════════════
     Atalhos de teclado: T (layout) e F (modo foco). Não disparam quando o
     foco está em input/textarea/select/contenteditable.
     ═══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }

    const onKey = (e: KeyboardEvent) => {
      // Nunca dispara atalhos globais quando o foco está em um campo de
      // entrada — isso evita conflitar com digitação, Ctrl+Z, Ctrl+Shift+Z,
      // Delete, S, etc.
      if (isTypingTarget(e.target)) return
      // Permite combos com Ctrl/Cmd/Meta passar (desfazer/refazer etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 't') {
        e.preventDefault()
        setStageLayout((prev) => (prev === 'split' ? 'full' : 'split'))
      } else if (key === 'f') {
        e.preventDefault()
        setFocusMode((prev) => !prev)
      } else if (key === 'g') {
        e.preventDefault()
        setShowGrid((prev) => !prev)
      } else if (key === 'h') {
        e.preventDefault()
        setShowSafeGuides((prev) => !prev)
      } else if (key === 'p') {
        e.preventDefault()
        setPreviewHidden((prev) => !prev)
      } else if (key === 'escape' && showLowerPanel) {
        e.preventDefault()
        setShowLowerPanel(false)
      }

      /* GAP 3 — Navegação independente de artes (syncArts === false).
         Quando a sincronização está desligada, as setas esquerda/direita
         navegam entre as artes do bloco atual (sem avançar o bloco).
         Quando a sincronização está ligada, mantém o comportamento padrão
         (as setas avançam/voltam o bloco). */
      if (!syncArts && currentArts.length > 0 && (key === 'arrowleft' || key === 'arrowright')) {
        e.preventDefault()
        setCurrentArtIndex((prev) => {
          if (key === 'arrowleft') {
            return prev <= 0 ? currentArts.length - 1 : prev - 1
          }
          return prev >= currentArts.length - 1 ? 0 : prev + 1
        })
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showLowerPanel, syncArts, currentArts])

  /* ═══════════════════════════════════════════════════════════════════════
     FASE 5.5 — Aviso antes de sair: se está gravando ou processando,
     intercepta beforeunload para alertar o usuário.
     ═══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording || isProcessing) {
        e.preventDefault()
        e.returnValue = 'Você tem uma gravação em andamento. Sair agora irá interrompê-la.'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isRecording, isProcessing])

  /* ═══════════════════════════════════════════════════════════════════════
     FASE 5.6 — Recuperação após falha: detecta blob bruto sem snapshot
     ao reabrir a Gravadora. Oferece Recuperar / Descartar.
     ═══════════════════════════════════════════════════════════════════════ */
  const [interruptedProjectId, setInterruptedProjectId] = useState<string | null>(null)
  const [interruptedMeta, setInterruptedMeta] = useState<
    import('@/types/studio').RawVideoRecord | null
  >(null)
  const [recoveredBlobUrl, setRecoveredBlobUrl] = useState<string | null>(null)
  const [recoveredDuration, setRecoveredDuration] = useState<number>(0)

  useEffect(() => {
    // Procura todas as chaves de raw video meta no localStorage.
    let found: { projectId: string; meta: import('@/types/studio').RawVideoRecord } | null = null
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('lumen_raw_video_meta_')) {
        const projectId = key.replace('lumen_raw_video_meta_', '')
        try {
          const meta = JSON.parse(
            localStorage.getItem(key) || '',
          ) as import('@/types/studio').RawVideoRecord
          if (!meta.hasSnapshot) {
            found = { projectId, meta }
            break
          }
        } catch {
          /* noop */
        }
      }
    }
    if (found) {
      setInterruptedProjectId(found.projectId)
      setInterruptedMeta(found.meta)
      transition('recovering')
    }
  }, [transition])

  const handleRecoverRecording = async () => {
    if (!interruptedProjectId) return
    try {
      const blob = await loadRawVideo(interruptedProjectId)
      if (!blob) {
        toast.error('Não foi possível recuperar o vídeo bruto.')
        setInterruptedProjectId(null)
        transition('prompter')
        return
      }
      const url = URL.createObjectURL(blob)
      setRecoveredBlobUrl(url)
      setRecoveredDuration(interruptedMeta?.duration || 0)
      toast.success('Gravação recuperada! Você pode editá-la no editor.')
      setInterruptedProjectId(null)
      transition('processing')
    } catch (err) {
      console.warn('[Gravadora] Falha ao recuperar gravação:', err)
      toast.error('Falha ao recuperar a gravação.')
      setInterruptedProjectId(null)
      transition('prompter')
    }
  }

  const handleDiscardInterrupted = async () => {
    if (interruptedProjectId) {
      await clearRawVideo(interruptedProjectId)
      toast.info('Gravação interrompida descartada.')
    }
    setInterruptedProjectId(null)
    setInterruptedMeta(null)
    transition('prompter')
  }

  const handleSendRecoveredToEditor = () => {
    if (!recoveredBlobUrl) return
    const newProj = createProject({
      title: `Recuperação Estúdio (${formatTimer(recoveredDuration)})`,
      type: 'reel',
      aspectRatio: '9:16',
      resolution: '1080p',
      duration: recoveredDuration,
      thumbnail: recoveredBlobUrl,
      scriptText: teleprompterScript,
      clips: [
        {
          id: 'clip-rec-main',
          track: 'video',
          name: 'Take Recuperado',
          startTime: 0,
          duration: recoveredDuration,
          sourceUrl: recoveredBlobUrl,
          mediaType: 'video',
          volume: 100,
        },
      ],
    })
    navigate(`/editor/${newProj.id}`)
  }

  /* ═══════════════════════════════════════════════════════════════════════
     FASE 2 — Redimensionamento do painel inferior (arrastar borda superior).
     ═══════════════════════════════════════════════════════════════════════ */
  const onPanelDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingPanelRef.current = true
      panelDragStartY.current = e.clientY
      panelDragStartH.current = lowerPanelHeight
      const onMove = (ev: MouseEvent) => {
        if (!draggingPanelRef.current) return
        const delta = panelDragStartY.current - ev.clientY
        const windowH = window.innerHeight
        const next = Math.min(70, Math.max(20, panelDragStartH.current + (delta / windowH) * 100))
        setLowerPanelHeight(next)
      }
      const onUp = () => {
        draggingPanelRef.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [lowerPanelHeight],
  )

  /* ═══════════════════════════════════════════════════════════════════════
     Gravação: MediaRecorder real quando há stream; fallback simulado quando
     não há câmera/mic.
     ═══════════════════════════════════════════════════════════════════════ */
  const handleToggleRecord = () => {
    if (!isRecording) {
      if (!guard('startRecording')) return
      startRecording()
    } else {
      if (!guard('stopRecording')) return
      stopRecording()
    }
  }

  const startRecording = () => {
    setRecordedSeconds(0)
    chunksRef.current = []

    // Tenta MediaRecorder real sobre o stream ativo.
    // CORREÇÃO 2 — Grava o canvas compositor 1080×1920 (vídeo + camadas) em vez
    // do stream bruto da câmera. Combina o video track do canvas com o audio
    // track do microfone num novo MediaStream, preservando timeslice/chunks/onstop.
    if (stream && hasPermission) {
      let mimeType = ''
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ]
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
          mimeType = c
          break
        }
      }
      try {
        const canvas = canvasRef.current
        const audioTrack = stream.getAudioTracks()[0]
        let recordStream: MediaStream
        if (canvas && typeof canvas.captureStream === 'function') {
          // Força um frame inicial no canvas antes de capturar a stream.
          drawCompositorFrame()
          const canvasVideoTrack = canvas.captureStream(30).getVideoTracks()[0]
          const tracks: MediaStreamTrack[] = [canvasVideoTrack]
          if (audioTrack) tracks.push(audioTrack)
          // GAP 5 — Quando "Incluir áudio da reação" está ligado, mistura o
          // áudio do <video> de reação (via AudioContext) no stream gravado.
          if (includeReactionAudio && reactionAudioDestRef.current) {
            const rTracks = reactionAudioDestRef.current.stream.getAudioTracks()
            for (const t of rTracks) {
              if (!tracks.includes(t)) tracks.push(t)
            }
          }
          recordStream = new MediaStream(tracks)
        } else if (audioTrack) {
          // Sem canvas compositor disponível: fallback ao stream de áudio/câmera.
          recordStream = new MediaStream([audioTrack])
        } else {
          recordStream = stream
        }
        const recorder = new MediaRecorder(recordStream, mimeType ? { mimeType } : undefined)
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
        }
        recorder.onstop = () => {
          finalizeTake()
        }
        recorder.start(1000) // fragmentos periódicos (salvamento de emergência)
        mediaRecorderRef.current = recorder
        setIsRecording(true)
        setIsPaused(false)
        setIsPromptScrolling(true)
        transition('recording')
        toast.info('Gravação iniciada! Roteiro rolando.')
        return
      } catch (err) {
        console.warn('[Gravadora] MediaRecorder falhou, usando fallback simulado:', err)
      }
    }

    // Fallback simulado (sem câmera/mic)
    setIsRecording(true)
    setIsPaused(false)
    setIsPromptScrolling(true)
    transition('recording')
    toast.info('Gravação (simulada) iniciada! Roteiro rolando.')
  }

  const stopRecording = useCallback(() => {
    transition('processing')
    setIsRecording(false)
    setIsPaused(false)
    setIsPromptScrolling(false)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        finalizeTake()
      }
    } else {
      finalizeTake()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CORREÇÃO 3 — Guard de navegação interna (cliques na sidebar durante gravação).
  // PROMPT 69 / GAP 3 — inclui takeNumber e informações do take atual.
  const recordingGuardBlocker = useRecordingGuard(isRecording, isProcessing, {
    takeNumber: recordedClips.length + (isRecording ? 1 : 0),
    durationSeconds: recordedSeconds,
    mimeType: mediaRecorderRef.current?.mimeType,
  })
  const handleRecordingGuardProceed = useCallback(() => {
    stopRecordingRef.current()
    recordingGuardBlocker.proceed?.()
  }, [recordingGuardBlocker])

  // Mantém o ref de stopRecording sincronizado para o hook de guard de navegação.
  useEffect(() => {
    stopRecordingRef.current = stopRecording
  }, [stopRecording])

  /* PROMPT 67 / GAP 1 — Gera o thumbnail 160×284 (9:16) do primeiro frame
     a partir do blob do vídeo gravado. Retorna dataUrl JPEG ou null. */
  const generateTakeThumbnail = (videoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video')
        video.src = videoUrl
        video.muted = true
        video.playsInline = true
        video.crossOrigin = 'anonymous'
        const cleanup = () => {
          video.removeAttribute('src')
          video.load()
        }
        video.onloadeddata = () => {
          video.currentTime = 0
        }
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 160
            canvas.height = 284
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              cleanup()
              resolve(null)
              return
            }
            // object-cover do frame na proporção 9:16.
            const sw = video.videoWidth || 160
            const sh = video.videoHeight || 284
            const srcRatio = sw / sh
            const dstRatio = 160 / 284
            let dw = 160
            let dh = 284
            if (srcRatio > dstRatio) {
              dh = 284
              dw = 284 * srcRatio
            } else {
              dw = 160
              dh = 160 / srcRatio
            }
            const dx = (160 - dw) / 2
            const dy = (284 - dh) / 2
            ctx.drawImage(video, dx, dy, dw, dh)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            cleanup()
            resolve(dataUrl)
          } catch {
            cleanup()
            resolve(null)
          }
        }
        video.onerror = () => {
          cleanup()
          resolve(null)
        }
      } catch {
        resolve(null)
      }
    })
  }

  /* PROMPT 69 / GAP 3 — Extrai a resolução real do vídeo a partir do
     MediaStream track settings (w/h) ou fallback do video element. */
  const extractResolution = (): { width: number; height: number } | undefined => {
    try {
      const vt = stream?.getVideoTracks?.()[0]
      const s = vt?.getSettings?.()
      if (s && s.width && s.height) return { width: s.width, height: s.height }
    } catch {
      /* noop */
    }
    const v = videoRef.current
    if (v && v.videoWidth > 0 && v.videoHeight > 0) {
      return { width: v.videoWidth, height: v.videoHeight }
    }
    return undefined
  }

  const finalizeTake = () => {
    const duration = Math.max(1, recordedSeconds)
    const timeString = formatTimer(duration)
    const takeId = 'clip-' + Date.now()
    const now = Date.now()

    let url = 'https://img.usecurling.com/p/1080/1920?q=podcaster+talking+studio+light&color=purple'
    let blob: Blob | undefined
    let mimeType = 'video/webm'
    if (chunksRef.current.length > 0) {
      mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
      blob = new Blob(chunksRef.current, { type: mimeType })
      url = URL.createObjectURL(blob)
      chunksRef.current = []
    }

    /* PROMPT 69 / GAP 3 — Extrai resolução real e monta avisos. */
    const resolution = extractResolution()
    const warnings: string[] = []
    const hasAudioTrack = !!stream
      ?.getAudioTracks?.()
      ?.some((t) => t.enabled && t.readyState === 'live')
    if (!hasAudioTrack) warnings.push('Áudio não disponível')
    if (resolution && (resolution.height < 720 || resolution.width < 720)) {
      warnings.push('Resolução abaixo de 720p')
    }
    if (duration < 1) warnings.push('Duração menor que 1 segundo')

    /* PROMPT 67 / GAP 1 — Registra o blob da gravação no assetManager. */
    let recordingAssetId: string | undefined
    if (blob) {
      assetManager
        .addAsset(blob, 'recording', { type: 'video', duration, mimeType })
        .then((asset) => {
          recordingAssetId = asset.id
          sessionAssetIdsRef.current.add(asset.id)
        })
        .catch(() => {})
    }

    /* PROMPT 69 / GAP 3 — Manifesto completo (schemaVersion 1). */
    const captureDevice: CaptureDevice | null = (() => {
      try {
        const vt = stream?.getVideoTracks?.()[0]
        const at = stream?.getAudioTracks?.()[0]
        if (vt && at) return { videoLabel: vt.label || '', audioLabel: at.label || '' }
      } catch {
        /* noop */
      }
      return null
    })()

    const recoveryManifest: RecoveryManifest = {
      schemaVersion: RECOVERY_MANIFEST_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      layout: stageLayout,
      cameraCover,
      audio: {
        noiseSuppression: audioConfig.noiseSuppression,
        autoGainControl: audioConfig.autoGainControl,
        echoCancellation: audioConfig.echoCancellation,
        manualGain: audioConfig.manualGain,
      },
      scriptText: teleprompterScript,
      captureDevice,
      durationMs: duration * 1000,
      takeId,
      blockIds: scriptBlocks.map((b) => b.id),
      mimeType,
      resolution,
      warnings,
      thumbnail: null,
    }

    const newClip: RecordingTake = {
      id: takeId,
      url,
      duration,
      timeString,
      createdAt: new Date().toISOString(),
      timestamp: now,
      mimeType,
      resolution,
      warnings,
      thumbnail: null,
      recoveryManifest,
    }

    setRecordedClips((prev) => [newClip, ...prev])
    void recordingAssetId

    // Salva no StudioContext como projeto tipo 'reel' / aspectRatio '9:16'
    // (tipo "video" reaproveita os mesmos filtros/fluxo de Meus Projetos).
    const projTitle = `Gravação ${new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}`
    const newProj = createProject({
      title: projTitle,
      type: 'reel',
      aspectRatio: '9:16',
      resolution: '1080p',
      duration,
      status: 'draft',
      thumbnail:
        blob && blob.type.startsWith('video')
          ? url
          : 'https://img.usecurling.com/p/1080/1920?q=podcaster+talking+studio+light&color=purple',
      scriptText: teleprompterScript,
      clips: [
        {
          id: 'clip-rec-main',
          track: 'video',
          name: 'Take de Câmera',
          startTime: 0,
          duration,
          sourceUrl: url,
          mediaType: 'video',
          volume: 100,
        },
      ],
    })
    // Vínculo takeId → projectId (reabertura sem criar projeto paralelo).
    takeProjectMapRef.current[newClip.id] = newProj.id
    // PROMPT 69 / GAP 3 — Gera o thumbnail 160×284 (9:16) do take e atualiza
    // o clip + projeto + manifesto. Usa a função dedicada (proporção correta).
    if (blob && blob.type.startsWith('video')) {
      generateTakeThumbnail(url).then((thumbDataUrl) => {
        if (thumbDataUrl) {
          updateProject(newProj.id, { thumbnail: thumbDataUrl })
          // Atualiza o clip recém-criado com o thumbnail e o manifesto.
          setRecordedClips((prev) =>
            prev.map((c) =>
              c.id === newClip.id
                ? {
                    ...c,
                    thumbnail: thumbDataUrl,
                    recoveryManifest: c.recoveryManifest
                      ? { ...c.recoveryManifest, thumbnail: thumbDataUrl, updatedAt: Date.now() }
                      : c.recoveryManifest,
                  }
                : c,
            ),
          )
        }
      })
    }

    // FASE 5.1 — Preservação do vídeo bruto + snapshot JSON do projeto.
    // IDs de blocos já são UUIDs estáveis vindos do use-script-blocks.
    if (blob) {
      setIsProcessing(true)
      saveRawVideo(newProj.id, blob, duration, mimeType)
        .then(() => {
          // Monta o snapshot completo (versionado) com todos os metadados.
          const artsByBlock: Record<string, BlockArt[]> = {}
          const brollByBlock: Record<string, BlockBRoll | null> = {}
          for (const b of scriptBlocks) {
            artsByBlock[b.id] = readBlockArts(b.id)
            brollByBlock[b.id] = readBlockBRoll(b.id)
          }
          const reaction = readReactionVideo()
          const snapshot: ProjectSnapshot = {
            version: 1,
            savedAt: new Date().toISOString(),
            projectId: newProj.id,
            title: newProj.title,
            blocks: scriptBlocks,
            scriptText: teleprompterScript,
            artsByBlock,
            brollByBlock,
            background: backgroundConfig,
            titleConfig: titleConfig,
            audio: audioConfig,
            stageLayout,
            cameraCover,
            takes: [newClip],
            timeline: {
              segments: [
                {
                  id: 'seg-' + Date.now(),
                  start: 0,
                  end: duration,
                  excluded: false,
                },
              ],
              inPoint: 0,
              outPoint: duration,
              cursor: 0,
            },
            rawVideoUrl: url,
            rawVideoDuration: duration,
          }
          // reaction não faz parte do snapshot tipado, mas guardamos no
          // brollByBlock apenas para reabertura. (Omitimos para manter tipos.)
          void reaction
          saveProjectSnapshot(snapshot)
        })
        .then(() => {
          transition('prompter')
          // PONTE GRAVADORA → EDITOR: toast com ação para abrir o projeto
          // recém-salvo (com snapshot completo) no editor de vídeo.
          toast.success('Vídeo salvo! Abrir no Editor', {
            action: {
              label: 'Abrir no Editor',
              onClick: () => navigate(`/editor/${newProj.id}`),
            },
          })
        })
        .catch((err) => {
          console.warn('[Gravadora] Falha ao salvar vídeo bruto/snapshot:', err)
          transition('error')
        })
        .finally(() => {
          setIsProcessing(false)
        })
    } else {
      transition('prompter')
    }

    toast.success(`Take gravado com sucesso (${timeString})! Salvo em Meus Projetos.`)
    setRecordedSeconds(0)
    // Indicador visual sutil no canvas (checkmark verde por 2s)
    setShowTakeSuccess(true)
    setTimeout(() => setShowTakeSuccess(false), 2000)
  }

  const handlePauseResume = () => {
    if (isPaused) {
      if (!guard('resumeRecording')) return
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        try {
          mediaRecorderRef.current.resume()
        } catch {
          /* noop */
        }
      }
      setIsPaused(false)
      setIsPromptScrolling(true)
      transition('recording')
    } else {
      if (!guard('pauseRecording')) return
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.pause()
        } catch {
          /* noop */
        }
      }
      setIsPaused(true)
      setIsPromptScrolling(false)
      transition('paused')
    }
  }

  const handleSaveToMediaLibrary = (clip: RecordingTake) => {
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

  /* PROMPT 69 / GAP 3 — Baixar pacote de gravação (vídeo bruto + manifesto).
     Usa JSZip se disponível (carregamento dinâmico); caso contrário, faz o
     download separado do vídeo + JSON. Nome: lumen-take-${n}-${date}.zip */
  const handleDownloadPackage = async (clip: RecordingTake, takeNumber: number) => {
    const dateStr = new Date(clip.timestamp ?? Date.now()).toISOString().slice(0, 10)
    const baseName = `lumen-take-${takeNumber}-${dateStr}`
    const manifest = clip.recoveryManifest
    const manifestJson = JSON.stringify(manifest ?? {}, null, 2)

    // Tenta carregar JSZip dinamicamente (sem depender de instalação fixa).
    let JSZipCtor: any = null
    try {
      const mod = await (Function('m', 'return import(m)') as (s: string) => Promise<any>)('jszip')
      JSZipCtor = mod?.default ?? mod
    } catch {
      try {
        const mod = await (Function('m', 'return import(m)') as (s: string) => Promise<any>)(
          'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        )
        JSZipCtor = (mod?.default ?? mod) as any
      } catch {
        JSZipCtor = null
      }
    }

    if (JSZipCtor) {
      try {
        const zip = new JSZipCtor()
        const ext = clip.mimeType?.includes('mp4') ? 'mp4' : 'webm'
        // Busca o blob a partir do URL (blob:).
        let blob: Blob | null = null
        try {
          const res = await fetch(clip.url)
          blob = await res.blob()
        } catch {
          blob = null
        }
        if (blob) zip.file(`${baseName}.${ext}`, blob)
        zip.file('recovery-manifest.json', manifestJson)
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = zipUrl
        a.download = `${baseName}.zip`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(zipUrl), 1000)
        toast.success('Pacote de gravação baixado.')
        return
      } catch (err) {
        console.warn('[Gravadora] JSZip falhou, usando download separado:', err)
      }
    }

    // Fallback: download separado de vídeo + JSON.
    try {
      const a = document.createElement('a')
      a.href = clip.url
      a.download = `${baseName}.webm`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      /* noop */
    }
    try {
      const blob = new Blob([manifestJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}-manifest.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      /* noop */
    }
    toast.success('Pacote baixado (vídeo + manifesto separados).')
  }

  const handleSendToEditor = (clip: RecordingTake) => {
    // Reabre o projeto já criado em finalizeTake (mesmo snapshot, mesmo ID),
    // em vez de criar um projeto paralelo. Se o vínculo não existir (ex: take
    // recuperado), cria um projeto novo para garantir que sempre haja ação real.
    const existingId = takeProjectMapRef.current[clip.id]
    if (existingId) {
      navigate(`/editor/${existingId}`)
      return
    }
    const newProj = createProject({
      title: `Edição Take Estúdio (${clip.timeString})`,
      type: 'reel',
      aspectRatio: '9:16',
      resolution: '1080p',
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

  /** Captura o primeiro frame de um vídeo (blob URL) como data URL JPEG. */
  const captureFirstFrame = (videoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video')
        video.src = videoUrl
        video.muted = true
        video.playsInline = true
        video.crossOrigin = 'anonymous'
        const cleanup = () => {
          video.removeAttribute('src')
          video.load()
        }
        video.onloadeddata = () => {
          // Busca o primeiro frame.
          video.currentTime = 0
        }
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth || 360
            canvas.height = video.videoHeight || 640
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              cleanup()
              resolve(null)
              return
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            cleanup()
            resolve(dataUrl)
          } catch {
            cleanup()
            resolve(null)
          }
        }
        video.onerror = () => {
          cleanup()
          resolve(null)
        }
      } catch {
        resolve(null)
      }
    })
  }

  /* ── Derivados para o preview ──────────────────────────────────────────── */
  const cameraFilter = `brightness(${brightness}%) contrast(${contrast}%) blur(${
    bgMode === 'blur' ? bgBlurAmount / 6 : 0
  }px) saturate(${100 + beautySmooth / 2}%)`

  // GAP 2 — cameraCover (enquadramento, persistido). O vídeo é object-cover
  // naturalmente; cameraCover escala o conteúdo de 1 (100%, preenche) até um
  // zoom extra proporcional ao slider. Persiste em lumen_gravadora_stage.
  const cameraScale = 1 + cameraCover // cover 1 → escala 2; cover 0 → escala 1
  // Proporção da área de câmera conforme o layout
  const cameraAreaFlex = stageLayout === 'full' ? '1' : '1.3' // câmera maior no split

  /* ═══════════════════════════════════════════════════════════════════════
     Render do canvas 9:16 com guias, layout dividido/cheio, etc.
     ═══════════════════════════════════════════════════════════════════════ */
  const renderCanvas = () => (
    <div
      className="relative bg-[#0B0B10] border border-white/10 overflow-hidden shadow-2xl rounded-xl"
      style={{
        aspectRatio: '9 / 16',
        maxHeight: focusMode
          ? 'calc(100vh - 120px)'
          : showLowerPanel
            ? 'calc(100vh - 320px)'
            : 'calc(100vh - 180px)',
        maxWidth: '100%',
        margin: '0 auto',
        width: 'auto',
      }}
    >
      {/* CORREÇÃO 2 — Canvas compositor 1080×1920 (offscreen).
          O MediaRecorder grava captureStream(30) deste canvas + áudio do mic.
          Permanece oculto (hidden) — o preview visível continua sendo o DOM. */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="hidden"
        aria-hidden="true"
      />

      {/* FASE 4.1 — Fundo atrás do canvas (preenche toda a área do canvas) */}
      <BackgroundRenderer config={backgroundConfig} />

      {/* Resolução de trabalho (indicador) */}
      <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-black/60 text-[9px] font-mono text-[#9494A8] border border-white/10">
        {CANVAS_W}×{CANVAS_H} · 9:16
      </div>

      {/* FASE 2 / GAP 1 — Banner sutil de degradação de desempenho.
          Efeitos visuais opcionais foram pausados para manter a fluidez;
          o vídeo final NÃO é afetado. */}
      {effectiveDegraded && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[30] max-w-[90%] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 backdrop-blur-md shadow-lg pointer-events-none animate-fade-in">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] font-medium text-amber-200 leading-tight">
            {degradationReason ??
              'Alguns efeitos visuais foram pausados para manter a fluidez da gravação. O vídeo final não será afetado.'}
          </span>
        </div>
      )}

      {/* FASE 6 — Badge sutil do estado do Modo Estúdio (canto inferior esquerdo) */}
      <div className="absolute bottom-3 left-3 z-20 px-2 py-1 rounded-lg bg-black/60 text-[10px] font-semibold text-white/80 backdrop-blur-md border border-white/10 pointer-events-none">
        {label}
      </div>

      {/* PROMPT 68 / GAP 2 — Indicador de save status com ícones de nuvem (canto inferior direito),
          sobreposto ao canvas, não atrapalha o conteúdo. */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium pointer-events-auto">
        {draftStore.saveStatus === 'saving' && (
          <>
            <Cloud className="w-3.5 h-3.5 text-[#7C5CFC] animate-pulse" />
            <span className="text-[#9494A8]">Salvando...</span>
          </>
        )}
        {draftStore.saveStatus === 'saved' && (
          <>
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white/80">Salvo na nuvem</span>
          </>
        )}
        {draftStore.saveStatus === 'error' && (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-200">Erro ao salvar</span>
            <button
              onClick={() => void draftStore.retrySave()}
              className="ml-1 text-[#7C5CFC] hover:underline"
            >
              Tentar novamente
            </button>
          </>
        )}
        {draftStore.saveStatus === 'idle' && draftStore.pendingChanges > 0 && (
          <>
            <Save className="w-3.5 h-3.5 text-[#9494A8]" />
            <span className="text-[#9494A8]">{draftStore.pendingChanges} alterações</span>
          </>
        )}
        {draftStore.saveStatus === 'idle' && draftStore.pendingChanges === 0 && (
          <>
            <Cloud className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[#9494A8]">Sincronizado</span>
          </>
        )}
        {draftStore.conflictState !== 'none' && (
          <span className="ml-1 text-amber-300" title="Conflito de versão detectado">
            ● {draftStore.conflictState}
          </span>
        )}
      </div>

      {/* Layout dividido: câmera em cima, parte inferior reservada */}
      <div className="absolute inset-0 flex flex-col">
        {/* Área da câmera */}
        <div style={{ flex: cameraAreaFlex }} className="relative overflow-hidden bg-black">
          {/* "Preview oculto" só faz sentido quando há de fato um stream de
              câmera ativo para esconder. Sem permissão/stream, o usuário precisa
              enxergar a tela de ativação da câmera — caso contrário o botão
              "Ativar Câmera" fica escondido behind do placeholder de preview
              oculto persistido (lumen_gravadora_stage.previewHidden). */}
          {previewHidden && hasPermission && stream ? (
            <div className="absolute inset-0 bg-black flex items-center justify-center text-center p-4">
              <div className="space-y-1">
                <EyeOff className="w-6 h-6 text-[#9494A8] mx-auto" />
                <p className="text-[11px] text-[#9494A8] font-medium">Preview oculto</p>
                <p className="text-[10px] text-[#9494A8]/70">(a gravação continua)</p>
              </div>
            </div>
          ) : hasPermission && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100 transition-transform"
              style={{
                filter: cameraFilter,
                transform: `scale(${cameraScale}) scaleX(-1)`,
                transformOrigin: 'center center',
              }}
            />
          ) : hasPermission === false ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              <img
                src="https://img.usecurling.com/p/1080/1920?q=podcaster+creator+microphone+speaking&color=purple"
                alt="Simulação de Câmera"
                className="w-full h-full object-cover transition-all"
                style={{
                  filter: cameraFilter,
                  transform: `scale(${cameraScale})`,
                }}
              />
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 space-y-2">
                <VideoOff className="w-8 h-8 text-red-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-white text-sm">Prévia Simulada Ativa</h3>
                  <p className="text-[11px] text-[#9494A8] max-w-xs mt-1 leading-relaxed">
                    Câmera local desativada ou não autorizada. Você pode testar todos os controles
                    de gravação e teleprompter normalmente!
                  </p>
                  <p className="text-[10px] text-[#9494A8]/80 max-w-xs mt-2 leading-relaxed">
                    <strong className="text-amber-300">Como liberar:</strong> Chrome: cadeado na
                    barra › Câmera › Permitir. Firefox: Preferências › Privacidade › Câmera. Safari:
                    Preferências › Sites › Câmera.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (guard('startCamera')) startCamera()
                  }}
                  disabled={cameraBtnDisabled}
                  className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                >
                  Solicitar Acesso à Webcam
                </Button>
              </div>
            </div>
          ) : cameraStarting ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#0B0B10] via-[#14141C] to-[#0B0B10]">
              <div className="flex flex-col items-center justify-center text-center p-4 space-y-3 max-w-xs">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#7C5CFC]/20 blur-2xl animate-pulse" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#7C5CFC]/40 bg-[#7C5CFC]/10">
                    <Loader2 className="w-7 h-7 text-[#7C5CFC] animate-spin" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-base">
                    Conectando câmera e microfone...
                  </h3>
                  <p className="text-[11px] text-[#9494A8] leading-relaxed">
                    Autorize o acesso à webcam e ao microfone quando o navegador solicitar.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#0B0B10] via-[#14141C] to-[#0B0B10]">
              <div className="flex flex-col items-center justify-center text-center p-4 space-y-3 max-w-xs">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#7C5CFC]/20 blur-2xl animate-pulse" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#7C5CFC]/40 bg-[#7C5CFC]/10">
                    <Camera className="w-7 h-7 text-[#7C5CFC]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-base">Ativar Câmera do Estúdio</h3>
                  <p className="text-[11px] text-[#9494A8] leading-relaxed">
                    Autorize o acesso à webcam e microfone. Sem permissão, você ainda pode testar os
                    controles com a prévia simulada.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (guard('startCamera')) startCamera()
                  }}
                  disabled={cameraBtnDisabled}
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-bold text-xs px-5 py-2 rounded-xl gap-2 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                >
                  <Camera className="w-4 h-4" /> Ativar Câmera
                </Button>
              </div>
            </div>
          )}

          {/* Fundo virtual (legado) */}
          {bgMode === 'virtual' && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen bg-cover bg-center"
              style={{ backgroundImage: `url(${virtualBgUrl})` }}
            />
          )}

          {/* Grade de terços (legado) */}
          {showGrid && !previewHidden && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
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

          {/* Teleprompter overlay */}
          {showTeleprompter && !previewHidden && (
            <div
              ref={promptContainerRef}
              className="absolute top-3 left-3 right-3 max-h-32 overflow-y-auto rounded-xl p-3 border border-white/15 text-center select-none shadow-2xl backdrop-blur-md"
              style={{ backgroundColor: `rgba(11, 11, 16, ${teleprompterOpacity / 100})` }}
            >
              <p
                className="font-bold text-white leading-relaxed tracking-wide"
                style={{ fontSize: `${teleprompterFontSize}px` }}
              >
                {teleprompterScript}
              </p>
            </div>
          )}

          {/* FASE 3 — B-roll de fundo (loop mudo) */}
          {!previewHidden && currentBRoll && currentBRoll.url && (
            <video
              ref={brollVideoRef}
              key={currentBRoll.pexelsId}
              src={currentBRoll.url}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-100"
              style={{ zIndex: 0 }}
            />
          )}

          {/* FASE 3 — Artes do bloco (sincronizadas, crossfade). */}
          {!previewHidden && syncArts && currentArts.length > 0 && (
            <div
              key={currentBlockId + '-' + activeBlockIndex}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] animate-fade-in"
            >
              {currentArts.map((art) => (
                <img
                  key={art.id}
                  src={art.dataUrl}
                  alt={art.name ?? 'arte'}
                  className="max-w-[80%] max-h-[80%] object-contain rounded-xl shadow-2xl"
                />
              ))}
            </div>
          )}

          {/* GAP 3 — Navegação independente de artes (syncArts === false).
              Mostra a arte selecionada por currentArtIndex e um indicador
              "Arte X/N". Permite dispensar a dica com o botão "×". */}
          {!previewHidden && !syncArts && currentArts.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] animate-fade-in">
              <img
                key={currentArts[currentArtIndex]?.id}
                src={currentArts[currentArtIndex]?.dataUrl}
                alt={currentArts[currentArtIndex]?.name ?? 'arte'}
                className="max-w-[80%] max-h-[80%] object-contain rounded-xl shadow-2xl"
              />
              {currentArts.length > 1 && (
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-[#9494A8]">
                  Arte {currentArtIndex + 1}/{currentArts.length}
                </span>
              )}
            </div>
          )}

          {/* GAP 3 — Dica dispensável quando não há artes e a sincronização
              está desligada. O "×" apenas esconde a mensagem (não apaga
              ativos nem altera estado persistido). */}
          {!previewHidden && !syncArts && currentArts.length === 0 && !dismissedArtTip && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[6] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-[#9494A8]">Nenhuma arte carregada</span>
              <button
                onClick={() => setDismissedArtTip(true)}
                aria-label="Dispensar dica"
                className="w-4 h-4 flex items-center justify-center rounded-full text-[#9494A8] hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
              >
                ×
              </button>
            </div>
          )}

          {/* FASE 3 — Vídeo de reação (overlay em canto configurável) */}
          {!previewHidden && currentReaction && currentReaction.dataUrl && (
            <ReactionOverlay
              ref={reactionVideoRef}
              reaction={currentReaction}
              isRecording={isRecording}
              includeReactionAudio={includeReactionAudio}
            />
          )}

          {/* REC indicator */}
          <div className="absolute top-3 right-3 z-20">
            {isRecording ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/90 text-white backdrop-blur-md shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-rec-pulse" />
                <span className="text-[10px] font-bold font-mono tracking-wider">
                  REC {formatTimer(recordedSeconds)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 text-[#9494A8] backdrop-blur-md text-[10px] font-mono border border-white/10">
                PRONTO
              </div>
            )}
          </div>
        </div>

        {/* GAP 1 — Parte inferior do canvas (split) com conteúdo real.
            Renderiza a mídia selecionada via lowerPanelMode (Artes, Reação,
            Quadro ou B-roll). A troca NÃO reinicia câmera/roteiro/título:
            é uma composição de preview apenas, sem efeitos colaterais.
            Estados vazios usam design LUMEN (ícone + texto em cinza). */}
        {stageLayout === 'split' && (
          <div
            style={{ flex: '0.7' }}
            className="relative bg-[#0B0B10] border-t border-white/10 flex items-center justify-center overflow-hidden"
          >
            {lowerPanelMode === 'none' ? (
              <div className="text-center px-4">
                <PanelBottom className="w-5 h-5 text-[#9494A8]/40 mx-auto mb-1.5" />
                <p className="text-[10px] text-[#9494A8]/70 font-medium">Parte inferior livre</p>
                <p className="text-[9px] text-[#9494A8]/50 mt-0.5">
                  Selecione Artes, Reação, Quadro ou B-roll abaixo
                </p>
              </div>
            ) : lowerPanelMode === 'arts' ? (
              /* Artes do bloco atual (sincronizadas quando syncArts ligado).
                 GAP 3 — com syncArts desligado, navega por currentArtIndex. */
              currentArts.length > 0 ? (
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <img
                    key={syncArts ? currentArts[0].id : currentArts[currentArtIndex]?.id}
                    src={syncArts ? currentArts[0].dataUrl : currentArts[currentArtIndex]?.dataUrl}
                    alt={
                      (syncArts ? currentArts[0].name : currentArts[currentArtIndex]?.name) ??
                      'arte do bloco'
                    }
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                  />
                  {!syncArts && currentArts.length > 1 && (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-[#9494A8]">
                      Arte {currentArtIndex + 1}/{currentArts.length}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-center px-4">
                  <ImageIcon className="w-5 h-5 text-[#9494A8]/40 mx-auto mb-1.5" />
                  <p className="text-[10px] text-[#9494A8]/70 font-medium">
                    {syncArts ? 'Nenhuma arte neste bloco' : 'Sincronização de artes desligada'}
                  </p>
                  <p className="text-[9px] text-[#9494A8]/50 mt-0.5">
                    Adicione artes ao bloco no painel Roteiro
                  </p>
                </div>
              )
            ) : lowerPanelMode === 'reaction' ? (
              /* Vídeo de reação capturado via ReactionVideoPanel. */
              <>
                {/* CORREÇÃO 4 — Aviso de echo quando echoCancellation não é suportado. */}
                {echoCancellationSupported === false && (
                  <div
                    className="absolute top-2 left-2 right-2 z-20 flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] leading-relaxed pointer-events-none animate-fade-in"
                    style={{
                      backgroundColor: 'rgba(124, 92, 252, 0.1)',
                      border: '1px solid #7C5CFC',
                      color: '#9494A8',
                    }}
                  >
                    <span className="shrink-0">🔊</span>
                    <span>
                      Cancelamento de eco não suportado neste navegador. Recomendamos usar fones de
                      ouvido para evitar retorno durante o vídeo de reação.
                    </span>
                  </div>
                )}
                {currentReaction && currentReaction.dataUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <video
                      src={currentReaction.dataUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                    />
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <Video className="w-5 h-5 text-[#9494A8]/40 mx-auto mb-1.5" />
                    <p className="text-[10px] text-[#9494A8]/70 font-medium">Sem vídeo de reação</p>
                    <p className="text-[9px] text-[#9494A8]/50 mt-0.5">
                      Capture um vídeo na aba Reação
                    </p>
                  </div>
                )}
              </>
            ) : lowerPanelMode === 'board' ? (
              /* Quadro (whiteboard): PROMPT 52 — exibe o preview PNG gerado por
                 "Usar este quadro" (rota /estudio/quadro) quando disponível;
                 caso contrário, mantém o preview SVG ao vivo do rascunho atual
                 e, se vazio, mostra o estado vazio com botão para abrir o quadro. */
              boardPreview ? (
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <img
                    src={boardPreview}
                    alt="Quadro aplicado"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                  />
                </div>
              ) : whiteboard.elements.length > 0 ? (
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <WhiteboardPreview elements={whiteboard.elements} />
                </div>
              ) : (
                <div className="text-center px-4">
                  <PenLine className="w-5 h-5 text-[#9494A8]/40 mx-auto mb-1.5" />
                  <p className="text-[10px] text-[#9494A8]/70 font-medium">Quadro vazio</p>
                  <p className="text-[9px] text-[#9494A8]/50 mt-0.5">
                    Desenhe no quadro na aba Quadro
                  </p>
                  <button
                    onClick={() => navigate('/estudio/quadro')}
                    className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-[#7C5CFC] hover:bg-[#6A48E0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                  >
                    <ExternalLink className="w-3 h-3" /> Abrir Quadro
                  </button>
                </div>
              )
            ) : lowerPanelMode === 'broll' ? (
              /* B-roll do bloco atual (vídeo de apoio, loop mudo). */
              currentBRoll && currentBRoll.url ? (
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <video
                    key={currentBRoll.pexelsId}
                    src={currentBRoll.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-w-full max-h-full object-cover rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <div className="text-center px-4">
                  <Film className="w-5 h-5 text-[#9494A8]/40 mx-auto mb-1.5" />
                  <p className="text-[10px] text-[#9494A8]/70 font-medium">
                    Sem B-roll neste bloco
                  </p>
                  <p className="text-[9px] text-[#9494A8]/50 mt-0.5">
                    Escolha um B-roll no painel Roteiro
                  </p>
                </div>
              )
            ) : null}
          </div>
        )}
      </div>

      {/* Guias de segurança — Botões (~85%) e Legenda (~92%) */}
      {showSafeGuides && !previewHidden && (
        <>
          <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: '85%' }}>
            <div className="border-t border-dashed border-[#22D3EE]/70" />
            <span className="absolute -top-4 left-2 text-[9px] font-bold text-[#22D3EE] bg-black/60 px-1 rounded">
              Botões
            </span>
          </div>
          <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: '92%' }}>
            <div className="border-t border-dashed border-[#FBBF24]/70" />
            <span className="absolute -top-4 left-2 text-[9px] font-bold text-[#FBBF24] bg-black/60 px-1 rounded">
              Legenda
            </span>
          </div>
        </>
      )}

      {/* FASE 4.2 — Overlay de título (acima de todas as camadas do canvas) */}
      <TitleOverlay
        config={titleConfig}
        onChange={(patch) => setTitleConfig({ ...titleConfig, ...patch })}
        locked={isRecording}
        elapsedSeconds={recordedSeconds}
      />

      {/* Indicador visual de take gravado (checkmark verde por 2s) */}
      {showTakeSuccess && (
        <div className="absolute inset-0 z-[40] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md shadow-lg animate-fade-in">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-300">Take gravado!</span>
          </div>
        </div>
      )}

      {/* Barra flutuante de gravação (não aparece no modo foco — lá é separada) */}
      {!focusMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/15 p-1.5 rounded-2xl shadow-2xl z-30">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowGrid(!showGrid)}
                aria-label={showGrid ? 'Ocultar grade de terços' : 'Mostrar grade de terços'}
                aria-pressed={showGrid}
                className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                  showGrid ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]' : 'text-[#9494A8] hover:bg-white/5'
                }`}
                title="Grade de Terços (G)"
              >
                <Grid className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Grade de terços (G)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowTeleprompter(!showTeleprompter)}
                aria-label={
                  showTeleprompter ? 'Ocultar teleprompter na tela' : 'Mostrar teleprompter na tela'
                }
                aria-pressed={showTeleprompter}
                className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                  showTeleprompter
                    ? 'bg-[#22D3EE]/20 text-[#22D3EE]'
                    : 'text-[#9494A8] hover:bg-white/5'
                }`}
                title="Teleprompter na Tela"
              >
                <ScrollText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Teleprompter na tela</TooltipContent>
          </Tooltip>

          <button
            onClick={handleToggleRecord}
            disabled={recBtnDisabled}
            aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
            className={`relative flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              isRecording
                ? 'w-12 h-12 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/50 scale-105 animate-rec-pulse'
                : 'w-12 h-12 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
            } ${recBtnDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
          >
            {isRecording ? (
              <Square className="w-5 h-5 text-white fill-current" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white" />
            )}
          </button>

          {isRecording && (
            <button
              onClick={handlePauseResume}
              disabled={pauseBtnDisabled}
              aria-label={isPaused ? 'Retomar gravação' : 'Pausar gravação'}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
              title={isPaused ? 'Retomar Gravação' : 'Pausar Gravação'}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-emerald-400 fill-current" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )

  /* ═══════════════════════════════════════════════════════════════════════
     MODO FOCO: apenas canvas grande + Gravar + Sair do foco
     ═══════════════════════════════════════════════════════════════════════ */
  if (focusMode) {
    return (
      <div className="h-full flex flex-col p-3 sm:p-6 max-w-[1600px] mx-auto gap-3 animate-fade-in">
        <div className="flex items-center justify-between gap-3 shrink-0">
          <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-[#7C5CFC]" />
            Modo Foco
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleRecord}
              disabled={recBtnDisabled}
              aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
              className={`relative flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                isRecording
                  ? 'w-12 h-12 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/50 scale-105 animate-rec-pulse'
                  : 'w-12 h-12 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
              } ${recBtnDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
              title="Gravar"
            >
              {isRecording ? (
                <Square className="w-5 h-5 text-white fill-current" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white" />
              )}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusMode(false)}
              className="border-white/10 bg-[#14141C] text-xs text-white hover:bg-white/5 gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              <Minimize2 className="w-4 h-4 text-[#22D3EE]" /> Sair do foco
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center">{renderCanvas()}</div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Layout normal
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="h-full flex flex-col p-3 sm:p-6 max-w-[1600px] mx-auto gap-4 animate-fade-in"
      style={{ overflow: showLowerPanel ? 'hidden' : 'auto' }}
    >
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
            Capture takes verticais 9:16 com teleprompter, cadeia de áudio e composição de palco.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileQR(true)}
            className="border-white/10 bg-[#14141C] text-xs text-white hover:bg-white/5 gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
          >
            <QrCode className="w-4 h-4 text-[#22D3EE]" />
            Câmera do Celular
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLowerPanel((v) => !v)}
            className={`border-white/10 bg-[#14141C] text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none ${
              showLowerPanel ? 'text-[#7C5CFC] border-[#7C5CFC]/40' : 'text-white hover:bg-white/5'
            }`}
            title="Painel de Roteiro & Teleprompter"
          >
            <PanelBottom className="w-4 h-4" />
            {showLowerPanel ? 'Fechar Painel' : 'Roteiro'}
          </Button>
          <Button
            size="sm"
            onClick={() => setFocusMode(true)}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold text-white gap-1.5 shadow-lg shadow-[#7C5CFC]/25 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            title="Modo foco (F)"
          >
            <Maximize2 className="w-4 h-4" /> Modo foco
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
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold text-white gap-1.5 shadow-lg shadow-[#7C5CFC]/25 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
          >
            <Sparkles className="w-4 h-4" /> Editar Último Take
          </Button>
        </div>
      </div>

      {/* FASE 5.6 — Banner de recuperação de gravação interrompida */}
      {interruptedProjectId && interruptedMeta && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Detectamos uma gravação interrompida.</p>
              <p className="text-xs text-[#9494A8]">
                Duração estimada: {formatTimer(interruptedMeta.duration)} · Salva em{' '}
                {new Date(interruptedMeta.savedAt).toLocaleString('pt-BR')}. Recuperar agora?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscardInterrupted}
              className="text-xs text-[#9494A8] hover:text-white focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleRecoverRecording}
              className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Recuperar
            </Button>{' '}
          </div>
        </div>
      )}

      {/* FASE 5.6 — Player de gravação recuperada */}
      {recoveredBlobUrl && (
        <div className="rounded-2xl bg-[#14141C] border border-[#7C5CFC]/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <video
              src={recoveredBlobUrl}
              className="w-16 h-28 object-cover rounded-lg border border-white/10"
              muted
              playsInline
            />
            <div>
              <p className="text-sm font-bold text-white">Gravação recuperada</p>
              <p className="text-xs text-[#9494A8]">
                Duração: {formatTimer(recoveredDuration)}. Envie para o editor para continuar
                trabalhando.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (recoveredBlobUrl) URL.revokeObjectURL(recoveredBlobUrl)
                setRecoveredBlobUrl(null)
              }}
              className="text-xs text-[#9494A8] hover:text-white focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleSendRecoveredToEditor}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-bold gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Editar no Editor
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid + Lower Panel wrapper */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${showLowerPanel ? 'min-h-0' : 'min-h-[500px]'} ${showLowerPanel ? 'flex-1' : 'flex-1'}`}
        >
          {/* LEFT: Canvas 9:16 + takes */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
            <div className="flex justify-center">{renderCanvas()}</div>

            {/* Takes gravados */}
            <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-[#7C5CFC]" />
                  Takes Gravados Nesta Sessão ({recordedClips.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                    className="h-7 text-[11px] border-white/10 bg-[#1C1C27] text-white hover:bg-white/5 gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#22D3EE]" /> Importar Take
                  </Button>
                  <span className="text-[11px] text-[#9494A8] hidden sm:inline">
                    Salvos automaticamente em Meus Projetos
                  </span>
                </div>
              </div>

              {recordedClips.length === 0 ? (
                <p className="text-xs text-[#9494A8] py-4 text-center">
                  Nenhum take gravado ainda. Clique no botão vermelho para gravar o primeiro take!
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 pt-1">
                  {recordedClips.map((clip, idx) => (
                    <div
                      key={clip.id}
                      className="group relative w-40 shrink-0 bg-[#1C1C27] rounded-xl border border-white/10 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative aspect-[9/16] bg-black/40">
                        {clip.url.startsWith('blob:') ? (
                          <video
                            src={clip.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img src={clip.url} alt="Take" className="w-full h-full object-cover" />
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                          {clip.timeString}
                        </span>
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#7C5CFC] text-[9px] font-bold text-white">
                          Take #{recordedClips.length - idx}
                        </span>
                      </div>
                      <div className="p-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSendToEditor(clip)}
                            className="h-7 text-[10px] bg-[#7C5CFC] hover:bg-[#6A48E0] text-white flex-1 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveToMediaLibrary(clip)}
                            className="h-7 px-2 text-[10px] text-[#22D3EE] hover:bg-[#22D3EE]/10 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                            title="Salvar na Biblioteca"
                          >
                            Salvar
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPackage(clip, recordedClips.length - idx)}
                          className="h-7 px-2 text-[10px] text-[#9494A8] hover:bg-white/5 hover:text-white gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                          title="Baixar pacote de gravação (vídeo + manifesto)"
                        >
                          <Package className="w-3 h-3" /> Baixar pacote
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Controles */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* 1. Layout do palco (T) + cover + preview + foco + guias */}
            <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Columns2 className="w-3.5 h-3.5 text-[#7C5CFC]" />
                Layout do Palco (tecla T)
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStageLayout('split')}
                  aria-label="Layout dividido"
                  aria-pressed={stageLayout === 'split'}
                  className={`p-2 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                    stageLayout === 'split'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                      : 'border-white/10 bg-[#1C1C27] hover:border-white/20'
                  }`}
                  title="Layout Dividido (T)"
                >
                  {' '}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <RectangleHorizontal
                      className={`w-4 h-4 ${stageLayout === 'split' ? 'text-[#7C5CFC]' : 'text-[#9494A8]'}`}
                    />
                    <span className="text-[11px] font-semibold text-white">Dividido</span>
                  </div>
                  {/* mini-preview dividido */}
                  <div className="aspect-[9/16] w-full rounded-md overflow-hidden border border-white/10 flex flex-col">
                    <div className="flex-[1.3] bg-[#7C5CFC]/30" />
                    <div className="flex-[0.7] bg-[#22D3EE]/20" />
                  </div>
                </button>

                <button
                  onClick={() => setStageLayout('full')}
                  aria-label="Câmera cheia"
                  aria-pressed={stageLayout === 'full'}
                  className={`p-2 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                    stageLayout === 'full'
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                      : 'border-white/10 bg-[#1C1C27] hover:border-white/20'
                  }`}
                  title="Câmera Cheia (T)"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Maximize2
                      className={`w-4 h-4 ${stageLayout === 'full' ? 'text-[#7C5CFC]' : 'text-[#9494A8]'}`}
                    />
                    <span className="text-[11px] font-semibold text-white">Câmera cheia</span>
                  </div>
                  <div className="aspect-[9/16] w-full rounded-md overflow-hidden border border-white/10 bg-[#7C5CFC]/30" />
                </button>
              </div>

              {/* Enquadramento cover */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-[#22D3EE]" /> Enquadramento cover
                  </span>
                  <span className="font-mono">{cameraCover.toFixed(2)}</span>
                </div>
                <Slider
                  value={[cameraCover]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => setCameraCover(v[0])}
                />
              </div>

              {/* Botões de preview / foco / guias */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewHidden(!previewHidden)}
                      aria-label={previewHidden ? 'Mostrar preview' : 'Ocultar preview'}
                      aria-pressed={!previewHidden}
                      className="border-white/10 bg-[#1C1C27] text-[11px] text-white hover:bg-white/5 gap-1.5 justify-start focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                    >
                      {previewHidden ? (
                        <Eye className="w-4 h-4 text-[#22D3EE]" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-[#9494A8]" />
                      )}
                      {previewHidden ? 'Mostrar preview' : 'Ocultar preview'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alternar preview (P)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFocusMode(true)}
                      className="border-white/10 bg-[#1C1C27] text-[11px] text-white hover:bg-white/5 gap-1.5 justify-start focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
                    >
                      <Maximize2 className="w-4 h-4 text-[#7C5CFC]" /> Modo foco (F)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modo foco (F)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSafeGuides(!showSafeGuides)}
                      aria-label="Guias de segurança"
                      aria-pressed={showSafeGuides}
                      className={`border-white/10 bg-[#1C1C27] text-[11px] gap-1.5 justify-start focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none ${
                        showSafeGuides ? 'text-[#22D3EE]' : 'text-[#9494A8] hover:text-white'
                      } hover:bg-white/5`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Guias
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Guias de segurança (H)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                      aria-label="Grade de terços"
                      aria-pressed={showGrid}
                      className={`border-white/10 bg-[#1C1C27] text-[11px] gap-1.5 justify-start focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none ${
                        showGrid ? 'text-[#7C5CFC]' : 'text-[#9494A8] hover:text-white'
                      } hover:bg-white/5`}
                    >
                      <Grid className="w-4 h-4" /> Terços
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grade de terços (G)</TooltipContent>
                </Tooltip>
              </div>

              {/* Seletor do modo da parte inferior (split) */}
              {stageLayout === 'split' && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <label className="text-[11px] text-[#9494A8] block">Parte inferior</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(
                      [
                        { id: 'none', label: 'Nenhum' },
                        { id: 'arts', label: 'Artes' },
                        { id: 'reaction', label: 'Reação' },
                        { id: 'board', label: 'Quadro' },
                        { id: 'broll', label: 'B-roll' },
                      ] as { id: LowerPanelMode; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setLowerPanelMode(m.id)}
                        aria-pressed={lowerPanelMode === m.id}
                        className={`py-1.5 rounded-lg font-medium text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                          lowerPanelMode === m.id
                            ? 'bg-[#7C5CFC] text-white'
                            : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Dispositivos */}
            <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-[#7C5CFC]" />
                  Dispositivos de Entrada
                </h3>
                <button
                  onClick={async () => {
                    try {
                      const devices = await navigator.mediaDevices.enumerateDevices()
                      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
                      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
                      toast.success('Dispositivos atualizados.')
                    } catch {
                      toast.error('Não foi possível listar dispositivos.')
                    }
                  }}
                  aria-label="Reenumerar dispositivos"
                  className="text-[10px] text-[#9494A8] hover:text-white flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] rounded"
                  title="Reenumerar dispositivos"
                >
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] text-[#9494A8] flex items-center gap-1 mb-1">
                    <Camera className="w-3.5 h-3.5" /> Câmera Principal
                  </label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    disabled={deviceSelectDisabled}
                    aria-label="Câmera principal"
                    className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
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
                    onChange={(e) => {
                      setSelectedMic(e.target.value)
                      updateAudioConfig({ inputDeviceId: e.target.value })
                    }}
                    disabled={deviceSelectDisabled}
                    aria-label="Microfone de captura"
                    className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
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

            {/* 3. Cadeia de Áudio + Medidor */}
            <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <AudioLines className="w-3.5 h-3.5 text-[#22D3EE]" />
                Cadeia de Áudio
              </h3>

              {/* Medidor de nível */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-[#22D3EE]" /> Nível do microfone
                  </span>
                  <span className="font-mono">{Math.round(audioLevel * 100)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#1C1C27] overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{
                      width: `${Math.min(100, audioLevel * 100)}%`,
                      backgroundColor:
                        audioLevel > 0.9 ? '#EF4444' : audioLevel > 0.7 ? '#FBBF24' : '#22C55E',
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#9494A8]/70">
                  Verde &lt; 70% · Amarelo 70–90% · Vermelho &gt; 90%
                </p>
              </div>

              {/* Toggles da cadeia de áudio */}
              <div className="space-y-2 pt-1">
                <AudioToggle
                  label="Redução de ruído"
                  description="noiseSuppression"
                  checked={audioConfig.noiseSuppression}
                  onChange={(v) => updateAudioConfig({ noiseSuppression: v })}
                />
                <AudioToggle
                  label="Ganho automático"
                  description="autoGainControl — pode elevar ruído ambiente"
                  checked={audioConfig.autoGainControl}
                  onChange={(v) => updateAudioConfig({ autoGainControl: v })}
                />
                <AudioToggle
                  label="Cancelamento de eco"
                  description="echoCancellation"
                  checked={audioConfig.echoCancellation}
                  onChange={(v) => updateAudioConfig({ echoCancellation: v })}
                />
              </div>

              {/* Ganho manual (Web Audio API) */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between text-[11px] text-[#9494A8]">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-[#7C5CFC]" /> Ganho manual
                  </span>
                  <span className="font-mono">{Math.round(audioConfig.manualGain * 100)}%</span>
                </div>
                <Slider
                  value={[Math.round(audioConfig.manualGain * 100)]}
                  min={0}
                  max={200}
                  step={5}
                  onValueChange={(v) => updateAudioConfig({ manualGain: v[0] / 100 })}
                />
                <p className="text-[10px] text-[#9494A8]/70">
                  Aplicado em tempo real via Web Audio API (GainNode).
                </p>
              </div>
            </div>

            {/* 4. Filtros & Fundo (legado) */}
            <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
                Iluminação & Filtros
              </h3>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#9494A8]">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> Iluminação
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

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#9494A8]">
                    <span className="flex items-center gap-1">
                      <Contrast className="w-3 h-3 text-[#7C5CFC]" /> Contraste
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

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#9494A8]">
                    <span className="flex items-center gap-1">
                      <Smile className="w-3 h-3 text-pink-400" /> Suavização (Beleza)
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
                        aria-pressed={bgMode === m.id}
                        className={`py-1.5 rounded-lg font-medium text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
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

            {/* 5. Teleprompter (legado) */}
            <div className="p-4 rounded-2xl bg-[#14141C] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <ScrollText className="w-3.5 h-3.5 text-[#22D3EE]" />
                  Roteiro do Teleprompter
                </h3>
                <button
                  onClick={() => setIsPromptScrolling(!isPromptScrolling)}
                  aria-label={
                    isPromptScrolling
                      ? 'Pausar rolagem do teleprompter'
                      : 'Iniciar rolagem do teleprompter'
                  }
                  aria-pressed={isPromptScrolling}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                    isPromptScrolling
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-[#9494A8] hover:text-white'
                  }`}
                >
                  {isPromptScrolling ? 'Rolando' : 'Pausado'}
                </button>
              </div>

              <textarea
                value={teleprompterScript}
                onChange={(e) => setTeleprompterScript(e.target.value)}
                rows={3}
                aria-label="Roteiro do teleprompter"
                placeholder="Digite ou cole aqui o texto que você vai falar no vídeo..."
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
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

        {/* FASE 2 — Lower Panel (Roteiro / Teleprompter por blocos) */}
        {showLowerPanel && (
          <div
            className="shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            style={{ height: `${lowerPanelHeight}vh` }}
          >
            {/* Handle de redimensionamento */}
            <div
              onMouseDown={onPanelDragStart}
              className="h-1.5 bg-[#1C1C27] hover:bg-[#7C5CFC]/40 cursor-row-resize flex items-center justify-center group transition-colors"
              title="Arraste para redimensionar"
            >
              <GripHorizontal className="w-4 h-3 text-[#9494A8] group-hover:text-[#7C5CFC]" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ScriptPanel
                isRecording={isRecording}
                onTeleprompterActiveChange={setTeleprompterActive}
                onActiveBlockChange={(idx) => setActiveBlockIndex(idx)}
                syncArts={syncArts}
                setSyncArts={setSyncArts}
                autoStartOnRecord={autoStartOnRecord}
                setAutoStartOnRecord={setAutoStartOnRecord}
                /* GAP 1 — Botão "Iniciar" do Roteiro delega ao mesmo handler
                   do botão Gravar principal, respeitando a máquina de estados
                   (só habilitado em modo 'prompter'). */
                onStartRecording={handleToggleRecord}
                canStartRecording={mode === 'prompter'}
                /* GAP 5 — Toggle "Incluir áudio da reação na gravação". */
                includeReactionAudio={includeReactionAudio}
                setIncludeReactionAudio={setIncludeReactionAudio}
                /* PROMPT 58 (GAP 6) — repassa lowerPanelMode para o banner de
                   blocos sem B-roll dentro do ScriptPanel. */
                lowerPanelMode={lowerPanelMode}
              />
            </div>
          </div>
        )}
      </div>

      {/* Indicador "Teleprompter ativo" flutuante durante gravação */}
      {isRecording && teleprompterActive && !focusMode && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-300">Teleprompter ativo</span>
        </div>
      )}

      {/* GAP 70 — Componente de Importação de Take */}
      <ImportTake
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(importedTake, _videoFile, manifest) => {
          // Adiciona o take à lista de takes gravados da sessão
          setRecordedClips((prev) => [importedTake, ...prev])

          // Se o manifesto trouxer roteiro, restaura o roteiro no teleprompter
          if (manifest.scriptText) {
            setTeleprompterScript(manifest.scriptText)
          }

          // Se o manifesto trouxer configurações do palco, restaura
          if (manifest.layout) {
            setStageLayout(manifest.layout)
          }
          if (typeof manifest.cameraCover === 'number') {
            setCameraCover(manifest.cameraCover)
          }

          // Cria projeto em Meus Projetos para permitir edição
          const newProj = createProject({
            title: `Take Importado (${importedTake.timeString})`,
            type: 'reel',
            aspectRatio: '9:16',
            resolution: '1080p',
            duration: importedTake.duration,
            status: 'draft',
            thumbnail: importedTake.url,
            scriptText: manifest.scriptText || teleprompterScript,
            clips: [
              {
                id: 'clip-imported-main',
                track: 'video',
                name: 'Take Importado',
                startTime: 0,
                duration: importedTake.duration,
                sourceUrl: importedTake.url,
                mediaType: 'video',
                volume: 100,
              },
            ],
          })
          takeProjectMapRef.current[importedTake.id] = newProj.id

          toast.success('Take importado e estado do projeto restaurado no estúdio!')
        }}
      />

      {/* Modal: Permissão negada */}
      <Dialog open={permissionErrorModal} onOpenChange={setPermissionErrorModal}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Permissão de Câmera/Microfone
                </DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8] mt-1">
                  Não foi possível acessar a câmera ou o microfone. Verifique as permissões do
                  navegador e tente novamente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-[#9494A8] space-y-2">
            <p>
              <strong className="text-white">Chrome:</strong> clique no cadeado na barra de endereço
              › Câmera e Microfone › Permitir. Recarregue a página.
            </p>
            <p>
              <strong className="text-white">Firefox:</strong> Preferências › Privacidade e
              Segurança › Permissões › Câmera/Microfone › Configurações.
            </p>
            <p>
              <strong className="text-white">Safari:</strong> Preferências › Sites › Câmera e
              Microfone › defina como Permitir.
            </p>
            <p>
              <strong className="text-white">Edge:</strong> ícone de engrenagem/cadeado › Permissões
              do site › Câmera/Microfone › Permitir.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                transition('prepare')
                setPermissionErrorModal(false)
              }}
              className="text-xs text-[#9494A8] hover:text-white focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Usar prévia simulada
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!guard('retryCamera')) return
                transition('prepare')
                setPermissionErrorModal(false)
                startCamera()
              }}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Tentar novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CORREÇÃO 3 — Dialog de bloqueio de navegação durante gravação. */}
      <Dialog
        open={recordingGuardBlocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && recordingGuardBlocker.state === 'blocked') {
            recordingGuardBlocker.reset?.()
          }
        }}
      >
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30">
                <Video className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">🎬 Gravação em andamento</DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8] mt-1">
                  Você tem uma gravação em andamento. Deseja realmente sair? A gravação será
                  finalizada e salva automaticamente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              size="sm"
              onClick={() => recordingGuardBlocker.reset?.()}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Continuar Gravando
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRecordingGuardProceed}
              className="text-xs font-semibold focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
            >
              Finalizar e Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Câmera do Celular — Em desenvolvimento.
          NÃO exibe "4K HDR" nem QR Code simulado: não há fluxo real de conexão
          com o smartphone implementado. Mostra limitação honesta em vez de
          simular uma funcionalidade que não existe. */}
      <Dialog open={showMobileQR} onOpenChange={setShowMobileQR}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 text-center space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <span className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <QrCode className="w-6 h-6" />
              </span>
            </div>
            <DialogTitle className="text-lg font-bold">
              Câmera do Celular — Em desenvolvimento
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9494A8]">
              A conexão do smartphone como câmera remota (webcam sem fio via QR Code/URL) ainda não
              está disponível. Nenhuma capacidade de resolução (ex.: 4K HDR) é detectada ou
              prometida enquanto não houver um fluxo real de pareamento.
            </DialogDescription>
          </DialogHeader>

          <div className="text-left text-xs text-[#9494A8] space-y-2 rounded-xl bg-[#1C1C27] border border-white/5 p-3">
            <p className="font-semibold text-white">O que você pode usar agora:</p>
            <p>• A webcam do computador (botão "Ativar Câmera" no palco).</p>
            <p>• Importar um take gravado no celular ("Importar Take").</p>
            <p>• Esta integração será ativada em uma versão futura.</p>
          </div>

          <Button
            onClick={() => setShowMobileQR(false)}
            className="w-full bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold py-2 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] focus-visible:outline-none"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Subcomponente: toggle de áudio com label + descrição ─────────────────── */
function AudioToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-white">{label}</p>
        {description && <p className="text-[10px] text-[#9494A8]/70 truncate">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/* ── FASE 3 — Overlay do vídeo de reação sobre o canvas ───────────────────── */
const ReactionOverlay = React.forwardRef<
  HTMLVideoElement,
  {
    reaction: import('@/types/studio').ReactionVideo
    isRecording: boolean
    /** GAP 5 — quando true, o áudio da reação entra na gravação (não muta). */
    includeReactionAudio: boolean
  }
>(function ReactionOverlay({ reaction, isRecording, includeReactionAudio }, ref) {
  const sizePct = Math.round(reaction.size * 100)
  const cornerClasses: Record<typeof reaction.corner, string> = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  }
  return (
    <div
      className={`absolute z-[15] ${cornerClasses[reaction.corner]}`}
      style={{ width: `${sizePct}%` }}
    >
      <video
        ref={ref}
        src={reaction.dataUrl}
        autoPlay
        loop
        // Durante a gravação o áudio é silenciado internamente (evita eco),
        // exceto quando o usuário liga "Incluir áudio da reação" (GAP 5) —
        // nesse caso o áudio é capturado pelo AudioContext para a gravação.
        muted={isRecording ? !includeReactionAudio : false}
        playsInline
        className="w-full rounded-xl border-2 border-white/20 shadow-2xl object-cover"
        style={{ aspectRatio: '9 / 16' }}
      />
    </div>
  )
})

/* ── GAP 1 — Preview compacto do quadro (whiteboard) na parte inferior ─────
   Renderiza os elementos do WhiteboardState como SVG no espaço lógico
   1080×1920, espelhando o que o usuário desenhou no WhiteboardPanel.
   Não depende de funções internas do componente Whiteboard (que não são
   exportadas) — é uma renderização fiel somente-leitura para composição. */
function WhiteboardPreview({
  elements,
}: {
  elements: import('@/types/studio').WhiteboardElement[]
}) {
  return (
    <svg
      viewBox="0 0 1080 1920"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ maxHeight: '100%' }}
    >
      <rect x={0} y={0} width={1080} height={1920} fill="#0F0F15" />
      {elements
        .filter((el) => el.visible !== false)
        .map((el) => {
          const sw = el.strokeWidth || 4
          const stroke = el.color || '#FFFFFF'
          switch (el.type) {
            case 'rectangle':
              return (
                <rect
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={sw}
                />
              )
            case 'ellipse':
              return (
                <ellipse
                  key={el.id}
                  cx={el.x + el.width / 2}
                  cy={el.y + el.height / 2}
                  rx={Math.abs(el.width / 2)}
                  ry={Math.abs(el.height / 2)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={sw}
                />
              )
            case 'line':
              return (
                <line
                  key={el.id}
                  x1={el.x}
                  y1={el.y}
                  x2={el.x + el.width}
                  y2={el.y + el.height}
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeLinecap="round"
                />
              )
            case 'arrow': {
              const x2 = el.x + el.width
              const y2 = el.y + el.height
              const ang = Math.atan2(el.height, el.width)
              const head = Math.min(28, Math.hypot(el.width, el.height) / 3)
              return (
                <g key={el.id}>
                  <line
                    x1={el.x}
                    y1={el.y}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={sw}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${x2},${y2} ${x2 - head * Math.cos(ang - Math.PI / 6)},${
                      y2 - head * Math.sin(ang - Math.PI / 6)
                    } ${x2 - head * Math.cos(ang + Math.PI / 6)},${
                      y2 - head * Math.sin(ang + Math.PI / 6)
                    }`}
                    fill={stroke}
                  />
                </g>
              )
            }
            case 'brush': {
              const pts = el.points ?? []
              if (pts.length === 0) return null
              const d = `M ${el.x} ${el.y} ` + pts.map((p) => `l ${p.x} ${p.y}`).join(' ')
              return (
                <path
                  key={el.id}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            }
            case 'text':
              return (
                <text
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  fill={stroke}
                  fontSize={Math.max(20, sw * 6)}
                  fontFamily="Montserrat, sans-serif"
                >
                  {el.text}
                </text>
              )
            case 'image':
              return el.dataUrl ? (
                <image
                  key={el.id}
                  href={el.dataUrl}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  preserveAspectRatio="none"
                />
              ) : null
            default:
              return null
          }
        })}
    </svg>
  )
}
