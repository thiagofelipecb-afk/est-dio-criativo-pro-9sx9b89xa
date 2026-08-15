import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  BrandProfile,
  GenerationJob,
  ContentItem,
  IdeaItem,
  FunnelDiagnosis,
  FunnelDiagnosisRecord,
  FunnelEcosystem,
  FunnelPlan,
  PageProject,
  VideoScript,
  AdCreation,
  AdIntelItem,
  SalesAssistRequest,
  SalesScript,
  CapturedCreative,
  ProfileCapture,
  MetricReading,
  ExtensionToken,
  SupportConversation,
  ScheduleEvent,
  OKRSet,
  OKRStatus,
} from '@/types/platform'

interface PlatformContextType {
  // Brand OS
  brandProfile: BrandProfile
  setBrandBase: (base: BrandProfile['base']) => void
  setResearch: (research: BrandProfile['research']) => void
  setInterview: (interview: BrandProfile['interview']) => void
  setAssets: (assets: BrandProfile['assets']) => void
  setGenerationMeta: (meta: {
    lastGeneratedAt: string
    lastModel: string
    lastDurationMs: number
  }) => void
  hasBrandOS: boolean

  // Jobs
  jobs: GenerationJob[]
  createJob: (kind: string, clientRequestId: string) => GenerationJob
  completeJob: (id: string, durationMs: number) => void
  failJob: (id: string, error: string) => void

  // Conteúdo
  contentItems: ContentItem[]
  saveContentItem: (item: ContentItem) => void
  deleteContentItem: (id: string) => void
  ideas: IdeaItem[]
  saveIdeas: (ideas: IdeaItem[]) => void

  // Funis
  funnelDiagnosis: FunnelDiagnosisRecord
  setFunnelDiagnosis: (d: FunnelDiagnosisRecord) => void
  funnelDiagnosisAutosave: (d: FunnelDiagnosis) => void
  snapshotFunnelDiagnosis: (label?: string) => void
  restoreFunnelDiagnosisVersion: (version: number) => void
  ecosystem: FunnelEcosystem | null
  setEcosystem: (e: FunnelEcosystem | null) => void
  funnelPlans: FunnelPlan[]
  setFunnelPlans: (p: FunnelPlan[]) => void

  // Ativos
  pageProjects: PageProject[]
  savePageProject: (p: PageProject) => void
  videoScripts: VideoScript[]
  saveVideoScript: (s: VideoScript) => void

  // Escala
  adCreations: AdCreation[]
  saveAdCreation: (a: AdCreation) => void
  adIntelItems: AdIntelItem[]
  setAdIntelItems: (a: AdIntelItem[]) => void

  // Vendas
  salesRequests: SalesAssistRequest[]
  saveSalesRequest: (r: SalesAssistRequest) => void
  salesScripts: SalesScript[]
  saveSalesScript: (s: SalesScript) => void

  // Transversais
  capturedCreatives: CapturedCreative[]
  saveCapturedCreative: (c: CapturedCreative) => void
  deleteCapturedCreative: (id: string) => void
  updateCapturedCreative: (id: string, updates: Partial<CapturedCreative>) => void
  profileCaptures: ProfileCapture[]
  saveProfileCapture: (p: ProfileCapture) => void
  metrics: MetricReading[]
  saveMetric: (m: MetricReading) => void
  token: ExtensionToken | null
  rotateToken: () => void
  claraConversation: SupportConversation
  addClaraMessage: (role: 'clara' | 'user', text: string) => void

  // Agenda
  scheduleEvents: ScheduleEvent[]
  saveScheduleEvent: (e: ScheduleEvent) => void
  deleteScheduleEvent: (id: string) => void

  // OKRs
  okrSet: OKRSet | null
  setOKRSet: (o: OKRSet | null) => void
  updateKeyResult: (objectiveId: string, krId: string, current: number) => void
  updateObjectiveStatus: (objectiveId: string, status: OKRStatus) => void
}

