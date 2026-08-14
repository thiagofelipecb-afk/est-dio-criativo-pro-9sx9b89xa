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
