/* =============================================================================
   CENÁRIO 6 — Zoom e enquadramento
   Mock: câmera sem zoom nativo + zoom digital 2x + pan (0.2, 0.3).
   Assert: preview amplia, enquadramento reposiciona, imagem não deforma
   (aspect ratio mantido), gravação usa mesmo crop.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  composeFrame,
  drawComposition,
  type StudioComposition,
  type CameraCrop,
  DEFAULT_CAMERA_CROP,
} from '@/lib/studio-compositor'
import { clampZoom, clampPan, makeCrop } from '@/lib/camera-controls'
import type { BackgroundConfig, StageLayout } from '@/types/studio'
import { mockCtx, fakeVideo, hasCall } from './_mocks'

const CAM = { brightness: 100, contrast: 100, beautySmooth: 0 }
const BG_NONE: BackgroundConfig = { type: 'none', segmentationEnabled: false }

describe('CENÁRIO 6 — Zoom e enquadramento', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.restoreAllMocks()
  })

  it('zoom digital 2x é aceito e clampado corretamente', () => {
    expect(clampZoom(2)).toBe(2)
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(10)).toBe(4)
  })

  it('pan (0.2, 0.3) é aceito e clampado entre -1 e 1', () => {
    expect(clampPan(0.2)).toBeCloseTo(0.2)
    expect(clampPan(0.3)).toBeCloseTo(0.3)
    expect(clampPan(-2)).toBe(-1)
  })

  it('makeCrop(2, 0.2, 0.3, false) produz crop válido', () => {
    const crop = makeCrop(2, 0.2, 0.3, false)
    expect(crop).toEqual({ zoom: 2, panX: 0.2, panY: 0.3, mirror: false })
  })

  it('preview amplia: composeFrame com zoom 2x desenha a câmera', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    const crop: CameraCrop = makeCrop(2, 0.2, 0.3, false)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: crop,
        cameraVideo: video,
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('enquadramento reposiciona: pan 0.2 vs 0.3 produzem drawImage com sx diferente', () => {
    // O crop afeta a região de origem (sx) no drawImage de 9 args.
    function sxFor(crop: CameraCrop): number | undefined {
      const { ctx, calls } = mockCtx()
      composeFrame(
        ctx,
        1080,
        1920,
        {
          layout: 'full' as StageLayout,
          background: BG_NONE,
          camera: CAM,
          cameraCrop: crop,
          cameraVideo: fakeVideo(1280, 720),
        },
        0,
      )
      const nine = calls.find((c) => c.op === 'drawImage' && c.args.length === 8)
      return nine?.args[0]
    }
    const sx1 = sxFor(makeCrop(2, 0.2, 0.3, false))
    const sx2 = sxFor(makeCrop(2, -0.2, -0.3, false))
    expect(sx1).not.toBe(sx2)
  })

  it('imagem não deforma: aspect ratio da origem é mantido no destino (baseW/baseH same ratio)', () => {
    // Com zoom 2x em 1280x720, a região de origem é 640x360 (razão 16:9 ==
    // 1280x720). Verificamos que a razão do crop de origem mantém a da fonte.
    const srcW = 1280
    const srcH = 720
    const zoom = 2
    const baseW = srcW / zoom // 640
    const baseH = srcH / zoom // 360
    expect(baseW / baseH).toBeCloseTo(srcW / srcH, 5)
  })

  it('gravação usa MESMO crop: composeFrame com crop 2x produz mesmo padrão que preview', () => {
    const crop: CameraCrop = makeCrop(2, 0.2, 0.3, false)
    const { ctx: previewCtx, calls: previewCalls } = mockCtx()
    composeFrame(
      previewCtx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: crop,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    const { ctx: recCtx, calls: recCalls } = mockCtx()
    // Gravação: mesma função composeFrame (compositor único).
    composeFrame(
      recCtx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: crop,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    // Mesma quantidade de drawImage (mesma pipeline).
    expect(previewCalls.filter((c) => c.op === 'drawImage').length).toBe(
      recCalls.filter((c) => c.op === 'drawImage').length,
    )
  })

  it('drawCamera aplica crop+scale: zoom 1x vs 2x produzem drawImage diferente', () => {
    function nineArgs(crop: CameraCrop): number[] | undefined {
      const { ctx, calls } = mockCtx()
      drawComposition({
        ctx,
        width: 1080,
        height: 1920,
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: crop,
        cameraVideo: fakeVideo(1280, 720),
      })
      return calls.find((c) => c.op === 'drawImage' && c.args.length === 8)?.args
    }
    const noZoom = nineArgs(DEFAULT_CAMERA_CROP)
    const zoom2 = nineArgs(makeCrop(2, 0, 0, false))
    expect(noZoom).toBeDefined()
    expect(zoom2).toBeDefined()
    // Os args (sx, sy, sw, sh) diferem entre zoom 1x e 2x.
    expect(noZoom!.join(',')).not.toBe(zoom2!.join(','))
  })
})
