import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import {
  Project,
  SubtitleBlock,
  ExportProgress,
  ExportResult,
  TimelineState,
  TimelineSegment,
} from '@/types/studio'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  Scissors,
  Layers,
  Type,
  Music,
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
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Palette,
  Film,
  ArrowRight,
  Clock,
  AlertCircle,
  History,
  X,
  Loader2,
  RotateCcw,
  Upload,
  Gauge,
} from 'lucide-react'
import { toast } from 'sonner'
import EditTimeline from '@/components/studio/EditTimeline'
import OpenTakeModal from '@/components/studio/OpenTakeModal'
import { TitlePanel } from '@/components/studio/TitlePanel'
import { BackgroundPanel } from '@/components/studio/BackgroundPanel'
import CaptionPanel from '@/components/studio/CaptionPanel'
import MediaPanel from '@/components/studio/MediaPanel'
import AdjustmentsPanel from '@/components/studio/AdjustmentsPanel'
import EffectsPanel from '@/components/studio/EffectsPanel'
import AudioPanel from '@/components/studio/AudioPanel'
import {
  AdjustmentsState,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EDITOR_AUDIO,
  DEFAULT_EFFECTS,
  EditorAudioState,
  EffectsState,
  adjustmentsToCssFilter,
  effectsToCssFilter,
  loadEditorState,
  saveEditorState,
} from '@/components/studio/editor-types'
import {
  createVideoExporter,
  computeResultDuration,
  computeEffectiveSegments,
  pickSupportedMimeType,
  type VideoExporterHandle,
} from '@/lib/exporter'

/* ===========================================================================
   EditorVideo — Editor de vídeo da rota /editor/:projectId
   - Sem simulação: o player só reproduz mídia REAL (blob, File, URL de storage).
   - Estado vazio ("Nenhuma mídia carregada") com Importar vídeo e Abrir take.
   - Player real: play/pause, tempo, duração (loadedmetadata), voltar ao início,
     ±5s, scrub, volume, mute, velocidade (0.5/1/1.5/2), preview 9:16.
   - Timeline não destrutiva (EDL) com split, excluir, restaurar, mover,
     zoom, undo/redo, autosave, duração resultante e proteção de saída.
   - Botões de IA desabilitados com "Integração pendente" (sem simulação).
   =========================================================================== */

const SPEEDS = [0.5, 1, 1.5, 2] as const