const EMPTY_BRAND: BrandProfile = {
  base: {
    niche: '',
    subniche: '',
    service: '',
    audience: '',
    result: '',
    differential: '',
    voice: '',
    mainOffer: '',
  },
  research: [],
  interview: [],
  assets: [],
  activeVersion: 0,
  versions: [],
  lastGeneratedAt: null,
  lastModel: null,
  lastDurationMs: null,
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined)

// Diagnóstico (Raio-X) vazio padrão
function emptyDiagnosis(): FunnelDiagnosis {
  return {
    oferta_esteira: '',
    produto_principal: '',
    ticket: '',
    validacao: '',
    audiencia: '',
    objetivo: '',
    horas_semana: '',
    orcamento: '',
    faz_video: '',
    equipe: '',
    aquecimento: '',
    nicho: '',
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brandProfile, setBrandProfile] = useState<BrandProfile>(() =>
    load('lumen_brand_profile', EMPTY_BRAND),
  )
  const [jobs, setJobs] = useState<GenerationJob[]>(() => load('lumen_jobs', []))
  const [contentItems, setContentItems] = useState<ContentItem[]>(() => load('lumen_content', []))
  const [ideas, setIdeas] = useState<IdeaItem[]>(() => load('lumen_ideas', []))
  const [funnelDiagnosis, setFunnelDiagnosisState] = useState<FunnelDiagnosisRecord>(() =>
    load('lumen_funnel_diagnosis', {
      current: emptyDiagnosis(),
      versions: [],
    }),
  )
  const [ecosystem, setEcosystemState] = useState<FunnelEcosystem | null>(() =>
    load('lumen_funnel_ecosystem', null),
  )
  const [funnelPlans, setFunnelPlansState] = useState<FunnelPlan[]>(() =>
    load('lumen_funnel_plans', []),
  )
  const [pageProjects, setPageProjects] = useState<PageProject[]>(() => load('lumen_pages', []))
  const [videoScripts, setVideoScripts] = useState<VideoScript[]>(() =>
    load('lumen_video_scripts', []),
  )
  const [adCreations, setAdCreations] = useState<AdCreation[]>(() => load('lumen_ad_creations', []))
  const [adIntelItems, setAdIntelItemsState] = useState<AdIntelItem[]>(() =>
    load('lumen_ad_intel', []),
  )
  const [salesRequests, setSalesRequests] = useState<SalesAssistRequest[]>(() =>
    load('lumen_sales_requests', []),
  )
  const [salesScripts, setSalesScripts] = useState<SalesScript[]>(() =>
    load('lumen_sales_scripts', []),
  )
  const [capturedCreatives, setCapturedCreatives] = useState<CapturedCreative[]>(() =>
    load('lumen_captured', []),
  )
  const [profileCaptures, setProfileCaptures] = useState<ProfileCapture[]>(() =>
    load('lumen_profiles', []),
  )
  const [metrics, setMetrics] = useState<MetricReading[]>(() => load('lumen_metrics', []))
  const [token, setToken] = useState<ExtensionToken | null>(() => load('lumen_token', null))
  const [claraConversation, setClaraConversation] = useState<SupportConversation>(() =>
    load('lumen_clara', {
      messages: [
        {
          role: 'clara',
          text: 'Olá! Eu sou a Clara, sua assistente de marketing com IA. Como posso ajudar você hoje?',
          at: new Date().toISOString(),
        },
      ],
    }),
  )
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(() =>
    load('lumen_schedule_events', []),
  )
  const [okrSet, setOKRSetState] = useState<OKRSet | null>(() =>
    load<OKRSet | null>('lumen_okrs', null),
  )

  // Persistência
  useEffect(() => persist('lumen_brand_profile', brandProfile), [brandProfile])
  useEffect(() => persist('lumen_jobs', jobs), [jobs])
  useEffect(() => persist('lumen_content', contentItems), [contentItems])
  useEffect(() => persist('lumen_ideas', ideas), [ideas])
  useEffect(() => persist('lumen_funnel_diagnosis', funnelDiagnosis), [funnelDiagnosis])
  useEffect(() => persist('lumen_funnel_ecosystem', ecosystem), [ecosystem])
  useEffect(() => persist('lumen_funnel_plans', funnelPlans), [funnelPlans])
  useEffect(() => persist('lumen_pages', pageProjects), [pageProjects])
  useEffect(() => persist('lumen_video_scripts', videoScripts), [videoScripts])
  useEffect(() => persist('lumen_ad_creations', adCreations), [adCreations])
  useEffect(() => persist('lumen_ad_intel', adIntelItems), [adIntelItems])
  useEffect(() => persist('lumen_sales_requests', salesRequests), [salesRequests])
  useEffect(() => persist('lumen_sales_scripts', salesScripts), [salesScripts])
  useEffect(() => persist('lumen_captured', capturedCreatives), [capturedCreatives])
  useEffect(() => persist('lumen_profiles', profileCaptures), [profileCaptures])
  useEffect(() => persist('lumen_metrics', metrics), [metrics])
  useEffect(() => persist('lumen_token', token), [token])
  useEffect(() => persist('lumen_clara', claraConversation), [claraConversation])
  useEffect(() => persist('lumen_schedule_events', scheduleEvents), [scheduleEvents])
  useEffect(() => persist('lumen_okrs', okrSet), [okrSet])

  // Brand OS
  const setBrandBase = useCallback((base: BrandProfile['base']) => {
    setBrandProfile((p) => ({ ...p, base }))
  }, [])
  const setResearch = useCallback((research: BrandProfile['research']) => {
    setBrandProfile((p) => ({ ...p, research }))
  }, [])
  const setInterview = useCallback((interview: BrandProfile['interview']) => {
    setBrandProfile((p) => ({ ...p, interview }))
  }, [])
  const setAssets = useCallback(
    (assets: BrandProfile['assets']) => {
      const version: BrandProfile['versions'][0] = {
        version: brandProfile.activeVersion + 1,
        snapshot: {
          base: brandProfile.base,
          research: brandProfile.research,
          interview: brandProfile.interview,
        },
        createdAt: new Date().toISOString(),
      }
      setBrandProfile((p) => ({
        ...p,
        assets,
        activeVersion: p.activeVersion + 1,
        versions: [...p.versions, version],
      }))
    },
    [brandProfile.activeVersion, brandProfile.base, brandProfile.research, brandProfile.interview],
  )
  const setGenerationMeta = useCallback(
    (meta: { lastGeneratedAt: string; lastModel: string; lastDurationMs: number }) => {
      setBrandProfile((p) => ({ ...p, ...meta }))
    },
    [],
  )
  const hasBrandOS = !!brandProfile.assets.length

  // Jobs
  const createJob = useCallback(
    (kind: string, clientRequestId: string) => {
      const job: GenerationJob = {
        id: uid('job'),
        kind,
        status: 'running',
        model: 'lumen-ia-v3',
        promptVersion: '1.0',
        contextVersion: brandProfile.activeVersion,
        durationMs: null,
        error: null,
        clientRequestId,
        createdAt: new Date().toISOString(),
      }
      setJobs((prev) => [...prev, job])
      return job
    },
    [brandProfile.activeVersion],
  )

  const completeJob = useCallback((id: string, durationMs: number) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'completed', durationMs } : j)),
    )
  }, [])
  const failJob = useCallback((id: string, error: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'failed', error } : j)))
  }, [])

  // Conteúdo
  const saveContentItem = useCallback((item: ContentItem) => {
    setContentItems((prev) => {
      const exists = prev.some((c) => c.id === item.id)
      return exists ? prev.map((c) => (c.id === item.id ? item : c)) : [item, ...prev]
    })
  }, [])
  const deleteContentItem = useCallback((id: string) => {
    setContentItems((prev) => prev.filter((c) => c.id !== id))
  }, [])
  const saveIdeas = useCallback((newIdeas: IdeaItem[]) => {
    setIdeas((prev) => {
      const filtered = prev.filter((p) => !newIdeas.some((n) => n.pillar === p.pillar))
      return [...newIdeas, ...filtered]
    })
  }, [])

  // Funis — diagnóstico (Raio-X) com autosave + versionamento
  const setFunnelDiagnosis = useCallback((d: FunnelDiagnosisRecord) => {
    setFunnelDiagnosisState(d)
  }, [])
  const funnelDiagnosisAutosave = useCallback((current: FunnelDiagnosis) => {
    setFunnelDiagnosisState((prev) => ({ ...prev, current }))
  }, [])
  const snapshotFunnelDiagnosis = useCallback((label?: string) => {
    setFunnelDiagnosisState((prev) => {
      const nextVersion =
        prev.versions.length > 0 ? Math.max(...prev.versions.map((v) => v.version)) + 1 : 1
      const snap: import('@/types/platform').FunnelDiagnosisVersion = {
        version: nextVersion,
        snapshot: prev.current,
        createdAt: new Date().toISOString(),
        label,
      }
      return { ...prev, versions: [...prev.versions, snap] }
    })
  }, [])
  const restoreFunnelDiagnosisVersion = useCallback((version: number) => {
    setFunnelDiagnosisState((prev) => {
      const v = prev.versions.find((x) => x.version === version)
      if (!v) return prev
      return { ...prev, current: { ...v.snapshot } }
    })
  }, [])

  // Funis — ecossistema e planos
  const setEcosystem = useCallback((e: FunnelEcosystem | null) => setEcosystemState(e), [])
  const setFunnelPlans = useCallback((p: FunnelPlan[]) => setFunnelPlansState(p), [])

  // Ativos
  const savePageProject = useCallback((p: PageProject) => {
    setPageProjects((prev) => {
      const exists = prev.some((x) => x.id === p.id)
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    })
  }, [])
  const saveVideoScript = useCallback((s: VideoScript) => {
    setVideoScripts((prev) => {
      const exists = prev.some((x) => x.id === s.id)
      return exists ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev]
    })
  }, [])

  // Escala
  const saveAdCreation = useCallback((a: AdCreation) => {
    setAdCreations((prev) => [a, ...prev])
  }, [])
  const setAdIntelItems = useCallback((a: AdIntelItem[]) => setAdIntelItemsState(a), [])

  // Vendas
  const saveSalesRequest = useCallback((r: SalesAssistRequest) => {
    setSalesRequests((prev) => [r, ...prev])
  }, [])
  const saveSalesScript = useCallback((s: SalesScript) => {
    setSalesScripts((prev) => {
      const exists = prev.some((x) => x.id === s.id)
      return exists ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev]
    })
  }, [])

  // Transversais
  const saveCapturedCreative = useCallback((c: CapturedCreative) => {
    setCapturedCreatives((prev) => {
      const exists = prev.some((x) => x.id === c.id)
      return exists ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]
    })
  }, [])
  const deleteCapturedCreative = useCallback((id: string) => {
    setCapturedCreatives((prev) => prev.filter((c) => c.id !== id))
  }, [])
  const updateCapturedCreative = useCallback((id: string, updates: Partial<CapturedCreative>) => {
    setCapturedCreatives((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }, [])
  const saveProfileCapture = useCallback((p: ProfileCapture) => {
    setProfileCaptures((prev) => {
      const exists = prev.some((x) => x.id === p.id)
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    })
  }, [])
  const saveMetric = useCallback((m: MetricReading) => {
    setMetrics((prev) => [m, ...prev])
  }, [])

  const rotateToken = useCallback(() => {
    const newToken: ExtensionToken = {
      token: 'lumen_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    }
    setToken(newToken)
  }, [])

  const addClaraMessage = useCallback((role: 'clara' | 'user', text: string) => {
    setClaraConversation((c) => ({
      messages: [...c.messages, { role, text, at: new Date().toISOString() }],
    }))
  }, [])

  // Agenda
  const saveScheduleEvent = useCallback((e: ScheduleEvent) => {
    setScheduleEvents((prev) => {
      const exists = prev.some((x) => x.id === e.id)
      return exists ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]
    })
  }, [])
  const deleteScheduleEvent = useCallback((id: string) => {
    setScheduleEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // OKRs
  const setOKRSet = useCallback((o: OKRSet | null) => {
    setOKRSetState(o)
  }, [])

  const updateKeyResult = useCallback((objectiveId: string, krId: string, current: number) => {
    setOKRSetState((prev) => {
      if (!prev) return prev
      const objectives = prev.objectives.map((obj) => {
        if (obj.id !== objectiveId) return obj
        const keyResults = obj.keyResults.map((kr) => {
          if (kr.id !== krId) return kr
          const clamped = Math.max(0, current)
          const progress =
            kr.target > 0 ? Math.min(100, Math.round((clamped / kr.target) * 100)) : 0
          const status: OKRStatus =
            progress >= 100 ? 'concluido' : progress > 0 ? 'em_progresso' : 'nao_iniciado'
          return { ...kr, current: clamped, progress, status }
        })
        const progress =
          keyResults.length > 0
            ? Math.round(keyResults.reduce((s, k) => s + k.progress, 0) / keyResults.length)
            : 0
        const status: OKRStatus =
          progress >= 100
            ? 'concluido'
            : keyResults.some((k) => k.status === 'em_risco')
              ? 'em_risco'
              : progress > 0
                ? 'em_progresso'
                : 'nao_iniciado'
        return { ...obj, keyResults, progress, status }
      })
      return { ...prev, objectives, lastUpdatedAt: new Date().toISOString() }
    })
  }, [])

  const updateObjectiveStatus = useCallback((objectiveId: string, status: OKRStatus) => {
    setOKRSetState((prev) => {
      if (!prev) return prev
      const objectives = prev.objectives.map((obj) =>
        obj.id === objectiveId ? { ...obj, status } : obj,
      )
      return { ...prev, objectives, lastUpdatedAt: new Date().toISOString() }
    })
  }, [])

  return (
    <PlatformContext.Provider
      value={{
        brandProfile,
        setBrandBase,
        setResearch,
        setInterview,
        setAssets,
        setGenerationMeta,
        hasBrandOS,
        jobs,
        createJob,
        completeJob,
        failJob,
        contentItems,
        saveContentItem,
        deleteContentItem,
        ideas,
        saveIdeas,
        ecosystem,
        setEcosystem,
        funnelDiagnosis,
        setFunnelDiagnosis,
        funnelDiagnosisAutosave,
        snapshotFunnelDiagnosis,
        restoreFunnelDiagnosisVersion,
        funnelPlans,
        setFunnelPlans,
        pageProjects,
        savePageProject,
        videoScripts,
        saveVideoScript,
        adCreations,
        saveAdCreation,
        adIntelItems,
        setAdIntelItems,
        salesRequests,
        saveSalesRequest,
        salesScripts,
        saveSalesScript,
        capturedCreatives,
        saveCapturedCreative,
        deleteCapturedCreative,
        updateCapturedCreative,
        profileCaptures,
        saveProfileCapture,
        metrics,
        saveMetric,
        token,
        rotateToken,
        claraConversation,
        addClaraMessage,
        scheduleEvents,
        saveScheduleEvent,
        deleteScheduleEvent,
        okrSet,
        setOKRSet,
        updateKeyResult,
        updateObjectiveStatus,
      }}
    >
      {children}
    </PlatformContext.Provider>
  )
}

export const usePlatform = () => {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error('usePlatform deve ser usado dentro de PlatformProvider')
  return ctx
}
