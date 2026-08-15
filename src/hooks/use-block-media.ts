import { useCallback, useEffect, useState } from 'react'
import type { BlockArt, BlockBRoll, ReactionVideo, WhiteboardState } from '@/types/studio'
import { assetManager } from '@/lib/asset-manager'

/* ── PROMPT 53/56 (GAP 1) — Contagem reativa de blocos com B-roll ──────────
   Hook que recebe a lista de blockIds dos blocos do roteiro e retorna, de
   forma reativa, quantos possuem B-roll vinculado. Reage à seleção/remoção
   de B-roll em qualquer bloco (via evento `lumen-block-media-changed` e
   `storage`) além de reavaliar quando a lista de blockIds muda. */
export function useBlockBRollCount(blockIds: string[]): { count: number; total: number } {
  const [count, setCount] = useState(0)
  const total = blockIds.length

  const refresh = useCallback(() => {
    let n = 0
    for (const id of blockIds) {
      if (readBlockBRoll(id)) n++
    }
    setCount(n)
  }, [blockIds])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener('lumen-block-media-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('lumen-block-media-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [refresh])

  return { count, total }
}

/* ───────────────────────────────────────────────────────────────────────────
   use-block-media — FASE 3
   Hooks de persistência em localStorage para artes por bloco, B-roll por bloco,
   vídeo de reação e quadro editável. Tudo com prefixo `lumen_gravadora_`.
   ─────────────────────────────────────────────────────────────────────────── */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / modo privado — ignora silenciosamente */
  }
}

const ARTS_PREFIX = 'lumen_gravadora_artes_'
const BROLL_PREFIX = 'lumen_gravadora_broll_'

/* ── Artes por bloco ─────────────────────────────────────────────────────── */

