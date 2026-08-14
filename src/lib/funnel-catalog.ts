import {
  FunnelCatalogItem,
  FunnelDiagnosis,
  FunnelEcosystem,
  TicketFaixa,
  AudienciaFaixa,
} from '@/types/platform'

/* =====================================================================
   CATÁLOGO DE FUNIS — 21 modelos obrigatórios
   ---------------------------------------------------------------------
   Extensível: basta adicionar um novo objeto ao array FUNNEL_CATALOG
   abaixo (sem necessidade de alterar estrutura/tipos nem redeploy).
   ===================================================================== */

export const FUNNEL_CATALOG: FunnelCatalogItem[] = [
  // ---------------- ENTRADA ----------------
  {
    id: 'reativacao_base',
    nome: 'Reativação de Base',
    descricao:
      'Email/mensagem para lista fria — reativa contatos parados com sequência de valor + oferta.',
    etapa: 'entrada',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Ter lista de contatos'],
    ativos_necessarios: ['oferta_principal', 'pilares_de_conteudo'],
    status: 'ativo',
    categoria: 'Relacionamento',
    dificuldade: 'iniciante',
    tempo_estimado: '1-2 semanas',
    audiencia_minima: '500_2k',
  },
  {
    id: 'isca_digital',
    nome: 'Isca Digital',
    descricao: 'Lead magnet gratuito → sequência de email → oferta de venda. Clássico de captura.',
    etapa: 'entrada',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Criar material gratuito'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'iniciante',
    tempo_estimado: '2-3 semanas',
  },
  {
    id: 'reels_manychat',
    nome: 'Reels + ManyChat',
    descricao:
      'Reels com automação de DM — comentário dispara mensagem automática com oferta/isca.',
    etapa: 'entrada',
    faixas_ticket: ['ate_97', '97_297', '297_997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['pilares_de_conteudo', 'linha_editorial'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'intermediario',
    tempo_estimado: '1-2 semanas',
  },
  {
    id: 'nissin_miojo',
    nome: 'Nissin Miojo',
    descricao: 'Vídeo curto de alta conversão → link → checkout. Oferta rápida de baixo ticket.',
    etapa: 'entrada',
    faixas_ticket: ['ate_97', '97_297'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['oferta_principal', 'bio_taglines'],
    status: 'ativo',
    categoria: 'Híbrido',
    dificuldade: 'intermediario',
    tempo_estimado: '1-2 semanas',
  },
  {
    id: 'diagnostico_publico',
    nome: 'Diagnóstico Público',
    descricao: 'Análise aberta em vídeo/post → atrai qualificados → agendamento de call.',
    etapa: 'entrada',
    faixas_ticket: ['297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['stack_de_prova', 'posicionamento'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'avancado',
    tempo_estimado: '2-4 semanas',
  },
  {
    id: 'jornada_documentada',
    nome: 'Jornada Documentada',
    descricao: 'Storytelling de bastidores — documenta processo real e atrai por autenticidade.',
    etapa: 'entrada',
    faixas_ticket: ['97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['storytelling', 'pilares_de_conteudo'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'intermediario',
    tempo_estimado: '4-8 semanas',
  },
  {
    id: 'ia_em_acao',
    nome: 'IA em Ação',
    descricao: 'Demonstra uso de IA aplicada ao nicho — diferencial moderno e atrai atenção.',
    etapa: 'entrada',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['pilares_de_conteudo', 'linha_editorial'],
    status: 'beta',
    categoria: 'Orgânico',
    dificuldade: 'avancado',
    tempo_estimado: '2-4 semanas',
  },
  {
    id: 'tripwire',
    nome: 'Tripwire',
    descricao: 'Oferta de entrada R$7–R$47 imediatamente após captura — converte lead em cliente.',
    etapa: 'entrada',
    faixas_ticket: ['ate_97', '97_297'],
    requisitos: ['Criar material gratuito'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova'],
    status: 'ativo',
    categoria: 'Híbrido',
    dificuldade: 'intermediario',
    tempo_estimado: '1-2 semanas',
  },
  {
    id: 'emprestimo_audiencia',
    nome: 'Empréstimo de Audiência',
    descricao:
      'Collab/lives com parceiros — empresta audiência de outro perfil para acelerar captura.',
    etapa: 'entrada',
    faixas_ticket: ['97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Ter parceiros'],
    ativos_necessarios: ['posicionamento', 'bio_taglines'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'intermediario',
    tempo_estimado: '2-4 semanas',
    audiencia_minima: '0_500',
  },
  // ---------------- NUTRIÇÃO ----------------
  {
    id: 'destaques_sequencia',
    nome: 'Destaques em Sequência',
    descricao: 'Stories organizados em destaques do Instagram como uma jornada guiada.',
    etapa: 'nutricao',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: [],
    ativos_necessarios: ['linha_editorial', 'pilares_de_conteudo'],
    status: 'ativo',
    categoria: 'Relacionamento',
    dificuldade: 'iniciante',
    tempo_estimado: '1-2 semanas',
  },
  {
    id: 'conteudo_fixado',
    nome: 'Conteúdo Fixado',
    descricao: 'Posts fixados no perfil que conduzem o visitante pela narrativa principal.',
    etapa: 'nutricao',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: [],
    ativos_necessarios: ['linha_editorial', 'posicionamento'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'iniciante',
    tempo_estimado: '1 semana',
  },
  {
    id: 'serie_semanal',
    nome: 'Série Semanal',
    descricao: 'Conteúdo seriado recorrente que cria expectativa e hábito de consumo.',
    etapa: 'nutricao',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['pilares_de_conteudo', 'storytelling'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'intermediario',
    tempo_estimado: '4-8 semanas',
  },
  {
    id: 'broadcast',
    nome: 'Broadcast',
    descricao: 'Lista de transmissão (Instagram/WhatsApp) para nutrir base com conteúdo direto.',
    etapa: 'nutricao',
    faixas_ticket: ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Ter lista de contatos'],
    ativos_necessarios: ['linha_editorial', 'pilares_de_conteudo'],
    status: 'ativo',
    categoria: 'Relacionamento',
    dificuldade: 'iniciante',
    tempo_estimado: '1-2 semanas',
    audiencia_minima: '500_2k',
  },
  {
    id: 'close_friends_vip',
    nome: 'Close Friends VIP',
    descricao: 'Grupo exclusivo no Instagram (Close Friends) como área VIP de nutrição.',
    etapa: 'nutricao',
    faixas_ticket: ['97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Ter lista de contatos'],
    ativos_necessarios: ['linha_editorial', 'pilares_de_conteudo'],
    status: 'ativo',
    categoria: 'Relacionamento',
    dificuldade: 'intermediario',
    tempo_estimado: '2-3 semanas',
    audiencia_minima: '500_2k',
  },
  // ---------------- CONVERSÃO ----------------
  {
    id: 'diagnostico',
    nome: 'Diagnóstico',
    descricao: 'Aplicação/quiz → resultado personalizado → oferta. Qualifica e converte.',
    etapa: 'conversao',
    faixas_ticket: ['297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Criar formulário'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova'],
    status: 'ativo',
    categoria: 'Híbrido',
    dificuldade: 'intermediario',
    tempo_estimado: '2-4 semanas',
  },
  {
    id: 'link_bio_vsl',
    nome: 'Link na Bio VSL',
    descricao: 'Bio → página de vendas em vídeo (VSL). Conversão por vídeo de venda evergreen.',
    etapa: 'conversao',
    faixas_ticket: ['97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova', 'bio_taglines'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'avancado',
    tempo_estimado: '3-5 semanas',
  },
  {
    id: 'link_bio_carta',
    nome: 'Link na Bio Carta de Vendas',
    descricao: 'Bio → carta de vendas long copy. Conversão por copywriting persuasivo.',
    etapa: 'conversao',
    faixas_ticket: ['97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Escrever copy'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova', 'bio_taglines'],
    status: 'ativo',
    categoria: 'Orgânico',
    dificuldade: 'avancado',
    tempo_estimado: '2-4 semanas',
  },
  {
    id: 'grupo_whatsapp',
    nome: 'Grupo WhatsApp + Aquecimento',
    descricao: 'Comunidade no WhatsApp com aquecimento → oferta. Conversão por relacionamento.',
    etapa: 'conversao',
    faixas_ticket: ['ate_97', '97_297', '297_997'],
    requisitos: ['Ter lista de contatos'],
    ativos_necessarios: ['oferta_principal', 'pilares_de_conteudo'],
    status: 'ativo',
    categoria: 'Relacionamento',
    dificuldade: 'intermediario',
    tempo_estimado: '2-4 semanas',
    audiencia_minima: '500_2k',
  },
  {
    id: 'aplicacao_formulario',
    nome: 'Aplicação/Formulário',
    descricao: 'Formulário seletivo → call de vendas. Aprovação cria escassez e qualifica.',
    etapa: 'conversao',
    faixas_ticket: ['997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Criar formulário'],
    ativos_necessarios: ['oferta_principal', 'posicionamento'],
    status: 'ativo',
    categoria: 'Híbrido',
    dificuldade: 'intermediario',
    tempo_estimado: '1-2 semanas',
  },
  {
    id: 'webinario_aula_vivo',
    nome: 'Webinar/Aula ao Vivo',
    descricao: 'Evento ao vivo → pitch de venda. Alta conversão por autoridade e urgência.',
    etapa: 'conversao',
    faixas_ticket: ['297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova', 'storytelling'],
    status: 'ativo',
    categoria: 'Híbrido',
    dificuldade: 'avancado',
    tempo_estimado: '3-5 semanas',
    audiencia_minima: '2k_10k',
  },
  {
    id: 'aula_gravada_aplicacao',
    nome: 'Aula Gravada + Aplicação',
    descricao: 'Replay de aula evergreen → formulário → call. Conversão evergreen escalável.',
    etapa: 'conversao',
    faixas_ticket: ['297_997', '997_2497', '2497_9997', 'acima_9997'],
    requisitos: ['Fazer vídeos', 'Criar formulário'],
    ativos_necessarios: ['oferta_principal', 'stack_de_prova', 'storytelling'],
    status: 'ativo',
    categoria: 'Híbrido',
    dificuldade: 'avancado',
    tempo_estimado: '3-6 semanas',
  },
]

/* =====================================================================
   ELEGIBILIDADE — função pura e testável
   ===================================================================== */

// Ordem crescente de audiência (índice), usada para comparar mínimos
const AUDIENCIA_ORDEM: AudienciaFaixa[] = [
  '0_500',
  '500_2k',
  '2k_10k',
  '10k_50k',
  '50k_200k',
  '200k_mais',
]

export interface EligibilityResult {
  elegivel: boolean
  motivo?: string
}

export function isFunnelEligible(
  funnel: FunnelCatalogItem,
  diagnosis: FunnelDiagnosis,
): EligibilityResult {
  // 1) Ticket dentro das faixas do funil
  if (diagnosis.ticket) {
    if (!funnel.faixas_ticket.includes(diagnosis.ticket as TicketFaixa)) {
      return {
        elegivel: false,
        motivo: `Ticket ${labelTicket(diagnosis.ticket)} fora das faixas atendidas por este funil.`,
      }
    }
  }

  // 2) Requisitos textuais
  for (const req of funnel.requisitos) {
    const r = req.toLowerCase()
    if (r.includes('vídeo') || r.includes('video')) {
      if (diagnosis.faz_video === 'nao_gravo') {
        return {
          elegivel: false,
          motivo: 'Requer gravar vídeos, mas o diagnóstico indica "Não gravo vídeos".',
        }
      }
    }
    if (r.includes('lista de contatos')) {
      // Audiência mínima para "ter lista": ao menos 500_2k
      const idx = diagnosis.audiencia
        ? AUDIENCIA_ORDEM.indexOf(diagnosis.audiencia as AudienciaFaixa)
        : -1
      if (idx < 1) {
        return {
          elegivel: false,
          motivo: 'Requer lista de contatos, mas a audiência atual é muito pequena.',
        }
      }
    }
    if (r.includes('parceiro')) {
      // Empréstimo de audiência exige solo/equipe que consiga collab — não bloqueia por equipe,
      // mas exige audiência mínima pequena (já tratada por audiencia_minima abaixo).
    }
    if (r.includes('copy')) {
      // Sem bloqueio duro — copy pode ser produzida. Mantém elegível.
    }
    if (r.includes('formulário') || r.includes('formulario')) {
      // Sem bloqueio — ferramenta. Mantém elegível.
    }
    if (r.includes('material gratuito')) {
      // Sem bloqueio — pode ser criado. Mantém elegível.
    }
  }

  // 3) Audiência mínima exigida pelo funil
  if (funnel.audiencia_minima && diagnosis.audiencia) {
    const minIdx = AUDIENCIA_ORDEM.indexOf(funnel.audiencia_minima)
    const curIdx = AUDIENCIA_ORDEM.indexOf(diagnosis.audiencia as AudienciaFaixa)
    if (curIdx < minIdx) {
      return {
        elegivel: false,
        motivo: `Audiência atual (${labelAudiencia(
          diagnosis.audiencia,
        )}) menor que o mínimo exigido (${labelAudiencia(funnel.audiencia_minima)}).`,
      }
    }
  }

  return { elegivel: true }
}

export function eligibleFunnels(diagnosis: FunnelDiagnosis): FunnelCatalogItem[] {
  return FUNNEL_CATALOG.filter(
    (f) => f.status !== 'em_breve' && isFunnelEligible(f, diagnosis).elegivel,
  )
}

// Lista apenas elegíveis para uma etapa específica
export function eligibleFunnelsForStage(
  diagnosis: FunnelDiagnosis,
  etapa: 'entrada' | 'nutricao' | 'conversao',
): FunnelCatalogItem[] {
  return eligibleFunnels(diagnosis).filter((f) => f.etapa === etapa)
}

/* =====================================================================
   RECOMENDAÇÃO POR IA — monta o ecossistema em 3 camadas
   ===================================================================== */

export function recommendFunnels(
  diagnosis: FunnelDiagnosis,
  brandContext?: { nicho?: string; oferta?: string; voz?: string; diferencial?: string },
): FunnelEcosystem {
  const eligible = eligibleFunnels(diagnosis)

  // Prioriza por dificuldade compatível com horas/equipe + status ativo
  const rank = (f: FunnelCatalogItem): number => {
    let score = 0
    if (f.status === 'ativo') score += 3
    if (f.status === 'beta') score += 1
    if (f.dificuldade === 'iniciante') score += 2
    if (f.dificuldade === 'intermediario') score += 1
    // Audiência quente favorece funis de conversão direta
    if (diagnosis.aquecimento === 'quente' && f.etapa === 'conversao') score += 2
    if (diagnosis.aquecimento === 'fria' && f.etapa === 'entrada') score += 1
    // Objetivo influencia a camada
    if (diagnosis.objetivo === 'vendas_diretas' && f.etapa === 'conversao') score += 2
    if (diagnosis.objetivo === 'aquisicao_leads' && f.etapa === 'entrada') score += 2
    if (diagnosis.objetivo === 'nutricao_relacionamento' && f.etapa === 'nutricao') score += 2
    if (diagnosis.objetivo === 'lancamento' && f.etapa === 'conversao') score += 1
    // Faz vídeo favorece funis que exigem vídeo
    if (diagnosis.faz_video && diagnosis.faz_video !== 'nao_gravo') {
      if (f.requisitos.some((r) => r.toLowerCase().includes('vídeo'))) score += 1
    }
    return score
  }

  const entrada = eligible
    .filter((f) => f.etapa === 'entrada')
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, 2)
  const nutricao = eligible
    .filter((f) => f.etapa === 'nutricao')
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, 2)
  const conversao = eligible
    .filter((f) => f.etapa === 'conversao')
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, 2)

  const selected = [
    ...entrada.map((f) => ({
      catalogItemId: f.id,
      etapa: 'entrada' as const,
      justificativa: justificativaPara(f, diagnosis, brandContext, 'entrada'),
    })),
    ...nutricao.map((f) => ({
      catalogItemId: f.id,
      etapa: 'nutricao' as const,
      justificativa: justificativaPara(f, diagnosis, brandContext, 'nutricao'),
    })),
    ...conversao.map((f) => ({
      catalogItemId: f.id,
      etapa: 'conversao' as const,
      justificativa: justificativaPara(f, diagnosis, brandContext, 'conversao'),
    })),
  ]

  const justificativas: Record<string, string> = {}
  selected.forEach((s) => {
    justificativas[s.catalogItemId] = s.justificativa
  })

  const tese = teseGeral(diagnosis, brandContext, { entrada, nutricao, conversao })

  return {
    diagnosis,
    status: 'recomendado',
    tese_geral: tese,
    justificativas,
    selected,
    version: 1,
    createdAt: new Date().toISOString(),
    approvedAt: null,
  }
}

/* =====================================================================
   GERADORES DE TEXTO CONTEXTUAL (simula IA, usa Raio-X + Brand OS)
   ===================================================================== */

function teseGeral(
  d: FunnelDiagnosis,
  brand: { nicho?: string; oferta?: string; voz?: string; diferencial?: string } | undefined,
  layers: {
    entrada: FunnelCatalogItem[]
    nutricao: FunnelCatalogItem[]
    conversao: FunnelCatalogItem[]
  },
): string {
  const nicho = d.nicho || brand?.nicho || 'seu nicho'
  const oferta = d.produto_principal || brand?.oferta || 'sua oferta principal'
  const ticket = d.ticket ? labelTicket(d.ticket) : 'ticket não definido'
  const validacao = d.validacao ? labelValidacao(d.validacao) : 'validação pendente'
  const audiencia = d.audiencia ? labelAudiencia(d.audiencia) : 'audiência não informada'
  const objetivo = d.objetivo ? labelObjetivo(d.objetivo) : 'objetivo não definido'
  const aquecimento = d.aquecimento ? labelAquecimento(d.aquecimento) : 'audiência mista'
  const horas = d.horas_semana ? labelHoras(d.horas_semana) : 'carga horária flexível'
  const orcamento = d.orcamento ? labelOrcamento(d.orcamento) : 'orçamento não definido'
  const voz = brand?.voz || 'tom direto e próximo'
  const diferencial = brand?.diferencial || 'sua entrega de valor'

  const nomes = (arr: FunnelCatalogItem[]) => arr.map((f) => f.nome).join(' + ') || '—'

  return (
    `Para um negócio em ${nicho} com oferta "${oferta}" (${ticket}), validação de mercado ` +
    `"${validacao}" e audiência ${audiencia} (${aquecimento}), o ecossistema recomendado ` +
    `prioriza ${objetivo}. Considerando ${horas} de dedicação e orçamento ${orcamento}, ` +
    `a arquitetura conecta:\n\n` +
    `• Entrada: ${nomes(layers.entrada)}\n` +
    `• Nutrição: ${nomes(layers.nutricao)}\n` +
    `• Conversão: ${nomes(layers.conversao)}\n\n` +
    `A narrativa usa o ${voz} e reforça "${diferencial}" em cada ponto de contato, ` +
    `garantindo coerência entre topo, meio e fundo do funil.`
  )
}

function justificativaPara(
  f: FunnelCatalogItem,
  d: FunnelDiagnosis,
  brand: { nicho?: string; oferta?: string; voz?: string; diferencial?: string } | undefined,
  camada: 'entrada' | 'nutricao' | 'conversao',
): string {
  const nicho = d.nicho || brand?.nicho || 'seu nicho'
  const oferta = d.produto_principal || brand?.oferta || 'sua oferta'
  const ticket = d.ticket ? labelTicket(d.ticket) : 'seu ticket'
  const diferencial = brand?.diferencial || 'sua entrega de valor'

  const camadaTxt =
    camada === 'entrada'
      ? 'atrair tráfego qualificado'
      : camada === 'nutricao'
        ? 'nutrir e educar os leads'
        : 'converter em venda'

  const especifico: Record<string, string> = {
    reativacao_base: `Você já tem base de contatos — reativá-la com sequência de valor é o caminho mais rápido para ${camadaTxt} em ${nicho}.`,
    isca_digital: `Captura leads com material gratuito alinhado a "${oferta}" e os prepara para o ticket ${ticket}.`,
    reels_manychat: `Reels com automação de DM escalam ${camadaTxt} de forma orgânica, aproveitando seu alcance no Instagram.`,
    nissin_miojo: `Vídeo curto de alta conversão é ideal para ${ticket} — decisão rápida e impulso.`,
    diagnostico_publico: `Análise pública demonstra autoridade em ${nicho} e pré-qualifica quem agenda call.`,
    jornada_documentada: `Documentar o processo real de ${nicho} constrói conexão e atrai por autenticidade.`,
    ia_em_acao: `Mostrar IA aplicada a ${nicho} posiciona você como inovador e gera curiosidade no topo.`,
    tripwire: `Oferta de baixo ticket converte leads em clientes imediatamente, recolhendo provas e caixa.`,
    emprestimo_audiencia: `Collabs aceleram ${camadaTxt} emprestando audiência aquecida de parceiros complementares.`,
    destaques_sequencia: `Destaques organizados guiam o visitante pela narrativa sem depender de algoritmo.`,
    conteudo_fixado: `Posts fixados entregam a jornada principal no primeiro contato com o perfil.`,
    serie_semanal: `Conteúdo seriado cria hábito de consumo e mantém a audiência engajada entre ofertas.`,
    broadcast: `Lista de transmissão entrega valor direto e mantém "${diferencial}" no radar da base.`,
    close_friends_vip: `Close Friends VIP gera exclusividade e aquece os mais engajados para o ticket ${ticket}.`,
    diagnostico: `Quiz/diagnóstico qualifica e entrega resultado personalizado antes da oferta ${ticket}.`,
    link_bio_vsl: `VSL evergreen no link da bio converte audiência aquecida com vídeo de venda estruturado.`,
    link_bio_carta: `Carta de vendas long copy funciona para ${ticket} quando a oferta é complexa.`,
    grupo_whatsapp: `Grupo no WhatsApp cria relacionamento próximo e converte por confiança em ${nicho}.`,
    aplicacao_formulario: `Formulário seletivo aprova candidatos e eleva o valor percebido de "${oferta}".`,
    webinario_aula_vivo: `Aula ao vivo concentra autoridade e cria urgência real para o pitch de ${ticket}.`,
    aula_gravada_aplicacao: `Aula evergreen + formulário escala conversão sem depender de data fixa.`,
  }

  const base = especifico[f.id] || `${f.nome} atende a camada de ${camadaTxt} para ${nicho}.`
  return `${base} Compatível com audiência ${d.audiencia ? labelAudiencia(d.audiencia) : 'atual'} e validação "${d.validacao ? labelValidacao(d.validacao) : 'atual'}".`
}

/* =====================================================================
   LABELS (humanização dos enums do Raio-X)
   ===================================================================== */

export function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

export function labelTicket(t: string): string {
  const map: Record<string, string> = {
    ate_97: 'Até R$97',
    '97_297': 'R$97-R$297',
    '297_997': 'R$297-R$997',
    '997_2497': 'R$997-R$2.497',
    '2497_9997': 'R$2.497-R$9.997',
    acima_9997: 'Acima de R$9.997',
  }
  return map[t] || t
}
export function labelValidacao(v: string): string {
  const map: Record<string, string> = {
    nao_validado: 'Não validado',
    alguns_clientes: 'Alguns clientes',
    clientes_recorrentes: 'Clientes recorrentes',
    escalando: 'Escalando',
    dominante: 'Dominante',
  }
  return map[v] || v
}
export function labelAudiencia(a: string): string {
  const map: Record<string, string> = {
    '0_500': '0-500',
    '500_2k': '500-2k',
    '2k_10k': '2k-10k',
    '10k_50k': '10k-50k',
    '50k_200k': '50k-200k',
    '200k_mais': '200k+',
  }
  return map[a] || a
}
export function labelObjetivo(o: string): string {
  const map: Record<string, string> = {
    aquisicao_leads: 'Aquisição de leads',
    vendas_diretas: 'Vendas diretas',
    nutricao_relacionamento: 'Nutrição/Relacionamento',
    lancamento: 'Lançamento',
    recorrencia_retencao: 'Recorrência/Retenção',
    escala_anuncios: 'Escala de anúncios',
  }
  return map[o] || o
}
export function labelHoras(h: string): string {
  const map: Record<string, string> = {
    '1_5h': '1-5h',
    '5_10h': '5-10h',
    '10_20h': '10-20h',
    '20_40h': '20-40h',
    full_time_equipe: 'Full-time + equipe',
  }
  return map[h] || h
}
export function labelOrcamento(o: string): string {
  const map: Record<string, string> = {
    '0_500': 'R$0-R$500',
    '500_2000': 'R$500-R$2.000',
    '2000_10000': 'R$2.000-R$10.000',
    '10000_mais': 'R$10.000+',
  }
  return map[o] || o
}
export function labelFazVideo(f: string): string {
  const map: Record<string, string> = {
    nao_gravo: 'Não gravo vídeos',
    esporadicamente: 'Gravo esporadicamente',
    regularmente: 'Gravo regularmente',
    avancado: 'Sou avançado em vídeo',
  }
  return map[f] || f
}
export function labelEquipe(e: string): string {
  const map: Record<string, string> = {
    solo: 'Solo',
    freelancers_pontuais: 'Freelancers pontuais',
    equipe_enxuta: 'Equipe enxuta (1-3)',
    equipe_4_10: 'Equipe (4-10)',
    agencia_empresa: 'Agência/Empresa',
  }
  return map[e] || e
}
export function labelAquecimento(a: string): string {
  const map: Record<string, string> = {
    fria: 'Fria',
    morna: 'Morna',
    quente: 'Quente',
    mista: 'Mista',
  }
  return map[a] || a
}
export function labelDificuldade(d: string): string {
  const map: Record<string, string> = {
    iniciante: 'Iniciante',
    intermediario: 'Intermediário',
    avancado: 'Avançado',
  }
  return map[d] || d
}
export function labelStatus(s: string): string {
  const map: Record<string, string> = {
    ativo: 'Ativo',
    beta: 'Beta',
    em_breve: 'Em breve',
  }
  return map[s] || s
}
export function labelEtapa(e: string): string {
  const map: Record<string, string> = {
    entrada: 'Entrada',
    nutricao: 'Nutrição',
    conversao: 'Conversão',
  }
  return map[e] || e
}
