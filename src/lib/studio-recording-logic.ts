/* =============================================================================
   LUMEN Studio — Lógica pura de gravação (Módulos 5, 6, 7)
   Funções puras e tabelas de estado sem dependência de React, para que possam
   ser testadas diretamente com vitest e reutilizadas por RecordingDock,
   PreFlightCheck e Gravadora.
   ========================================================================== */

import type { ScriptBlock, BackgroundConfig, StageLayout } from '@/types/studio'

/** Máquina de estados da gravação (Módulo 5). */
export type RecordingState =
  | 'idle'
  | 'requesting-permissions'
  | 'camera-ready'
  | 'countdown'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'processing'
  | 'saved'
  | 'error'

/** Tabela de transições válidas: origem → destinos permitidos. */
export const RECORDING_TRANSITIONS: Record<RecordingState, RecordingState[]> = {
  idle: ['requesting-permissions', 'error'],
  'requesting-permissions': ['camera-ready', 'error', 'idle'],
  'camera-ready': ['countdown', 'idle', 'error'],
  countdown: ['recording', 'camera-ready', 'error'],
  recording: ['paused', 'stopping', 'error'],
  paused: ['recording', 'stopping'],
  stopping: ['processing', 'error'],
  processing: ['saved', 'error'],
  saved: ['camera-ready', 'idle'],
  error: ['idle', 'requesting-permissions'],
}

/** Verifica se a transição entre dois estados é válida. */
export function canTransition(from: RecordingState, to: RecordingState): boolean {
  return RECORDING_TRANSITIONS[from]?.includes(to) ?? false
}

/** Rótulo amigável (pt-BR) de cada estado. */
const STATE_LABELS: Record<RecordingState, string> = {
  idle: 'Parado',
  'requesting-permissions': 'Solicitando permissão...',
  'camera-ready': 'Câmera pronta',
  countdown: 'Contagem...',
  recording: 'Gravando',
  paused: 'Pausado',
  stopping: 'Parando...',
  processing: 'Processando...',
  saved: 'Take salvo',
  error: 'Erro',
}

export function recordingStateLabel(state: RecordingState): string {
  return STATE_LABELS[state] ?? state
}

/** Cor de destaque do estado (para o indicador do dock). */
export function recordingStateColor(state: RecordingState): string {
  switch (state) {
    case 'recording':
      return 'red'
    case 'paused':
      return 'amber'
    case 'camera-ready':
    case 'saved':
      return 'emerald'
    case 'countdown':
    case 'processing':
    case 'stopping':
    case 'requesting-permissions':
      return 'violet'
    case 'error':
      return 'red'
    default:
      return 'slate'
  }
}

