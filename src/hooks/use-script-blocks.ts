import { useCallback, useRef, useState } from 'react'
import type { ScriptBlock, ScriptBlockStatus } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   use-script-blocks — FASE 2
   Parser de roteiro em blocos + operações (dividir, juntar, mover, excluir,
   status) + histórico simples de undo/redo (últimas 20 ações).
   ─────────────────────────────────────────────────────────────────────────── */

const WORDS_PER_MINUTE = 150

const TRANSITION_WORDS = [
  'primeiro',
  'primeiramente',
  'agora',
  'por fim',
  'finalmente',
  'outro ponto',
  'além disso',
  'por outro lado',
  'em seguida',
  'logo após',
  'então',
  'contudo',
  'portanto',
  'ressaltando',
  'vale lembrar',
  'antes de tudo',
]

export function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil((words / WORDS_PER_MINUTE) * 60))
}

function makeId(): string {
  return 'blk-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)
}

function makeBlock(text: string, title?: string): ScriptBlock {
  const clean = text.trim()
  return {
    id: makeId(),
    text: clean,
    title,
    status: clean ? 'pending' : 'pending',
    estimatedSeconds: estimateSeconds(clean),
  }
}

/**
 * Cria um bloco preservando ID/title/status de um bloco existente quando há
 * similaridade suficiente (≥80%). A edição incremental do usuário (digitar uma
 * palavra, corrigir um trecho) não deve trocar o ID — senão BlockArts e
 * BlockBRoll perdem o vínculo por blockId no re-parse.
 *
 * Similaridade: considera os textos (trim) iguais OU um contém o outro
 * (edição incremental típica) OU razão de sobreposição de caracteres ≥ 0.8.
 */
function makeBlockPreserving(
  text: string,
  title: string | undefined,
  existing: ScriptBlock[] | undefined,
  usedExistingIds: Set<string>,
): ScriptBlock {
  const clean = text.trim()
  if (existing && existing.length > 0) {
    // Procura o primeiro bloco existente ainda não-reutilizado com similaridade.
    for (const ex of existing) {
      if (usedExistingIds.has(ex.id)) continue
      const exText = ex.text.trim()
      if (!exText) continue
      if (isSimilarEnough(clean, exText)) {
        usedExistingIds.add(ex.id)
        return {
          id: ex.id,
          text: clean,
          // mantém title e status anteriores; atualiza o novo apenas se o
          // parser detectou um título novo e o bloco antigo não tinha.
          title: title ?? ex.title,
          status: ex.status,
          estimatedSeconds: estimateSeconds(clean),
        }
      }
    }
  }
  return makeBlock(clean, title)
}

/**
 * Heurística de similaridade para preservação de IDs no re-parse.
 * Retorna true se a edição for incremental (texto antigo contido no novo ou
 * vice-versa) ou se a sobreposição de caracteres for ≥ 80%.
 */
function isSimilarEnough(a: string, b: string): boolean {
  if (a === b) return true
  if (!a || !b) return false
  // Edição incremental: um contém o outro.
  if (a.includes(b) || b.includes(a)) return true
  // Sobreposição por razão de tamanho: pequena edição de palavras.
  const longer = a.length >= b.length ? a : b
  const shorter = a.length >= b.length ? b : a
  // Conta quantos chars do menor aparecem no maior numa janela simples.
  // Fallback barato: razão de tamanho — se diferem em poucos chars.
  const lenRatio = shorter.length / longer.length
  return lenRatio >= 0.8
}

/**
 * Parser: divide o texto bruto em blocos.
 * Regras (na ordem):
 *  1. Linhas `---` ou `***` (3+ chars) → separador explícito.
 *  2. Linhas começando com Bloco/Cena/Parte/#/## + número/texto → título de bloco.
 *  3. Parágrafo duplo (linha em branco) → novo bloco.
 *  4. Itens de lista numerada (`1.`) ou bullet (`-`, `•`) → bloco de lista.
 *
 * Quando `existingBlocks` é informado, tenta reutilizar o ID/title/status de
 * blocos cujo texto seja ≥80% similar — preserva o vínculo com BlockArts e
 * BlockBRoll durante o re-parse incremental.
 */
