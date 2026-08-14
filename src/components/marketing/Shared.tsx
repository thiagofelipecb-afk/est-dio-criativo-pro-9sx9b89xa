import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ContentBlock } from '@/types/platform'

// Cabeçalho padrão de cada módulo com contexto do Brand OS ativo
export function ModuleHeader({
  title,
  description,
  icon,
  accent = '#7C5CFC',
  actions,
}: {
  title: string
  description: string
  icon?: React.ReactNode
  accent?: string
  actions?: React.ReactNode
}) {
  const navigate = useNavigate()
  const { brandProfile, hasBrandOS } = usePlatform()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{ background: `${accent}1a`, borderColor: `${accent}33`, color: accent }}
            >
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#9494A8] max-w-2xl">{description}</p>
          </div>
        </div>
        {/* Contexto ativo do Brand OS */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {hasBrandOS ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Brand OS ativo • v{brandProfile.activeVersion}
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1.5">
              <AlertCircle className="w-3 h-3" />
              Brand OS pendente
            </Badge>
          )}
          {brandProfile.base.niche && (
            <Badge className="bg-white/5 text-[#9494A8] border-white/10">
              {brandProfile.base.niche}
              {brandProfile.base.subniche ? ` • ${brandProfile.base.subniche}` : ''}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/modulo-1')}
            className="h-6 text-[11px] text-[#22D3EE] hover:bg-[#22D3EE]/10 px-2 gap-1"
          >
            <Pencil className="w-3 h-3" /> Editar posicionamento
          </Button>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// Estado vazio padrão
export function EmptyState({
  icon,
  title,
  description,
  action,
  example,
}: {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  example?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-white/10 bg-[#0e0e15]/60">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-[#9494A8] max-w-md mt-1.5">{description}</p>
      {example && (
        <p className="text-[11px] text-[#9494A8]/70 italic mt-3 max-w-md border-l-2 border-white/10 pl-3 text-left">
          Exemplo: {example}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// Banner de contexto de geração (versão do Brand OS usada)
export function GenerationMetaBar({
  contextVersion,
  generatedAt,
  model,
  durationMs,
}: {
  contextVersion: number
  generatedAt?: string | null
  model?: string | null
  durationMs?: number | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9494A8] bg-[#0e0e15]/60 border border-white/5 rounded-lg px-3 py-2">
      <span className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-[#7C5CFC]" /> Contexto Brand OS v{contextVersion}
      </span>
      {model && <span className="flex items-center gap-1">• {model}</span>}
      {generatedAt && (
        <span className="flex items-center gap-1">
          • <Clock className="w-3 h-3" /> {new Date(generatedAt).toLocaleString('pt-BR')}
        </span>
      )}
      {durationMs != null && <span>• {(durationMs / 1000).toFixed(1)}s</span>}
    </div>
  )
}

// Card de item salvo (lista de resultados)
export function SavedItemCard({
  title,
  subtitle,
  status,
  date,
  contextVersion,
  onClick,
  actions,
}: {
  title: string
  subtitle?: string
  status?: string
  date?: string
  contextVersion?: number
  onClick?: () => void
  actions?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={`group rounded-xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/40 p-4 transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#7C5CFC] transition-colors">
            {title}
          </h4>
          {subtitle && <p className="text-xs text-[#9494A8] mt-0.5 line-clamp-2">{subtitle}</p>}
        </div>
        {status && (
          <Badge className="shrink-0 bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
            {status}
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-[#9494A8]/70 flex items-center gap-2">
          {date && <span>{new Date(date).toLocaleDateString('pt-BR')}</span>}
          {contextVersion != null && <span>• Brand OS v{contextVersion}</span>}
        </span>
        {actions}
      </div>
    </div>
  )
}

// Academy contextual por módulo (lista simples — mantida para compatibilidade)
export function AcademyPanel({
  lessons,
  moduleTitle,
}: {
  lessons: { title: string; duration: string }[]
  moduleTitle: string
}) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Academy — {moduleTitle}</h3>
          <p className="text-[11px] text-[#9494A8]">Aulas contextuais para dominar este módulo</p>
        </div>
      </div>
      <div className="space-y-2">
        {lessons.map((l, i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-[#0e0e15]/60 overflow-hidden">
            <button
              onClick={() => setOpen(open === String(i) ? null : String(i))}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5"
            >
              <span className="text-xs font-medium text-white flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#7C5CFC]">#{i + 1}</span>
                {l.title}
              </span>
              <span className="text-[10px] text-[#9494A8]">{l.duration}</span>
            </button>
            {open === String(i) && (
              <div className="px-3 pb-3">
                <div className="aspect-video rounded-lg bg-black border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] mb-2">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="text-[11px] text-[#9494A8]">Player de aula • {l.title}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook de autosave com debounce (padrão 2s)
export function useDebouncedEffect<T>(value: T, fn: (v: T) => void, delay = 2000) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const t = setTimeout(() => ref.current(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
}

// Guarda de Brand OS: se não houver Brand OS ativo, retorna false e exibe tooltip.
// Uso: const can = useBrandOSGuard(); if(!can) return <GuardButton/>
export function useBrandOSGuard() {
  const { hasBrandOS, brandProfile } = usePlatform()
  return {
    can: hasBrandOS,
    version: brandProfile.activeVersion,
    brandProfile,
  }
}

// Campo de formulário padrão
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[#9494A8] flex items-center gap-1 mb-1.5">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#9494A8]/70 mt-1">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] placeholder:text-[#9494A8]/50'

// Botão de gerar com IA com feedback de progresso
export function GenerateButton({
  onClick,
  loading,
  progress,
  progressLabel,
  disabled,
  label = 'Gerar com IA',
}: {
  onClick: () => void
  loading?: boolean
  progress?: number
  progressLabel?: string
  disabled?: boolean
  label?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        onClick={onClick}
        disabled={loading || disabled}
        className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-1.5 disabled:opacity-50"
      >
        <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Gerando…' : label}
      </Button>
      {loading && (
        <div className="w-full">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all duration-300"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
          {progressLabel && <p className="text-[10px] text-[#9494A8] mt-1">{progressLabel}</p>}
        </div>
      )}
    </div>
  )
}

// Regeneração simulada de um bloco via Brand OS ativo
function useBlockRegen() {
  const { brandProfile, hasBrandOS } = usePlatform()
  return (blockType: string, currentText: string) => {
    if (!hasBrandOS) return currentText
    const diff = brandProfile.base.differential || 'entrega de valor'
    const voice = brandProfile.base.voice || 'direto e próximo'
    const niche = brandProfile.base.niche || 'seu nicho'
    const suffix = ` (alinhado ao tom ${voice} • ${niche})`
    // Variações simples simulando reescrita pela IA
    const variants = [
      `${currentText.replace(/\.$/, '')} — e é por isso que ${diff.toLowerCase()}.`,
      `Reescrito: ${currentText}`,
      `${currentText}\n\n→ ${diff}. Tom: ${voice}.${suffix}`,
    ]
    return variants[Math.floor(Math.random() * variants.length)]
  }
}

// Editor por bloco genérico com ações por bloco (Copiar, Editar/Salvar, Regenerar, Bloquear, Reordenar)
export function BlockEditor<
  T extends { id: string; blockType: string; position: number; text: string; version: number },
>({
  blocks,
  onChange,
  onAdjust,
  readOnly,
  enableRegen = true,
  enableReorder = false,
}: {
  blocks: T[]
  onChange: (blocks: T[]) => void
  onAdjust?: (blockId: string) => void
  readOnly?: boolean
  enableRegen?: boolean
  enableReorder?: boolean
}) {
  const { hasBrandOS } = usePlatform()
  const regen = useBlockRegen()
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({})

  const updateBlock = (id: string, text: string, bumpVersion = false) => {
    onChange(
      blocks.map((b) =>
        b.id === id ? { ...b, text, version: bumpVersion ? b.version + 1 : b.version } : b,
      ),
    )
  }

  const startEdit = (b: T) => {
    setEditing((e) => ({ ...e, [b.id]: b.text }))
    setIsEditing((e) => ({ ...e, [b.id]: true }))
  }
  const saveEdit = (b: T) => {
    updateBlock(b.id, editing[b.id] ?? b.text, true)
    setIsEditing((e) => ({ ...e, [b.id]: false }))
    toast.success('Bloco salvo.')
  }

  const copy = (b: T) => {
    navigator.clipboard.writeText(b.text)
    toast.success('Bloco copiado!')
  }

  const regenBlock = (b: T) => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.', {
        description: 'A regeneração usa o Brand OS ativo como contexto.',
      })
      return
    }
    const newText = regen(b.blockType, b.text)
    updateBlock(b.id, newText, true)
    onAdjust?.(b.id)
    toast.success('Bloco regenerado com IA (simulada).')
  }

  const toggleLock = (b: T) => {
    onChange(
      blocks.map((x) => (x.id === b.id ? { ...x, locked: !(x as ContentBlock).locked } : x)) as T[],
    )
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...blocks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((b, i) => ({ ...b, position: i })) as T[])
  }

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const locked = (b as ContentBlock).locked
        return (
          <div
            key={b.id}
            className="rounded-xl border border-white/10 bg-[#0e0e15]/60 p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {enableReorder && !readOnly && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-[#9494A8] hover:text-white disabled:opacity-20"
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === blocks.length - 1}
                      className="text-[#9494A8] hover:text-white disabled:opacity-20"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC] truncate">
                  {b.blockType}
                </span>
                {locked && <Lock className="w-3 h-3 text-amber-400" />}
                {(b as ContentBlock).aiGenerated && (
                  <Badge className="bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/20 text-[9px]">
                    IA
                  </Badge>
                )}
              </div>
              {!readOnly && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copy(b)}
                    className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                    title="Copiar"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {isEditing[b.id] ? (
                    <button
                      onClick={() => saveEdit(b)}
                      className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"
                      title="Salvar"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(b)}
                      disabled={locked}
                      className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-30"
                      title="Editar"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {enableRegen && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => regenBlock(b)}
                          disabled={locked}
                          className="p-1 rounded text-[#22D3EE] hover:bg-[#22D3EE]/10 disabled:opacity-30"
                          title="Regenerar bloco"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                        Regenerar via Brand OS (IA simulada)
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <button
                    onClick={() => toggleLock(b)}
                    className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                    title={locked ? 'Desbloquear' : 'Bloquear'}
                  >
                    {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
            {readOnly ? (
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{b.text}</p>
            ) : isEditing[b.id] ? (
              <textarea
                value={editing[b.id] ?? b.text}
                onChange={(e) => setEditing((s) => ({ ...s, [b.id]: e.target.value }))}
                rows={Math.min(10, Math.max(3, (editing[b.id] ?? b.text).split('\n').length))}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none leading-relaxed"
                autoFocus
              />
            ) : (
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {b.text || <span className="text-[#9494A8]/50 italic">Bloco vazio</span>}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Hook simples de desfazer/refazer
export function useUndoRedo<T>(initial: T) {
  const [history, setHistory] = React.useState<T[]>([initial])
  const [index, setIndex] = React.useState(0)
  const set = (val: T) => {
    const newHist = history.slice(0, index + 1)
    newHist.push(val)
    setHistory(newHist)
    setIndex(newHist.length - 1)
  }
  const undo = () => setIndex(Math.max(0, index - 1))
  const redo = () => setIndex(Math.min(history.length - 1, index + 1))
  return {
    value: history[index],
    set,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  }
}
