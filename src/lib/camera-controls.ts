/* =============================================================================
   LUMEN Studio — Controles profissionais de câmera (PROMPT 6, Seção 6)
   -----------------------------------------------------------------------------
   Módulo PURO (sem React, sem DOM obrigatório) que centraliza toda a lógica de:
   - Detecção de capacidades reais do hardware (getCapabilities/getSettings).
   - Construção de MediaTrackConstraints para applyConstraints/getUserMedia.
   - Presets de câmera profissionais (valores reais + fallback digital).
   - Matemática de crop/pan do zoom digital (aplicada no compositor canvas).
   - Normalização de resoluções/FPS suportados.

   Este módulo NÃO simula nada: se applyConstraints falhar, o erro real deve
   ser reportado pela UI. As funções aqui apenas PREPARAM os dados — a chamada
   efetiva a MediaStreamTrack.applyConstraints() fica na Gravadora, para que
   possamos testar a lógica pura sem depender de hardware.
   ========================================================================== */

import type { CameraCrop } from '@/lib/studio-compositor'

/* ---------------------------------------------------------------------------
   Tipos de capacidades (subconjunto de MediaTrackCapabilities)
   ------------------------------------------------------------------------- */

/** Subconjunto de MediaTrackCapabilities que importamos para os controles. */
export interface CameraCapabilities {
  width: { min: number; max: number } | null
  height: { min: number; max: number } | null
  frameRate: { min: number; max: number } | null
  zoom: { min: number; max: number; step: number } | null
  exposureMode: string[] | null
  exposureCompensation: { min: number; max: number; step: number } | null
  focusMode: string[] | null
  focusDistance: { min: number; max: number; step: number } | null
  whiteBalanceMode: string[] | null
  colorTemperature: { min: number; max: number; step: number } | null
  brightness: { min: number; max: number; step: number } | null
  contrast: { min: number; max: number; step: number } | null
  saturation: { min: number; max: number; step: number } | null
  sharpness: { min: number; max: number; step: number } | null
}

export const EMPTY_CAPABILITIES: CameraCapabilities = {
  width: null,
  height: null,
  frameRate: null,
  zoom: null,
  exposureMode: null,
  exposureCompensation: null,
  focusMode: null,
  focusDistance: null,
  whiteBalanceMode: null,
  colorTemperature: null,
  brightness: null,
  contrast: null,
  saturation: null,
  sharpness: null,
}

/** Resoluções padrão oferecidas (apenas as suportadas pelo hardware aparecem). */
export interface ResolutionOption {
  id: '720p' | '1080p' | '1440p' | '4k'
  label: string
  width: number
  height: number
}

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { id: '720p', label: '720p', width: 1280, height: 720 },
  { id: '1080p', label: '1080p', width: 1920, height: 1080 },
  { id: '1440p', label: '1440p', width: 2560, height: 1440 },
  { id: '4k', label: '4K', width: 3840, height: 2160 },
]

/** FPS padrão oferecidos (apenas os suportados pelo hardware aparecem). */
export const FPS_OPTIONS: number[] = [24, 30, 60]

/* ---------------------------------------------------------------------------
   1. Parsing de getCapabilities() → CameraCapabilities normalizado
   ------------------------------------------------------------------------- */

/** Normaliza o objeto cru de getCapabilities() para o nosso CameraCapabilities. */
export function parseCapabilities(
  raw: Record<string, unknown> | undefined | null,
): CameraCapabilities {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_CAPABILITIES }
  const r = raw as Record<string, any>
  const range = (v: any): { min: number; max: number; step: number } | null => {
    if (!v || typeof v !== 'object') return null
    const min = typeof v.min === 'number' ? v.min : 0
    const max = typeof v.max === 'number' ? v.max : 0
    if (max <= 0) return null
    return { min, max, step: typeof v.step === 'number' ? v.step : 0 }
  }
  const minMax = (v: any): { min: number; max: number } | null => {
    if (!v || typeof v !== 'object') return null
    const min = typeof v.min === 'number' ? v.min : 0
    const max = typeof v.max === 'number' ? v.max : 0
    if (max <= 0) return null
    return { min, max }
  }
  const strArr = (v: any): string[] | null => {
    if (!Array.isArray(v) || v.length === 0) return null
    return v.map(String)
  }
  return {
    width: minMax(r.width),
    height: minMax(r.height),
    frameRate: minMax(r.frameRate),
    zoom: range(r.zoom),
    exposureMode: strArr(r.exposureMode),
    exposureCompensation: range(r.exposureCompensation),
    focusMode: strArr(r.focusMode),
    focusDistance: range(r.focusDistance),
    whiteBalanceMode: strArr(r.whiteBalanceMode),
    colorTemperature: range(r.colorTemperature),
    brightness: range(r.brightness),
    contrast: range(r.contrast),
    saturation: range(r.saturation),
    sharpness: range(r.sharpness),
  }
}

