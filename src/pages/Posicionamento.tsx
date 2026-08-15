import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { useStudio } from '@/context/StudioContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Compass,
  Sparkles,
  Download,
  ClipboardList,
  Mic,
  CheckCircle2,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  Save,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  XCircle,
  Clock,
  FileBarChart,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BrandAsset,
  BrandAssetType,
  BrandProfile,
  ResearchAnswer,
  InterviewAnswer,
} from '@/types/platform'
import { generateOKRs } from '@/lib/okr-generator'

/* =====================================================================
   DEFINIÇÕES — Pesquisa Completa (8 grupos, 42 campos)
   ===================================================================== */

type FieldType = 'text' | 'textarea' | 'select'

interface FieldDef {
  key: string
  label: string
  placeholder?: string
  type?: FieldType
  options?: string[]
}

interface ResearchGroupDef {
  group: number
  title: string
  fields: FieldDef[]
}

const RESEARCH_GROUPS: ResearchGroupDef[] = [
  {
    group: 1,
    title: 'Trajetória e Credenciais',
    fields: [
      { key: 'nome_completo', label: 'Nome completo', placeholder: 'Ex: João da Silva' },
      { key: 'formacao', label: 'Formação acadêmica', placeholder: 'Ex: MBA em Marketing' },
      {
        key: 'certificacoes',
        label: 'Certificações',
        placeholder: 'Ex: Google Ads, Meta Blueprint',
      },
      { key: 'tempo_atuacao', label: 'Tempo de atuação no mercado', placeholder: 'Ex: 7 anos' },
      {
        key: 'linkedin',
        label: 'Link do LinkedIn/currículo',
        placeholder: 'https://linkedin.com/in/...',
      },
    ],
  },
  {
    group: 2,
    title: 'Esteira de Ofertas',
    fields: [
      {
        key: 'oferta_entrada',
        label: 'Oferta de entrada (isca)',
        placeholder: 'Ex: E-book gratuito',
      },
      {
        key: 'oferta_principal',
        label: 'Oferta principal (core)',
        placeholder: 'Ex: Mentoria de 8 semanas',
      },
      { key: 'upsell_1', label: 'Upsell 1', placeholder: 'Ex: Acesso à comunidade' },
      { key: 'upsell_2', label: 'Upsell 2', placeholder: 'Ex: Sessões 1:1 mensais' },
      { key: 'oferta_premium', label: 'Oferta premium', placeholder: 'Ex: Done-for-you anual' },
    ],
  },
  {
    group: 3,
    title: 'Negócio e Números',
    fields: [
      { key: 'faturamento', label: 'Faturamento mensal aproximado', placeholder: 'Ex: R$ 50.000' },
      { key: 'ticket_medio', label: 'Ticket médio atual', placeholder: 'Ex: R$ 3.500' },
      { key: 'clientes_ativos', label: 'Número de clientes ativos', placeholder: 'Ex: 42' },
      { key: 'cac', label: 'Custo de aquisição (CAC)', placeholder: 'Ex: R$ 480' },
      { key: 'ltv', label: 'Lifetime value (LTV)', placeholder: 'Ex: R$ 12.000' },
      {
        key: 'meta_12m',
        label: 'Meta de faturamento em 12 meses',
        placeholder: 'Ex: R$ 200.000/mês',
      },
    ],
  },
  {
    group: 4,
    title: 'Cliente Ideal',
    fields: [
      { key: 'idade_ideal', label: 'Idade do cliente ideal', placeholder: 'Ex: 28-42 anos' },
      { key: 'genero', label: 'Gênero predominante', placeholder: 'Ex: Feminino' },
      { key: 'renda_media', label: 'Renda média', placeholder: 'Ex: R$ 8.000+' },
      {
        key: 'dores',
        label: 'Principais dores',
        type: 'textarea',
        placeholder: 'O que mais aflige seu cliente…',
      },
      {
        key: 'objecoes',
        label: 'Objeções mais comuns',
        type: 'textarea',
        placeholder: 'Ex: "está caro", "não tenho tempo"…',
      },
      {
        key: 'consome_conteudo',
        label: 'Onde consome conteúdo',
        placeholder: 'Ex: Instagram, YouTube, podcasts',
      },
    ],
  },
  {
    group: 5,
    title: 'Mercado e Concorrência',
    fields: [
      {
        key: 'concorrentes',
        label: 'Principais concorrentes diretos',
        placeholder: 'Liste 2-5 nomes',
      },
      {
        key: 'dif_concorrente_a',
        label: 'Diferencial vs concorrente A',
        placeholder: 'O que você faz melhor que o A…',
      },
      {
        key: 'dif_concorrente_b',
        label: 'Diferencial vs concorrente B',
        placeholder: 'O que você faz melhor que o B…',
      },
      {
        key: 'tendencias',
        label: 'Tendências do mercado',
        type: 'textarea',
        placeholder: 'Para onde o mercado caminha…',
      },
      {
        key: 'oportunidades',
        label: 'Oportunidades não exploradas',
        type: 'textarea',
        placeholder: 'Lacunas que ninguém atende…',
      },
    ],
  },
  {
    group: 6,
    title: 'Vocabulário e Visual',
    fields: [
      {
        key: 'palavras_usa',
        label: 'Palavras que a marca USA',
        placeholder: 'Ex: método, transformação, clareza',
      },
      {
        key: 'palavras_nunca',
        label: 'Palavras que a marca NUNCA usa',
        placeholder: 'Ex: mágico, fácil, segredo',
      },
      {
        key: 'cores_marca',
        label: 'Cores da marca',
        placeholder: 'Ex: violeta #7C5CFC, ciano #22D3EE',
      },
      {
        key: 'estilo_visual',
        label: 'Estilo visual',
        type: 'select',
        options: ['Minimalista', 'Bold', 'Elegante', 'Orgânico', 'Futurista'],
      },
      {
        key: 'referencias_visuais',
        label: 'Referências visuais (links)',
        placeholder: 'https://pinterest.com/...',
      },
    ],
  },
  {
    group: 7,
    title: 'Processo e Garantias',
    fields: [
      { key: 'etapa_1', label: 'Etapa 1 do processo', placeholder: 'Primeiro passo do método' },
      { key: 'etapa_2', label: 'Etapa 2 do processo', placeholder: 'Segundo passo' },
      { key: 'etapa_3', label: 'Etapa 3 do processo', placeholder: 'Terceiro passo' },
      { key: 'etapa_4', label: 'Etapa 4 do processo', placeholder: 'Quarto passo' },
      { key: 'etapa_5', label: 'Etapa 5 do processo', placeholder: 'Quinto passo' },
    ],
  },
  {
    group: 8,
    title: 'Provas e Autoridade',
    fields: [
      {
        key: 'depoimentos',
        label: 'Depoimentos de clientes',
        type: 'textarea',
        placeholder: 'Frases reais de clientes…',
      },
      {
        key: 'cases',
        label: 'Cases de sucesso',
        type: 'textarea',
        placeholder: 'Antes/depois com números…',
      },
      { key: 'midia', label: 'Aparições na mídia', placeholder: 'Ex: Podcast X, portal Y' },
      {
        key: 'redes_seguidores',
        label: 'Redes sociais com seguidores',
        placeholder: 'Ex: IG 45k, YT 12k',
      },
      {
        key: 'selos_premiacoes',
        label: 'Selos e premiações',
        placeholder: 'Ex: Top 10 Marketing 2024',
      },
    ],
  },
]

