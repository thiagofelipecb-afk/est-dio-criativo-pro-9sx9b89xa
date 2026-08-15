import React, { createContext, useContext, useEffect, useState } from 'react'
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
  /** Blocos do roteiro (persistidos em lumen_gravadora_blocks). */
  scriptBlocks: ScriptBlock[]
  setScriptBlocks: (blocks: ScriptBlock[]) => void
  /** Texto bruto do roteiro na Gravadora (persistido em lumen_gravadora_script). */
  gravadoraScript: string
  setGravadoraScript: (text: string) => void

  // AI History / suggestions
  appliedAiSuggestions: AISuggestion[]
  addAiSuggestion: (suggestion: AISuggestion) => void
  revertAiSuggestion: (id: string) => void

  // Brand OS — versão resumida para consumo dos geradores do estúdio criativo
  brandOS: BrandOSContext | null
  setBrandOS: (b: BrandOSContext | null) => void
  updateBrandOS: (updates: Partial<BrandOSContext>) => void

  // FASE 4 — Fundo e Título do Modo Estúdio
  /** Configuração de fundo da Gravadora (persistida em lumen_gravadora_fundo). */
  backgroundConfig: BackgroundConfig
  setBackgroundConfig: (cfg: BackgroundConfig) => void
  /** Configuração de título da Gravadora (persistida em lumen_gravadora_titulo). */
  titleConfig: TitleConfig
  setTitleConfig: (cfg: TitleConfig) => void
}

// Versão resumida do Brand OS consumida pelos geradores do estúdio
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
      {
        id: 'clip-2',
        track: 'video',
        name: 'Dica 1 e B-Roll',
        startTime: 14,
        duration: 18,
        sourceUrl: 'https://img.usecurling.com/p/1080/1920?q=high+tech+workspace+neon&color=cyan',
        mediaType: 'video',
        volume: 95,
        transitionIn: 'slide',
        transitionDuration: 0.5,
      },
      {
        id: 'clip-3',
        track: 'video',
        name: 'Chamada para Ação',
        startTime: 32,
        duration: 16,
        sourceUrl: 'https://img.usecurling.com/p/1080/1920?q=modern+creator+setup&color=purple',
        mediaType: 'video',
        volume: 100,
        transitionIn: 'zoom',
        transitionDuration: 0.5,
      },
      {
        id: 'clip-audio-1',
        track: 'audio',
        name: 'Cyberpunk Lo-Fi Beat',
        startTime: 0,
        duration: 48,
        mediaType: 'audio',
        volume: 35,
        fadeIn: 1,
        fadeOut: 2,
        ducking: true,
      },
      {
        id: 'clip-insert-1',
        track: 'insert',
        name: 'Sticker: 🔥 Em Alta',
        startTime: 2,
        duration: 6,
        mediaType: 'sticker',
        content: '🔥 EM ALTA',
        x: 80,
        y: 20,
        scale: 1.2,
      },
      {
        id: 'clip-insert-2',
        track: 'insert',
        name: 'Seta de Atenção',
        startTime: 16,
        duration: 5,
        mediaType: 'shape',
        content: '⚡ DICA #1',
        x: 50,
        y: 75,
        scale: 1,
      },
    ],
    subtitles: [
      {
        id: 'sub-1',
        startTime: 0.5,
        endTime: 4.2,
        text: 'Se você quer reter sua audiência até o final...',
        style: {
          fontSize: 28,
          color: '#FFFFFF',
          bgColor: '#7C5CFC',
          fontFamily: 'Inter',
          shadow: true,
          animation: 'bounce',
        },
      },
      {
        id: 'sub-2',
        startTime: 4.5,
        endTime: 9.8,
        text: 'Você precisa aplicar esses 3 cortes nos primeiros 5 segundos.',
        style: {
          fontSize: 28,
          color: '#22D3EE',
          bgColor: '#14141C',
          fontFamily: 'Inter',
          shadow: true,
          animation: 'pop',
        },
      },
      {
        id: 'sub-3',
        startTime: 10.2,
        endTime: 16.0,
        text: 'Olha como a transição dinâmica muda o ritmo da narração!',
        style: {
          fontSize: 28,
          color: '#FFFFFF',
          bgColor: '#7C5CFC',
          fontFamily: 'Inter',
          shadow: true,
          animation: 'slide',
        },
      },
      {
        id: 'sub-4',
        startTime: 16.5,
        endTime: 24.0,
        text: 'Comente "ESTÚDIO" para receber o checklist completo no direct.',
        style: {
          fontSize: 32,
          color: '#FBBF24',
          bgColor: '#14141C',
          fontFamily: 'Inter',
          shadow: true,
          animation: 'bounce',
        },
      },
    ],
  },
  {
    id: 'proj-2',
    title: 'Guia Completo de Iluminação para Gravação Caseira',
    type: 'youtube',
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    duration: 380,
    thumbnail: 'https://img.usecurling.com/p/1280/720?q=youtube+studio+lighting&color=purple',
    aspectRatio: '16:9',
    resolution: '4K',
    status: 'draft',
    scriptText:
      'Neste vídeo vamos comparar 3 setups de luz: luz natural, softbox de 50 reais e painel LED RGB.',
    clips: [
      {
        id: 'c2-1',
        track: 'video',
        name: 'Apresentação no Estúdio',
        startTime: 0,
        duration: 120,
        sourceUrl: 'https://img.usecurling.com/p/1280/720?q=man+speaking+studio+camera',
        mediaType: 'video',
        volume: 100,
      },
      {
        id: 'c2-2',
        track: 'video',
        name: 'Comparativo LED vs Softbox',
        startTime: 120,
        duration: 180,
        sourceUrl: 'https://img.usecurling.com/p/1280/720?q=led+lighting+setup',
        mediaType: 'video',
        volume: 100,
      },
    ],
    subtitles: [],
  },
  {
    id: 'proj-3',
    title: 'Tendências de Inteligência Artificial para Março 2025',
    type: 'carousel',
    createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    duration: 0,
    thumbnail: 'https://img.usecurling.com/p/1080/1350?q=artificial+intelligence+neon&color=cyan',
    aspectRatio: '4:5',
    status: 'scheduled',
    clips: [],
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
  {
    id: 'media-2',
    title: 'Neon Code B-Roll',
    type: 'video',
    url: 'https://img.usecurling.com/p/1080/1920?q=high+tech+workspace+neon&color=cyan',
    duration: 18,
    size: '31 MB',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['tech', 'futurista', 'b-roll'],
    category: 'b-roll',
  },
  {
    id: 'media-3',
    title: 'Modern Synthwave Track',
    type: 'audio',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    duration: 124,
    size: '8.4 MB',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: ['música', 'batida', 'ritmo'],
    category: 'music',
  },
  {
    id: 'media-4',
    title: 'Cyberpunk Ambient Glow',
    type: 'image',
    url: 'https://img.usecurling.com/p/1080/1080?q=futuristic+gradient+background&color=purple',
    size: '1.8 MB',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    tags: ['fundo', 'degrade', 'abstrato'],
    category: 'template',
  },
  {
    id: 'media-5',
    title: 'Microfone Podcast Pro',
    type: 'image',
    url: 'https://img.usecurling.com/p/800/800?q=shure+sm7b+microphone+dark',
    size: '2.1 MB',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    tags: ['equipamento', 'audio', 'podcast'],
    category: 'b-roll',
  },
]

