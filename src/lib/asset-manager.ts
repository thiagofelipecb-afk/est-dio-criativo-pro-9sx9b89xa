/* ===========================================================================
   LUMEN Studio — Prompt 67 / GAP 1
   Gerenciador único de ativos (MediaAsset) com ciclo de vida controlado.
   --------------------------------------------------------------------------
   O projeto já possui o tipo `MediaItem` (catálogo de mídia da biblioteca),
   mas NÃO tinha um gerenciador de ativos com ciclo de vida (refcount, revogação
   de object URLs, serialização para persistência). Este módulo preenche esse
   gap de forma ADITIVA — nada existente foi alterado.

   Princípios:
   - Blobs NÃO são persistíveis (apenas references em memória).
   - `dataUrl` é usado para persistência (base64).
   - IDs são gerados por hash simples do dataUrl (8 chars).
   - `refCount` controla quantos projetos/blocos referenciam o ativo.
   - Ao chegar a 0, o objectUrl é revogado e o ativo é removido do Map.
   =========================================================================== */

/** Tipo do conteúdo gerenciado pelo AssetManager. */
export type MediaAssetType =
  | 'image'
  | 'video'
  | 'audio'
  | 'broll'
  | 'background'
  | 'whiteboard'
  | 'thumbnail'

/** Origem do ativo. */
export type MediaAssetSource = 'upload' | 'pexels' | 'canvas' | 'recording' | 'import'

/** Ativo de mídia gerenciado com ciclo de vida (refcount). */
export interface MediaAsset {
  /** Identificador único (hash de 8 chars do dataUrl, ou fallback aleatório). */
  id: string
  /** Tipo do ativo. */
  type: MediaAssetType
  /** Blob em memória (NÃO persistível). */
  blob: Blob | null
  /** Data URL base64 (persistível). */
  dataUrl: string | null
  /** MIME type real do Blob. */
  mimeType: string
  /** Tamanho em bytes. */
  sizeBytes: number
  /** Largura (imagens/vídeos). */
  width?: number
  /** Altura (imagens/vídeos). */
  height?: number
  /** Duração em segundos (vídeos/áudios). */
  duration?: number
  /** Object URL criada a partir do Blob (revogada quando refCount chega a 0). */
  objectUrl: string | null
  /** Quantos projetos/blocos referenciam este ativo. */
  refCount: number
  /** Origem do ativo. */
  source: MediaAssetSource
  /** URL de licença (ex.: página do Pexels para crédito). */
  licenseUrl?: string
  /** Autor do ativo (ex.: autor no Pexels). */
  author?: string
  /** Provedor do ativo (ex.: 'pexels', 'upload'). */
  provider?: string
}

/**
 * Hash simples e estável (FNV-1a 32-bit) → string hexadecimal.
 * Usado para gerar IDs determinísticos a partir do dataUrl, garantindo que o
 * mesmo blob re-adicionado reaproveite o mesmo ativo (refCount incrementa).
 */
function hashString(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Converte para hex sem sinal e pega os primeiros 8 chars.
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8)
}

/** Converte um Blob em data URL base64. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Deriva o tipo de ativo a partir do MIME type. */
function deriveType(mimeType: string): MediaAssetType {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('image/')) return 'image'
  return 'image'
}

/**
 * Gerenciador de ativos com ciclo de vida controlado por refCount.
 * Mantém um Map interno de MediaAsset por ID. Object URLs são revogadas
 * automaticamente quando o refCount chega a 0.
 */
export class AssetManager {
  private assets = new Map<string, MediaAsset>()

  /**
   * Adiciona (ou reutiliza) um ativo.
   * - Se um ativo com o mesmo ID (hash do dataUrl) já existir, incrementa o
   *   refCount e retorna o ativo existente (blobs/objectUrls compartilhados).
   * - Caso contrário, gera ID, cria objectUrl, armazena no Map.
   */
  async addAsset(blob: Blob, source: string, meta?: Partial<MediaAsset>): Promise<MediaAsset> {
    // Gera dataUrl para hash + persistência. Se o blob já veio com dataUrl no
    // meta (caso raro), usa esse para o hash.
    let dataUrl: string | null = null
    try {
      dataUrl = await blobToDataUrl(blob)
    } catch {
      dataUrl = null
    }

    const hashBase = dataUrl ?? `${blob.size}-${blob.type}-${Date.now()}`
    const id = meta?.id ?? hashString(hashBase)

    const existing = this.assets.get(id)
    if (existing) {
      existing.refCount += 1
      return existing
    }

    const objectUrl = URL.createObjectURL(blob)
    const asset: MediaAsset = {
      id,
      type: meta?.type ?? deriveType(blob.type || 'application/octet-stream'),
      blob,
      dataUrl,
      mimeType: blob.type || meta?.mimeType || 'application/octet-stream',
      sizeBytes: blob.size,
      width: meta?.width,
      height: meta?.height,
      duration: meta?.duration,
      objectUrl,
      refCount: 1,
      source: (source as MediaAssetSource) ?? 'upload',
      licenseUrl: meta?.licenseUrl,
      author: meta?.author,
      provider: meta?.provider,
    }
    this.assets.set(id, asset)
    return asset
  }

