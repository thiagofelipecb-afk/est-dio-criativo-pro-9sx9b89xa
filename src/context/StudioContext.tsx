import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  Project,
  MediaItem,
  MediaAsset,
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
  BlockMediaAssignment,
  ReactionConfig,
} from '@/types/studio'
import {
  loadAssets,
  saveAsset,
  deleteAsset,
  updateAsset,
  toMediaItem,
  MEDIA_ASSETS_KEY,
} from '@/services/mediaService'
import { MEDIA_ASSETS_EVENT } from '@/hooks/useMediaAssets'

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
  /** Saturação (0–200, padrão 100). */
  saturation: number
  /** Temperatura de cor (-50..+50, padrão 0). */
  temperature: number
  /** Nitidez seletiva (0–100, padrão 0). */
  sharpness: number
  /** Suavização extra (0–100, padrão 0). */
  smoothness: number
  /** Vinheta (0–100, padrão 0). */
  vignette: number
}

const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  brightness: 100,
  contrast: 100,
  beautySmooth: 40,
  saturation: 100,
  temperature: 0,
  sharpness: 0,
  smoothness: 0,
  vignette: 0,
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
  /** Largura do HUD em px (padrão 860). */
  width: number
  /** Altura máxima da área de leitura em px (padrão 150). */
  height: number
  /** Cor de fundo (hex). Aplicada com a opacidade definida em bgOpacity. */
  bgColor: string
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
  width: 860,
  height: 150,
  bgColor: '#0B0B10',
}

