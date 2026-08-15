import {
  BrandProfile,
  KeyResult,
  Objective,
  OKRSet,
  OKRStatus,
  ResearchAnswer,
} from '@/types/platform'

/* =====================================================================
   Gerador de OKRs estratégicos a partir do Brand OS.
   - Analisa base + research + interview + assets
   - Gera 4-6 objetivos coerentes com o nicho e metas
   - Cada objetivo tem 2-4 key results com targets realistas
   - IDs determinísticos (prefixo + índice) p/ permitir preservar
     valores atuais (current) ao regenerar
   ===================================================================== */

const uid = (prefix: string, i: number) =>
  `${prefix}-${i}-${Math.random().toString(36).slice(2, 8)}`

function krStatus(progress: number): OKRStatus {
  if (progress >= 100) return 'concluido'
  if (progress > 0) return 'em_progresso'
  return 'nao_iniciado'
}

function makeKR(
  id: string,
  description: string,
  target: number,
  unit: string,
  current = 0,
): KeyResult {
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return {
    id,
    description,
    target,
    current,
    unit,
    status: krStatus(progress),
    progress,
  }
}

function objStatus(krs: KeyResult[]): OKRStatus {
  if (krs.length === 0) return 'nao_iniciado'
  if (krs.every((k) => k.status === 'concluido')) return 'concluido'
  if (krs.some((k) => k.status === 'em_risco')) return 'em_risco'
  if (krs.some((k) => k.status === 'em_progresso' || k.status === 'concluido'))
    return 'em_progresso'
  return 'nao_iniciado'
}

function objProgress(krs: KeyResult[]): number {
  if (krs.length === 0) return 0
  return Math.round(krs.reduce((s, k) => s + k.progress, 0) / krs.length)
}

/* ---- Helpers de parsing de números da pesquisa ---- */
function parseMoney(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/R\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseCount(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d]/g, '')
  const n = parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : null
}

function researchVal(research: ResearchAnswer[], key: string): string {
  return research.find((r) => r.fieldKey === key)?.value || ''
}

/* =====================================================================
   Gerador principal
   ===================================================================== */
