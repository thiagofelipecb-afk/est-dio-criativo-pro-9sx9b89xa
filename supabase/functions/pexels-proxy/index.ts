import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * pexels-proxy — PROMPT 54
 * Proxy server-side para a API de vídeos do Pexels.
 * Recebe { query, perPage, page } no body e retorna o JSON do Pexels
 * com { videos, page, per_page, total_results, error? }.
 * A chave da API é lida do secret PEXELS_API_KEY (Deno.env.get).
 * Se o secret não existir, retorna { error: "Pexels API key não configurada" }.
 */
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const headers = { 'Content-Type': 'application/json', ...corsHeaders }

  // Lê parâmetros do body (POST) ou query string (GET)
  let query = ''
  let perPage = 12
  let page = 1

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      query = url.searchParams.get('query') ?? ''
      const p = url.searchParams.get('page')
      const pp = url.searchParams.get('per_page') ?? url.searchParams.get('perPage')
      if (p) page = Number(p)
      if (pp) perPage = Number(pp)
    } else {
      const body = await req.json().catch(() => ({}))
      query = body?.query ?? ''
      const p = body?.page
      const pp = body?.perPage ?? body?.per_page
      if (p) page = Number(p)
      if (pp) perPage = Number(pp)
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido.' }), {
      status: 400,
      headers,
    })
  }

  if (!query || !String(query).trim()) {
    return new Response(JSON.stringify({ error: 'Parâmetro "query" é obrigatório.' }), {
      status: 400,
      headers,
    })
  }

  // Garante limites sensatos
  if (!Number.isFinite(perPage) || perPage < 1) perPage = 12
  if (perPage > 80) perPage = 80
  if (!Number.isFinite(page) || page < 1) page = 1

  const apiKey = Deno.env.get('PEXELS_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Pexels API key não configurada' }), {
      status: 500,
      headers,
    })
  }

  const apiUrl =
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}` +
    `&per_page=${perPage}&page=${page}`

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return new Response(
        JSON.stringify({
          videos: [],
          page,
          per_page: perPage,
          total_results: 0,
          error: `Pexels respondeu ${res.status}. Tente novamente. ${text}`.trim(),
        }),
        { status: res.status, headers },
      )
    }

    const data = await res.json()
    return new Response(
      JSON.stringify({
        videos: data.videos ?? [],
        page: data.page ?? page,
        per_page: data.per_page ?? perPage,
        total_results: data.total_results ?? 0,
      }),
      { status: 200, headers },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({
        videos: [],
        page,
        per_page: perPage,
        total_results: 0,
        error: `Falha ao contatar o Pexels: ${msg}`,
      }),
      { status: 502, headers },
    )
  }
})
