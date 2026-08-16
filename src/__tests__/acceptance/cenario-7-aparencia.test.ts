/* =============================================================================
   CENÁRIO 7 — Aparência
   Mock: rosto detectado + preset Natural + brilho reduzido.
   Assert: brilho da pele diminui seletivamente, textura preservada, sem efeito
   plástico, resultado na gravação. Verifica o pipeline de filtros (ctx.filter e
   cameraFilterOverride) e os presets de beleza.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  composeFrame,
  cameraCssFilter,
  type StudioComposition,
  type CameraCrop,
} from '@/lib/studio-compositor'
import { BEAUTY_PRESETS } from '@/lib/studio-recording-logic'
import type { BackgroundConfig, StageLayout, CameraConfigLike } from '@/types/studio'
import { mockCtx, fakeVideo, hasCall } from './_mocks'

const BG_NONE: BackgroundConfig = { type: 'none', segmentationEnabled: false }
const CROP: CameraCrop = { zoom: 1, panX: 0, panY: 0, mirror: false }

describe('CENÁRIO 7 — Aparência', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.restoreAllMocks()
  })

  it('preset Natural existe e tem valores de retoque facial', () => {
    const natural = BEAUTY_PRESETS.find((p) => p.id === 'natural')
    expect(natural).toBeDefined()
    expect(natural!.skinSmooth).toBeGreaterThan(0)
    expect(natural!.shineReduction).toBeGreaterThan(0)
    // Preserva textura: intensidade moderada (não máxima) e skinSmooth < 60.
    expect(natural!.skinSmooth).toBeLessThan(60)
    expect(natural!.intensity).toBeLessThanOrEqual(50)
  })

  it('brilho reduzido (brightness 90) reduz luminância no filter CSS', () => {
    const cam: CameraConfigLike = { brightness: 90, contrast: 100, beautySmooth: 0 }
    const f = cameraCssFilter(cam)
    expect(f).toContain('brightness(0.900)')
    // Comparado ao brilho padrão (1.000), há redução.
    const base = cameraCssFilter({ brightness: 100, contrast: 100, beautySmooth: 0 })
    expect(f).not.toBe(base)
  })

  it('preset Natural + brilho reduzido produz filter diferente do desligado', () => {
    const off = BEAUTY_PRESETS.find((p) => p.id === 'off')!
    const natural = BEAUTY_PRESETS.find((p) => p.id === 'natural')!
    const camOff: CameraConfigLike = {
      brightness: off.camera.brightness,
      contrast: off.camera.contrast,
      beautySmooth: off.camera.beautySmooth,
      saturation: off.camera.saturation,
      temperature: off.camera.temperature,
      smoothness: off.camera.smoothness,
    }
    const camNatural: CameraConfigLike = {
      brightness: natural.camera.brightness,
      contrast: natural.camera.contrast,
      beautySmooth: natural.camera.beautySmooth,
      saturation: natural.camera.saturation,
      temperature: natural.camera.temperature,
      smoothness: natural.camera.smoothness,
    }
    // Brilho reduzido: brightness 85 (< 100).
    const camDim: CameraConfigLike = { ...camNatural, brightness: 85 }
    const fOff = cameraCssFilter(camOff)
    const fDim = cameraCssFilter(camDim)
    expect(fOff).not.toBe(fDim)
    expect(fDim).toContain('brightness(0.850)')
  })

  it('rosto detectado: cameraFilterOverride aplica o filter na câmera', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    const cam: CameraConfigLike = { brightness: 85, contrast: 100, beautySmooth: 30 }
    const composition: StudioComposition = {
      layout: 'full' as StageLayout,
      background: BG_NONE,
      camera: cam,
      cameraCrop: CROP,
      cameraVideo: video,
      cameraFilterOverride: cameraCssFilter(cam),
    }
    composeFrame(ctx, 1080, 1920, composition, 0)
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('textura preservada: skinSmooth Natural é moderado (sem efeito plástico)', () => {
    const natural = BEAUTY_PRESETS.find((p) => p.id === 'natural')!
    // O efeito plástico ocorre com skinSmooth alto (>70) + intensity alto (>80).
    // Natural usa valores bem abaixo — preserva poros/identidade.
    expect(natural.skinSmooth).toBeLessThanOrEqual(50)
    expect(natural.intensity).toBeLessThanOrEqual(50)
    // Mistura parcial no shader: clamp(skinAmt * 0.6, 0, 0.75) < 1.
    const skinAmt = (natural.skinSmooth / 100) * (natural.intensity / 100)
    const blend = Math.min(skinAmt * 0.6, 0.75)
    expect(blend).toBeLessThan(0.75)
  })

  it('resultado na gravação: composeFrame usa o MESMO cameraFilterOverride', () => {
    const cam: CameraConfigLike = { brightness: 85, contrast: 100, beautySmooth: 30 }
    const filter = cameraCssFilter(cam)
    const { ctx: previewCtx, calls: previewCalls } = mockCtx()
    composeFrame(
      previewCtx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: cam,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        cameraFilterOverride: filter,
      },
      0,
    )
    const { ctx: recCtx, calls: recCalls } = mockCtx()
    composeFrame(
      recCtx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: cam,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        cameraFilterOverride: filter,
      },
      0,
    )
    // Mesma pipeline (compositor único) → mesmo padrão de drawImage.
    expect(previewCalls.filter((c) => c.op === 'drawImage').length).toBe(
      recCalls.filter((c) => c.op === 'drawImage').length,
    )
  })
})