export function generateOKRs(brandProfile: BrandProfile, previous?: OKRSet | null): OKRSet {
  const base = brandProfile.base
  const research = brandProfile.research

  const niche = base.niche?.trim() || 'marca'
  const audience = base.audience?.trim() || 'seu público'
  const service = base.service?.trim() || base.mainOffer?.trim() || 'sua oferta'

  // Mapa de KRs anteriores por descrição para preservar "current"
  const prevByDesc = new Map<string, KeyResult>()
  if (previous?.objectives) {
    for (const o of previous.objectives) {
      for (const k of o.keyResults) {
        prevByDesc.set(k.description, k)
      }
    }
  }

  const carry = (description: string, target: number, unit: string): number => {
    const prev = prevByDesc.get(description)
    if (prev && prev.target === target) return prev.current
    return 0
  }

  /* ---- Métricas base da pesquisa ---- */
  const faturamento = parseMoney(researchVal(research, 'faturamento')) ?? 0
  const ticketMedio = parseMoney(researchVal(research, 'ticket_medio')) ?? 0
  const clientesAtivos = parseCount(researchVal(research, 'clientes_ativos')) ?? 0
  const meta12m = parseMoney(researchVal(research, 'meta_12m')) ?? 0

  // Meta de receita: se houver meta_12m, usá-la; senão 2x faturamento atual; mínimo R$30k
  const targetReceita = meta12m > 0 ? meta12m : faturamento > 0 ? faturamento * 2 : 30000
  // Meta de clientes: baseada em ticket médio ou clientes ativos
  const targetClientes =
    clientesAtivos > 0
      ? Math.round(clientesAtivos * 1.6)
      : ticketMedio > 0
        ? Math.round(targetReceita / ticketMedio)
        : 20
  // Responsável padrão: nome da pesquisa, ou "Você"
  const responsavelPadrao = researchVal(research, 'nome_completo').split(' ')[0] || 'Você'

  const objectives: Objective[] = []
  let idx = 0
  const now = new Date().toISOString()

  /* ---- O1 — Crescimento de Receita ---- */
  {
    idx++
    const krs: KeyResult[] = [
      makeKR(
        uid('kr-receita', idx),
        `Atingir R$ ${targetReceita.toLocaleString('pt-BR')}/mês de faturamento recorrente`,
        targetReceita,
        'R$',
        carry(
          `Atingir R$ ${targetReceita.toLocaleString('pt-BR')}/mês de faturamento recorrente`,
          targetReceita,
          'R$',
        ),
      ),
      makeKR(
        uid('kr-receita', idx + 1),
        `Elevar ticket médio para R$ ${(ticketMedio > 0 ? ticketMedio * 1.3 : 2500).toLocaleString('pt-BR')}`,
        ticketMedio > 0 ? Math.round(ticketMedio * 1.3) : 2500,
        'R$',
        carry(
          `Elevar ticket médio para R$ ${(ticketMedio > 0 ? ticketMedio * 1.3 : 2500).toLocaleString('pt-BR')}`,
          ticketMedio > 0 ? Math.round(ticketMedio * 1.3) : 2500,
          'R$',
        ),
      ),
      makeKR(
        uid('kr-receita', idx + 2),
        `Fechar ${Math.max(4, Math.round(targetClientes / 4))} novas vendas por mês`,
        Math.max(4, Math.round(targetClientes / 4)),
        'vendas',
        carry(
          `Fechar ${Math.max(4, Math.round(targetClientes / 4))} novas vendas por mês`,
          Math.max(4, Math.round(targetClientes / 4)),
          'vendas',
        ),
      ),
    ]
    objectives.push({
      id: uid('obj-crescimento', idx),
      title: 'Crescimento de Receita',
      description: `Escalar o faturamento de ${niche} até a meta de 12 meses, elevando ticket médio e volume de vendas de ${service}.`,
      category: 'crescimento',
      responsavel: responsavelPadrao,
      prazo: '12 meses',
      keyResults: krs,
      status: objStatus(krs),
      progress: objProgress(krs),
      createdAt: now,
    })
  }

  /* ---- O2 — Audiência e Presença ---- */
  {
    idx++
    const targetSeg = 10000
    const krs: KeyResult[] = [
      makeKR(
        uid('kr-audiencia', idx),
        `Atingir ${targetSeg.toLocaleString('pt-BR')} seguidores qualificados no Instagram`,
        targetSeg,
        'seguidores',
        carry(
          `Atingir ${targetSeg.toLocaleString('pt-BR')} seguidores qualificados no Instagram`,
          targetSeg,
          'seguidores',
        ),
      ),
      makeKR(
        uid('kr-audiencia', idx + 1),
        'Publicar 3 posts/reels por semana consistentemente',
        156, // 3/semana * 52
        'posts',
        carry('Publicar 3 posts/reels por semana consistentemente', 156, 'posts'),
      ),
      makeKR(
        uid('kr-audiencia', idx + 2),
        `Gerar ${Math.max(200, Math.round(targetClientes * 5))} leads/mês via conteúdo orgânico`,
        Math.max(200, Math.round(targetClientes * 5)),
        'leads',
        carry(
          `Gerar ${Math.max(200, Math.round(targetClientes * 5))} leads/mês via conteúdo orgânico`,
          Math.max(200, Math.round(targetClientes * 5)),
          'leads',
        ),
      ),
    ]
    objectives.push({
      id: uid('obj-audiencia', idx),
      title: 'Construção de Audiência',
      description: `Expandir a audiência de ${audience} com conteúdo estratégico e geração de leads orgânicos em ${niche}.`,
      category: 'audiencia',
      responsavel: responsavelPadrao,
      prazo: '6 meses',
      keyResults: krs,
      status: objStatus(krs),
      progress: objProgress(krs),
      createdAt: now,
    })
  }

  /* ---- O3 — Marca e Autoridade ---- */
  {
    idx++
    const krs: KeyResult[] = [
      makeKR(
        uid('kr-marca', idx),
        'Documentar e padronizar 100% dos 13 ativos de marca (Brand OS)',
        13,
        'ativos',
        carry('Documentar e padronizar 100% dos 13 ativos de marca (Brand OS)', 13, 'ativos'),
      ),
      makeKR(
        uid('kr-marca', idx + 1),
        'Coletar 10 depoimentos em vídeo de clientes satisfeitos',
        10,
        'depoimentos',
        carry('Coletar 10 depoimentos em vídeo de clientes satisfeitos', 10, 'depoimentos'),
      ),
      makeKR(
        uid('kr-marca', idx + 2),
        'Publicar 2 cases de sucesso detalhados por trimestre',
        8,
        'cases',
        carry('Publicar 2 cases de sucesso detalhados por trimestre', 8, 'cases'),
      ),
    ]
    objectives.push({
      id: uid('obj-marca', idx),
      title: 'Autoridade de Marca',
      description: `Solidificar o posicionamento de marca em ${niche} através de provas, cases e consistência visual/narrativa.`,
      category: 'marca',
      responsavel: responsavelPadrao,
      prazo: '12 meses',
      keyResults: krs,
      status: objStatus(krs),
      progress: objProgress(krs),
      createdAt: now,
    })
  }

  /* ---- O4 — Vendas e Conversão ---- */
  {
    idx++
    const targetTaxa = 25
    const krs: KeyResult[] = [
      makeKR(
        uid('kr-vendas', idx),
        `Atingir ${targetTaxa}% de taxa de conversão em chamadas de vendas`,
        targetTaxa,
        '%',
        carry(`Atingir ${targetTaxa}% de taxa de conversão em chamadas de vendas`, targetTaxa, '%'),
      ),
      makeKR(
        uid('kr-vendas', idx + 1),
        `Realizar ${Math.max(8, Math.round(targetClientes / 2))} reuniões de diagnóstico por mês`,
        Math.max(8, Math.round(targetClientes / 2)),
        'reunioes',
        carry(
          `Realizar ${Math.max(8, Math.round(targetClientes / 2))} reuniões de diagnóstico por mês`,
          Math.max(8, Math.round(targetClientes / 2)),
          'reunioes',
        ),
      ),
      makeKR(
        uid('kr-vendas', idx + 2),
        `Fechar ${targetClientes} clientes ativos simultâneos`,
        targetClientes,
        'clientes',
        carry(`Fechar ${targetClientes} clientes ativos simultâneos`, targetClientes, 'clientes'),
      ),
    ]
    objectives.push({
      id: uid('obj-vendas', idx),
      title: 'Máquina de Vendas',
      description: `Estruturar um funil de vendas previsível para ${service}, do lead ao fechamento, com metas claras de conversão.`,
      category: 'vendas',
      responsavel: responsavelPadrao,
      prazo: '6 meses',
      keyResults: krs,
      status: objStatus(krs),
      progress: objProgress(krs),
      createdAt: now,
    })
  }

  /* ---- O5 — Produto / Entrega ---- */
  {
    idx++
    const krs: KeyResult[] = [
      makeKR(
        uid('kr-produto', idx),
        'Entregar 100% das promessas da oferta dentro do prazo combinado',
        100,
        '%',
        carry('Entregar 100% das promessas da oferta dentro do prazo combinado', 100, '%'),
      ),
      makeKR(
        uid('kr-produto', idx + 1),
        'Manter NPS de clientes acima de 8',
        9,
        'pontos',
        carry('Manter NPS de clientes acima de 8', 9, 'pontos'),
      ),
      makeKR(
        uid('kr-produto', idx + 2),
        'Reduzir churn para menos de 5% ao mês',
        5,
        '%',
        carry('Reduzir churn para menos de 5% ao mês', 5, '%'),
      ),
    ]
    objectives.push({
      id: uid('obj-produto', idx),
      title: 'Excelência na Entrega',
      description: `Garantir qualidade e retenção no delivery de ${service}, sustentando o crescimento sem perder padrão.`,
      category: 'produto',
      responsavel: responsavelPadrao,
      prazo: '12 meses',
      keyResults: krs,
      status: objStatus(krs),
      progress: objProgress(krs),
      createdAt: now,
    })
  }

  /* ---- O6 — Receita Recorrente (só se houver upsell/recurrência na pesquisa) ---- */
  if (researchVal(research, 'upsell_2') || researchVal(research, 'oferta_premium')) {
    idx++
    const targetRecorr = Math.max(5000, Math.round(targetReceita * 0.3))
    const krs: KeyResult[] = [
      makeKR(
        uid('kr-receita-rec', idx),
        `Construir R$ ${targetRecorr.toLocaleString('pt-BR')}/mês em receita recorrente`,
        targetRecorr,
        'R$',
        carry(
          `Construir R$ ${targetRecorr.toLocaleString('pt-BR')}/mês em receita recorrente`,
          targetRecorr,
          'R$',
        ),
      ),
      makeKR(
        uid('kr-receita-rec', idx + 1),
        `Ativar ${Math.max(10, Math.round(targetClientes / 3))} assinantes ativos`,
        Math.max(10, Math.round(targetClientes / 3)),
        'assinantes',
        carry(
          `Ativar ${Math.max(10, Math.round(targetClientes / 3))} assinantes ativos`,
          Math.max(10, Math.round(targetClientes / 3)),
          'assinantes',
        ),
      ),
    ]
    objectives.push({
      id: uid('obj-receita-rec', idx),
      title: 'Receita Recorrente',
      description: `Diversificar a receita com uma camada de recorrência (assinatura/mastermind) sobre ${service}.`,
      category: 'receita',
      responsavel: responsavelPadrao,
      prazo: '12 meses',
      keyResults: krs,
      status: objStatus(krs),
      progress: objProgress(krs),
      createdAt: now,
    })
  }

  return {
    id: uid('okrset', Date.now()),
    brandProfileVersion: brandProfile.activeVersion,
    objectives,
    generatedAt: now,
    lastUpdatedAt: now,
  }
}