/** Resoluções suportadas pelo hardware (apenas as que o dispositivo entrega). */
export function supportedResolutions(caps: CameraCapabilities): ResolutionOption[] {
  const maxH = caps.height?.max ?? 0
  return RESOLUTION_OPTIONS.filter((o) => maxH >= o.height)
}

/** FPS suportados pelo hardware (apenas os que o dispositivo entrega). */
export function supportedFrameRates(caps: CameraCapabilities): number[] {
  const maxFps = caps.frameRate?.max ?? 0
  return FPS_OPTIONS.filter((f) => maxFps >= f)
}

/** Rótulo curto de proporção (ex.: "16:9"). */
export function aspectLabel(width: number, height: number): string {
  if (!width || !height) return '—'
  const g = gcd(width, height)
  return `${width / g}:${height / g}`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/* ---------------------------------------------------------------------------
   2. Construção de MediaTrackConstraints (para applyConstraints)
   ------------------------------------------------------------------------- */

export interface CameraHardwareSettings {
  resolutionId: ResolutionOption['id'] | 'auto'
  frameRate: number | 'auto'
  exposureMode?: string
  exposureCompensation?: number
  focusMode?: string
  focusDistance?: number
  whiteBalanceMode?: string
  colorTemperature?: number
  brightness?: number
  contrast?: number
  saturation?: number
  sharpness?: number
}

/** Resolve a ResolutionOption a partir do id (ou 'auto'). */
export function resolutionById(id: ResolutionOption['id'] | 'auto'): ResolutionOption | null {
  if (id === 'auto') return null
  return RESOLUTION_OPTIONS.find((r) => r.id === id) ?? null
}

/**
 * Constrói o objeto de constraints a ser aplicado via track.applyConstraints().
 * Inclui APENAS os campos que o hardware suporta (segundo caps) — aplicar um
 * campo não suportado lança OverconstrainedError, então filtramos.
 * Campos ausentes em `settings` são omitidos (não alterados).
 */
export function buildTrackConstraints(
  settings: CameraHardwareSettings,
  caps: CameraCapabilities,
): Record<string, unknown> {
  // Usamos Record<string, unknown> em vez de MediaTrackConstraintSet porque
  // lib.dom.d.ts não inclui os campos avançados de câmera (exposureMode,
  // focusMode, whiteBalanceMode, colorTemperature, brightness, contrast,
  // saturation, sharpness, etc.) — eles são válidos em applyConstraints() mas
  // não tipados. O objeto retornado é passado direto a applyConstraints().
  const c: Record<string, unknown> = {}
  const res = resolutionById(settings.resolutionId)
  if (res && caps.height && res.height <= caps.height.max) {
    c.width = { ideal: res.width }
    c.height = { ideal: res.height }
  }
  if (
    typeof settings.frameRate === 'number' &&
    caps.frameRate &&
    settings.frameRate <= caps.frameRate.max
  ) {
    c.frameRate = { ideal: settings.frameRate }
  }
  if (settings.exposureMode && caps.exposureMode?.includes(settings.exposureMode)) {
    c.exposureMode = settings.exposureMode
  }
  if (
    typeof settings.exposureCompensation === 'number' &&
    caps.exposureCompensation &&
    settings.exposureCompensation >= caps.exposureCompensation.min &&
    settings.exposureCompensation <= caps.exposureCompensation.max
  ) {
    c.exposureCompensation = settings.exposureCompensation
  }
  if (settings.focusMode && caps.focusMode?.includes(settings.focusMode)) {
    c.focusMode = settings.focusMode
  }
  if (
    typeof settings.focusDistance === 'number' &&
    caps.focusDistance &&
    settings.focusDistance >= caps.focusDistance.min &&
    settings.focusDistance <= caps.focusDistance.max
  ) {
    c.focusDistance = settings.focusDistance
  }
  if (settings.whiteBalanceMode && caps.whiteBalanceMode?.includes(settings.whiteBalanceMode)) {
    c.whiteBalanceMode = settings.whiteBalanceMode
  }
  if (
    typeof settings.colorTemperature === 'number' &&
    caps.colorTemperature &&
    settings.colorTemperature >= caps.colorTemperature.min &&
    settings.colorTemperature <= caps.colorTemperature.max
  ) {
    c.colorTemperature = settings.colorTemperature
  }
  for (const [key, field] of [
    ['brightness', 'brightness'],
    ['contrast', 'contrast'],
    ['saturation', 'saturation'],
    ['sharpness', 'sharpness'],
  ] as const) {
    const v = settings[key]
    const range = caps[field]
    if (typeof v === 'number' && range && v >= range.min && v <= range.max) {
      c[field] = v
    }
  }
  return c
}

/** Verifica se um controle individual é suportado pelo hardware. */
export function isControlSupported(
  caps: CameraCapabilities,
  control:
    | 'exposureMode'
    | 'exposureCompensation'
    | 'focusMode'
    | 'focusDistance'
    | 'whiteBalanceMode'
    | 'colorTemperature'
    | 'brightness'
    | 'contrast'
    | 'saturation'
    | 'sharpness'
    | 'zoom',
): boolean {
  const v = caps[control]
  if (!v) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object' && 'max' in v) return (v as { max: number }).max > 0
  return false
}

/* ---------------------------------------------------------------------------
   3. Presets de câmera profissionais
   ------------------------------------------------------------------------- */

export type CameraProPresetId =
  | 'natural'
  | 'webcam-melhorada'
  | 'estudio'
  | 'luz-baixa'
  | 'luz-fria'
  | 'luz-quente'
  | 'alto-contraste'
  | 'suave'
  | 'personalizado'

/** Valores que um preset profissional altera (digital, via compositor). */
export interface CameraProPresetValues {
  brightness: number
  contrast: number
  saturation: number
  temperature: number
  sharpness: number
  smoothness: number
  beautySmooth: number
  vignette: number
}

export interface CameraProPreset extends CameraProPresetValues {
  id: CameraProPresetId
  label: string
  /** Descrição curta dos valores modificados (pt-BR). */
  description: string
}

/** Valores padrão (preset "Natural"). Usado como base de restauração. */
export const DEFAULT_CAMERA_PRO_VALUES: CameraProPresetValues = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  sharpness: 0,
  smoothness: 0,
  beautySmooth: 40,
  vignette: 0,
}

