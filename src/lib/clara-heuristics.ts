/* ===========================================================================
   Clara — Heurísticas de IA multimodal (100% local, sem APIs externas)
   Usadas pela barra de "Ações rápidas" do ClaraWidget.
   =========================================================================== */

export interface VideoSegment {
  label: string
  startSec: number
  endSec: number
}

export interface HashtagSuggestion {
  tag: string
  reason: string
}

export interface BrollSuggestion {
  query: string
  keyword: string
}

/** Formata segundos como mm:ss. */
export function fmtTimecode(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Análise de vídeo baseada em duração real.
 * Usa a regra dos terços para sugerir uma divisão em 3 segmentos
 * (introdução, conteúdo principal, call-to-action).
 */
export function analyzeVideo(
  durationSec: number,
  resolution?: string,
): { segments: VideoSegment[]; summary: string } {
  const dur = Math.max(1, durationSec)
  const introEnd = dur * (1 / 3)
  const mainEnd = dur * (2 / 3)
  const segments: VideoSegment[] = [
    { label: 'Introdução', startSec: 0, endSec: introEnd },
    { label: 'Conteúdo principal', startSec: introEnd, endSec: mainEnd },
    { label: 'Call-to-action', startSec: mainEnd, endSec: dur },
  ]
  const res = resolution ? ` Resolução: ${resolution}.` : ''
  const summary = `Este vídeo tem ${fmtTimecode(dur)}.${res} Sugiro cortar em 3 segmentos: introdução (${fmtTimecode(0)}-${fmtTimecode(introEnd)}), conteúdo principal (${fmtTimecode(introEnd)}-${fmtTimecode(mainEnd)}), call-to-action (${fmtTimecode(mainEnd)}-${fmtTimecode(dur)}).`
  return { segments, summary }
}

/* ── Dicionário temático de hashtags em pt-BR (200+) ──────────────────── */

const HASHTAG_DICTIONARY: { tags: string[]; keywords: string[] }[] = [
  {
    tags: [
      '#moda',
      '#look',
      '#ootd',
      '#estilo',
      '#fashion',
      '#modafeminina',
      '#modamasculina',
      '#lookdodia',
      '#styling',
      '#tendencia',
    ],
    keywords: [
      'moda',
      'look',
      'roupa',
      'estilo',
      'fashion',
      'vestido',
      'camisa',
      'styling',
      'tendencia',
      'outfit',
    ],
  },
  {
    tags: [
      '#tecnologia',
      '#tech',
      '#inovacao',
      '#gadgets',
      '#programacao',
      '#startup',
      '#ia',
      '#inteligenciaartificial',
      '#dev',
      '#codigo',
    ],
    keywords: [
      'tech',
      'tecnologia',
      'inovacao',
      'gadget',
      'programacao',
      'startup',
      'ia',
      'inteligencia',
      'dev',
      'codigo',
      'software',
      'app',
    ],
  },
  {
    tags: [
      '#fitness',
      '#treino',
      '#academia',
      '#vidaativa',
      '#saude',
      '#gym',
      '#musculacao',
      '#crossfit',
      '#corrida',
      '#personal',
    ],
    keywords: [
      'fitness',
      'treino',
      'academia',
      'saude',
      'gym',
      'musculacao',
      'crossfit',
      'corrida',
      'exercicio',
      'personal',
    ],
  },
  {
    tags: [
      '#marketing',
      '#marketingdigital',
      '#empreendedorismo',
      '#negocios',
      '#vendas',
      '#empreender',
      '#marketingdeconteudo',
      '#socialmedia',
      '#trafego',
      '#conversao',
    ],
    keywords: [
      'marketing',
      'empreendedor',
      'negocio',
      'vendas',
      'empreender',
      'social',
      'trafego',
      'conversao',
      'funil',
      'anuncio',
    ],
  },
  {
    tags: [
      '#gastronomia',
      '#receita',
      '#comida',
      '#culinaria',
      '#chef',
      '#food',
      '#foodie',
      '#cozinha',
      '#receitafacil',
      '#doces',
    ],
    keywords: [
      'receita',
      'comida',
      'culinaria',
      'chef',
      'food',
      'cozinha',
      'gastronomia',
      'ingredientes',
      'prato',
      'bolo',
    ],
  },
  {
    tags: [
      '#viagem',
      '#travel',
      '#turismo',
      '#trip',
      '#mochilao',
      '#destino',
      '#viajar',
      '#aventura',
      '#natureza',
      '#wanderlust',
    ],
    keywords: [
      'viagem',
      'travel',
      'turismo',
      'trip',
      'mochilao',
      'destino',
      'viajar',
      'aventura',
      'natureza',
      'pais',
    ],
  },
  {
    tags: [
      '#beauty',
      '#maquiagem',
      '#cabelo',
      '#skincare',
      '#beleza',
      '#makeup',
      '#cuidados',
      '#autocuidado',
      '#estetica',
      '#barbearia',
    ],
    keywords: [
      'beauty',
      'maquiagem',
      'cabelo',
      'skincare',
      'beleza',
      'makeup',
      'cuidado',
      'estetica',
      'barba',
      'barbearia',
    ],
  },
  {
    tags: [
      '#musica',
      '#musica',
      '#cantor',
      '#covers',
      '#producaomusical',
      '#beatmaker',
      '#guitarra',
      '#piano',
      '#show',
      '#artist',
    ],
    keywords: [
      'musica',
      'cantor',
      'cover',
      'producao',
      'beat',
      'guitarra',
      'piano',
      'show',
      'artista',
      'banda',
    ],
  },
  {
    tags: [
      '#educacao',
      '#estudos',
      '#aprendizado',
      '#dicasdeestudo',
      '#concurso',
      '#enem',
      '#vestibular',
      '#universidade',
      '#livros',
      '#conhecimento',
    ],
    keywords: [
      'estudo',
      'educacao',
      'aprendizado',
      'concurso',
      'enem',
      'vestibular',
      'universidade',
      'livro',
      'conhecimento',
      'aula',
    ],
  },
  {
    tags: [
      '#financas',
      '#investimentos',
      '#dinheiro',
      '#rendaextra',
      '#economia',
      '#bolsa',
      '#cri',
      '#liberdadefinanceira',
      '#financaspessoais',
      '#orcamento',
    ],
    keywords: [
      'financa',
      'investimento',
      'dinheiro',
      'renda',
      'economia',
      'bolsa',
      'cri',
      'liberdade',
      'orcamento',
      'lucro',
    ],
  },
  {
    tags: [
      '#desenvolvimentopessoal',
      '#produtividade',
      '#motivacao',
      '#habit',
      '#rotina',
      '#foco',
      '#disciplina',
      '#mentalidade',
      '#crescimento',
      '#proposito',
    ],
    keywords: [
      'produtividade',
      'motivacao',
      'habito',
      'rotina',
      'foco',
      'disciplina',
      'mentalidade',
      'crescimento',
      'proposito',
      'desenvolvimento',
    ],
  },
  {
    tags: [
      '#criacaodeconteudo',
      '#content',
      '#criadores',
      '#youtuber',
      '#tiktok',
      '#reels',
      '#instagram',
      '#edicaodevideo',
      '#videomaker',
      '#lumenstudio',
    ],
    keywords: [
      'conteudo',
      'criador',
      'youtuber',
      'tiktok',
      'reels',
      'instagram',
      'edicao',
      'video',
      'videomaker',
      'canal',
    ],
  },
  {
    tags: [
      '#casamento',
      '#festas',
      '#eventos',
      '#decoracao',
      '#festa',
      '#celebracao',
      '#aniversario',
      '#cerimonia',
      '#buffet',
      '#festainfantil',
    ],
    keywords: [
      'casamento',
      'festa',
      'evento',
      'decoracao',
      'celebracao',
      'aniversario',
      'cerimonia',
      'buffet',
      'infantil',
    ],
  },
  {
    tags: [
      '#pets',
      '#cachorro',
      '#gato',
      '#animais',
      '#adocao',
      '#petlovers',
      '#cachorros',
      '#gatos',
      '#veterinario',
      '#pet',
    ],
    keywords: ['pet', 'cachorro', 'gato', 'animal', 'adocao', 'veterinario', 'cao', 'felino'],
  },
  {
    tags: [
      '#carros',
      '#motos',
      '#automoveis',
      '#veiculos',
      '#mecanica',
      '#tuning',
      '#street',
      '#drift',
      '#corrida',
      '#automotivo',
    ],
    keywords: [
      'carro',
      'moto',
      'automovel',
      'veiculo',
      'mecanica',
      'tuning',
      'drift',
      'automotivo',
      'motor',
    ],
  },
  {
    tags: [
      '#games',
      '#gaming',
      '#gamer',
      '#gameplay',
      '#streamer',
      '#twitch',
      '#esports',
      '#videogame',
      '#pcgamer',
      '#console',
    ],
    keywords: [
      'game',
      'gaming',
      'gamer',
      'gameplay',
      'streamer',
      'twitch',
      'esports',
      'videogame',
      'console',
      'jogo',
    ],
  },
  {
    tags: [
      '#diy',
      '#artesanato',
      '#façavocemesmo',
      '#criatividade',
      '#manual',
      '#mão_na_massa',
      '#reciclagem',
      '#decoracaodiy',
      '#artesanato',
      '# handmade',
    ],
    keywords: [
      'diy',
      'artesanato',
      'manual',
      'criativo',
      'reciclagem',
      'decoracao',
      'faca voce mesmo',
    ],
  },
  {
    tags: [
      '#maternidade',
      '#paternidade',
      '#filhos',
      '#familia',
      '#bebe',
      '#gestante',
      '#mae',
      '#pai',
      '#criancas',
      '#familia',
    ],
    keywords: [
      'maternidade',
      'paternidade',
      'filho',
      'familia',
      'bebe',
      'gestante',
      'mae',
      'pai',
      'crianca',
    ],
  },
  {
    tags: [
      '#humor',
      '#comedia',
      '#meme',
      '#engraçado',
      '#risadas',
      '#comico',
      '#standup',
      '#riso',
      '#zorando',
      '#zueira',
    ],
    keywords: ['humor', 'comedia', 'meme', 'engracado', 'risada', 'standup', 'zueira', 'riso'],
  },
  {
    tags: [
      '#espiritualidade',
      '#fe',
      '#meditacao',
      '#yoga',
      '#gratidao',
      '#oracao',
      '#espiritual',
      '#mindfulness',
      '#paz',
      '#equilibrio',
    ],
    keywords: [
      'espiritualidade',
      'fe',
      'meditacao',
      'yoga',
      'gratidao',
      'oracao',
      'mindfulness',
      'paz',
      'equilibrio',
    ],
  },
]

const STOPWORDS = new Set([
  'de',
  'a',
  'o',
  'que',
  'e',
  'do',
  'da',
  'em',
  'um',
  'para',
  'com',
  'nao',
  'uma',
  'os',
  'no',
  'se',
  'na',
  'por',
  'mais',
  'as',
  'dos',
  'como',
  'mas',
  'ao',
  'ele',
  'das',
  'a',
  'seu',
  'sua',
  'ou',
  'quando',
  'muito',
  'nos',
  'ja',
  'eu',
  'tambem',
  'so',
  'pelo',
  'pela',
  'ate',
  'isso',
  'ela',
  'entre',
  'era',
  'depois',
  'sem',
  'mesmo',
  'aos',
  'seus',
  'quem',
  'nas',
  'me',
  'esse',
  'eles',
  'voce',
  'essa',
  'num',
  'nem',
  'suas',
  'meu',
  'as',
  'minha',
  'numa',
  'pelos',
  'elas',
  'qual',
  'nos',
  'lhe',
  'deles',
  'essas',
  'aqueles',
  'estas',
  'estes',
  'esteja',
  'fazer',
  'ser',
  'ter',
  'ir',
  'estar',
  'pode',
  'todo',
  'todos',
  'tudo',
  'cada',
  'sobre',
  'seja',
  'foi',
  'somos',
  'vai',
  'aqui',
  'agora',
  'hoje',
  'ate',
  'ainda',
])

/** Extrai palavras-chave relevantes de um texto em pt-BR. */
export function extractKeywords(text: string, max = 15): string[] {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  const freq: Record<string, number> = {}
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1
  })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w)
}