export function useBlockArts(blockId: string) {
  const key = ARTS_PREFIX + blockId
  const [arts, setArts] = useState<BlockArt[]>(() => readJSON<BlockArt[]>(key, []))

  useEffect(() => {
    setArts(readJSON<BlockArt[]>(key, []))
  }, [key])

  useEffect(() => {
    writeJSON(key, arts)
  }, [key, arts])

  // GAP 2/3 — Sincroniza quando a mídia é redistribuída externamente (split/join)
  // via writeBlockArts/clearBlockMedia. O evento global força a releitura.
  useEffect(() => {
    const handler = () => setArts(readJSON<BlockArt[]>(key, []))
    window.addEventListener('lumen-block-media-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('lumen-block-media-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [key])

  const addArt = useCallback((dataUrl: string, name?: string) => {
    setArts((prev) => [
      ...prev,
      { id: 'art-' + Math.random().toString(36).slice(2, 9), dataUrl, name },
    ])
  }, [])

  const removeArt = useCallback((id: string) => {
    setArts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { arts, addArt, removeArt }
}

/** Lê as artes de um bloco de forma síncrona (sem reatividade) — para overlays. */
export function readBlockArts(blockId: string): BlockArt[] {
  return readJSON<BlockArt[]>(ARTS_PREFIX + blockId, [])
}

/* ── B-roll por bloco ────────────────────────────────────────────────────── */

export function useBlockBRoll(blockId: string) {
  const key = BROLL_PREFIX + blockId
  const [broll, setBroll] = useState<BlockBRoll | null>(() =>
    readJSON<BlockBRoll | null>(key, null),
  )

  useEffect(() => {
    setBroll(readJSON<BlockBRoll | null>(key, null))
  }, [key])

  useEffect(() => {
    writeJSON(key, broll)
  }, [key, broll])

  // GAP 2/3 — Sincroniza quando a mídia é redistribuída externamente (split/join).
  useEffect(() => {
    const handler = () => setBroll(readJSON<BlockBRoll | null>(key, null))
    window.addEventListener('lumen-block-media-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('lumen-block-media-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [key])

  const setBRoll = useCallback((b: BlockBRoll | null) => setBroll(b), [])

  return { broll, setBRoll }
}

/** Lê o B-roll de um bloco de forma síncrona — para overlays. */
export function readBlockBRoll(blockId: string): BlockBRoll | null {
  return readJSON<BlockBRoll | null>(BROLL_PREFIX + blockId, null)
}

/* ── Escritores síncronos (GAP 2/3 — redistribuição de mídia ao dividir/juntar)
   Permitem mover artes/B-roll de um blockId para outro quando blocos são
   divididos ou juntados, sem depender de reatividade. ──────────────────────── */

/** Grava as artes de um bloco de forma síncrona (sobrescreve). */
export function writeBlockArts(blockId: string, arts: BlockArt[]): void {
  writeJSON(ARTS_PREFIX + blockId, arts)
}

/** Grava o B-roll de um bloco de forma síncrona (sobrescreve). */
export function writeBlockBRoll(blockId: string, broll: BlockBRoll | null): void {
  writeJSON(BROLL_PREFIX + blockId, broll)
}

/** Remove artes e B-roll vinculados a um bloco (após redistribuição). */
export function clearBlockMedia(blockId: string): void {
  try {
    localStorage.removeItem(ARTS_PREFIX + blockId)
    localStorage.removeItem(BROLL_PREFIX + blockId)
  } catch {
    /* noop */
  }
}

/* ── Vídeo de reação (global da Gravadora) ───────────────────────────────── */

const REACTION_KEY = 'lumen_gravadora_reaction_video'

export function useReactionVideo() {
  const [reaction, setReactionState] = useState<ReactionVideo | null>(() =>
    readJSON<ReactionVideo | null>(REACTION_KEY, null),
  )

  useEffect(() => {
    writeJSON(REACTION_KEY, reaction)
  }, [reaction])

  const setReaction = useCallback((r: ReactionVideo | null) => setReactionState(r), [])

  return { reaction, setReaction }
}

export function readReactionVideo(): ReactionVideo | null {
  return readJSON<ReactionVideo | null>(REACTION_KEY, null)
}

/* ── Quadro editável (global da Gravadora) ───────────────────────────────── */

const WHITEBOARD_KEY = 'lumen_gravadora_whiteboard'

/**
 * PROMPT 52 — Chaves separadas para a cena editável que o Estúdio lê e para
 * o preview PNG gerado pelo botão "Usar este quadro". A chave legada
 * `lumen_gravadora_whiteboard` permanece como backup/rascunho automático.
 */
export const WHITEBOARD_SCENE_KEY = 'lumen_gravadora_whiteboard_scene'
export const WHITEBOARD_PREVIEW_KEY = 'lumen_gravadora_whiteboard_preview'

export function useWhiteboard() {
  const [state, setState] = useState<WhiteboardState>(() =>
    readJSON<WhiteboardState>(WHITEBOARD_KEY, { elements: [], groups: [], zoom: 1 }),
  )

  useEffect(() => {
    writeJSON(WHITEBOARD_KEY, state)
  }, [state])

  const setStateSafe = useCallback((s: WhiteboardState) => setState(s), [])

  return { whiteboard: state, setWhiteboard: setStateSafe }
}

/**
 * PROMPT 52 — Cena editável dedicada lida/escrita pela rota /estudio/quadro.
 * Independente do `useWhiteboard` (rascunho automático), para que "Usar este
 * quadro" produza um snapshot estável que o Estúdio consome.
 */
export function readWhiteboardScene(): WhiteboardState | null {
  return readJSON<WhiteboardState | null>(WHITEBOARD_SCENE_KEY, null)
}

export function writeWhiteboardScene(state: WhiteboardState): void {
  writeJSON(WHITEBOARD_SCENE_KEY, state)
}

/** Lê o preview PNG (dataUrl) gerado por "Usar este quadro". */
export function readWhiteboardPreview(): string | null {
  try {
    return localStorage.getItem(WHITEBOARD_PREVIEW_KEY)
  } catch {
    return null
  }
}

/** Grava o preview PNG (dataUrl) gerado por "Usar este quadro". */
export function writeWhiteboardPreview(dataUrl: string): void {
  try {
    localStorage.setItem(WHITEBOARD_PREVIEW_KEY, dataUrl)
  } catch {
    /* quota — ignora */
  }
}

/* ── Util: converte File em data URL base64 ──────────────────────────────── */

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/* ===========================================================================
   PROMPT 67 / GAP 1 — Integração com o AssetManager (gerenciador de ativos).
   Funções aditivas que registram/removem ativos no assetManager sempre que
   mídia é adicionada ou removida de um bloco. Mantêm o refCount correto e
   revogam object URLs quando o ativo não é mais referenciado.
   =========================================================================== */

/**
 * Registra/Adiciona mídia a um bloco passando pelo assetManager.
 * - Converte o File/Blob em ativo (addAsset) incrementando o refCount.
 * - Grava o `assetId` no registro persistido do bloco para posterior decrement.
 * Retorna o ativo criado/reutilizado.
 */
export async function addMediaToBlock(
  blockId: string,
  file: File,
  source: 'upload' | 'pexels' | 'canvas' | 'recording' | 'import' = 'upload',
  meta?: { name?: string; licenseUrl?: string; author?: string; provider?: string },
): Promise<BlockArt> {
  const asset = await assetManager.addAsset(file, source, {
    type: 'image',
    author: meta?.author,
    licenseUrl: meta?.licenseUrl,
    provider: meta?.provider,
  })
  const art: BlockArt = {
    id: 'art-' + Math.random().toString(36).slice(2, 9),
    dataUrl: asset.dataUrl ?? '',
    name: meta?.name ?? file.name,
    assetId: asset.id,
  }
  // Persiste a arte no bloco (append).
  const existing = readBlockArts(blockId)
  writeBlockArts(blockId, [...existing, art])
  window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
  return art
}

/**
 * Remove mídia de um bloco passando pelo assetManager (decrementa refCount).
 * Se o refCount chegar a 0, o objectUrl é revogado automaticamente.
 */
export function removeMediaFromBlock(blockId: string, artId: string): void {
  const arts = readBlockArts(blockId)
  const target = arts.find((a) => a.id === artId)
  if (target?.assetId) {
    assetManager.decrementRef(target.assetId)
  }
  writeBlockArts(
    blockId,
    arts.filter((a) => a.id !== artId),
  )
  window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
}

/**
 * Substitui (set) toda a mídia de um bloco passando pelo assetManager.
 * Decrementa refs dos ativos anteriores e adiciona os novos.
 */
export async function setMediaForBlock(
  blockId: string,
  files: File[],
  source: 'upload' | 'pexels' | 'canvas' | 'recording' | 'import' = 'upload',
): Promise<BlockArt[]> {
  // Decrementa refs dos ativos anteriores.
  const previous = readBlockArts(blockId)
  for (const art of previous) {
    if (art.assetId) assetManager.decrementRef(art.assetId)
  }
  // Adiciona os novos.
  const newArts: BlockArt[] = []
  for (const file of files) {
    const asset = await assetManager.addAsset(file, source, { type: 'image' })
    newArts.push({
      id: 'art-' + Math.random().toString(36).slice(2, 9),
      dataUrl: asset.dataUrl ?? '',
      name: file.name,
      assetId: asset.id,
    })
  }
  writeBlockArts(blockId, newArts)
  window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
  return newArts
}

/**
 * PROMPT 67 / GAP 1 — Registra um B-roll do Pexels no assetManager.
 * O B-roll do Pexels é uma URL remota (não um blob local), então criamos um
 * ativo apenas para rastreamento de refCount/origem; o objectUrl é a própria
 * URL remota. Retorna o BlockBRoll enriquecido com `assetId`.
 */
export async function registerBRollAsset(broll: BlockBRoll): Promise<BlockBRoll> {
  try {
    // Busca a miniatura como proxy para criar um blob rastreável (opcional).
    // Como B-roll do Pexels é URL remota, registramos um ativo "vazio" apenas
    // para fins de inventário — sem blob. Usamos addAsset com um blob mínimo.
    const placeholderBlob = new Blob(['pexels'], { type: 'application/octet-stream' })
    const asset = await assetManager.addAsset(placeholderBlob, 'pexels', {
      type: 'broll',
      provider: 'pexels',
      author: broll.author,
      licenseUrl: broll.licenseUrl,
    })
    return { ...broll, assetId: asset.id }
  } catch {
    return broll
  }
}

/** Remove (decrementa) o ativo de B-roll do assetManager. */
export function unregisterBRollAsset(broll: BlockBRoll | null): void {
  if (broll?.assetId) {
    assetManager.decrementRef(broll.assetId)
  }
}
