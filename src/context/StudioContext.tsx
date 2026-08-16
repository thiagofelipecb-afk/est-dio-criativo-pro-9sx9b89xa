import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  Project,
  MediaItem,
  ScheduledPost,
  CarouselProject,
  StaticPostProject,
  AISuggestion,
  ScriptBlock,
  BackgroundConfig,
  TitleConfig,
  ProjectSnapshot,
  TimelineState,
  RawVideoRecord,
  StageConfig,
  AudioConfig,
  TeleprompterMode,
  TeleprompterTextColor,
} from '@/types/studio'

/** Defaults FASE 4 — Fundo. */
const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  type: 'none',
  blurAmount: 12,
  presetColor: '#1E3A5F',
  imageDataUrl: undefined,
  imageName: undefined,
  segmentationEnabled: false,
}

/** Defaults FASE 4 — Título. */
const DEFAULT_TITLE_CONFIG: TitleConfig = {
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
}

/** Defaults LUMEN — Palco/canvas 1080×1920 (persistido em lumen_gravadora_stage). */
const DEFAULT_STAGE_CONFIG: StageConfig = {
  layout: 'full',
  lowerPanelMode: 'none',
  cameraCover: 1,
  guides: { enabled: true, buttons: true, caption: true },
  previewHidden: false,
  focusMode: false,
  cameraScale: 1,
  showGuides: false,
  splitCameraRatio: 0.6,
  splitMediaType: 'image',
}

/** Config de Câmera/Filtros técnicos */
export interface CameraConfig {
  brightness: number
  contrast: number
  beautySmooth: number
}

const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  brightness: 100,
  contrast: 100,
  beautySmooth: 40,
}

/** Config do Teleprompter */
export interface PrompterConfig {
  fontSize: number
  speed: number
  color: TeleprompterTextColor
  bgOpacity: number
  mirror: boolean
  mode: TeleprompterMode
  lensOffset: number
  countdown: 3 | 5 | 10
  reading: boolean
  isScrolling: boolean
}

const DEFAULT_PROMPTER_CONFIG: PrompterConfig = {
  fontSize: 48,
  speed: 3,
  color: 'white',
  bgOpacity: 50,
  mirror: false,
  mode: 'blocks',
  lensOffset: 0,
  countdown: 3,
  reading: false,
  isScrolling: false,
}

/** Defaults da cadeia de captação de áudio da Gravadora. */
const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  inputDeviceId: '',
  noiseSuppression: true,
  autoGainControl: false,
  echoCancellation: true,
  manualGain: 1,
}

interface StudioContextType {
  projects: Project[]
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  createProject: (project: Partial<Project>) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => Project
  getProjectById: (id: string) => Project | undefined

  // Media Library
  mediaLibrary: MediaItem[]
  addMediaItem: (item: Omit<MediaItem, 'id' | 'createdAt'>) => MediaItem
  deleteMediaItem: (id: string) => void

  // Carousels
  carousels: CarouselProject[]
  saveCarousel: (carousel: CarouselProject) => void
  getCarouselById: (id: string) => CarouselProject | undefined

  // Static Posts
  staticPosts: StaticPostProject[]
  saveStaticPost: (post: StaticPostProject) => void
  getStaticPostById: (id: string) => StaticPostProject | undefined

  // Schedule
  scheduledPosts: ScheduledPost[]
  schedulePost: (post: Omit<ScheduledPost, 'id'>) => ScheduledPost
  updateScheduledPost: (id: string, updates: Partial<ScheduledPost>) => void
  deleteScheduledPost: (id: string) => void
  publishNowSimulated: (id: string) => Promise<boolean>

  // Global Creation modal trigger
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void

  // Teleprompter script temporary store
  teleprompterScript: string
  setTeleprompterScript: (text: string) => void

  // FASE 2 — Roteiro por blocos na Gravadora
  scriptBlocks: ScriptBlock[]
  setScriptBlocks: (blocks: ScriptBlock[]) => void
  gravadoraScript: string
  setGravadoraScript: (text: string) => void

  // Estado compartilhado da Gravadora (HUD / modo foco).
  activeBlockIndex: number
  setActiveBlockIndex: (i: number) => void
  isRecording: boolean
  setIsRecording: (b: boolean) => void
  isFocusMode: boolean
  setIsFocusMode: (b: boolean) => void