const DEFAULT_SCHEDULED_POSTS: ScheduledPost[] = [
  {
    id: 'sched-1',
    projectId: 'proj-1',
    title: '5 Hábitos de Criadores de Alto Impacto',
    mediaUrl: 'https://img.usecurling.com/p/600/1066?q=content+creator+studio&color=purple',
    mediaType: 'video',
    platforms: ['instagram', 'tiktok'],
    scheduledDate: new Date(Date.now() + 3600000 * 6).toISOString(),
    caption:
      'Você sabia que o segredo de retenção está nos primeiros 3 segundos? 🚀 Confira a análise completa!',
    hashtags: [
      '#criacaodeconteudo',
      '#reelsbrasil',
      '#marketingdigital',
      '#lumenstudio',
      '#videomaker',
    ],
    status: 'scheduled',
    analyticsEstimate: {
      views: 34500,
      likes: 2100,
      engagementRate: '6.4%',
    },
  },
  {
    id: 'sched-2',
    projectId: 'proj-3',
    title: 'Tendências de IA para Criadores',
    mediaUrl: 'https://img.usecurling.com/p/1080/1350?q=artificial+intelligence+neon&color=cyan',
    mediaType: 'carousel',
    platforms: ['instagram'],
    scheduledDate: new Date(Date.now() + 3600000 * 26).toISOString(),
    caption:
      'Arrasta para o lado e salve essas 5 ferramentas que economizam 12 horas por semana na edição 🧠💡',
    hashtags: ['#inteligenciaartificial', '#produtividade', '#carrossel', '#conteudo'],
    status: 'scheduled',
    analyticsEstimate: {
      views: 18200,
      likes: 1450,
      engagementRate: '8.1%',
    },
  },
  {
    id: 'sched-3',
    projectId: 'proj-2',
    title: 'Guia Definitivo de Iluminação RGB',
    mediaUrl: 'https://img.usecurling.com/p/1280/720?q=youtube+studio+lighting&color=purple',
    mediaType: 'video',
    platforms: ['youtube'],
    scheduledDate: new Date(Date.now() - 3600000 * 48).toISOString(),
    caption:
      'Como transformar seu quarto em um estúdio cinematográfico gastando pouco. Link na bio com todos os presets!',
    hashtags: ['#youtubebrasil', '#iluminacao', '#estudioemcasa', '#setupgamer'],
    status: 'published',
    analyticsEstimate: {
      views: 52400,
      likes: 4300,
      engagementRate: '9.2%',
    },
  },
]

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
    if (saved) return JSON.parse(saved)
    return [
      {
        id: 'car-1',
        title: '3 Segredos da Retenção Visual',
        aspectRatio: '4:5',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: 'https://img.usecurling.com/p/1080/1350?q=slide+presentation+dark&color=purple',
        slides: [
          {
            id: 'sl-1',
            title: 'Como Prender a Atenção nos Primeiros 3 Segundos',
            subtitle: 'O Segredo dos Maiores Criadores',
            bodyText:
              'Descubra a fórmula que gera mais de 80% de retenção e faz o algoritmo entregar seu vídeo.',
            bgType: 'gradient',
            bgColor: '#14141C',
            bgGradient: 'from-violet-950 via-slate-900 to-black',
            elements: [
              {
                id: 'el-1',
                type: 'badge',
                content: 'ESTRATÉGIA COMPLETA',
                x: 50,
                y: 15,
                color: '#7C5CFC',
              },
              {
                id: 'el-2',
                type: 'arrow',
                content: 'Arrasta para ver 👉',
                x: 50,
                y: 88,
                color: '#22D3EE',
              },
            ],
          },
          {
            id: 'sl-2',
            title: '1. Gancho Visual de Quebra de Padrão',
            subtitle: 'Evite começos previsíveis',
            bodyText:
              'Use movimento brusco, troca de ângulo ou um elemento visual inesperado no primeiro frame.',
            bgType: 'color',
            bgColor: '#14141C',
            bgGradient: '',
            elements: [
              { id: 'el-3', type: 'step', content: 'PASSO 01', x: 20, y: 20, color: '#22D3EE' },
            ],
          },
          {
            id: 'sl-3',
            title: '2. Legendas com Destaque por Palavra',
            subtitle: 'Estímulo duplo (áudio + texto)',
            bodyText:
              'Palavras coloridas que pulam no ritmo da voz mantêm o cérebro conectado ao conteúdo.',
            bgType: 'gradient',
            bgColor: '#14141C',
            bgGradient: 'from-slate-900 to-violet-950',
            elements: [
              { id: 'el-4', type: 'step', content: 'PASSO 02', x: 20, y: 20, color: '#7C5CFC' },
            ],
          },
        ],
      },
    ]
  })

  const [staticPosts, setStaticPosts] = useState<StaticPostProject[]>(() => {
    const saved = localStorage.getItem('lumen_static_posts')
    if (saved) return JSON.parse(saved)
    return [
      {
        id: 'post-1',
        title: 'Frase Motivacional Criador Tech',
        aspectRatio: '1:1',
        bgType: 'gradient',
        bgColor: '#14141C',
        bgGradient: 'from-violet-950 via-slate-950 to-cyan-950',
        blurAmount: 0,
        headline: 'A consistência vence o algoritmo todos os dias.',
        subtitle: 'Não espere a inspiração perfeita: publique, analise e evolua.',
        authorName: 'LUMEN Studio',
        authorHandle: '@lumenstudio.ia',
        authorAvatar: 'https://img.usecurling.com/ppl/medium?seed=42',
        badgeText: 'INSIGHT DO DIA',
        watermark: true,
        filter: 'cinematic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: 'https://img.usecurling.com/p/1080/1080?q=cyberpunk+quote+studio&color=purple',
      },
    ]
  })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [teleprompterScript, setTeleprompterScript] = useState(
    'Bem-vindos ao LUMEN Studio! Hoje vamos gravar nosso novo vídeo com inteligência artificial.\n\nLembre-se de olhar fixamente para a lente da câmera, manter uma postura confiante e fazer pausas expressivas nos momentos-chave.\n\nO teleprompter sincroniza automaticamente com seu ritmo de fala.',
  )

  // FASE 2 — Roteiro por blocos na Gravadora (persistência própria)
  const [gravadoraScript, setGravadoraScript] = useState<string>(() => {
    const saved = localStorage.getItem('lumen_gravadora_script')
    return saved ?? ''
  })
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

  // FASE 4 — Fundo & Título (persistência própria em localStorage)
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

  const [appliedAiSuggestions, setAppliedAiSuggestions] = useState<AISuggestion[]>([])

  // Brand OS — versão resumida persistida em localStorage (lumen_brand_os)
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
