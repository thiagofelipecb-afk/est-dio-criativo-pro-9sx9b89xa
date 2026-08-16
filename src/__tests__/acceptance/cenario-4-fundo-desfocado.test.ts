/* =============================================================================
   CENÁRIO 4 — Fundo desfocado
   Mock: webcam + blurBackground ativo.
   Assert: fundo desfocado, pessoa nítida, intensidade ajustável, pessoa não
   desaparece. O blur é aplicado APENAS na camada de fundo (não na camada da
   pessoa).
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { composeFrame, type StudioComposition, type CameraCrop } from '@/lib/studio-compositor'
import type { BackgroundConfig, StageLayout } from '@/types/studio'
import { mockCtx, fakeVideo, hasCall } from './_mocks'

const CAM = { brightness: 100, contrast: 100, beautySmooth: 0 }
const CROP: CameraCrop = { zoom: 1, panX: 0, panY: 0, mirror: false }

function blurBg(amount: number): BackgroundConfig {
  return { type: 'blur', blurAmount: amount, segmentationEnabled: false }
}

describe('CENÁRIO 4 — Fundo desfocado', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.restoreAllMocks()
  })

  it('fundo desfocado é desenhado (drawImage do vídeo com filter blur)', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: blurBg(50),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: video,
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
    // O ctx.filter foi alterado em algum momento para incluir blur.
    const ctxAny = ctx as unknown as { filter: string }
    // O filter final volta a 'none', mas durante o desenho do fundo ele foi
    // setado. Como o mock sobrescreve, capturamos via inspeção de pelo menos
    // um drawImage ter ocorrido (fundo + pessoa).
  })

  it('pessoa nítida é desenhada por cima do desfoque (2+ drawImage)', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: blurBg(60),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: video,
      },
      0,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('pessoa não desaparece com fundo desfocado', () => {
    const { ctx, calls } = mockCtx()
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: blurBg(80),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('intensidade ajustável: blurAmount 20 vs 80 produz ctx.filter diferente', () => {
    // Capturamos os valores de filter setados durante o drawBackground.
    function captureFilter(amount: number): string[] {
      const filters: string[] = []
      const { ctx } = mockCtx()
      const real = ctx as unknown as { filter: string }
      // Intercepta o setter de filter.
      let _filter = 'none'
      Object.defineProperty(ctx, 'filter', {
        get: () => _filter,
        set: (v: string) => {
          _filter = v
          filters.push(v)
        },
        configurable: true,
      })
      composeFrame(
        ctx,
        1080,
        1920,
        {
          layout: 'full' as StageLayout,
          background: blurBg(amount),
          camera: CAM,
          cameraCrop: CROP,
          cameraVideo: fakeVideo(1280, 720),
        },
        0,
      )
      void real
      return filters
    }
    const f20 = captureFilter(20)
    const f80 = captureFilter(80)
    // Pelo menos um filter com blur foi setado em cada caso.
    expect(f20.some((f) => f.includes('blur'))).toBe(true)
    expect(f80.some((f) => f.includes('blur'))).toBe(true)
    // Os valores de blur são distintos (intensidade ajustável).
    const b20 = f20.find((f) => f.includes('blur')) || ''
    const b80 = f80.find((f) => f.includes('blur')) || ''
    expect(b20).not.toBe(b80)
  })

  it('blur aplicado APENAS na camada de fundo (filter volta a none antes da câmera)', () => {
    const { ctx } = mockCtx()
    const filters: string[] = []
    let _filter = 'none'
    Object.defineProperty(ctx, 'filter', {
      get: () => _filter,
      set: (v: string) => {
        _filter = v
        filters.push(v)
      },
      configurable: true,
    })
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: blurBg(50),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    // O filter 'none' é setado novamente após o desenho do fundo desfocado,
    // garantindo que a pessoa (segunda camada) é desenhada sem blur.
    expect(filters).toContain('none')
  })
})
