import type { BlockBRoll } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   broll — FASE 3
   Busca de vídeos no Pexels (endpoint público) + heurística local de termos
   de busca a partir do texto do bloco. Sem dependências externas.
   ─────────────────────────────────────────────────────────────────────────── */

/** Resultado bruto da API do Pexels (campos que usamos). */
export interface PexelsVideoResult {
  id: number
  /** Duração em segundos. */
  duration: number
  /** Lista de arquivos do vídeo em diferentes resoluções. */
  video_files: Array<{
    id: number
    quality: string
    file_type: string
    width: number
    height: number
    link: string
  }>
  /** Imagens de preview do vídeo. */
  image_pictures?: Array<{ id: number; nr: number; picture: string }>
  /** Usuário autor. */
  user: { id: number; name: string }
  /** Imagem de capa (thumbnail). */
  image: string
}

export interface PexelsResponse {
  page: number
  per_page: number
  total_results: number
  videos: PexelsVideoResult[]
}

/**
 * Busca vídeos no Pexels. Tenta o endpoint público sem autenticação; se falhar
 * (CORS, rate limit, rede), retorna { error } para o chamador exibir fallback.
 */
export async function searchPexelsVideos(
  query: string,
  perPage = 12,
): Promise<{ results: PexelsVideoResult[]; error?: string }> {
  if (!query.trim()) return { results: [] }
  const url = `https://img.usecurling.com/p/800/600?q=abstract)}&per_page=${perPage}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Endpoint público oficialmente requer chave; enviamos um header
        // genérico. Se o servidor recusar, o catch abaixo retorna fallback.
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      return { results: [], error: `Pexels respondeu ${res.status}. Tente novamente.` }
    }
    const data = (await res.json()) as PexelsResponse
    return { results: data.videos ?? [] }
  } catch (err: any) {
    return {
      results: [],
      error:
        'Não foi possível buscar no Pexels agora (rede/CORS). Verifique sua conexão ou tente outro termo.',
    }
  }
}

/** Converte um resultado bruto do Pexels em BlockBRoll persistível. */
export function pexelsResultToBRoll(v: PexelsVideoResult): BlockBRoll {
  // Escolhe o arquivo de melhor qualidade com link direto.
  const best =
    [...(v.video_files ?? [])].sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null
  const resolution = best ? `${best.width}×${best.height}` : undefined
  return {
    pexelsId: v.id,
    url: best?.link ?? '',
    thumbnail: v.image,
    author: v.user?.name ?? 'Pexels',
    duration: v.duration,
    resolution,
  }
}

/* ── Heurística local: sugere termos de busca a partir do texto do bloco ── */

interface KeywordGroup {
  /** Palavras-chave que disparam o grupo (minúsculas, sem acento). */
  keywords: string[]
  /** Termo de busca sugerido (inglês — melhor para o Pexels). */
  term: string
  /** Rótulo em PT para exibição. */
  label: string
}

const KEYWORD_GROUPS: KeywordGroup[] = [
  {
    label: 'Natureza',
    term: 'nature landscape',
    keywords: [
      'natureza',
      'floresta',
      'arvore',
      'arvores',
      'rio',
      'mar',
      'praia',
      'montanha',
      'ceu',
      'pôr do sol',
      'por do sol',
      'flor',
      'flores',
      'jardim',
    ],
  },
  {
    label: 'Cidade',
    term: 'city street',
    keywords: [
      'cidade',
      'rua',
      'avenida',
      'predio',
      'predios',
      'transito',
      'carro',
      'carros',
      'downtown',
      'metropolis',
      'urbano',
    ],
  },
  {
    label: 'Escritório',
    term: 'office workspace',
    keywords: [
      'escritorio',
      'trabalho',
      'reuniao',
      'computador',
      'laptop',
      'mesa',
      'notebook',
      'teclado',
      'monitor',
      'corporativo',
    ],
  },
  {
    label: 'Pessoas',
    term: 'people talking',
    keywords: [
      'pessoas',
      'pessoa',
      'amigos',
      'amigo',
      'mulher',
      'homem',
      'crianca',
      'familia',
      'grupo',
      'rosto',
      'sorriso',
    ],
  },
  {
    label: 'Tecnologia',
    term: 'technology digital',
    keywords: [
      'tecnologia',
      'tech',
      'digital',
      'celular',
      'smartphone',
      'aplicativo',
      'app',
      'software',
      'codigo',
      'programacao',
      'robô',
      'robot',
      'ia',
      'inteligencia artificial',
      'dados',
    ],
  },
  {
    label: 'Comida',
    term: 'food cooking',
    keywords: [
      'comida',
      'receita',
      'cozinha',
      'prato',
      'restaurante',
      'alimento',
      'cafe',
      'almoco',
      'jantar',
      'ingredientes',
    ],
  },
  {
    label: 'Dinheiro',
    term: 'money finance',
    keywords: [
      'dinheiro',
      'financa',
      'financeiro',
      'investimento',
      'lucro',
      'vendas',
      'vender',
      'negocio',
      'empreendedor',
      'renda',
      'carteira',
    ],
  },
  {
    label: 'Saúde',
    term: 'fitness health',
    keywords: [
      'saude',
      'exercicio',
      'academia',
      'treino',
      'fitness',
      'corpo',
      'mente',
      'bem-estar',
      'bem estar',
      'meditacao',
      'yoga',
    ],
  },
  {
    label: 'Educação',
    term: 'education learning',
    keywords: [
      'educacao',
      'estudo',
      'estudar',
      'livro',
      'livros',
      'escola',
      'curso',
      'aula',
      'aprender',
      'conhecimento',
      'professor',
    ],
  },
  {
    label: 'Viagem',
    term: 'travel adventure',
    keywords: [
      'viagem',
      'viajar',
      'passagem',
      'aeroporto',
      'aviao',
      'mochilao',
      'destino',
      'turismo',
      'aventura',
    ],
  },
]

/** Remove acentos e lowercase para comparação. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Analisa o texto do bloco e sugere termos de busca relevantes.
 * Retorna até 3 sugestões { term, label }. Sem rede — puramente local.
 */
export function suggestBRollTerms(blockText: string): { term: string; label: string }[] {
  const text = normalize(blockText)
  if (!text.trim()) return []
  const matches: { term: string; label: string; score: number }[] = []
  for (const group of KEYWORD_GROUPS) {
    let score = 0
    for (const kw of group.keywords) {
      const nk = normalize(kw)
      if (text.includes(nk)) score += nk.length > 4 ? 2 : 1
    }
    if (score > 0) matches.push({ term: group.term, label: group.label, score })
  }
  matches.sort((a, b) => b.score - a.score)
  return matches.slice(0, 3).map(({ term, label }) => ({ term, label }))
}
