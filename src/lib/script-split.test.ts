/* =============================================================================
   Testes — splitScriptIntoBlocks (divisão determinística de roteiro)
   ========================================================================== */
import { describe, it, expect } from 'vitest'
import {
  splitScriptIntoBlocks,
  singleBlockFromText,
  estimateDurationSeconds,
  countWords,
  totalDurationSeconds,
} from '@/lib/script-split'

describe('splitScriptIntoBlocks — casos base', () => {
  it('texto vazio retorna array vazio', () => {
    expect(splitScriptIntoBlocks('', 'short')).toEqual([])
    expect(splitScriptIntoBlocks('   ', 'medium')).toEqual([])
  })

  it('preserva um único parágrafo curto como um bloco', () => {
    const text = 'Olá, esse é um parágrafo curto.'
    const blocks = splitScriptIntoBlocks(text, 'medium')
    expect(blocks.length).toBe(1)
    expect(blocks[0].text).toContain('Olá')
  })

  it('quebra por parágrafo duplo', () => {
    const text = 'Primeiro parágrafo aqui.\n\nSegundo parágrafo aqui.\n\nTerceiro parágrafo.'
    const blocks = splitScriptIntoBlocks(text, 'long')
    expect(blocks.length).toBe(3)
  })

  it('IDs são únicos e estáveis (strings não vazias)', () => {
    const blocks = splitScriptIntoBlocks('A\n\nB\n\nC', 'short')
    const ids = blocks.map((b) => b.id)
    expect(new Set(ids).size).toBe(3)
    ids.forEach((id) => expect(typeof id === 'string' && id.length > 0).toBe(true))
  })
})

describe('splitScriptIntoBlocks — separadores explícitos', () => {
  it('--- divide em blocos explícitos', () => {
    const text = 'Parte um do texto.\n---\nParte dois do texto.'
    const blocks = splitScriptIntoBlocks(text, 'medium')
    expect(blocks.length).toBe(2)
    expect(blocks[0].text).toContain('Parte um')
    expect(blocks[1].text).toContain('Parte dois')
  })

  it('-- também divide', () => {
    const text = 'Primeiro.\n--\nSegundo.'
    const blocks = splitScriptIntoBlocks(text, 'medium')
    expect(blocks.length).toBe(2)
  })
})

describe('splitScriptIntoBlocks — presets', () => {
  it('one-sentence cria um bloco por frase', () => {
    const text = 'Primeira frase. Segunda frase! Terceira frase?'
    const blocks = splitScriptIntoBlocks(text, 'one-sentence')
    expect(blocks.length).toBe(3)
  })

  it('short respeita máximo de palavras quando possível', () => {
    // Frases longas repetidas para forçar divisão.
    const long = 'Esta é uma frase bastante longa cheia de palavras para preencher. '.repeat(8)
    const blocks = splitScriptIntoBlocks(long, 'short')
    expect(blocks.length).toBeGreaterThan(1)
    // Nenhum bloco (exceto possivelmente o último por frase gigante) deve
    // ultrapassar muito o máximo — verificamos ao menos que houve divisão.
    expect(blocks.length).toBeGreaterThanOrEqual(2)
  })

  it('custom usa duração personalizada', () => {
    const long = 'Frase de teste com várias palavras. '.repeat(20)
    const blocks10 = splitScriptIntoBlocks(long, 'custom', 10)
    const blocks30 = splitScriptIntoBlocks(long, 'custom', 30)
    // Duração menor → mais blocos.
    expect(blocks10.length).toBeGreaterThan(blocks30.length)
  })
})

describe('splitScriptIntoBlocks — não quebra no meio de frase', () => {
  it('frases permanecem inteiras em preset short', () => {
    const text =
      'Uma frase completa aqui. Outra frase completa ali. Mais uma frase para completar o conjunto total do parágrafo.'
    const blocks = splitScriptIntoBlocks(text, 'short')
    for (const b of blocks) {
      // Cada bloco deve terminar com pontuação de fim de frase ou ser o
      // último (que também termina com pontuação aqui).
      expect(/[.!?]$/.test(b.text.trim())).toBe(true)
    }
  })
})

describe('singleBlockFromText', () => {
  it('cria um bloco único com status ready', () => {
    const blocks = singleBlockFromText('Texto inteiro do roteiro.')
    expect(blocks.length).toBe(1)
    expect(blocks[0].status).toBe('ready')
    expect(blocks[0].order).toBe(1)
  })

  it('texto vazio retorna array vazio', () => {
    expect(singleBlockFromText('')).toEqual([])
  })
})

describe('utilitários', () => {
  it('countWords conta palavras', () => {
    expect(countWords('um dois três')).toBe(3)
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })

  it('estimateDurationSeconds estima ~2.5 palavras/segundo', () => {
    // 25 palavras → ~10 segundos
    const text = 'palavra '.repeat(25).trim()
    expect(estimateDurationSeconds(text)).toBe(10)
  })

  it('totalDurationSeconds soma durações', () => {
    const blocks = splitScriptIntoBlocks('Frase um.\n\nFrase dois.', 'one-sentence')
    const total = totalDurationSeconds(blocks)
    expect(total).toBeGreaterThan(0)
  })
})
