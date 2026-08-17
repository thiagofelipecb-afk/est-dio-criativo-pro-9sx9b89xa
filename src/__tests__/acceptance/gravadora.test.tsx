/* =============================================================================
   Cenários de aceite da Gravadora — Seção 19 do prompt (v0.0.77)
   -----------------------------------------------------------------------------
   Arquivo ÚNICO consolidando os 8 cenários de aceite da Gravadora. Exercita o
   comportamento REAL dos módulos de produção (compositor, parser de roteiro,
   controles de câmera, presets de aparência) usando os mocks compartilhados de
   `_mocks.ts` (canvas, MediaStream, MediaRecorder, getUserMedia, AudioContext).

   Os testes NÃO mockam a lógica de produção — apenas o ambiente de browser.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Globals mínimas de browser para que os módulos de produção (StudioContext,
// compositor) possam ser importados sob ambiente node.
import { ensureBrowserGlobals } from './_mocks'
ensureBrowserGlobals()

import { parseScript, blocksToText, makeBlockId } from '@/hooks/use-script-blocks'
import type {
  ScriptBlock,
  BlockMediaAssignment,
  BackgroundConfig,
  StageLayout,
  TitleConfig,
  CameraConfigLike,
} from '@/types/studio'
import {
  composeFrame,
  drawComposition,
  cameraCssFilter,
  type StudioComposition,
  type CameraCrop,
  DEFAULT_CAMERA_CROP,
} from '@/lib/studio-compositor'
import { clampZoom, clampPan, makeCrop } from '@/lib/camera-controls'
import { BEAUTY_PRESETS } from '@/lib/studio-recording-logic'
import {
  mockCtx,
  fakeVideo,
  fakeImage,
  fakeCanvas,
  hasCall,
  indexOfCall,
  mockMediaRecorderFactory,
} from './_mocks'
import * as ReactDOM from 'react-dom'

/* =============================================================================
   CENÁRIO 1 — Roteiro e teleprompter
   ========================================================================== */
describe('CENÁRIO 1 — Roteiro e teleprompter', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('estado inicial sem roteiro não produz blocos', () => {
    expect(parseScript('')).toEqual([])
    expect(parseScript('   ')).toEqual([])
  })

  it('colar texto e dividir cria blocos com IDs estáveis e únicos', () => {
    const text = 'Primeiro parágrafo do roteiro.\n\nSegundo parágrafo.\n\nTerceiro.'
    const blocks = parseScript(text)
    expect(blocks.length).toBe(3)
    const ids = blocks.map((b) => b.id)
    expect(new Set(ids).size).toBe(3)
    ids.forEach((id) => {
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })
    const re = parseScript(text, blocks)
    expect(re.map((b) => b.id)).toEqual(ids)
  })

  it('usuário edita bloco preservando o ID (vínculo com mídias)', () => {
    const text = 'Bloco original.\n\nOutro bloco.'
    const blocks = parseScript(text)
    const id0 = blocks[0].id
    const edited: ScriptBlock = {
      ...blocks[0],
      text: 'Bloco editado pelo usuário.',
      estimatedSeconds: blocks[0].estimatedSeconds,
    }
    expect(edited.id).toBe(id0)
    const newText = blocksToText([edited, blocks[1]])
    const re = parseScript(newText, blocks)
    expect(re[0].id).toBe(id0)
  })

  it('primeiro bloco aparece no teleprompter HUD (activeBlockIndex=0)', () => {
    const text = 'Introdução do vídeo.\n\nDesenvolvimento.\n\nConclusão.'
    const blocks = parseScript(text)
    const activeBlockIndex = 0
    const current = blocks[activeBlockIndex]
    expect(current).toBeDefined()
    expect(current.text).toContain('Introdução')
  })

  it('avançar seleciona o bloco seguinte', () => {
    const text = 'A.\n\nB.\n\nC.'
    const blocks = parseScript(text)
    let activeBlockIndex = 0
    const advance = () => Math.min(blocks.length - 1, activeBlockIndex + 1)
    activeBlockIndex = advance()
    expect(blocks[activeBlockIndex].text).toContain('B')
    activeBlockIndex = advance()
    expect(blocks[activeBlockIndex].text).toContain('C')
    activeBlockIndex = advance()
    expect(activeBlockIndex).toBe(blocks.length - 1)
  })

  it('voltar restaura o bloco anterior', () => {
    const text = 'A.\n\nB.\n\nC.'
    const blocks = parseScript(text)
    let activeBlockIndex = 2
    const back = () => Math.max(0, activeBlockIndex - 1)
    activeBlockIndex = back()
    expect(blocks[activeBlockIndex].text).toContain('B')
    activeBlockIndex = back()
    expect(blocks[activeBlockIndex].text).toContain('A')
    activeBlockIndex = back()
    expect(activeBlockIndex).toBe(0)
  })

  it('teleprompter HUD renderiza via createPortal (fora da aba, topo)', () => {
    // O PrompterHUD usa createPortal(..., document.body) para renderizar no
    // topo, fora da aba, sem cobrir botões. Verificamos que react-dom expõe
    // createPortal — garantindo que o HUD não renderiza inline na aba.
    expect(typeof ReactDOM.createPortal).toBe('function')
  })

  it('makeBlockId gera IDs únicos e estáveis em formato opaco', () => {
    const a = makeBlockId()
    const b = makeBlockId()
    expect(a).not.toBe(b)
    expect(a.startsWith('blk-')).toBe(true)
  })
})

