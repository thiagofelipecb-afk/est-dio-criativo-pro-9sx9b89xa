import React, { useState, useMemo } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { ModuleHeader, EmptyState, inputClass, Field } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Save, Clock, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { MetricReading } from '@/types/platform'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export default function Metricas() {
  const { metrics, saveMetric, contentItems } = usePlatform()
  const [filter, setFilter] = useState<'Todos' | 'Carrosseis' | 'Reels'>('Todos')

  // Combina conteúdo + leituras
  const items = contentItems.filter(
    (c) => c.type === 'carrossel' || c.type === 'reel' || c.type === 'post',
  )
  const filtered = items.filter((c) => {
    if (filter === 'Todos') return true
    if (filter === 'Carrosseis') return c.type === 'carrossel'
    if (filter === 'Reels') return c.type === 'reel'
    return true
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Métricas"
        description="Leitura manual por ativo. Carrossel: saves, shares e swipe-through. Reel: saves, watch time, rewatch e compartilhamentos por DM. Histórico preservado."
        icon={<BarChart3 className="w-5 h-5" />}
        accent="#22D3EE"
      />
      <div className="flex gap-2">
        {(['Todos', 'Carrosseis', 'Reels'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Nenhum ativo produzido"
          description="Gere conteúdo no Módulo 2 para registrar leituras manuais de desempenho por ativo."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <MetricRow key={item.id} item={item} metrics={metrics} onSave={saveMetric} />
          ))}
        </div>
      )}
      {metrics.length > 0 && (
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Histórico de leituras (preservado)</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {metrics.slice(0, 20).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate">{m.contentTitle}</span>
                <span className="text-[#9494A8] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(m.measuredAt).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricRow({
  item,
  metrics,
  onSave,
}: {
  item: any
  metrics: MetricReading[]
  onSave: (m: MetricReading) => void
}) {
  const isVideo = item.type === 'reel' || item.type === 'video'
  const fields = isVideo
    ? [
        { key: 'saves', label: 'Saves' },
        { key: 'shares', label: 'Shares' },
        { key: 'watch_time', label: 'Watch time (s)' },
        { key: 'rewatch', label: 'Rewatch %' },
        { key: 'swipe', label: 'Swipe-through %' },
        { key: 'dm_shares', label: 'Compart. DM' },
      ]
    : [
        { key: 'saves', label: 'Saves' },
        { key: 'shares', label: 'Shares' },
        { key: 'swipe', label: 'Swipe-through %' },
        { key: 'dm_shares', label: 'Compart. DM' },
      ]
  const [vals, setVals] = useState<Record<string, string>>({})
  const itemReadings = useMemo(
    () =>
      metrics
        .filter((m) => m.contentId === item.id)
        .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)),
    [metrics, item.id],
  )
  const last = itemReadings[itemReadings.length - 1]

  const chartData = itemReadings.map((m) => ({
    date: new Date(m.measuredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    ...m.metrics,
  }))
  const metricKeys = useMemo(() => {
    const keys = new Set<string>()
    chartData.forEach((d) => Object.keys(d).forEach((k) => k !== 'date' && keys.add(k)))
    return Array.from(keys)
  }, [chartData])
  const lineColors = ['#7C5CFC', '#22D3EE', '#F472B6', '#F59E0B', '#34D399', '#60A5FA']
  const metricLabels: Record<string, string> = {
    saves: 'Saves',
    shares: 'Shares',
    swipe: 'Swipe-through %',
    watch_time: 'Watch time (s)',
    rewatch: 'Rewatch %',
    dm_shares: 'Compart. DM',
  }

  const save = () => {
    const numMetrics: Record<string, number> = {}
    Object.entries(vals).forEach(([k, v]) => {
      if (v) numMetrics[k] = Number(v)
    })
    if (!Object.keys(numMetrics).length) {
      toast.error('Preencha ao menos um valor.')
      return
    }
    onSave({
      id: uid('mr'),
      contentId: item.id,
      contentTitle: item.title,
      contentType: item.type,
      measuredAt: new Date().toISOString(),
      metrics: numMetrics,
    })
    setVals({})
    toast.success('Leitura salva! Histórico preservado.')
  }

  return (
    <div className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{item.title}</span>
        <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px] capitalize">
          {item.type}
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              type="number"
              className={inputClass}
              value={vals[f.key] || ''}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              placeholder={last?.metrics[f.key] != null ? String(last.metrics[f.key]) : '0'}
            />
          </Field>
        ))}
      </div>
      <div className="flex items-center justify-between">
        {last && (
          <span className="text-[10px] text-[#9494A8]">
            Última leitura: {new Date(last.measuredAt).toLocaleDateString('pt-BR')}
          </span>
        )}
        <Button size="sm" onClick={save} className="bg-[#7C5CFC] text-xs gap-1.5 ml-auto">
          <Save className="w-3.5 h-3.5" /> Salvar leitura
        </Button>
      </div>
      {/* Gráfico de evolução por item */}
      {chartData.length >= 2 && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#22D3EE]" />
            <p className="text-[11px] font-semibold text-white">Evolução das métricas</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[9px] text-[#9494A8] italic ml-1">
                  (todas as leituras manuais)
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                Leituras manuais — sem integração com redes sociais ativa.
              </TooltipContent>
            </Tooltip>
          </div>
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
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {metricKeys.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={metricLabels[k] || k}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {/* Histórico textual */}
      {itemReadings.length > 0 && (
        <div className="pt-2 border-t border-white/5 space-y-1 max-h-32 overflow-y-auto">
          {itemReadings
            .slice()
            .reverse()
            .map((m) => (
              <div key={m.id} className="flex items-center justify-between text-[10px]">
                <span className="text-[#9494A8] flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {new Date(m.measuredAt).toLocaleString('pt-BR')}
                </span>
                <span className="text-slate-400">
                  {Object.entries(m.metrics)
                    .map(([k, v]) => `${metricLabels[k] || k}: ${v}`)
                    .join(' • ')}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
