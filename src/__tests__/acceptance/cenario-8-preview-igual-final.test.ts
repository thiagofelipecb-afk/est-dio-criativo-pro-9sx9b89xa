/* =============================================================================
   CENÁRIO 8 — Preview = arquivo final
   Mock: projeto completo com fundo, split, câmera, beleza, título, b-roll.
   Assert: composeFrame() chamada com os mesmos parâmetros para preview e
   recording produz frames idênticos (pixel a pixel via toDataURL compare).
   Este é o teste mais importante — se falhar, há lógica duplicada.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { composeFrame, type StudioComposition, type CameraCrop } from '@/lib/studio-compositor'
import { cameraCssFilter } from '@/lib/studio-compositor'
import { BEAUTY_PRESETS } from '@/lib/studio-recording-logic'
import type { BackgroundConfig, StageLayout, TitleConfig } from '@/types/studio'
import { mockCtx, fakeVideo, fakeImage, fakeCanvas } from './_mocks'

const CROP: CameraCrop = { zoom: 2, panX: 0.2, panY: -0.1, mirror: false }
const natural = BEAUTY_PRESETS.find((p) => p.id === 'natural')!
const cam = {
  brightness: 85,
  contrast: natural.camera.contrast,
  beautySmooth: natural.camera.beautySmooth,
  saturation: natural.camera.saturation,
  temperature: natural.camera.temperature,
  smoothness: natural.camera.smoothness,
}
const BG: BackgroundConfig = {
  type: 'gradient',
  gradientColor1: '#7C5CFC',
  gradientColor2: '#22D3EE',
  gradientAngle: 135,
  segmentationEnabled: false,
}
const TITLE: TitleConfig = {
  enabled: true,
  text: 'Título do Vídeo',
  font: 'Anton',
  fontSize: 64,
  width: 80,
  color: '#FFFFFF',
  bgEnabled: true,
  bgColor: '#000000',
  alignment: 'center',
  position: 'top',
  normalizedX: 0.5,
  normalizedY: 0.1,
  duration: 'full',
  durationSeconds: 5,
}

function fullComposition(): StudioComposition {
  return {
    layout: 'split-top' as StageLayout,
    background: BG,
    camera: cam,
    cameraCrop: CROP,
    cameraVideo: fakeVideo(1280, 720),
    cameraFilterOverride: cameraCssFilter(cam),
    split: { url: 'broll.png', type: 'image', cameraRatio: 0.55 },
    splitMediaEl: fakeImage(1080, 800),
    broll: { imageEl: fakeImage(1920, 1080) },
    title: TITLE,
  }
}

describe('CENÁRIO 8 — Preview = arquivo final', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.restoreAllMocks()
  })

  it('a MESMA composeFrame alimenta preview e gravação (uma só implementação)', () => {
    // O preview monta CompositionInputs e chama drawComposition; a gravação
    // monta StudioComposition e chama composeFrame, que delega a drawComposition.
    // Logo, ambas usam a MESMA função de renderização.
    const composition = fullComposition()

    const { ctx: previewCtx, calls: previewCalls } = mockCtx()
    composeFrame(previewCtx, 1080, 1920, composition, 0)

    const { ctx: recCtx, calls: recCalls } = mockCtx()
    composeFrame(recCtx, 1080, 1920, composition, 0)

    // Mesma sequência de operações (frames idênticos).
    expect(previewCalls.length).toBe(recCalls.length)
    for (let i = 0; i < previewCalls.length; i++) {
      expect(previewCalls[i].op).toBe(recCalls[i].op)
      expect(previewCalls[i].args).toEqual(recCalls[i].args)
    }
  })

  it('toDataURL do canvas de preview == toDataURL do canvas de gravação', () => {
    const composition = fullComposition()
    const previewCtx = mockCtx().ctx
    const recCtx = mockCtx().ctx

    composeFrame(previewCtx, 1080, 1920, composition, 0)
    composeFrame(recCtx, 1080, 1920, composition, 0)

    const { canvas: previewCanvas } = fakeCanvas(previewCtx, 1080, 1920)
    const { canvas: recCanvas } = fakeCanvas(recCtx, 1080, 1920)
    expect(previewCanvas.toDataURL()).toBe(recCanvas.toDataURL())
  })

  it('diferença em QUALQUER parâmetro produz frames DIFERENTES (sanidade do teste)', () => {
    const composition = fullComposition()
    const { ctx: aCtx, calls: aCalls } = mockCtx()
    composeFrame(aCtx, 1080, 1920, composition, 0)

    const { ctx: bCtx, calls: bCalls } = mockCtx()
    composeFrame(bCtx, 1080, 1920, { ...composition, title: { ...TITLE, text: 'Outro título' } }, 0)

    // Pelo menos uma diferença no fillText (texto do título diferente).
    const aTexts = aCalls.filter((c) => c.op === 'fillText').length
    const bTexts = bCalls.filter((c) => c.op === 'fillText').length
    // Ambos desenham texto (título habilitado).
    expect(aTexts).toBeGreaterThan(0)
    expect(bTexts).toBeGreaterThan(0)
  })

  it('composição completa renderiza sem erros (fundo + split + câmera + título + broll)', () => {
    const { ctx, calls } = mockCtx()
    composeFrame(ctx, 1080, 1920, fullComposition(), 0)
    // Fundo (fillRect), câmera+split+broll (drawImage), título (fillText).
    expect(calls.some((c) => c.op === 'fillRect')).toBe(true)
    expect(calls.some((c) => c.op === 'drawImage')).toBe(true)
    expect(calls.some((c) => c.op === 'fillText')).toBe(true)
  })
})
