import { useCallback, useEffect, useState } from 'react'
import type { BlockArt, BlockBRoll, ReactionVideo, WhiteboardState } from '@/types/studio'

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