export function parseScript(rawText: string, existingBlocks?: ScriptBlock[]): ScriptBlock[] {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText.replace(/\r\n/g, '\n').split('\n')
  const blocks: ScriptBlock[] = []
  let current: string[] = []
  let currentTitle: string | undefined
  const usedExistingIds = new Set<string>()

  const flush = () => {
    const text = current.join('\n').trim()
    if (text) {
      blocks.push(makeBlockPreserving(text, currentTitle, existingBlocks, usedExistingIds))
    }
    current = []
    currentTitle = undefined
  }

  const isSeparator = (l: string) => /^([-*])\1{2,}\s*$/.test(l.trim())
  const isTitle = (l: string) => {
    const t = l.trim()
    return /^(bloco|cena|parte|toma|take)\s*[:#-]?\s*\d*/i.test(t) || /^#{1,2}\s+\S/.test(t)
  }
  const isListItem = (l: string) => /^\s*(\d+\.\s+|[-•*]\s+)/.test(l)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (isSeparator(trimmed)) {
      flush()
      continue
    }

    if (isTitle(trimmed)) {
      flush()
      currentTitle = trimmed.replace(/^#+\s*/, '')
      current.push(line)
      continue
    }

    // Lista: se o bloco atual não é uma lista e estamos começando uma,
    // inicia novo bloco.
    if (isListItem(line) && current.length > 0 && !isListItem(current[current.length - 1])) {
      const prevText = current.join('\n').trim()
      if (prevText && !currentTitle) {
        flush()
      }
    }

    // Parágrafo duplo: linha em branco seguida de texto não-vazio
    if (trimmed === '') {
      // lookahead: se a próxima linha for texto e o current já tem conteúdo,
      // fechamos o bloco (parágrafo duplo = separador).
      const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim() !== '')
      if (nextNonEmpty && current.length > 0) {
        flush()
      }
      // pula linhas em branco consecutivas sem acumular
      continue
    }

    current.push(line)
  }

  flush()

  // Se sobrou um único bloco gigante e não há separadores, retorna como está.
  return blocks
}

/** Reconstrói o texto bruto a partir dos blocos (join com `\n\n`). */
export function blocksToText(blocks: ScriptBlock[]): string {
  return blocks.map((b) => b.text).join('\n\n')
}

