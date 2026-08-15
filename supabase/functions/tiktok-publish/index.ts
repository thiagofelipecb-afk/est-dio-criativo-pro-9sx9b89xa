import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * tiktok-publish
 * Publica vídeo no TikTok via Content Posting API.
 * Requer o secret TIKTOK_ACCESS_TOKEN (token de acesso TikTok Open API).
 *
 * Body: { videoUrl, caption, hashtags, scheduledAt }
 * Retorna: { success, platformPostId?, platformPostUrl? } | { success: false, error }
 */
interface PublishBody {
  videoUrl?: string
  caption?: string
  hashtags?: string[]
  scheduledAt?: string
}

const PLATFORM = 'TikTok'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const token = Deno.env.get('TIKTOK_ACCESS_TOKEN')
  if (!token) {
    const error = `Token do ${PLATFORM} não configurado. Configure em Settings → Integrations.`
    console.log(`[tiktok-publish] FAIL token-ausente`)
    return json({ success: false, error, tokenMissing: true }, 412)
  }

  let body: PublishBody
  try {
    body = (await req.json()) as PublishBody
  } catch {
    console.log(`[tiktok-publish] FAIL body-invalido`)
    return json({ success: false, error: 'Body inválido.' }, 400)
  }

  const videoUrl = body.videoUrl
  if (!videoUrl) {
    console.log(`[tiktok-publish] FAIL sem-videoUrl`)
    return json({ success: false, error: 'videoUrl é obrigatório.' }, 400)
  }

  const tags = Array.isArray(body.hashtags) ? body.hashtags : []
  const caption = [body.caption || '', tags.join(' ')].join('\n').trim()

  const log = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log(`[tiktok-publish] ${msg}`, JSON.stringify(extra))

  try {
    // 1. Init — informa o TikTok que faremos upload de vídeo por URL.
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    })
    const initData = (await initRes.json()) as {
      data?: { publish_id?: string }
      error?: { code?: string; message?: string }
    }

    if (!initRes.ok || !initData.data?.publish_id) {
      log('FAIL init', { status: initRes.status, data: initData })
      return json({
        success: false,
        error: `TikTok recusou o início da publicação (${initRes.status}).`,
        details: initData,
      })
    }

    const platformPostId = initData.data.publish_id
    const platformPostUrl = `https://www.tiktok.com/@lumenstudio/video/${platformPostId}`
    log('OK', { platformPostId })
    return json({ success: true, platformPostId, platformPostUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('EXCEPTION', { msg })
    return json({ success: false, error: `Falha ao publicar no ${PLATFORM}: ${msg}` }, 502)
  }
})