/** Formata segundos como MM:SS ou HH:MM:SS. */
export function formatTimer(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

/** Define quais botões do dock estão habilitados em cada estado. */
export function dockButtonsEnabled(state: RecordingState): {
  cameraToggle: boolean
  micToggle: boolean
  test: boolean
  countdown: boolean
  record: boolean
  pause: boolean
  stop: boolean
  marker: boolean
} {
  switch (state) {
    case 'idle':
      return {
        cameraToggle: true,
        micToggle: true,
        test: true,
        countdown: true,
        record: false,
        pause: false,
        stop: false,
        marker: false,
      }
    case 'requesting-permissions':
      return {
        cameraToggle: false,
        micToggle: false,
        test: false,
        countdown: false,
        record: false,
        pause: false,
        stop: false,
        marker: false,
      }
    case 'camera-ready':
      return {
        cameraToggle: true,
        micToggle: true,
        test: true,
        countdown: true,
        record: true,
        pause: false,
        stop: false,
        marker: false,
      }
    case 'countdown':
      return {
        cameraToggle: false,
        micToggle: false,
        test: false,
        countdown: false,
        record: false,
        pause: false,
        stop: true,
        marker: false,
      }
    case 'recording':
      return {
        cameraToggle: false,
        micToggle: false,
        test: false,
        countdown: false,
        record: false,
        pause: true,
        stop: true,
        marker: true,
      }
    case 'paused':
      return {
        cameraToggle: false,
        micToggle: false,
        test: false,
        countdown: false,
        record: true,
        pause: false,
        stop: true,
        marker: false,
      }
    case 'stopping':
    case 'processing':
      return {
        cameraToggle: false,
        micToggle: false,
        test: false,
        countdown: false,
        record: false,
        pause: false,
        stop: false,
        marker: false,
      }
    case 'saved':
      return {
        cameraToggle: true,
        micToggle: true,
        test: true,
        countdown: true,
        record: true,
        pause: false,
        stop: false,
        marker: false,
      }
    case 'error':
      return {
        cameraToggle: true,
        micToggle: true,
        test: false,
        countdown: false,
        record: false,
        pause: false,
        stop: false,
        marker: false,
      }
    default:
      return {
        cameraToggle: false,
        micToggle: false,
        test: false,
        countdown: false,
        record: false,
        pause: false,
        stop: false,
        marker: false,
      }
  }
}

/** Retorna true se a gravação está ativa (não pode trocar dispositivo, etc). */
export function isActivelyRecording(state: RecordingState): boolean {
  return (
    state === 'recording' ||
    state === 'paused' ||
    state === 'countdown' ||
    state === 'stopping' ||
    state === 'processing'
  )
}

/* =============================================================================
   Módulo 6 — Checklist pré-gravação (PreFlightCheck)
   ========================================================================== */

export interface PreFlightItem {
  id: string
  label: string
  /** Status: ok, warning (não bloqueante), block (bloqueia a gravação), pending. */
  status: 'ok' | 'warning' | 'block' | 'pending'
  detail?: string
}

export interface PreFlightInput {
  cameraStream: MediaStream | null
  micStream: MediaStream | null
  /** Compositor disponível (canvas pronto). */
  composerReady: boolean
  /** Resolução efetiva (ex.: 1920×1080). */
  resolution?: { width: number; height: number } | null
  /** FPS efetivo. */
  fps?: number | null
  /** Nível de áudio atual (0-100). */
  micLevel?: number
  /** Layout selecionado. */
  layout?: StageLayout
  /** Roteiro disponível (blocos ou texto). */
  hasScript: boolean
  /** Teleprompter configurado (modo selecionado). */
  teleprompterConfigured: boolean
  /** Fundo funcionando (tipo !== none OU sem erro). */
  backgroundOk: boolean
  /** Efeitos ativos (qualquer efeito facial ligado). */
  effectsActive: boolean
  /** Mídia do bloco carregada. */
  blockMediaLoaded: boolean
}

/** Avalia os itens do checklist a partir do estado atual. */
export function evaluatePreFlight(input: PreFlightInput): PreFlightItem[] {
  const items: PreFlightItem[] = []

  // Câmera — BLOQUEIA
  if (!input.cameraStream) {
    items.push({
      id: 'camera',
      label: 'Câmera detectada',
      status: 'block',
      detail: 'Nenhum stream de câmera ativo. Ative a câmera para gravar.',
    })
  } else {
    items.push({ id: 'camera', label: 'Câmera detectada', status: 'ok' })
  }

  // Resolução efetiva — warning se baixa
  if (input.resolution) {
    const low = Math.min(input.resolution.width, input.resolution.height) < 720
    items.push({
      id: 'resolution',
      label: 'Resolução efetiva',
      status: low ? 'warning' : 'ok',
      detail: `${input.resolution.width}×${input.resolution.height}${low ? ' (abaixo de 720p)' : ''}`,
    })
  } else {
    items.push({ id: 'resolution', label: 'Resolução efetiva', status: 'pending' })
  }

  // FPS — warning se baixo
  if (input.fps != null) {
    items.push({
      id: 'fps',
      label: 'FPS efetivo',
      status: input.fps < 24 ? 'warning' : 'ok',
      detail: `${input.fps} fps${input.fps < 24 ? ' (baixo)' : ''}`,
    })
  } else {
    items.push({ id: 'fps', label: 'FPS efetivo', status: 'pending' })
  }

  // Microfone — BLOQUEIA
  if (!input.micStream) {
    items.push({
      id: 'mic',
      label: 'Microfone detectado',
      status: 'block',
      detail: 'Nenhum stream de microfone ativo. Autorize o microfone para gravar.',
    })
  } else {
    items.push({ id: 'mic', label: 'Microfone detectado', status: 'ok' })
  }

  // Nível de áudio
  items.push({
    id: 'audio-level',
    label: 'Nível de áudio',
    status: input.micLevel != null && input.micLevel > 0 ? 'ok' : 'warning',
    detail: input.micLevel != null ? `${input.micLevel}%` : 'sem sinal',
  })

  // Compositor — BLOQUEIA
  if (!input.composerReady) {
    items.push({
      id: 'composer',
      label: 'Compositor disponível',
      status: 'block',
      detail: 'O compositor de canvas não está pronto.',
    })
  } else {
    items.push({ id: 'composer', label: 'Compositor disponível', status: 'ok' })
  }

  // Layout selecionado
  items.push({
    id: 'layout',
    label: 'Layout selecionado',
    status: 'ok',
    detail: input.layout ?? 'câmera cheia',
  })

  // Roteiro — warning (não bloqueia)
  items.push({
    id: 'script',
    label: 'Roteiro disponível',
    status: input.hasScript ? 'ok' : 'warning',
    detail: input.hasScript ? 'pronto' : 'nenhum roteiro',
  })

  // Teleprompter — warning
  items.push({
    id: 'teleprompter',
    label: 'Teleprompter configurado',
    status: input.teleprompterConfigured ? 'ok' : 'warning',
  })

  // Fundo — warning
  items.push({
    id: 'background',
    label: 'Fundo funcionando',
    status: input.backgroundOk ? 'ok' : 'warning',
  })

  // Efeitos — warning
  items.push({
    id: 'effects',
    label: 'Efeitos ativos',
    status: input.effectsActive ? 'ok' : 'warning',
    detail: input.effectsActive ? 'retoque facial ativo' : 'sem efeitos',
  })

  // Mídia do bloco — NÃO bloqueia (warning)
  items.push({
    id: 'block-media',
    label: 'Mídia do bloco carregada',
    status: input.blockMediaLoaded ? 'ok' : 'warning',
    detail: input.blockMediaLoaded ? 'carregada' : 'pendente (não bloqueia)',
  })

  return items
}

/** Retorna true se há bloqueios (itens 'block') no checklist. */
export function hasBlockingItems(items: PreFlightItem[]): boolean {
  return items.some((i) => i.status === 'block')
}

/** Conta itens por status. */
export function countByStatus(items: PreFlightItem[]): {
  ok: number
  warning: number
  block: number
  pending: number
} {
  const acc = { ok: 0, warning: 0, block: 0, pending: 0 }
  for (const i of items) acc[i.status] += 1
  return acc
}

/* =============================================================================
   Módulo 4 — Presets de câmera, aparência e layout (dados para o acordeão)
   ========================================================================== */

export type CameraPresetId =
  | 'natural'
  | 'webcam-melhorada'
  | 'estudio'
  | 'luz-baixa'
  | 'luz-fria'
  | 'luz-quente'
  | 'alto-contraste'
  | 'suave'
  | 'personalizado'

export interface CameraPreset {
  id: CameraPresetId
  label: string
  brightness: number
  contrast: number
  beautySmooth: number
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'natural', label: 'Natural', brightness: 100, contrast: 100, beautySmooth: 40 },
  {
    id: 'webcam-melhorada',
    label: 'Webcam Melhorada',
    brightness: 108,
    contrast: 108,
    beautySmooth: 55,
  },
  { id: 'estudio', label: 'Estúdio', brightness: 115, contrast: 105, beautySmooth: 45 },
  { id: 'luz-baixa', label: 'Luz Baixa', brightness: 130, contrast: 95, beautySmooth: 35 },
  { id: 'luz-fria', label: 'Luz Fria', brightness: 100, contrast: 110, beautySmooth: 40 },
  { id: 'luz-quente', label: 'Luz Quente', brightness: 105, contrast: 98, beautySmooth: 45 },
  {
    id: 'alto-contraste',
    label: 'Alto Contraste',
    brightness: 100,
    contrast: 135,
    beautySmooth: 30,
  },
  { id: 'suave', label: 'Suave', brightness: 105, contrast: 92, beautySmooth: 70 },
  { id: 'personalizado', label: 'Personalizado', brightness: 100, contrast: 100, beautySmooth: 40 },
]