  // Câmera & Filtros
  cameraConfig: CameraConfig
  updateCameraConfig: (updates: Partial<CameraConfig>) => void

  // Teleprompter Config & State
  prompterConfig: PrompterConfig
  updatePrompterConfig: (updates: Partial<PrompterConfig>) => void

  // AI History / suggestions
  appliedAiSuggestions: AISuggestion[]
  addAiSuggestion: (suggestion: AISuggestion) => void
  revertAiSuggestion: (id: string) => void

  // Brand OS
  brandOS: BrandOSContext | null
  setBrandOS: (b: BrandOSContext | null) => void
  updateBrandOS: (updates: Partial<BrandOSContext>) => void

  // Fundo e Título
  backgroundConfig: BackgroundConfig
  setBackgroundConfig: (cfg: BackgroundConfig) => void
  titleConfig: TitleConfig
  setTitleConfig: (cfg: TitleConfig) => void

  // Configuração do palco/canvas
  stageConfig: StageConfig
  updateStageConfig: (updates: Partial<StageConfig>) => void

  // Persistência da preferência de dispositivo
  saveDevicePreference: (cameraId: string, micId: string) => void
  loadDevicePreference: () => { cameraId: string; micId: string }

  // Cadeia de áudio da Gravadora
  audioConfig: AudioConfig
  updateAudioConfig: (updates: Partial<AudioConfig>) => void

  // Preservação, recuperação e snapshot do projeto
  saveRawVideo: (projectId: string, blob: Blob, duration: number, mimeType: string) => Promise<void>
  loadRawVideo: (projectId: string) => Promise<Blob | null>
  clearRawVideo: (projectId: string) => Promise<void>
  saveProjectSnapshot: (snapshot: ProjectSnapshot) => void
  loadProjectSnapshot: (projectId: string) => ProjectSnapshot | null
  clearProjectSnapshot: (projectId: string) => void
  recoverInterruptedRecording: (projectId: string) => Promise<RawVideoRecord | null>
  getTimelineState: (projectId: string, rawDuration: number) => TimelineState
  setTimelineState: (projectId: string, state: TimelineState) => void
}

export interface BrandOSContext {
  brandName: string
  niche: string
  promise: string
  voice: string
  audience: string
  contentPillars: string[]
  editorialLine: string
  activeVersion: number
  generatedAt: string | null
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    title: '5 Hábitos de Criadores de Alto Impacto',
    type: 'reel',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    duration: 48,
    thumbnail: 'https://img.usecurling.com/p/600/1066?q=content+creator+studio&color=purple',
    aspectRatio: '9:16',
    resolution: '1080p',
    status: 'ready',
    scriptText:
      'Descubra agora os 5 hábitos diários que todo criador profissional usa para reter 80% da audiência.',
    clips: [
      {
        id: 'clip-1',
        track: 'video',
        name: 'Abertura Dinâmica',
        startTime: 0,
        duration: 14,
        sourceUrl:
          'https://img.usecurling.com/p/1080/1920?q=cinematic+podcaster+speaking&color=purple',
        mediaType: 'video',
        volume: 100,
        filter: 'cinematic',
      },
    ],
    subtitles: [],
  },
]

const DEFAULT_MEDIA: MediaItem[] = [
  {
    id: 'media-1',
    title: 'Abertura Vlog Estúdio 4K',
    type: 'video',
    url: 'https://img.usecurling.com/p/1080/1920?q=cinematic+podcaster+speaking&color=purple',
    duration: 24,
    size: '42 MB',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['estúdio', '4k', 'fala'],
    category: 'recording',
  },
]

const DEFAULT_SCHEDULED_POSTS: ScheduledPost[] = []

