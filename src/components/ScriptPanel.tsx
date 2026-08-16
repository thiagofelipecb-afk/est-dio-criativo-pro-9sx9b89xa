import React, { useState } from 'react'
import {
  FileText,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  ListPlus,
  Pencil,
  Copy,
  Split,
  Merge,
  GitBranch,
  MoreVertical,
  GripVertical,
  Timer,
  PauseCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useStudio } from '@/context/StudioContext'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { ScriptBlock, ScriptBlockStatus } from '@/types/studio'
import {
  estimateDurationSeconds,
  formatDurationLabel,
  totalDurationSeconds,
} from '@/lib/script-split'
import { makeBlockId } from '@/hooks/use-script-blocks'
import { BlockSplitDialog, type MediaSplitMode } from '@/components/studio/BlockSplitDialog'

/* Status badge meta. */
const STATUS_META: Record<ScriptBlockStatus, { label: string; cls: string }> = {
  draft: { label: 'rascunho', cls: 'bg-white/10 text-white/70' },
  pending: { label: 'rascunho', cls: 'bg-white/10 text-white/70' },
  ready: {
    label: 'pronto',
    cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  },
  recorded: { label: 'gravado', cls: 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30' },
}

export function ScriptPanel() {
  const {
    gravadoraScript,
    setGravadoraScript,
    scriptBlocks,
    setScriptBlocks,
    activeBlockIndex,
    setActiveBlockIndex,
    prompterConfig,
    updatePrompterConfig,
    blockAssignments,
    addBlockAssignment,
    updateBlockAssignment,
    deleteBlockAssignment,
  } = useStudio()

  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingText, setEditingBlockText] = useState('')

  // Bloco selecionado para o modal de divisão.
  const [splitTarget, setSplitTarget] = useState<ScriptBlock | null>(null)
  // Seleção múltipla para juntar adjacentes.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Drag handle (HTML5 DnD).
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const syncScript = (blocks: ScriptBlock[]) => {
    setScriptBlocks(blocks)
    setGravadoraScript(blocks.map((b) => b.text).join('\n\n'))
  }

  /** Conta mídias (assignments) associadas a um bloco. */
  const mediaCountFor = (blockId: string) =>
    blockAssignments.filter((a) => a.blockId === blockId && a.enabled).length

  /* ── Dividir bloco (modal BlockSplitDialog) ─────────────────────────── */
  const handleSplitConfirm = (
    blockId: string,
    before: string,
    after: string,
    mode: MediaSplitMode,
  ) => {
    const idx = scriptBlocks.findIndex((b) => b.id === blockId)
    if (idx < 0) return
    const newBlockId = makeBlockId()
    const now = new Date().toISOString()
    const updated = scriptBlocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            text: before,
            estimatedSeconds: estimateDurationSeconds(before),
            estimatedDurationMs: estimateDurationSeconds(before) * 1000,
            updatedAt: now,
          }
        : b,
    )
    const newBlock: ScriptBlock = {
      id: newBlockId,
      text: after,
      status: 'draft',
      estimatedSeconds: estimateDurationSeconds(after),
      estimatedDurationMs: estimateDurationSeconds(after) * 1000,
      order: idx + 2,
      createdAt: now,
      updatedAt: now,
    }
    const next = [...updated.slice(0, idx + 1), newBlock, ...updated.slice(idx + 1)]
    // Reordena campo `order`.
    next.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(next)
    setGravadoraScript(next.map((b) => b.text).join('\n\n'))

    // Redistribui mídias conforme escolha.
    const arts = blockAssignments.filter((a) => a.blockId === blockId && a.enabled)
    if (arts.length > 0) {
      if (mode === 'duplicate') {
        arts.forEach((a, i) => {
          addBlockAssignment({ ...a, blockId: newBlockId, order: i })
        })
        toast.success(`Bloco dividido. ${arts.length} mídias duplicadas para o novo bloco.`)
      } else if (mode === 'move') {
        arts.forEach((a, i) => {
          updateBlockAssignment(a.id, { blockId: newBlockId, order: i })
        })
        toast.success(`Bloco dividido. ${arts.length} mídias movidas para o novo bloco.`)
      } else {
        toast.success('Bloco dividido. Mídias mantidas no bloco original.')
      }
    } else {
      toast.success('Bloco dividido.')
    }
  }

  /* ── Juntar blocos adjacentes (seleção) ────────────────────────────── */
  const canMergeSelected = () => {
    if (selectedIds.length !== 2) return false
    const [a, b] = selectedIds
      .map((id) => scriptBlocks.findIndex((bl) => bl.id === id))
      .sort((x, y) => x - y)
    return a >= 0 && b === a + 1
  }

  const handleMergeSelected = () => {
    if (!canMergeSelected()) return
    const [iA, iB] = selectedIds
      .map((id) => scriptBlocks.findIndex((bl) => bl.id === id))
      .sort((x, y) => x - y)
    const blockA = scriptBlocks[iA]
    const blockB = scriptBlocks[iB]
    const mergedText = blockA.text + '\n\n' + blockB.text
    const merged: ScriptBlock = {
      ...blockA,
      text: mergedText,
      estimatedSeconds: estimateDurationSeconds(mergedText),
      estimatedDurationMs: estimateDurationSeconds(mergedText) * 1000,
      updatedAt: new Date().toISOString(),
    }
    const next = [...scriptBlocks.slice(0, iA), merged, ...scriptBlocks.slice(iB + 1)]
    next.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(next)
    setGravadoraScript(next.map((b) => b.text).join('\n\n'))

    // Preserva ambos os conjuntos de assignments (concatena, mantendo order).
    const artsA = blockAssignments.filter((a) => a.blockId === blockA.id && a.enabled)
    const artsB = blockAssignments.filter((a) => a.blockId === blockB.id && a.enabled)
    artsB.forEach((a, i) => {
      updateBlockAssignment(a.id, { blockId: blockA.id, order: artsA.length + i })
    })
    const total = artsA.length + artsB.length
    toast.success(
      `Blocos unidos. ${total} ${total === 1 ? 'mídia preservada' : 'mídias preservadas'}.`,
    )
    setSelectedIds([])
  }

  /* ── Operações de bloco ────────────────────────────────────────────── */
  const handleDuplicate = (block: ScriptBlock) => {
    const idx = scriptBlocks.findIndex((b) => b.id === block.id)
    if (idx < 0) return
    const now = new Date().toISOString()
    const copy: ScriptBlock = {
      ...block,
      id: makeBlockId(),
      text: block.text,
      status: 'draft',
      estimatedSeconds: block.estimatedSeconds,
      estimatedDurationMs: block.estimatedSeconds * 1000,
      createdAt: now,
      updatedAt: now,
    }
    const next = [...scriptBlocks.slice(0, idx + 1), copy, ...scriptBlocks.slice(idx + 1)]
    next.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(next)
    setGravadoraScript(next.map((b) => b.text).join('\n\n'))
    toast.success('Bloco duplicado.')
  }

  const handleAddBlockAt = (blockId: string, before: boolean) => {
    const idx = scriptBlocks.findIndex((b) => b.id === blockId)
    if (idx < 0) return
    const now = new Date().toISOString()
    const newBlock: ScriptBlock = {
      id: makeBlockId(),
      text: '',
      title: before ? 'Novo bloco (antes)' : 'Novo bloco (depois)',
      status: 'draft',
      estimatedSeconds: 0,
      estimatedDurationMs: 0,
      createdAt: now,
      updatedAt: now,
    }
    const at = before ? idx : idx + 1
    const next = [...scriptBlocks.slice(0, at), newBlock, ...scriptBlocks.slice(at)]
    next.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(next)
    setGravadoraScript(next.map((b) => b.text).join('\n\n'))
  }

  const handleTogglePause = (block: ScriptBlock) => {
    const updated = scriptBlocks.map((b) =>
      b.id === block.id ? { ...b, pause: !b.pause, updatedAt: new Date().toISOString() } : b,
    )
    setScriptBlocks(updated)
    toast.info(block.pause ? 'Pausa removida.' : 'Pausa marcada antes deste bloco.')
  }

  const handleSetDuration = (block: ScriptBlock) => {
    const input = window.prompt('Duração estimada (segundos):', String(block.estimatedSeconds || 0))
    if (input == null) return
    const sec = Math.max(0, Math.round(Number(input) || 0))
    const updated = scriptBlocks.map((b) =>
      b.id === block.id
        ? {
            ...b,
            estimatedSeconds: sec,
            estimatedDurationMs: sec * 1000,
            updatedAt: new Date().toISOString(),
          }
        : b,
    )
    setScriptBlocks(updated)
    toast.success(`Duração definida: ${sec}s`)
  }

  const handleCycleStatus = (block: ScriptBlock) => {
    const order: ScriptBlockStatus[] = ['draft', 'ready', 'recorded']
    const cur = order.includes(block.status) ? block.status : 'draft'
    const nextStatus = order[(order.indexOf(cur) + 1) % order.length]
    const updated = scriptBlocks.map((b) =>
      b.id === block.id ? { ...b, status: nextStatus, updatedAt: new Date().toISOString() } : b,
    )
    setScriptBlocks(updated)
  }

  /* ── Drag handle reordenação (HTML5 DnD) ───────────────────────────── */
  const handleDragStart = (idx: number) => setDragIndex(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === idx) return
    const next = [...scriptBlocks]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(idx, 0, moved)
    next.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(next)
    setGravadoraScript(next.map((b) => b.text).join('\n\n'))
    setDragIndex(idx)
  }
  const handleDragEnd = () => setDragIndex(null)

  /* ── Mover para cima/baixo ─────────────────────────────────────────── */
  const moveBlock = (idx: number, dir: -1 | 1) => {
    const to = idx + dir
    if (to < 0 || to >= scriptBlocks.length) return
    const next = [...scriptBlocks]
    ;[next[idx], next[to]] = [next[to], next[idx]]
    next.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(next)
    setGravadoraScript(next.map((b) => b.text).join('\n\n'))
  }

  // Roteiro simples -> texto bruto
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGravadoraScript(e.target.value)
  }

  // Gera blocos automaticamente a partir de quebras de linha duplas / frases
  const handleAutoSplitBlocks = () => {
    if (!gravadoraScript.trim()) {
      toast.warning('Digite algum texto no Roteiro antes de dividir em blocos.')
      return
    }
    const paragraphs = gravadoraScript
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    const now = new Date().toISOString()
    const newBlocks: ScriptBlock[] = paragraphs.map((p, idx) => ({
      id: makeBlockId(),
      text: p,
      status: 'draft',
      estimatedSeconds: estimateDurationSeconds(p),
      estimatedDurationMs: estimateDurationSeconds(p) * 1000,
      order: idx + 1,
      createdAt: now,
      updatedAt: now,
    }))

    setScriptBlocks(newBlocks)
    toast.success(`${newBlocks.length} blocos gerados a partir do roteiro!`)
  }

  // Adiciona bloco manual
  const handleAddBlock = () => {
    const now = new Date().toISOString()
    const newBlock: ScriptBlock = {
      id: makeBlockId(),
      text: 'Novo trecho da sua fala...',
      status: 'draft',
      estimatedSeconds: 5,
      estimatedDurationMs: 5000,
      order: scriptBlocks.length + 1,
      createdAt: now,
      updatedAt: now,
    }
    const updated = [...scriptBlocks, newBlock]
    syncScript(updated)
  }

  const handleDeleteBlock = (id: string) => {
    const updated = scriptBlocks.filter((b) => b.id !== id)
    updated.forEach((b, i) => (b.order = i + 1))
    setScriptBlocks(updated)
    setGravadoraScript(updated.map((b) => b.text).join('\n\n'))
    setSelectedIds((s) => s.filter((x) => x !== id))
  }

  const handleStartEdit = (b: ScriptBlock) => {
    setEditingBlockId(b.id)
    setEditingBlockText(b.text)
  }

  const handleSaveEdit = (id: string) => {
    const updated = scriptBlocks.map((b) =>
      b.id === id
        ? {
            ...b,
            text: editingText,
            estimatedSeconds: estimateDurationSeconds(editingText),
            estimatedDurationMs: estimateDurationSeconds(editingText) * 1000,
            updatedAt: new Date().toISOString(),
          }
        : b,
    )
    setScriptBlocks(updated)
    setGravadoraScript(updated.map((b) => b.text).join('\n\n'))
    setEditingBlockId(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)))
  }

  const handleGenerateScriptAI = async () => {
    if (!aiPrompt.trim()) {
      toast.warning('Digite o tema ou objetivo do vídeo.')
      return
    }
    setIsAiGenerating(true)
    setTimeout(() => {
      const generated = `Você está cometendo este erro que reduz a retenção dos seus vídeos. A solução é mais simples do que parece.

O problema: a maioria das pessoas tenta improvisar na frente da câmera, sem estrutura. Mas os criadores de topo usam roteiros organizados em três partes — gancho, desenvolvimento e chamada.

A prática: escreva seu roteiro em blocos, ensaie com o teleprompter e grave com pausas curtas entre cada parte. Isso mantém o ritmo e facilita a edição.`

      setGravadoraScript(generated)
      setIsAiGenerating(false)
      toast.success('Roteiro gerado com sucesso via IA!')
    }, 1200)
  }

  const totalSeconds = totalDurationSeconds(scriptBlocks)

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5 scrollbar-thin">
      {/* Seção IA Assistente */}
      <div className="rounded-xl border border-[#7C5CFC]/30 bg-gradient-to-r from-[#7C5CFC]/10 via-[#1C1C27] to-[#14141C] p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#22D3EE] animate-pulse" /> Assistente IA de
            Roteiro
          </span>
          <span className="text-[10px] text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-0.5 rounded-full font-semibold">
            GPT-4o
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ex: Como criar um Reels viral sobre finanças pessoais..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="flex-1 bg-[#0B0B10] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#9494A8]/60 focus:outline-none focus:border-[#7C5CFC]"
          />
          <button
            onClick={handleGenerateScriptAI}
            disabled={isAiGenerating}
            className="px-3 py-1.5 rounded-lg bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold shrink-0 flex items-center gap-1 transition-all disabled:opacity-50"
          >
            {isAiGenerating ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Gerar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Roteiro Principal - Texto Completo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#7C5CFC]" /> Texto do Roteiro (Canônico)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSplitBlocks}
              className="text-[11px] text-[#22D3EE] hover:underline flex items-center gap-1 font-medium"
              title="Dividir parágrafos em blocos individuais de leitura"
            >
              <ListPlus className="w-3.5 h-3.5" /> Transformar em Blocos
            </button>
          </div>
        </div>
        <textarea
          rows={7}
          value={gravadoraScript}
          onChange={handleTextChange}
          placeholder="Digite ou cole aqui seu roteiro. As alterações refletem no Teleprompter e no HUD instantaneamente..."
          className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed resize-none focus:outline-none focus:border-[#7C5CFC] placeholder:text-[#9494A8]/50 font-mono"
        />
        <div className="flex items-center justify-between text-[10px] text-[#9494A8]">
          <span>{gravadoraScript.length} caracteres</span>
          <span>Aproximadamente {Math.ceil(gravadoraScript.length / 15)}s de fala</span>
        </div>
      </div>

      {/* Blocos de Roteiro (Estrutura Foco) */}
      <div className="space-y-2.5 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Blocos Estruturados ({scriptBlocks.length}
            {scriptBlocks.length > 0 && (
              <span className="text-[#9494A8] font-normal normal-case ml-1">
                · {formatDurationLabel(totalSeconds)} total
              </span>
            )}
            )
          </span>
          <div className="flex items-center gap-1.5">
            {canMergeSelected() && (
              <button
                onClick={handleMergeSelected}
                className="text-[11px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all"
                title="Juntar os 2 blocos selecionados"
              >
                <Merge className="w-3.5 h-3.5" /> Juntar blocos
              </button>
            )}
            <button
              onClick={handleAddBlock}
              className="text-xs text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Bloco
            </button>
          </div>
        </div>

        {scriptBlocks.length === 0 ? (
          <div className="p-4 border border-dashed border-white/10 rounded-xl text-center bg-[#14141C]">
            <p className="text-xs text-[#9494A8]">Nenhum bloco separado ainda.</p>
            <p className="text-[11px] text-[#9494A8]/60 mt-1">
              Escreva seu roteiro no card central do palco ou clique em "Transformar em Blocos"
              acima.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {scriptBlocks.map((block, idx) => {
              const isActive = idx === activeBlockIndex
              const isEditing = editingBlockId === block.id
              const isSelected = selectedIds.includes(block.id)
              const status = STATUS_META[block.status] ?? STATUS_META.draft
              const preview =
                block.text.length > 100 ? block.text.slice(0, 100) + '…' : block.text || '— vazio —'
              const mediaCount = mediaCountFor(block.id)

              return (
                <div
                  key={block.id}
                  onClick={() => setActiveBlockIndex(idx)}
                  draggable={false}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                      : isActive
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                        : 'border-white/5 bg-[#1C1C27] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Drag handle */}
                      <span
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing text-[#9494A8]/50 hover:text-white touch-none"
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                      <span
                        className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-white/10 text-white/80"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(block.id)
                        }}
                        title="Selecionar (para juntar)"
                      >
                        {idx + 1}
                      </span>
                      {block.title && (
                        <span className="text-[10px] font-semibold text-white/70 truncate">
                          {block.title}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[9px] bg-[#7C5CFC] text-white font-bold px-1.5 py-0.2 rounded">
                          Lendo Agora
                        </span>
                      )}
                      {block.pause && <PauseCircle className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Status badge (clica para ciclar) */}
                      <button
                        onClick={() => handleCycleStatus(block)}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${status.cls}`}
                        title="Clicar para mudar status"
                      >
                        {status.label}
                      </button>
                      {/* Editar / salvar */}
                      {!isEditing ? (
                        <IconBtn title="Editar" onClick={() => handleStartEdit(block)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                      ) : (
                        <IconBtn
                          title="Salvar"
                          onClick={() => handleSaveEdit(block.id)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </IconBtn>
                      )}
                      {/* Dividir (tesoura) */}
                      <IconBtn
                        title="Dividir bloco"
                        onClick={() => setSplitTarget(block)}
                        className="text-[#9494A8] hover:text-[#22D3EE]"
                      >
                        <Split className="w-3.5 h-3.5" />
                      </IconBtn>
                      {/* Duplicar (cópia) */}
                      <IconBtn
                        title="Duplicar"
                        onClick={() => handleDuplicate(block)}
                        className="text-[#9494A8] hover:text-white"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </IconBtn>
                      {/* Excluir */}
                      <IconBtn
                        title="Excluir"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="text-[#9494A8] hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconBtn>
                      {/* Menu de contexto */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 text-[#9494A8] hover:text-white"
                            title="Mais opções"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1C1C27] border-white/10 text-white"
                        >
                          <DropdownMenuItem
                            onSelect={() => handleAddBlockAt(block.id, true)}
                            className="text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Adicionar bloco antes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleAddBlockAt(block.id, false)}
                            className="text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Adicionar bloco depois
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onSelect={() => handleTogglePause(block)}
                            className="text-xs"
                          >
                            <PauseCircle className="w-3.5 h-3.5 mr-2" />
                            {block.pause ? 'Remover pausa' : 'Marcar pausa'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleSetDuration(block)}
                            className="text-xs"
                          >
                            <Timer className="w-3.5 h-3.5 mr-2" /> Definir duração estimada
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onSelect={() => moveBlock(idx, -1)}
                            disabled={idx === 0}
                            className="text-xs data-[disabled]:opacity-40"
                          >
                            <ArrowUp className="w-3.5 h-3.5 mr-2" /> Mover para cima
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => moveBlock(idx, 1)}
                            disabled={idx === scriptBlocks.length - 1}
                            className="text-xs data-[disabled]:opacity-40"
                          >
                            <ArrowDown className="w-3.5 h-3.5 mr-2" /> Mover para baixo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={editingText}
                      onChange={(e) => setEditingBlockText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-[#0B0B10] border border-white/20 rounded p-2 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
                    />
                  ) : (
                    <p className="text-xs text-white/80 leading-normal line-clamp-2">{preview}</p>
                  )}

                  {/* Meta: duração + mídias */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-[#9494A8] font-mono">
                      ⏱ {formatDurationLabel(block.estimatedSeconds)}
                    </span>
                    {mediaCount > 0 && (
                      <span className="text-[9px] text-[#22D3EE] font-mono">
                        🎞 {mediaCount} {mediaCount === 1 ? 'mídia' : 'mídias'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Prompter Config (preservado) */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-[#22D3EE]" /> Configuração do Prompter
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#9494A8]">Modo</span>
          <Switch
            checked={prompterConfig.mode === 'continuous'}
            onCheckedChange={(v) => updatePrompterConfig({ mode: v ? 'continuous' : 'blocks' })}
          />
        </div>
      </div>

      {/* Modal: Dividir bloco */}
      <BlockSplitDialog
        open={!!splitTarget}
        onOpenChange={(o) => !o && setSplitTarget(null)}
        block={splitTarget}
        mediaCount={splitTarget ? mediaCountFor(splitTarget.id) : 0}
        onConfirm={handleSplitConfirm}
      />
    </div>
  )
}

/* ── Botão de ícone reutilizável ──────────────────────────────────────── */
function IconBtn({
  children,
  onClick,
  title,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 text-[#9494A8] hover:text-white transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export default ScriptPanel