/**
 * Sugere hashtags baseadas no título/legenda, cruzando palavras-chave
 * extraídas com o dicionário temático. Sempre inclui hashtags genéricas
 * de criação de conteúdo.
 */
export function suggestHashtags(text: string): HashtagSuggestion[] {
  const keywords = extractKeywords(text)
  const result: HashtagSuggestion[] = []
  const seen = new Set<string>()

  const addTag = (tag: string, reason: string) => {
    const t = tag.startsWith('#') ? tag : `#${tag}`
    if (seen.has(t.toLowerCase())) return
    seen.add(t.toLowerCase())
    result.push({ tag: t, reason })
  }

  for (const { tags, keywords: dictKw } of HASHTAG_DICTIONARY) {
    const matches = dictKw.some((k) => keywords.some((kw) => kw.includes(k) || k.includes(kw)))
    if (matches) {
      // Pega as 3 mais relevantes do tema.
      tags.slice(0, 3).forEach((t) => addTag(t, 'relacionado ao tema do conteúdo'))
    }
  }

  // Sempre inclui hashtags genéricas de criação de conteúdo.
  const generic = ['#criacaodeconteudo', '#reels', '#tiktok', '#instagram', '#lumenstudio']
  generic.forEach((t) => addTag(t, 'padrão de criadores de conteúdo'))

  // Limita a 10 sugestões.
  return result.slice(0, 10)
}

