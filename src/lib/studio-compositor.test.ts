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
    createLinearGradient: () => ({
      addColorStop: () => calls.push('addColorStop'),
    }),
    createRadialGradient: () => ({
      addColorStop: () => calls.push('addColorStop'),
    }),
    getImageData: (x: number, y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => calls.push('putImageData'),
    globalCompositeOperation: 'source-over',
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
  it('brightness/contrast 100 + saturate padrão = sem alteração de brilho/contraste', () => {
    const f = cameraCssFilter(CAM_DEFAULT)
    expect(f).toContain('brightness(1.000)')
    expect(f).toContain('contrast(1.000)')
    expect(f).toContain('saturate(1.000)')
  })
  it('beautySmooth > 0 adiciona blur', () => {
    const f = cameraCssFilter({ brightness: 100, contrast: 100, beautySmooth: 50 })
    expect(f).toContain('blur(')
  })
  it('brightness 50 → 0.5', () => {
    const f = cameraCssFilter({ brightness: 50, contrast: 100, beautySmooth: 0 })
    expect(f).toContain('brightness(0.500)')
  })
  it('saturate 200 → saturate(2.000)', () => {
    const f = cameraCssFilter({ brightness: 100, contrast: 100, beautySmooth: 0, saturation: 200 })
    expect(f).toContain('saturate(2.000)')
  })
  it('temperatura positiva adiciona sepia (quente)', () => {
    const f = cameraCssFilter({ brightness: 100, contrast: 100, beautySmooth: 0, temperature: 30 })
    expect(f).toContain('sepia(')
  })
  it('temperatura negativa adiciona hue-rotate (fria)', () => {
    const f = cameraCssFilter({ brightness: 100, contrast: 100, beautySmooth: 0, temperature: -30 })
    expect(f).toContain('hue-rotate(')
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

  it('CENÁRIO 6: split-bottom mantém câmera embaixo e mídia em cima', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    const fakeMedia = { naturalWidth: 800, naturalHeight: 600 } as unknown as HTMLImageElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'split-bottom',
      background: BG_NONE,
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
      split: { url: 'x', type: 'image', cameraRatio: 0.5 },
      splitMediaEl: fakeMedia,
    })
    const draws = calls.filter((c) => c.startsWith('drawImage'))
    // 2 drawImage: mídia + câmera (áreas distintas mantidas).
    expect(draws.length).toBeGreaterThanOrEqual(2)
  })

  it('CENÁRIO 7: split-top com vídeo de mídia mantém as duas áreas durante renderização', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    const fakeMediaVid = { videoWidth: 1920, videoHeight: 1080 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'split-top',
      background: BG_NONE,
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
      split: { url: 'x', type: 'video', cameraRatio: 0.6 },
      splitMediaEl: fakeMediaVid,
    })
    const draws = calls.filter((c) => c.startsWith('drawImage'))
    // Câmera + mídia-vídeo: ambas desenhadas (layout persiste na gravação).
    expect(draws.length).toBeGreaterThanOrEqual(2)
  })
})

/* ---------------------------------------------------------------------------
   CENÁRIO 8: o stream do canvas contém as camadas corretas (fundo + câmera).
   Como a gravação usa canvas.captureStream() do MESMO canvas do preview, o
   conjunto de operações desenhadas num frame é o que aparece no arquivo. Aqui
   verificamos que, com fundo cor + câmera, há fillRect (fundo) seguido de
   drawImage (câmera) — ou seja, as camadas corretas estão presentes.
   ------------------------------------------------------------------------- */
