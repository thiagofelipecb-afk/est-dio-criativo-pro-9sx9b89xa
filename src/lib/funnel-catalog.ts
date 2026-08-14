import { FunnelCatalogItem } from '@/types/platform'

export const FUNNEL_CATALOG: FunnelCatalogItem[] = [
  // Entrada
  {
    id: 'reativacao_base',
    name: 'Reativação de Base',
    stage: 'entrada',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: { audience: ['parada', 'media', 'grande'] },
    description: 'Reativar leads parados da própria base com sequência de contato.',
  },
  {
    id: 'isca_digital',
    name: 'Isca Digital',
    stage: 'entrada',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: {},
    description: 'Material gratuito para capturar leads no topo.',
  },
  {
    id: 'reels_manychat',
    name: 'Reels + ManyChat',
    stage: 'entrada',
    ticketTags: ['baixo', 'medio'],
    requirements: { objective: ['leads', 'crescer_seguidores', 'aquecer'] },
    description: 'Reels com automação de DM para captura.',
  },
  {
    id: 'nissin_entrada',
    name: 'Nissin Miojo',
    stage: 'entrada',
    ticketTags: ['baixo', 'medio'],
    requirements: { validation: ['nunca_vendeu', '1_2_vezes'] },
    description: 'Oferta rápida de baixo ticket para validar demanda.',
  },
  {
    id: 'diagnostico_publico',
    name: 'Diagnóstico Público',
    stage: 'entrada',
    ticketTags: ['medio', 'alto'],
    requirements: {},
    description: 'Diagnóstico aberto que atrai e qualifica.',
  },
  {
    id: 'jornada_documentada',
    name: 'Jornada Documentada',
    stage: 'entrada',
    ticketTags: ['medio', 'alto'],
    requirements: {},
    description: 'Conteúdo documental que atrai por autenticidade.',
  },
  {
    id: 'ia_em_acao',
    name: 'IA em Ação',
    stage: 'entrada',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: {},
    description: 'Demonstração de IA aplicada ao nicho.',
  },
  {
    id: 'tripwire_entrada',
    name: 'Tripwire (Two-step)',
    stage: 'entrada',
    ticketTags: ['baixo'],
    requirements: { objective: ['fechar_direto', 'vender_digital'] },
    description: 'Oferta de baixo ticket imediatamente após captura.',
  },
  {
    id: 'emprestimo_audiencia',
    name: 'Empréstimo de Audiência',
    stage: 'entrada',
    ticketTags: ['medio', 'alto'],
    requirements: { audience: ['pequena_fria', 'pequena_engajada'] },
    description: 'Parcerias para emprestar audiência de outro perfil.',
  },
  // Nutrição
  {
    id: 'destaques_sequencia',
    name: 'Destaques em Sequência',
    stage: 'nutricao',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: {},
    description: 'Destaques do Instagram organizados como jornada.',
  },
  {
    id: 'conteudo_fixado',
    name: 'Conteúdo Fixado (Pins)',
    stage: 'nutricao',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: {},
    description: 'Pins fixados estrategicamente.',
  },
  {
    id: 'serie_semanal',
    name: 'Série Semanal',
    stage: 'nutricao',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: {},
    description: 'Série recorrente que cria expectativa.',
  },
  {
    id: 'broadcast',
    name: 'Broadcast/Canal de Transmissão',
    stage: 'nutricao',
    ticketTags: ['baixo', 'medio', 'alto'],
    requirements: {},
    description: 'Canal de transmissão para nutrir base.',
  },
  {
    id: 'close_friends',
    name: 'Close Friends VIP',
    stage: 'nutricao',
    ticketTags: ['medio', 'alto'],
    requirements: { audience: ['pequena_engajada', 'media', 'grande'] },
    description: 'Close Friends como área VIP de nutrição.',
  },
  {
    id: 'jornada_doc_nutri',
    name: 'Jornada Documentada',
    stage: 'nutricao',
    ticketTags: ['medio', 'alto'],
    requirements: {},
    description: 'Documentação contínua de processo para nutrir.',
  },
  // Conversão
  {
    id: 'diagnostico_conv',
    name: 'Diagnóstico',
    stage: 'conversao',
    ticketTags: ['medio', 'alto'],
    requirements: { objective: ['fechar_direto', 'aquecer'] },
    description: 'Diagnóstico 1:1 para qualificar e fechar.',
  },
  {
    id: 'link_bio_vsl',
    name: 'Link na Bio - VSL',
    stage: 'conversao',
    ticketTags: ['medio', 'alto'],
    requirements: { validation: ['recorrente', '1_2_vezes'] },
    description: 'VSL no link da bio para conversão.',
  },
  {
    id: 'link_bio_carta',
    name: 'Link na Bio - Carta de Vendas',
    stage: 'conversao',
    ticketTags: ['medio', 'alto'],
    requirements: { validation: ['recorrente', '1_2_vezes'] },
    description: 'Carta de vendas long copy no link da bio.',
  },
  {
    id: 'grupo_whatsapp',
    name: 'Grupo WhatsApp + Aquecimento',
    stage: 'conversao',
    ticketTags: ['baixo', 'medio'],
    requirements: {},
    description: 'Grupo com aquecimento e oferta.',
  },
  {
    id: 'aplicacao',
    name: 'Aplicação/Formulário Seletivo',
    stage: 'conversao',
    ticketTags: ['medio', 'alto'],
    requirements: { objective: ['fechar_direto', 'lancar'] },
    description: 'Formulário seletivo para qualificar.',
  },
  {
    id: 'webinario',
    name: 'Webinário/Aula ao Vivo',
    stage: 'conversao',
    ticketTags: ['medio', 'alto'],
    requirements: { objective: ['lancar', 'fechar_direto'] },
    description: 'Webinário ao vivo para conversão.',
  },
  {
    id: 'aula_gravada',
    name: 'Aula Gravada + Aplicação',
    stage: 'conversao',
    ticketTags: ['medio', 'alto'],
    requirements: {},
    description: 'Aula gravada evergreen com aplicação.',
  },
  {
    id: 'nissin_conv',
    name: 'Nissin Miojo',
    stage: 'conversao',
    ticketTags: ['baixo', 'medio'],
    requirements: { validation: ['1_2_vezes', 'recorrente'] },
    description: 'Oferta rápida de conversão direta.',
  },
  {
    id: 'tripwire_conv',
    name: 'Tripwire',
    stage: 'conversao',
    ticketTags: ['baixo'],
    requirements: { objective: ['vender_digital', 'fechar_direto'] },
    description: 'Oferta imediata de baixo ticket pós-captura.',
  },
]

export function eligibleFunnels(diagnosis: {
  validation: string
  audience: string
  objective: string
  ticket?: string
}): FunnelCatalogItem[] {
  const ticketBucket = (() => {
    const t = diagnosis.ticket || ''
    const num = parseFloat(t.replace(/[^\d,.]/g, '').replace(',', '.'))
    if (!isNaN(num)) {
      if (num < 97) return 'baixo'
      if (num < 997) return 'medio'
      return 'alto'
    }
    return null
  })()
  return FUNNEL_CATALOG.filter((f) => {
    if (f.requirements.objective && !f.requirements.objective.includes(diagnosis.objective))
      return false
    if (f.requirements.validation && !f.requirements.validation.includes(diagnosis.validation))
      return false
    if (f.requirements.audience && !f.requirements.audience.includes(diagnosis.audience))
      return false
    if (ticketBucket && !f.ticketTags.includes(ticketBucket as 'baixo' | 'medio' | 'alto'))
      return false
    return true
  })
}