/** Templates de títulos de alta conversão com slots preenchíveis. */
const TITLE_TEMPLATES: string[] = [
  'Como [verbo] em [numero] passos simples',
  'O segredo de [nicho] que ninguém te conta',
  '[numero] erros que estão sabotando seu [objetivo]',
  'O guia definitivo de [nicho] para iniciantes',
  'Por que 90% falham em [objetivo] (e como evitar)',
  '[numero] hábitos de quem domina [nicho]',
]

/** Gera 3 opções de título otimizadas para engajamento. */
export function suggestTitles(text: string): string[] {
  const keywords = extractKeywords(text, 5)
  const verbo = keywords[0] || 'crescer'
  const numero = String(Math.floor(Math.random() * 5) + 3)
  const nicho = keywords[1] || 'criação de conteúdo'
  const objetivo = keywords[2] || 'engajamento'

  const fills: Record<string, string> = { verbo, numero, nicho, objetivo }
  const titles = TITLE_TEMPLATES.map((t) => t.replace(/\[(\w+)\]/g, (_, k) => fills[k] || k))
  // Embaralha e pega 3 distintos.
  const shuffled = titles.sort(() => Math.random() - 0.5).slice(0, 3)
  return shuffled
}

/**
 * Sugere termos de busca para B-roll a partir do roteiro.
 * Extrai palavras-chave por bloco (parágrafo) e gera queries Pexels.
 */