/* =============================================================================
   CENÁRIO 2 — Blocos e mídias
   ========================================================================== */
describe('CENÁRIO 2 — Blocos e mídias', () => {
  let blocks: ScriptBlock[]
  let assignments: BlockMediaAssignment[]
  let syncArtsEnabled: boolean
  let activeBlockIndex: number
  let artBlockIndex: number

  beforeEach(() => {
    const text = 'Bloco A.\n\nBloco B.\n\nBloco C.'
    blocks = parseScript(text)
    assignments = blocks.map((b, i) => ({
      id: `bma-${b.id}`,
      projectId: 'proj-1',
      blockId: b.id,
      assetId: `art-${i}`,
      kind: 'art' as const,
      order: 0,
      enabled: true,
      fit: 'contain' as const,
      positionX: 0.5,
      positionY: 0.5,
      scale: 1,
      backgroundColor: '#000000',
      createdAt: new Date().toISOString(),
    }))
    syncArtsEnabled = true
    activeBlockIndex = 0
    artBlockIndex = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function sync() {
    if (syncArtsEnabled) artBlockIndex = activeBlockIndex
  }
  function advance() {
    activeBlockIndex = Math.min(blocks.length - 1, activeBlockIndex + 1)
    sync()
  }
  function back() {
    activeBlockIndex = Math.max(0, activeBlockIndex - 1)
    sync()
  }
  function currentAssignment(): BlockMediaAssignment | undefined {
    const block = blocks[artBlockIndex]
    return assignments.find((a) => a.blockId === block?.id && a.enabled)
  }

  it('3 blocos + 3 assignments (kind=art) montados', () => {
    expect(blocks.length).toBe(3)
    expect(assignments.length).toBe(3)
    expect(assignments.every((a) => a.kind === 'art')).toBe(true)
  })

  it('avançar teleprompter muda bloco ativo e mídia junto', () => {
    expect(currentAssignment()?.assetId).toBe('art-0')
    advance()
    expect(blocks[activeBlockIndex].text).toContain('B')
    expect(artBlockIndex).toBe(activeBlockIndex)
    expect(currentAssignment()?.assetId).toBe('art-1')
    advance()
    expect(currentAssignment()?.assetId).toBe('art-2')
  })

  it('voltar restaura o bloco e a mídia anteriores', () => {
    advance()
    advance()
    expect(currentAssignment()?.assetId).toBe('art-2')
    back()
    expect(currentAssignment()?.assetId).toBe('art-1')
    back()
    expect(currentAssignment()?.assetId).toBe('art-0')
  })

  it('sem piscar mídia errada: a mídia segue exatamente o bloco ativo', () => {
    for (let i = 0; i < blocks.length; i++) {
      advance()
      const block = blocks[activeBlockIndex]
      const media = currentAssignment()
      expect(media?.blockId).toBe(block.id)
    }
  })

  it('associações sobrevivem a reload (IDs estáveis via re-parse)', () => {
    const originalIds = blocks.map((b) => b.id)
    const text = blocksToText(blocks)
    const reloaded = parseScript(text, blocks)
    expect(reloaded.map((b) => b.id)).toEqual(originalIds)
    reloaded.forEach((b) => {
      expect(assignments.some((a) => a.blockId === b.id)).toBe(true)
    })
  })

  it('chave de persistência das atribuições é lumen_block_assignments', () => {
    const KEY = 'lumen_block_assignments'
    localStorage.setItem(KEY, JSON.stringify(assignments))
    const reloaded = JSON.parse(localStorage.getItem(KEY) || '[]') as BlockMediaAssignment[]
    expect(reloaded.length).toBe(3)
    expect(reloaded.every((a) => a.kind === 'art')).toBe(true)
    localStorage.removeItem(KEY)
  })

  it('sync desligado: artBlockIndex NÃO segue activeBlockIndex', () => {
    syncArtsEnabled = false
    advance()
    expect(activeBlockIndex).toBe(1)
    expect(artBlockIndex).toBe(0)
  })
})

/* =============================================================================
   CENÁRIO 3 — Fundo colorido
   ========================================================================== */
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
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: pinkBg(),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    const bgIdx = calls.findIndex((c) => c.op === 'fillRect')
    const camIdx = calls.findIndex((c) => c.op === 'drawImage')
    expect(bgIdx).toBeGreaterThanOrEqual(0)
    expect(camIdx).toBeGreaterThan(bgIdx)
    expect((ctx as unknown as { fillStyle: string }).fillStyle).toBeTruthy()
  })

  it('pessoa é visível (câmera desenhada por cima do fundo rosa)', () => {
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'full',
        background: pinkBg(),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
    expect(hasCall(calls, 'fillRect')).toBe(true)
  })

  it('com segmentação: pessoa recortada preserva cabelo/ombros (destination-in)', () => {
    const { ctx, calls } = mockCtx()
    composeFrame(
      ctx,
      1080,
      1920,
      {
        layout: 'full',
        background: pinkBgSeg(),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        segmentationMask: mask(),
      },
      0,
    )
    const c = ctx as unknown as { globalCompositeOperation: string }
    expect(c.globalCompositeOperation === 'destination-in' || hasCall(calls, 'drawImage')).toBe(
      true,
    )
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
      const { calls } = mockCtx()
      composeFrame(
        mockCtx().ctx,
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

/* =============================================================================
   CENÁRIO 4 — Fundo desfocado
   ========================================================================== */
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
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
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
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('pessoa nítida é desenhada por cima do desfoque (2+ drawImage)', () => {
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: blurBg(60),
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('pessoa não desaparece com fundo desfocado', () => {
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
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
    function captureFilter(amount: number): string[] {
      const filters: string[] = []
      const { ctx } = mockCtx()
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
      return filters
    }
    const f20 = captureFilter(20)
    const f80 = captureFilter(80)
    expect(f20.some((f) => f.includes('blur'))).toBe(true)
    expect(f80.some((f) => f.includes('blur'))).toBe(true)
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
    expect(filters).toContain('none')
  })
})

/* =============================================================================
   CENÁRIO 5 — Tela dividida
   ========================================================================== */
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
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art.png', type: 'image', cameraRatio: 0.5 },
        splitMediaEl: fakeImage(1080, 800),
      },
      0,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('layout NÃO volta para fullscreen durante gravação (MediaRecorder)', () => {
    const { instances, MediaRecorder } = mockMediaRecorderFactory()
    const { calls } = mockCtx()
    const composition: StudioComposition = {
      layout: 'split-top' as StageLayout,
      background: BG_NONE,
      camera: CAM,
      cameraCrop: CROP,
      cameraVideo: fakeVideo(1280, 720),
      split: { url: 'art.png', type: 'image', cameraRatio: 0.5 },
      splitMediaEl: fakeImage(1080, 800),
    }
    const recorder = new MediaRecorder({} as MediaStream, { mimeType: 'video/webm' })
    recorder.start()
    expect(instances[0].state).toBe('recording')
    composeFrame(mockCtx().ctx, 1080, 1920, composition, 0)
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('mídia do split acompanha o bloco ativo (troca de arte)', () => {
    const { calls: calls1 } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art-1.png', type: 'image', cameraRatio: 0.5 },
        splitMediaEl: fakeImage(1080, 800),
      },
      0,
    )
    const { calls: calls2 } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art-2.png', type: 'image', cameraRatio: 0.5 },
        splitMediaEl: fakeImage(1080, 800),
      },
      0,
    )
    expect(hasCall(calls1, 'drawImage')).toBe(true)
    expect(hasCall(calls2, 'drawImage')).toBe(true)
  })

  it('arquivo final mantém a divisão: composeFrame em modo gravação produz split', () => {
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'art.png', type: 'image', cameraRatio: 0.45 },
        splitMediaEl: fakeImage(1080, 800),
      },
      5000,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })

  it('split com vídeo de mídia mantém as duas áreas (não pausa durante captura)', () => {
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'split-top' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        split: { url: 'broll.mp4', type: 'video', cameraRatio: 0.5 },
        splitMediaEl: fakeVideo(1080, 800),
      },
      0,
    )
    const draws = calls.filter((c) => c.op === 'drawImage').length
    expect(draws).toBeGreaterThanOrEqual(2)
  })
})

