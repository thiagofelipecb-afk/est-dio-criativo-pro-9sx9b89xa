/* ===========================================================================
   LUMEN Studio — Tipos e helpers do Inspetor do Editor de Vídeo
   Aditivo: nada existente é alterado. Usado pelos painéis do inspetor em
   /editor/:projectId (CaptionPanel, MediaPanel, AdjustmentsPanel,
   EffectsPanel, AudioPanel).
   =========================================================================== */

/* ── Ajustes (CSS filter no <video>) ────────────────────────────────────── */
export interface AdjustmentsState {
  brightness: number // 0-200, padrão 100
  contrast: number // 0-200, padrão 100
  saturation: number // 0-200, padrão 100
  temperature: number // -50 a +50, padrão 0
  hue: number // -180 a +180, padrão 0
  exposure: number // -50 a +50, padrão 0
  shadows: number // -100 a +100, padrão 0
  highlights: number // -100 a +100, padrão 0
  sharpness: number // 0-100, padrão 0 (UI-only — sem CSS filter nativo)
  smoothness: number // 0-100, padrão 0 (aplicado como blur)
  vignette: number // 0-100, padrão 0 (overlay, não filter)
}

export const DEFAULT_ADJUSTMENTS: AdjustmentsState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  hue: 0,
  exposure: 0,
  shadows: 0,
  highlights: 0,
  sharpness: 0,
  smoothness: 0,
  vignette: 0,
}

