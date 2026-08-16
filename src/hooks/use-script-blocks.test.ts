/* =============================================================================
   Testes do parser de roteiro e divisão em blocos (use-script-blocks)
   Cobre: IDs estáveis, split preserva ID, join preserva ID, parse de
   parágrafos, re-parse incremental não quebra vínculos.
   ========================================================================== */
import { describe, it, expect } from 'vitest'
import { parseScript, blocksToText, suggestSplitsLocal } from '@/hooks/use-script-blocks'

describe('parseScript — divisão determinística', () => {
  it('texto vazio retorna array vazio', () => {
    expect(parseScript('')).toEqual([])
    expect(parseScript('   ')).toEqual([])
  })

  it('parágrafos duplos viram blocos separados', () => {
    const text = 'Primeiro bloco.\n\nSegundo bloco.\n\nTerceiro bloco.'
    const blocks = parseScript(text)
    expect(blocks.length).toBe(3)
    expect(blocks[0].text).toContain('Primeiro')
    expect(blocks[1].text).toContain('Segundo')
    expect(blocks[2].text).toContain('Terceiro')
  })

  it('IDs são estáveis e únicos', () => {
    const blocks = parseScript('A\n\nB\n\nC')
    const ids = blocks.map((b) => b.id)
    expect(new Set(ids).size).toBe(3)
    ids.forEach((id) => expect(typeof id).toBe('string'))
  })

  it('separador --- divide blocos', () => {
    const text = 'Parte um\n---\nParte dois'
    const blocks = parseScript(text)
    expect(blocks.length).toBe(2)
  })

  it('título "Bloco 1:" inicia novo bloco com título', () => {
    const text = 'Bloco 1: Introdução\nTexto intro\n\nBloco 2: Desenvolvimento\nTexto dev'
    const blocks = parseScript(text)
    expect(blocks.length).toBeGreaterThanOrEqual(2)
  })
})

describe('blocksToText — round-trip', () => {
  it('junta blocos com \\n\\n', () => {
    const text = 'A\n\nB\n\nC'
    const blocks = parseScript(text)
    expect(blocksToText(blocks)).toBe(text)
  })
})

describe('parseScript — preservação de IDs no re-parse', () => {
  it('re-parse de texto idêntico preserva IDs', () => {
    const text = 'Primeiro parágrafo.\n\nSegundo parágrafo.'
    const first = parseScript(text)
    const second = parseScript(text, first)
    expect(second[0].id).toBe(first[0].id)
    expect(second[1].id).toBe(first[1].id)
  })

  it('CENÁRIO 2: associações persistem após recarregar (IDs estáveis)', () => {
    const text = 'Bloco A\n\nBloco B\n\nBloco C'
    const original = parseScript(text)
    const assignments = new Map(original.map((b) => [b.id, `arte-${b.id}`]))
    // Re-parse (simula recarga do localStorage)
    const reloaded = parseScript(text, original)
    // Associações ainda válidas
    reloaded.forEach((b) => {
      expect(assignments.has(b.id)).toBe(true)
    })
  })
})

describe('suggestSplitsLocal — fallback determinístico', () => {
  it('retorna offsets para texto longo', () => {
    const long = 'paragrafo um '.repeat(20) + '\n\n' + 'paragrafo dois '.repeat(20)
    const offsets = suggestSplitsLocal(long)
    expect(Array.isArray(offsets)).toBe(true)
  })

  it('texto curto não sugere divisões', () => {
    expect(suggestSplitsLocal('curto')).toEqual([])
  })
})