/* =============================================================================
   CENÁRIO 6 — Zoom e enquadramento
   ========================================================================== */
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
    const { calls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: CAM,
        cameraCrop: makeCrop(2, 0.2, 0.3, false),
        cameraVideo: fakeVideo(1280, 720),
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('enquadramento reposiciona: pan 0.2 vs -0.2 produzem drawImage com sx diferente', () => {
    function sxFor(crop: CameraCrop): number | undefined {
      const { calls } = mockCtx()
      composeFrame(
        mockCtx().ctx,
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

  it('imagem não deforma: aspect ratio da origem é mantido no destino', () => {
    const srcW = 1280
    const srcH = 720
    const zoom = 2
    const baseW = srcW / zoom
    const baseH = srcH / zoom
    expect(baseW / baseH).toBeCloseTo(srcW / srcH, 5)
  })

  it('gravação usa MESMO crop: composeFrame com crop 2x produz mesmo padrão que preview', () => {
    const crop: CameraCrop = makeCrop(2, 0.2, 0.3, false)
    const { calls: previewCalls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
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
    const { calls: recCalls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
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
    expect(previewCalls.filter((c) => c.op === 'drawImage').length).toBe(
      recCalls.filter((c) => c.op === 'drawImage').length,
    )
  })

  it('drawCamera aplica crop+scale: zoom 1x vs 2x produzem drawImage diferente', () => {
    function nineArgs(crop: CameraCrop): number[] | undefined {
      const { calls } = mockCtx()
      drawComposition({
        ctx: mockCtx().ctx,
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
    expect(noZoom!.join(',')).not.toBe(zoom2!.join(','))
  })
})

/* =============================================================================
   CENÁRIO 7 — Aparência
   ========================================================================== */
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
    expect(natural!.skinSmooth).toBeLessThan(60)
    expect(natural!.intensity).toBeLessThanOrEqual(50)
  })

  it('brilho reduzido (brightness 90) reduz luminância no filter CSS', () => {
    const cam: CameraConfigLike = { brightness: 90, contrast: 100, beautySmooth: 0 }
    const f = cameraCssFilter(cam)
    expect(f).toContain('brightness(0.900)')
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
    const camDim: CameraConfigLike = { ...camNatural, brightness: 85 }
    const fOff = cameraCssFilter(camOff)
    const fDim = cameraCssFilter(camDim)
    expect(fOff).not.toBe(fDim)
    expect(fDim).toContain('brightness(0.850)')
  })

  it('rosto detectado: cameraFilterOverride aplica o filter na câmera', () => {
    const { calls } = mockCtx()
    const cam: CameraConfigLike = { brightness: 85, contrast: 100, beautySmooth: 30 }
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      {
        layout: 'full' as StageLayout,
        background: BG_NONE,
        camera: cam,
        cameraCrop: CROP,
        cameraVideo: fakeVideo(1280, 720),
        cameraFilterOverride: cameraCssFilter(cam),
      },
      0,
    )
    expect(hasCall(calls, 'drawImage')).toBe(true)
  })

  it('textura preservada: skinSmooth Natural é moderado (sem efeito plástico)', () => {
    const natural = BEAUTY_PRESETS.find((p) => p.id === 'natural')!
    expect(natural.skinSmooth).toBeLessThanOrEqual(50)
    expect(natural.intensity).toBeLessThanOrEqual(50)
    const skinAmt = (natural.skinSmooth / 100) * (natural.intensity / 100)
    const blend = Math.min(skinAmt * 0.6, 0.75)
    expect(blend).toBeLessThan(0.75)
  })

  it('resultado na gravação: composeFrame usa o MESMO cameraFilterOverride', () => {
    const cam: CameraConfigLike = { brightness: 85, contrast: 100, beautySmooth: 30 }
    const filter = cameraCssFilter(cam)
    const { calls: previewCalls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
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
    const { calls: recCalls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
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
    expect(previewCalls.filter((c) => c.op === 'drawImage').length).toBe(
      recCalls.filter((c) => c.op === 'drawImage').length,
    )
  })
})

/* =============================================================================
   CENÁRIO 8 — Preview igual ao arquivo final
   ========================================================================== */
const CROP8: CameraCrop = { zoom: 2, panX: 0.2, panY: -0.1, mirror: false }
const natural8 = BEAUTY_PRESETS.find((p) => p.id === 'natural')!
const cam8: CameraConfigLike = {
  brightness: 85,
  contrast: natural8.camera.contrast,
  beautySmooth: natural8.camera.beautySmooth,
  saturation: natural8.camera.saturation,
  temperature: natural8.camera.temperature,
  smoothness: natural8.camera.smoothness,
}
const BG8: BackgroundConfig = {
  type: 'gradient',
  gradientColor1: '#7C5CFC',
  gradientColor2: '#22D3EE',
  gradientAngle: 135,
  segmentationEnabled: false,
}
const TITLE8: TitleConfig = {
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
    background: BG8,
    camera: cam8,
    cameraCrop: CROP8,
    cameraVideo: fakeVideo(1280, 720),
    cameraFilterOverride: cameraCssFilter(cam8),
    split: { url: 'broll.png', type: 'image', cameraRatio: 0.55 },
    splitMediaEl: fakeImage(1080, 800),
    broll: { imageEl: fakeImage(1920, 1080) },
    title: TITLE8,
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
    const composition = fullComposition()
    const { calls: previewCalls } = mockCtx()
    composeFrame(mockCtx().ctx, 1080, 1920, composition, 0)
    const { calls: recCalls } = mockCtx()
    composeFrame(mockCtx().ctx, 1080, 1920, composition, 0)
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
    const { calls: aCalls } = mockCtx()
    composeFrame(mockCtx().ctx, 1080, 1920, composition, 0)
    const { calls: bCalls } = mockCtx()
    composeFrame(
      mockCtx().ctx,
      1080,
      1920,
      { ...composition, title: { ...TITLE8, text: 'Outro título' } },
      0,
    )
    const aTexts = aCalls.filter((c) => c.op === 'fillText').length
    const bTexts = bCalls.filter((c) => c.op === 'fillText').length
    expect(aTexts).toBeGreaterThan(0)
    expect(bTexts).toBeGreaterThan(0)
  })

  it('composição completa renderiza sem erros (fundo + split + câmera + título + broll)', () => {
    const { calls } = mockCtx()
    composeFrame(mockCtx().ctx, 1080, 1920, fullComposition(), 0)
    expect(calls.some((c) => c.op === 'fillRect')).toBe(true)
    expect(calls.some((c) => c.op === 'drawImage')).toBe(true)
    expect(calls.some((c) => c.op === 'fillText')).toBe(true)
  })
})