export const CAMERA_PRO_PRESETS: CameraProPreset[] = [
  {
    id: 'natural',
    label: 'Natural',
    description: 'Valores padrão do dispositivo.',
    ...DEFAULT_CAMERA_PRO_VALUES,
  },
  {
    id: 'webcam-melhorada',
    label: 'Webcam Melhorada',
    description: 'Leve aumento de contraste + nitidez.',
    brightness: 104,
    contrast: 110,
    saturation: 105,
    temperature: 4,
    sharpness: 20,
    smoothness: 5,
    beautySmooth: 45,
    vignette: 0,
  },
  {
    id: 'estudio',
    label: 'Estúdio',
    description: 'Exposição equilibrada, temperatura neutra, nitidez moderada.',
    brightness: 108,
    contrast: 104,
    saturation: 102,
    temperature: 0,
    sharpness: 25,
    smoothness: 0,
    beautySmooth: 40,
    vignette: 0,
  },
  {
    id: 'luz-baixa',
    label: 'Luz Baixa',
    description: 'Aumento de exposição/brilho, redução de ruído.',
    brightness: 128,
    contrast: 96,
    saturation: 98,
    temperature: -4,
    sharpness: 0,
    smoothness: 25,
    beautySmooth: 30,
    vignette: 0,
  },
  {
    id: 'luz-fria',
    label: 'Luz Fria',
    description: 'Temperatura fria, contraste alto.',
    brightness: 100,
    contrast: 118,
    saturation: 104,
    temperature: -35,
    sharpness: 15,
    smoothness: 0,
    beautySmooth: 40,
    vignette: 5,
  },
  {
    id: 'luz-quente',
    label: 'Luz Quente',
    description: 'Temperatura quente, contraste suave.',
    brightness: 104,
    contrast: 96,
    saturation: 106,
    temperature: 35,
    sharpness: 10,
    smoothness: 5,
    beautySmooth: 45,
    vignette: 0,
  },
  {
    id: 'alto-contraste',
    label: 'Alto Contraste',
    description: 'Contraste máximo.',
    brightness: 100,
    contrast: 140,
    saturation: 110,
    temperature: 0,
    sharpness: 20,
    smoothness: 0,
    beautySmooth: 35,
    vignette: 10,
  },
  {
    id: 'suave',
    label: 'Suave',
    description: 'Nitidez reduzida, contraste baixo.',
    brightness: 104,
    contrast: 92,
    saturation: 98,
    temperature: 6,
    sharpness: 0,
    smoothness: 30,
    beautySmooth: 60,
    vignette: 0,
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    description: 'Valores manuais.',
    ...DEFAULT_CAMERA_PRO_VALUES,
  },
]