const StudioContext = createContext<StudioContextType | undefined>(undefined)

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('lumen_projects')
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS
  })

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return projects[0]?.id || null
  })

  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('lumen_media')
    return saved ? JSON.parse(saved) : DEFAULT_MEDIA
  })

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(() => {
    const saved = localStorage.getItem('lumen_scheduled')
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULED_POSTS
  })

  const [carousels, setCarousels] = useState<CarouselProject[]>(() => {
    const saved = localStorage.getItem('lumen_carousels')
    return saved ? JSON.parse(saved) : []
  })

  const [staticPosts, setStaticPosts] = useState<StaticPostProject[]>(() => {
    const saved = localStorage.getItem('lumen_static_posts')
    return saved ? JSON.parse(saved) : []
  })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Estado compartilhado da Gravadora
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  // FONTE ÚNICA DE VERDADE: `gravadoraScript` é o roteiro canônico da Gravadora.
  const DEFAULT_SCRIPT =
    'Bem-vindos ao LUMEN Studio! Hoje vamos gravar nosso novo vídeo com inteligência artificial.\n\nLembre-se de olhar fixamente para a lente da câmera, manter uma postura confiante e fazer pausas expressivas nos momentos-chave.\n\nO teleprompter sincroniza automaticamente com seu ritmo de fala.'

  const [gravadoraScript, setGravadoraScript] = useState<string>(() => {
    const saved = localStorage.getItem('lumen_gravadora_script')
    return saved ?? DEFAULT_SCRIPT
  })

  const teleprompterScript = gravadoraScript
  const setTeleprompterScript = setGravadoraScript

  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>(() => {
    const saved = localStorage.getItem('lumen_gravadora_blocks')
    if (saved) {
      try {
        return JSON.parse(saved) as ScriptBlock[]
      } catch {
        return []
      }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('lumen_gravadora_script', gravadoraScript)
  }, [gravadoraScript])

  useEffect(() => {
    localStorage.setItem('lumen_gravadora_blocks', JSON.stringify(scriptBlocks))
  }, [scriptBlocks])

  // Camera Config (brightness, contrast, beautySmooth)
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(() => {
    const saved = localStorage.getItem('lumen_camera_config')
    if (saved) {
      try {
        return { ...DEFAULT_CAMERA_CONFIG, ...JSON.parse(saved) }
      } catch {
        return DEFAULT_CAMERA_CONFIG
      }
    }
    return DEFAULT_CAMERA_CONFIG
  })

  useEffect(() => {
    localStorage.setItem('lumen_camera_config', JSON.stringify(cameraConfig))
  }, [cameraConfig])

  const updateCameraConfig = useCallback((updates: Partial<CameraConfig>) => {
    setCameraConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  // Prompter Config
  const [prompterConfig, setPrompterConfig] = useState<PrompterConfig>(() => {
    const saved = localStorage.getItem('lumen_prompter_hud_prefs')
    if (saved) {
      try {
        return { ...DEFAULT_PROMPTER_CONFIG, ...JSON.parse(saved) }
      } catch {
        return DEFAULT_PROMPTER_CONFIG
      }
    }
    return DEFAULT_PROMPTER_CONFIG
  })

  useEffect(() => {
    localStorage.setItem('lumen_prompter_hud_prefs', JSON.stringify(prompterConfig))
  }, [prompterConfig])

  const updatePrompterConfig = useCallback((updates: Partial<PrompterConfig>) => {
    setPrompterConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  // Fundo & Título
  const [backgroundConfig, setBackgroundConfigState] = useState<BackgroundConfig>(() => {
    const saved = localStorage.getItem('lumen_gravadora_fundo')
    if (saved) {
      try {
        return { ...DEFAULT_BACKGROUND_CONFIG, ...(JSON.parse(saved) as BackgroundConfig) }
      } catch {
        return DEFAULT_BACKGROUND_CONFIG
      }
    }
    return DEFAULT_BACKGROUND_CONFIG
  })

  const [titleConfig, setTitleConfigState] = useState<TitleConfig>(() => {
    const saved = localStorage.getItem('lumen_gravadora_titulo')
    if (saved) {
      try {
        return { ...DEFAULT_TITLE_CONFIG, ...(JSON.parse(saved) as TitleConfig) }
      } catch {
        return DEFAULT_TITLE_CONFIG
      }
    }
    return DEFAULT_TITLE_CONFIG
  })

  useEffect(() => {
    localStorage.setItem('lumen_gravadora_fundo', JSON.stringify(backgroundConfig))
  }, [backgroundConfig])

  useEffect(() => {
    localStorage.setItem('lumen_gravadora_titulo', JSON.stringify(titleConfig))
  }, [titleConfig])

  const setBackgroundConfig = (cfg: BackgroundConfig) => setBackgroundConfigState(cfg)
  const setTitleConfig = (cfg: TitleConfig) => setTitleConfigState(cfg)

  // Configuração do palco/canvas
  const [stageConfig, setStageConfigState] = useState<StageConfig>(() => {
    const saved = localStorage.getItem('lumen_gravadora_stage')
    if (saved) {
      try {
        return { ...DEFAULT_STAGE_CONFIG, ...(JSON.parse(saved) as StageConfig) }
      } catch {
        return DEFAULT_STAGE_CONFIG
      }
    }
    return DEFAULT_STAGE_CONFIG
  })

  const stageConfigSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (stageConfigSaveTimer.current) clearTimeout(stageConfigSaveTimer.current)
    stageConfigSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem('lumen_gravadora_stage', JSON.stringify(stageConfig))
      } catch {
        /* noop */
      }
    }, 300)
    return () => {
      if (stageConfigSaveTimer.current) clearTimeout(stageConfigSaveTimer.current)
    }
  }, [stageConfig])

  const updateStageConfig = useCallback((updates: Partial<StageConfig>) => {
    setStageConfigState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Device preference
  const DEVICES_KEY = 'lumen_gravadora_devices'
  const deviceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const saveDevicePreference = useCallback((cameraId: string, micId: string) => {
    if (deviceSaveTimerRef.current) clearTimeout(deviceSaveTimerRef.current)
    deviceSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DEVICES_KEY, JSON.stringify({ cameraId, micId }))
      } catch {
        /* noop */
      }
    }, 500)
  }, [])

  const loadDevicePreference = useCallback((): { cameraId: string; micId: string } => {
    try {
      const raw = localStorage.getItem(DEVICES_KEY)
      if (!raw) return { cameraId: '', micId: '' }
      const parsed = JSON.parse(raw) as { cameraId?: string; micId?: string }
      return {
        cameraId: typeof parsed.cameraId === 'string' ? parsed.cameraId : '',
        micId: typeof parsed.micId === 'string' ? parsed.micId : '',
      }
    } catch {
      return { cameraId: '', micId: '' }
    }
  }, [])

  // Audio config
  const AUDIO_KEY = 'lumen_gravadora_audio'
  const [audioConfig, setAudioConfigState] = useState<AudioConfig>(() => {
    try {
      const raw = localStorage.getItem(AUDIO_KEY)
      if (raw) {
        return { ...DEFAULT_AUDIO_CONFIG, ...JSON.parse(raw) }
      }
    } catch {
      /* noop */
    }
    return DEFAULT_AUDIO_CONFIG
  })

  const audioConfigSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (audioConfigSaveTimer.current) clearTimeout(audioConfigSaveTimer.current)
    audioConfigSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(AUDIO_KEY, JSON.stringify(audioConfig))
      } catch {
        /* noop */
      }
    }, 500)
    return () => {
      if (audioConfigSaveTimer.current) clearTimeout(audioConfigSaveTimer.current)
    }
  }, [audioConfig])

  const updateAudioConfig = useCallback((updates: Partial<AudioConfig>) => {
    setAudioConfigState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Preservação do vídeo bruto
  const rawVideoDbRef = useRef<IDBDatabase | null>(null)

  const openRawVideoDb = useCallback((): Promise<IDBDatabase | null> => {
    return new Promise((resolve) => {
      if (rawVideoDbRef.current) {
        resolve(rawVideoDbRef.current)
        return
      }
      try {
        const req = indexedDB.open('lumen_studio_raw_video', 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('blobs')) {
            db.createObjectStore('blobs')
          }
        }
        req.onsuccess = () => {
          rawVideoDbRef.current = req.result
          resolve(req.result)
        }
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }, [])

  const rawVideoKey = (projectId: string) => `lumen_raw_video_${projectId}`
  const rawVideoMetaKey = (projectId: string) => `lumen_raw_video_meta_${projectId}`
  const snapshotKey = (projectId: string) => `lumen_project_snapshot_${projectId}`
  const timelineKey = (projectId: string) => `lumen_timeline_${projectId}`

  const saveRawVideo = useCallback(
    async (projectId: string, blob: Blob, duration: number, mimeType: string): Promise<void> => {
      const record: RawVideoRecord = {
        savedAt: new Date().toISOString(),
        duration,
        mimeType,
        projectId,
        hasSnapshot: false,
      }
      try {
        localStorage.setItem(rawVideoMetaKey(projectId), JSON.stringify(record))
      } catch {
        /* noop */
      }
      if (blob.size <= 5 * 1024 * 1024) {
        try {
          const reader = new FileReader()
          await new Promise<void>((resolve, reject) => {
            reader.onload = () => {
              try {
                localStorage.setItem(rawVideoKey(projectId), reader.result as string)
                resolve()
              } catch (e) {
                reject(e)
              }
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          })
          return
        } catch {
          /* fallback IDB */
        }
      }
      const db = await openRawVideoDb()
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('blobs', 'readwrite')
          tx.objectStore('blobs').put(blob, projectId)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      }
    },
    [openRawVideoDb],
  )

  const loadRawVideo = useCallback(
    async (projectId: string): Promise<Blob | null> => {
      try {
        const dataUrl = localStorage.getItem(rawVideoKey(projectId))
        if (dataUrl) {
          const res = await fetch(dataUrl)
          return await res.blob()
        }
      } catch {
        /* noop */
      }
      const db = await openRawVideoDb()
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction('blobs', 'readonly')
          const req = tx.objectStore('blobs').get(projectId)
          req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
          req.onerror = () => resolve(null)
        })
      }
      return null
    },
    [openRawVideoDb],
  )

  const clearRawVideo = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        localStorage.removeItem(rawVideoKey(projectId))
        localStorage.removeItem(rawVideoMetaKey(projectId))
      } catch {
        /* noop */
      }
      const db = await openRawVideoDb()
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction('blobs', 'readwrite')
          tx.objectStore('blobs').delete(projectId)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        })
      }
    },
    [openRawVideoDb],
  )

  const saveProjectSnapshot = useCallback((snapshot: ProjectSnapshot) => {
    try {
      localStorage.setItem(snapshotKey(snapshot.projectId), JSON.stringify(snapshot))
      const metaRaw = localStorage.getItem(rawVideoMetaKey(snapshot.projectId))
      if (metaRaw) {
        const meta = JSON.parse(metaRaw) as RawVideoRecord
        meta.hasSnapshot = true
        localStorage.setItem(rawVideoMetaKey(snapshot.projectId), JSON.stringify(meta))
      }
    } catch {
      /* noop */
    }
  }, [])

  const loadProjectSnapshot = useCallback((projectId: string): ProjectSnapshot | null => {
    try {
      const raw = localStorage.getItem(snapshotKey(projectId))
      if (!raw) return null
      return JSON.parse(raw) as ProjectSnapshot
    } catch {
      return null
    }
  }, [])

  const clearProjectSnapshot = useCallback((projectId: string) => {
    try {
      localStorage.removeItem(snapshotKey(projectId))
      localStorage.removeItem(timelineKey(projectId))
    } catch {
      /* noop */
    }
  }, [])

  const recoverInterruptedRecording = useCallback(
    async (projectId: string): Promise<RawVideoRecord | null> => {
      try {
        const metaRaw = localStorage.getItem(rawVideoMetaKey(projectId))
        if (!metaRaw) return null
        const meta = JSON.parse(metaRaw) as RawVideoRecord
        const blob = await loadRawVideo(projectId)
        if (!blob || meta.hasSnapshot) return null
        return meta
      } catch {
        return null
      }
    },
    [loadRawVideo],
  )

  const getTimelineState = useCallback((projectId: string, rawDuration: number): TimelineState => {
    try {
      const raw = localStorage.getItem(timelineKey(projectId))
      if (raw) {
        const parsed = JSON.parse(raw) as TimelineState
        if (parsed.outPoint > rawDuration) parsed.outPoint = rawDuration
        if (parsed.cursor > rawDuration) parsed.cursor = 0
        return parsed
      }
    } catch {
      /* noop */
    }
    const dur = Math.max(0.1, rawDuration || 1)
    return {
      segments: [{ id: 'seg-' + Date.now(), start: 0, end: dur, excluded: false }],
      inPoint: 0,
      outPoint: dur,
      cursor: 0,
    }
  }, [])

  const setTimelineState = useCallback((projectId: string, state: TimelineState) => {
    try {
      localStorage.setItem(timelineKey(projectId), JSON.stringify(state))
    } catch {
      /* noop */
    }
  }, [])

  const [appliedAiSuggestions, setAppliedAiSuggestions] = useState<AISuggestion[]>([])

  const [brandOS, setBrandOSState] = useState<BrandOSContext | null>(() => {
    const saved = localStorage.getItem('lumen_brand_os')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    localStorage.setItem('lumen_brand_os', JSON.stringify(brandOS))
  }, [brandOS])

  useEffect(() => {
    localStorage.setItem('lumen_projects', JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    localStorage.setItem('lumen_media', JSON.stringify(mediaLibrary))
  }, [mediaLibrary])

  useEffect(() => {
    localStorage.setItem('lumen_scheduled', JSON.stringify(scheduledPosts))
  }, [scheduledPosts])

  useEffect(() => {
    localStorage.setItem('lumen_carousels', JSON.stringify(carousels))
  }, [carousels])

  useEffect(() => {
    localStorage.setItem('lumen_static_posts', JSON.stringify(staticPosts))
  }, [staticPosts])

  const createProject = (projectData: Partial<Project>): Project => {
    const newProj: Project = {
      id: 'proj-' + Date.now(),
      title: projectData.title || 'Novo Vídeo sem Título',
      type: projectData.type || 'reel',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      duration: projectData.duration || 30,
      thumbnail:
        projectData.thumbnail ||
        'https://img.usecurling.com/p/600/1066?q=video+creator+editing&color=purple',
      aspectRatio: projectData.aspectRatio || (projectData.type === 'youtube' ? '16:9' : '9:16'),
      resolution: projectData.resolution || '1080p',
      status: 'draft',
      clips: projectData.clips || [
        {
          id: 'clip-base-' + Date.now(),
          track: 'video',
          name: 'Gravação Principal',
          startTime: 0,
          duration: 30,
          sourceUrl: 'https://img.usecurling.com/p/1080/1920?q=content+creator+studio&color=purple',
          mediaType: 'video',
          volume: 100,
        },
      ],
      subtitles: projectData.subtitles || [],
      scriptText: projectData.scriptText || '',
    }
    setProjects((prev) => [newProj, ...prev])
    setActiveProjectId(newProj.id)
    return newProj
  }

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
      ),
    )
  }

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (activeProjectId === id) {
      setActiveProjectId(projects.find((p) => p.id !== id)?.id || null)
    }
    clearProjectSnapshot(id)
    clearRawVideo(id)
  }

  const duplicateProject = (id: string): Project => {
    const original = projects.find((p) => p.id === id)
    if (!original) throw new Error('Projeto não encontrado')
    const duplicated: Project = {
      ...original,
      id: 'proj-' + Date.now(),
      title: `${original.title} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      clips: original.clips.map((c) => ({
        ...c,
        id: 'clip-' + Math.random().toString(36).substring(2, 9),
      })),
      subtitles: original.subtitles.map((s) => ({
        ...s,
        id: 'sub-' + Math.random().toString(36).substring(2, 9),
      })),
    }
    setProjects((prev) => [duplicated, ...prev])
    const originalSnapshot = loadProjectSnapshot(id)
    if (originalSnapshot) {
      const newSnapshot: ProjectSnapshot = {
        ...originalSnapshot,
        projectId: duplicated.id,
        title: duplicated.title,
        savedAt: new Date().toISOString(),
        rawVideoUrl: undefined,
        rawVideoDuration: originalSnapshot.rawVideoDuration,
        takes: [],
      }
      saveProjectSnapshot(newSnapshot)
    }
    return duplicated
  }

  const getProjectById = (id: string) => projects.find((p) => p.id === id)

  const addMediaItem = (item: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem => {
    const newItem: MediaItem = {
      ...item,
      id: 'media-' + Date.now(),
      createdAt: new Date().toISOString(),
    }
    setMediaLibrary((prev) => [newItem, ...prev])
    return newItem
  }

  const deleteMediaItem = (id: string) => {
    setMediaLibrary((prev) => prev.filter((m) => m.id !== id))
  }

  const saveCarousel = (carousel: CarouselProject) => {
    setCarousels((prev) => {
      const exists = prev.some((c) => c.id === carousel.id)
      if (exists) {
        return prev.map((c) =>
          c.id === carousel.id ? { ...carousel, updatedAt: new Date().toISOString() } : c,
        )
      }
      return [carousel, ...prev]
    })
  }

  const getCarouselById = (id: string) => carousels.find((c) => c.id === id)

  const saveStaticPost = (post: StaticPostProject) => {
    setStaticPosts((prev) => {
      const exists = prev.some((p) => p.id === post.id)
      if (exists) {
        return prev.map((p) =>
          p.id === post.id ? { ...post, updatedAt: new Date().toISOString() } : p,
        )
      }
      return [post, ...prev]
    })
  }

  const getStaticPostById = (id: string) => staticPosts.find((p) => p.id === id)

  const schedulePost = (postData: Omit<ScheduledPost, 'id'>): ScheduledPost => {
    const newScheduled: ScheduledPost = {
      ...postData,
      id: 'sched-' + Date.now(),
      status: 'scheduled',
      analyticsEstimate: {
        views: Math.floor(Math.random() * 25000) + 5000,
        likes: Math.floor(Math.random() * 1800) + 300,
        engagementRate: (Math.random() * 5 + 4).toFixed(1) + '%',
      },
    }
    setScheduledPosts((prev) => [newScheduled, ...prev])
    return newScheduled
  }

  const updateScheduledPost = (id: string, updates: Partial<ScheduledPost>) => {
    setScheduledPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteScheduledPost = (id: string) => {
    setScheduledPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const publishNowSimulated = async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setScheduledPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: 'published', scheduledDate: new Date().toISOString() }
              : p,
          ),
        )
        resolve(true)
      }, 1500)
    })
  }

  const addAiSuggestion = (suggestion: AISuggestion) => {
    setAppliedAiSuggestions((prev) => [suggestion, ...prev])
  }

  const revertAiSuggestion = (id: string) => {
    setAppliedAiSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  const setBrandOS = (b: BrandOSContext | null) => setBrandOSState(b)
  const updateBrandOS = (updates: Partial<BrandOSContext>) =>
    setBrandOSState((prev) => (prev ? { ...prev, ...updates } : prev))

  return (
    <StudioContext.Provider
      value={{
        projects,
        activeProjectId,
        setActiveProjectId,
        createProject,
        updateProject,
        deleteProject,
        duplicateProject,
        getProjectById,
        mediaLibrary,
        addMediaItem,
        deleteMediaItem,
        carousels,
        saveCarousel,
        getCarouselById,
        staticPosts,
        saveStaticPost,
        getStaticPostById,
        scheduledPosts,
        schedulePost,
        updateScheduledPost,
        deleteScheduledPost,
        publishNowSimulated,
        isCreateModalOpen,
        setIsCreateModalOpen,
        teleprompterScript,
        setTeleprompterScript,
        scriptBlocks,
        setScriptBlocks,
        gravadoraScript,
        setGravadoraScript,
        activeBlockIndex,
        setActiveBlockIndex,
        isRecording,
        setIsRecording,
        isFocusMode,
        setIsFocusMode,
        cameraConfig,
        updateCameraConfig,
        prompterConfig,
        updatePrompterConfig,
        appliedAiSuggestions,
        addAiSuggestion,
        revertAiSuggestion,
        brandOS,
        setBrandOS,
        updateBrandOS,
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
        loadProjectSnapshot,
        clearProjectSnapshot,
        recoverInterruptedRecording,
        getTimelineState,
        setTimelineState,
      }}
    >
      {children}
    </StudioContext.Provider>
  )
}

export const useStudio = () => {
  const context = useContext(StudioContext)
  if (!context) {
    throw new Error('useStudio deve ser utilizado dentro de StudioProvider')
  }
  return context
}
