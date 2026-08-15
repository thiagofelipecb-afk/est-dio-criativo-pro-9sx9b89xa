/**
 * Dados de demonstração para a plataforma LUMEN Studio Pro.
 *
 * Popula os 3 módulos principais (Brand OS, Funis e Gravadora) e áreas
 * relacionadas (Projetos Recentes e Agendamentos) escrevendo diretamente nas
 * mesmas chaves de localStorage que StudioContext e PlatformContext já usam.
 *
 * Não altera assinaturas de contexto — apenas grava dados. Após chamar
 * `loadDemoData()`, recarregue a página (ou reinicialize os contextos) para
 * que os providers leiam o novo estado.
 */

import type {
  BrandProfile,
  BrandAsset,
  ResearchAnswer,
  FunnelDiagnosis,
  FunnelEcosystem,
} from '@/types/platform'
import type { Project, ScheduledPost } from '@/types/studio'
import type { ScheduleEvent } from '@/types/platform'
import type { BrandOSContext } from '@/context/StudioContext'

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota errors */
  }
}

/* =====================================================================
   BRAND OS — Base Essencial + Pesquisa Completa + Ativos
   Agência fictícia "LUMEN Creators"
   ===================================================================== */

const DEMO_BASE: BrandProfile['base'] = {
  niche: 'Marketing Digital',
  subniche: 'Lançamentos de Infoprodutos',
  service: 'Copywriting e Estratégia para VSL',
  audience: 'Empreendedores digitais que vendem infoprodutos de R$97 a R$1.997',
  result: 'Dobrar a taxa de conversão de páginas de vendas',
  differential: 'Copy baseada em dados de audiência, não em suposições',
  voice: 'Autoridade', // tom de voz existente no app
  mainOffer: 'Carta de Vendas Completa com Estratégia de Anúncios',
}

