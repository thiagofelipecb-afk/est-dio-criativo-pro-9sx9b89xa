import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * youtube-publish
 * Publica vídeo no YouTube via YouTube Data API v3 (upload resumable).
 * Requer o secret YOUTUBE_ACCESS_TOKEN (OAuth2 access token com scope youtube.upload).
 * Opcionalmente usa YOUTUBE_API_KEY; o token OAuth é o principal.
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

const PLATFORM = 'YouTube'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const token = Deno.env.get('YOUTUBE_ACCESS_TOKEN')
  if (!token) {
    const error = `Token do ${PLATFORM} não configurado. Configure em Settings → Integrations.`
    console.log(`[youtube-publish] FAIL token-ausente`)
    return json({ success: false, error, tokenMissing: true }, 412)
  }

  let body: PublishBody
  try {
    body = (await req.json()) as PublishBody
  } catch {
    console.log(`[youtube-publish] FAIL body-invalido`)
    return json({ success: false, error: 'Body inválido.' }, 400)
  }

  const videoUrl = body.videoUrl
  if (!videoUrl) {
    console.log(`[youtube-publish] FAIL sem-videoUrl`)
    return json({ success: false, error: 'videoUrl é obrigatório.' }, 400)
  }

  const tags = Array.isArray(body.hashtags) ? body.hashtags.map((h) => h.replace(/^#/, '')) : []
  const title = (body.caption || 'Novo vídeo').split('\n')[0].slice(0, 100)
  const description = [body.caption || '', body.hashtags?.join(' ') || ''].join('\n').trim()

  const log = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log(`[youtube-publish] ${msg}`, JSON.stringify(extra))

  try {
    // 1. Iniciar upload resumable — envia apenas os metadados do vídeo.
    const meta = {
      snippet: { title, description, tags, categoryId: '22' },
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
    }

    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify(meta),
      },
    )

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => '')
      log('FAIL init', { status: initRes.status, errText })
      return json(
        {
          success: false,
          error: `YouTube recusou o início do upload (${initRes.status}).`,
          details: errText,
        },
        502,
      )
    }

    const uploadUrl = initRes.headers.get('location')
    if (!uploadUrl) {
      log('FAIL sem-upload-url')
      return json({ success: false, error: 'YouTube não retornou a URL de upload.' }, 502)
    }

    // 2. Fazer o upload do vídeo (baixa o vídeo da videoUrl e repassa).
    const vidRes = await fetch(videoUrl)
    if (!vidRes.ok) {
      log('FAIL buscar-video', { status: vidRes.status })
      return json(
        { success: false, error: `Não foi possível baixar o vídeo da URL (${vidRes.status}).` },
        502,
      )
    }
    const videoBlob = await vidRes.blob()

    const upRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/*' },
      body: videoBlob,
    })

    const upData = (await upRes.json().catch(() => ({}))) as { id?: string; error?: unknown }
    if (!upRes.ok || !upData.id) {
      log('FAIL upload', { status: upRes.status, data: upData })
      return json({
        success: false,
        error: `YouTube recusou o upload do vídeo (${upRes.status}).`,
        details: upData,
      })
    }

    const platformPostId = upData.id
    const platformPostUrl = `https://www.youtube.com/watch?v=${platformPostId}`
    log('OK', { platformPostId })
    return json({ success: true, platformPostId, platformPostUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('EXCEPTION', { msg })
    return json({ success: false, error: `Falha ao publicar no ${PLATFORM}: ${msg}` })
  }
})
