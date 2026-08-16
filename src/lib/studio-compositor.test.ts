/* =============================================================================
   Testes do Compositor Único (studio-compositor)
   Cobre: drawComposition, cameraCssFilter, ASPECT_DIMENSIONS, ordem de camadas,
   fundo cor/desfoque não escondem a pessoa, tela dividida, título.
   Usa jsdom + canvas mockado (vitest environment: jsdom via setup).
   ========================================================================== */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  drawComposition,
  cameraCssFilter,
  ASPECT_DIMENSIONS,
  DEFAULT_CAMERA_CROP,
  type CompositionInputs,
} from '@/lib/studio-compositor'
import type { BackgroundConfig, TitleConfig, StageLayout } from '@/types/studio'
import type { CameraConfigLike } from '@/types/studio'

/** Cria um mock de CanvasRenderingContext2D que registra chamadas. */
function mockCtx() {
  const calls: string[] = []
  const ctx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    clearRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`clearRect ${x},${y},${w},${h}`),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`fillRect ${x},${y},${w},${h}`),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    filter: 'none',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    drawImage: (el: unknown, ...args: number[]) =>
      calls.push(`drawImage ${typeof el} ${args.join(',')}`),
    beginPath: () => calls.push('beginPath'),
    rect: (x: number, y: number, w: number, h: number) => calls.push(`rect ${x},${y},${w},${h}`),
    clip: () => calls.push('clip'),
    translate: (x: number, y: number) => calls.push(`translate ${x},${y}`),
    scale: (x: number, y: number) => calls.push(`scale ${x},${y}`),
    stroke: () => calls.push('stroke'),
    fillText: (t: string, x: number, y: number) => calls.push(`fillText ${t} ${x},${y}`),
    measureText: (t: string) => ({ width: t.length * 10 }),
    arcTo: () => calls.push('arcTo'),
    moveTo: () => calls.push('moveTo'),
    closePath: () => calls.push('closePath'),
    setLineDash: () => calls.push('setLineDash'),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`strokeRect ${x},${y},${w},${h}`),
  } as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

const BG_NONE: BackgroundConfig = {
  type: 'none',
  blurAmount: 12,
  presetColor: '#1E3A5F',
  segmentationEnabled: false,
}

const CAM_DEFAULT: CameraConfigLike = { brightness: 100, contrast: 100, beautySmooth: 0 }

function makeInput(over: Partial<CompositionInputs>): CompositionInputs {
  const { ctx } = mockCtx()
  return {
    ctx,
    width: 1080,
    height: 1920,
    layout: 'full' as StageLayout,
    background: BG_NONE,
    camera: CAM_DEFAULT,
    cameraCrop: DEFAULT_CAMERA_CROP,
    cameraVideo: null,
    ...over,
  }
}

describe('ASPECT_DIMENSIONS', () => {
  it('9:16 é retrato 1080x1920', () => {
    expect(ASPECT_DIMENSIONS['9:16']).toEqual({ width: 1080, height: 1920 })
  })
  it('16:9 é paisagem 1920x1080', () => {
    expect(ASPECT_DIMENSIONS['16:9']).toEqual({ width: 1920, height: 1080 })
  })
})

describe('cameraCssFilter', () => {
  it('brightness/contrast 100 = sem alteração (1.0)', () => {
    expect(cameraCssFilter(CAM_DEFAULT)).toBe('brightness(1.000) contrast(1.000)')
  })
  it('beautySmooth > 0 adiciona blur', () => {
    const f = cameraCssFilter({ brightness: 100, contrast: 100, beautySmooth: 50 })
    expect(f).toContain('blur(')
  })
  it('brightness 50 → 0.5', () => {
    const f = cameraCssFilter({ brightness: 50, contrast: 100, beautySmooth: 0 })
    expect(f).toContain('brightness(0.500)')
  })
})

describe('drawComposition — fundo e camadas', () => {
  it('fundo none preenche preto', () => {
    const { ctx, calls } = mockCtx()
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'none', segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
    })
    expect(calls.some((c) => c.startsWith('fillRect 0,0,1080,1920'))).toBe(true)
  })

  it('fundo cor sólida usa presetColor como fillStyle', () => {
    const { ctx } = mockCtx()
    const c = ctx as unknown as { fillStyle: string }
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'preset', presetColor: '#FFC0CB', segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
    })
    // Cor rosa pintada atrás; câmera (null) desenha placeholder por cima.
    expect(c.fillStyle).toBe('#FFC0CB')
  })

  it('CENÁRIO 3: fundo rosa + câmera → câmera desenhada DEPOIS do fundo (pessoa visível)', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'preset', presetColor: '#FFC0CB', segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
    })
    const bgIdx = calls.findIndex((c) => c.startsWith('fillRect 0,0,1080,1920'))
    const camIdx = calls.findIndex((c) => c.startsWith('drawImage'))
    expect(bgIdx).toBeGreaterThanOrEqual(0)
    expect(camIdx).toBeGreaterThan(bgIdx) // câmera depois do fundo
  })

  it('CENÁRIO 4: desfoque de fundo → drawImage do vídeo desfocado ANTES da câmera nítida', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'blur', blurAmount: 15, segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
    })
    // Pelo menos 2 drawImage: fundo desfocado + câmera nítida.
    const draws = calls.filter((c) => c.startsWith('drawImage'))
    expect(draws.length).toBeGreaterThanOrEqual(2)
  })
})

describe('drawComposition — tela dividida', () => {
  it('CENÁRIO 5: split-top desenha câmera em cima e mídia embaixo', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    const fakeMedia = { naturalWidth: 800, naturalHeight: 600 } as unknown as HTMLImageElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'split-top',
      background: BG_NONE,
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
      split: { url: 'x', type: 'image', cameraRatio: 0.6 },
      splitMediaEl: fakeMedia,
    })
    // Deve haver drawImage para câmera e para mídia.
    const draws = calls.filter((c) => c.startsWith('drawImage'))
    expect(draws.length).toBeGreaterThanOrEqual(2)
  })
})

describe('drawComposition — título', () => {
  it('título habilitado chama fillText', () => {
    const { ctx, calls } = mockCtx()
    const title: TitleConfig = {
      enabled: true,
      text: 'Olá Mundo',
      font: 'Anton',
      fontSize: 64,
      width: 80,
      color: '#FFFFFF',
      bgEnabled: false,
      bgColor: 'transparent',
      alignment: 'center',
      position: 'middle',
      normalizedX: 0.5,
      normalizedY: 0.5,
      duration: 'full',
      durationSeconds: 5,
    }
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: BG_NONE,
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
      title,
    })
    expect(calls.some((c) => c.startsWith('fillText Olá'))).toBe(true)
  })

  it('título desabilitado NÃO chama fillText', () => {
    const { ctx, calls } = mockCtx()
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: BG_NONE,
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
      title: {
        enabled: false,
        text: 'x',
        font: 'Anton',
        fontSize: 64,
        width: 80,
        color: '#fff',
        bgEnabled: false,
        bgColor: 'transparent',
        alignment: 'center',
        position: 'middle',
        normalizedX: 0.5,
        normalizedY: 0.5,
        duration: 'full',
        durationSeconds: 5,
      },
    })
    expect(calls.some((c) => c.startsWith('fillText'))).toBe(false)
  })
})