const DEMO_RESEARCH: ResearchAnswer[] = [
  // Grupo 1 — Trajetória e Credenciais
  { group: 1, fieldKey: 'nome_completo', value: 'Marina Lopes' },
  { group: 1, fieldKey: 'formacao', value: 'Comunicação Social — Publicidade e Propaganda' },
  {
    group: 1,
    fieldKey: 'certificacoes',
    value: 'Copywriting de Vendas, VSL Master, Meta Blueprint',
  },
  { group: 1, fieldKey: 'tempo_atuacao', value: '6 anos' },
  { group: 1, fieldKey: 'linkedin', value: 'https://linkedin.com/in/marinalopes-copy' },

  // Grupo 2 — Esteira de Ofertas
  {
    group: 2,
    fieldKey: 'oferta_entrada',
    value: 'Mini-curso gratuito "Anatomia de uma VSL que Converte"',
  },
  {
    group: 2,
    fieldKey: 'oferta_principal',
    value: 'Carta de Vendas Completa com Estratégia de Anúncios',
  },
  { group: 2, fieldKey: 'upsell_1', value: 'Auditoria de página de vendas em vídeo' },
  { group: 2, fieldKey: 'upsell_2', value: 'Mentoria mensal de copy e tráfego' },
  { group: 2, fieldKey: 'oferta_premium', value: 'Done-for-you: gestão completa de lançamentos' },

  // Grupo 3 — Negócio e Números
  { group: 3, fieldKey: 'faturamento', value: 'R$ 85.000/mês' },
  { group: 3, fieldKey: 'ticket_medio', value: 'R$ 4.200' },
  { group: 3, fieldKey: 'clientes_ativos', value: '38' },
  { group: 3, fieldKey: 'cac', value: 'R$ 620' },
  { group: 3, fieldKey: 'ltv', value: 'R$ 14.500' },
  { group: 3, fieldKey: 'meta_12m', value: 'R$ 250.000/mês' },

  // Grupo 4 — Cliente Ideal
  { group: 4, fieldKey: 'idade_ideal', value: '28-45 anos' },
  { group: 4, fieldKey: 'genero', value: 'Misto, leve maioria feminina' },
  { group: 4, fieldKey: 'renda_media', value: 'R$ 6.000+' },
  {
    group: 4,
    fieldKey: 'dores',
    value:
      'Página de vendas que não converte, tráfego que não se traduz em vendas, copy genérica que não conecta com a audiência.',
  },
  {
    group: 4,
    fieldKey: 'objecoes',
    value:
      '"Está caro", "já tentei copy antes e não funcionou", "não tenho tempo para gravar VSL".',
  },
  {
    group: 4,
    fieldKey: 'consome_conteudo',
    value: 'Instagram, YouTube, podcasts de marketing e Telegram',
  },

  // Grupo 5 — Mercado e Concorrência
  {
    group: 5,
    fieldKey: 'concorrentes',
    value: 'Agência CopyPro, Estúdio VSL X, Copywriter Freelancer Y',
  },
  {
    group: 5,
    fieldKey: 'dif_concorrente_a',
    value: 'Oferecemos diagnóstico baseado em dados de audiência antes de escrever a copy.',
  },
  {
    group: 5,
    fieldKey: 'dif_concorrente_b',
    value: 'Integramos estratégia de anúncios à carta de vendas em um único entregável.',
  },
  {
    group: 5,
    fieldKey: 'tendencias',
    value:
      'VSLs curtas e dinâmicas, personalização por segmento de audiência e uso de IA para testar ângulos.',
  },
  {
    group: 5,
    fieldKey: 'oportunidades',
    value:
      'Infoprodutores de ticket médio (R$297-R$997) subatendidos por agências que focam só em high-ticket.',
  },

  // Grupo 6 — Vocabulário e Visual
  { group: 6, fieldKey: 'palavras_usa', value: 'conversão, dados, audiência, método, evidência' },
  { group: 6, fieldKey: 'palavras_nunca', value: 'mágico, segredo, fácil, rápido, garantido' },
  { group: 6, fieldKey: 'cores_marca', value: 'Violeta #7C5CFC e Ciano #22D3EE' },
  { group: 6, fieldKey: 'estilo_visual', value: 'Futurista' },
  { group: 6, fieldKey: 'referencias_visuais', value: 'https://dribbble.com/lumen-creators' },

  // Grupo 7 — Processo e Garantias
  { group: 7, fieldKey: 'etapa_1', value: 'Diagnóstico de audiência e coleta de dados' },
  { group: 7, fieldKey: 'etapa_2', value: 'Definição de ângulo e big idea da VSL' },
  { group: 7, fieldKey: 'etapa_3', value: 'Escrita da carta de vendas completa' },
  { group: 7, fieldKey: 'etapa_4', value: 'Estratégia de anúncios e criativos' },
  { group: 7, fieldKey: 'etapa_5', value: 'Teste A/B e otimização de conversão' },

  // Grupo 8 — Provas e Autoridade
  {
    group: 8,
    fieldKey: 'depoimentos',
    value:
      '"Dobrei minhas vendas em 30 dias com a nova VSL." — Júlia M.\n"Copy mais inteligente que já recebi." — Rafael T.',
  },
  {
    group: 8,
    fieldKey: 'cases',
    value:
      'Cliente de R$97 passou de 1.2% para 2.8% de conversão após reescrita da carta (+133% em vendas).',
  },
  { group: 8, fieldKey: 'midia', value: 'Podcast "Marketing Real", portal Infoproduto BR' },
  { group: 8, fieldKey: 'redes_seguidores', value: 'IG 32k, YT 9k' },
  { group: 8, fieldKey: 'selos_premiacoes', value: 'Top 10 Copywriters 2024 — Infoproduto Awards' },
]