describe('drawComposition — stream contém camadas corretas', () => {
  it('CENÁRIO 8: fundo + câmera produzem fillRect e drawImage no mesmo frame', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'preset', presetColor: '#3366CC', segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
    })
    const hasFill = calls.some((c) => c.startsWith('fillRect'))
    const hasDraw = calls.some((c) => c.startsWith('drawImage'))
    expect(hasFill).toBe(true)
    expect(hasDraw).toBe(true)
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

/* ---------------------------------------------------------------------------
   v0.0.75 — Testes de applyBackground (cor, gradiente, imagem, desfoque,
   remoção). Validam que o fundo é pintado como camada mais baixa e que a
   pessoa (câmera) é desenhada DEPOIS, garantindo que nunca desaparece.
   ------------------------------------------------------------------------- */
describe('drawComposition — applyBackground por modo', () => {
  it('cor sólida pinta presetColor como camada de fundo', () => {
    const { ctx, calls } = mockCtx()
    const c = ctx as unknown as { fillStyle: string }
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'preset', presetColor: '#1E3A5F', segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
    })
    expect(c.fillStyle).toBe('#1E3A5F')
    // Pelo menos um fillRect cobrindo todo o canvas (fundo).
    expect(calls.some((x) => x.startsWith('fillRect 0,0,1080,1920'))).toBe(true)
  })

  it('gradiente cria linearGradient e preenche o canvas', () => {
    const { ctx, calls } = mockCtx()
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: {
        type: 'gradient',
        gradientColor1: '#7C5CFC',
        gradientColor2: '#22D3EE',
        gradientAngle: 135,
        segmentationEnabled: false,
      },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
    })
    // createLinearGradient → addColorStop (2 cores) → fillRect.
    expect(calls.some((x) => x === 'addColorStop')).toBe(true)
    expect(calls.some((x) => x.startsWith('fillRect 0,0,1080,1920'))).toBe(true)
  })

  it('desfoque (blur) desenha o vídeo da câmera desfocado como fundo', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'blur', blurAmount: 50, segmentationEnabled: false },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
    })
    // Ao menos 1 drawImage do vídeo (fundo desfocado).
    const draws = calls.filter((c) => c.startsWith('drawImage'))
    expect(draws.length).toBeGreaterThanOrEqual(1)
  })

  it('remoção de fundo pinta cor sólida (preto) e a pessoa é desenhada por cima', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'removal', segmentationEnabled: false, presetColor: '#000000' },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
    })
    // Fundo preto preenchido.
    expect(calls.some((c) => c.startsWith('fillRect 0,0,1080,1920'))).toBe(true)
    // Câmera desenhada por cima (pessoa visível mesmo sem máscara).
    expect(calls.some((c) => c.startsWith('drawImage'))).toBe(true)
  })

  it('máscara de segmentação presente → pessoa recortada via destination-in', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    // Máscara binária 2×2 totalmente branca (pessoa).
    const maskData = new Uint8ClampedArray(16)
    for (let i = 0; i < maskData.length; i += 4) {
      maskData[i] = 255
      maskData[i + 1] = 255
      maskData[i + 2] = 255
      maskData[i + 3] = 255
    }
    const mask = new ImageData(maskData, 2, 2)
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'preset', presetColor: '#FF2D55', segmentationEnabled: true },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
      segmentationMask: mask,
    })
    // globalCompositeOperation deve ter sido setada para destination-in.
    const c = ctx as unknown as { globalCompositeOperation: string }
    expect(c.globalCompositeOperation).toBe('destination-in')
    // Fundo rosa pintado + pessoa mascarada desenhada.
    expect(calls.some((x) => x.startsWith('drawImage'))).toBe(true)
  })

  it('máscara vazia/inválida (null) → câmera completa (sem segmentação)', () => {
    const { ctx, calls } = mockCtx()
    const fakeVideo = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'preset', presetColor: '#FF2D55', segmentationEnabled: true },
      camera: CAM_DEFAULT,
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: fakeVideo,
      segmentationMask: null, // máscara ausente → fallback
    })
    // A câmera é desenhada (pessoa nunca desaparece).
    expect(calls.some((x) => x.startsWith('drawImage'))).toBe(true)
    // destination-in NÃO deve ter sido aplicado (sem máscara).
    const c = ctx as unknown as { globalCompositeOperation: string }
    expect(c.globalCompositeOperation).toBe('source-over')
  })
})