export type BeautyPresetId =
  | 'off'
  | 'natural'
  | 'pele-suave'
  | 'controle-brilho'
  | 'estudio'
  | 'pronto-camera'
  | 'personalizado'

export interface BeautyPreset {
  id: BeautyPresetId
  label: string
  skinSmooth: number
  shineReduction: number
  toneUniformity: number
  rednessReduction: number
  wrinkleSmooth: number
  eyeEnhance: number
  nasolabial: number
  darkCircles: number
  facialLighting: number
  selectiveSharpness: number
  intensity: number
}

export const BEAUTY_PRESETS: BeautyPreset[] = [
  {
    id: 'off',
    label: 'Desligado',
    skinSmooth: 0,
    shineReduction: 0,
    toneUniformity: 0,
    rednessReduction: 0,
    wrinkleSmooth: 0,
    eyeEnhance: 0,
    nasolabial: 0,
    darkCircles: 0,
    facialLighting: 0,
    selectiveSharpness: 0,
    intensity: 0,
  },
  {
    id: 'natural',
    label: 'Natural (recomendado)',
    skinSmooth: 35,
    shineReduction: 30,
    toneUniformity: 20,
    rednessReduction: 15,
    wrinkleSmooth: 15,
    eyeEnhance: 20,
    nasolabial: 10,
    darkCircles: 20,
    facialLighting: 15,
    selectiveSharpness: 25,
    intensity: 40,
  },
  {
    id: 'pele-suave',
    label: 'Pele Suave',
    skinSmooth: 60,
    shineReduction: 35,
    toneUniformity: 30,
    rednessReduction: 20,
    wrinkleSmooth: 30,
    eyeEnhance: 15,
    nasolabial: 20,
    darkCircles: 25,
    facialLighting: 10,
    selectiveSharpness: 20,
    intensity: 55,
  },
  {
    id: 'controle-brilho',
    label: 'Controle de Brilho',
    skinSmooth: 30,
    shineReduction: 70,
    toneUniformity: 25,
    rednessReduction: 20,
    wrinkleSmooth: 15,
    eyeEnhance: 15,
    nasolabial: 10,
    darkCircles: 20,
    facialLighting: 20,
    selectiveSharpness: 20,
    intensity: 45,
  },
  {
    id: 'estudio',
    label: 'Estúdio',
    skinSmooth: 40,
    shineReduction: 40,
    toneUniformity: 35,
    rednessReduction: 25,
    wrinkleSmooth: 20,
    eyeEnhance: 25,
    nasolabial: 15,
    darkCircles: 25,
    facialLighting: 30,
    selectiveSharpness: 30,
    intensity: 50,
  },
  {
    id: 'pronto-camera',
    label: 'Pronto para Câmera',
    skinSmooth: 50,
    shineReduction: 50,
    toneUniformity: 40,
    rednessReduction: 30,
    wrinkleSmooth: 25,
    eyeEnhance: 30,
    nasolabial: 20,
    darkCircles: 30,
    facialLighting: 35,
    selectiveSharpness: 35,
    intensity: 65,
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    skinSmooth: 35,
    shineReduction: 30,
    toneUniformity: 20,
    rednessReduction: 15,
    wrinkleSmooth: 15,
    eyeEnhance: 20,
    nasolabial: 10,
    darkCircles: 20,
    facialLighting: 15,
    selectiveSharpness: 25,
    intensity: 40,
  },
]

