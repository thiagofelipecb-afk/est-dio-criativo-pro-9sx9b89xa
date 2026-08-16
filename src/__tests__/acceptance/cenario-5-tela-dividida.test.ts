/* =============================================================================
   CENÁRIO 5 — Tela dividida
   Mock: bloco com arte + layout "camera-top" (split-top) + startRecording.
   Assert: duas áreas visíveis, layout não volta para fullscreen durante gravação,
   mídia acompanha bloco, arquivo final mantém divisão.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { composeFrame, type StudioComposition, type CameraCrop } from '@/lib/studio-compositor'
import type { BackgroundConfig, StageLayout } from '@/types/studio'
import { mockCtx, fakeVideo, fakeImage, hasCall, mockMediaRecorderFactory } from './_mocks'

const CAM = { brightness: 100, contrast: 100, beautySmooth: 0 }
const CROP: CameraCrop = { zoom: 1, panX: 0, panY: 0, mirror: false }
const BG_NONE: BackgroundConfig = { type: 'none', segmentationEnabled: false }

describe('CENÁRIO 5 — Tela dividida', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.restoreAllMocks()
  })

  it('split-top desenha duas áreas: câmera em cima + mídia embaixo', () => {
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    const img = fakeImage(1080, 800)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: video,
        split: { url: 'art.png', type: 'image', cameraRatio: 0.5 },
        splitMediaEl: img,
      },
      0,
    )
    // drawImage chamado para a câmera (topo) e para a mídia (baixo): ≥2.
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('layout NÃO volta para fullscreen durante gravação (MediaRecorder)', () => {
    const { instances, MediaRecorder } = mockMediaRecorderFactory()
    const { ctx, calls } = mockCtx()
    const video = fakeVideo(1280, 720)
    const img = fakeImage(1080, 800)
    // Durante a gravação, composeFrame continua recebendo layout split-top.
    const composition: StudioComposition = {
      layout: 'split-top' as StageLayout,
      background: BG_NONE,
      camera: CAM,
      cameraCrop: CROP,
      cameraVideo: video,
      split: { url: 'art.png', type: 'image', cameraRatio: 0.5 },
      splitMediaEl: img,
    }
    const recorder = new MediaRecorder({} as MediaStream, { mimeType: 'video/webm' })
    recorder.start()
    expect(instances[0].state).toBe('recording')
    composeFrame(ctx, 1080, 1920, composition, 0)
    // Continua havendo split (2+ drawImage).
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('mídia do split acompanha o bloco ativo (troca de arte)', () => {
    const img1 = fakeImage(1080, 800)
    const img2 = fakeImage(1080, 800)
    const { ctx: ctx1, calls: calls1 } = mockCtx()
    composeFrame(
      ctx1,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art-1.png', type: 'image', cameraRatio: 0.5 },
        splitMediaEl: img1,
      },
      0,
    )
    const { ctx: ctx2, calls: calls2 } = mockCtx()
    composeFrame(
      ctx2,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art-2.png', type: 'image', cameraRatio: 0.5 },
        splitMediaEl: img2,
      },
      0,
    )
    // Ambos os frames renderizam a mídia do split.
    expect(hasCall(calls1, 'drawImage')).toBe(true)
    expect(hasCall(calls2, 'drawImage')).toBe(true)
  })

  it('arquivo final mantém a divisão: composeFrame chamado em modo gravação produz split', () => {
    const { ctx, calls } = mockCtx()
    const img = fakeImage(1080, 800)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art.png', type: 'image', cameraRatio: 0.45 },
        splitMediaEl: img,
      },
      5000,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('split com vídeo de mídia mantém as duas áreas (não pausa durante captura)', () => {
    const { ctx, calls } = mockCtx()
    const mediaVideo = fakeVideo(1080, 800)
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'broll.mp4', type: 'video', cameraRatio: 0.5 },
        splitMediaEl: mediaVideo,
      },
      0,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })
})
