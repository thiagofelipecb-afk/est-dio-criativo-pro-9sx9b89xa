import React, { useState, useEffect, useRef, useCallback } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { StageLayout, LowerPanelMode, AudioConfig, RecordingTake } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   LUMEN Studio — Núcleo do Estúdio de Gravação (FASE 1)
   Canvas vertical 1080×1920 (9:16), layout Dividido/Câmera cheia, atalho T,
   enquadramento cover, modo foco (F), ocultar preview, guias de Botões/Legenda,
   cadeia de áudio completa (Web Audio API) + medidor de nível + devicechange.
   ─────────────────────────────────────────────────────────────────────────── */

const CANVAS_W = 1080
const CANVAS_H = 1920

const DEFAULT_AUDIO: AudioConfig = {
  inputDeviceId: '',
  noiseSuppression: true,
  autoGainControl: false,
  echoCancellation: true,
  manualGain: 1,
}

export default function Gravadora() {
  const navigate = useNavigate()
  const { addMediaItem, createProject, teleprompterScript, setTeleprompterScript } = useStudio()

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

  /* ── Stage config (canvas 9:16) ────────────────────────────────────────── */
  const [stageLayout, setStageLayout] = useState<StageLayout>('split')
  const [lowerPanelMode, setLowerPanelMode] = useState<LowerPanelMode>('none')
  const [cameraCover, setCameraCover] = useState(1) // 0–1, passo 0.01, padrão 1
  const [showGrid, setShowGrid] = useState(true) // grade de terços (legado)
  const [showSafeGuides, setShowSafeGuides] = useState(true) // guias Botões/Legenda
  const [previewHidden, setPreviewHidden] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  /* ── Audio config + Web Audio pipeline ─────────────────────────────────── */
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(DEFAULT_AUDIO)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const [audioLevel, setAudioLevel] = useState(0) // 0..1 para o medidor
  const rafLevelRef = useRef<number | null>(null)

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
      setStream(userStream)
      setHasPermission(true)
      setPermissionErrorModal(false)

      if (videoRef.current) {
        videoRef.current.srcObject = userStream
      }

      // Configura o pipeline Web Audio (ganho manual + medidor)
      setupAudioPipeline(userStream)

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
      setHasPermission(false)
      setPermissionErrorModal(true)
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
      toast.warning('Dispositivo desconectado durante a gravação. Pausando por segurança.')
    } else {
      toast.warning('Dispositivo de câmera/microfone desconectado.')
    }
  }, [])

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

  /* Troca de dispositivo reinicia a câmera se já houver permissão. */
  useEffect(() => {
    if (hasPermission === true) {
      startCamera()
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
      if (isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 't') {
        e.preventDefault()
        setStageLayout((prev) => (prev === 'split' ? 'full' : 'split'))
      } else if (key === 'f') {
        e.preventDefault()
        setFocusMode((prev) => !prev)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ═══════════════════════════════════════════════════════════════════════
     Gravação: MediaRecorder real quando há stream; fallback simulado quando
     não há câmera/mic.
     ═══════════════════════════════════════════════════════════════════════ */
  const handleToggleRecord = () => {
    if (!isRecording) {
      startRecording()
    } else {
      stopRecording()
    }
  }

  const startRecording = () => {
    setRecordedSeconds(0)
    chunksRef.current = []

    // Tenta MediaRecorder real sobre o stream ativo
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
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
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
    toast.info('Gravação (simulada) iniciada! Roteiro rolando.')
  }

  const stopRecording = () => {
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
  }

  const finalizeTake = () => {
    const duration = Math.max(1, recordedSeconds)
    const timeString = formatTimer(duration)

    let url = 'https://img.usecurling.com/p/1080/1920?q=podcaster+talking+studio+light&color=purple'
    let blob: Blob | undefined
    if (chunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
      blob = new Blob(chunksRef.current, { type: mimeType })
      url = URL.createObjectURL(blob)
      chunksRef.current = []
    }

    const newClip: RecordingTake = {
      id: 'clip-' + Date.now(),
      url,
      duration,
      timeString,
      createdAt: new Date().toISOString(),
      recoveryManifest: {
        version: 1,
        layout: stageLayout,
        cameraCover,
        audio: {
          noiseSuppression: audioConfig.noiseSuppression,
          autoGainControl: audioConfig.autoGainControl,
          echoCancellation: audioConfig.echoCancellation,
          manualGain: audioConfig.manualGain,
        },
        scriptText: teleprompterScript,
      },
    }

    setRecordedClips((prev) => [newClip, ...prev])

    // Salva no StudioContext como projeto tipo 'reel' / aspectRatio '9:16'
    createProject({
      title: `Take Estúdio (${timeString})`,
      type: 'reel',
      aspectRatio: '9:16',
      resolution: '1080p',
      duration,
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

    toast.success(`Take gravado com sucesso (${timeString})! Salvo em Meus Projetos.`)
    setRecordedSeconds(0)
  }

  const handlePauseResume = () => {
    if (isPaused) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        try {
          mediaRecorderRef.current.resume()
        } catch {
          /* noop */
        }
      }
      setIsPaused(false)
      setIsPromptScrolling(true)
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.pause()
        } catch {
          /* noop */
        }
      }
      setIsPaused(true)
      setIsPromptScrolling(false)
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

  const handleSendToEditor = (clip: RecordingTake) => {
    // createProject já foi chamado em finalizeTake; aqui apenas navegamos para
    // o editor de um projeto novo vinculado a este take.
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

  /* ── Derivados para o preview ──────────────────────────────────────────── */
  const cameraFilter = `brightness(${brightness}%) contrast(${contrast}%) blur(${
    bgMode === 'blur' ? bgBlurAmount / 6 : 0
  }px) saturate(${100 + beautySmooth / 2}%)`

  // cover: o vídeo é object-cover naturalmente; cameraCover escala o conteúdo
  // de 1 (100%, preenche) até um zoom extra proporcional ao slider.
  const cameraScale = 1 + cameraCover // cover 1 → escala 2; cover 0 → escala 1
  // Proporção da área de câmera conforme o layout
  const cameraAreaFlex = stageLayout === 'full' ? '1' : '1.3' // câmera maior no split

  /* ═══════════════════════════════════════════════════════════════════════
     Render do canvas 9:16 com guias, layout dividido/cheio, etc.
     ═══════════════════════════════════════════════════════════════════════ */
  const renderCanvas = () => (
    <div
      className="relative bg-[#07070A] border border-white/10 overflow-hidden shadow-2xl rounded-xl"
      style={{
        aspectRatio: '9 / 16',
        width: '100%',
        maxHeight: focusMode ? '78vh' : '64vh',
        margin: '0 auto',
      }}
    >
      {/* Resolução de trabalho (indicador) */}
      <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-black/60 text-[9px] font-mono text-[#9494A8] border border-white/10">
        {CANVAS_W}×{CANVAS_H} · 9:16
      </div>

      {/* Layout dividido: câmera em cima, parte inferior reservada */}
      <div className="absolute inset-0 flex flex-col">
        {/* Área da câmera */}
        <div style={{ flex: cameraAreaFlex }} className="relative overflow-hidden bg-black">
          {previewHidden ? (
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
                  onClick={startCamera}
                  className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs"
                >
                  Solicitar Acesso à Webcam
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#0e0e15] via-[#14141C] to-[#07070A]">
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
                  onClick={startCamera}
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-bold text-xs px-5 py-2 rounded-xl gap-2"
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

        {/* Parte inferior reservada (split) */}
        {stageLayout === 'split' && (
          <div
            style={{ flex: '0.7' }}
            className="relative bg-[#0B0B10] border-t border-white/10 flex items-center justify-center"
          >
            {lowerPanelMode === 'none' ? (
              <div className="text-center px-4">
                <p className="text-[10px] text-[#9494A8]/70 uppercase tracking-wider">
                  Parte inferior reservada
                </p>
                <p className="text-[10px] text-[#9494A8]/50 mt-0.5">
                  Artes · Reação · Quadro · B-roll (FASE 3)
                </p>
              </div>
            ) : (
              <div className="text-center px-4">
                <p className="text-[10px] text-[#22D3EE] uppercase tracking-wider font-semibold">
                  {lowerPanelMode === 'arts'
                    ? 'Artes'
                    : lowerPanelMode === 'reaction'
                      ? 'Vídeo de reação'
                      : lowerPanelMode === 'board'
                        ? 'Quadro'
                        : 'B-roll'}
                </p>
                <p className="text-[10px] text-[#9494A8]/50 mt-0.5">Disponível na FASE 3</p>
              </div>
            )}
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

      {/* Barra flutuante de gravação (não aparece no modo foco — lá é separada) */}
      {!focusMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/15 p-1.5 rounded-2xl shadow-2xl z-30">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg ${showGrid ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]' : 'text-[#9494A8]'}`}
            title="Grade de Terços"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTeleprompter(!showTeleprompter)}
            className={`p-1.5 rounded-lg ${showTeleprompter ? 'bg-[#22D3EE]/20 text-[#22D3EE]' : 'text-[#9494A8]'}`}
            title="Teleprompter na Tela"
          >
            <ScrollText className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleRecord}
            className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
              isRecording
                ? 'w-12 h-12 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/50 scale-105'
                : 'w-12 h-12 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
            }`}
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
              className="p-1.5 rounded-lg text-white hover:bg-white/10"
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
              className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
                isRecording
                  ? 'w-12 h-12 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/50 scale-105'
                  : 'w-12 h-12 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
              }`}
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
              className="border-white/10 bg-[#14141C] text-xs text-white hover:bg-white/5 gap-1.5"
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
            Capture takes verticais 9:16 com teleprompter, cadeia de áudio e composição de palco.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileQR(true)}
            className="border-white/10 bg-[#14141C] text-xs text-white hover:bg-white/5 gap-1.5"
          >
            <QrCode className="w-4 h-4 text-[#22D3EE]" />
            Câmera do Celular
          </Button>
          <Button
            size="sm"
            onClick={() => setFocusMode(true)}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold text-white gap-1.5 shadow-lg shadow-[#7C5CFC]/25"
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
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold text-white gap-1.5 shadow-lg shadow-[#7C5CFC]/25"
          >
            <Sparkles className="w-4 h-4" /> Editar Último Take
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[500px]">
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
              <span className="text-[11px] text-[#9494A8]">
                Salvos automaticamente em Meus Projetos
              </span>
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
                className={`p-2 rounded-xl border text-left transition-all ${
                  stageLayout === 'split'
                    ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                    : 'border-white/10 bg-[#1C1C27] hover:border-white/20'
                }`}
                title="Layout Dividido (T)"
              >
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
                className={`p-2 rounded-xl border text-left transition-all ${
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewHidden(!previewHidden)}
                className="border-white/10 bg-[#1C1C27] text-[11px] text-white hover:bg-white/5 gap-1.5 justify-start"
                title={previewHidden ? 'Mostrar preview' : 'Ocultar preview'}
              >
                {previewHidden ? (
                  <Eye className="w-4 h-4 text-[#22D3EE]" />
                ) : (
                  <EyeOff className="w-4 h-4 text-[#9494A8]" />
                )}
                {previewHidden ? 'Mostrar preview' : 'Ocultar preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusMode(true)}
                className="border-white/10 bg-[#1C1C27] text-[11px] text-white hover:bg-white/5 gap-1.5 justify-start"
                title="Modo foco (F)"
              >
                <Maximize2 className="w-4 h-4 text-[#7C5CFC]" /> Modo foco (F)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSafeGuides(!showSafeGuides)}
                className={`border-white/10 bg-[#1C1C27] text-[11px] gap-1.5 justify-start ${
                  showSafeGuides ? 'text-[#22D3EE]' : 'text-[#9494A8] hover:text-white'
                } hover:bg-white/5`}
                title="Guias de segurança (Botões/Legenda)"
              >
                <ShieldCheck className="w-4 h-4" /> Guias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className={`border-white/10 bg-[#1C1C27] text-[11px] gap-1.5 justify-start ${
                  showGrid ? 'text-[#7C5CFC]' : 'text-[#9494A8] hover:text-white'
                } hover:bg-white/5`}
                title="Grade de Terços"
              >
                <Grid className="w-4 h-4" /> Terços
              </Button>
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
                      className={`py-1.5 rounded-lg font-medium text-[10px] transition-colors ${
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
                className="text-[10px] text-[#9494A8] hover:text-white flex items-center gap-1"
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
                  onChange={(e) => {
                    setSelectedMic(e.target.value)
                    setAudioConfig((prev) => ({ ...prev, inputDeviceId: e.target.value }))
                  }}
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
                onChange={(v) => setAudioConfig((prev) => ({ ...prev, noiseSuppression: v }))}
              />
              <AudioToggle
                label="Ganho automático"
                description="autoGainControl — pode elevar ruído ambiente"
                checked={audioConfig.autoGainControl}
                onChange={(v) => setAudioConfig((prev) => ({ ...prev, autoGainControl: v }))}
              />
              <AudioToggle
                label="Cancelamento de eco"
                description="echoCancellation"
                checked={audioConfig.echoCancellation}
                onChange={(v) => setAudioConfig((prev) => ({ ...prev, echoCancellation: v }))}
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
                onValueChange={(v) =>
                  setAudioConfig((prev) => ({ ...prev, manualGain: v[0] / 100 }))
                }
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

          {/* 5. Teleprompter (legado) */}
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
              onClick={() => setPermissionErrorModal(false)}
              className="text-xs text-[#9494A8] hover:text-white"
            >
              Usar prévia simulada
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPermissionErrorModal(false)
                startCamera()
              }}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold"
            >
              Tentar novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: QR Celular (legado) */}
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