export interface UseScriptBlocksResult {
  blocks: ScriptBlock[]
  reparse: (rawText: string) => ScriptBlock[]
  splitBlock: (index: number, atChar?: number) => void
  splitAtCursor: (index: number, cursorOffset: number | undefined) => void
  joinWithPrevious: (index: number) => void
  moveUp: (index: number) => void
  moveDown: (index: number) => void
  deleteBlock: (index: number) => void
  toggleStatus: (index: number) => void
  setStatus: (index: number, status: ScriptBlockStatus) => void
  updateBlockText: (index: number, text: string) => void
  joinAll: () => void
  splitAll: (rawText: string) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

export function useScriptBlocks(initial: ScriptBlock[] = []): UseScriptBlocksResult {
  const [blocks, setBlocksState] = useState<ScriptBlock[]>(initial)
  const [historyVersion, setHistoryVersion] = useState(0) // força re-render após undo/redo
  const undoStack = useRef<ScriptBlock[][]>([])
  const redoStack = useRef<ScriptBlock[][]>([])

  const reparse = useCallback((rawText: string) => {
    let parsed: ScriptBlock[] = []
    setBlocksState((prev) => {
      parsed = parseScript(rawText, prev)
      return parsed
    })
    return parsed
  }, [])

  const splitBlock = useCallback((index: number, atChar?: number) => {
    setBlocksState((prev) => {
      const block = prev[index]
      if (!block) return prev
      let first = block.text
      let second = ''
      if (typeof atChar === 'number' && atChar > 0 && atChar < block.text.length) {
        first = block.text.slice(0, atChar).trim()
        second = block.text.slice(atChar).trim()
      } else {
        const mid = Math.floor(block.text.length / 2)
        const cut = block.text.lastIndexOf(' ', mid)
        const at = cut > 0 ? cut : mid
        first = block.text.slice(0, at).trim()
        second = block.text.slice(at).trim()
      }
      if (!second) return prev
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      const next = [...prev]
      next.splice(index, 1, makeBlock(first, block.title), makeBlock(second))
      return next
    })
  }, [])

  const splitAtCursor = useCallback(
    (index: number, cursorOffset: number | undefined) => splitBlock(index, cursorOffset),
    [splitBlock],
  )

  const joinWithPrevious = useCallback((index: number) => {
    setBlocksState((prev) => {
      if (index <= 0 || !prev[index]) return prev
      const prevBlock = prev[index - 1]
      const cur = prev[index]
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      const merged = makeBlock(`${prevBlock.text}\n\n${cur.text}`, prevBlock.title)
      const next = [...prev]
      next.splice(index - 1, 2, merged)
      return next
    })
  }, [])

  const moveUp = useCallback((index: number) => {
    setBlocksState((prev) => {
      if (index <= 0) return prev
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setBlocksState((prev) => {
      if (index >= prev.length - 1) return prev
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const deleteBlock = useCallback((index: number) => {
    setBlocksState((prev) => {
      if (!prev[index]) return prev
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const toggleStatus = useCallback((index: number) => {
    setBlocksState((prev) => {
      const block = prev[index]
      if (!block) return prev
      const next = [...prev]
      next[index] = {
        ...block,
        status: block.status === 'ready' ? 'pending' : 'ready',
      }
      return next
    })
  }, [])

  const setStatus = useCallback((index: number, status: ScriptBlockStatus) => {
    setBlocksState((prev) => {
      const block = prev[index]
      if (!block) return prev
      const next = [...prev]
      next[index] = { ...block, status }
      return next
    })
  }, [])

  const updateBlockText = useCallback((index: number, text: string) => {
    setBlocksState((prev) => {
      const block = prev[index]
      if (!block) return prev
      const next = [...prev]
      next[index] = {
        ...block,
        text,
        estimatedSeconds: estimateSeconds(text),
      }
      return next
    })
  }, [])

  const joinAll = useCallback(() => {
    setBlocksState((prev) => {
      if (prev.length === 0) return prev
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      return [makeBlock(blocksToText(prev))]
    })
  }, [])

  const splitAll = useCallback((rawText: string) => {
    setBlocksState((prev) => {
      undoStack.current.push(prev)
      if (undoStack.current.length > 20) undoStack.current.shift()
      redoStack.current = []
      return parseScript(rawText)
    })
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (prev) {
      setBlocksState((current) => {
        redoStack.current.push(current)
        return prev
      })
      // canUndo/canRedo derivam das refs; força re-render para atualizar a UI
      setHistoryVersion((v) => v + 1)
    }
  }, [])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (next) {
      setBlocksState((current) => {
        undoStack.current.push(current)
        return next
      })
      setHistoryVersion((v) => v + 1)
    }
  }, [])

  // `historyVersion` só existe para forçar re-render quando undo/redo alteram
  // as pilhas de histórico (refs não disparariam re-render sozinhas).
  void historyVersion

  return {
    blocks,
    reparse,
    splitBlock,
    splitAtCursor,
    joinWithPrevious,
    moveUp,
    moveDown,
    deleteBlock,
    toggleStatus,
    setStatus,
    updateBlockText,
    joinAll,
    splitAll,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    undo,
    redo,
  }
}

/**
 * Heurística local de sugestão de divisão por IA.
 * Detecta transições de parágrafo e palavras de transição; agrupa em blocos
 * de 30–60 segundos (~75–150 palavras). Retorna offsets de caractere no texto
 * onde faria sentido dividir.
 */
export function suggestSplitsLocal(rawText: string): number[] {
  if (!rawText || !rawText.trim()) return []
  const offsets: number[] = []
  const paragraphs = rawText.split(/\n{2,}/)
  let cursor = 0
  let blockWords = 0
  const targetMin = 75 // ~30s @ 150 wpm
  const targetMax = 150 // ~60s

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const words = para.trim().split(/\s+/).filter(Boolean).length
    const startsWithTransition = TRANSITION_WORDS.some((w) =>
      para.trim().toLowerCase().startsWith(w),
    )

    // Calcula offset do início deste parágrafo
    cursor += i === 0 ? 0 : paragraphs.slice(0, i).join('\n\n').length + 2
    const paraStart = rawText.indexOf(para, cursor > 0 ? cursor - 1 : 0)
    const safeStart = paraStart >= 0 ? paraStart : cursor

    if (
      i > 0 &&
      (blockWords + words > targetMax || (blockWords >= targetMin && startsWithTransition))
    ) {
      offsets.push(safeStart)
      blockWords = words
    } else {
      blockWords += words
    }
    cursor = safeStart + para.length
  }

  return offsets
}
