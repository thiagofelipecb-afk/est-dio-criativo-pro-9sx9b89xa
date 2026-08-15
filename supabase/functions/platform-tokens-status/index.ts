import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * platform-tokens-status
 * Retorna quais tokens de publicação social estão configurados no backend.
 * Usado pela UI (Agendamento) para mostrar "Conectado" / "Não configurado"
 * ao lado de cada plataforma. Não expõe os valores dos tokens.
 *
 * Retorna: { instagram: boolean, tiktok: boolean, youtube: boolean }
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const status = {
    instagram: !!Deno.env.get('INSTAGRAM_ACCESS_TOKEN'),
    tiktok: !!Deno.env.get('TIKTOK_ACCESS_TOKEN'),
    youtube: !!Deno.env.get('YOUTUBE_ACCESS_TOKEN'),
  }

  console.log('[platform-tokens-status]', JSON.stringify(status))
  return json(status)
})