const TOTAL_RESEARCH_FIELDS = RESEARCH_GROUPS.reduce((s, g) => s + g.fields.length, 0) // 42

/* =====================================================================
   DEFINIÇÕES — Perguntas Avançadas (Base Essencial, recomendado)
   ===================================================================== */

interface AdvancedQuestionDef {
  key: string
  label: string
  type: 'text' | 'textarea'
  placeholder?: string
}

const ADVANCED_QUESTIONS: AdvancedQuestionDef[] = [
  {
    key: 'maior_objecao',
    label: 'Qual a maior objeção que seus clientes têm antes de comprar?',
    type: 'textarea',
    placeholder:
      'Ex: "Está caro", "Não vou ter tempo de aplicar", "Já tentei antes e não funcionou"…',
  },
  {
    key: 'uma_frase',
    label: 'Se seu cliente ideal lesse apenas UMA frase sua, qual seria?',
    type: 'text',
    placeholder: 'A frase definitiva que resume o seu valor…',
  },
  {
    key: 'erro_concorrentes',
    label: 'Qual o maior erro que seus concorrentes cometem?',
    type: 'text',
    placeholder: 'Ex: Prometem rápido e não entregam suporte…',
  },
  {
    key: 'porque_voce',
    label: 'O que faz um cliente escolher você em vez do concorrente mais barato?',
    type: 'textarea',
    placeholder: 'Seu diferencial inimitável em poucas linhas…',
  },
  {
    key: 'momento_aha',
    label: 'Qual foi o momento "aha" que fez você criar esse negócio?',
    type: 'textarea',
    placeholder: 'A insight original, o ponto de virada…',
  },
  {
    key: 'momento_percebe',
    label: 'Descreva o momento exato em que seu cliente percebe que precisa de você.',
    type: 'textarea',
    placeholder: 'O gatilho de conscientização do cliente…',
  },
  {
    key: 'perguntas_fechar',
    label: 'Quais perguntas seus clientes sempre fazem antes de fechar?',
    type: 'textarea',
    placeholder: 'Liste as dúvidas recorrentes na decisão de compra…',
  },
  {
    key: 'todos_soubessem',
    label: 'O que você gostaria que TODO mundo soubesse sobre seu mercado?',
    type: 'textarea',
    placeholder: 'A verdade que poucos enxergam no seu nicho…',
  },
]

/* =====================================================================
   DEFINIÇÕES — Entrevista Guiada (8 etapas)
   ===================================================================== */

interface InterviewStepDef {
  code: string
  title: string
  prompt: string
}

const INTERVIEW_STEPS: InterviewStepDef[] = [
  {
    code: 'G1',
    title: 'Origem',
    prompt: 'Como você começou nesse mercado? Conte sua história de origem.',
  },
  {
    code: 'G2',
    title: 'Caso de Transformação',
    prompt:
      'Descreva o caso de um cliente que passou por uma transformação real com seu trabalho. O que ele vivia antes e depois?',
  },
  {
    code: 'G3',
    title: 'Anti-cliente',
    prompt: 'Quem NÃO é seu cliente ideal? Quem você não atenderia mesmo que pagasse?',
  },
  {
    code: 'G4',
    title: 'Raiva do Mercado',
    prompt: 'O que te irrita no seu mercado? O que você faria diferente de todo mundo?',
  },
  {
    code: 'G5',
    title: 'Voz do Cliente',
    prompt:
      'Como seus clientes descrevem o problema que você resolve? Use as palavras exatas que eles usam.',
  },
  {
    code: 'G6',
    title: 'Personalidade da Marca',
    prompt: 'Se sua marca fosse uma pessoa, como ela se vestiria, falaria e agiria em uma festa?',
  },
  {
    code: 'G7',
    title: 'Legado',
    prompt:
      'Daqui a 10 anos, qual legado você quer ter deixado? O que as pessoas dirão sobre você?',
  },
  {
    code: 'G8',
    title: 'Resposta Livre',
    prompt:
      'Tem algo mais que você gostaria de registrar sobre sua marca, sua visão ou qualquer coisa que não perguntamos?',
  },
]

/* =====================================================================
   DEFINIÇÕES — 13 Ativos de Marca
   ===================================================================== */

const ASSET_DEFS: { type: BrandAssetType; layer: BrandAsset['layer']; title: string }[] = [
  { type: 'posicionamento', layer: 'quem_voce_e', title: 'Posicionamento' },
  { type: 'promessa', layer: 'quem_voce_e', title: 'Promessa' },
  { type: 'arquetipo', layer: 'quem_voce_e', title: 'Arquétipo' },
  { type: 'inimigo_narrativo', layer: 'quem_voce_e', title: 'Inimigo Narrativo' },
  { type: 'tom_de_voz', layer: 'como_voce_fala', title: 'Tom de Voz' },
  { type: 'vocabulario', layer: 'como_voce_fala', title: 'Vocabulário' },
  { type: 'storytelling', layer: 'como_voce_fala', title: 'Storytelling de Origem' },
  { type: 'stack_de_prova', layer: 'como_voce_prova', title: 'Stack de Prova' },
  { type: 'identidade_visual', layer: 'como_voce_prova', title: 'Identidade Visual' },
  { type: 'pilares_de_conteudo', layer: 'como_voce_publica', title: 'Pilares de Conteúdo' },
  { type: 'linha_editorial', layer: 'como_voce_publica', title: 'Linha Editorial' },
  { type: 'bio_taglines', layer: 'como_voce_publica', title: 'Bio e Taglines' },
  { type: 'oferta_principal', layer: 'como_voce_vende', title: 'Oferta Principal' },
]