const DEMO_ASSETS: BrandAsset[] = [
  {
    type: 'posicionamento',
    layer: 'quem_voce_e',
    title: 'Posicionamento',
    content:
      'A LUMEN Creators é a agência de copy e estratégia para VSL que transforma dados de audiência em páginas de vendas que convertem. Atendemos infoprodutores de R$97 a R$1.997 que querem escalar sem depender de achismos.',
  },
  {
    type: 'promessa',
    layer: 'quem_voce_e',
    title: 'Promessa',
    content:
      'Dobrar a taxa de conversão da sua página de vendas usando copy baseada em dados reais de audiência.',
  },
  {
    type: 'arquetipo',
    layer: 'quem_voce_e',
    title: 'Arquétipo',
    content: 'O Sábio — autoridade técnica que orienta com evidência e clareza, sem hype.',
  },
  {
    type: 'inimigo_narrativo',
    layer: 'quem_voce_e',
    title: 'Inimigo Narrativo',
    content:
      'O copywriting genérico feito por suposição — aquele que repete fórmulas prontas sem olhar a audiência e faz o infoprodutor queimar verba em anúncios que não convertem.',
  },
  {
    type: 'tom_de_voz',
    layer: 'como_voce_fala',
    title: 'Tom de Voz',
    content: 'Autoridade. Direto, confiante e fundamentado em expertise.',
  },
  {
    type: 'vocabulario',
    layer: 'como_voce_fala',
    title: 'Vocabulário',
    content:
      'Palavras que usamos: conversão, dados, audiência, método, evidência, diagnóstico, ângulo.\nPalavras que nunca usamos: mágico, segredo, fácil, rápido, garantido.',
  },
  {
    type: 'storytelling',
    layer: 'como_voce_fala',
    title: 'Storytelling de Origem',
    content:
      'Tudo começou quando vimos infoprodutores excelentes perderem dinheiro em anúncios por causa de copy fraca. Decidimos unir análise de dados de audiência com escrita persuasiva — e nasceu a LUMEN Creators.',
  },
  {
    type: 'stack_de_prova',
    layer: 'como_voce_prova',
    title: 'Stack de Prova',
    content:
      '1. Números: 38 clientes ativos\n2. Cases: cliente de R$97 saiu de 1.2% para 2.8% de conversão\n3. Depoimentos: "Dobrei minhas vendas em 30 dias" — Júlia M.\n4. Autoridade: Top 10 Copywriters 2024',
  },
  {
    type: 'identidade_visual',
    layer: 'como_voce_prova',
    title: 'Identidade Visual',
    content:
      'Violeta #7C5CFC e Ciano #22D3EE sobre fundos escuros (#14141C). Estilo futurista, tipografia limpa, geometria sutil e glow neon.',
  },
  {
    type: 'pilares_de_conteudo',
    layer: 'como_voce_publica',
    title: 'Pilares de Conteúdo',
    content:
      '1. Copy baseada em dados\n2. Estratégia de VSL\n3. Análise de funis\n4. Bastidores de lançamentos',
  },
  {
    type: 'linha_editorial',
    layer: 'como_voce_publica',
    title: 'Linha Editorial',
    content:
      'Conteúdo educativo e direto: mostrar o porquê por trás de cada decisão de copy, com exemplos reais e números. Sem hype, sempre ancorado em evidência.',
  },
  {
    type: 'bio_taglines',
    layer: 'como_voce_publica',
    title: 'Bio e Taglines',
    content:
      'Bio: "Copy e estratégia de VSL baseada em dados. Dobramos a conversão de infoprodutos de R$97 a R$1.997."\nTagline: "Copy com evidência, não com suposição."',
  },
  {
    type: 'oferta_principal',
    layer: 'como_voce_vende',
    title: 'Oferta Principal',
    content:
      'Carta de Vendas Completa com Estratégia de Anúncios: diagnóstico de audiência, big idea, copy completa, criativos de anúncios e teste A/B. Entrega em 14 dias.',
  },
]

/* =====================================================================
   FUNIS — Diagnóstico (Raio-X) + Ecossistema
   ===================================================================== */

const DEMO_DIAGNOSIS: FunnelDiagnosis = {
  oferta_esteira: 'Mini-curso gratuito → Carta de Vendas Completa → Mentoria → Done-for-you',
  produto_principal: 'Carta de Vendas Completa com Estratégia de Anúncios',
  ticket: '297_997',
  validacao: 'clientes_recorrentes',
  audiencia: '2k_10k',
  objetivo: 'vendas_diretas',
  horas_semana: '10_20h',
  orcamento: '2000_10000',
  faz_video: 'regularmente',
  equipe: 'equipe_enxuta',
  aquecimento: 'mista',
  nicho: 'Marketing Digital — Lançamentos de Infoprodutos',
}

const DEMO_ECOSYSTEM: FunnelEcosystem = {
  diagnosis: DEMO_DIAGNOSIS,
  status: 'recomendado',
  tese_geral:
    'Funil de vendas diretas com VSL no centro: isca de topo (mini-curso), VSL como oferta principal e upsell de mentoria para clientes recorrentes.',
  justificativas: {
    entrada: 'Mini-curso gratuito qualifica audiência e alimenta a lista para a VSL.',
    conversao: 'VSL estruturada converte audiência morna com copy baseada em dados.',
  },
  selected: [
    {
      catalogItemId: 'vsl-direto',
      etapa: 'conversao',
      justificativa: 'Ticket médio e audiência quente justificam VSL direta de vendas.',
    },
    {
      catalogItemId: 'isca-lead',
      etapa: 'entrada',
      justificativa: 'Mini-curso gratuito gera leads antes do lançamento da VSL.',
    },
  ],
  version: 1,
  createdAt: new Date().toISOString(),
}

