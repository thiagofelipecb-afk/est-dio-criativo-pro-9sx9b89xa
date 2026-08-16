/* =============================================================================
   LUMEN Studio — Divisão determinística de roteiro em blocos
   --------------------------------------------------------------------------
   Fallback funcional (sem IA) para splitScriptIntoBlocks(text, preset).
   Regras:
     1. `---` ou `--` em linha própria = quebra de bloco explícita.
     2. Quebra de linha dupla (`\n\n`) separa parágrafos.
     3. Quando um parágrafo excede o máximo de palavras do preset, divide por
        frases (`. ! ?`) agrupando até o limite — nunca quebra no meio de uma
        frase (exceto no modo "duração personalizada" como fallback final).
     4. Preserva parágrafos curtos juntos quando possível.
   Estima duração com ~2.5 palavras/segundo (= 150 palavras/min).
   ========================================================================== */
import type { ScriptBlock } from '@/types/studio'

/** Palavras por segundo usadas na estimativa de duração (~150 wpm). */
export const WORDS_PER_SECOND = 2.5

/** Estima duração em segundos de um texto (~2.5 palavras/segundo). */
export function estimateDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 0
  return Math.max(1, Math.round(words / WORDS_PER_SECOND))
}

/** Conta palavras de um texto. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Presets de divisão determinística. */
export type SplitPresetId =
  | 'short' // 1-2 frases, max 80 palavras
  | 'medium' // 2-3 frases, max 150 palavras
  | 'long' // 3-5 frases, max 250 palavras
  | 'one-sentence' // uma frase por bloco
  | 'custom' // duração personalizada (segundos por bloco)

export interface SplitPresetDef {
  id: SplitPresetId
  label: string
  /** Máximo de palavras por bloco (ignorado em 'one-sentence' e 'custom'). */
  maxWords: number
  /** Duração alvo em segundos (apenas 'custom'). */
  targetSeconds?: number
}

export const SPLIT_PRESET_DEFS: SplitPresetDef[] = [
  { id: 'short', label: 'Blocos curtos (1-2 frases)', maxWords: 80 },
  { id: 'medium', label: 'Blocos médios (2-3 frases)', maxWords: 150 },
  { id: 'long', label: 'Blocos longos (3-5 frases)', maxWords: 250 },
  { id: 'one-sentence', label: 'Uma frase por bloco', maxWords: 0 },
  { id: 'custom', label: 'Duração personalizada', maxWords: 0, targetSeconds: 30 },
]

let idCounter = 0
function makeBlockId(): string {
  idCounter += 1
  return (
    'blk-' +
    Date.now().toString(36) +
    '-' +
    idCounter.toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  )
}

function makeBlock(text: string): ScriptBlock {
  const clean = text.trim()
  const seconds = estimateDurationSeconds(clean)
  return {
    id: makeBlockId(),
    text: clean,
    status: 'draft',
    estimatedSeconds: seconds,
    estimatedDurationMs: seconds * 1000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Divide um texto em frases (mantém a pontuação final). */
function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Divide o texto em `ScriptBlock[]` conforme o preset.
 * @param text Texto bruto do roteiro.
 * @param preset Id do preset (ou 'custom').
 * @param customSeconds Segundos por bloco (apenas preset='custom').
 */
export function splitScriptIntoBlocks(
  text: string,
  preset: SplitPresetId,
  customSeconds?: number,
): ScriptBlock[] {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) return []

  // 1. Quebra explícita por `---` ou `--` em linha própria.
  const explicitSegments = clean
    .split(/(?:\n\s*)?(?:-{2,}|={3,}|\*{3,})(?:\s*\n)?/)
    .map((s) => s.trim())
    .filter(Boolean)

  const def = SPLIT_PRESET_DEFS.find((p) => p.id === preset)
  const maxWords = def?.maxWords ?? 0
  const targetSeconds =
    preset === 'custom' ? Math.max(5, customSeconds ?? def?.targetSeconds ?? 30) : undefined

  const blocks: ScriptBlock[] = []

  for (const segment of explicitSegments) {
    // 2. Quebra por parágrafo duplo dentro de cada segmento explícito.
    const paragraphs = segment
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)

    for (const para of paragraphs) {
      const words = countWords(para)

      // one-sentence: cada frase vira um bloco.
      if (preset === 'one-sentence') {
        const sentences = splitIntoSentences(para)
        for (const s of sentences) blocks.push(makeBlock(s))
        continue
      }

      // Parágrafo curto suficiente → bloco único.
      if (maxWords > 0 && words <= maxWords) {
        blocks.push(makeBlock(para))
        continue
      }

      // custom: agrupa por duração alvo (segundos).
      if (preset === 'custom' && targetSeconds) {
        const targetWords = Math.max(1, Math.round(targetSeconds * WORDS_PER_SECOND))
        const sentences = splitIntoSentences(para)
        let bucket: string[] = []
        let bucketWords = 0
        for (const sentence of sentences) {
          const sw = countWords(sentence)
          if (bucketWords + sw > targetWords && bucket.length > 0) {
            blocks.push(makeBlock(bucket.join(' ')))
            bucket = []
            bucketWords = 0
          }
          bucket.push(sentence)
          bucketWords += sw
        }
        if (bucket.length > 0) blocks.push(makeBlock(bucket.join(' ')))
        continue
      }

      // short/medium/long: agrupa por máximo de palavras, dividindo por frases.
      const sentences = splitIntoSentences(para)
      let bucket: string[] = []
      let bucketWords = 0
      for (const sentence of sentences) {
        const sw = countWords(sentence)
        // Se a própria frase excede o máximo, ainda assim a mantemos inteira
        // (nunca quebra no meio de uma frase nestes presets).
        if (bucketWords + sw > maxWords && bucket.length > 0) {
          blocks.push(makeBlock(bucket.join(' ')))
          bucket = []
          bucketWords = 0
        }
        bucket.push(sentence)
        bucketWords += sw
      }
      if (bucket.length > 0) blocks.push(makeBlock(bucket.join(' ')))
    }
  }

  // Atribui ordem (1-based).
  blocks.forEach((b, i) => {
    b.order = i + 1
  })
  return blocks
}

/** Cria um único bloco com todo o texto (modo "Usar texto inteiro"). */
export function singleBlockFromText(text: string): ScriptBlock[] {
  const clean = text.trim()
  if (!clean) return []
  const b = makeBlock(clean)
  b.order = 1
  b.status = 'ready'
  return [b]
}

/** Total de segundos de uma lista de blocos. */
export function totalDurationSeconds(blocks: ScriptBlock[]): number {
  return blocks.reduce((acc, b) => acc + (b.estimatedSeconds || 0), 0)
}

/** Formata segundos como "Xm Ys" ou "Ys". */
export function formatDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}min` : `${m}min ${s}s`
}
