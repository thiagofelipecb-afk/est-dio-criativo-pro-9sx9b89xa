import React, { useState, useMemo } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { ModuleHeader, EmptyState, inputClass, Field } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Save,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { MetricReading } from '@/types/platform'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const metricLabels: Record<string, string> = {
  saves: 'Saves',
  shares: 'Shares',
  swipe_through: 'Swipe-through %',
  watch_time: 'Watch time (s)',
  rewatch: 'Rewatch count',
  dm_shares: 'Compart. DM',
}

export default function Metricas() {
  const { metrics, saveMetric, contentItems } = usePlatform()
  // Conteúdos com tipos suportados para leitura manual
  const items = contentItems.filter(
    (c) =>
      c.type === 'carrossel' ||
      c.type === 'reel' ||
      c.type === 'post' ||
      c.type === 'story' ||
      c.type === 'video',
  )

  const [selectedId, setSelectedId] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'post' | 'reel' | 'story' | 'carrossel'>(
    'all',
  )
  const [search, setSearch] = useState('')

  // Filtro por tipo (visualizar todos de um tipo)
  const typeFiltered = items.filter((c) => (typeFilter === 'all' ? true : c.type === typeFilter))

  const filteredForSelect = typeFiltered.filter((c) =>
    !search.trim() ? true : c.title.toLowerCase().includes(search.trim().toLowerCase()),
  )

  // Leituras relevantes: do item selecionado OU de todos os itens do tipo filtrado
  const relevantItemIds = useMemo(() => {
    if (selectedId) return new Set([selectedId])
    return new Set(typeFiltered.map((c) => c.id))
  }, [selectedId, typeFilter])

  const relevantReadings = useMemo(
    () =>
      metrics
        .filter((m) => relevantItemIds.has(m.contentId))
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    [metrics, relevantItemIds],
  )

  // Item selecionado (para tendência e formulário)
  const selectedItem = items.find((c) => c.id === selectedId) || null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Métricas"
        description="Leitura manual por ativo. Cada leitura é imutável — o histórico é sempre preservado. Compare tendências e veja a evolução do watch time."
        icon={<BarChart3 className="w-5 h-5" />}
        accent="#22D3EE"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Nenhum ativo produzido"
          description="Gere conteúdo no Módulo 2 para registrar leituras manuais de desempenho por ativo."
        />
      ) : (
        <>
          {/* Seleção de item OU visualizar por tipo */}
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[#9494A8]">Visualizar:</span>
              {(['all', 'post', 'reel', 'story', 'carrossel'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTypeFilter(t)
                    setSelectedId('')
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize ${typeFilter === t ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
                >
                  {t === 'all' ? 'Todos os tipos' : t}
                </button>
              ))}
            </div>

            <Field label="Selecionar um ativo (ou deixe em branco para ver todos do tipo)">
              <div className="relative">
                <input
                  type="text"
                  aria-label="Buscar ativo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título…"
                  className={`${inputClass} pr-2`}
                />
                <select
                  aria-label="Selecionar ativo"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className={`${inputClass} mt-2`}
                >
                  <option value="">— Todos do tipo selecionado —</option>
                  {filteredForSelect.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            {selectedItem && (
              <ReadingForm item={selectedItem} onSave={saveMetric} metrics={metrics} />
            )}
          </div>

          {/* Tendência + gráfico (apenas do item selecionado) */}
          {selectedItem ? (
            <TrendPanel
              readings={metrics
                .filter((m) => m.contentId === selectedItem.id)
                .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))}
            />
          ) : (
            <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4 text-[11px] text-[#9494A8]">
              Selecione um ativo específico para ver tendências e o gráfico de evolução.
            </div>
          )}

          {/* Histórico de leituras (item selecionado ou todos do tipo) */}
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Histórico de leituras ({relevantReadings.length})
            </h3>
            {relevantReadings.length === 0 ? (
              <p className="text-xs text-[#9494A8]">
                Nenhuma leitura registrada {selectedItem ? 'para este ativo' : 'para este tipo'}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase text-[#9494A8] border-b border-white/5">
                      <th className="text-left py-2 px-2 font-semibold">Ativo</th>
                      <th className="text-left py-2 px-2 font-semibold">Data</th>
                      <th className="text-left py-2 px-2 font-semibold">Métricas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relevantReadings.map((m) => (
                      <tr key={m.id} className="border-b border-white/5">
                        <td className="py-2 px-2 text-slate-300 max-w-[180px] truncate">
                          {m.contentTitle}
                          <span className="text-[#9494A8] ml-1 capitalize">({m.contentType})</span>
                        </td>
                        <td className="py-2 px-2 text-[#9494A8] whitespace-nowrap">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(m.measuredAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-2 text-slate-400">
                          {Object.entries(m.metrics)
                            .map(([k, v]) => `${metricLabels[k] || k}: ${v}`)
                            .join(' • ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ReadingForm({
  item,
  onSave,
  metrics,
}: {
  item: any
  onSave: (m: MetricReading) => void
  metrics: MetricReading[]
}) {
  const isVideo = item.type === 'reel' || item.type === 'video'
  const fields = isVideo
    ? [
        { key: 'saves', label: 'Saves', type: 'number' },
        { key: 'shares', label: 'Shares', type: 'number' },
        { key: 'swipe_through', label: 'Swipe-through %', type: 'number' },
        { key: 'watch_time', label: 'Watch time (s)', type: 'number' },
        { key: 'rewatch', label: 'Rewatch count', type: 'number' },
        { key: 'dm_shares', label: 'Compart. DM', type: 'number' },
      ]
    : [
        { key: 'saves', label: 'Saves', type: 'number' },
        { key: 'shares', label: 'Shares', type: 'number' },
        { key: 'swipe_through', label: 'Swipe-through %', type: 'number' },
        { key: 'dm_shares', label: 'Compart. DM', type: 'number' },
      ]

  const [vals, setVals] = useState<Record<string, string>>({})
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))

  const itemReadings = useMemo(
    () =>
      metrics
        .filter((m) => m.contentId === item.id)
        .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)),
    [metrics, item.id],
  )
  const last = itemReadings[itemReadings.length - 1]

  const save = () => {
    const numMetrics: Record<string, number> = {}
    Object.entries(vals).forEach(([k, v]) => {
      if (v !== '') numMetrics[k] = Number(v)
    })
    if (!Object.keys(numMetrics).length) {
      toast.error('Preencha ao menos um valor.')
      return
    }
    const measuredAt = new Date(date + 'T12:00:00').toISOString()
    onSave({
      id: uid('mr'),
      contentId: item.id,
      contentTitle: item.title,
      contentType: item.type,
      measuredAt,
      metrics: numMetrics,
    })
    setVals({})
    toast.success('Leitura registrada! Histórico preservado (imutável).')
  }

  return (
    <div className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{item.title}</span>
          <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px] capitalize">
            {item.type}
          </Badge>
        </div>
        {last && (
          <span className="text-[10px] text-[#9494A8]">
            Última leitura: {new Date(last.measuredAt).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
      <Field label="Data da leitura">
        <input
          type="date"
          aria-label="Data da leitura"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              type="number"
              aria-label={f.label}
              className={inputClass}
              value={vals[f.key] || ''}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              placeholder={last?.metrics[f.key] != null ? String(last.metrics[f.key]) : '0'}
            />
          </Field>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} className="bg-[#7C5CFC] text-xs gap-1.5">
          <Save className="w-3.5 h-3.5" /> Registrar Leitura
        </Button>
      </div>
    </div>
  )
}

function TrendPanel({ readings }: { readings: MetricReading[] }) {
  // readings em ordem crescente por data
  if (readings.length < 2) {
    return (
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#22D3EE]" /> Tendência
        </h3>
        <p className="text-xs text-[#9494A8]">
          Adicione pelo menos 2 leituras para ver tendências.
        </p>
      </div>
    )
  }

  const last = readings[readings.length - 1]
  const prev = readings[readings.length - 2]
  const allKeys = Array.from(new Set(readings.flatMap((r) => Object.keys(r.metrics))))

  const trendIcon = (cur: number, previous: number) => {
    if (cur > previous)
      return (
        <span className="flex items-center gap-1 text-emerald-400">
          <ArrowUp className="w-3 h-3" /> cresceu
        </span>
      )
    if (cur < previous)
      return (
        <span className="flex items-center gap-1 text-red-400">
          <ArrowDown className="w-3 h-3" /> caiu
        </span>
      )
    return (
      <span className="flex items-center gap-1 text-[#9494A8]">
        <Minus className="w-3 h-3" /> estável
      </span>
    )
  }

  // Gráfico de watch_time ao longo do tempo (>=3 leituras)
  const hasWatchTime = allKeys.includes('watch_time')
  const watchReadings = readings.filter((r) => r.metrics.watch_time != null)
  const showChart = hasWatchTime && watchReadings.length >= 3
  const chartData = watchReadings.map((m) => ({
    date: new Date(m.measuredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    watch_time: m.metrics.watch_time,
  }))

  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4 space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#22D3EE]" /> Tendência (última vs. anterior)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {allKeys.map((k) => {
          const cur = last.metrics[k]
          const previous = prev.metrics[k]
          return (
            <div key={k} className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
              <p className="text-[10px] text-[#9494A8]">{metricLabels[k] || k}</p>
              <p className="text-sm font-bold text-white">{cur ?? '—'}</p>
              {cur != null && previous != null ? (
                <p className="text-[10px] mt-0.5">{trendIcon(cur, previous)}</p>
              ) : (
                <p className="text-[10px] text-[#9494A8] mt-0.5">sem anterior</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Gráfico de watch_time */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
          <p className="text-[11px] font-semibold text-white">Evolução do Watch Time</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[9px] text-[#9494A8] italic ml-1">(leituras manuais)</span>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
              Leituras manuais — sem integração com redes sociais ativa.
            </TooltipContent>
          </Tooltip>
        </div>
        {showChart ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fill: '#9494A8', fontSize: 10 }} stroke="#ffffff20" />
                <YAxis tick={{ fill: '#9494A8', fontSize: 10 }} stroke="#ffffff20" />
                <RTooltip
                  contentStyle={{
                    background: '#1C1C27',
                    border: '1px solid #ffffff20',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: '#9494A8' }}
                />
                <Line
                  type="monotone"
                  dataKey="watch_time"
                  name="Watch time (s)"
                  stroke="#7C5CFC"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <BarChart3 className="w-6 h-6 text-[#9494A8]/50 mb-2" />
            <p className="text-xs text-[#9494A8]">
              Registre 3 ou mais leituras com watch time para ver o gráfico de evolução.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
