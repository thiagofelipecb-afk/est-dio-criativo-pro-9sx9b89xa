import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ScrollText,
  Play,
  Pause,
  RotateCcw,
  FlipHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Combine,
  ChevronUp,
  ChevronDown,
  Trash2,
  Undo2,
  Redo2,
  Wand2,
  Loader2,
  ArrowDownToLine,
  Check,
  X,
  Layers,
  Clapperboard,
  PenLine,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStudio } from '@/context/StudioContext'
import { useScriptBlocks, suggestSplitsLocal } from '@/hooks/use-script-blocks'
import { useTeleprompter } from '@/hooks/use-teleprompter'
import type { ScriptBlock, TeleprompterMode, TeleprompterTextColor } from '@/types/studio'
import { BlockArts } from '@/components/studio/BlockArts'
import { BlockBRoll } from '@/components/studio/BlockBRoll'
import { ReactionVideoPanel } from '@/components/studio/ReactionVideoPanel'
import { Whiteboard } from '@/components/studio/Whiteboard'
import { BackgroundPanel } from '@/components/studio/BackgroundPanel'
import { TitlePanel } from '@/components/studio/TitlePanel'
import { ImagePlus, Type as TypeIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  readBlockArts,
  readBlockBRoll,
  writeBlockArts,
  writeBlockBRoll,
  clearBlockMedia,
} from '@/hooks/use-block-media'
import type { BlockArt, BlockBRoll as BlockBRollType } from '@/types/studio'