const LAYER_LABELS: Record<BrandAsset['layer'], string> = {
  quem_voce_e: 'Quem você é',
  como_voce_fala: 'Como você fala',
  como_voce_prova: 'Como você prova',
  como_voce_publica: 'Como você publica',
  como_voce_vende: 'Como você vende',
}

const LAYER_ORDER: BrandAsset['layer'][] = [
  'quem_voce_e',
  'como_voce_fala',
  'como_voce_prova',
  'como_voce_publica',
  'como_voce_vende',
]

const VOICE_OPTIONS = [
  'Autoridade',
  'Inspirador',
  'Combativo',
  'Técnico',
  'Próximo',
  'Provocador',
  'Mistura personalizada',
]

const TOM_LABELS: Record<string, string> = {
  Autoridade: 'Direto, confiante e fundamentado em expertise.',
  Inspirador: 'Eleva, motiva e conecta com propósito.',
  Combativo: 'Confronta o status quo e desperta ação.',
  Técnico: 'Preciso, metodológico e didático.',
  Próximo: 'Acolhedor, conversacional e empático.',
  Provocador: 'Quebra padrões, provoca reflexão e polariza.',
  'Mistura personalizada': 'Combinação personalizada de tons.',
}

/* =====================================================================
   HOOK — Autosave com debounce (2s)
   ===================================================================== */

function useDebouncedSave(key: string, data: unknown, delay = 2000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        setSavedAt(new Date().toISOString())
      } catch {
        /* ignore */
      }
    }, delay)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [key, data, delay])

  return { savedAt }
}

/* =====================================================================
   COMPONENTE PRINCIPAL
   ===================================================================== */