export function suggestBRoll(text: string): BrollSuggestion[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  const suggestions: BrollSuggestion[] = []
  const seen = new Set<string>()

  for (const para of paragraphs) {
    const kws = extractKeywords(para, 3)
    for (const kw of kws) {
      if (seen.has(kw)) continue
      seen.add(kw)
      suggestions.push({ query: kw, keyword: kw })
      if (suggestions.length >= 8) break
    }
    if (suggestions.length >= 8) break
  }

  // Fallback genérico se o roteiro for vazio.
  if (suggestions.length === 0) {
    return [
      { query: 'studio', keyword: 'estúdio' },
      { query: 'creator', keyword: 'criador' },
      { query: 'camera', keyword: 'câmera' },
    ]
  }
  return suggestions
}

/**
 * Comprime um roteiro longo em uma versão de 30-60s (Shorts).
 * Mantém a primeira e a última frase de cada parágrafo.
 */
export function transformToShorts(text: string): { script: string; estimatedSec: number } {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  const compressed: string[] = []

  for (const para of paragraphs) {
    const sentences = para
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (sentences.length === 0) continue
    if (sentences.length === 1) {
      compressed.push(sentences[0])
    } else {
      compressed.push(sentences[0])
      compressed.push(sentences[sentences.length - 1])
    }
  }

  const script = compressed.join('\n')
  // Estima duração: ~150 palavras/min → 2.5 palavras/seg.
  const wordCount = script.split(/\s+/).filter(Boolean).length
  const estimatedSec = Math.round(wordCount / 2.5)
  return { script, estimatedSec }
}
