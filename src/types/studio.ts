export type ProjectType = 'video' | 'reel' | 'carousel' | 'post' | 'youtube'

export interface SubtitleBlock {
  id: string
  startTime: number // in seconds
  endTime: number
  text: string
  highlightWordIndex?: number
  position?: { x: number; y: number }
  style?: {
    fontSize: number
    color: string
    bgColor?: string
    fontFamily: string
    shadow: boolean
    animation: 'none' | 'fade' | 'slide' | 'bounce' | 'typewriter' | 'pop'
  }
}

export interface TimelineClip {
  id: string
  track: 'video' | 'insert' | 'text' | 'audio'
  name: string
  startTime: number // position on timeline
  duration: number
  sourceUrl?: string
  mediaType: 'video' | 'audio' | 'image' | 'text' | 'sticker' | 'shape'
  volume?: number
  fadeIn?: number
  fadeOut?: number
  ducking?: boolean
  filter?: string
  transitionIn?: 'none' | 'dissolve' | 'slide' | 'zoom' | 'wipe' | 'glitch'
  transitionDuration?: number
  // Visual placement
  x?: number
  y?: number
  scale?: number
  rotation?: number
  opacity?: number
  content?: string // for text or sticker type
  color?: string
}

export interface Project {
  id: string
  title: string
  type: ProjectType
  createdAt: string
  updatedAt: string
  duration: number // seconds
  thumbnail: string
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5'
  resolution?: '1080p' | '4K' | '720p'
  clips: TimelineClip[]
  subtitles: SubtitleBlock[]
  status: 'draft' | 'ready' | 'scheduled' | 'published'
  scriptText?: string
  bRollSuggestions?: string[]
  tags?: string[]
}

export interface MediaItem {
  id: string
  title: string
  type: 'video' | 'image' | 'audio'
  url: string
  duration?: number
  size?: string
  createdAt: string
  tags: string[]
  category: 'recording' | 'b-roll' | 'music' | 'sfx' | 'upload' | 'template'
}

export interface CarouselSlide {
  id: string
  title: string
  subtitle?: string
  bodyText: string
  bgType: 'color' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgImage?: string
  elements: {
    id: string
    type: 'text' | 'arrow' | 'badge' | 'avatar' | 'shape' | 'step'
    content: string
    x: number
    y: number
    color?: string
    size?: number
  }[]
  layoutTemplate?: string
}

export interface CarouselProject {
  id: string
  title: string
  aspectRatio: '1:1' | '4:5'
  slides: CarouselSlide[]
  createdAt: string
  updatedAt: string
  thumbnail: string
}

export interface StaticPostProject {
  id: string
  title: string
  aspectRatio: '1:1' | '4:5' | '9:16'
  bgType: 'color' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgImage?: string
  blurAmount: number
  headline: string
  subtitle: string
  authorName: string
  authorHandle: string
  authorAvatar: string
  badgeText: string
  watermark: boolean
  filter: 'none' | 'cinematic' | 'vintage' | 'neon' | 'matte' | 'bw'
  createdAt: string
  updatedAt: string
  thumbnail: string
}

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube'

export interface ScheduledPost {
  id: string
  projectId?: string
  title: string
  mediaUrl: string
  mediaType: 'video' | 'carousel' | 'post'
  platforms: SocialPlatform[]
  scheduledDate: string // ISO string
  caption: string
  hashtags: string[]
  customCoverUrl?: string
  status: 'scheduled' | 'published' | 'error'
  errorMessage?: string
  analyticsEstimate?: {
    views: number
    likes: number
    engagementRate: string
  }
}

export interface AISuggestion {
  id: string
  type: 'subtitles' | 'cuts' | 'transitions' | 'clips' | 'music' | 'broll' | 'review'
  title: string
  description: string
  applied: boolean
  payload: any
  timestamp: string
}

/* ===========================================================================
   LUMEN Studio — Núcleo do Estúdio de Gravação (FASE 1)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/** Layout do palco: câmera em cima + parte inferior reservada, ou câmera cheia. */
export type StageLayout = 'split' | 'full'

/** Modo da parte inferior do layout dividido (FASE 3 usará mais modos). */
export type LowerPanelMode = 'none' | 'arts' | 'reaction' | 'board' | 'broll'

/** Guias de zona segura do canvas (apenas preview, não entram na exportação). */
export interface SafeGuides {
  enabled: boolean
  /** Linha horizontal a ~85% da altura (área de botões das redes sociais). */
  buttons: boolean
  /** Linha horizontal a ~92% da altura (área de legenda das redes sociais). */
  caption: boolean
}

/** Configuração do palco/canvas 1080×1920. */
export interface StageConfig {
  layout: StageLayout
  lowerPanelMode: LowerPanelMode
  /** Enquadramento cover: 0 a 1, passo 0.01, padrão 1. */
  cameraCover: number
  guides: SafeGuides
  previewHidden: boolean
  focusMode: boolean
}

/** Cadeia de captação de áudio. */
export interface AudioConfig {
  inputDeviceId: string
  /** Redução de ruído (noiseSuppression) — padrão LIGADO. */
  noiseSuppression: boolean
  /** Ganho automático (autoGainControl) — padrão DESLIGADO. */
  autoGainControl: boolean
  /** Cancelamento de eco (echoCancellation) — padrão LIGADO. */
  echoCancellation: boolean
  /** Ganho manual: 0 a 2 (0%–200%), passo 0.05, padrão 1. Aplicado via GainNode. */
  manualGain: number
}

/** Take de gravação salvo na sessão do Estúdio. */
export interface RecordingTake {
  id: string
  url: string
  duration: number
  timeString: string
  createdAt: string
  /** Manifesto de recuperação mínimo (JSON versionado). */
  recoveryManifest?: {
    version: number
    layout: StageLayout
    cameraCover: number
    audio: Pick<
      AudioConfig,
      'noiseSuppression' | 'autoGainControl' | 'echoCancellation' | 'manualGain'
    >
    scriptText?: string
  }
}