/* =====================================================================
   PROJETOS RECENTES (StudioContext)
   ===================================================================== */

function buildDemoProjects(): Project[] {
  const now = new Date()
  const iso = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString()

  const video: Project = {
    id: uid('proj'),
    title: 'Análise de Funil — Case Completo',
    type: 'reel',
    createdAt: iso(-3600000 * 6),
    updatedAt: iso(-3600000 * 1),
    duration: 72,
    thumbnail: 'https://img.usecurling.com/p/600/1066?q=funnel+analytics+dashboard&color=purple',
    aspectRatio: '9:16',
    resolution: '1080p',
    status: 'ready', // "concluído"
    clips: [
      {
        id: uid('clip'),
        track: 'video',
        name: 'Abertura do Case',
        startTime: 0,
        duration: 12,
        sourceUrl: 'https://img.usecurling.com/p/1080/1920?q=creator+talking+studio&color=purple',
        mediaType: 'video',
        volume: 100,
      },
    ],
    subtitles: [],
    scriptText:
      'Neste vídeo eu decomponho o funil completo de um cliente — da isca à VSL — e mostro onde estava o gargalo de conversão.',
    tags: ['funil', 'case', 'copy'],
  }

  const carousel: Project = {
    id: uid('proj'),
    title: '7 Gatilhos Mentais que Vendem',
    type: 'carousel',
    createdAt: iso(-3600000 * 24),
    updatedAt: iso(-3600000 * 2),
    duration: 0,
    thumbnail: 'https://img.usecurling.com/p/1080/1350?q=marketing+triggers+neon&color=cyan',
    aspectRatio: '4:5',
    status: 'draft', // "rascunho"
    clips: [],
    subtitles: [],
    scriptText: '',
    tags: ['gatilhos', 'copy', 'carrossel'],
  }

  return [video, carousel]
}

/* =====================================================================
   AGENDAMENTOS — StudioContext (ScheduledPost) + PlatformContext (ScheduleEvent)
   ===================================================================== */

function buildDemoScheduledPosts(): ScheduledPost[] {
  const now = new Date()

  const reels: ScheduledPost = {
    id: uid('sched'),
    title: 'Review de Ferramenta',
    mediaUrl: 'https://img.usecurling.com/p/600/1066?q=app+review+screen+neon&color=purple',
    mediaType: 'video',
    platforms: ['instagram', 'tiktok'],
    scheduledDate: new Date(now.getTime() + 2 * 86400000).toISOString(),
    caption:
      'Testei a ferramenta de copy com IA por 7 dias e o resultado surpreendeu. Salve este reels! 🚀',
    hashtags: ['#copywriting', '#ferramentas', '#marketingdigital', '#lumencreators'],
    status: 'scheduled',
    analyticsEstimate: { views: 28000, likes: 1900, engagementRate: '7.2%' },
  }

  const post: ScheduledPost = {
    id: uid('sched'),
    title: 'Dica de Copy',
    mediaUrl: 'https://img.usecurling.com/p/1080/1080?q=copywriting+tip+quote&color=cyan',
    mediaType: 'post',
    platforms: ['instagram'],
    scheduledDate: new Date(now.getTime() + 5 * 86400000).toISOString(),
    caption:
      'A diferença entre uma headline genérica e uma baseada em dados de audiência? Tudo. 🧠 Comente "COPY" que eu te mando o comparativo.',
    hashtags: ['#copy', '#headline', '#conversao', '#lumencreators'],
    status: 'scheduled',
    analyticsEstimate: { views: 15400, likes: 1100, engagementRate: '8.5%' },
  }

  return [reels, post]
}

function buildDemoScheduleEvents(): ScheduleEvent[] {
  const now = new Date()
  return [
    {
      id: uid('evt'),
      title: 'Reels — Review de Ferramenta',
      date: new Date(now.getTime() + 2 * 86400000).toISOString(),
      channel: 'Instagram + TikTok',
      status: 'planejado',
    },
    {
      id: uid('evt'),
      title: 'Post Estático — Dica de Copy',
      date: new Date(now.getTime() + 5 * 86400000).toISOString(),
      channel: 'Instagram',
      status: 'planejado',
    },
  ]
}