/** Retorna um preset pelo id (fallback: natural). */
export function getPreset(id: CameraProPresetId): CameraProPreset {
  return CAMERA_PRO_PRESETS.find((p) => p.id === id) ?? CAMERA_PRO_PRESETS[0]
}

/** Detecta qual preset está ativo comparando os valores atuais. */
export function detectActivePreset(current: CameraProPresetValues): CameraProPresetId {
  for (const p of CAMERA_PRO_PRESETS) {
    if (p.id === 'personalizado') continue
    const keys: (keyof CameraProPresetValues)[] = [
      'brightness',
      'contrast',
      'saturation',
      'temperature',
      'sharpness',
      'smoothness',
      'beautySmooth',
      'vignette',
    ]
    if (keys.every((k) => p[k] === current[k])) return p.id
  }
  return 'personalizado'
}

/* ---------------------------------------------------------------------------
   4. Zoom digital (crop + scale) — matemática aplicada no compositor
   ------------------------------------------------------------------------- */

/** Limites do zoom digital (1x a 4x, conforme PROMPT). */
export const DIGITAL_ZOOM_MIN = 1
export const DIGITAL_ZOOM_MAX = 4

/** Garante que o zoom está no intervalo suportado. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DIGITAL_ZOOM_MIN
  return Math.max(DIGITAL_ZOOM_MIN, Math.min(DIGITAL_ZOOM_MAX, zoom))
}

/** Garante que panX/panY estão em [-1, 1]. */
export function clampPan(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(-1, Math.min(1, v))
}

/** Aplica zoom + pan normalizados, retornando um CameraCrop válido. */
export function makeCrop(zoom: number, panX: number, panY: number, mirror: boolean): CameraCrop {
  return {
    zoom: clampZoom(zoom),
    panX: clampPan(panX),
    panY: clampPan(panY),
    mirror,
  }
}

/**
 * Centraliza o crop num ponto alvo (ex.: centro do rosto detectado).
 * `faceX`/`faceY` são coordenadas normalizadas (0..1) do rosto no frame.
 * Calcula o pan necessário para que o rosto fique centrado na área recortada.
 */
export function centerCropOnPoint(
  zoom: number,
  faceX: number, // 0..1 (0 = esquerda, 1 = direita)
  faceY: number, // 0..1 (0 = topo, 1 = base)
  mirror: boolean,
): CameraCrop {
  const z = clampZoom(zoom)
  // O centro do recorte está em 0.5. Para trazer `face` ao centro, o pan
  // precisa deslocar o recorte na direção oposta ao offset do rosto.
  // panX positivo move o recorte para a direita (mostra mais à esquerda).
  const offsetX = (faceX - 0.5) * 2 // -1..1
  const offsetY = (faceY - 0.5) * 2 // -1..1
  // Com zoom > 1, o range útil de pan é proporcional; mantemos em -1..1 pois
  // o compositor já normaliza pelo maxPan interno.
  const panX = clampPan(-offsetX)
  const panY = clampPan(-offsetY)
  return { zoom: z, panX, panY, mirror }
}

/** Restaurar crop para o padrão (1x, centro, sem espelho). */
export function restoreCrop(mirror: boolean): CameraCrop {
  return { ...makeCrop(1, 0, 0, mirror) }
}

/* ---------------------------------------------------------------------------
   5. Erro de câmera → mensagem amigável (pt-BR)
   ------------------------------------------------------------------------- */

/** Converte um erro de getUserMedia/applyConstraints em mensagem pt-BR clara. */
export function cameraErrorMessage(err: unknown): {
  kind: 'denied' | 'notfound' | 'busy' | 'overconstrained' | 'unknown'
  message: string
} {
  const name = (err as any)?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      kind: 'denied',
      message:
        'A câmera está bloqueada nas configurações do seu navegador. Clique no ícone de cadeado na barra de endereço, vá em "Configurações do site" e mude a câmera para "Permitir".',
    }
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return { kind: 'notfound', message: 'Nenhuma câmera compatível foi encontrada.' }
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      kind: 'busy',
      message: 'A câmera está em uso por outro aplicativo. Feche-o e tente novamente.',
    }
  }
  if (name === 'OverconstrainedError') {
    return {
      kind: 'overconstrained',
      message: 'A câmera não suporta uma ou mais restrições solicitadas.',
    }
  }
  return { kind: 'unknown', message: (err as any)?.message || 'Não foi possível acessar a câmera.' }
}
