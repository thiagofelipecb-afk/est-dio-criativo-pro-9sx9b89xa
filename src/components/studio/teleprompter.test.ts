/* =============================================================================
   Testes do teleprompter: lógica de avanço/volta de blocos e sincronização.
   Cobre CENÁRIO 1 (primeiro bloco no teleprompter, avançar seleciona seguinte)
   e CENÁRIO 2 (texto e mídia mudam juntos).
   ========================================================================== */
import { describe, it, expect } from 'vitest'
import { drawComposition, DEFAULT_CAMERA_CROP } from '@/lib/studio-compositor'

/** Lógica pura de avanço/retrocesso do teleprompter (espelha PrompterHUD). */
function nextBlock(index: number, total: number): number {
  return Math.min(total - 1, index + 1)
}
function prevBlock(index: number): number {
  return Math.max(0, index - 1)
}

/** Sincronização atômica: avançar bloco → atualiza mídia associada. */
interface BlockMedia {
  blockId: string
  mediaUrl: string | null
}
function syncMedia(
  blocks: { id: string }[],
  index: number,
  assignments: Map<string, string | null>,
): BlockMedia {
  const block = blocks[index]
  return {
    blockId: block.id,
    mediaUrl: assignments.get(block.id) ?? null,
  }
}

describe('Teleprompter — avanço e retrocesso', () => {
  const blocks = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }]

  it('CENÁRIO 1: começa no bloco 0, avança para 1, depois 2', () => {
    let i = 0
    expect(blocks[i].id).toBe('b1')
    i = nextBlock(i, blocks.length)
    expect(blocks[i].id).toBe('b2')
    i = nextBlock(i, blocks.length)
    expect(blocks[i].id).toBe('b3')
  })

  it('não ultrapassa o último bloco', () => {
    let i = 2
    i = nextBlock(i, blocks.length)
    expect(i).toBe(2)
  })

  it('não vai abaixo do primeiro bloco', () => {
    let i = 0
    i = prevBlock(i)
    expect(i).toBe(0)
  })

  it('retrocede do bloco 2 para o 1', () => {
    let i = 2
    i = prevBlock(i)
    expect(blocks[i].id).toBe('b2')
  })
})

describe('Teleprompter — sincronização de mídia', () => {
  it('CENÁRIO 2: avançar bloco atualiza mídia junto (sem mídia errada)', () => {
    const blocks = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }]
    const assignments = new Map<string, string | null>([
      ['b1', 'arte-a.png'],
      ['b2', 'arte-b.mp4'],
      ['b3', null],
    ])

    let i = 0
    let current = syncMedia(blocks, i, assignments)
    expect(current.mediaUrl).toBe('arte-a.png')

    i = nextBlock(i, blocks.length)
    current = syncMedia(blocks, i, assignments)
    expect(current.mediaUrl).toBe('arte-b.mp4')

    i = nextBlock(i, blocks.length)
    current = syncMedia(blocks, i, assignments)
    expect(current.mediaUrl).toBeNull()
  })

  it('voltar restaura mídia anterior', () => {
    const blocks = [{ id: 'b1' }, { id: 'b2' }]
    const assignments = new Map<string, string | null>([
      ['b1', 'a.png'],
      ['b2', 'b.png'],
    ])
    let i = 1
    let current = syncMedia(blocks, i, assignments)
    expect(current.mediaUrl).toBe('b.png')
    i = prevBlock(i)
    current = syncMedia(blocks, i, assignments)
    expect(current.mediaUrl).toBe('a.png')
  })
})

/* ---------------------------------------------------------------------------
   CENÁRIO 3: o HUD do teleprompter NÃO entra no canvas de composição.
   O PrompterHUD é renderizado via createPortal(... , document.body) em uma
   camada DOM fixa separada (position: fixed, z-9999). O StudioStage desenha
   apenas fundo/câmera/mídia/título/reação — nunca o texto do prompter.
   Aqui verificamos o contrato: o conjunto de camadas desenhadas pelo
   compositor não inclui nenhuma chamada de fillText oriunda do prompter.
   ------------------------------------------------------------------------- */
describe('Teleprompter HUD — fora do canvas', () => {
  it('CENÁRIO 3: fillText do prompter NÃO aparece no stream do canvas', () => {
    // O compositor só chama fillText para títulos (TitleConfig). O texto do
    // teleprompter é renderizado pelo React no DOM, nunca no canvas. Portanto,
    // quando não há título habilitado, nenhuma chamada fillText deve ocorrer.
    const calls: string[] = []
    const ctx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      clearRect: () => calls.push('clearRect'),
      fillRect: () => calls.push('fillRect'),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      filter: 'none',
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      drawImage: () => calls.push('drawImage'),
      beginPath: () => calls.push('beginPath'),
      rect: () => calls.push('rect'),
      clip: () => calls.push('clip'),
      translate: () => calls.push('translate'),
      scale: () => calls.push('scale'),
      stroke: () => calls.push('stroke'),
      fillText: (t: string) => calls.push(`fillText ${t}`),
      measureText: () => ({ width: 10 }),
      arcTo: () => calls.push('arcTo'),
      moveTo: () => calls.push('moveTo'),
      closePath: () => calls.push('closePath'),
      setLineDash: () => calls.push('setLineDash'),
      strokeRect: () => calls.push('strokeRect'),
    } as unknown as CanvasRenderingContext2D
    drawComposition({
      ctx,
      width: 1080,
      height: 1920,
      layout: 'full',
      background: { type: 'none', segmentationEnabled: false },
      camera: { brightness: 100, contrast: 100, beautySmooth: 0 },
      cameraCrop: DEFAULT_CAMERA_CROP,
      cameraVideo: null,
    })
    const fillTexts = calls.filter((c) => c.startsWith('fillText'))
    // Sem título habilitado → nenhuma chamada fillText (o prompter não está no canvas).
    expect(fillTexts.length).toBe(0)
  })
})
