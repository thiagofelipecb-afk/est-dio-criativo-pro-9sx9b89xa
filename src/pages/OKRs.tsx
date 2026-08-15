import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Target,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  Clock,
  ListChecks,
  TrendingUp,
  Circle,
  XCircle,
  Plus,
  Minus,
} from 'lucide-react'
import { toast } from 'sonner'
import { generateOKRs } from '@/lib/okr-generator'
import type { Objective, KeyResult, OKRStatus } from '@/types/platform'

/* =====================================================================
   CONSTANTES DE TEMA
   ===================================================================== */
const CATEGORY_COLORS: Record<Objective['category'], string> = {
  crescimento: '#7C5CFC',
  receita: '#22c55e',
  audiencia: '#22D3EE',
  produto: '#F59E0B',
  marca: '#EC4899',
  vendas: '#3B82F6',
}

const CATEGORY_LABELS: Record<Objective['category'], string> = {
  crescimento: 'Crescimento',
  receita: 'Receita',
  audiencia: 'Audiência',
  produto: 'Produto',
  marca: 'Marca',
  vendas: 'Vendas',
}

const STATUS_META: Record<
  OKRStatus,
  { label: string; color: string; bg: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  nao_iniciado: {
    label: 'Não iniciado',
    color: '#9494A8',
    bg: 'rgba(148,148,168,0.15)',
    Icon: Circle,
  },
  em_progresso: {
    label: 'Em progresso',
    color: '#7C5CFC',
    bg: 'rgba(124,92,252,0.15)',
    Icon: Loader2,
  },
  concluido: {
    label: 'Concluído',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
    Icon: CheckCircle2,
  },
  em_risco: {
    label: 'Em risco',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
    Icon: AlertTriangle,
  },
  cancelado: { label: 'Cancelado', color: '#64748B', bg: 'rgba(100,116,139,0.15)', Icon: XCircle },
}

/* =====================================================================
   COMPONENTE PRINCIPAL
   ===================================================================== */
type LoadState = 'loading' | 'ready' | 'error'