/** Converte o estado de ajustes em string CSS filter para o <video>. */
export function adjustmentsToCssFilter(a: AdjustmentsState): string {
  const brightness = Math.max(0, (a.brightness + a.exposure * 2 + a.shadows) / 100)
  const contrast = Math.max(0, (a.contrast + (a.highlights - a.shadows) * 0.3) / 100)
  const saturation = Math.max(0, a.saturation / 100)
  const hueRotate = a.hue + (a.temperature > 0 ? -a.temperature : a.temperature) / 2
  const sepia = a.temperature > 0 ? a.temperature / 100 : 0
  const blur = a.smoothness > 0 ? (a.smoothness / 100) * 1.5 : 0
  const parts: string[] = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturation.toFixed(3)})`,
  ]
  if (hueRotate !== 0) parts.push(`hue-rotate(${hueRotate.toFixed(1)}deg)`)
  if (sepia > 0) parts.push(`sepia(${sepia.toFixed(3)})`)
  if (blur > 0) parts.push(`blur(${blur.toFixed(2)}px)`)
  return parts.join(' ')
}

/* ── Efeitos (presets visuais) ─────────────────────────────────────────── */
export type EffectPresetId =
  | 'cinematic'
  | 'vintage'
  | 'neon'
  | 'darkmatte'
  | 'bw'
  | 'warm'
  | 'cold'
  | 'custom'

export interface EffectPreset {
  id: EffectPresetId
  label: string
  description: string
  filter: string
}

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Contraste +, saturação -, vinheta',
    filter: 'contrast(1.1) saturate(0.9) brightness(0.95)',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    description: 'Sépia + saturação reduzida',
    filter: 'sepia(0.4) saturate(0.7) contrast(0.95)',
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'Brilho alto + matiz roxa',
    filter: 'brightness(1.2) contrast(1.3) hue-rotate(280deg) saturate(1.5)',
  },
  {
    id: 'darkmatte',
    label: 'Dark Matte',
    description: 'Sombras elevadas + contraste reduzido',
    filter: 'brightness(0.85) contrast(0.9) saturate(0.8)',
  },
  {
    id: 'bw',
    label: 'Preto e Branco',
    description: 'Saturação 0%',
    filter: 'saturate(0) contrast(1.05)',
  },
  {
    id: 'warm',
    label: 'Quente',
    description: 'Temperatura +30',
    filter: 'sepia(0.25) saturate(1.1) hue-rotate(-10deg)',
  },
  {
    id: 'cold',
    label: 'Frio',
    description: 'Temperatura -30',
    filter: 'saturate(0.9) hue-rotate(15deg) brightness(1.05)',
  },
  { id: 'custom', label: 'Personalizado', description: 'Sliders livres (aba Ajustes)', filter: '' },
]

export type TransitionType = 'none' | 'dissolve' | 'slide' | 'zoom' | 'wipe' | 'glitch'

export interface EffectsState {
  activeFilters: EffectPresetId[]
  transition: TransitionType
  transitionDuration: number // 0.1-2.0s
}

export const DEFAULT_EFFECTS: EffectsState = {
  activeFilters: [],
  transition: 'none',
  transitionDuration: 0.5,
}

export function effectsToCssFilter(state: EffectsState): string {
  return state.activeFilters
    .map((id) => EFFECT_PRESETS.find((p) => p.id === id)?.filter)
    .filter((f): f is string => !!f && f.length > 0)
    .join(' ')
}

/* ── Áudio ─────────────────────────────────────────────────────────────── */
export interface EditorAudioState {
  voiceVolume: number // 0-200, padrão 100
  musicVolume: number // 0-100, padrão 30
  muted: boolean
  fadeIn: number // 0-5s
  fadeOut: number // 0-5s
  noiseSuppression: boolean
  ducking: boolean
}

export const DEFAULT_EDITOR_AUDIO: EditorAudioState = {
  voiceVolume: 100,
  musicVolume: 30,
  muted: false,
  fadeIn: 0,
  fadeOut: 0,
  noiseSuppression: false,
  ducking: false,
}

/* ── Legendas (CaptionTrack / CaptionCue / CaptionWord) ────────────────── */
export type CaptionAnimation =
  | 'none'
  | 'fade'
  | 'pop'
  | 'bounce'
  | 'slide'
  | 'typewriter'
  | 'karaoke'
  | 'highlight'

export interface CaptionWord {
  word: string
  start: number
  end: number
}

export interface CaptionCue {
  id: string
  startTime: number
  endTime: number
  text: string
  words: CaptionWord[]
  style: string // preset id
  position?: { x: number; y: number } // coordenadas normalizadas 0..1
  animation: CaptionAnimation
  version: number
}

export interface CaptionStyle {
  fontFamily: string
  fontWeight: number
  fontSize: number
  uppercase: boolean
  color: string
  activeColor: string
  outline: boolean
  shadow: boolean
  background: string
  opacity: number
  padding: number
  borderRadius: number
  maxWidth: number // 40-100 (%)
  lines: number // 1-3
  lineHeight: number
  letterSpacing: number
  align: 'left' | 'center' | 'right'
  vertical: 'top' | 'middle' | 'bottom'
}

export interface CaptionTrack {
  id: string
  cues: CaptionCue[]
  preset: string
  version: number
}

export type CaptionPresetId =
  | 'clean-center'
  | 'solid-box'
  | 'two-lines'
  | 'word-pop'
  | 'karaoke'
  | 'dynamic-pop'
  | 'podcast'
  | 'minimal'
  | 'big-hook'
  | 'keyword-color'

export interface CaptionPreset {
  id: CaptionPresetId
  label: string
  style: CaptionStyle
  animation: CaptionAnimation
}

const BASE_STYLE: CaptionStyle = {
  fontFamily: 'Inter',
  fontWeight: 700,
  fontSize: 32,
  uppercase: false,
  color: '#FFFFFF',
  activeColor: '#22D3EE',
  outline: true,
  shadow: true,
  background: 'transparent',
  opacity: 100,
  padding: 8,
  borderRadius: 8,
  maxWidth: 90,
  lines: 2,
  lineHeight: 1.2,
  letterSpacing: 0,
  align: 'center',
  vertical: 'bottom',
}

export const CAPTION_PRESETS: CaptionPreset[] = [
  { id: 'clean-center', label: 'Limpa central', style: { ...BASE_STYLE }, animation: 'fade' },
  {
    id: 'solid-box',
    label: 'Caixa sólida',
    style: { ...BASE_STYLE, background: '#000000', opacity: 80, outline: false },
    animation: 'pop',
  },
  {
    id: 'two-lines',
    label: 'Duas linhas',
    style: { ...BASE_STYLE, lines: 2, fontSize: 36 },
    animation: 'slide',
  },
  {
    id: 'word-pop',
    label: 'Palavra destacada',
    style: { ...BASE_STYLE, activeColor: '#FACC15', fontWeight: 800 },
    animation: 'highlight',
  },
  {
    id: 'karaoke',
    label: 'Karaoke palavra por palavra',
    style: { ...BASE_STYLE, activeColor: '#7C5CFC', fontWeight: 800 },
    animation: 'karaoke',
  },
  {
    id: 'dynamic-pop',
    label: 'Pop dinâmico',
    style: { ...BASE_STYLE, fontWeight: 900, fontSize: 40, activeColor: '#FF2D55' },
    animation: 'pop',
  },
  {
    id: 'podcast',
    label: 'Podcast',
    style: { ...BASE_STYLE, background: '#14141C', opacity: 90, borderRadius: 12 },
    animation: 'fade',
  },
  {
    id: 'minimal',
    label: 'Minimalista',
    style: { ...BASE_STYLE, fontSize: 24, fontWeight: 500, outline: false, shadow: false },
    animation: 'none',
  },
  {
    id: 'big-hook',
    label: 'Gancho grande',
    style: { ...BASE_STYLE, fontSize: 56, fontWeight: 900, uppercase: true },
    animation: 'bounce',
  },
  {
    id: 'keyword-color',
    label: 'Palavra-chave em cor diferente',
    style: { ...BASE_STYLE, activeColor: '#22D3EE', fontWeight: 800 },
    animation: 'highlight',
  },
]

export const CAPTION_ANIMATIONS: { id: CaptionAnimation; label: string }[] = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'fade', label: 'Fade' },
  { id: 'pop', label: 'Pop' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'slide', label: 'Slide' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'highlight', label: 'Destaque progressivo' },
]

export const CAPTION_FONTS = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Montserrat', label: 'Montserrat' },
  { id: 'Roboto', label: 'Roboto' },
  { id: 'Anton', label: 'Anton' },
]

export const DEFAULT_CAPTION_STYLE: CaptionStyle = { ...BASE_STYLE }

/* ── Mídias / B-roll ───────────────────────────────────────────────────── */
export interface EditorMediaItem {
  id: string
  name: string
  type: 'image' | 'video'
  url: string // object URL ou data URL
  duration?: number
  // propriedades da mídia selecionada na timeline
  scale: number // 0.1-2.0
  x: number // normalizado 0..1
  y: number // normalizado 0..1
  opacity: number // 0-100
  timelineDuration: number // segundos
  z: number // camada relativa
}

/* ── Storage helpers (prefixados por projectId) ────────────────────────── */
export function editorKey(projectId: string, suffix: string): string {
  return `lumen_editor_${projectId}_${suffix}`
}

export function loadEditorState<T>(projectId: string, suffix: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(editorKey(projectId, suffix))
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as T) }
  } catch {
    return fallback
  }
}

export function saveEditorState<T>(projectId: string, suffix: string, value: T): void {
  try {
    localStorage.setItem(editorKey(projectId, suffix), JSON.stringify(value))
  } catch {
    /* quota — ignora */
  }
}

/** Formata segundos em mm:ss.cs (para legendas SRT/VTT). */
export function formatTimestamp(seconds: number, comma = false): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000)
  const sep = comma ? ',' : '.'
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms, 3)}`
}
