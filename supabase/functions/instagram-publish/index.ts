import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * instagram-publish
 * Publica vídeo/imagem no Instagram via Instagram Graph API.
 * Requer o secret INSTAGRAM_ACCESS_TOKEN (token de acesso da conta Instagram Business).
 * Opcionalmente usa INSTAGRAM_ACCOUNT_ID (ID da conta IG); se ausente, tenta inferir via /me.
 *
 * Body: { videoUrl, caption, hashtags, scheduledAt, mediaType? }
 * Retorna: { success, platformPostId?, platformPostUrl? } | { success: false, error }
 */
interface PublishBody {
  videoUrl?: string
  imageUrl?: string
  caption?: string
  hashtags?: string[]
  scheduledAt?: string
  mediaType?: 'video' | 'image'
}

const PLATFORM = 'Instagram'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const token = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')
  if (!token) {
    const error = `Token do ${PLATFORM} não configurado. Configure em Settings → Integrations.`
    console.log(`[instagram-publish] FAIL token-ausente`)
    return json({ success: false, error, tokenMissing: true }, 412)
  }

  let body: PublishBody
  try {
    body = (await req.json()) as PublishBody
  } catch {
    console.log(`[instagram-publish] FAIL body-invalido`)
    return json({ success: false, error: 'Body inválido.' }, 400)
  }

  const mediaUrl = body.videoUrl || body.imageUrl
  if (!mediaUrl) {
    console.log(`[instagram-publish] FAIL sem-mediaUrl`)
    return json({ success: false, error: 'videoUrl ou imageUrl é obrigatório.' }, 400)
  }

  const isVideo = body.mediaType === 'video' || !!body.videoUrl
  const tags = Array.isArray(body.hashtags) ? body.hashtags : []
  const caption = [body.caption || '', tags.join(' ')].join('\n').trim()

  const log = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log(`[instagram-publish] ${msg}`, JSON.stringify(extra))

  try {
    // 1. Descobrir o ID da conta IG (se não fornecido via env).
    let accountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID') || ''
    if (!accountId) {
      const meRes = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id&access_token=${encodeURIComponent(token)}`,
      )
      if (meRes.ok) {
        const me = (await meRes.json()) as { id?: string }
        if (me.id) accountId = me.id
      }
    }
    if (!accountId) {
      log('FAIL sem-account-id')
      return json(
        {
          success: false,
          error:
            'Não foi possível determinar o ID da conta Instagram. Defina INSTAGRAM_ACCOUNT_ID.',
        },
        412,
      )
    }

    // 2. Criar o container de mídia.
    const containerParams = new URLSearchParams({
      access_token: token,
      caption,
    })
    if (isVideo) {
      containerParams.set('video_url', mediaUrl)
      containerParams.set('media_type', 'REELS')
    } else {
      containerParams.set('image_url', mediaUrl)
      containerParams.set('media_type', 'IMAGE')
    }

    const createRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
      method: 'POST',
      body: containerParams,
    })
    const createData = (await createRes.json()) as { id?: string; error?: unknown }
    if (!createRes.ok || !createData.id) {
      log('FAIL container', { status: createRes.status, data: createData })
      return json(
        {
          success: false,
          error: `Instagram recusou a mídia (${createRes.status}).`,
          details: createData,
        },
        502,
      )
    }
    const containerId = createData.id

    // 3. Publicar o container.
    const publishParams = new URLSearchParams({
      access_token: token,
      creation_id: containerId,
    })
    const pubRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish`, {
      method: 'POST',
      body: publishParams,
    })
    const pubData = (await pubRes.json()) as { id?: string; error?: unknown }
    if (!pubRes.ok || !pubData.id) {
      log('FAIL publish', { status: pubRes.status, data: pubData })
      return json({
        success: false,
        error: `Instagram recusou a publicação (${pubRes.status}).`,
        details: pubData,
      })
    }

    const platformPostId = pubData.id
    const platformPostUrl = `https://www.instagram.com/p/${containerId}`
    log('OK', { platformPostId })
    return json({ success: true, platformPostId, platformPostUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('EXCEPTION', { msg })
    return json({ success: false, error: `Falha ao publicar no ${PLATFORM}: ${msg}` })
  }
})