export default function OKRs() {
  const navigate = useNavigate()
  const { brandProfile, okrSet, setOKRSet, hasBrandOS } = usePlatform()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [regenerating, setRegenerating] = useState(false)

  const [expandAll, setExpandAll] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    setLoadState('loading')
    const t = setTimeout(() => setLoadState('ready'), 450)
    return () => clearTimeout(t)
  }, [okrSet?.id])

  const hasOKRs = !!okrSet && okrSet.objectives.length > 0

  const filteredObjectives = useMemo(() => {
    if (!okrSet) return []
    return okrSet.objectives.filter((o) => {
      if (filterCategory !== 'all' && o.category !== filterCategory) return false
      if (filterStatus !== 'all' && o.status !== filterStatus) return false
      return true
    })
  }, [okrSet, filterCategory, filterStatus])

  const summary = useMemo(() => {
    if (!okrSet) return { total: 0, concluidos: 0, emProgresso: 0, emRisco: 0, progressoGeral: 0 }
    const objs = okrSet.objectives
    const concluidos = objs.filter((o) => o.status === 'concluido').length
    const emProgresso = objs.filter((o) => o.status === 'em_progresso').length
    const emRisco = objs.filter((o) => o.status === 'em_risco').length
    const progressoGeral =
      objs.length > 0 ? Math.round(objs.reduce((s, o) => s + o.progress, 0) / objs.length) : 0
    return { total: objs.length, concluidos, emProgresso, emRisco, progressoGeral }
  }, [okrSet])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedIds(new Set())
      setExpandAll(false)
    } else {
      setExpandedIds(new Set(okrSet?.objectives.map((o) => o.id) || []))
      setExpandAll(true)
    }
  }

  const handleRegenerate = () => {
    if (!hasBrandOS) {
      toast.error('Gere o Brand OS primeiro para regenerar os OKRs.')
      return
    }
    setRegenerating(true)
    setTimeout(() => {
      const newSet = generateOKRs(brandProfile, okrSet)
      setOKRSet(newSet)
      setRegenerating(false)
      toast.success(
        `OKRs regenerados — ${newSet.objectives.length} objetivos. Valores atuais preservados.`,
      )
    }, 600)
  }

  const handleRetry = () => {
    setLoadState('loading')
    setTimeout(() => setLoadState('ready'), 500)
  }

  /* ---- Estado vazio: sem Brand OS ---- */
  if (!hasBrandOS && loadState === 'ready') {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-in">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-10 text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30">
            <ListChecks className="w-8 h-8 text-[#7C5CFC]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">OKRs Estratégicos Indisponíveis</h2>
            <p className="text-sm text-[#9494A8] max-w-md mx-auto mt-1">
              Gere o Brand OS primeiro no módulo de Posicionamento para obter OKRs estratégicos
              personalizados para o seu negócio.
            </p>
          </div>
          <Button
            onClick={() => navigate('/posicionamento')}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Ir para Posicionamento
          </Button>
        </div>
      </div>
    )
  }

  /* ---- Estado de erro ---- */
  if (loadState === 'error') {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-in">
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-8 text-center space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Falha ao carregar os OKRs</h2>
            <p className="text-sm text-[#9494A8] max-w-md mx-auto mt-1">
              Não foi possível montar o dashboard de OKRs. Tente novamente.
            </p>
          </div>
          <Button
            onClick={handleRetry}
            className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  /* ---- Estado de carregamento (skeleton) ---- */
  if (loadState === 'loading') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-10 w-40" />
          <SkeletonBlock className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <SkeletonBlock className="h-3 rounded-full w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  /* ---- Dashboard pronto ---- */
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[#7C5CFC]/10 border-[#7C5CFC]/30 text-[#7C5CFC]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                OKRs Estratégicos
              </h1>
              <p className="text-xs sm:text-sm text-[#9494A8] max-w-2xl">
                Objetivos e Resultados-Chave derivados do seu Brand OS. Acompanhe o progresso,
                atualize valores e mantenha o foco no que move o negócio.
              </p>
            </div>
          </div>
          {okrSet && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 gap-1.5">
                <ListChecks className="w-3 h-3" /> Brand OS v{okrSet.brandProfileVersion}
              </Badge>
              <Badge className="bg-white/5 text-[#9494A8] border-white/10 gap-1.5">
                <Clock className="w-3 h-3" /> Gerado em{' '}
                {new Date(okrSet.generatedAt).toLocaleDateString('pt-BR')}
              </Badge>
              {okrSet.lastUpdatedAt !== okrSet.generatedAt && (
                <Badge className="bg-white/5 text-[#9494A8] border-white/10 gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Atualizado em{' '}
                  {new Date(okrSet.lastUpdatedAt).toLocaleString('pt-BR')}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/posicionamento')}
            className="border-white/10 text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Posicionamento
          </Button>
          <Button
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs gap-1.5"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {regenerating ? 'Regenerando…' : 'Regenerar OKRs'}
          </Button>
        </div>
      </div>

      {/* Gráfico de resumo no topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total de Objetivos"
          value={summary.total}
          color="#7C5CFC"
          Icon={Target}
        />
        <SummaryCard
          label="Concluídos"
          value={summary.concluidos}
          color="#22c55e"
          Icon={CheckCircle2}
        />
        <SummaryCard
          label="Em Progresso"
          value={summary.emProgresso}
          color="#22D3EE"
          Icon={Loader2}
        />
        <SummaryCard
          label="Em Risco"
          value={summary.emRisco}
          color="#ef4444"
          Icon={AlertTriangle}
        />
      </div>

      {/* Progresso geral */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#7C5CFC]" /> Progresso geral
          </span>
          <span className="text-sm font-extrabold text-white">{summary.progressoGeral}%</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all duration-700"
            style={{ width: `${summary.progressoGeral}%` }}
          />
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExpandAll}
          className="border-white/10 text-xs gap-1.5"
        >
          {expandAll ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Recolher todos
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5" /> Expandir todos
            </>
          )}
        </Button>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-[150px] bg-[#14141C] border-white/10 text-xs text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-[#1C1C27] border-white/10 text-white">
            <SelectItem value="all" className="text-xs">
              Todas categorias
            </SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[150px] bg-[#14141C] border-white/10 text-xs text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1C1C27] border-white/10 text-white">
            <SelectItem value="all" className="text-xs">
              Todos status
            </SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de objetivos */}
      {filteredObjectives.length === 0 ? (
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-8 text-center">
          <p className="text-sm text-[#9494A8]">
            Nenhum objetivo corresponde aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredObjectives.map((obj) => (
            <ObjectiveCard
              key={obj.id}
              objective={obj}
              expanded={expandedIds.has(obj.id)}
              onToggle={() => toggleExpand(obj.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* =====================================================================
   SUBCOMPONENTES
   ===================================================================== */

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-[#1C1C27] to-[#14141C] rounded-lg animate-pulse ${className}`}
    />
  )
}

function SummaryCard({
  label,
  value,
  color,
  Icon,
}: {
  label: string
  value: number
  color: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}) {
  return (
    <div
      className="rounded-2xl border p-4 space-y-1"
      style={{ borderColor: `${color}30`, background: `${color}0d` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
    </div>
  )
}

function ObjectiveCard({
  objective,
  expanded,
  onToggle,
}: {
  objective: Objective
  expanded: boolean
  onToggle: () => void
}) {
  const color = CATEGORY_COLORS[objective.category]
  const statusMeta = STATUS_META[objective.status]
  const StatusIcon = statusMeta.Icon

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-shadow hover:shadow-lg"
      style={{ borderColor: `${color}30`, background: '#14141C' }}
    >
      {/* Cabeçalho colorido */}
      <div
        className="relative p-4 cursor-pointer"
        style={{ background: `${color}0d` }}
        onClick={onToggle}
      >
        {/* Barra de progresso circular no canto superior direito */}
        <div className="absolute top-3 right-3">
          <CircularProgress value={objective.progress} color={color} />
        </div>

        <div className="flex items-start gap-2 pr-16">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className="text-[9px] font-bold uppercase tracking-wider border"
                style={{ background: `${color}1a`, color, borderColor: `${color}40` }}
              >
                {CATEGORY_LABELS[objective.category]}
              </Badge>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                style={{
                  background: statusMeta.bg,
                  color: statusMeta.color,
                  borderColor: `${statusMeta.color}40`,
                }}
              >
                <StatusIcon
                  className={`w-2.5 h-2.5 ${objective.status === 'em_progresso' ? 'animate-spin' : ''}`}
                />
                {statusMeta.label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug">{objective.title}</h3>
            <p className="text-[11px] text-[#9494A8] leading-snug line-clamp-2">
              {objective.description}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-[#9494A8] pt-1">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {objective.responsavel}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {objective.prazo}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle expandir */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
          <span className="text-[10px] text-[#9494A8]">
            {objective.keyResults.length} resultado{objective.keyResults.length === 1 ? '' : 's'}
            -chave
          </span>
          <button
            className="text-[#9494A8] hover:text-white transition-colors"
            aria-label={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Key Results (expansível) */}
      {expanded && (
        <div className="p-4 space-y-3 border-t border-white/5">
          {objective.keyResults.map((kr) => (
            <KeyResultRow key={kr.id} kr={kr} objectiveId={objective.id} color={color} />
          ))}
        </div>
      )}
    </div>
  )
}

function KeyResultRow({
  kr,
  objectiveId,
  color,
}: {
  kr: KeyResult
  objectiveId: string
  color: string
}) {
  const { updateKeyResult } = usePlatform()
  const [value, setValue] = useState(String(kr.current))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusMeta = STATUS_META[kr.status]
  const StatusIcon = statusMeta.Icon

  useEffect(() => {
    setValue(String(kr.current))
  }, [kr.current])

  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'))
    const num = Number.isFinite(n) && n >= 0 ? n : 0
    updateKeyResult(objectiveId, kr.id, num)
  }

  const handleChange = (raw: string) => {
    setValue(raw)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(raw), 500)
  }

  const stepUp = () => {
    const next = (parseFloat(value) || 0) + 1
    setValue(String(next))
    commit(String(next))
  }
  const stepDown = () => {
    const cur = parseFloat(value) || 0
    const next = Math.max(0, cur - 1)
    setValue(String(next))
    commit(String(next))
  }

  return (
    <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-slate-200 leading-snug flex-1">{kr.description}</p>
        <span
          className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0"
          style={{
            background: statusMeta.bg,
            color: statusMeta.color,
            borderColor: `${statusMeta.color}40`,
          }}
        >
          <StatusIcon
            className={`w-2.5 h-2.5 ${kr.status === 'em_progresso' ? 'animate-spin' : ''}`}
          />
          {statusMeta.label}
        </span>
      </div>

      {/* Barra de progresso linear */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${kr.progress}%`, background: color }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#9494A8]">
          <span className="font-bold text-white">{formatValue(kr.current, kr.unit)}</span>
          {' / '}
          {formatValue(kr.target, kr.unit)} {kr.unit !== '%' && kr.unit}
          <span className="ml-1.5 text-[#9494A8]">({kr.progress}%)</span>
        </span>

        {/* Input numérico com stepper */}
        <div className="flex items-center gap-1">
          <button
            onClick={stepDown}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-[#9494A8] hover:text-white transition-colors"
            aria-label="Diminuir"
          >
            <Minus className="w-3 h-3" />
          </button>
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="h-6 w-20 bg-[#1C1C27] border-white/10 text-[11px] text-white text-center px-1 py-0 focus:ring-1 focus:ring-[#7C5CFC]"
          />
          <button
            onClick={stepUp}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-[#9494A8] hover:text-white transition-colors"
            aria-label="Aumentar"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
   Barra de progresso circular SVG
   ===================================================================== */
function CircularProgress({
  value,
  color,
  size = 44,
}: {
  value: number
  color: string
  size?: number
}) {
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#ffffff14"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
      >
        {value}
      </text>
    </svg>
  )
}

/* =====================================================================
   Utilitários
   ===================================================================== */
function formatValue(n: number, unit: string): string {
  if (unit === 'R$') {
    return `R$ ${Math.round(n).toLocaleString('pt-BR')}`
  }
  if (unit === '%') {
    return `${Math.round(n)}%`
  }
  return Math.round(n).toLocaleString('pt-BR')
}
