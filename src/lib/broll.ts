import type { BlockBRoll } from '@/types/studio'
import { supabase } from '@/lib/supabase/client'

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
 * Busca vídeos no Pexels via edge function `pexels-proxy` (Supabase).
 * A chave da API fica no secret PEXELS_API_KEY do backend — nunca no cliente.
 * Se o secret não existir, a edge function retorna { error }.
 */
export async function searchPexelsVideos(
  query: string,
  perPage = 12,
  page = 1,
): Promise<{
  results: PexelsVideoResult[]
  totalResults?: number
  error?: string
}> {
  if (!query.trim()) return { results: [] }
  try {
    const { data, error } = await supabase.functions.invoke('pexels-proxy', {
      body: { query, perPage, page },
    })
    if (error) {
      return {
        results: [],
        error: 'Não foi possível buscar no Pexels agora. Tente novamente.',
      }
    }
    const payload = data as Partial<PexelsResponse & { error?: string }>
    if (payload?.error) {
      return { results: [], error: payload.error }
    }
    return {
      results: payload?.videos ?? [],
      totalResults: payload?.total_results,
    }
  } catch {
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
  // PROMPT 58 — URL da página do vídeo no Pexels (atribuição/licença).
  const licenseUrl = `https://img.usecurling.com/p/800/600?q=abstract`
  return {
    pexelsId: v.id,
    url: best?.link ?? '',
    thumbnail: v.image,
    author: v.user?.name ?? 'Pexels',
    duration: v.duration,
    resolution,
    licenseUrl,
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