export type AspectRatioOption = '9:16' | '16:9' | '1:1' | '4:5'

export type SplitModeId = 'full' | 'split-top' | 'split-bottom' | 'pip'

export interface SplitModeOption {
  id: SplitModeId
  label: string
}

export const SPLIT_MODES: SplitModeOption[] = [
  { id: 'full', label: 'Câmera cheia' },
  { id: 'split-top', label: 'Câmera em cima' },
  { id: 'split-bottom', label: 'Câmera embaixo' },
  { id: 'pip', label: 'Picture-in-picture' },
]

/** Conta palavras e estima duração de um texto (~150 wpm). */
export function estimateScriptStats(text: string): {
  words: number
  durationSeconds: number
  blocks: number
} {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const durationSeconds = Math.max(0, Math.ceil((words / 150) * 60))
  const blocks = text.trim()
    ? text
        .trim()
        .split(/\n{2,}/)
        .filter(Boolean).length
    : 0
  return { words, durationSeconds, blocks }
}

/** Presets de divisão de roteiro (Módulo 4). */
export type SplitPresetId = 'short' | 'medium' | 'long' | 'one-sentence' | 'custom'

export interface SplitPreset {
  id: SplitPresetId
  label: string
  /** Alvo aproximado de segundos por bloco. */
  targetSeconds: number
}

