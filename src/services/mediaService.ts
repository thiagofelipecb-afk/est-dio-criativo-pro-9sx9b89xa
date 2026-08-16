/* ===========================================================================
   LUMEN Studio — PROMPT 2 — Serviço canônico de mídia
   --------------------------------------------------------------------------
   ÚNICA fonte de verdade para mídias da aplicação. Persiste em UMA chave de
   localStorage: `lumen_media_assets`. Usado por /midias, /biblioteca,
   Gravadora e Editor (MediaPanel).

   Nenhum dado fictício (`img.usecurling.com` como "vídeo") vive aqui. Itens
   demo são marcados explicitamente com `metadata.demo = true` e NUNCA tratados
   como arquivos reais.
   =========================================================================== */

import type { MediaAsset, MediaType } from '@/types/studio'

/** Chave única de localStorage. */
export const MEDIA_ASSETS_KEY = 'lumen_media_assets'

/** Extensões aceitas por tipo. */
const ACCEPTED_EXTENSIONS: Record<MediaType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  video: ['mp4', 'webm'],
  audio: ['mp3', 'wav', 'ogg'],
}

/** MIME types aceitos por tipo. */
const ACCEPTED_MIME: Record<MediaType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-wav', 'audio/wave'],
}

/** Limites de tamanho por tipo (bytes). */
const MAX_SIZE: Record<MediaType, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 30 * 1024 * 1024, // 30MB
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaValidationError'
  }
}

/** Gera um ID único para um ativo. */
export function generateMediaId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Deriva o tipo de mídia a partir do MIME type. */
export function deriveMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('image/')) return 'image'
  throw new MediaValidationError(`MIME type não suportado: ${mimeType}`)
}

/** Extrai a extensão (sem ponto, minúscula) do nome do arquivo. */
function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx < 0) return ''
  return filename.slice(idx + 1).toLowerCase()
}

/** Lê um File como data URL base64. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Carrega metadados de vídeo via <video> oculto: duração, largura, altura. */
function loadVideoMetadata(
  dataUrl: string,
): Promise<{ durationMs: number; width: number; height: number; thumbnailUrl?: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    let settled = false
    const cleanup = () => {
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        /* noop */
      }
    }
    video.onloadedmetadata = () => {
      const durationMs = isFinite(video.duration) ? Math.round(video.duration * 1000) : 0
      const width = video.videoWidth || 0
      const height = video.videoHeight || 0
      // Tenta gerar thumbnail via canvas no primeiro frame.
      const tryThumbnail = () => {
        try {
          const canvas = document.createElement('canvas')
          const w = width || 320
          const h = height || 180
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve({ durationMs, width, height })
            return
          }
          ctx.drawImage(video, 0, 0, w, h)
          const thumb = canvas.toDataURL('image/jpeg', 0.7)
          resolve({ durationMs, width, height, thumbnailUrl: thumb })
        } catch {
          resolve({ durationMs, width, height })
        }
      }
      // Busca um frame próximo de 0.1s para garantir decodificação.
      const onSeeked = () => {
        if (settled) return
        tryThumbnail()
      }
      const onError = () => {
        if (settled) return
        // Sem thumbnail, mas mantém metadados.
        resolve({ durationMs, width, height })
      }
      video.onseeked = onSeeked
      video.onerror = onError
      try {
        // Pode falhar se o codec não for decodificável — fallback sem thumb.
        video.currentTime = Math.min(0.1, (video.duration || 0) / 2)
      } catch {
        tryThumbnail()
      }
      // Timeout de segurança.
      setTimeout(() => {
        if (!settled) {
          settled = true
          cleanup()
          resolve({ durationMs, width, height })
        }
      }, 4000)
    }
    video.onerror = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new MediaValidationError('Não foi possível ler os metadados do vídeo.'))
    }
    video.src = dataUrl
  })
}

/** Carrega metadados de áudio via <audio>: duração. */
function loadAudioMetadata(dataUrl: string): Promise<{ durationMs: number }> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const d = isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0
      resolve({ durationMs: d })
    }
    audio.onerror = () =>
      reject(new MediaValidationError('Não foi possível ler os metadados do áudio.'))
    audio.src = dataUrl
  })
}

/** Carrega metadados de imagem via <img>: dimensões + validação de decodificação. */
function loadImageMetadata(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height })
    img.onerror = () => reject(new MediaValidationError('Não foi possível decodificar a imagem.'))
    img.src = dataUrl
  })
}

/* ── API de persistência (localStorage) ─────────────────────────────────── */

