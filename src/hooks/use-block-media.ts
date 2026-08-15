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

  const setBRoll = useCallback((b: BlockBRoll | null) => setBroll(b), [])

  return { broll, setBRoll }
}

/** Lê o B-roll de um bloco de forma síncrona — para overlays. */
export function readBlockBRoll(blockId: string): BlockBRoll | null {
  return readJSON<BlockBRoll | null>(BROLL_PREFIX + blockId, null)
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

/* ── Util: converte File em data URL base64 ──────────────────────────────── */

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
