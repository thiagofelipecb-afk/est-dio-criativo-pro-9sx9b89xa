/* =============================================================================
   LUMEN Studio — EmptyScriptCard
   --------------------------------------------------------------------------
   Card central exibido no palco da Gravadora quando `scriptBlocks` está vazio.
   É o ponto de entrada do fluxo de roteiro: textarea grande, importar texto,
   dividir em blocos (abre preview), usar texto inteiro, salvar rascunho.
   Atalhos: Ctrl+Enter = dividir, Ctrl+S = salvar rascunho.
   Componente controlado — o texto vive no StudioContext (gravadoraScript),
   evitando duplicação de estado.
   ========================================================================== */
import React, { useCallback, useEffect, useRef } from 'react'
import { FileText, Upload, Scissors, FileCheck, Save, Clock, Type } from 'lucide-react'
import { toast } from 'sonner'
import { countWords, estimateDurationSeconds, formatDurationLabel } from '@/lib/script-split'

export interface EmptyScriptCardProps {
  /** Texto do roteiro (controlado — vem do StudioContext). */
  value: string
  /** Atualiza o texto (sincroniza com gravadoraScript). */
  onTextChange: (text: string) => void
  /** Chamado quando o usuário pede para dividir em blocos (abre preview). */
  onDivide: (text: string) => void
  /** Chamado quando o usuário pede "Usar texto inteiro". */
  onUseWhole: (text: string) => void
  /** Chamado quando o usuário pede "Salvar como rascunho". */
  onSaveDraft: (text: string) => void
}

export function EmptyScriptCard({
  value,
  onTextChange,
  onDivide,
  onUseWhole,
  onSaveDraft,
}: EmptyScriptCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const words = countWords(value)
  const seconds = estimateDurationSeconds(value)
  const hasText = value.trim().length > 0

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        const content = String(reader.result || '')
        onTextChange(content)
        toast.success(`Importado: ${f.name}`)
      }
      reader.onerror = () => toast.error('Não foi possível ler o arquivo.')
      reader.readAsText(f)
      e.target.value = ''
    },
    [onTextChange],
  )

  const handleDivide = useCallback(() => {
    if (!hasText) {
      toast.warning('Escreva ou cole seu roteiro antes de dividir.')
      return
    }
    onDivide(value)
  }, [hasText, value, onDivide])

  const handleUseWhole = useCallback(() => {
    if (!hasText) {
      toast.warning('Escreva ou cole seu roteiro primeiro.')
      return
    }
    onUseWhole(value)
  }, [hasText, value, onUseWhole])

  const handleSaveDraft = useCallback(() => {
    if (!hasText) {
      toast.warning('Não há texto para salvar.')
      return
    }
    onSaveDraft(value)
  }, [hasText, value, onSaveDraft])

  // Atalhos: Ctrl+Enter = dividir, Ctrl+S = salvar rascunho.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const isOurTextarea = el instanceof HTMLElement && el.dataset.emptyScriptTextarea === 'true'
      if (!isOurTextarea) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleDivide()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveDraft()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDivide, handleSaveDraft])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-[#0B0B10] via-[#0E0E15] to-[#0B0B10] backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#14141C]/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#7C5CFC]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Seu Roteiro</h2>
              <p className="text-xs text-[#9494A8]">
                Comece colando ou escrevendo. Depois divida em blocos para o teleprompter.
              </p>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="p-6 space-y-3">
          <textarea
            ref={textareaRef}
            data-empty-script-textarea="true"
            value={value}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Cole ou escreva seu roteiro aqui..."
            rows={10}
            className="w-full bg-[#0B0B10] border border-white/10 rounded-xl p-4 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-[#7C5CFC] placeholder:text-[#9494A8]/50 font-mono"
          />

          {/* Badge de contagem */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1C27] border border-white/10 text-[10px] font-semibold text-[#9494A8]">
              <Type className="w-3 h-3 text-[#22D3EE]" />
              {words} {words === 1 ? 'palavra' : 'palavras'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1C27] border border-white/10 text-[10px] font-semibold text-[#9494A8]">
              <Clock className="w-3 h-3 text-[#7C5CFC]" />≈ {formatDurationLabel(seconds)} de fala
            </span>
            <span className="text-[10px] text-[#9494A8]/70 ml-auto hidden sm:inline">
              Atalhos: <kbd className="px-1 py-0.5 rounded bg-white/5">Ctrl+Enter</kbd> dividir ·{' '}
              <kbd className="px-1 py-0.5 rounded bg-white/5">Ctrl+S</kbd> rascunho
            </span>
          </div>

          {/* Botões */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={handleImport}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1C1C27] border border-white/10 text-xs font-semibold text-white hover:border-[#7C5CFC]/50 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-[#22D3EE]" /> Importar texto
            </button>
            <button
              onClick={handleDivide}
              disabled={!hasText}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Scissors className="w-3.5 h-3.5" /> Dividir em blocos
            </button>
            <button
              onClick={handleUseWhole}
              disabled={!hasText}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/40 hover:bg-[#22D3EE]/25 text-[#22D3EE] text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck className="w-3.5 h-3.5" /> Usar texto inteiro
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={!hasText}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1C1C27] border border-white/10 text-xs font-semibold text-[#9494A8] hover:text-white hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" /> Salvar rascunho
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

export default EmptyScriptCard