/** Carrega todos os ativos canônicos persistidos. */
export function loadAssets(): MediaAsset[] {
  try {
    const raw = localStorage.getItem(MEDIA_ASSETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as MediaAsset[]
  } catch {
    return []
  }
}

/** Persiste a lista completa (interno). */
function persistAssets(assets: MediaAsset[]): void {
  try {
    localStorage.setItem(MEDIA_ASSETS_KEY, JSON.stringify(assets))
  } catch {
    /* quota — ignora; o chamador decide o que fazer */
  }
}

/** Salva (ou atualiza) um ativo na biblioteca canônica. */
export function saveAsset(asset: MediaAsset): MediaAsset {
  const assets = loadAssets()
  const idx = assets.findIndex((a) => a.id === asset.id)
  const updated: MediaAsset = { ...asset, updatedAt: new Date().toISOString() }
  if (idx >= 0) {
    assets[idx] = updated
  } else {
    assets.unshift(updated)
  }
  persistAssets(assets)
  return updated
}

/** Atualiza parcialmente um ativo existente. */
export function updateAsset(id: string, updates: Partial<MediaAsset>): MediaAsset | null {
  const assets = loadAssets()
  const idx = assets.findIndex((a) => a.id === id)
  if (idx < 0) return null
  const updated: MediaAsset = { ...assets[idx], ...updates, updatedAt: new Date().toISOString() }
  assets[idx] = updated
  persistAssets(assets)
  return updated
}

/** Remove um ativo pelo ID. */
export function deleteAsset(id: string): void {
  const assets = loadAssets().filter((a) => a.id !== id)
  persistAssets(assets)
}

/** Busca um ativo pelo ID. */
export function getAssetById(id: string): MediaAsset | undefined {
  return loadAssets().find((a) => a.id === id)
}

/** Detecta duplicidade (mesmo nome + mesmo tamanho em bytes). */
export function findDuplicate(file: File): MediaAsset | undefined {
  return loadAssets().find((a) => a.name === file.name && a.sizeBytes === file.size)
}

/**
 * Pipeline completo de ingestão de um File → MediaAsset canônico.
 * - Valida MIME + extensão + tamanho.
 * - Extrai metadados (duração/dimensões/thumbnail).
 * - Detecta duplicidade.
 * - Salva como data URL no localStorage.
 * - Retorna o MediaAsset completo.
 */
export async function addMediaFromFile(
  file: File,
  opts: { workspaceId?: string; projectId?: string; source?: MediaAsset['source'] } = {},
): Promise<MediaAsset> {
  const mimeType = (file.type || '').toLowerCase()
  if (!mimeType) {
    throw new MediaValidationError(`Arquivo "${file.name}" sem MIME type detectável.`)
  }
  const type = deriveMediaType(mimeType)

  // Valida MIME.
  if (!ACCEPTED_MIME[type].includes(mimeType)) {
    throw new MediaValidationError(
      `MIME type "${mimeType}" não suportado para ${type}. Aceitos: ${ACCEPTED_MIME[type].join(', ')}.`,
    )
  }

  // Valida extensão.
  const ext = getExtension(file.name)
  if (!ACCEPTED_EXTENSIONS[type].includes(ext)) {
    throw new MediaValidationError(
      `Extensão ".${ext || '??'}" não suportada para ${type}. Aceitas: ${ACCEPTED_EXTENSIONS[type].join(', ')}.`,
    )
  }

  // Valida tamanho.
  if (file.size > MAX_SIZE[type]) {
    const limitMb = MAX_SIZE[type] / (1024 * 1024)
    throw new MediaValidationError(
      `Arquivo "${file.name}" excede o limite de ${limitMb}MB para ${type}.`,
    )
  }

  // Detecta duplicidade.
  const dup = findDuplicate(file)
  if (dup) {
    return dup
  }

  // Lê como data URL.
  const dataUrl = await fileToDataUrl(file)

  // Extrai metadados por tipo.
  let width: number | undefined
  let height: number | undefined
  let durationMs: number | undefined
  let thumbnailUrl: string | undefined

  if (type === 'video') {
    const meta = await loadVideoMetadata(dataUrl)
    width = meta.width || undefined
    height = meta.height || undefined
    durationMs = meta.durationMs || undefined
    thumbnailUrl = meta.thumbnailUrl
  } else if (type === 'audio') {
    const meta = await loadAudioMetadata(dataUrl)
    durationMs = meta.durationMs || undefined
  } else {
    const meta = await loadImageMetadata(dataUrl)
    width = meta.width || undefined
    height = meta.height || undefined
    // Para imagens, a própria imagem serve de thumbnail.
    thumbnailUrl = dataUrl
  }

  const now = new Date().toISOString()
  const id = generateMediaId()
  const asset: MediaAsset = {
    id,
    workspaceId: opts.workspaceId || 'default',
    projectId: opts.projectId,
    name: file.name,
    type,
    source: opts.source || 'upload',
    storageKey: id,
    publicUrl: dataUrl,
    thumbnailUrl,
    mimeType,
    sizeBytes: file.size,
    width,
    height,
    durationMs,
    createdAt: now,
    updatedAt: now,
  }

  return saveAsset(asset)
}

/** Converte um MediaAsset canônico para o formato legado MediaLibraryItem. */
export function toMediaLibraryItem(asset: MediaAsset) {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    dataUrl: asset.publicUrl || '',
    thumbnailUrl: asset.thumbnailUrl,
    size: asset.sizeBytes,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    duration: asset.durationMs ? Math.round(asset.durationMs / 1000) : undefined,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    source: asset.source,
    demo: !!(asset.metadata as any)?.demo,
  }
}

/** Converte um MediaAsset canônico para o formato legado MediaItem. */
export function toMediaItem(asset: MediaAsset) {
  const durSec = asset.durationMs ? Math.round(asset.durationMs / 1000) : undefined
  return {
    id: asset.id,
    title: asset.name,
    type: asset.type,
    url: asset.publicUrl || '',
    duration: durSec,
    size: formatBytes(asset.sizeBytes),
    createdAt: asset.createdAt,
    tags: [],
    category: 'upload' as const,
  }
}

/** Formata bytes em string legível. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
