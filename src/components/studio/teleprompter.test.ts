/* =============================================================================
   Testes do teleprompter: lógica de avanço/volta de blocos e sincronização.
   Cobre CENÁRIO 1 (primeiro bloco no teleprompter, avançar seleciona seguinte)
   e CENÁRIO 2 (texto e mídia mudam juntos).
   ========================================================================== */
import { describe, it, expect } from 'vitest'

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