export default function EditorVideo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getProjectById,
    updateProject,
    saveProjectSnapshot,
    loadProjectSnapshot,
    getTimelineState,
    setTimelineState,
    saveRawVideo,
    loadRawVideo,
  } = useStudio()

  const project = id ? getProjectById(id) : undefined

  /* ── Mídia real ──────────────────────────────────────────────────────────
     A fonte do <video> é SEMPRE uma URL de mídia real (blob: criado a partir
     de um File/Blob, ou http(s) do storage). Nunca usamos uma URL de imagem
     (img.usecurling.com) como fonte de vídeo — isso era a simulação antiga. */
  const [mediaUrl, setMediaUrl] = useState<string>('')
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null)
  const [mediaName, setMediaName] = useState<string>('')
  const [mediaReady, setMediaReady] = useState(false) // readyState >= 1
  const [realDuration, setRealDuration] = useState(0) // duração finita real
  const [videoError, setVideoError] = useState<string | null>(null)

  // Objeto URLs criados por esta instância (revogados ao desmontar).
  const createdUrlsRef = useRef<string[]>([])
  const playerVideoRef = useRef<HTMLVideoElement | null>(null)

  const hasMedia = !!mediaUrl && mediaReady && realDuration > 0

  /* Carrega mídia persistida (snapshot/IndexedDB) ao montar ou trocar de id. */
  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null
    async function restore() {
      if (!id) return
      // Tenta primeiro o blob bruto salvo (Gravadora/recuperação).
      const blob = await loadRawVideo(id)
      if (cancelled) return
      if (blob) {
        setMediaBlob(blob)
        createdUrl = URL.createObjectURL(blob)
        createdUrlsRef.current.push(createdUrl)
        setMediaUrl(createdUrl)
        setMediaName(project?.title ? `${project.title} (take)` : 'Take da Gravadora')
        return
      }
      // Sem blob — verifica se há sourceUrl http(s) válido no projeto (storage).
      const clip = project?.clips.find((c) => c.track === 'video')
      const src = clip?.sourceUrl
      if (src && /^https?:\/\//.test(src) && !src.includes('img.usecurling.com')) {
        setMediaUrl(src)
        setMediaName(clip?.name || 'Vídeo do storage')
      }
      // Caso contrário permanece no estado vazio.
    }
    restore()
    return () => {
      cancelled = true
      if (createdUrl) {
        try {
          URL.revokeObjectURL(createdUrl)
        } catch {
          /* noop */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  /* Quando um objeto URL é trocado, revoga o anterior. */
  const prevMediaUrlRef = useRef<string>('')
  useEffect(() => {
    if (prevMediaUrlRef.current && prevMediaUrlRef.current !== mediaUrl) {
      const old = prevMediaUrlRef.current
      if (createdUrlsRef.current.includes(old)) {
        try {
          URL.revokeObjectURL(old)
        } catch {
          /* noop */
        }
        createdUrlsRef.current = createdUrlsRef.current.filter((u) => u !== old)
      }
    }
    prevMediaUrlRef.current = mediaUrl
    // Reset do estado de mídia ao trocar de fonte.
    setMediaReady(false)
    setRealDuration(0)
    setVideoError(null)
    setCurrentTime(0)
    setPlayerResultTime(0)
  }, [mediaUrl])

  /* ── loadedmetadata: duração real do vídeo ────────────────────────────── */
  const handleLoadedMetadata = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    const d = v.duration
    if (isFinite(d) && d > 0) {
      setRealDuration(d)
      setMediaReady(true)
      setVideoError(null)
    } else {
      // Duração inválida — não inventa. Marca como não pronto.
      setRealDuration(0)
      setMediaReady(false)
    }
  }, [])

  const handleLoadedData = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    if (v.readyState >= 1) setMediaReady(true)
  }, [])

  const handleVideoError = useCallback(() => {
    setMediaReady(false)
    setRealDuration(0)
    setVideoError('Não foi possível carregar este vídeo. Verifique o arquivo ou a URL.')
  }, [])

  /* ── Timeline não destrutiva (EDL) ──────────────────────────────────────
     Persistida no StudioContext (localStorage por projectId). A EDL referencia
     intervalos do vídeo bruto — o bruto nunca é apagado. */
  const [timelineState, setTimelineStateLocal] = useState<TimelineState>(() => {
    // Duração inicial desconhecida até loadedmetadata; usa 0 e recalcula.
    return getTimelineState(id || 'temp', realDuration || 1)
  })

  // Recarrega a EDL quando a duração real fica disponível (ou muda de projeto).
  useEffect(() => {
    if (!id) return
    const dur = realDuration > 0 ? realDuration : 0
    const restored = getTimelineState(id, dur || 1)
    // Se ainda não há duração real, mantém uma EDL mínima sem inventar duração.
    if (dur <= 0) {
      setTimelineStateLocal({
        segments: [],
        inPoint: 0,
        outPoint: 0,
        cursor: 0,
      })
    } else {
      // Ajusta outPoint/cursor à duração real se a EDL salva extrapolava.
      if (restored.outPoint > dur) restored.outPoint = dur
      if (restored.cursor > dur) restored.cursor = 0
      setTimelineStateLocal(restored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, realDuration])

  const handleTimelineChange = useCallback(
    (next: TimelineState) => {
      setTimelineStateLocal(next)
      if (id) {
        setTimelineState(id, next)
        setHasUnsavedChanges(true)
      }
    },
    [id, setTimelineState],
  )

  const safeDuration = Math.max(0.1, realDuration || 1)
  const resultDuration = hasMedia ? computeResultDuration(timelineState, safeDuration) : 0
  const effectiveSegments = useMemo(
    () => (hasMedia ? computeEffectiveSegments(timelineState, safeDuration) : []),
    [timelineState, safeDuration, hasMedia],
  )

  /* Mapeia tempo "resultante" (do vídeo editado) → tempo bruto. */
  const resultToRaw = useCallback(
    (resultTime: number): { rawTime: number; segIndex: number } => {
      let acc = 0
      for (let i = 0; i < effectiveSegments.length; i++) {
        const seg = effectiveSegments[i]
        const len = seg.end - seg.start
        if (resultTime <= acc + len) {
          return { rawTime: seg.start + (resultTime - acc), segIndex: i }
        }
        acc += len
      }
      const last = effectiveSegments[effectiveSegments.length - 1]
      return { rawTime: last ? last.end : 0, segIndex: effectiveSegments.length - 1 }
    },
    [effectiveSegments],
  )

  const rawToResult = useCallback(
    (rawTime: number): number => {
      let acc = 0
      for (const seg of effectiveSegments) {
        if (rawTime >= seg.start && rawTime <= seg.end) {
          return acc + (rawTime - seg.start)
        }
        acc += seg.end - seg.start
      }
      return acc
    },
    [effectiveSegments],
  )

  /* ── Player state ──────────────────────────────────────────────────────── */
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0) // tempo bruto
  const [playerResultTime, setPlayerResultTime] = useState(0) // tempo resultante
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  // Volume/mute agora vivem no AudioPanel (editorAudio) — fonte única no <video>.

  // Sincroniza velocidade no <video>.
  useEffect(() => {
    const v = playerVideoRef.current
    if (!v) return
    v.playbackRate = playbackRate
  }, [playbackRate])

  const handleTimeUpdate = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    const raw = v.currentTime
    setCurrentTime(raw)
    setPlayerResultTime(rawToResult(raw))
    setTimelineStateLocal((prev) => ({ ...prev, cursor: raw }))
  }, [rawToResult])

  // Verifica se o player atingiu o fim de um segmento e salta para o próximo.
  const handleSeekedNextSegment = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    const raw = v.currentTime
    const seg = effectiveSegments.find((s) => raw >= s.start - 0.05 && raw <= s.end + 0.05)
    if (!seg) return
    if (raw >= seg.end - 0.05) {
      const idx = effectiveSegments.indexOf(seg)
      const next = effectiveSegments[idx + 1]
      if (next) {
        v.currentTime = next.start
      } else {
        v.pause()
        setIsPlaying(false)
      }
    }
  }, [effectiveSegments])

  const handleTogglePlay = useCallback(() => {
    const v = playerVideoRef.current
    if (!v || !hasMedia) return
    if (v.paused) {
      const { rawTime } = resultToRaw(playerResultTime)
      v.currentTime = rawTime
      v.play().catch(() => {})
      setIsPlaying(true)
    } else {
      v.pause()
      setIsPlaying(false)
    }
  }, [hasMedia, playerResultTime, resultToRaw])

  const handleSeek = useCallback(
    (rawTime: number) => {
      const v = playerVideoRef.current
      if (!v) return
      v.currentTime = rawTime
      setCurrentTime(rawTime)
      setPlayerResultTime(rawToResult(rawTime))
    },
    [rawToResult],
  )

  const handleSkipBack = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    v.currentTime = Math.max(0, v.currentTime - 5)
  }, [])

  const handleSkipForward = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    v.currentTime = Math.min(safeDuration, v.currentTime + 5)
  }, [safeDuration])

  const handleRestart = useCallback(() => {
    const v = playerVideoRef.current
    if (!v) return
    v.currentTime = effectiveSegments[0]?.start ?? timelineState.inPoint ?? 0
    setIsPlaying(false)
  }, [effectiveSegments, timelineState.inPoint])

  const handleScrub = useCallback(
    (val: number) => {
      // Scrub pelo tempo resultante → converte para bruto.
      const { rawTime } = resultToRaw(val)
      handleSeek(rawTime)
    },
    [resultToRaw, handleSeek],
  )

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  /* ── Importação de arquivo / Blob ──────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isTakeModalOpen, setIsTakeModalOpen] = useState(false)

  const loadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        toast.error('Selecione um arquivo de vídeo válido.')
        return
      }
      const url = URL.createObjectURL(file)
      createdUrlsRef.current.push(url)
      setMediaBlob(file)
      setMediaUrl(url)
      setMediaName(file.name)
      // Persiste o blob bruto associado ao projeto (para sobreviver reload).
      if (id) {
        // Duração só conhecemos após loadedmetadata; salvamos depois.
        // Usamos um placeholder que será corrigido no handleLoadedMetadata.
        saveRawVideo(id, file, 0, file.type || 'video/webm').catch(() => {})
      }
      toast.success(`Vídeo "${file.name}" importado. Aguardando metadados...`)
    },
    [id, saveRawVideo],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  /* ── Abrir take da Gravadora ───────────────────────────────────────────── */
  const handleOpenTake = useCallback(
    async (takeProjectId: string) => {
      // Se o take pertence a outro projeto, navega para o editor dele.
      if (takeProjectId !== id) {
        setIsTakeModalOpen(false)
        navigate(`/editor/${takeProjectId}`)
        return
      }
      // Mesmo projeto: recarrega o blob.
      const blob = await loadRawVideo(takeProjectId)
      if (!blob) {
        toast.error('Não foi possível carregar o take selecionado.')
        return
      }
      const url = URL.createObjectURL(blob)
      createdUrlsRef.current.push(url)
      setMediaBlob(blob)
      setMediaUrl(url)
      setMediaName(project?.title ? `${project.title} (take)` : 'Take da Gravadora')
      setIsTakeModalOpen(false)
      toast.success('Take carregado do Estúdio de Gravação.')
    },
    [id, navigate, loadRawVideo, project?.title],
  )

  /* Após loadedmetadata com duração real, corrige o meta salvo do raw video. */
  const persistDurationRef = useRef(false)
  useEffect(() => {
    if (!id || !mediaBlob || realDuration <= 0 || persistDurationRef.current) return
    persistDurationRef.current = true
    saveRawVideo(id, mediaBlob, realDuration, mediaBlob.type || 'video/webm').catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mediaBlob, realDuration])

  /* ── Undo/Redo da EDL (histórico de estados da timeline) ──────────────── */
  const undoStack = useRef<TimelineState[]>([])
  const redoStack = useRef<TimelineState[]>([])
  const [historyTick, setHistoryTick] = useState(0)

  const pushHistory = useCallback(() => {
    undoStack.current.push(timelineState)
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
    setHistoryTick((t) => t + 1)
  }, [timelineState])

  const handleUndoEdl = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) {
      toast.info('Nada para desfazer.')
      return
    }
    redoStack.current.push(timelineState)
    handleTimelineChange(prev)
    setHistoryTick((t) => t + 1)
    toast.info('Ação desfeita.')
  }, [timelineState, handleTimelineChange])

  const handleRedoEdl = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) {
      toast.info('Nada para refazer.')
      return
    }
    undoStack.current.push(timelineState)
    handleTimelineChange(next)
    setHistoryTick((t) => t + 1)
    toast.info('Ação refeita.')
  }, [timelineState, handleTimelineChange])

  /* ── Operações da EDL: split / excluir / restaurar / mover ────────────── */
  const handleSplitAtCursor = useCallback(() => {
    if (!hasMedia) return
    const cursor = timelineState.cursor
    const seg = timelineState.segments.find(
      (s) => !s.excluded && cursor > s.start + 0.05 && cursor < s.end - 0.05,
    )
    if (!seg) {
      toast.warning('Posicione o cursor no meio de um segmento para dividir.')
      return
    }
    pushHistory()
    const left: TimelineSegment = { ...seg, end: cursor }
    const right: TimelineSegment = {
      id: 'seg-' + Math.random().toString(36).slice(2, 9),
      start: cursor,
      end: seg.end,
      excluded: false,
      label: seg.label,
    }
    const nextSegments = timelineState.segments
      .filter((s) => s.id !== seg.id)
      .concat([left, right])
      .sort((a, b) => a.start - b.start)
    handleTimelineChange({ ...timelineState, segments: nextSegments })
    toast.success('Segmento dividido no cursor!')
  }, [hasMedia, timelineState, pushHistory, handleTimelineChange])

  const handleDeleteSegmentAtCursor = useCallback(() => {
    if (!hasMedia) return
    const cursor = timelineState.cursor
    const seg = timelineState.segments.find(
      (s) => !s.excluded && cursor >= s.start && cursor <= s.end,
    )
    if (!seg) {
      toast.warning('Nenhum segmento ativo no cursor para excluir.')
      return
    }
    pushHistory()
    const nextSegments = timelineState.segments.map((s) =>
      s.id === seg.id ? { ...s, excluded: true } : s,
    )
    handleTimelineChange({ ...timelineState, segments: nextSegments })
    toast.success('Segmento excluído (vídeo bruto preservado).')
  }, [hasMedia, timelineState, pushHistory, handleTimelineChange])

  const handleRestoreExcluded = useCallback(() => {
    if (!hasMedia) return
    const hasExcluded = timelineState.segments.some((s) => s.excluded)
    if (!hasExcluded) {
      toast.info('Não há segmentos excluídos para restaurar.')
      return
    }
    pushHistory()
    const nextSegments = timelineState.segments.map((s) => ({ ...s, excluded: false }))
    handleTimelineChange({ ...timelineState, segments: nextSegments })
    toast.success('Trecho excluído restaurado.')
  }, [hasMedia, timelineState, pushHistory, handleTimelineChange])

  /* ── Legendas manuais (legado — exibidas no player e na multi-track) ────
     A edição profissional de legendas agora vive no CaptionPanel (aba
     "Legendas" do inspetor). Mantemos este estado apenas para exibir as
     legendas do projeto no player e na pista da multi-track timeline. */
  const [subtitles, setSubtitles] = useState<SubtitleBlock[]>(() => project?.subtitles || [])
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null)

  // Sincroniza legendas do projeto quando ele muda.
  useEffect(() => {
    if (project) setSubtitles(project.subtitles || [])
  }, [project])

  const activeSubtitle = subtitles.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime,
  )

  /* ── Aviso antes de sair + autosave ────────────────────────────────────── */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'Tem alterações não salvas. Sair agora irá perdê-las.'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges])

  // Autosave da EDL a cada 5s de inatividade.
  const lastEdlChangeRef = useRef<number>(Date.now())
  useEffect(() => {
    lastEdlChangeRef.current = Date.now()
    const iv = setInterval(() => {
      if (Date.now() - lastEdlChangeRef.current >= 5000 && hasUnsavedChanges && id) {
        setTimelineState(id, timelineState)
        if (project) {
          saveProjectSnapshot({
            version: 1,
            savedAt: new Date().toISOString(),
            projectId: id,
            title: project.title,
            blocks: [],
            scriptText: project.scriptText || '',
            artsByBlock: {},
            brollByBlock: {},
            background: { type: 'none', segmentationEnabled: false },
            titleConfig: {
              enabled: false,
              text: '',
              font: 'Anton',
              fontSize: 64,
              width: 80,
              color: '#FFFFFF',
              bgEnabled: false,
              bgColor: 'transparent',
              alignment: 'center',
              position: 'middle',
              normalizedX: 0.5,
              normalizedY: 0.5,
              duration: 'full',
              durationSeconds: 5,
            },
            audio: {
              inputDeviceId: '',
              noiseSuppression: true,
              autoGainControl: false,
              echoCancellation: true,
              manualGain: 1,
            },
            stageLayout: 'full',
            cameraCover: 1,
            takes: [],
            timeline: timelineState,
            rawVideoDuration: realDuration,
          })
        }
        setHasUnsavedChanges(false)
      }
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineState, hasUnsavedChanges, id, realDuration])

  const handleManualSave = useCallback(() => {
    if (!id) return
    setTimelineState(id, timelineState)
    if (project) {
      updateProject(id, { subtitles, duration: Math.round(resultDuration) })
    }
    setHasUnsavedChanges(false)
    toast.success('Projeto salvo com sucesso!')
  }, [id, timelineState, project, subtitles, resultDuration, setTimelineState, updateProject])

  /* ── Exportação MP4 real ───────────────────────────────────────────────── */
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    phase: 'idle',
    percent: 0,
    message: '',
  })
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const cancelExportRef = useRef(false)
  const exporterHandleRef = useRef<VideoExporterHandle | null>(null)
  const isUnmountingRef = useRef(false)
  const supportsExport = typeof MediaRecorder !== 'undefined' && !!pickSupportedMimeType()

  const handleStartExport = useCallback(async () => {
    if (!mediaUrl || !hasMedia) {
      toast.error('Nenhum vídeo carregado para exportar.')
      return
    }
    cancelExportRef.current = false
    setExportResult(null)
    setExportProgress({ phase: 'preparing', percent: 0, message: 'Preparando...' })
    try {
      const handle = createVideoExporter({
        rawVideoUrl: mediaUrl,
        rawVideoDuration: safeDuration,
        timeline: timelineState,
        background: { type: 'none', segmentationEnabled: false },
        title: {
          enabled: false,
          text: '',
          font: 'Anton',
          fontSize: 64,
          width: 80,
          color: '#FFFFFF',
          bgEnabled: false,
          bgColor: 'transparent',
          alignment: 'center',
          position: 'middle',
          normalizedX: 0.5,
          normalizedY: 0.5,
          duration: 'full',
          durationSeconds: 5,
        },
        blocks: [],
        artsByBlock: {},
        brollByBlock: {},
        backgroundBlur: 0,
        projectName: project?.title || 'projeto',
        onProgress: (p) => setExportProgress(p),
        shouldCancel: () => cancelExportRef.current,
      })
      exporterHandleRef.current = handle
      const result = await handle.promise
      createdUrlsRef.current.push(result.url)
      setExportResult(result)
      setExportProgress({ phase: 'done', percent: 100, message: 'Exportação concluída!' })
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (id) {
        updateProject(id, {
          thumbnail: result.thumbnail || result.url,
          status: 'ready',
          duration: Math.round(result.duration),
        })
      }
      toast.success('Vídeo exportado com sucesso! Download iniciado.')
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido.'
      if (msg.includes('cancelada')) {
        if (!isUnmountingRef.current) {
          toast.info('Exportação cancelada. Nenhum arquivo foi gerado.')
        }
        setExportProgress({ phase: 'cancelled', percent: 0, message: 'Exportação cancelada.' })
      } else {
        setExportProgress({
          phase: 'error',
          percent: 0,
          message: 'A exportação falhou. Tente usar o Chrome ou Edge.',
          error: msg,
        })
        toast.error(`A exportação falhou: ${msg}`)
      }
    } finally {
      exporterHandleRef.current = null
    }
  }, [mediaUrl, hasMedia, safeDuration, timelineState, project?.title, id, updateProject])

  const handleCancelExport = useCallback(() => {
    cancelExportRef.current = true
  }, [])

  /* ── Cleanup ao desmontar ──────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true
      const handle = exporterHandleRef.current
      if (handle) {
        try {
          handle.abort()
        } catch {
          /* noop */
        }
        exporterHandleRef.current = null
      }
      for (const url of createdUrlsRef.current) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* noop */
        }
      }
      createdUrlsRef.current = []
      try {
        playerVideoRef.current?.pause()
      } catch {
        /* noop */
      }
      cancelExportRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Zoom da multi-track timeline ─────────────────────────────────────── */
  const [timelineZoom, setTimelineZoom] = useState(25)

  void historyTick

  /* ── Estado do inspetor: ajustes / efeitos / áudio (persistido por projectId) */
  const [adjustments, setAdjustments] = useState<AdjustmentsState>(() =>
    id
      ? loadEditorState<AdjustmentsState>(id, 'adjustments', DEFAULT_ADJUSTMENTS)
      : DEFAULT_ADJUSTMENTS,
  )
  const [effects, setEffects] = useState<EffectsState>(() =>
    id ? loadEditorState<EffectsState>(id, 'effects', DEFAULT_EFFECTS) : DEFAULT_EFFECTS,
  )
  const [editorAudio, setEditorAudio] = useState<EditorAudioState>(() =>
    id
      ? loadEditorState<EditorAudioState>(id, 'audio', DEFAULT_EDITOR_AUDIO)
      : DEFAULT_EDITOR_AUDIO,
  )

  // Recarrega ao trocar de projeto
  useEffect(() => {
    if (!id) return
    setAdjustments(loadEditorState<AdjustmentsState>(id, 'adjustments', DEFAULT_ADJUSTMENTS))
    setEffects(loadEditorState<EffectsState>(id, 'effects', DEFAULT_EFFECTS))
    setEditorAudio(loadEditorState<EditorAudioState>(id, 'audio', DEFAULT_EDITOR_AUDIO))
  }, [id])

  // CSS filter combinado (ajustes + efeitos) aplicado ao <video>
  const videoFilterCss = useMemo(() => {
    const adj = adjustmentsToCssFilter(adjustments)
    const fx = effectsToCssFilter(effects)
    return [adj, fx].filter(Boolean).join(' ')
  }, [adjustments, effects])

  // Aplica volume/mute do AudioPanel no <video> (sincroniza com player)
  useEffect(() => {
    const v = playerVideoRef.current
    if (!v) return
    v.volume = editorAudio.muted ? 0 : Math.max(0, Math.min(1, editorAudio.voiceVolume / 100))
    v.muted = editorAudio.muted
  }, [editorAudio.voiceVolume, editorAudio.muted])

  /* ═══════════════════════════════════════════════════════════════════════
     ESTADO VAZIO — sem mídia carregada
     ═══════════════════════════════════════════════════════════════════════ */
  if (!hasMedia) {
    return (
      <div className="h-full flex flex-col bg-[#0B0B10] text-white overflow-hidden animate-fade-in">
        {/* Top bar mínimo */}
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
            <h2 className="text-xs sm:text-sm font-bold truncate max-w-xs">
              {project?.title || 'Editor de Vídeo'}
            </h2>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#14141C] border border-white/10 p-8 space-y-5 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center">
              <Film className="w-8 h-8 text-[#7C5CFC]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">Nenhuma mídia carregada</h2>
              <p className="text-sm text-[#9494A8] leading-relaxed">
                Importe um arquivo de vídeo, carregue um take salvo da Gravadora ou informe uma URL
                válida do storage para começar a editar.
              </p>
            </div>

            {videoError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-200">{videoError}</p>
              </div>
            )}

            {/* Importar arquivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-sm font-semibold gap-2"
            >
              <Upload className="w-4 h-4" /> Importar vídeo
            </Button>

            {/* Abrir take da Gravadora */}
            <Button
              variant="outline"
              onClick={() => setIsTakeModalOpen(true)}
              className="w-full border-white/10 text-white hover:bg-white/5 text-sm font-semibold gap-2"
            >
              <Camera className="w-4 h-4 text-[#22D3EE]" /> Abrir take da Gravadora
            </Button>

            <div className="pt-2 border-t border-white/5 text-[10px] text-[#9494A8]/80 space-y-1">
              <p>• Reprodução, cortes, IA e exportação ficam desabilitados até houver mídia.</p>
              <p>• A duração será lida do vídeo real após o carregamento.</p>
            </div>
          </div>
        </div>

        <OpenTakeModal
          open={isTakeModalOpen}
          onClose={() => setIsTakeModalOpen(false)}
          onSelect={handleOpenTake}
          currentProjectId={id}
        />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ESTADO COM MÍDIA — player + timeline + painel
     ═══════════════════════════════════════════════════════════════════════ */
  const trackLanes: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'video', label: 'Vídeo', icon: <Film className="w-3 h-3 text-white" />, color: 'violet' },
    {
      id: 'audio',
      label: 'Áudio',
      icon: <Music className="w-3 h-3 text-emerald-400" />,
      color: 'emerald',
    },
    {
      id: 'subtitles',
      label: 'Legendas',
      icon: <Type className="w-3 h-3 text-[#7C5CFC]" />,
      color: 'purple',
    },
    {
      id: 'titles',
      label: 'Títulos',
      icon: <Type className="w-3 h-3 text-amber-400" />,
      color: 'amber',
    },
    {
      id: 'overlays',
      label: 'Overlays',
      icon: <Layers className="w-3 h-3 text-[#22D3EE]" />,
      color: 'cyan',
    },
    {
      id: 'broll',
      label: 'B-roll',
      icon: <Film className="w-3 h-3 text-pink-400" />,
      color: 'pink',
    },
    {
      id: 'music',
      label: 'Música',
      icon: <Music className="w-3 h-3 text-blue-400" />,
      color: 'blue',
    },
  ]

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
            {project?.title || 'Editor de Vídeo'}
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] font-semibold">
            9:16
          </span>
          {mediaName && (
            <span className="text-[10px] text-[#9494A8] truncate max-w-[180px] hidden sm:inline">
              · {mediaName}
            </span>
          )}
        </div>

        {/* Center: Undo/Redo & Save */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndoEdl}
            disabled={undoStack.current.length === 0}
            className="h-8 px-2 text-[#9494A8] hover:text-white disabled:opacity-30"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedoEdl}
            disabled={redoStack.current.length === 0}
            className="h-8 px-2 text-[#9494A8] hover:text-white disabled:opacity-30"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualSave}
            className="h-8 px-2.5 text-xs text-white hover:bg-white/10 gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-[#22D3EE]" /> Salvar
          </Button>
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTakeModalOpen(true)}
            className="h-8 text-xs border-white/10 text-[#9494A8] hover:text-white hover:bg-white/5 gap-1.5"
            title="Abrir take da Gravadora"
          >
            <Camera className="w-3.5 h-3.5" /> Take
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setExportProgress((p) => ({ ...p, phase: p.phase === 'idle' ? 'idle' : p.phase }))
            }
            className="h-8 bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-white text-xs font-semibold gap-1.5 shadow-md shadow-[#7C5CFC]/30"
            onClickCapture={(e) => {
              e.preventDefault()
              handleStartExport()
            }}
            title={!supportsExport ? 'Exportação não suportada neste navegador' : 'Exportar vídeo'}
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        {/* CENTER PREVIEW */}
        <div className="lg:col-span-8 xl:col-span-9 bg-[#07070A] flex flex-col items-center justify-center p-3 relative overflow-hidden">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center h-[78%] aspect-[9/16]">
            <video
              ref={playerVideoRef}
              src={mediaUrl}
              className="w-full h-full object-cover select-none"
              style={{ filter: videoFilterCss || undefined }}
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedData}
              onTimeUpdate={handleTimeUpdate}
              onSeeked={handleSeekedNextSegment}
              onEnded={() => {
                setIsPlaying(false)
                setPlayerResultTime(resultDuration)
              }}
              onError={handleVideoError}
            />
            {/* Vinheta (overlay) — quando ajuste > 0 */}
            {adjustments.vignette > 0 && (
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  background: `radial-gradient(ellipse at center, transparent ${100 - adjustments.vignette}%, rgba(0,0,0,${adjustments.vignette / 100}) 100%)`,
                }}
              />
            )}
            {/* readyState badge */}
            <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-emerald-300">
                readyState {playerVideoRef.current?.readyState ?? 0}
              </span>
            </div>

            {/* Active subtitle */}
            {activeSubtitle && (
              <div className="absolute bottom-12 left-6 right-6 text-center select-none pointer-events-none">
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

            {/* Center play overlay */}
            {!isPlaying && (
              <button
                onClick={handleTogglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#7C5CFC]/90 hover:bg-[#7C5CFC] text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition-transform hover:scale-110 z-30"
              >
                <Play className="w-6 h-6 fill-current ml-1" />
              </button>
            )}
          </div>

          {/* Scrubber / transport controls */}
          <div className="w-full max-w-xl mt-2 px-4 py-2 rounded-xl bg-[#14141C]/80 backdrop-blur-md border border-white/5 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRestart}
                className="p-1.5 rounded-lg text-[#9494A8] hover:text-white"
                title="Voltar ao início"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={handleTogglePlay}
                className="p-1.5 rounded-lg text-white bg-[#7C5CFC] hover:bg-[#6A48E0]"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={handleSkipBack}
                className="p-1.5 rounded-lg text-[#9494A8] hover:text-white"
                title="Retroceder 5s"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSkipForward}
                className="p-1.5 rounded-lg text-[#9494A8] hover:text-white"
                title="Avançar 5s"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrub slider (tempo resultante) */}
            <div className="flex-1 flex items-center gap-2">
              <Slider
                value={[playerResultTime]}
                min={0}
                max={Math.max(0.1, resultDuration)}
                step={0.05}
                onValueChange={(val) => handleScrub(val[0])}
                className="flex-1"
              />
            </div>

            <div className="font-mono text-xs text-white whitespace-nowrap">
              {fmtTime(playerResultTime)} / {fmtTime(resultDuration)}
            </div>

            {/* Volume (reflete o AudioPanel do inspetor) */}
            <div className="flex items-center gap-1.5 w-28">
              <button
                onClick={() => {
                  const next = !editorAudio.muted
                  setEditorAudio((a) => {
                    const updated = { ...a, muted: next }
                    saveEditorState(id || 'temp', 'audio', updated)
                    return updated
                  })
                }}
                className="text-[#9494A8] hover:text-white"
              >
                {editorAudio.muted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <Slider
                value={[editorAudio.muted ? 0 : editorAudio.voiceVolume]}
                min={0}
                max={200}
                step={1}
                onValueChange={(val) => {
                  setEditorAudio((a) => {
                    const updated = { ...a, voiceVolume: val[0], muted: false }
                    saveEditorState(id || 'temp', 'audio', updated)
                    return updated
                  })
                }}
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-[#9494A8]" />
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="bg-[#1C1C27] border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white focus:outline-none"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}x
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR — Inspetor profissional com 8 abas */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[#14141C] border-l border-white/10 flex flex-col h-full overflow-hidden">
          <Tabs defaultValue="captions" className="flex-1 flex flex-col min-h-0">
            <div className="px-2 pt-2 border-b border-white/5 shrink-0">
              <TabsList className="w-full bg-[#1C1C27] grid grid-cols-4 gap-1 p-1 rounded-xl">
                <TabsTrigger
                  value="captions"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Type className="w-3 h-3 mr-0.5" /> Legendas
                </TabsTrigger>
                <TabsTrigger
                  value="titles"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Type className="w-3 h-3 mr-0.5" /> Títulos
                </TabsTrigger>
                <TabsTrigger
                  value="background"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Palette className="w-3 h-3 mr-0.5" /> Fundo
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Film className="w-3 h-3 mr-0.5" /> Mídias
                </TabsTrigger>
                <TabsTrigger
                  value="adjustments"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Gauge className="w-3 h-3 mr-0.5" /> Ajustes
                </TabsTrigger>
                <TabsTrigger
                  value="effects"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Sparkles className="w-3 h-3 mr-0.5" /> Efeitos
                </TabsTrigger>
                <TabsTrigger
                  value="audio"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Music className="w-3 h-3 mr-0.5" /> Áudio
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="text-[10px] font-semibold data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white"
                >
                  <Sparkles className="w-3 h-3 mr-0.5" /> IA
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="captions"
              className="flex-1 overflow-y-auto p-3 space-y-3 focus:outline-none"
            >
              <CaptionPanel
                projectId={id || 'temp'}
                currentTime={currentTime}
                duration={safeDuration}
                onSeek={handleSeek}
              />
            </TabsContent>

            <TabsContent value="titles" className="flex-1 overflow-y-auto focus:outline-none">
              <div className="h-full overflow-y-auto">
                <TitlePanel />
              </div>
            </TabsContent>

            <TabsContent value="background" className="flex-1 overflow-y-auto focus:outline-none">
              <div className="h-full overflow-y-auto">
                <BackgroundPanel />
              </div>
            </TabsContent>

            <TabsContent
              value="media"
              className="flex-1 overflow-y-auto p-3 space-y-3 focus:outline-none"
            >
              <MediaPanel projectId={id || 'temp'} />
            </TabsContent>

            <TabsContent
              value="adjustments"
              className="flex-1 overflow-y-auto p-3 space-y-3 focus:outline-none"
            >
              <AdjustmentsPanel
                projectId={id || 'temp'}
                adjustments={adjustments}
                onChange={setAdjustments}
              />
            </TabsContent>

            <TabsContent
              value="effects"
              className="flex-1 overflow-y-auto p-3 space-y-3 focus:outline-none"
            >
              <EffectsPanel projectId={id || 'temp'} effects={effects} onChange={setEffects} />
            </TabsContent>

            <TabsContent
              value="audio"
              className="flex-1 overflow-y-auto p-3 space-y-3 focus:outline-none"
            >
              <AudioPanel
                projectId={id || 'temp'}
                audio={editorAudio}
                onChange={setEditorAudio}
                videoBlob={mediaBlob}
                currentTime={currentTime}
                duration={safeDuration}
              />
            </TabsContent>

            {/* TAB: IA — todos desabilitados (Integração pendente) */}
            <TabsContent
              value="ai"
              className="flex-1 overflow-y-auto p-4 space-y-3 focus:outline-none"
            >
              <div className="p-3 rounded-xl bg-[#1C1C27] border border-white/5">
                <p className="text-xs text-[#9494A8] leading-relaxed">
                  As ações de IA abaixo exigem integração com serviços externos de processamento de
                  vídeo/áudio. Nenhuma integração está ativa, portanto os botões ficam desabilitados
                  para evitar simulação de sucesso.
                </p>
              </div>

              <AiDisabledButton
                icon={<Type className="w-4 h-4" />}
                title="Gerar Legendas"
                desc="Transcrição automática de fala"
                pendingReason="Integração pendente"
              />
              <AiDisabledButton
                icon={<Scissors className="w-4 h-4" />}
                title="Cortar Pausas"
                desc="Remove silêncios e gaguejos"
                pendingReason="Integração pendente"
              />
              <AiDisabledButton
                icon={<Music className="w-4 h-4" />}
                title="Adicionar Trilha"
                desc="Trilha sonora com ducking"
                pendingReason="Integração pendente"
              />
              <AiDisabledButton
                icon={<Film className="w-4 h-4" />}
                title="Preencher com B-roll"
                desc="Mídias contextuais nos vazios"
                pendingReason="Integração pendente"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 3. TIMELINE NÃO DESTRUTIVA (EditTimeline) */}
      <EditTimeline
        state={timelineState}
        onChange={handleTimelineChange}
        rawBlob={mediaBlob}
        rawVideoUrl={mediaUrl}
        rawDuration={safeDuration}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        markDirty={() => setHasUnsavedChanges(true)}
        onUndo={handleUndoEdl}
        onRedo={handleRedoEdl}
        onSplit={handleSplitAtCursor}
        onDeleteSegment={handleDeleteSegmentAtCursor}
        onRestoreExcluded={handleRestoreExcluded}
      />

      {/* 4. MULTI-TRACK TIMELINE */}
      <div className="h-40 border-t border-white/10 bg-[#14141C] flex flex-col shrink-0">
        <div className="h-9 px-4 border-b border-white/5 flex items-center justify-between text-xs bg-[#171722]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSplitAtCursor}
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5 text-[#22D3EE]" /> Dividir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteSegmentAtCursor}
              className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir trecho
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestoreExcluded}
              className="h-7 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar
            </Button>
          </div>
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
            <span className="text-[10px] text-[#9494A8] ml-2">
              Resultante: <span className="text-white font-mono">{fmtTime(resultDuration)}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-2 relative select-none">
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none shadow-[0_0_8px_red]"
            style={{ left: `${currentTime * timelineZoom + 96}px` }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1 shadow" />
          </div>

          <div className="space-y-1.5 min-w-[800px]">
            {/* Segmentos efetivos na pista de vídeo */}
            <div className="flex items-center h-9">
              <span className="w-24 text-[10px] font-bold text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3 text-white" /> Vídeo
              </span>
              <div className="flex-1 h-8 bg-[#1C1C27] rounded-lg relative overflow-hidden border border-white/5">
                {effectiveSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="absolute top-1 bottom-1 rounded-lg px-2 text-[10px] font-semibold truncate flex items-center bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-white/10 cursor-pointer"
                    style={{
                      left: `${seg.start * timelineZoom}px`,
                      width: `${Math.max(30, (seg.end - seg.start) * timelineZoom)}px`,
                    }}
                    title={`${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s`}
                  >
                    {seg.end - seg.start >= 2 ? `Segmento ${idx + 1}` : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Demais pistas (placeholder de faixas vazias — não simulam conteúdo) */}
            {trackLanes.slice(1).map((lane) => (
              <div key={lane.id} className="flex items-center h-7">
                <span className="w-24 text-[10px] font-bold text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
                  {lane.icon} {lane.label}
                </span>
                <div className="flex-1 h-6 bg-[#1C1C27] rounded-lg relative overflow-hidden border border-white/5">
                  {lane.id === 'subtitles' &&
                    subtitles.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          handleSeek(sub.startTime)
                          setSelectedSubtitleId(sub.id)
                        }}
                        className={`absolute top-0.5 bottom-0.5 rounded px-1.5 text-[9px] font-bold truncate flex items-center cursor-pointer ${
                          selectedSubtitleId === sub.id
                            ? 'bg-[#7C5CFC] text-white'
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
            ))}
          </div>
        </div>
      </div>

      {/* Export modal */}
      <Dialog open={exportProgress.phase !== 'idle'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 space-y-4 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC]">
                <Download className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Exportar Vídeo</DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8]">
                  Renderização real em 1080×1920 (Canvas + MediaRecorder). Duração resultante:{' '}
                  {fmtTime(resultDuration)}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!supportsExport && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">
                Seu navegador não suporta MediaRecorder. Use Chrome ou Edge para exportar vídeos.
              </p>
            </div>
          )}

          {(exportProgress.phase === 'rendering' ||
            exportProgress.phase === 'preparing' ||
            exportProgress.phase === 'loading-video' ||
            exportProgress.phase === 'finalizing') && (
            <div className="py-6 space-y-3 text-center">
              <div className="w-full bg-[#1C1C27] h-3 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] h-full transition-all duration-200"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              <p className="text-xs text-white font-medium flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {exportProgress.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelExport}
                className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </Button>
            </div>
          )}

          {exportProgress.phase === 'error' && (
            <div className="py-4 space-y-3">
              <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-200">A exportação falhou.</p>
                  <p className="text-[10px] text-red-300/70 mt-1">
                    Detalhes: {exportProgress.error}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportProgress({ phase: 'idle', percent: 0, message: '' })}
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          )}

          {exportProgress.phase === 'cancelled' && (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs text-[#9494A8]">
                Exportação cancelada. Nenhum arquivo foi gerado.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportProgress({ phase: 'idle', percent: 0, message: '' })}
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          )}

          {exportProgress.phase === 'done' && exportResult && (
            <div className="py-4 space-y-3">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-200">Exportação concluída!</p>
                  <p className="text-[10px] text-emerald-300/70 mt-0.5 truncate">
                    {exportResult.filename}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = exportResult.url
                    a.download = exportResult.filename
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                  className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar novamente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportProgress({ phase: 'idle', percent: 0, message: '' })}
                  className="text-xs"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OpenTakeModal
        open={isTakeModalOpen}
        onClose={() => setIsTakeModalOpen(false)}
        onSelect={handleOpenTake}
        currentProjectId={id}
      />
    </div>
  )
}

/* ── Botão de IA desabilitado com "Integração pendente" ─────────────────── */
function AiDisabledButton({
  icon,
  title,
  desc,
  pendingReason,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  pendingReason: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full text-left p-3 rounded-xl bg-[#1C1C27] border border-white/5 flex items-center justify-between opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-white/5 text-[#9494A8]">{icon}</span>
            <div>
              <h4 className="text-xs font-bold text-white">{title}</h4>
              <p className="text-[10px] text-[#9494A8]">{desc}</p>
              <p className="text-[10px] text-amber-400 mt-0.5">{pendingReason}</p>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">Integração pendente — indisponível</TooltipContent>
    </Tooltip>
  )
}