const TEXT_COLORS: Record<TeleprompterTextColor, string> = {
  white: '#FFFFFF',
  green: '#22C55E',
  yellow: '#FBBF24',
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ═══════════════════════════════════════════════════════════════════════
   ScriptPanel — Painel inferior da Gravadora (abas Roteiro / Teleprompter)
   ═══════════════════════════════════════════════════════════════════════ */
export interface ScriptPanelProps {
  /** Indica se uma gravação está em andamento (para o indicador "ativo"). */
  isRecording: boolean
  /** Notifica a Gravadora de que o teleprompter está ativo/rolando. */
  onTeleprompterActiveChange?: (active: boolean) => void
  /** Callback quando o bloco ativo muda (para futura sincronização de artes). */
  onActiveBlockChange?: (index: number) => void
  /** Estado vindo da Gravadora: sincronizar artes com blocos. */
  syncArts: boolean
  setSyncArts: (v: boolean) => void
  /** Iniciar teleprompter automaticamente ao gravar. */
  autoStartOnRecord: boolean
  setAutoStartOnRecord: (v: boolean) => void
  /** GAP 1 — Callback para iniciar a gravação a partir do botão "Iniciar" do Roteiro. */
  onStartRecording?: () => void
  /** GAP 1 — Indica se o botão "Iniciar" pode ser usado (estado da máquina de estados). */
  canStartRecording?: boolean
}

export default function ScriptPanel({
  isRecording,
  onTeleprompterActiveChange,
  onActiveBlockChange,
  syncArts,
  setSyncArts,
  autoStartOnRecord,
  setAutoStartOnRecord,
  onStartRecording,
  canStartRecording = true,
}: ScriptPanelProps) {
  const { gravadoraScript, setGravadoraScript, scriptBlocks, setScriptBlocks } = useStudio()
  const [tab, setTab] = useState<
    'script' | 'teleprompter' | 'reaction' | 'board' | 'background' | 'title'
  >('script')
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<number[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  /* ═══ GAP 2 — Modo "Clique no ponto de divisão" + confirmação de mídia ═══ */
  // Índice do bloco em modo de seleção de ponto de divisão (null = inativo).
  const [splitModeIndex, setSplitModeIndex] = useState<number | null>(null)
  // Offset selecionado dentro do texto do bloco (null = ainda não escolheu).
  const [splitOffset, setSplitOffset] = useState<number | null>(null)
  // Dialog de redistribuição de mídia ao dividir.
  const [splitMediaDialog, setSplitMediaDialog] = useState<{
    blockIndex: number
    offset: number
    arts: BlockArt[]
    broll: BlockBRollType | null
    sourceBlockId: string
  } | null>(null)

  /* ═══ GAP 3 — Resolução de conflito de mídia ao juntar blocos ═══ */
  // Dialog de conflito de mídia ao juntar com o anterior.
  const [joinConflictDialog, setJoinConflictDialog] = useState<{
    index: number
    prevArts: BlockArt[]
    prevBRoll: BlockBRollType | null
    curArts: BlockArt[]
    curBRoll: BlockBRollType | null
    prevBlockId: string
    curBlockId: string
  } | null>(null)

  const {
    blocks,
    reparse,
    splitAtCursor,
    splitBlockWithIds,
    joinWithPrevious,
    joinWithPreviousReturningId,
    moveUp,
    moveDown,
    deleteBlock,
    toggleStatus,
    joinAll,
    splitAll,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useScriptBlocks(scriptBlocks)

  // Sincroniza blocos do hook → context (persistência)
  useEffect(() => {
    setScriptBlocks(blocks)
  }, [blocks, setScriptBlocks])

  // Re-parse quando o texto bruto muda (debounce 300ms) — mantém os blocos
  // coerentes com o texto livre do editor.
  const reparseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (reparseTimer.current) clearTimeout(reparseTimer.current)
    reparseTimer.current = setTimeout(() => {
      reparse(gravadoraScript)
    }, 300)
    return () => {
      if (reparseTimer.current) clearTimeout(reparseTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravadoraScript])

  const totalSeconds = useMemo(
    () => blocks.reduce((acc, b) => acc + b.estimatedSeconds, 0),
    [blocks],
  )

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setGravadoraScript(e.target.value)
    },
    [setGravadoraScript],
  )

  const handleSplitAtCursor = useCallback(
    (index: number) => {
      const ta = textareaRef.current
      if (!ta) {
        splitAtCursor(index, undefined)
        return
      }
      const cursor = ta.selectionStart
      // encontra o offset do bloco dentro do texto bruto
      const blockOffset = gravadoraScript.indexOf(blocks[index]?.text ?? '\0')
      if (blockOffset < 0) {
        splitAtCursor(index, undefined)
        return
      }
      const rel = cursor - blockOffset
      splitAtCursor(index, rel)
      toast.success('Bloco dividido.')
    },
    [gravadoraScript, blocks, splitAtCursor],
  )

  /* ═══ GAP 2 — Entra no modo "Clique no ponto de divisão" ═══
     O botão "Dividir" existente ativa este modo; o usuário então clica no
     texto do bloco expandido para escolher o ponto exato. */
  const handleEnterSplitMode = useCallback(
    (index: number) => {
      if (!blocks[index]) return
      // Garante que o bloco esteja expandido para o usuário clicar no texto.
      setExpandedId(blocks[index].id)
      setSplitModeIndex(index)
      setSplitOffset(null)
    },
    [blocks],
  )

  const handleCancelSplitMode = useCallback(() => {
    setSplitModeIndex(null)
    setSplitOffset(null)
  }, [])

  /* Quando o usuário clica em uma posição do texto do bloco, calculamos o
     offset por caractere e, se houver mídia vinculada, abrimos o dialog de
     redistribuição. Caso contrário, dividimos diretamente. */
  const handlePickSplitPoint = useCallback(
    (index: number, offset: number) => {
      const block = blocks[index]
      if (!block) return
      setSplitOffset(offset)
      const arts = readBlockArts(block.id)
      const broll = readBlockBRoll(block.id)
      if (arts.length > 0 || broll) {
        setSplitMediaDialog({
          blockIndex: index,
          offset,
          arts,
          broll,
          sourceBlockId: block.id,
        })
      } else {
        // Sem mídia: divide diretamente.
        splitBlockWithIds(index, offset)
        toast.success('Bloco dividido.')
        setSplitModeIndex(null)
        setSplitOffset(null)
      }
    },
    [blocks, splitBlockWithIds],
  )

  /* Executa o split de fato, redistribuindo a mídia conforme a escolha.
     Usa splitBlockWithIds para obter o ID do segundo bloco de forma
     determinística e gravar a mídia diretamente no localStorage. */
  const handleConfirmSplitMedia = useCallback(
    (choice: 'first' | 'second' | 'both') => {
      const dlg = splitMediaDialog
      if (!dlg) return
      const block = blocks[dlg.blockIndex]
      if (!block) {
        setSplitMediaDialog(null)
        return
      }
      const prevArts = readBlockArts(block.id)
      const prevBRoll = readBlockBRoll(block.id)

      // Executa o split obtendo os IDs resultantes.
      const ids = splitBlockWithIds(dlg.blockIndex, dlg.offset)
      if (!ids) {
        setSplitMediaDialog(null)
        return
      }
      const { firstId, secondId } = ids

      if (choice === 'first') {
        // Mantém no primeiro: a mídia já está sob firstId (== block.id).
        writeBlockArts(firstId, prevArts)
        writeBlockBRoll(firstId, prevBRoll)
        clearBlockMedia(secondId)
      } else if (choice === 'second') {
        // Move para o segundo: limpa o primeiro e grava no segundo.
        clearBlockMedia(firstId)
        writeBlockArts(secondId, prevArts)
        writeBlockBRoll(secondId, prevBRoll)
      } else {
        // both: duplicar para ambos. Primeiro mantém; segundo recebe cópia.
        writeBlockArts(firstId, prevArts)
        writeBlockBRoll(firstId, prevBRoll)
        writeBlockArts(
          secondId,
          prevArts.map((a) => ({ ...a, id: 'art-' + Math.random().toString(36).slice(2, 9) })),
        )
        writeBlockBRoll(secondId, prevBRoll)
      }
      // Dispara um evento para overlays/BlockCard refletirem a mudança.
      window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))

      toast.success('Bloco dividido.')
      setSplitMediaDialog(null)
      setSplitModeIndex(null)
      setSplitOffset(null)
    },
    [blocks, splitBlockWithIds, splitMediaDialog],
  )

  /* ═══ GAP 3 — Resolução de conflito de mídia ao juntar com anterior ═══
     Antes de chamar joinWithPrevious, verifica se ambos os blocos possuem
     mídia (arte ou B-roll) diferente. Se sim, abre o modal de resolução. */
  const handleJoinWithPreviousCheck = useCallback(
    (index: number) => {
      if (index <= 0 || !blocks[index]) return
      const prevBlock = blocks[index - 1]
      const curBlock = blocks[index]
      const prevArts = readBlockArts(prevBlock.id)
      const curArts = readBlockArts(curBlock.id)
      const prevBRoll = readBlockBRoll(prevBlock.id)
      const curBRoll = readBlockBRoll(curBlock.id)

      const prevHasMedia = prevArts.length > 0 || !!prevBRoll
      const curHasMedia = curArts.length > 0 || !!curBRoll

      // Compara se as mídias são "diferentes" (por dataUrl/url).
      const artsEqual =
        prevArts.length === curArts.length &&
        prevArts.every((a, i) => a.dataUrl === curArts[i]?.dataUrl)
      const brollEqual =
        (prevBRoll === null && curBRoll === null) ||
        (prevBRoll !== null &&
          curBRoll !== null &&
          prevBRoll.url === curBRoll.url &&
          prevBRoll.pexelsId === curBRoll.pexelsId)

      if (prevHasMedia && curHasMedia && (!artsEqual || !brollEqual)) {
        // Conflito: ambos têm mídia e são diferentes.
        setJoinConflictDialog({
          index,
          prevArts,
          prevBRoll,
          curArts,
          curBRoll,
          prevBlockId: prevBlock.id,
          curBlockId: curBlock.id,
        })
        return
      }

      // Sem conflito: join normal. Como joinWithPreviousReturningId preserva
      // o ID do bloco anterior, a mídia do anterior já fica vinculada ao ID
      // resultante. Se só o bloco atual tem mídia, movemos para o ID do
      // anterior antes do join. Se nenhum tem mídia, segue direto.
      const resultId = joinWithPreviousReturningId(index)
      if (resultId) {
        if (!prevHasMedia && curHasMedia) {
          // Só o atual tem mídia: move para o ID resultante (== prevBlock.id).
          writeBlockArts(resultId, curArts)
          writeBlockBRoll(resultId, curBRoll)
          clearBlockMedia(curBlock.id)
        } else if (prevHasMedia) {
          // Só o anterior (ou nenhum) tem mídia: já está sob resultId.
          clearBlockMedia(curBlock.id)
        }
        window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
      }
    },
    [blocks, joinWithPreviousReturningId],
  )

  /* Executa o join conforme a resolução do conflito. O bloco resultante
     preserva o ID do anterior, então gravamos a mídia escolhida sob esse ID. */
  const handleConfirmJoinConflict = useCallback(
    (choice: 'prev' | 'cur' | 'both' | 'cancel') => {
      const dlg = joinConflictDialog
      if (!dlg) return
      if (choice === 'cancel') {
        setJoinConflictDialog(null)
        return
      }
      const prevBlock = blocks[dlg.index - 1]
      const curBlock = blocks[dlg.index]
      if (!prevBlock || !curBlock) {
        setJoinConflictDialog(null)
        return
      }
      let arts: BlockArt[] = []
      let broll: BlockBRollType | null = null
      if (choice === 'prev') {
        arts = dlg.prevArts
        broll = dlg.prevBRoll
      } else if (choice === 'cur') {
        arts = dlg.curArts
        broll = dlg.curBRoll
      } else {
        // both: combina artes (evita duplicatas por dataUrl) e prefere o
        // B-roll do anterior (ou do atual se o anterior não tiver).
        const seen = new Set<string>()
        arts = [...dlg.prevArts, ...dlg.curArts].filter((a) => {
          if (seen.has(a.dataUrl)) return false
          seen.add(a.dataUrl)
          return true
        })
        broll = dlg.prevBRoll ?? dlg.curBRoll
      }
      // Limpa ambos antes do join para não deixar mídia órfã.
      clearBlockMedia(prevBlock.id)
      clearBlockMedia(curBlock.id)
      // Executa o join (preserva o ID do bloco anterior).
      const resultId = joinWithPreviousReturningId(dlg.index)
      if (resultId) {
        writeBlockArts(resultId, arts)
        writeBlockBRoll(resultId, broll)
        window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
      }
      setJoinConflictDialog(null)
    },
    [blocks, joinWithPreviousReturningId, joinConflictDialog],
  )

  /* GAP 1 — Inicia a gravação via callback da Gravadora. */
  const handleStartRecording = useCallback(() => {
    if (blocks.length === 0) return
    if (!canStartRecording) return
    onStartRecording?.()
  }, [blocks.length, canStartRecording, onStartRecording])

  const handleSuggestAI = useCallback(async () => {
    if (!gravadoraScript.trim()) {
      toast.warning('Escreva um roteiro antes de sugerir divisões.')
      return
    }
    setLoadingAI(true)
    try {
      // Simula chamada de IA (800ms). Em produção, edge function do Supabase.
      await new Promise((r) => setTimeout(r, 800))
      const offsets = suggestSplitsLocal(gravadoraScript)
      setSuggestions(offsets)
      if (offsets.length === 0) {
        toast.info('Nenhum ponto de divisão sugerido encontrado.')
      } else {
        toast.success(`${offsets.length} ponto(s) de divisão sugerido(s).`)
      }
    } catch {
      toast.error('Não foi possível analisar o texto. Tente novamente.')
    } finally {
      setLoadingAI(false)
    }
  }, [gravadoraScript])

  const acceptAllSuggestions = useCallback(() => {
    if (suggestions.length === 0) return
    // Reconstrói o texto inserindo `\n\n---\n\n` em cada offset sugerido
    let text = gravadoraScript
    const sorted = [...suggestions].sort((a, b) => a - b)
    // insere de trás pra frente para não deslocar offsets
    for (let i = sorted.length - 1; i >= 0; i--) {
      const off = sorted[i]
      text = text.slice(0, off) + '\n\n---\n\n' + text.slice(off)
    }
    setGravadoraScript(text)
    setSuggestions([])
    toast.success('Divisões aplicadas ao roteiro.')
  }, [suggestions, gravadoraScript, setGravadoraScript])

  const acceptSuggestion = useCallback(
    (offset: number) => {
      const text = gravadoraScript.slice(0, offset) + '\n\n---\n\n' + gravadoraScript.slice(offset)
      setGravadoraScript(text)
      setSuggestions((prev) => prev.filter((o) => o !== offset))
    },
    [gravadoraScript, setGravadoraScript],
  )

  const handleSelectBlock = useCallback(
    (index: number) => {
      setActiveBlockIndex(index)
      onActiveBlockChange?.(index)
    },
    [onActiveBlockChange],
  )

  /* ═══════════════════════════════════════════════════════════════════════
     Teleprompter integrado (aba Teleprompter)
     ═══════════════════════════════════════════════════════════════════════ */
  const [tpMode, setTpMode] = useState<TeleprompterMode>('blocks')
  const [tpFontSize, setTpFontSize] = useState(28)
  const [tpSpeed, setTpSpeed] = useState(3)
  const [tpColor, setTpColor] = useState<TeleprompterTextColor>('white')
  const [tpMirror, setTpMirror] = useState(false)
  const [tpActive, setTpActive] = useState(false)

  const tp = useTeleprompter({ speed: tpSpeed, active: tpActive })

  useEffect(() => {
    onTeleprompterActiveChange?.(tpActive || tp.isScrolling)
  }, [tpActive, tp.isScrolling, onTeleprompterActiveChange])

  // Auto-start teleprompter quando a gravação começa (se habilitado)
  useEffect(() => {
    if (isRecording && autoStartOnRecord) {
      setTpActive(true)
      if (tpMode === 'continuous') {
        tp.start()
      }
    }
    if (!isRecording) {
      tp.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, autoStartOnRecord])

  // Atalhos do teleprompter (↓/Espaço avança, ↑ volta, Esc fecha) — só na aba teleprompter
  useEffect(() => {
    if (tab !== 'teleprompter') return
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const tag = el?.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        if (tpMode === 'blocks') {
          setActiveBlockIndex((prev) => {
            const next = Math.min(prev + 1, blocks.length - 1)
            onActiveBlockChange?.(next)
            return next
          })
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (tpMode === 'blocks') {
          setActiveBlockIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            onActiveBlockChange?.(next)
            return next
          })
        }
      } else if (e.key === 'Escape') {
        setTpActive(false)
        tp.pause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, tpMode, blocks.length, onActiveBlockChange, tp])

  const currentBlock = blocks[activeBlockIndex]
  const nextBlock = blocks[activeBlockIndex + 1]

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-[#0B0B10] border-t border-white/10">
      {/* Tabs header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1" role="tablist" aria-label="Painel do estúdio">
          <button
            role="tab"
            id="tab-script"
            aria-selected={tab === 'script'}
            aria-controls="tabpanel-script"
            tabIndex={tab === 'script' ? 0 : -1}
            onClick={() => setTab('script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              tab === 'script'
                ? 'bg-[#7C5CFC] text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" /> Roteiro
          </button>
          <button
            role="tab"
            id="tab-teleprompter"
            aria-selected={tab === 'teleprompter'}
            aria-controls="tabpanel-teleprompter"
            tabIndex={tab === 'teleprompter' ? 0 : -1}
            onClick={() => setTab('teleprompter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              tab === 'teleprompter'
                ? 'bg-[#7C5CFC] text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Teleprompter
          </button>
          <button
            role="tab"
            id="tab-reaction"
            aria-selected={tab === 'reaction'}
            aria-controls="tabpanel-reaction"
            tabIndex={tab === 'reaction' ? 0 : -1}
            onClick={() => setTab('reaction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              tab === 'reaction'
                ? 'bg-[#7C5CFC] text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" /> Reação
          </button>
          {blocks.length > 0 && (
            <button
              role="tab"
              id="tab-board"
              aria-selected={tab === 'board'}
              aria-controls="tabpanel-board"
              tabIndex={tab === 'board' ? 0 : -1}
              onClick={() => setTab('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                tab === 'board'
                  ? 'bg-[#7C5CFC] text-white'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
              title="Disponível quando há blocos no roteiro"
            >
              <PenLine className="w-3.5 h-3.5" /> Quadro
            </button>
          )}
          <button
            role="tab"
            id="tab-background"
            aria-selected={tab === 'background'}
            aria-controls="tabpanel-background"
            tabIndex={tab === 'background' ? 0 : -1}
            onClick={() => setTab('background')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              tab === 'background'
                ? 'bg-[#7C5CFC] text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <ImagePlus className="w-3.5 h-3.5" /> Fundo
          </button>
          <button
            role="tab"
            id="tab-title"
            aria-selected={tab === 'title'}
            aria-controls="tabpanel-title"
            tabIndex={tab === 'title' ? 0 : -1}
            onClick={() => setTab('title')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              tab === 'title'
                ? 'bg-[#7C5CFC] text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            <TypeIcon className="w-3.5 h-3.5" /> Título
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* GAP 1 — Botão "Iniciar" com label dinâmico.
              Com 0 blocos: "0/0" e disabled. Com N blocos: "Iniciar (N blocos)". */}
          <button
            onClick={handleStartRecording}
            disabled={blocks.length === 0 || !canStartRecording}
            aria-label={
              blocks.length === 0
                ? 'Iniciar gravação — sem blocos'
                : `Iniciar gravação com ${blocks.length} bloco(s)`
            }
            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              blocks.length === 0 || !canStartRecording
                ? 'bg-white/5 text-[#9494A8]/50 cursor-not-allowed opacity-50'
                : 'bg-[#7C5CFC] text-white hover:bg-[#6B4EF0] shadow-lg shadow-[#7C5CFC]/30'
            }`}
            title={
              blocks.length === 0
                ? 'Sem blocos para gravar'
                : !canStartRecording
                  ? 'Gravação indisponível no estado atual'
                  : `Iniciar gravação (${blocks.length} bloco(s))`
            }
          >
            <Circle className="w-3 h-3" />
            {blocks.length === 0
              ? '0/0'
              : `Iniciar (${blocks.length} bloco${blocks.length > 1 ? 's' : ''})`}
          </button>
          {/* Contador de duração preservado */}
          <span className="text-[10px] font-mono text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-0.5 rounded">
            {blocks.length} blocos · ~{formatDuration(totalSeconds)}
          </span>
          {(tpActive || tp.isScrolling) && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Teleprompter ativo
            </span>
          )}
        </div>
      </div>

      {/* GAP 2 — Dialog de redistribuição de mídia ao dividir bloco */}
      <SplitMediaDialog
        open={splitMediaDialog !== null}
        onClose={() => setSplitMediaDialog(null)}
        onChoose={handleConfirmSplitMedia}
        arts={splitMediaDialog?.arts ?? []}
        broll={splitMediaDialog?.broll ?? null}
      />

      {/* GAP 3 — Dialog de resolução de conflito de mídia ao juntar blocos */}
      <JoinConflictDialog
        open={joinConflictDialog !== null}
        onClose={() => setJoinConflictDialog(null)}
        onChoose={handleConfirmJoinConflict}
        prevArts={joinConflictDialog?.prevArts ?? []}
        prevBRoll={joinConflictDialog?.prevBRoll ?? null}
        curArts={joinConflictDialog?.curArts ?? []}
        curBRoll={joinConflictDialog?.curBRoll ?? null}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          role="tabpanel"
          id={`tabpanel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="h-full"
        >
          {tab === 'script' ? (
            <ScriptTab
              gravadoraScript={gravadoraScript}
              handleTextChange={handleTextChange}
              textareaRef={textareaRef}
              blocks={blocks}
              activeBlockIndex={activeBlockIndex}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId}
              onSelectBlock={handleSelectBlock}
              onToggleStatus={toggleStatus}
              onSplit={handleSplitAtCursor}
              onJoinPrev={joinWithPrevious}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onDelete={deleteBlock}
              onJoinAll={joinAll}
              onSplitAll={() => {
                splitAll(gravadoraScript)
                toast.success('Roteiro reprocessado em blocos.')
              }}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              loadingAI={loadingAI}
              suggestions={suggestions}
              onSuggestAI={handleSuggestAI}
              onAcceptSuggestion={acceptSuggestion}
              onAcceptAll={acceptAllSuggestions}
              onClearSuggestions={() => setSuggestions([])}
              totalSeconds={totalSeconds}
              splitModeIndex={splitModeIndex}
              splitOffset={splitOffset}
              onEnterSplitMode={handleEnterSplitMode}
              onCancelSplitMode={handleCancelSplitMode}
              onPickSplitPoint={handlePickSplitPoint}
              onJoinPrevCheck={handleJoinWithPreviousCheck}
            />
          ) : tab === 'reaction' ? (
            <ReactionVideoPanel />
          ) : tab === 'board' ? (
            <Whiteboard />
          ) : tab === 'background' ? (
            <BackgroundPanel />
          ) : tab === 'title' ? (
            <TitlePanel />
          ) : (
            <TeleprompterTab
              blocks={blocks}
              activeBlockIndex={activeBlockIndex}
              setActiveBlockIndex={handleSelectBlock}
              currentBlock={currentBlock}
              nextBlock={nextBlock}
              tpMode={tpMode}
              setTpMode={setTpMode}
              tpFontSize={tpFontSize}
              setTpFontSize={setTpFontSize}
              tpSpeed={tpSpeed}
              setTpSpeed={setTpSpeed}
              tpColor={tpColor}
              setTpColor={setTpColor}
              tpMirror={tpMirror}
              setTpMirror={setTpMirror}
              tpActive={tpActive}
              setTpActive={setTpActive}
              syncArts={syncArts}
              setSyncArts={setSyncArts}
              autoStartOnRecord={autoStartOnRecord}
              setAutoStartOnRecord={setAutoStartOnRecord}
              tp={tp}
              fullText={gravadoraScript}
              isRecording={isRecording}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Aba Roteiro
   ═══════════════════════════════════════════════════════════════════════ */
interface ScriptTabProps {
  gravadoraScript: string
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  blocks: ScriptBlock[]
  activeBlockIndex: number
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void
  onSelectBlock: (index: number) => void
  onToggleStatus: (index: number) => void
  onSplit: (index: number) => void
  onJoinPrev: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (index: number) => void
  onJoinAll: () => void
  onSplitAll: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  loadingAI: boolean
  suggestions: number[]
  onSuggestAI: () => void
  onAcceptSuggestion: (offset: number) => void
  onAcceptAll: () => void
  onClearSuggestions: () => void
  totalSeconds: number
  /* GAP 2 — Modo "Clique no ponto de divisão" + redistribuição de mídia */
  splitModeIndex: number | null
  splitOffset: number | null
  onEnterSplitMode: (index: number) => void
  onCancelSplitMode: () => void
  onPickSplitPoint: (index: number, offset: number) => void
  /* GAP 3 — Resolução de conflito de mídia ao juntar */
  onJoinPrevCheck: (index: number) => void
}

function ScriptTab(props: ScriptTabProps) {
  const {
    gravadoraScript,
    handleTextChange,
    textareaRef,
    blocks,
    activeBlockIndex,
    expandedId,
    setExpandedId,
    confirmDeleteId,
    setConfirmDeleteId,
    onSelectBlock,
    onToggleStatus,
    onSplit,
    onJoinPrev,
    onMoveUp,
    onMoveDown,
    onDelete,
    onJoinAll,
    onSplitAll,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    loadingAI,
    suggestions,
    onSuggestAI,
    onAcceptSuggestion,
    onAcceptAll,
    onClearSuggestions,
    totalSeconds,
    splitModeIndex,
    splitOffset,
    onEnterSplitMode,
    onCancelSplitMode,
    onPickSplitPoint,
    onJoinPrevCheck,
  } = props

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Editor de texto */}
      <div className="md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-white/5 min-h-0">
        {/* Toolbar do editor */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Desfazer"
            className="h-7 px-2 text-[10px] text-[#9494A8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
            title="Desfazer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Refazer"
            className="h-7 px-2 text-[10px] text-[#9494A8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
            title="Refazer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSplitAll}
            aria-label="Dividir tudo em blocos"
            className="h-7 px-2 text-[10px] text-[#9494A8] hover:text-white gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
            title="Reprocessar todo o texto em blocos"
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" /> Dividir tudo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onJoinAll}
            aria-label="Juntar todos os blocos"
            className="h-7 px-2 text-[10px] text-[#9494A8] hover:text-white gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
            title="Juntar todos os blocos em texto único"
          >
            <Combine className="w-3.5 h-3.5" /> Juntar tudo
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={onSuggestAI}
            disabled={loadingAI}
            aria-label="Sugerir divisão com IA"
            className="h-7 px-2 text-[10px] border-[#7C5CFC]/40 text-[#7C5CFC] hover:bg-[#7C5CFC]/10 gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
          >
            {loadingAI ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Sugerir divisão (IA)
          </Button>
        </div>

        {/* Textarea + sugestões overlay */}
        <div className="relative flex-1 min-h-0">
          <textarea
            ref={textareaRef}
            value={gravadoraScript}
            onChange={handleTextChange}
            aria-label="Editor de roteiro"
            placeholder="Digite ou cole seu roteiro aqui..."
            className="w-full h-full resize-none bg-transparent border-0 p-3 text-xs text-white leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] scrollbar-thin"
            spellCheck={false}
          />
          {/* Indicador de sugestões */}
          {suggestions.length > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[#14141C]/90 backdrop-blur-md border border-[#7C5CFC]/30 rounded-lg px-2 py-1">
              <span className="text-[9px] text-[#7C5CFC] font-bold">
                {suggestions.length} sugestão(ões)
              </span>
              <button
                onClick={onAcceptAll}
                aria-label="Aceitar todas as sugestões"
                className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] rounded"
              >
                Aceitar todas
              </button>
              <button
                onClick={onClearSuggestions}
                aria-label="Limpar sugestões"
                className="text-[9px] text-[#9494A8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {/* Lista de sugestões para aceitar individualmente */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
              {suggestions.map((off, i) => (
                <button
                  key={off}
                  onClick={() => onAcceptSuggestion(off)}
                  aria-label={`Aceitar divisão sugerida ${i + 1}`}
                  className="flex items-center gap-1 text-[9px] bg-[#7C5CFC]/20 border border-dashed border-[#7C5CFC]/60 text-[#7C5CFC] rounded px-1.5 py-0.5 hover:bg-[#7C5CFC]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                  title="Ponto de divisão sugerido"
                >
                  <ArrowDownToLine className="w-3 h-3" /> Divisão {i + 1}
                  <Check className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contador */}
        <div className="px-3 py-1.5 border-t border-white/5 shrink-0">
          <span className="text-[10px] text-[#9494A8]">
            {blocks.length} blocos • ~{formatDuration(totalSeconds)} de gravação
          </span>
        </div>
      </div>

      {/* Lista de blocos */}
      <div className="md:w-1/2 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#7C5CFC]" />
            Blocos
          </span>
          {blocks.length > 0 && (
            <span className="text-[10px] text-[#9494A8]">
              Bloco {activeBlockIndex + 1} de {blocks.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ScrollText className="w-8 h-8 text-[#9494A8]/40 mb-2" />
              <p className="text-xs text-[#9494A8]">
                {gravadoraScript.trim()
                  ? 'Texto único, sem divisão. Use "Dividir tudo" ou a IA.'
                  : 'Nenhum roteiro criado. Comece a escrever ou cole seu texto acima.'}
              </p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                isActive={index === activeBlockIndex}
                expanded={expandedId === block.id}
                confirmDelete={confirmDeleteId === block.id}
                onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
                onSelect={() => onSelectBlock(index)}
                onToggleStatus={() => onToggleStatus(index)}
                onSplit={() => onSplit(index)}
                onSplitMode={() => onEnterSplitMode(index)}
                onJoinPrev={() => onJoinPrevCheck(index)}
                onMoveUp={() => onMoveUp(index)}
                onMoveDown={() => onMoveDown(index)}
                onDelete={() => {
                  if (block.text.trim() && confirmDeleteId !== block.id) {
                    setConfirmDeleteId(block.id)
                  } else {
                    onDelete(index)
                    setConfirmDeleteId(null)
                  }
                }}
                onCancelDelete={() => setConfirmDeleteId(null)}
                isSplitMode={splitModeIndex === index}
                splitOffset={splitOffset}
                onPickSplitPoint={(offset) => onPickSplitPoint(index, offset)}
                onCancelSplitMode={onCancelSplitMode}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Card de bloco
   ═══════════════════════════════════════════════════════════════════════ */
interface BlockCardProps {
  block: ScriptBlock
  index: number
  total: number
  isActive: boolean
  expanded: boolean
  confirmDelete: boolean
  onToggleExpand: () => void
  onSelect: () => void
  onToggleStatus: () => void
  onSplit: () => void
  onJoinPrev: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onCancelDelete: () => void
  /** Artes/B-roll são mostrados apenas quando o bloco está expandido. */
  expandedExtras?: boolean
  /* GAP 2 — Modo "Clique no ponto de divisão" */
  isSplitMode?: boolean
  splitOffset?: number | null
  onPickSplitPoint?: (offset: number) => void
  onSplitMode?: () => void
  onCancelSplitMode?: () => void
}

function BlockCard({
  block,
  index,
  total,
  isActive,
  expanded,
  confirmDelete,
  onToggleExpand,
  onSelect,
  onToggleStatus,
  onSplit,
  onJoinPrev,
  onMoveUp,
  onMoveDown,
  onDelete,
  onCancelDelete,
  expandedExtras = true,
  isSplitMode = false,
  splitOffset = null,
  onPickSplitPoint,
  onSplitMode,
  onCancelSplitMode,
}: BlockCardProps) {
  const summary = block.text.length > 80 ? block.text.slice(0, 80) + '…' : block.text
  return (
    <div
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group rounded-xl border p-2.5 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
        isActive
          ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 shadow-lg shadow-[#7C5CFC]/10'
          : 'border-white/10 bg-[#14141C] hover:border-white/20'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="text-[10px] font-mono font-bold text-[#7C5CFC]">{index + 1}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStatus()
            }}
            aria-label={`Alternar status do bloco ${index + 1}`}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
              block.status === 'ready'
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            }`}
            title="Alternar status"
          >
            {block.status === 'ready' ? 'Pronto' : 'Pendente'}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {block.title && (
            <p className="text-[10px] font-bold text-[#22D3EE] mb-0.5 truncate">{block.title}</p>
          )}
          {expanded && isSplitMode ? (
            <SplitModeText
              text={block.text}
              splitOffset={splitOffset}
              onPick={(offset) => {
                onPickSplitPoint?.(offset)
              }}
            />
          ) : (
            <p
              className={`text-[11px] text-white leading-snug ${
                expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand()
              }}
            >
              {expanded ? block.text : summary || '(bloco vazio)'}
            </p>
          )}
          {/* GAP 2 — Indicador do modo de divisão */}
          {expanded && isSplitMode && (
            <div className="mt-1.5 flex items-center justify-between gap-2 bg-[#22D3EE]/10 border border-[#22D3EE]/30 rounded px-2 py-1">
              <span className="text-[9px] text-[#22D3EE] font-bold flex items-center gap-1">
                <SplitSquareHorizontal className="w-3 h-3" />
                Clique no texto para escolher o ponto de divisão
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCancelSplitMode?.()
                }}
                className="text-[9px] text-[#9494A8] hover:text-white px-1.5 py-0.5 rounded"
              >
                Cancelar
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-[#9494A8] flex items-center gap-0.5">
              ~{formatDuration(block.estimatedSeconds)}
            </span>
            <span className="text-[9px] text-[#9494A8]">
              {block.text.trim().split(/\s+/).filter(Boolean).length} palavras
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            disabled={index === 0}
            className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover para cima"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            disabled={index === total - 1}
            className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover para baixo"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Ações inferiores */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (isSplitMode) {
              onCancelSplitMode?.()
            } else {
              onSplitMode?.()
            }
          }}
          className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${
            isSplitMode
              ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/50'
              : 'text-[#22D3EE] hover:bg-[#22D3EE]/10'
          }`}
          title={isSplitMode ? 'Cancelar divisão' : 'Clique no ponto de divisão'}
        >
          <SplitSquareHorizontal className="w-3 h-3" /> {isSplitMode ? 'Cancelar' : 'Dividir'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onJoinPrev()
          }}
          disabled={index === 0}
          className="flex items-center gap-1 text-[9px] text-[#9494A8] hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded disabled:opacity-30"
          title="Juntar com anterior"
        >
          <Combine className="w-3 h-3" /> Juntar
        </button>
        <div className="flex-1" />
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-red-400">Excluir?</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-[9px] text-red-400 hover:bg-red-500/20 px-1.5 py-0.5 rounded font-bold"
            >
              Sim
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancelDelete()
              }}
              className="text-[9px] text-[#9494A8] hover:text-white px-1.5 py-0.5 rounded"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded text-[#9494A8] hover:text-red-400 hover:bg-red-500/10"
            title="Excluir bloco"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* FASE 3 — Artes e B-roll por bloco (apenas quando expandido) */}
      {expanded && expandedExtras && (
        <>
          <BlockArts blockId={block.id} />
          <BlockBRoll blockId={block.id} blockText={block.text} />
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Aba Teleprompter
   ═══════════════════════════════════════════════════════════════════════ */
interface TeleprompterTabProps {
  blocks: ScriptBlock[]
  activeBlockIndex: number
  setActiveBlockIndex: (i: number) => void
  currentBlock?: ScriptBlock
  nextBlock?: ScriptBlock
  tpMode: TeleprompterMode
  setTpMode: (m: TeleprompterMode) => void
  tpFontSize: number
  setTpFontSize: (n: number) => void
  tpSpeed: number
  setTpSpeed: (n: number) => void
  tpColor: TeleprompterTextColor
  setTpColor: (c: TeleprompterTextColor) => void
  tpMirror: boolean
  setTpMirror: (v: boolean) => void
  tpActive: boolean
  setTpActive: (v: boolean) => void
  syncArts: boolean
  setSyncArts: (v: boolean) => void
  autoStartOnRecord: boolean
  setAutoStartOnRecord: (v: boolean) => void
  tp: ReturnType<typeof useTeleprompter>
  fullText: string
  isRecording: boolean
}

function TeleprompterTab({
  blocks,
  activeBlockIndex,
  setActiveBlockIndex,
  currentBlock,
  nextBlock,
  tpMode,
  setTpMode,
  tpFontSize,
  setTpFontSize,
  tpSpeed,
  setTpSpeed,
  tpColor,
  setTpColor,
  tpMirror,
  setTpMirror,
  tpActive,
  setTpActive,
  syncArts,
  setSyncArts,
  autoStartOnRecord,
  setAutoStartOnRecord,
  tp,
  fullText,
  isRecording,
}: TeleprompterTabProps) {
  const textColor = TEXT_COLORS[tpColor]

  return (
    <div className="flex h-full">
      {/* Display principal */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
        {/* Top bar: modo + indicador */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-1 bg-[#1C1C27] rounded-lg p-0.5">
            <button
              onClick={() => setTpMode('blocks')}
              aria-pressed={tpMode === 'blocks'}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                tpMode === 'blocks' ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8] hover:text-white'
              }`}
            >
              Modo Blocos
            </button>
            <button
              onClick={() => setTpMode('continuous')}
              aria-pressed={tpMode === 'continuous'}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                tpMode === 'continuous'
                  ? 'bg-[#7C5CFC] text-white'
                  : 'text-[#9494A8] hover:text-white'
              }`}
            >
              Nota Fixa
            </button>
          </div>

          <div className="flex items-center gap-2">
            {tpMode === 'blocks' && blocks.length > 0 && (
              <span className="text-[10px] font-mono text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-0.5 rounded">
                Bloco {activeBlockIndex + 1}/{blocks.length}
              </span>
            )}
            {tpActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTpActive(false)
                  tp.pause()
                }}
                className="h-7 px-2 text-[10px] text-[#9494A8] hover:text-white"
              >
                <X className="w-3.5 h-3.5" /> Fechar (Esc)
              </Button>
            )}
          </div>
        </div>

        {/* Área de exibição */}
        <div className="flex-1 min-h-0 relative bg-[#0B0B10]">
          {tpMode === 'blocks' ? (
            blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <ScrollText className="w-8 h-8 text-[#9494A8]/40 mb-2" />
                <p className="text-xs text-[#9494A8]">
                  Nenhum bloco para exibir. Escreva um roteiro na aba Roteiro.
                </p>
              </div>
            ) : (
              <div
                className={`h-full overflow-y-auto p-6 flex flex-col justify-center ${
                  tpMirror ? 'scale-x-[-1]' : ''
                }`}
              >
                {/* Bloco atual */}
                <div className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 rounded-2xl p-5 mb-3">
                  {currentBlock?.title && (
                    <p className="text-[11px] font-bold text-[#22D3EE] mb-2 uppercase tracking-wider">
                      {currentBlock.title}
                    </p>
                  )}
                  <p
                    className="font-bold leading-relaxed text-center whitespace-pre-wrap"
                    style={{ fontSize: `${tpFontSize}px`, color: textColor }}
                  >
                    {currentBlock?.text || '(bloco vazio)'}
                  </p>
                </div>
                {/* Próximo bloco (prévia) */}
                {nextBlock && (
                  <div className="opacity-40 px-5">
                    <p
                      className="font-medium leading-relaxed text-center whitespace-pre-wrap"
                      style={{ fontSize: `${Math.max(14, tpFontSize - 8)}px`, color: textColor }}
                    >
                      {nextBlock.text}
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            // Modo Nota Fixa — scroll contínuo
            <div
              ref={tp.scrollRef}
              className={`h-full overflow-y-auto px-8 py-10 ${tpMirror ? 'scale-x-[-1]' : ''}`}
            >
              <p
                className="font-bold leading-relaxed tracking-wide text-center whitespace-pre-wrap"
                style={{ fontSize: `${tpFontSize}px`, color: textColor }}
              >
                {fullText || 'Digite seu roteiro na aba Roteiro para iniciar o teleprompter...'}
              </p>
            </div>
          )}

          {/* Countdown overlay */}
          {tp.countdown !== null && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-40">
              <span className="text-8xl font-extrabold text-[#22D3EE] animate-ping">
                {tp.countdown}
              </span>
            </div>
          )}

          {/* Linha de olhar */}
          {tpMode === 'continuous' && (
            <div className="absolute top-1/3 left-0 right-0 h-12 pointer-events-none border-y border-[#7C5CFC]/30 bg-[#7C5CFC]/5 z-20 flex items-center justify-end px-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#7C5CFC] bg-black/60 px-1.5 py-0.5 rounded">
                Linha de Olhar
              </span>
            </div>
          )}
        </div>

        {/* Barra de controles de play/pause */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 shrink-0 bg-black/40">
          <div className="flex items-center gap-1.5">
            {tpMode === 'continuous' ? (
              tp.isScrolling ? (
                <Button
                  size="sm"
                  onClick={tp.pause}
                  className="h-8 bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-bold gap-1"
                >
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={tp.start}
                  className="h-8 bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-[11px] font-bold gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Iniciar (3s)
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={() => setTpActive(!tpActive)}
                className={`h-8 text-[11px] font-bold gap-1 ${
                  tpActive
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                    : 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white'
                }`}
              >
                {tpActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> Ativo
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Ativar
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={tp.reset}
              className="h-8 px-2 text-[10px] text-[#9494A8] hover:text-white"
              title="Voltar ao início"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {isRecording && tpActive && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Teleprompter ativo durante gravação
            </span>
          )}
        </div>
      </div>

      {/* Mini-mapa + controles laterais */}
      <div className="w-48 flex flex-col bg-[#14141C] shrink-0">
        {/* Mini-mapa */}
        <div className="p-2 border-b border-white/5">
          <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Layers className="w-3 h-3 text-[#7C5CFC]" /> Mini-mapa
          </span>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-thin">
            {blocks.length === 0 ? (
              <p className="text-[9px] text-[#9494A8]/60 text-center py-2">Sem blocos</p>
            ) : (
              blocks.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBlockIndex(i)}
                  aria-label={`Selecionar bloco ${i + 1}`}
                  aria-pressed={i === activeBlockIndex}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                    i === activeBlockIndex
                      ? 'bg-[#7C5CFC]/20 border border-[#7C5CFC]/40'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                  title={`Bloco ${i + 1}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      b.status === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[9px] text-[#9494A8] truncate flex-1">
                    {i + 1}. {b.text.slice(0, 18) || 'vazio'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 scrollbar-thin">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Fonte</span>
              <span className="font-mono">{tpFontSize}px</span>
            </div>
            <Slider
              value={[tpFontSize]}
              min={18}
              max={48}
              step={1}
              onValueChange={(v) => setTpFontSize(v[0])}
            />
          </div>

          {tpMode === 'continuous' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-[#9494A8]">
                <span>Velocidade</span>
                <span className="font-mono">{tpSpeed}x</span>
              </div>
              <Slider
                value={[tpSpeed]}
                min={1}
                max={10}
                step={1}
                onValueChange={(v) => setTpSpeed(v[0])}
              />
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[9px] text-[#9494A8] block">Cor do texto</span>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'white', label: 'Branco', color: '#FFFFFF' },
                  { id: 'green', label: 'Verde', color: '#22C55E' },
                  { id: 'yellow', label: 'Amarelo', color: '#FBBF24' },
                ] as { id: TeleprompterTextColor; label: string; color: string }[]
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setTpColor(c.id)}
                  className={`py-1 rounded text-[9px] font-medium border transition-colors ${
                    tpColor === c.id
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-white'
                      : 'border-white/10 text-[#9494A8] hover:text-white'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-[#9494A8] flex items-center gap-1">
              <FlipHorizontal className="w-3 h-3" /> Espelho
            </span>
            <Switch checked={tpMirror} onCheckedChange={setTpMirror} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#9494A8] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#7C5CFC]" /> Sincronizar artes
            </span>
            <Switch checked={syncArts} onCheckedChange={setSyncArts} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#9494A8] flex items-center gap-1">
              <Play className="w-3 h-3 text-[#22D3EE]" /> Iniciar com gravação
            </span>
            <Switch checked={autoStartOnRecord} onCheckedChange={setAutoStartOnRecord} />
          </div>

          {tpMode === 'blocks' && (
            <div className="pt-1 border-t border-white/5">
              <p className="text-[8px] text-[#9494A8]/70 leading-relaxed">
                ↓ / Espaço: avançar · ↑: voltar · Esc: fechar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   GAP 2 — Texto clicável por caractere para escolher ponto de divisão.
   Renderiza cada caractere como span clicável; insere um cursor (pipe
   piscante) na posição escolhida.
   ═══════════════════════════════════════════════════════════════════════ */
function SplitModeText({
  text,
  splitOffset,
  onPick,
}: {
  text: string
  splitOffset: number | null
  onPick: (offset: number) => void
}) {
  // Se nenhum ponto foi escolhido, renderiza o texto cru com instrução.
  if (splitOffset === null) {
    return (
      <p
        className="text-[11px] text-white leading-snug whitespace-pre-wrap cursor-text select-none"
        onClick={(e) => {
          // Calcula offset por caracteres percorrendo os nós de texto.
          const offset = caretOffsetFromEvent(e)
          if (offset >= 0) onPick(offset)
        }}
      >
        {text || '(bloco vazio)'}
      </p>
    )
  }
  // Com ponto escolhido: divide em antes/depois e mostra o cursor.
  const before = text.slice(0, splitOffset)
  const after = text.slice(splitOffset)
  return (
    <p
      className="text-[11px] text-white leading-snug whitespace-pre-wrap cursor-text select-none"
      onClick={(e) => {
        const offset = caretOffsetFromEvent(e)
        if (offset >= 0) onPick(offset)
      }}
    >
      <span className="text-[#9494A8]">{before}</span>
      <span
        aria-label="Ponto de divisão selecionado"
        className="inline-block w-[2px] h-[14px] bg-[#22D3EE] mx-px align-middle animate-pulse"
      />
      <span>{after}</span>
    </p>
  )
}

/** Calcula o offset de caractere a partir de um evento de clique no texto. */
function caretOffsetFromEvent(e: React.MouseEvent<HTMLElement>): number {
  const target = e.currentTarget
  if (!target) return -1
  // Usa o Range API para descobrir a posição do clique relativa ao texto.
  let offset = -1
  const doc = target.ownerDocument
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(e.clientX, e.clientY)
    if (range && target.contains(range.startContainer)) {
      offset = range.startOffset
      // Ajusta: se o container não for o próprio target, soma offsets dos nós anteriores.
      if (range.startContainer !== target) {
        offset = cumulativeOffset(target, range.startContainer) + range.startOffset
      }
    }
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(e.clientX, e.clientY)
    if (pos && target.contains(pos.offsetNode)) {
      if (pos.offsetNode === target) {
        offset = pos.offset
      } else {
        offset = cumulativeOffset(target, pos.offsetNode) + pos.offset
      }
    }
  }
  return offset
}

/** Soma o comprimento de texto de todos os nós de texto anteriores ao nó dado. */
function cumulativeOffset(root: Node, node: Node): number {
  let offset = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let current: Node | null = walker.nextNode()
  while (current) {
    if (current === node) break
    offset += (current.textContent ?? '').length
    current = walker.nextNode()
  }
  return offset
}

/* ═══════════════════════════════════════════════════════════════════════
   GAP 2 — Dialog de redistribuição de mídia ao dividir bloco
   ═══════════════════════════════════════════════════════════════════════ */
interface SplitMediaDialogProps {
  open: boolean
  onClose: () => void
  onChoose: (choice: 'first' | 'second' | 'both') => void
  arts: BlockArt[]
  broll: BlockBRollType | null
}

function SplitMediaDialog({ open, onClose, onChoose, arts, broll }: SplitMediaDialogProps) {
  const hasArts = arts.length > 0
  const hasBRoll = !!broll
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#14141C] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Redistribuir mídia ao dividir</DialogTitle>
          <DialogDescription className="text-[#9494A8]">
            Este bloco possui{' '}
            {hasArts && hasBRoll
              ? `${arts.length} arte(s) e B-roll`
              : hasArts
                ? `${arts.length} arte(s)`
                : 'B-roll'}{' '}
            vinculado(s). Como deseja redistribuir após a divisão?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <SplitMediaOption
            label="Manter no primeiro bloco"
            description="A mídia fica vinculada apenas ao bloco original."
            onClick={() => onChoose('first')}
          />
          <SplitMediaOption
            label="Mover para o segundo bloco"
            description="A mídia é transferida para o novo bloco criado."
            onClick={() => onChoose('second')}
          />
          <SplitMediaOption
            label="Duplicar para ambos"
            description="Ambos os blocos resultantes recebem a mídia."
            onClick={() => onChoose('both')}
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#9494A8] hover:text-white"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SplitMediaOption({
  label,
  description,
  onClick,
}: {
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-white/10 bg-[#0B0B10] hover:border-[#7C5CFC]/50 hover:bg-[#7C5CFC]/5 px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
    >
      <p className="text-xs font-bold text-white">{label}</p>
      <p className="text-[10px] text-[#9494A8] mt-0.5">{description}</p>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   GAP 3 — Dialog de resolução de conflito de mídia ao juntar blocos
   ═══════════════════════════════════════════════════════════════════════ */
interface JoinConflictDialogProps {
  open: boolean
  onClose: () => void
  onChoose: (choice: 'prev' | 'cur' | 'both' | 'cancel') => void
  prevArts: BlockArt[]
  prevBRoll: BlockBRollType | null
  curArts: BlockArt[]
  curBRoll: BlockBRollType | null
}

function JoinConflictDialog({
  open,
  onClose,
  onChoose,
  prevArts,
  prevBRoll,
  curArts,
  curBRoll,
}: JoinConflictDialogProps) {
  const prevCount = prevArts.length + (prevBRoll ? 1 : 0)
  const curCount = curArts.length + (curBRoll ? 1 : 0)
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#14141C] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Conflito de mídia ao juntar</DialogTitle>
          <DialogDescription className="text-[#9494A8]">
            Ambos os blocos possuem mídia diferente vinculada (anterior: {prevCount} item(ns),
            atual: {curCount} item(ns)). Qual mídia o bloco mesclado deve manter?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <SplitMediaOption
            label="Manter mídia do bloco anterior"
            description="O bloco resultante mantém apenas a mídia do bloco de cima."
            onClick={() => onChoose('prev')}
          />
          <SplitMediaOption
            label="Manter mídia do bloco atual"
            description="O bloco resultante mantém apenas a mídia do bloco de baixo."
            onClick={() => onChoose('cur')}
          />
          <SplitMediaOption
            label="Manter ambas"
            description="Combina as artes (sem duplicatas) e mantém o B-roll disponível."
            onClick={() => onChoose('both')}
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChoose('cancel')}
            className="text-[#9494A8] hover:text-white"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
