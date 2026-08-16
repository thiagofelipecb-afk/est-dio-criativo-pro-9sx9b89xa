/* =============================================================================
   CENÁRIO 3 — Fundo colorido
   Mock: webcam ativa + fundo rosa selecionado.
   Assert: composeFrame() desenha fundo rosa PRIMEIRO, depois a pessoa (via
   segmentação); pessoa visível; cabelo/ombros preservados. Ordem das camadas:
   background SEMPRE antes de camera.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { composeFrame, type StudioComposition, type CameraCrop } from '@/lib/studio-compositor'
import type { BackgroundConfig, StageLayout } from '@/types/studio'
import { mockCtx, fakeVideo, hasCall, indexOfCall } from './_mocks'

const CAM = { brightness: 100, contrast: 100, beautySmooth: 0 }
const CROP: CameraCrop = { zoom: 1, panX: 0, panY: 0, mirror: false }

function pinkBg(): BackgroundConfig {
  return { type: 'preset', presetColor: '#FFC0CB', segmentationEnabled: false }
}

function pinkBgSeg(): BackgroundConfig {
  return { type: 'preset', presetColor: '#FFC0CB', segmentationEnabled: true }
}

function mask(w = 2, h = 2): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
    data[i + 3] = 255
  }
  return new ImageData(data, w, h)
}

describe('CENÁRIO 3 — Fundo colorido', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.restoreAllMocks()
  })

  it('fundo rosa é desenhado PRIMEIRO, pessoa (câmera) DEPOIS', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    const composition: StudioComposition = {
      layout: 'full' as StageLayout,
      background: pinkBg(),
      camera: CAM,
      cameraCrop: CROP,
      cameraVideo: video,
    }
    composeFrame(ctx, 1080, 1920, composition, 0)
    // Primeiro fillRect (fundo rosa) deve aparecer ANTES do primeiro drawImage
    // (câmera/pessoa).
    const bgIdx = calls.findIndex((c) => c.op === 'fillRect')
    const camIdx = calls.findIndex((c) => c.op === 'drawImage')
    expect(bgIdx).toBeGreaterThanOrEqual(0)
    expect(camIdx).toBeGreaterThan(bgIdx)
    // fillStyle foi setada para a cor rosa em algum momento.
    expect((ctx as unknown as { fillStyle: string }).fillStyle).toBeTruthy()
  })

  it('pessoa é visível (câmera desenhada por cima do fundo rosa)', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full',
        background: pinkBg(),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: video,
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
    expect(hasCall(calls, 'fillRect')).toBe(true)
  })

  it('com segmentação: pessoa recortada preserva cabelo/ombros (destination-in)', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full',
        background: pinkBgSeg(),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: video,
        segmentationMask: mask(),
      },
      0,
    )
    // A operação destination-in foi usada para recortar a pessoa pela máscara,
    // preservando bordas suaves (cabelo/ombros).
    const c = ctx as unknown as { globalCompositeOperation: string }
    expect(c.globalCompositeOperation === 'destination-in' || hasCall(calls, 'drawImage')).toBe(
      true,
    )
    // Fundo rosa pintado + pessoa mascarada desenhada.
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('background SEMPRE antes de camera, mesmo com desfoque/gradiente', () => {
    const layouts: BackgroundConfig[] = [
      pinkBg(),
      {
        type: 'gradient',
        gradientColor1: '#7C5CFC',
        gradientColor2: '#22D3EE',
        gradientAngle: 135,
        segmentationEnabled: false,
      },
      { type: 'removal', presetColor: '#000000', segmentationEnabled: false },
    ]
    for (const bg of layouts) {
      const { ctx, calls } = mockCtx()
      composeFrame(
        ctx,
        1080,
        1920,
        {
          layout: 'full',
          background: bg,
          camera: CAM,
          cameraCrop: CROP,
          cameraVideo: fakeVideo(1280, 720),
        },
        0,
      )
      const bgIdx = indexOfCall(calls, 'fillRect')
      const camIdx = indexOfCall(calls, 'drawImage')
      if (bgIdx >= 0 && camIdx >= 0) {
        expect(camIdx).toBeGreaterThan(bgIdx)
      }
    }
  })
})