export default function Posicionamento() {
  const {
    brandProfile,
    setBrandBase,
    setResearch,
    setInterview,
    setAssets,
    setGenerationMeta,
    okrSet,
    setOKRSet,
  } = usePlatform()
  const { setBrandOS } = useStudio()
  const { generateBrandOS } = useAIGeneration()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'base' | 'pesquisa' | 'entrevista'>('base')

  // Perguntas avançadas (Base Essencial) — localStorage próprio
  const [advancedQuestions, setAdvancedQuestions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('lumen_posicionamento_advanced_questions')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(
        'lumen_posicionamento_advanced_questions',
        JSON.stringify(advancedQuestions),
      )
    } catch {
      /* ignore */
    }
  }, [advancedQuestions])
  const updateAdvancedQuestion = (key: string, value: string) =>
    setAdvancedQuestions((prev) => ({ ...prev, [key]: value }))
  const advancedFilled = Object.values(advancedQuestions).filter((v) => v?.trim()).length

  // Geração
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [genStatus, setGenStatus] = useState<
    'idle' | 'queued' | 'running' | 'completed' | 'failed'
  >('idle')
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Rascunho local da pesquisa completa (separado do PlatformContext p/ debounce próprio)
  // Na verdade usamos o PlatformContext como fonte de verdade; o autosave aqui é extra.
  const researchDraft = brandProfile.research
  const interviewDraft = brandProfile.interview

  useDebouncedSave('lumen_posicionamento_research_draft', researchDraft)
  useDebouncedSave('lumen_posicionamento_interview_draft', interviewDraft)

  const base = brandProfile.base
  const updateBase = (key: keyof typeof base, value: string) =>
    setBrandBase({ ...base, [key]: value })

  // ---- Base essencial: contagem de preenchidos ----
  const baseFields: { key: keyof typeof base }[] = [
    { key: 'niche' },
    { key: 'subniche' },
    { key: 'service' },
    { key: 'audience' },
    { key: 'result' },
    { key: 'differential' },
    { key: 'voice' },
    { key: 'mainOffer' },
  ]
  const baseFilled = baseFields.filter((f) => base[f.key]?.trim()).length
  const canGenerate = baseFilled >= 5
  const missingCount = Math.max(0, 5 - baseFilled)

  // ---- Pesquisa: helpers ----
  const getResearch = (group: number, fieldKey: string) =>
    brandProfile.research.find((r) => r.group === group && r.fieldKey === fieldKey)?.value || ''
  const setResearchValue = (group: number, fieldKey: string, value: string) => {
    const others = brandProfile.research.filter(
      (r) => !(r.group === group && r.fieldKey === fieldKey),
    )
    const updated: ResearchAnswer[] = value ? [...others, { group, fieldKey, value }] : others
    setResearch(updated)
  }
  const researchFilledTotal = brandProfile.research.length

  const restoreResearchDraft = () => {
    try {
      const saved = localStorage.getItem('lumen_posicionamento_research_draft')
      if (saved) {
        const parsed: ResearchAnswer[] = JSON.parse(saved)
        setResearch(parsed)
        toast.success('Rascunho da pesquisa restaurado!')
      } else {
        toast.info('Nenhum rascunho salvo encontrado.')
      }
    } catch {
      toast.error('Não foi possível restaurar o rascunho.')
    }
  }

  // ---- Entrevista: helpers ----
  const [interviewStep, setInterviewStep] = useState(0)
  const getInterview = (code: string) =>
    brandProfile.interview.find((i) => i.guideCode === code)?.transcript || ''
  const setInterviewValue = (code: string, value: string) => {
    const others = brandProfile.interview.filter((i) => i.guideCode !== code)
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
    const updated: InterviewAnswer[] = value
      ? [...others, { guideCode: code, transcript: value, wordCount }]
      : others
    setInterview(updated)
  }
  const interviewsCompleted = INTERVIEW_STEPS.filter((s) => getInterview(s.code).trim()).length

  const restoreInterviewDraft = () => {
    try {
      const saved = localStorage.getItem('lumen_posicionamento_interview_draft')
      if (saved) {
        const parsed: InterviewAnswer[] = JSON.parse(saved)
        setInterview(parsed)
        toast.success('Rascunho da entrevista restaurado!')
      } else {
        toast.info('Nenhum rascunho salvo encontrado.')
      }
    } catch {
      toast.error('Não foi possível restaurar o rascunho.')
    }
  }

  const hasAssets = brandProfile.assets.length > 0

  /* ----------------------------------------------------------------
     Geração Brand OS
     ---------------------------------------------------------------- */
  const runGeneration = async () => {
    setLoading(true)
    setGenStatus('queued')
    setProgress(0)
    setProgressLabel('Enfileirando job…')

    // pequena espera para refletir o estado "queued"
    await new Promise((r) => setTimeout(r, 400))
    setGenStatus('running')

    const res = await generateBrandOS((pct, label) => {
      setProgress(pct)
      setProgressLabel(label)
    }, 2400)

    if (res.failed) {
      setGenStatus('failed')
      setLoading(false)
      toast.error('Falha na geração do Brand OS. Tente novamente.')
      return
    }

    // Monta os 13 ativos (inclui perguntas avançadas como contexto adicional)
    const assets: BrandAsset[] = ASSET_DEFS.map((def) => ({
      type: def.type,
      layer: def.layer,
      title: def.title,
      content: generateAssetContent(
        def.type,
        base,
        brandProfile.research,
        brandProfile.interview,
        advancedQuestions,
      ),
    }))
    setAssets(assets)
    setGenerationMeta({
      lastGeneratedAt: new Date().toISOString(),
      lastModel: 'lumen-ia-v3',
      lastDurationMs: res.durationMs,
    })

    // Sincroniza versão resumida no StudioContext para os geradores do estúdio
    const nicho = base.niche?.trim() || '[Preencha este dado]'
    const tomVoz = base.voice?.trim() || TOM_LABELS['Autoridade']
    const publico = base.audience?.trim() || '[Preencha este dado]'
    const pilaresAsset = assets.find((a) => a.type === 'pilares_de_conteudo')
    const linhaAsset = assets.find((a) => a.type === 'linha_editorial')
    const promessaAsset = assets.find((a) => a.type === 'promessa')
    setBrandOS({
      brandName: nicho,
      niche: nicho,
      promise: promessaAsset?.content || '[Preencha este dado]',
      voice: tomVoz,
      audience: publico,
      contentPillars: extractPillars(pilaresAsset?.content || ''),
      editorialLine: linhaAsset?.content || '',
      activeVersion: res.contextVersion + 1,
      generatedAt: new Date().toISOString(),
    })

    // Gera OKRs estratégicos a partir do Brand OS recém-criado.
    // Preserva valores atuais (current) dos KRs anteriores por descrição.
    const newOKRSet = generateOKRs(
      {
        ...brandProfile,
        assets,
        activeVersion: res.contextVersion + 1,
      },
      okrSet,
    )
    setOKRSet(newOKRSet)

    setGenStatus('completed')
    setLoading(false)
    setProgress(0)
    setProgressLabel('')
    toast.success(
      `Brand OS gerado! ${assets.length} ativos criados (v${res.contextVersion + 1}).`,
      {
        description: 'Seu documento visual de marca está pronto.',
        action: {
          label: 'Ver Documento Visual →',
          onClick: () => navigate('/posicionamento/documento'),
        },
      },
    )
    toast.success(`OKRs estratégicos gerados (${newOKRSet.objectives.length} objetivos).`, {
      description: 'Acompanhe o progresso no dashboard de OKRs.',
      action: {
        label: 'Ver OKRs Estratégicos →',
        onClick: () => navigate('/posicionamento/okrs'),
      },
    })
  }

  const handleGenerateClick = () => {
    if (!canGenerate) {
      toast.error(`Preencha mais ${missingCount} campo(s) da Base Essencial para gerar.`)
      return
    }
    setConfirmOpen(true)
  }

  const confirmGenerate = async () => {
    setConfirmOpen(false)
    await runGeneration()
  }

  const retryGeneration = () => {
    runGeneration()
  }

  const handleExportAll = () => {
    const md = buildExportMarkdown(brandProfile)
    downloadFile('lumen-brand-os-arquitetura.md', md, 'text/markdown')
    toast.success('Arquitetura do Brand OS exportada!')
  }

  const handleRegenerateAsset = (type: BrandAssetType) => {
    const def = ASSET_DEFS.find((d) => d.type === type)!
    const newContent = generateAssetContent(
      type,
      base,
      brandProfile.research,
      brandProfile.interview,
      advancedQuestions,
    )
    const updated = brandProfile.assets.map((a) =>
      a.type === type ? { ...a, content: newContent } : a,
    )
    setAssets(updated)
    toast.success(`"${def.title}" regenerado.`)
  }

  const handleSaveAsset = (type: BrandAssetType, content: string) => {
    const updated = brandProfile.assets.map((a) => (a.type === type ? { ...a, content } : a))
    setAssets(updated)
    toast.success('Ativo salvo.')
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[#7C5CFC]1a border-[#7C5CFC]33 text-[#7C5CFC]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Brand OS — Posicionamento de Marca
                </h1>
                <p className="text-xs sm:text-sm text-[#9494A8] max-w-2xl">
                  A fonte única de verdade da sua marca. Defina o posicionamento, gere os 13 ativos
                  de marca e alimente todos os geradores de IA do LUMEN Studio com contexto
                  coerente.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {hasAssets ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Brand OS ativo • v{brandProfile.activeVersion}
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Brand OS pendente
                </Badge>
              )}
              {brandProfile.base.niche && (
                <Badge className="bg-white/5 text-[#9494A8] border-white/10">
                  {brandProfile.base.niche}
                  {brandProfile.base.subniche ? ` • ${brandProfile.base.subniche}` : ''}
                </Badge>
              )}
              <Badge className="bg-white/5 text-[#9494A8] border-white/10">
                Base: {baseFilled}/8
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasAssets && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                className="border-white/10 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Exportar arquitetura
              </Button>
            )}
            {/* Botão Gerar Brand OS — acessível de qualquer aba */}
            {canGenerate ? (
              <Button
                size="sm"
                onClick={handleGenerateClick}
                disabled={loading}
                className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {loading ? 'Gerando…' : 'Gerar Brand OS'}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      disabled
                      className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-white font-semibold text-xs px-4 py-2.5 rounded-xl gap-1.5 opacity-60 cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      Gerar Brand OS
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                  Faltam {missingCount} campo(s) na Base Essencial (mín. 5 de 8)
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Barra de progresso de geração */}
        {loading && (
          <div className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C5CFC]" />
                {progressLabel || 'Processando…'}
              </span>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
                {genStatus === 'queued' ? 'Na fila' : 'Processando'}
              </Badge>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Estado de falha com retry */}
        {genStatus === 'failed' && !loading && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-300">
                A geração do Brand OS falhou. Verifique os dados e tente novamente.
              </span>
            </div>
            <Button
              size="sm"
              onClick={retryGeneration}
              className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-[#0e0e15] border border-white/5 rounded-xl p-1 h-auto">
            <TabsTrigger
              value="base"
              className="data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#7C5CFC]/25 text-[#9494A8] hover:text-white text-xs gap-1.5 rounded-lg"
            >
              <Compass className="w-3.5 h-3.5" /> Base Essencial
            </TabsTrigger>
            <TabsTrigger
              value="pesquisa"
              className="data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#7C5CFC]/25 text-[#9494A8] hover:text-white text-xs gap-1.5 rounded-lg"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Pesquisa Completa
            </TabsTrigger>
            <TabsTrigger
              value="entrevista"
              className="data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#7C5CFC]/25 text-[#9494A8] hover:text-white text-xs gap-1.5 rounded-lg"
            >
              <Mic className="w-3.5 h-3.5" /> Entrevista Guiada
            </TabsTrigger>
          </TabsList>

          {/* ============ ABA 1 — BASE ESSENCIAL ============ */}
          <TabsContent value="base" className="space-y-4 mt-4">
            <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">8 campos essenciais da marca</h3>
                <Badge
                  className={
                    baseFilled >= 5
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]'
                  }
                >
                  {baseFilled}/8 preenchidos
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EssentialField label="Nicho" filled={!!base.niche?.trim()}>
                  <Input
                    className={fieldInputClass(!!base.niche?.trim())}
                    value={base.niche}
                    onChange={(e) => updateBase('niche', e.target.value)}
                    placeholder="Ex: Marketing digital"
                  />
                </EssentialField>
                <EssentialField label="Subnicho" filled={!!base.subniche?.trim()}>
                  <Input
                    className={fieldInputClass(!!base.subniche?.trim())}
                    value={base.subniche}
                    onChange={(e) => updateBase('subniche', e.target.value)}
                    placeholder="Ex: Tráfego pago para infoprodutos"
                  />
                </EssentialField>
              </div>

              <EssentialField label="Serviço principal" filled={!!base.service?.trim()}>
                <Input
                  className={fieldInputClass(!!base.service?.trim())}
                  value={base.service}
                  onChange={(e) => updateBase('service', e.target.value)}
                  placeholder="Ex: Mentoria de tráfego pago de 8 semanas"
                />
              </EssentialField>

              <EssentialField label="Público-alvo" filled={!!base.audience?.trim()}>
                <Textarea
                  className={fieldInputClass(!!base.audience?.trim())}
                  rows={2}
                  value={base.audience}
                  onChange={(e) => updateBase('audience', e.target.value)}
                  placeholder="Quem é o cliente ideal que você atende…"
                />
              </EssentialField>

              <EssentialField label="Resultado entregue" filled={!!base.result?.trim()}>
                <Textarea
                  className={fieldInputClass(!!base.result?.trim())}
                  rows={2}
                  value={base.result}
                  onChange={(e) => updateBase('result', e.target.value)}
                  placeholder="Que transformação o cliente obtém…"
                />
              </EssentialField>

              <EssentialField label="Diferencial competitivo" filled={!!base.differential?.trim()}>
                <Textarea
                  className={fieldInputClass(!!base.differential?.trim())}
                  rows={2}
                  value={base.differential}
                  onChange={(e) => updateBase('differential', e.target.value)}
                  placeholder="O que torna sua oferta única…"
                />
              </EssentialField>

              <EssentialField label="Tom de voz" filled={!!base.voice?.trim()}>
                <Select value={base.voice} onValueChange={(v) => updateBase('voice', v)}>
                  <SelectTrigger className={fieldInputClass(!!base.voice?.trim()) + ' h-9'}>
                    <SelectValue placeholder="Selecione o tom de voz…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1C1C27] border-white/10 text-white">
                    {VOICE_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {base.voice && (
                  <p className="text-[10px] text-[#9494A8] mt-1">{TOM_LABELS[base.voice]}</p>
                )}
              </EssentialField>

              <EssentialField label="Oferta principal" filled={!!base.mainOffer?.trim()}>
                <Textarea
                  className={fieldInputClass(!!base.mainOffer?.trim())}
                  rows={2}
                  value={base.mainOffer}
                  onChange={(e) => updateBase('mainOffer', e.target.value)}
                  placeholder="Descreva sua oferta principal em detalhes…"
                />
              </EssentialField>
            </div>

            {/* Perguntas Avançadas (recomendado) */}
            <div className="rounded-2xl bg-gradient-to-br from-[#1C1C27] to-[#14141C] border border-[#7C5CFC]/20 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C5CFC]/15 border border-[#7C5CFC]/30">
                    <Sparkles className="w-3.5 h-3.5 text-[#7C5CFC]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Perguntas Avançadas (recomendado)
                    </h3>
                    <p className="text-[10px] text-[#9494A8]">
                      Aprofundamento estratégico que enriquece a geração do Brand OS
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    advancedFilled === ADVANCED_QUESTIONS.length
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                      : 'bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]'
                  }
                >
                  {advancedFilled}/{ADVANCED_QUESTIONS.length} preenchidas
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ADVANCED_QUESTIONS.map((q) => {
                  const val = advancedQuestions[q.key] || ''
                  const isFilled = !!val.trim()
                  return (
                    <div key={q.key} className={q.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <Label className="text-xs font-medium text-[#9494A8] flex items-center gap-1 mb-1.5">
                        {q.label}
                        {isFilled && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </Label>
                      {q.type === 'textarea' ? (
                        <Textarea
                          className={fieldInputClass(isFilled)}
                          rows={2}
                          value={val}
                          onChange={(e) => updateAdvancedQuestion(q.key, e.target.value)}
                          placeholder={q.placeholder || '…'}
                        />
                      ) : (
                        <Input
                          className={fieldInputClass(isFilled)}
                          value={val}
                          onChange={(e) => updateAdvancedQuestion(q.key, e.target.value)}
                          placeholder={q.placeholder || '…'}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-[#9494A8]/70 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Salvamento automático no localStorage. Estas respostas
                alimentam a geração do Brand OS como contexto adicional.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                onClick={handleGenerateClick}
                disabled={loading}
                className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {loading ? 'Gerando…' : 'Gerar Brand OS'}
              </Button>
              {!canGenerate && (
                <p className="text-[11px] text-amber-400">
                  Preencha mais {missingCount} campo(s) para habilitar a geração (mínimo 5 de 8).
                </p>
              )}
            </div>

            {hasAssets && brandProfile.lastGeneratedAt && (
              <GenerationMeta
                version={brandProfile.activeVersion}
                generatedAt={brandProfile.lastGeneratedAt}
                model={brandProfile.lastModel}
                durationMs={brandProfile.lastDurationMs}
              />
            )}
          </TabsContent>

          {/* ============ ABA 2 — PESQUISA COMPLETA ============ */}
          <TabsContent value="pesquisa" className="space-y-4 mt-4">
            {/* Progresso geral */}
            <div className="rounded-2xl bg-gradient-to-br from-[#1C1C27] to-[#14141C] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Progresso geral da pesquisa</h3>
                  <p className="text-[11px] text-[#9494A8]">
                    {researchFilledTotal}/{TOTAL_RESEARCH_FIELDS} campos preenchidos
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={restoreResearchDraft}
                  className="border-white/10 text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar rascunho
                </Button>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all duration-500"
                  style={{
                    width: `${(researchFilledTotal / TOTAL_RESEARCH_FIELDS) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-[#9494A8]/70 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Salvamento automático a cada 2 segundos.
              </p>
            </div>

            <Accordion type="multiple" defaultValue={['g-1']} className="space-y-2">
              {RESEARCH_GROUPS.map((g) => {
                const filled = g.fields.filter((f) => getResearch(g.group, f.key)?.trim()).length
                const pct = (filled / g.fields.length) * 100
                return (
                  <AccordionItem
                    key={g.group}
                    value={`g-${g.group}`}
                    className="rounded-2xl bg-[#14141C] border border-white/5 overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-[10px] font-bold text-[#7C5CFC]">
                            {String(g.group).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-bold text-white">{g.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              filled === g.fields.length
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                                : 'bg-white/5 text-[#9494A8] border-white/10 text-[10px]'
                            }
                          >
                            {filled}/{g.fields.length}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="mb-3 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {g.fields.map((f) => {
                          const val = getResearch(g.group, f.key)
                          const isFilled = !!val?.trim()
                          return (
                            <div
                              key={f.key}
                              className={f.type === 'textarea' ? 'md:col-span-2' : ''}
                            >
                              <Label className="text-xs font-medium text-[#9494A8] flex items-center gap-1 mb-1.5">
                                {f.label}
                                {isFilled && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              </Label>
                              {f.type === 'select' ? (
                                <Select
                                  value={val}
                                  onValueChange={(v) => setResearchValue(g.group, f.key, v)}
                                >
                                  <SelectTrigger className={fieldInputClass(isFilled) + ' h-9'}>
                                    <SelectValue placeholder={f.placeholder || 'Selecione…'} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1C1C27] border-white/10 text-white">
                                    {f.options!.map((o) => (
                                      <SelectItem key={o} value={o} className="text-xs">
                                        {o}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : f.type === 'textarea' ? (
                                <Textarea
                                  className={fieldInputClass(isFilled)}
                                  rows={2}
                                  value={val}
                                  onChange={(e) => setResearchValue(g.group, f.key, e.target.value)}
                                  placeholder={f.placeholder || '…'}
                                />
                              ) : (
                                <Input
                                  className={fieldInputClass(isFilled)}
                                  value={val}
                                  onChange={(e) => setResearchValue(g.group, f.key, e.target.value)}
                                  placeholder={f.placeholder || '…'}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </TabsContent>

          {/* ============ ABA 3 — ENTREVISTA GUIADA ============ */}
          <TabsContent value="entrevista" className="space-y-4 mt-4">
            {/* Progresso geral da entrevista */}
            <div className="rounded-2xl bg-gradient-to-br from-[#1C1C27] to-[#14141C] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Progresso da entrevista</h3>
                  <p className="text-[11px] text-[#9494A8]">
                    {interviewsCompleted}/{INTERVIEW_STEPS.length} etapas preenchidas
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={restoreInterviewDraft}
                  className="border-white/10 text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar rascunho
                </Button>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all duration-500"
                  style={{
                    width: `${(interviewsCompleted / INTERVIEW_STEPS.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-[#9494A8]/70 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Salvamento automático a cada 2 segundos.
              </p>
            </div>

            {/* Etapa atual */}
            {(() => {
              const step = INTERVIEW_STEPS[interviewStep]
              const txt = getInterview(step.code)
              const wc = txt.trim() ? txt.trim().split(/\s+/).length : 0
              return (
                <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                        {step.code}
                      </Badge>
                      <h3 className="text-sm font-bold text-white">{step.title}</h3>
                    </div>
                    <span className="text-[11px] text-[#9494A8]">
                      Etapa {interviewStep + 1} de {INTERVIEW_STEPS.length}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 italic border-l-2 border-[#7C5CFC]/40 pl-3">
                    {step.prompt}
                  </p>

                  <div>
                    <Textarea
                      className="bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] placeholder:text-[#9494A8]/50 min-h-[180px]"
                      value={txt}
                      onChange={(e) => setInterviewValue(step.code, e.target.value)}
                      placeholder="Escreva sua resposta aqui…"
                    />
                    <p className="text-[11px] text-[#9494A8] mt-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {wc} palavra{wc === 1 ? '' : 's'}
                    </p>
                  </div>

                  {/* Navegação entre etapas */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInterviewStep((s) => Math.max(0, s - 1))}
                      disabled={interviewStep === 0}
                      className="border-white/10 text-xs gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Anterior
                    </Button>

                    {/* indicadores de etapa */}
                    <div className="flex items-center gap-1">
                      {INTERVIEW_STEPS.map((s, i) => (
                        <button
                          key={s.code}
                          onClick={() => setInterviewStep(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === interviewStep
                              ? 'w-6 bg-[#7C5CFC]'
                              : getInterview(s.code).trim()
                                ? 'w-1.5 bg-emerald-400'
                                : 'w-1.5 bg-white/20'
                          }`}
                          title={`${s.code} — ${s.title}`}
                        />
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setInterviewStep((s) => Math.min(INTERVIEW_STEPS.length - 1, s + 1))
                      }
                      disabled={interviewStep === INTERVIEW_STEPS.length - 1}
                      className="border-white/10 text-xs gap-1.5"
                    >
                      Próximo <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })()}
          </TabsContent>
        </Tabs>

        {/* ============ BANNER DOCUMENTO VISUAL DA MARCA ============ */}
        {hasAssets && (
          <div className="rounded-2xl bg-gradient-to-r from-[#1C1C27] via-[#14141C] to-[#0e0e15] border border-[#7C5CFC]/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 shrink-0">
              <FileBarChart className="w-7 h-7 text-[#7C5CFC]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Documento da Marca
                <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30 text-[9px]">
                  Visual
                </Badge>
              </h3>
              <p className="text-[11px] text-[#9494A8] mt-0.5">
                Arquitetura completa de marca em formato visual: mapa mental, gráficos, esteira de
                ofertas, concorrência e mais. Pronto para compartilhar ou salvar como PDF.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/posicionamento/documento')}
              className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs gap-1.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir Documento Completo
            </Button>
          </div>
        )}

        {/* ============ ATIVOS GERADOS (abaixo das tabs) ============ */}
        {hasAssets && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C5CFC]" />
                Ativos de Marca ({brandProfile.assets.length})
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAll}
                  className="border-white/10 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar arquitetura
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerateClick}
                  disabled={loading}
                  className="bg-[#7C5CFC] text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerar tudo
                </Button>
              </div>
            </div>

            {brandProfile.lastGeneratedAt && (
              <GenerationMeta
                version={brandProfile.activeVersion}
                generatedAt={brandProfile.lastGeneratedAt}
                model={brandProfile.lastModel}
                durationMs={brandProfile.lastDurationMs}
              />
            )}

            <Accordion type="multiple" defaultValue={LAYER_ORDER.map((l) => `layer-${l}`)}>
              {LAYER_ORDER.map((layer) => {
                const layerAssets = brandProfile.assets.filter((a) => a.layer === layer)
                if (!layerAssets.length) return null
                return (
                  <AccordionItem
                    key={layer}
                    value={`layer-${layer}`}
                    className="rounded-2xl bg-[#14141C] border border-white/5 overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-sm font-bold text-white">{LAYER_LABELS[layer]}</span>
                        <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                          {layerAssets.length} ativos
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-2">
                      {layerAssets.map((a) => (
                        <AssetCard
                          key={a.type}
                          asset={a}
                          version={brandProfile.activeVersion}
                          generatedAt={brandProfile.lastGeneratedAt}
                          onRegenerate={() => handleRegenerateAsset(a.type)}
                          onSave={(content) => handleSaveAsset(a.type, content)}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        )}
      </div>

      {/* Modal de confirmação de geração */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#14141C] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7C5CFC]" />
              Gerar Brand OS
            </DialogTitle>
            <DialogDescription className="text-[#9494A8]">
              Isso consumirá <strong className="text-white">1 crédito de IA</strong> e gerará seus{' '}
              <strong className="text-white">13 ativos de marca</strong>. Um snapshot versionado do
              seu BrandProfile será salvo. Continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              className="border-white/10 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmGenerate}
              className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-white text-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Gerar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

/* =====================================================================
   SUBCOMPONENTES
   ===================================================================== */

function EssentialField({
  label,
  filled,
  children,
}: {
  label: string
  filled: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-[#9494A8] flex items-center gap-1.5 mb-1.5">
        {label}
        <span
          className={`inline-flex h-1.5 w-1.5 rounded-full ${
            filled ? 'bg-emerald-400' : 'bg-white/20'
          }`}
        />
      </Label>
      {children}
    </div>
  )
}

function fieldInputClass(filled: boolean) {
  return `w-full bg-[#1C1C27] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] placeholder:text-[#9494A8]/50 transition-colors ${
    filled
      ? 'border-emerald-500/40 focus:border-emerald-500/60'
      : 'border-white/10 focus:border-[#7C5CFC]/60'
  }`
}

function GenerationMeta({
  version,
  generatedAt,
  model,
  durationMs,
}: {
  version: number
  generatedAt?: string | null
  model?: string | null
  durationMs?: number | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9494A8] bg-[#0e0e15]/60 border border-white/5 rounded-lg px-3 py-2">
      <span className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-[#7C5CFC]" /> Contexto Brand OS v{version}
      </span>
      {model && <span>• {model}</span>}
      {generatedAt && (
        <span className="flex items-center gap-1">
          • <Clock className="w-3 h-3" /> {new Date(generatedAt).toLocaleString('pt-BR')}
        </span>
      )}
      {durationMs != null && <span>• {(durationMs / 1000).toFixed(1)}s</span>}
    </div>
  )
}

function AssetCard({
  asset,
  version,
  generatedAt,
  onRegenerate,
  onSave,
}: {
  asset: BrandAsset
  version: number
  generatedAt: string | null
  onRegenerate: () => void
  onSave: (content: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(asset.content)

  useEffect(() => {
    setDraft(asset.content)
  }, [asset.content])

  const needsConfirmation = asset.content.includes('[Preencha este dado]')

  const copy = () => {
    navigator.clipboard.writeText(asset.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success(`"${asset.title}" copiado!`)
  }

  const save = () => {
    onSave(draft)
    setEditing(false)
  }

  const exportAsset = () => {
    const content = `# ${asset.title}\n\n> Brand OS v${version} — gerado em ${
      generatedAt ? new Date(generatedAt).toLocaleString('pt-BR') : '-'
    }\n\n${asset.content}\n`
    downloadFile(`brand-os-${asset.type}.md`, content, 'text/markdown')
    toast.success(`"${asset.title}" exportado!`)
  }

  return (
    <div className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h5 className="text-xs font-bold text-white">{asset.title}</h5>
          {needsConfirmation && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> Confirme este dado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#22D3EE]/10"
          >
            {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] text-[#9494A8] hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
          ) : (
            <button
              onClick={save}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-emerald-400/10"
            >
              <Save className="w-3 h-3" /> Salvar
            </button>
          )}
          <button
            onClick={onRegenerate}
            className="text-[10px] text-[#7C5CFC] hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#7C5CFC]/10"
          >
            <RefreshCw className="w-3 h-3" /> Regenerar
          </button>
          <button
            onClick={exportAsset}
            className="text-[10px] text-[#9494A8] hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
          >
            <Download className="w-3 h-3" /> Exportar
          </button>
        </div>
      </div>

      {editing ? (
        <Textarea
          className="bg-[#1C1C27] border border-[#7C5CFC]/40 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] min-h-[120px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {asset.content}
        </p>
      )}

      <p className="text-[9px] text-[#9494A8]/70">
        v{version} — gerado em{' '}
        {generatedAt ? new Date(generatedAt).toLocaleDateString('pt-BR') : '-'}
      </p>
    </div>
  )
}

/* =====================================================================
   UTILITÁRIOS
   ===================================================================== */

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function extractPillars(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
}

function generateAssetContent(
  type: BrandAssetType,
  base: BrandProfile['base'],
  research: ResearchAnswer[],
  interview: InterviewAnswer[],
  advanced?: Record<string, string>,
): string {
  const niche = base.niche?.trim() || '[Preencha este dado]'
  const audience = base.audience?.trim() || '[Preencha este dado]'
  const result = base.result?.trim() || '[Preencha este dado]'
  const differential = base.differential?.trim() || '[Preencha este dado]'
  const service = base.service?.trim() || '[Preencha este dado]'

  const r = (key: string) => research.find((x) => x.fieldKey === key)?.value || ''
  const i = (code: string) => interview.find((x) => x.guideCode === code)?.transcript || ''
  const a = (key: string) => advanced?.[key]?.trim() || ''
  // Bloco de contexto das perguntas avançadas (só adiciona se houver conteúdo)
  const advancedContext =
    advanced && Object.values(advanced).some((v) => v?.trim())
      ? `\n\n[Contexto avançado]\n` +
        Object.entries(advanced)
          .filter(([, v]) => v?.trim())
          .map(
            ([k, v]) => `- ${ADVANCED_QUESTIONS.find((q) => q.key === k)?.label || k}: ${v.trim()}`,
          )
          .join('\n')
      : ''

  switch (type) {
    case 'posicionamento':
      return `Para ${audience} que buscam ${result}, ${service} é a alternativa que entrega ${differential} — diferente das soluções genéricas de ${niche}.${a('uma_frase') ? `\n\nFrase-resumo: "${a('uma_frase')}"` : ''}${advancedContext}`
    case 'promessa':
      return `Em até 90 dias você vai ${result.toLowerCase()}, ou seu investimento de volta. Sem promessas vazias — entregamos ${differential.toLowerCase()}.${a('maior_objecao') ? `\nObjeção principal que respondemos: ${a('maior_objecao')}.` : ''}${advancedContext}`
    case 'arquetipo':
      return `${i('G6') ? 'Baseado na sua personalidade: ' : ''}Arquétipo "O Sábio + O Guia". Você traduz complexidade de ${niche} em clareza prática e conduz o cliente até a transformação.${advancedContext}`
    case 'inimigo_narrativo':
      return `O inimigo é a abordagem superficial de ${niche} que promete rápido e entrega pouco. ${i('G4') ? 'Sua raiva do mercado sustenta essa narrativa.' : 'Combata a desinformação e o atalho ilusório.'}${a('erro_concorrentes') ? ` Erro dos concorrentes: ${a('erro_concorrentes')}.` : ''}`
    case 'tom_de_voz':
      return base.voice
        ? `${base.voice}. ${TOM_LABELS[base.voice] || ''}`
        : 'Direto, técnico-acessível e motivador. Sem jargão desnecessário, com autoridade de quem executa, não só ensina.'
    case 'vocabulario':
      return `Palavras que a marca USA: ${r('palavras_usa') || '[Preencha este dado]'}.\nPalavras que a marca NUNCA usa: ${r('palavras_nunca') || '[Preencha este dado]'}.`
    case 'storytelling':
      return i('G1')
        ? `História de origem: ${i('G1').slice(0, 320)}…`
        : `A jornada começa quando você percebeu que ${audience} precisavam de ${result}, mas as opções de ${niche} não entregavam ${differential.toLowerCase()}. Decidiu construir um caminho próprio.${a('momento_aha') ? `\n\nMomento "aha": ${a('momento_aha')}` : ''}${advancedContext}`
    case 'stack_de_prova':
      return `1. Números: ${r('clientes_ativos') || '[Preencha este dado]'} clientes ativos\n2. Cases: ${r('cases') || '[Preencha este dado]'}\n3. Depoimentos: ${r('depoimentos') || '[Preencha este dado]'}\n4. Autoridade: ${r('selos_premiacoes') || r('certificacoes') || '[Preencha este dado]'}${advancedContext}`
    case 'identidade_visual':
      return `Estilo: ${r('estilo_visual') || '[Preencha este dado]'}. Cores: ${r('cores_marca') || '[Preencha este dado]'}. Referências: ${r('referencias_visuais') || '[Preencha este dado]'}. Manter consistência em todas as peças.`
    case 'pilares_de_conteudo':
      return `1. Educação: quebre mitos de ${niche}\n2. Bastidores: mostre o método em ação\n3. Prova: casos e resultados\n4. Conexão: histórias de ${audience}\n5. Conversão: oferta e garantia`
    case 'linha_editorial':
      return `Conteúdo orientado por ${differential.toLowerCase()}. Evite clichês de ${niche}. Toda peça leva a um próximo passo claro. Foco em ${audience} que valorizam ${result.toLowerCase()}.`
    case 'bio_taglines':
      return `Bio: ${service} para ${audience}. ${result}.\nTagline 1: ${differential}\nTagline 2: ${niche} sem enrolação.\nTagline 3: O método que entrega ${result.toLowerCase()}.`
    case 'oferta_principal':
      return base.mainOffer?.trim()
        ? base.mainOffer +
            (a('porque_voce') ? `\n\nPor que escolher você: ${a('porque_voce')}` : '') +
            advancedContext
        : `${service} para ${audience}. Entrega: ${result}. Diferencial: ${differential}. Garantia: ${r('etapa_5') ? 'processo estruturado em 5 etapas' : '[Preencha este dato]'}.${a('porque_voce') ? `\n\nPor que escolher você: ${a('porque_voce')}` : ''}${advancedContext}`
    default:
      return ''
  }
}

function buildExportMarkdown(profile: BrandProfile): string {
  let md = `# Brand OS — Arquitetura de Marca\n\n`
  md += `> LUMEN Studio — Plataforma de Marketing e Vendas com IA\n\n`
  md += `- **Versão:** ${profile.activeVersion}\n`
  md += `- **Gerado em:** ${profile.lastGeneratedAt ? new Date(profile.lastGeneratedAt).toLocaleString('pt-BR') : '-'}\n`
  md += `- **Modelo:** ${profile.lastModel || '-'}\n\n`
  md += `## Base essencial\n\n`
  const b = profile.base
  md += `- Nicho: ${b.niche || '-'}\n- Subnicho: ${b.subniche || '-'}\n- Serviço: ${b.service || '-'}\n- Público: ${b.audience || '-'}\n- Resultado: ${b.result || '-'}\n- Diferencial: ${b.differential || '-'}\n- Tom de voz: ${b.voice || '-'}\n- Oferta: ${b.mainOffer || '-'}\n\n`
  md += `## Ativos de marca (${profile.assets.length})\n\n`
  for (const layer of LAYER_ORDER) {
    const assets = profile.assets.filter((a) => a.layer === layer)
    if (!assets.length) continue
    md += `### ${LAYER_LABELS[layer]}\n\n`
    for (const a of assets) {
      md += `#### ${a.title}\n\n${a.content}\n\n`
    }
  }
  return md
}
