import React, { useRef, useState } from 'react'
import {
  FileText,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  ListPlus,
  Pencil,
  Copy,
} from 'lucide-react'
import { useStudio } from '@/context/StudioContext'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { ScriptBlock, TeleprompterTextColor, TeleprompterMode } from '@/types/studio'

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
  } = useStudio()

  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingText, setEditingBlockText] = useState('')

  // Roteiro simples -> texto bruto
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setGravadoraScript(val)
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

    const newBlocks: ScriptBlock[] = paragraphs.map((p, idx) => ({
      id: 'blk-' + Date.now() + '-' + idx,
      text: p,
      status: 'pending',
      estimatedSeconds: Math.max(3, Math.ceil(p.length / 15)),
    }))

    setScriptBlocks(newBlocks)
    toast.success(`${newBlocks.length} blocos gerados a partir do roteiro!`)
  }

  // Adiciona bloco manual
  const handleAddBlock = () => {
    const newBlock: ScriptBlock = {
      id: 'blk-' + Date.now(),
      text: 'Novo trecho da sua fala...',
      status: 'pending',
      estimatedSeconds: 5,
    }
    const updated = [...scriptBlocks, newBlock]
    setScriptBlocks(updated)
    // Atualiza também gravadoraScript com o texto unificado
    setGravadoraScript(updated.map((b) => b.text).join('\n\n'))
  }

  const handleDeleteBlock = (id: string) => {
    const updated = scriptBlocks.filter((b) => b.id !== id)
    setScriptBlocks(updated)
    setGravadoraScript(updated.map((b) => b.text).join('\n\n'))
  }

  const handleStartEdit = (b: ScriptBlock) => {
    setEditingBlockId(b.id)
    setEditingBlockText(b.text)
  }

  const handleSaveEdit = (id: string) => {
    const updated = scriptBlocks.map((b) => (b.id === id ? { ...b, text: editingText } : b))
    setScriptBlocks(updated)
    setGravadoraScript(updated.map((b) => b.text).join('\n\n'))
    setEditingBlockId(null)
  }

  const handleGenerateScriptAI = async () => {
    if (!aiPrompt.trim()) {
      toast.warning('Digite o tema ou objetivo do vídeo.')
      return
    }
    setIsAiGenerating(true)
    setTimeout(() => {
      const generated = `🔥 HOOK PODEROSO: Se você quer multiplicar seus resultados em vídeo, pare de cometer este erro agora mesmo!

💡 O SEGREDO: A maioria das pessoas tenta improvisar na frente da câmera. Mas os criadores de topo usam roteiros estruturados em 3 partes.

🚀 AÇÃO IMEDIATA: Teste o LUMEN Studio hoje mesmo e grave com o teleprompter inteligente em menos de 2 minutos. Clique no link e comece!`

      setGravadoraScript(generated)
      setIsAiGenerating(false)
      toast.success('Roteiro gerado com sucesso via IA!')
    }, 1200)
  }

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
            Blocos Estruturados ({scriptBlocks.length})
          </span>
          <button
            onClick={handleAddBlock}
            className="text-xs text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Bloco
          </button>
        </div>

        {scriptBlocks.length === 0 ? (
          <div className="p-4 border border-dashed border-white/10 rounded-xl text-center bg-[#14141C]">
            <p className="text-xs text-[#9494A8]">Nenhum bloco separado ainda.</p>
            <p className="text-[11px] text-[#9494A8]/60 mt-1">
              Clique em "Transformar em Blocos" acima para usar a leitura por partes.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {scriptBlocks.map((block, idx) => {
              const isActive = idx === activeBlockIndex
              const isEditing = editingBlockId === block.id

              return (
                <div
                  key={block.id}
                  onClick={() => setActiveBlockIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                      : 'border-white/5 bg-[#1C1C27] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-white/10 text-white/80">
                        Bloco {idx + 1}
                      </span>
                      {isActive && (
                        <span className="text-[9px] bg-[#7C5CFC] text-white font-bold px-1.5 py-0.2 rounded">
                          Lendo Agora
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!isEditing ? (
                        <button
                          onClick={() => handleStartEdit(block)}
                          className="p-1 text-[#9494A8] hover:text-white"
                          title="Editar Bloco"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveEdit(block.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Salvar Bloco"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-1 text-[#9494A8] hover:text-red-400"
                        title="Excluir Bloco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingBlockText(e.target.value)}
                      className="w-full bg-[#0B0B10] border border-white/20 rounded p-2 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-white/90 leading-normal line-clamp-3">
                      {block.text}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