  /** Recupera um ativo pelo ID (ou undefined). */
  getAsset(id: string): MediaAsset | undefined {
    return this.assets.get(id)
  }

  /** Lista todos os ativos (somente leitura). */
  listAssets(): MediaAsset[] {
    return Array.from(this.assets.values())
  }

  /** Incrementa o refCount de um ativo. */
  incrementRef(id: string): void {
    const asset = this.assets.get(id)
    if (asset) asset.refCount += 1
  }

  /**
   * Decrementa o refCount de um ativo. Se chegar a 0, revoga o objectUrl e
   * remove o ativo do Map (liberação de memória).
   */
  decrementRef(id: string): void {
    const asset = this.assets.get(id)
    if (!asset) return
    asset.refCount = Math.max(0, asset.refCount - 1)
    if (asset.refCount <= 0) {
      if (asset.objectUrl) {
        try {
          URL.revokeObjectURL(asset.objectUrl)
        } catch {
          /* noop */
        }
      }
      this.assets.delete(id)
    }
  }

  /**
   * Força a revogação de um ativo independente do refCount.
   * Útil em casos de erro ou cleanup de sessão.
   */
  revokeAsset(id: string): void {
    const asset = this.assets.get(id)
    if (!asset) return
    if (asset.objectUrl) {
      try {
        URL.revokeObjectURL(asset.objectUrl)
      } catch {
        /* noop */
      }
    }
    this.assets.delete(id)
  }

  /**
   * Serializa todos os ativos para JSON (sem blobs — apenas dataUrls e
   * metadados). Útil para persistência em IndexedDB/localStorage.
   */
  serialize(): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [id, asset] of this.assets) {
      out[id] = {
        id: asset.id,
        type: asset.type,
        dataUrl: asset.dataUrl,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        refCount: asset.refCount,
        source: asset.source,
        licenseUrl: asset.licenseUrl,
        author: asset.author,
        provider: asset.provider,
      }
    }
    return out
  }

  /**
   * Restaura assets a partir de dados serializados. Recria blobs a partir dos
   * dataUrls e regenera objectUrls. Assets existentes com o mesmo ID NÃO são
   * sobrescritos (merge aditivo).
   */
  async deserialize(data: Record<string, any>): Promise<void> {
    if (!data || typeof data !== 'object') return
    for (const id of Object.keys(data)) {
      if (this.assets.has(id)) continue
      const entry = data[id]
      if (!entry || !entry.dataUrl) continue
      try {
        const res = await fetch(entry.dataUrl)
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const asset: MediaAsset = {
          id: entry.id ?? id,
          type: entry.type ?? deriveType(entry.mimeType || 'application/octet-stream'),
          blob,
          dataUrl: entry.dataUrl,
          mimeType: entry.mimeType || blob.type || 'application/octet-stream',
          sizeBytes: entry.sizeBytes ?? blob.size,
          width: entry.width,
          height: entry.height,
          duration: entry.duration,
          objectUrl,
          refCount: entry.refCount ?? 1,
          source: entry.source ?? 'import',
          licenseUrl: entry.licenseUrl,
          author: entry.author,
          provider: entry.provider,
        }
        this.assets.set(asset.id, asset)
      } catch {
        /* dataUrl inválido — ignora */
      }
    }
  }

  /** Estatísticas agregadas dos ativos em memória. */
  getStats(): { total: number; totalSizeBytes: number; byType: Record<string, number> } {
    let totalSizeBytes = 0
    const byType: Record<string, number> = {}
    for (const asset of this.assets.values()) {
      totalSizeBytes += asset.sizeBytes
      byType[asset.type] = (byType[asset.type] ?? 0) + 1
    }
    return { total: this.assets.size, totalSizeBytes, byType }
  }
}

/** Instância singleton compartilhada pela aplicação. */
export const assetManager = new AssetManager()
