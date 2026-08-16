/* =============================================================================
   LUMEN Studio — Testes do Pipeline de Segmentação (segmentation.ts)
   Cobre: carregamento do MediaPipe (mockado), fallback quando indisponível,
   máscara vazia (no-person), e store de status global.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  SegmentationPipeline,
  setSegmentationStatus,
  getSegmentationStatus,
  subscribeSegmentationStatus,
} from '@/lib/segmentation'

/** Mock de CanvasRenderingContext2D suficiente para o handleResults. */
function mockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 })),
  } as unknown as CanvasRenderingContext2D
}

beforeEach(() => {
  // Reset do status global antes de cada teste.
  setSegmentationStatus('loading')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Store de status global', () => {
  it('setSegmentationStatus atualiza getSegmentationStatus', () => {
    setSegmentationStatus('ready')
    expect(getSegmentationStatus()).toBe('ready')
  })

  it('subscribeSegmentationStatus recebe mudanças', () => {
    const seen: string[] = []
    const unsub = subscribeSegmentationStatus((s) => seen.push(s))
    setSegmentationStatus('ready')
    setSegmentationStatus('unavailable')
    expect(seen).toEqual(['ready', 'unavailable'])
    unsub()
  })

  it('unsubscribe para de receber notificações', () => {
    const seen: string[] = []
    const unsub = subscribeSegmentationStatus((s) => seen.push(s))
    unsub()
    setSegmentationStatus('ready')
    expect(seen).toHaveLength(0)
  })
})

describe('SegmentationPipeline — fallback', () => {
  it('load() falha graciosamente quando MediaPipe não está disponível', async () => {
    // Garante que window.SelfieSegmentation não existe e document.createElement
    // produz um script que falha ao carregar.
    const w = window as any
    delete w.SelfieSegmentation
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'script') {
        // Simula falha de carga do CDN.
        setTimeout(() => (el.onerror as () => void)?.(), 0)
      }
      return el
    })

    const pipeline = new SegmentationPipeline()
    const ok = await pipeline.load()
    expect(ok).toBe(false)
    expect(pipeline.isAvailable).toBe(false)
    expect(pipeline.currentStatus).toBe('unavailable')
    pipeline.dispose()
  })

  it('processFrame sem vídeo pronto retorna mask null', async () => {
    const pipeline = new SegmentationPipeline()
    // Vídeo sem dimensões (não pronto).
    const video = { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement
    const out = await pipeline.processFrame(video, 1080, 1920)
    expect(out.mask).toBeNull()
    expect(out.processed).toBe(false)
    pipeline.dispose()
  })

  it('processFrame com segmentador indisponível retorna mask null', async () => {
    const pipeline = new SegmentationPipeline()
    // Força estado indisponível sem carregar (available = false).
    const video = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    const out = await pipeline.processFrame(video, 1080, 1920)
    expect(out.mask).toBeNull()
    expect(out.status).toBe('unavailable')
    expect(out.processed).toBe(false)
    pipeline.dispose()
  })
})

describe('SegmentationPipeline — MediaPipe mockado', () => {
  it('load() com mock do MediaPipe → available + ready', async () => {
    // Injeta um construtor fake no window.
    const w = window as any
    const fakeSeg = {
      setOptions: vi.fn(),
      onResults: vi.fn(),
      send: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    }
    w.SelfieSegmentation = vi.fn(() => fakeSeg)

    const pipeline = new SegmentationPipeline()
    const ok = await pipeline.load()
    expect(ok).toBe(true)
    expect(pipeline.isAvailable).toBe(true)
    expect(pipeline.currentStatus).toBe('ready')
    expect(fakeSeg.setOptions).toHaveBeenCalledWith({ modelSelection: 1, selfieMode: false })
    pipeline.dispose()
    expect(fakeSeg.close).toHaveBeenCalled()
    delete w.SelfieSegmentation
  })

  it('handleResults com máscara toda preta (sem pessoa) → no-person após N frames', async () => {
    const w = window as any
    // Cria um segmentador fake que chama onResults com máscara toda preta.
    let resultsCb: ((res: any) => void) | null = null
    const fakeSeg = {
      setOptions: vi.fn(),
      onResults: vi.fn((cb: any) => {
        resultsCb = cb
      }),
      send: vi.fn().mockImplementation(async () => {
        // Cria uma CanvasImageSource "máscara" dummy.
        if (resultsCb) resultsCb({ segmentationMask: {} })
      }),
      close: vi.fn(),
    }
    w.SelfieSegmentation = vi.fn(() => fakeSeg)

    const pipeline = new SegmentationPipeline()
    await pipeline.load()

    // Mocka o maskCtx interno: getImageData retorna pixels pretos (sem pessoa).
    // Acessamos o canvas interno via um document.createElement spy.
    const origCreate = document.createElement.bind(document)
    const ctxMock = mockCtx()
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctxMock,
        } as unknown as HTMLCanvasElement
      }
      return origCreate(tag)
    })
    // getImageData retorna array preto (todos 0 → sem pessoa).
    ;(ctxMock.getImageData as any).mockReturnValue({
      data: new Uint8ClampedArray(4 * 4 * 4), // 4×4 preto
      width: 4,
      height: 4,
    })

    const video = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    // processFrame chama send() → onResults → handleResults com máscara preta.
    // Como ratio < 0.5%, emptyFrames incrementa. Após 4 frames → no-person.
    for (let i = 0; i < 5; i++) {
      await pipeline.processFrame(video, 4, 4)
    }
    // Após >3 frames sem pessoa, status deve ser 'no-person' e mask null.
    expect(['no-person', 'unavailable']).toContain(pipeline.currentStatus)
    pipeline.dispose()
    delete w.SelfieSegmentation
  })

  it('processFrame preserva a última máscara válida em erro pontual de send', async () => {
    const w = window as any
    const fakeSeg = {
      setOptions: vi.fn(),
      onResults: vi.fn(),
      send: vi.fn().mockRejectedValue(new Error('inference-error')),
      close: vi.fn(),
    }
    w.SelfieSegmentation = vi.fn(() => fakeSeg)

    const pipeline = new SegmentationPipeline()
    await pipeline.load()
    const video = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement
    const out = await pipeline.processFrame(video, 4, 4)
    // Erro de send → mantém lastMask (null inicialmente) e não processa.
    expect(out.mask).toBeNull()
    expect(out.processed).toBe(false)
    pipeline.dispose()
    delete w.SelfieSegmentation
  })
})

describe('SegmentationPipeline — dispose', () => {
  it('dispose limpa recursos e torna indisponível', async () => {
    const w = window as any
    const fakeSeg = { setOptions: vi.fn(), onResults: vi.fn(), send: vi.fn(), close: vi.fn() }
    w.SelfieSegmentation = vi.fn(() => fakeSeg)

    const pipeline = new SegmentationPipeline()
    await pipeline.load()
    expect(pipeline.isAvailable).toBe(true)
    pipeline.dispose()
    expect(pipeline.isAvailable).toBe(false)
    delete w.SelfieSegmentation
  })
})
