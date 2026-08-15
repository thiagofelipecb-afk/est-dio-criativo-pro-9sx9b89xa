import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Film,
  FolderKanban,
  Download,
  TrendingUp,
  Trophy,
  Clock,
  Edit3,
  Flame,
  Instagram,
  Youtube,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Project } from '@/types/studio'
import type { Post } from '@/types/library'

/* ===========================================================================
   Analytics — Dashboard de métricas reais de uso da plataforma
   Lê dados do localStorage (projetos, posts, gravações, exportações) e
   monta KPIs, gráficos, distribuições e conquistas.
   =========================================================================== */

type Period = '7d' | '30d' | '90d' | 'year'

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  year: 365,
}

const PALETTE = ['#7C5CFC', '#22D3EE', '#FBBF24', '#F472B6', '#34D399', '#FB7185']

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function formatDay(key: string): string {
  const [y, m, d] = key.split('-')
  return `${d}/${m}`
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)

  // Dados brutos do localStorage
  const [projects, setProjects] = useState<Project[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [recordings, setRecordings] = useState<number>(0)
  const [exportsCount, setExportsCount] = useState<number>(0)

  useEffect(() => {
    const p = safeParse<Project[]>('lumen_projects', [])
    setProjects(p)
    setPosts(safeParse<Post[]>('lumen_posts', []))
    setRecordings(Number(localStorage.getItem('lumen_recordings_count') || 0))
    setExportsCount(Number(localStorage.getItem('lumen_exports_count') || 0))
    setLoading(false)
  }, [])

  // Filtra projetos pelo período
  const periodDays = PERIOD_DAYS[period]
  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - periodDays)
    return d.getTime()
  }, [periodDays])

  const periodProjects = useMemo(
    () => projects.filter((p) => new Date(p.createdAt).getTime() >= cutoff),
    [projects, cutoff],
  )

  // KPIs
  const totalProjects = projects.length
  const totalRecordings = recordings || projects.filter((p) => p.duration > 0).length
  const totalExports = exportsCount || projects.filter((p) => p.status === 'ready').length
  const completionRate = totalProjects > 0 ? Math.round((totalExports / totalProjects) * 100) : 0

  // Gráfico de atividade — projetos criados por dia
  const activityData = useMemo(() => {
    const map: Record<string, number> = {}
    const today = new Date()
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      map[dayKey(d)] = 0
    }
    projects.forEach((p) => {
      const k = dayKey(new Date(p.createdAt))
      if (k in map) map[k]++
    })
    // Se período > 30 dias, agrupa por semana para legibilidade
    if (periodDays > 30) {
      const entries = Object.entries(map)
      const weekly: { label: string; projetos: number }[] = []
      for (let i = 0; i < entries.length; i += 7) {
        const slice = entries.slice(i, i + 7)
        const sum = slice.reduce((s, [, v]) => s + v, 0)
        weekly.push({ label: formatDay(slice[0][0]), projetos: sum })
      }
      return weekly
    }
    return Object.entries(map).map(([k, v]) => ({ label: formatDay(k), projetos: v }))
  }, [projects, periodDays])

  // Distribuição por tipo
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach((p) => {
      const t =
        p.type === 'reel'
          ? 'Reels'
          : p.type === 'youtube'
            ? 'Vídeos longos'
            : p.type === 'carousel'
              ? 'Carrosséis'
              : 'Posts'
      counts[t] = (counts[t] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [projects])

  // Top plataformas (postagens agendadas)
  const platformData = useMemo(() => {
    const counts: Record<string, number> = { Instagram: 0, TikTok: 0, YouTube: 0 }
    posts.forEach((p) => {
      p.platforms.forEach((pl) => {
        const label = pl === 'instagram' ? 'Instagram' : pl === 'tiktok' ? 'TikTok' : 'YouTube'
        counts[label]++
      })
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [posts])

  // Horas de gravação (minutos acumulados)
  const totalRecordingMinutes = useMemo(
    () => projects.reduce((s, p) => s + (p.duration || 0) / 60, 0),
    [projects],
  )

  // Tempo médio de edição (entre createdAt e updatedAt para projetos exportados)
  const avgEditTime = useMemo(() => {
    const exported = projects.filter((p) => p.status === 'ready')
    if (exported.length === 0) return 0
    const totalMs = exported.reduce((s, p) => {
      const created = new Date(p.createdAt).getTime()
      const updated = new Date(p.updatedAt).getTime()
      return s + Math.max(0, updated - created)
    }, 0)
    return Math.round(totalMs / exported.length / (1000 * 60)) // minutos
  }, [projects])

  // Conquistas
  const achievements = useMemo(() => {
    return [
      {
        id: 'first-video',
        label: 'Primeiro vídeo',
        desc: 'Crie seu primeiro projeto',
        icon: Film,
        unlocked: totalProjects >= 1,
      },
      {
        id: 'ten-projects',
        label: '10 projetos',
        desc: 'Crie 10 projetos',
        icon: FolderKanban,
        unlocked: totalProjects >= 10,
      },
      {
        id: 'fifty-recordings',
        label: '50 gravações',
        desc: 'Registre 50 gravações',
        icon: Clock,
        unlocked: totalRecordings >= 50,
      },
      {
        id: 'hundred-exports',
        label: '100 exportações',
        desc: 'Exporte 100 vídeos',
        icon: Download,
        unlocked: totalExports >= 100,
      },
      {
        id: 'first-export',
        label: 'Primeira exportação',
        desc: 'Exporte seu primeiro vídeo',
        icon: Download,
        unlocked: totalExports >= 1,
      },
      {
        id: 'five-projects',
        label: '5 projetos',
        desc: 'Crie 5 projetos',
        icon: FolderKanban,
        unlocked: totalProjects >= 5,
      },
      {
        id: 'twenty-exports',
        label: '20 exportações',
        desc: 'Exporte 20 vídeos',
        icon: TrendingUp,
        unlocked: totalExports >= 20,
      },
      {
        id: 'scheduled-five',
        label: '5 agendamentos',
        desc: 'Agende 5 postagens',
        icon: Clock,
        unlocked: posts.length >= 5,
      },
    ]
  }, [totalProjects, totalRecordings, totalExports, posts.length])

  const hasData = totalProjects > 0 || posts.length > 0 || totalRecordings > 0

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#14141C] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-[#14141C] rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-[#7C5CFC]" />
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Métricas reais de uso da plataforma — projetos, gravações, exportações e conquistas.
          </p>
        </div>
        {/* Seletor de período */}
        <div className="flex items-center gap-1.5 bg-[#14141C] border border-white/5 rounded-xl p-1">
          {(['7d', '30d', '90d', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                period === p
                  ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
            >
              {p === '7d'
                ? '7 dias'
                : p === '30d'
                  ? '30 dias'
                  : p === '90d'
                    ? '90 dias'
                    : 'Este ano'}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e0e15]/60 py-20 text-center">
          <BarChart3 className="w-12 h-12 text-[#9494A8]/40 mx-auto mb-4" />
          <p className="text-sm text-[#9494A8] mb-1">Nenhum dado ainda</p>
          <p className="text-xs text-[#9494A8]/70">
            Crie seu primeiro projeto para ver suas métricas!
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<FolderKanban className="w-5 h-5" />}
              label="Total de projetos"
              value={String(totalProjects)}
              accent="#7C5CFC"
            />
            <KpiCard
              icon={<Film className="w-5 h-5" />}
              label="Total de gravações"
              value={String(totalRecordings)}
              accent="#22D3EE"
            />
            <KpiCard
              icon={<Download className="w-5 h-5" />}
              label="Total de exportações"
              value={String(totalExports)}
              accent="#FBBF24"
            />
            <KpiCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Taxa de conclusão"
              value={`${completionRate}%`}
              accent="#34D399"
            />
          </div>

          {/* Gráfico de atividade */}
          <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#7C5CFC]" />
              Projetos criados por {periodDays > 30 ? 'semana' : 'dia'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#9494A8', fontSize: 10 }}
                    interval={periodDays > 30 ? 0 : Math.floor(activityData.length / 8)}
                  />
                  <YAxis tick={{ fill: '#9494A8', fontSize: 10 }} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{
                      background: '#1C1C27',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#9494A8' }}
                  />
                  <Bar dataKey="projetos" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid: Distribuição por tipo + Top plataformas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Distribuição por tipo</h3>
              {typeData.length === 0 ? (
                <p className="text-xs text-[#9494A8] py-8 text-center">Sem dados</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {typeData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          background: '#1C1C27',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#9494A8' }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Top plataformas (agendadas)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#9494A8', fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#9494A8', fontSize: 11 }}
                      width={70}
                    />
                    <RTooltip
                      contentStyle={{
                        background: '#1C1C27',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" fill="#22D3EE" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Horas de gravação + Tempo médio de edição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE]">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#9494A8]">Horas de gravação</p>
                <p className="text-2xl font-bold text-white">
                  {(totalRecordingMinutes / 60).toFixed(1)}h
                </p>
                <p className="text-[10px] text-[#9494A8]">
                  {Math.round(totalRecordingMinutes)} min acumulados
                </p>
              </div>
            </div>
            <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#FBBF24]/10 text-[#FBBF24]">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#9494A8]">Tempo médio de edição</p>
                <p className="text-2xl font-bold text-white">
                  {avgEditTime > 0 ? `${avgEditTime} min` : '—'}
                </p>
                <p className="text-[10px] text-[#9494A8]">Entre criar e exportar</p>
              </div>
            </div>
          </div>

          {/* Conquistas */}
          <div className="bg-[#14141C] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FBBF24]" />
              Conquistas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {achievements.map((a) => {
                const Icon = a.icon
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      a.unlocked
                        ? 'border-[#FBBF24]/30 bg-[#FBBF24]/5'
                        : 'border-white/5 bg-[#0e0e15]/60 opacity-50'
                    }`}
                  >
                    <div
                      className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        a.unlocked ? 'bg-[#FBBF24]/20 text-[#FBBF24]' : 'bg-white/5 text-[#9494A8]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p
                      className={`text-xs font-bold ${a.unlocked ? 'text-white' : 'text-[#9494A8]'}`}
                    >
                      {a.label}
                    </p>
                    <p className="text-[10px] text-[#9494A8] mt-0.5">{a.desc}</p>
                    {a.unlocked && (
                      <span className="inline-block mt-1 text-[9px] text-[#FBBF24] font-bold">
                        ✓ Desbloqueado
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}1a`, color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#9494A8]">{label}</p>
        <p className="text-2xl font-extrabold text-white">{value}</p>
      </div>
    </div>
  )
}