/** Defaults — Vídeo de reação (persistido em lumen_reaction_config). */
const DEFAULT_REACTION_CONFIG: ReactionConfig = {
  assetId: null,
  enabled: false,
  muted: true,
  volume: 80,
  position: 'bottom-right',
  scale: 0.2,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#7C5CFC',
  startOffsetMs: 0,
  loop: true,
  audioMix: 'voice-only',
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

  // Media Library — PROMPT 2: agora derivada da fonte canônica `mediaAssets`.
  mediaAssets: MediaAsset[]
  addMediaAsset: (asset: MediaAsset) => MediaAsset
  deleteMediaAsset: (id: string) => void
  updateMediaAsset: (id: string, updates: Partial<MediaAsset>) => MediaAsset | null
  // Alias legado (MediaItem[]) — mantido para não quebrar imports existentes.
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

  // PROMPT 3 — Atribuição de mídia por bloco (artes sincronizadas com o teleprompter)
  blockAssignments: BlockMediaAssignment[]
  addBlockAssignment: (a: Omit<BlockMediaAssignment, 'id' | 'createdAt'>) => BlockMediaAssignment
  updateBlockAssignment: (id: string, updates: Partial<BlockMediaAssignment>) => void
  deleteBlockAssignment: (id: string) => void
  getAssignmentsForBlock: (blockId: string) => BlockMediaAssignment[]
  getAssignmentsForCurrentBlock: () => BlockMediaAssignment[]
  syncArtsEnabled: boolean
  setSyncArtsEnabled: (v: boolean) => void
  artBlockIndex: number
  setArtBlockIndex: (i: number) => void

  // Vídeo de reação (persistido em lumen_reaction_config)
  reactionConfig: ReactionConfig
  setReactionConfig: (cfg: ReactionConfig) => void
  updateReactionConfig: (updates: Partial<ReactionConfig>) => void
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

// Sem projeto demo padrão: o editor começa vazio. Um projeto demo com clipe
// fake (URL de imagem usada como vídeo) quebrava o contrato do editor real.
const DEFAULT_PROJECTS: Project[] = []

// PROMPT 2 — DEFAULT_MEDIA removido. O item fake `img.usecurling.com`
// apresentado como "vídeo" com duration: 24 era uma IMAGEM, não um vídeo, e
// criava estado contraditório entre /biblioteca, /midias e Gravadora. A
// biblioteca canônica agora vive em `lumen_media_assets` (via mediaService) e
// começa vazia. Itens demo, quando necessários, devem ser marcados com
// `metadata.demo = true` e exibidos com badge "Demonstração".
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

  // PROMPT 2 — Fonte canônica única: `lumen_media_assets` (via mediaService).
  // `mediaLibrary` (legado) é derivado deste array para compatibilidade.
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => loadAssets())

  // Sincroniza com mudanças em outras abas (storage) e nesta janela (evento
  // custom disparado por useMediaAssets / StudioContext).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MEDIA_ASSETS_KEY) setMediaAssets(loadAssets())
    }
    const onCustom = () => setMediaAssets(loadAssets())
    window.addEventListener('storage', onStorage)
    window.addEventListener(MEDIA_ASSETS_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(MEDIA_ASSETS_EVENT, onCustom)
    }
  }, [])

  // Alias legado derivado — mantém o formato MediaItem para imports antigos.
  const mediaLibrary: MediaItem[] = React.useMemo(() => mediaAssets.map(toMediaItem), [mediaAssets])

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

  // PROMPT 2 — a persistência de mídias agora é feita pelo mediaService em
  // `lumen_media_assets`. A chave legada `lumen_media` não é mais escrita.

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
      thumbnail: projectData.thumbnail || '',
      aspectRatio: projectData.aspectRatio || (projectData.type === 'youtube' ? '16:9' : '9:16'),
      resolution: projectData.resolution || '1080p',
      status: 'draft',
      clips: projectData.clips || [],
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

  // PROMPT 2 — operações canônicas sobre `lumen_media_assets`.
  const addMediaAsset = useCallback((asset: MediaAsset): MediaAsset => {
    const saved = saveAsset(asset)
    setMediaAssets(loadAssets())
    try {
      window.dispatchEvent(new CustomEvent(MEDIA_ASSETS_EVENT))
    } catch {
      /* noop */
    }
    return saved
  }, [])

  const deleteMediaAsset = useCallback((id: string) => {
    deleteAsset(id)
    setMediaAssets(loadAssets())
    try {
      window.dispatchEvent(new CustomEvent(MEDIA_ASSETS_EVENT))
    } catch {
      /* noop */
    }
  }, [])

  const updateMediaAsset = useCallback(
    (id: string, updates: Partial<MediaAsset>): MediaAsset | null => {
      const updated = updateAsset(id, updates)
      setMediaAssets(loadAssets())
      try {
        window.dispatchEvent(new CustomEvent(MEDIA_ASSETS_EVENT))
      } catch {
        /* noop */
      }
      return updated
    },
    [],
  )

  // Alias legado: adiciona como MediaAsset canônico e retorna MediaItem.
  const addMediaItem = (item: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem => {
    const now = new Date().toISOString()
    const id = 'media-' + Date.now()
    const asset: MediaAsset = {
      id,
      workspaceId: 'default',
      name: item.title,
      type: item.type,
      source: 'library',
      storageKey: id,
      publicUrl: item.url,
      mimeType:
        item.type === 'video' ? 'video/mp4' : item.type === 'audio' ? 'audio/mpeg' : 'image/jpeg',
      sizeBytes: 0,
      durationMs: item.duration ? item.duration * 1000 : undefined,
      createdAt: now,
      updatedAt: now,
    }
    addMediaAsset(asset)
    return toMediaItem(asset)
  }

  const deleteMediaItem = (id: string) => {
    deleteMediaAsset(id)
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

  // PROMPT 3 — Atribuição de mídia por bloco (persistida em lumen_block_assignments).
  const [blockAssignments, setBlockAssignments] = useState<BlockMediaAssignment[]>(() => {
    try {
      const raw = localStorage.getItem('lumen_block_assignments')
      return raw ? (JSON.parse(raw) as BlockMediaAssignment[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('lumen_block_assignments', JSON.stringify(blockAssignments))
    } catch {
      /* noop */
    }
  }, [blockAssignments])

  // syncArtsEnabled: quando true, o palco segue o activeBlockIndex do teleprompter.
  const [syncArtsEnabled, setSyncArtsEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lumen_sync_arts_enabled') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('lumen_sync_arts_enabled', String(syncArtsEnabled))
    } catch {
      /* noop */
    }
  }, [syncArtsEnabled])

  // artBlockIndex: bloco atualmente selecionado no painel Artes. Quando
  // syncArtsEnabled é true, acompanha activeBlockIndex automaticamente.
  const [artBlockIndex, setArtBlockIndex] = useState(0)

  // Mantém artBlockIndex sincronizado com o teleprompter quando sync está ligado.
  useEffect(() => {
    if (syncArtsEnabled) setArtBlockIndex(activeBlockIndex)
  }, [syncArtsEnabled, activeBlockIndex])

  const setSyncArtsEnabled = useCallback(
    (v: boolean) => {
      setSyncArtsEnabledState(v)
      if (v) setArtBlockIndex(activeBlockIndex)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [activeBlockIndex],
  )

  // Vídeo de reação — persistido em lumen_reaction_config.
  const REACTION_CONFIG_KEY = 'lumen_reaction_config'
  const [reactionConfig, setReactionConfigState] = useState<ReactionConfig>(() => {
    try {
      const raw = localStorage.getItem(REACTION_CONFIG_KEY)
      if (raw) {
        return { ...DEFAULT_REACTION_CONFIG, ...JSON.parse(raw) }
      }
    } catch {
      /* noop */
    }
    return DEFAULT_REACTION_CONFIG
  })

  useEffect(() => {
    try {
      localStorage.setItem(REACTION_CONFIG_KEY, JSON.stringify(reactionConfig))
    } catch {
      /* noop */
    }
  }, [reactionConfig])

  const setReactionConfig = useCallback((cfg: ReactionConfig) => {
    setReactionConfigState(cfg)
  }, [])

  const updateReactionConfig = useCallback((updates: Partial<ReactionConfig>) => {
    setReactionConfigState((prev) => ({ ...prev, ...updates }))
  }, [])

  const addBlockAssignment = useCallback(
    (a: Omit<BlockMediaAssignment, 'id' | 'createdAt'>): BlockMediaAssignment => {
      const rec: BlockMediaAssignment = {
        ...a,
        id: 'bma-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        createdAt: new Date().toISOString(),
      }
      setBlockAssignments((prev) => [...prev, rec])
      return rec
    },
    [],
  )

  const updateBlockAssignment = useCallback(
    (id: string, updates: Partial<BlockMediaAssignment>) => {
      setBlockAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
    },
    [],
  )

  const deleteBlockAssignment = useCallback((id: string) => {
    setBlockAssignments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const getAssignmentsForBlock = useCallback(
    (blockId: string): BlockMediaAssignment[] =>
      blockAssignments
        .filter((a) => a.blockId === blockId && a.enabled)
        .sort((a, b) => a.order - b.order),
    [blockAssignments],
  )

  const getAssignmentsForCurrentBlock = useCallback((): BlockMediaAssignment[] => {
    const block = scriptBlocks[artBlockIndex]
    return block ? getAssignmentsForBlock(block.id) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockAssignments, scriptBlocks, artBlockIndex, getAssignmentsForBlock])

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
        mediaAssets,
        addMediaAsset,
        deleteMediaAsset,
        updateMediaAsset,
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
        blockAssignments,
        addBlockAssignment,
        updateBlockAssignment,
        deleteBlockAssignment,
        getAssignmentsForBlock,
        getAssignmentsForCurrentBlock,
        syncArtsEnabled,
        setSyncArtsEnabled,
        artBlockIndex,
        setArtBlockIndex,
        reactionConfig,
        setReactionConfig,
        updateReactionConfig,
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