export const SPLIT_PRESETS: SplitPreset[] = [
  { id: 'short', label: 'Blocos curtos (~15s)', targetSeconds: 15 },
  { id: 'medium', label: 'Blocos médios (~30s)', targetSeconds: 30 },
  { id: 'long', label: 'Blocos longos (~60s)', targetSeconds: 60 },
  { id: 'one-sentence', label: 'Uma frase por bloco', targetSeconds: 0 },
  { id: 'custom', label: 'Duração personalizada', targetSeconds: 45 },
]

/**
 * Divisão determinística de texto em blocos (fallback quando IA indisponível).
 * Estratégia: divide por parágrafos duplos; se um parágrafo exceder o alvo,
 * divide por frases (pontuação) agrupando até atingir o alvo de segundos.
 * Quando targetSeconds === 0, cada frase vira um bloco (one-sentence).
 */
export function deterministicSplit(text: string, targetSeconds: number): ScriptBlock[] {
  const clean = text.trim()
  if (!clean) return []

  const makeBlock = (t: string, idx: number): ScriptBlock => ({
    id: 'blk-' + Date.now().toString(36) + '-' + idx,
    text: t.trim(),
    status: 'pending',
    estimatedSeconds: Math.max(
      1,
      Math.ceil((t.trim().split(/\s+/).filter(Boolean).length / 150) * 60),
    ),
  })

  // One sentence per block.
  if (targetSeconds === 0) {
    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return sentences.map((s, i) => makeBlock(s, i))
  }

  const targetWords = Math.max(1, Math.round((targetSeconds / 60) * 150))
  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const blocks: ScriptBlock[] = []
  let idx = 0

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length <= targetWords) {
      blocks.push(makeBlock(para, idx++))
      continue
    }
    // Divide o parágrafo por frases, agrupando até targetWords.
    const sentences = para
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    let bucket: string[] = []
    let bucketWords = 0
    for (const sentence of sentences) {
      const sw = sentence.split(/\s+/).filter(Boolean).length
      if (bucketWords + sw > targetWords && bucket.length > 0) {
        blocks.push(makeBlock(bucket.join(' '), idx++))
        bucket = []
        bucketWords = 0
      }
      bucket.push(sentence)
      bucketWords += sw
    }
    if (bucket.length > 0) {
      blocks.push(makeBlock(bucket.join(' '), idx++))
    }
  }

  return blocks
}