/* =====================================================================
   PONTO DE ENTRADA
   ===================================================================== */

/**
 * Popula todos os dados de demonstração no localStorage.
 * Retorna `true` se a operação foi concluída com sucesso.
 */
export function loadDemoData(): boolean {
  // ---- Brand OS (PlatformContext: lumen_brand_profile) ----
  const existing = readJSON<BrandProfile>('lumen_brand_profile', {
    base: DEMO_BASE,
    research: [],
    interview: [],
    assets: [],
    activeVersion: 0,
    versions: [],
    lastGeneratedAt: null,
    lastModel: null,
    lastDurationMs: null,
  })

  const nowIso = new Date().toISOString()

  const brandProfile: BrandProfile = {
    ...existing,
    base: DEMO_BASE,
    research: DEMO_RESEARCH,
    assets: DEMO_ASSETS,
    activeVersion: 1,
    versions: [
      {
        version: 1,
        snapshot: {
          base: DEMO_BASE,
          research: DEMO_RESEARCH,
          interview: existing.interview || [],
        },
        createdAt: nowIso,
      },
    ],
    lastGeneratedAt: nowIso,
    lastModel: 'lumen-ia-v3 (demo)',
    lastDurationMs: 2400,
  }
  writeJSON('lumen_brand_profile', brandProfile)

  // Rascunho da pesquisa (Posicionamento lê esta chave para restaurar)
  writeJSON('lumen_posicionamento_research_draft', DEMO_RESEARCH)

  // ---- Brand OS resumido (StudioContext: lumen_brand_os) ----
  const promessa = DEMO_ASSETS.find((a) => a.type === 'promessa')?.content || DEMO_BASE.result
  const pilaresAsset = DEMO_ASSETS.find((a) => a.type === 'pilares_de_conteudo')
  const linhaAsset = DEMO_ASSETS.find((a) => a.type === 'linha_editorial')
  const brandOSSummary: BrandOSContext = {
    brandName: 'LUMEN Creators',
    niche: DEMO_BASE.niche,
    promise: promessa,
    voice: DEMO_BASE.voice,
    audience: DEMO_BASE.audience,
    contentPillars: [
      'Copy baseada em dados',
      'Estratégia de VSL',
      'Análise de funis',
      'Bastidores de lançamentos',
    ],
    editorialLine: linhaAsset?.content || '',
    activeVersion: 1,
    generatedAt: nowIso,
  }
  writeJSON('lumen_brand_os', brandOSSummary)

  // ---- Funis (PlatformContext) ----
  writeJSON('lumen_funnel_diagnosis', { current: DEMO_DIAGNOSIS, versions: [] })
  writeJSON('lumen_funnel_ecosystem', DEMO_ECOSYSTEM)

  // ---- Projetos Recentes (StudioContext: lumen_projects) ----
  const projects = readJSON<Project[]>('lumen_projects', [])
  // evita duplicar caso já tenha sido carregado
  const hasDemoVideo = projects.some((p) => p.title === 'Análise de Funil — Case Completo')
  if (!hasDemoVideo) {
    writeJSON('lumen_projects', [...buildDemoProjects(), ...projects])
  }

  // ---- Agendamentos (StudioContext: lumen_scheduled) ----
  const scheduled = readJSON<ScheduledPost[]>('lumen_scheduled', [])
  const hasDemoReels = scheduled.some((p) => p.title === 'Review de Ferramenta')
  if (!hasDemoReels) {
    writeJSON('lumen_scheduled', [...buildDemoScheduledPosts(), ...scheduled])
  }

  // ---- Agenda (PlatformContext: lumen_schedule_events) ----
  const events = readJSON<ScheduleEvent[]>('lumen_schedule_events', [])
  const hasDemoEvt = events.some((e) => e.title?.includes('Review de Ferramenta'))
  if (!hasDemoEvt) {
    writeJSON('lumen_schedule_events', [...buildDemoScheduleEvents(), ...events])
  }

  // Marca flag para o botão sumir após recarregar
  writeJSON('lumen_demo_loaded', { at: nowIso })

  return true
}

export default loadDemoData
