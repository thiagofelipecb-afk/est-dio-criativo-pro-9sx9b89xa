import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Compass,
  Printer,
  Link2,
  ArrowLeft,
  Sparkles,
  Brain,
  Radar as RadarIcon,
  Palette,
  TrendingUp,
  Swords,
  Filter,
  Trophy,
  BookOpen,
  FileBarChart,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Target,
  Users,
  MessageSquare,
  Zap,
  Megaphone,
  Tv,
  Crown,
  Quote,
  ListChecks,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandAsset, BrandProfile } from '@/types/platform'

/* Cores do tema LUMEN */
const COLORS = {
  purple: '#7C5CFC',
  cyan: '#22D3EE',
  amber: '#F59E0B',
  green: '#22c55e',
  red: '#ef4444',
  bg: '#0e0e15',
  card: '#14141C',
  border: '#ffffff14',
}

/* =====================================================================
   COMPONENTE PRINCIPAL
   ===================================================================== */

type LoadState = 'loading' | 'ready' | 'error'

export default function PosicionamentoDocumento() {
  const navigate = useNavigate()
  const { brandProfile } = usePlatform()
  const [view, setView] = useState<'completa' | 'resumida'>('completa')
  const [loadState, setLoadState] = useState<LoadState>('loading')

  const hasAssets = brandProfile.assets.length > 0

  const data = useMemo(() => buildDocData(brandProfile), [brandProfile])

  // Simula carregamento dos dados (estado de loading skeleton)
  useEffect(() => {
    setLoadState('loading')
    const t = setTimeout(() => {
      if (hasAssets) setLoadState('ready')
      else setLoadState('ready')
    }, 500)
    return () => clearTimeout(t)
  }, [hasAssets])

  // Seções presentes na versão resumida: 1 (mapa), 3 (arquétipo), 5 (concorrência), 8 (storytelling)
  const showSection = (n: number) => view === 'completa' || [1, 3, 5, 8].includes(n)

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado para a área de transferência!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const handleRetry = () => {
    setLoadState('loading')
    setTimeout(() => setLoadState('ready'), 600)
  }

  /* ---- Estado vazio: sem Brand OS ---- */
  if (!hasAssets && loadState === 'ready') {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-in">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-10 text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30">
            <FileBarChart className="w-8 h-8 text-[#7C5CFC]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Documento Visual Indisponível</h2>
            <p className="text-sm text-[#9494A8] max-w-md mx-auto mt-1">
              Gere o Brand OS primeiro no módulo de Posicionamento para liberar o documento visual
              completo da sua marca.
            </p>
          </div>
          <Button
            onClick={() => navigate('/posicionamento')}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
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
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Falha ao carregar o documento</h2>
            <p className="text-sm text-[#9494A8] max-w-md mx-auto mt-1">
              Não foi possível montar o documento visual. Verifique sua conexão e tente novamente.
            </p>
          </div>
          <Button
            onClick={handleRetry}
            className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-10 w-24" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-32" />
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-8 w-32" />
          </div>
        </div>
        <SkeletonBlock className="h-36 w-full rounded-2xl" />
        <SkeletonBlock className="h-64 w-full rounded-2xl" />
        <SkeletonBlock className="h-48 w-full rounded-2xl" />
        <SkeletonBlock className="h-72 w-full rounded-2xl" />
        <SkeletonBlock className="h-56 w-full rounded-2xl" />
      </div>
    )
  }

  /* ---- Documento pronto ---- */
  return (
    <div className="lumen-doc p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <style>{PRINT_STYLES}</style>
      <style>{ANIM_STYLES}</style>

      {/* Barra de ações (não imprime) */}
      <div className="doc-no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-20 bg-[#0e0e15]/90 backdrop-blur-md py-2 -mx-2 px-2 rounded-xl">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/posicionamento')}
          className="border-white/10 text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e15]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-lg overflow-hidden border border-white/10"
            role="tablist"
            aria-label="Versão do documento"
          >
            <button
              onClick={() => setView('resumida')}
              aria-pressed={view === 'resumida'}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-inset ${
                view === 'resumida'
                  ? 'bg-[#7C5CFC] text-white'
                  : 'bg-[#14141C] text-[#9494A8] hover:text-white'
              }`}
            >
              Versão Resumida
            </button>
            <button
              onClick={() => setView('completa')}
              aria-pressed={view === 'completa'}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-inset ${
                view === 'completa'
                  ? 'bg-[#7C5CFC] text-white'
                  : 'bg-[#14141C] text-[#9494A8] hover:text-white'
              }`}
            >
              Versão Completa
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-white/10 text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e15]"
          >
            <Link2 className="w-3.5 h-3.5" /> Copiar link
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e15]"
          >
            <Printer className="w-3.5 h-3.5" /> Salvar como PDF
          </Button>
          {hasAssets && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/posicionamento/okrs')}
              className="border-[#7C5CFC]/40 text-[#7C5CFC] hover:bg-[#7C5CFC]/10 text-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e15]"
            >
              <ListChecks className="w-3.5 h-3.5" /> Ver OKRs →
            </Button>
          )}
        </div>
      </div>

      {/* Cabeçalho */}
      <DocHeader data={data} />

      {/* Seção 1 — Mapa Mental da Marca */}
      {showSection(1) && (
        <Section
          n={1}
          title="Mapa Mental da Marca"
          icon={<Brain className="w-4 h-4" />}
          color={COLORS.purple}
        >
          <MindMap data={data} />
        </Section>
      )}

      {/* Seção 2 — Radar dos Pilares da Marca */}
      {showSection(2) && (
        <Section
          n={2}
          title="Pilares da Marca"
          icon={<RadarIcon className="w-4 h-4" />}
          color={COLORS.cyan}
        >
          <BrandPillarsRadar data={data} />
        </Section>
      )}

      {/* Seção 3 — Arquétipo */}
      {showSection(3) && (
        <Section
          n={3}
          title="Arquétipo da Marca"
          icon={<Palette className="w-4 h-4" />}
          color={COLORS.amber}
        >
          <ArchetypeCard data={data} />
        </Section>
      )}

      {/* Seção 4 — Esteira de Ofertas */}
      {showSection(4) && (
        <Section
          n={4}
          title="Esteira de Ofertas"
          icon={<TrendingUp className="w-4 h-4" />}
          color={COLORS.purple}
        >
          <OfferTimeline data={data} />
        </Section>
      )}

      {/* Seção 5 — Matriz de Concorrência (2x2) */}
      {showSection(5) && (
        <Section
          n={5}
          title="Matriz de Concorrência"
          icon={<Swords className="w-4 h-4" />}
          color={COLORS.cyan}
        >
          <CompetitorMatrix data={data} />
        </Section>
      )}

      {/* Seção 6 — Processo de 5 Etapas */}
      {showSection(6) && (
        <Section
          n={6}
          title="Processo de 5 Etapas"
          icon={<Filter className="w-4 h-4" />}
          color={COLORS.amber}
        >
          <FunnelProcess data={data} />
        </Section>
      )}

      {/* Seção 7 — Provas e Autoridade */}
      {showSection(7) && (
        <Section
          n={7}
          title="Provas e Autoridade"
          icon={<Trophy className="w-4 h-4" />}
          color={COLORS.purple}
        >
          <ProofCards data={data} />
        </Section>
      )}

      {/* Seção 8 — Storytelling de Origem */}
      {showSection(8) && (
        <Section
          n={8}
          title="Storytelling de Origem"
          icon={<BookOpen className="w-4 h-4" />}
          color={COLORS.cyan}
        >
          <OriginStory data={data} />
        </Section>
      )}

      {/* Rodapé */}
      <div className="doc-footer pt-6 border-t border-white/5 text-center">
        <p className="text-[10px] text-[#9494A8]">
          LUMEN Studio • Arquitetura Completa de Marca • v{brandProfile.activeVersion} • Gerado em{' '}
          {brandProfile.lastGeneratedAt
            ? new Date(brandProfile.lastGeneratedAt).toLocaleDateString('pt-BR')
            : '-'}
        </p>
      </div>
    </div>
  )
}

/* =====================================================================
   SKELETON
   ===================================================================== */

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-[#1C1C27] to-[#14141C] rounded-lg animate-pulse ${className}`}
    />
  )
}

/* =====================================================================
   HEADER
   ===================================================================== */

function DocHeader({ data }: { data: DocData }) {
  return (
    <header className="doc-header rounded-2xl bg-gradient-to-br from-[#1C1C27] via-[#14141C] to-[#0e0e15] border border-[#7C5CFC]/30 p-6 sm:p-8 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#22D3EE]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold text-white tracking-tight">LUMEN</span>
            <span className="text-base font-light text-[#9494A8] ml-1">Studio</span>
          </div>
        </div>
        <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
          v{data.version}
        </Badge>
      </div>
      <div className="mt-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Arquitetura Completa de Marca
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#9494A8]">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#7C5CFC]" />
            {data.niche || 'Nicho não definido'}
          </span>
          {data.subniche && <span>• {data.subniche}</span>}
          <span>• Gerado em {data.generatedAtLabel}</span>
        </div>
      </div>
    </header>
  )
}

/* =====================================================================
   SECTION WRAPPER — acessível via teclado (focus ring)
   ===================================================================== */

function Section({
  n,
  title,
  icon,
  color,
  children,
}: {
  n: number
  title: string
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <section
      tabIndex={-1}
      className="doc-section rounded-2xl bg-[#14141C] border border-white/5 p-5 sm:p-6 space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] animate-fade-in-up"
      aria-labelledby={`sec-${n}`}
    >
      <div className="flex items-center gap-2.5" id={`sec-${n}`}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold"
          style={{ background: color }}
        >
          {n}
        </div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

/* =====================================================================
   SEÇÃO 1 — MAPA MENTAL (8 ramificações nomeadas, nós coloridos, animação)
   ===================================================================== */

const MINDMAP_ICONS: React.ComponentType<{ className?: string; style?: React.CSSProperties }>[] = [
  Target, // Propósito
  Users, // Público
  MessageSquare, // Tom de Voz
  Zap, // Diferencial
  TrendingUp, // Oferta
  Megaphone, // Canais
  Swords, // Concorrentes
  Trophy, // Resultado
]

function MindMap({ data }: { data: DocData }) {
  const center = data.niche || 'Sua Marca'
  const branches = data.mindMapBranches
  const W = 760
  return (
    <div className="mind-map w-full overflow-x-auto">
      <div className="min-w-[680px] flex flex-col items-center gap-4 py-2">
        {/* Nó central */}
        <div className="relative animate-mindmap-center">
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-50"
            style={{ background: COLORS.purple }}
          />
          <div className="relative px-6 py-3 rounded-2xl bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-white font-extrabold text-center shadow-lg">
            {center}
          </div>
        </div>

        {/* Linhas conectoras SVG */}
        <svg
          className="absolute pointer-events-none"
          width={W}
          height="70"
          style={{ marginTop: -6 }}
        >
          {branches.map((_, i) => {
            const x = 70 + (i * (W - 140)) / Math.max(branches.length - 1, 1)
            return (
              <path
                key={i}
                d={`M ${W / 2} 0 Q ${(W / 2 + x) / 2} 35 ${x} 70`}
                fill="none"
                stroke={branches[i].color}
                strokeWidth="1.5"
                strokeOpacity="0.5"
                className="animate-mindmap-line"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            )
          })}
        </svg>

        {/* Ramificações */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-6">
          {branches.map((b, i) => {
            const Icon = MINDMAP_ICONS[i] || Brain
            return (
              <div
                key={i}
                className="rounded-xl border p-3 space-y-1.5 transition-transform hover:scale-[1.03] animate-mindmap-node"
                style={{
                  borderColor: `${b.color}40`,
                  background: `${b.color}0d`,
                  animationDelay: `${i * 80 + 200}ms`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: b.color }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: b.color }}
                  >
                    {b.title}
                  </span>
                </div>
                <ul className="space-y-1">
                  {b.items.map((item, j) => (
                    <li key={j} className="text-[10px] text-slate-300 leading-snug">
                      <span style={{ color: b.color }}>•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
   SEÇÃO 2 — RADAR DOS PILARES DA MARCA (6-8 eixos, preenchimento roxo)
   ===================================================================== */

function BrandPillarsRadar({ data }: { data: DocData }) {
  const pillars = data.brandPillars
  const cx = 140
  const cy = 140
  const r = 105
  const n = pillars.length

  const points = pillars
    .map((p, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const dist = (p.pct / 100) * r
      return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`
    })
    .join(' ')

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <svg
        width="280"
        height="280"
        className="shrink-0 animate-radar-in"
        role="img"
        aria-label="Gráfico radar dos pilares da marca"
      >
        {/* Grades concêntricas */}
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const pts = pillars
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2
              return `${cx + Math.cos(angle) * r * f},${cy + Math.sin(angle) * r * f}`
            })
            .join(' ')
          return <polygon key={f} points={pts} fill="none" stroke="#ffffff14" strokeWidth="1" />
        })}
        {/* Eixos */}
        {pillars.map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * r}
              y2={cy + Math.sin(angle) * r}
              stroke="#ffffff10"
              strokeWidth="1"
            />
          )
        })}
        {/* Polígono de dados (roxo semitransparente) */}
        <polygon
          points={points}
          fill={`${COLORS.purple}33`}
          stroke={COLORS.purple}
          strokeWidth="2"
        />
        {/* Pontos */}
        {pillars.map((p, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2
          const dist = (p.pct / 100) * r
          return (
            <circle
              key={i}
              cx={cx + Math.cos(angle) * dist}
              cy={cy + Math.sin(angle) * dist}
              r="3.5"
              fill={COLORS.cyan}
            />
          )
        })}
        {/* Labels */}
        {pillars.map((p, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2
          const lx = cx + Math.cos(angle) * (r + 20)
          const ly = cy + Math.sin(angle) * (r + 20)
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#A78BFA"
              fontSize="9"
              fontWeight="600"
            >
              {p.label}
            </text>
          )
        })}
      </svg>
      <div className="flex-1 space-y-2 w-full">
        {pillars.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-white w-32 truncate">{p.label}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${p.pct}%`, background: COLORS.purple }}
              />
            </div>
            <span className="text-[11px] font-bold text-white w-8 text-right">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =====================================================================
   SEÇÃO 3 — ARQUÉTIPO (ícone grande, descrição, manifesto, tom de voz)
   ===================================================================== */

const ARCHETYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  Herói: Crown,
  Explorador: Compass,
  Sábio: BookOpen,
  Guia: Target,
  Mago: Sparkles,
  Cuidador: Users,
  Criador: Palette,
  Governante: Trophy,
}

function ArchetypeCard({ data }: { data: DocData }) {
  const a = data.archetype
  const Icon = ARCHETYPE_ICONS[a.iconKey] || Palette
  return (
    <div
      className="rounded-2xl border p-5 space-y-4 animate-fade-in-up"
      style={{ borderColor: `${COLORS.amber}40`, background: `${COLORS.amber}0a` }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        {/* Ícone grande */}
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-40"
            style={{ background: COLORS.amber }}
          />
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl border"
            style={{ background: `${COLORS.amber}1a`, borderColor: `${COLORS.amber}40` }}
          >
            <Icon className="w-8 h-8" style={{ color: COLORS.amber }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-extrabold text-white">{a.name}</h3>
            <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 text-[10px]">
              Arquétipo Dominante
            </Badge>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-1">{a.description}</p>
        </div>
      </div>

      {/* Frase de manifesto */}
      <div
        className="rounded-xl border-l-4 p-4 flex items-start gap-2"
        style={{ borderColor: COLORS.amber, background: `${COLORS.amber}08` }}
      >
        <Quote className="w-4 h-4 shrink-0 mt-0.5" style={{ color: COLORS.amber }} />
        <p className="text-sm text-white italic leading-relaxed font-medium">“{a.manifesto}”</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-[#0e0e15]/60 p-3">
          <div className="text-[10px] font-bold text-[#F59E0B] uppercase mb-1.5">Cores</div>
          <div className="flex gap-1.5">
            {a.colors.map((c, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-md border border-white/10"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-[#0e0e15]/60 p-3">
          <div className="text-[10px] font-bold text-[#F59E0B] uppercase mb-1.5">Tom de Voz</div>
          <p className="text-[11px] text-slate-300 leading-snug">{a.tone}</p>
        </div>
        <div className="rounded-lg bg-[#0e0e15]/60 p-3">
          <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Usa</div>
          <p className="text-[11px] text-slate-300 leading-snug mb-2">{a.wordsUse}</p>
          <div className="text-[10px] font-bold text-red-400 uppercase mb-1">Nunca usa</div>
          <p className="text-[11px] text-slate-300 leading-snug">{a.wordsAvoid}</p>
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
   SEÇÃO 4 — ESTEIRA DE OFERTAS (Isca → Entrada → Core → Upsell → Recorrência)
   ===================================================================== */

function OfferTimeline({ data }: { data: DocData }) {
  const offers = data.offers
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-2 overflow-x-auto pb-1">
      <div className="flex flex-col lg:flex-row items-stretch gap-2 min-w-max lg:min-w-0">
        {offers.map((o, i) => (
          <React.Fragment key={i}>
            <div
              className="flex-1 rounded-xl border p-3 space-y-1 min-w-[150px] transition-transform hover:scale-[1.02] animate-fade-in-up"
              style={{
                borderColor: `${o.color}40`,
                background: `${o.color}0d`,
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: o.color }}
              >
                {o.tier}
              </div>
              <div className="text-xs font-bold text-white">{o.name}</div>
              <div className="text-[10px] text-slate-300 leading-snug">{o.description}</div>
              {o.price && <div className="text-[11px] font-bold text-white mt-0.5">{o.price}</div>}
            </div>
            {i < offers.length - 1 && (
              <div className="flex items-center justify-center">
                <div className="hidden lg:block w-6 h-0.5" style={{ background: COLORS.purple }} />
                <span className="lg:hidden text-[#7C5CFC]">↓</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

/* =====================================================================
   SEÇÃO 5 — MATRIZ DE CONCORRÊNCIA (quadrantes 2x2)
   ===================================================================== */

function CompetitorMatrix({ data }: { data: DocData }) {
  const { competitors, ownPositioning, niche } = data
  // Pontos: eixo X = Diferenciação (0-100), eixo Y = Preço/Valor percebido (0-100)
  const size = 280
  const pad = 40
  const plot = size - pad * 2

  const own = {
    name: niche || 'Sua Marca',
    x: 78,
    y: 70,
    isOwn: true,
  }
  const compPoints = competitors.map((c, i) => ({
    name: c.name,
    x: 30 + i * 18,
    y: 45 - i * 12,
    isOwn: false,
  }))
  const all = [own, ...compPoints]

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6">
      <div className="overflow-x-auto w-full lg:w-auto">
        <svg
          width={size}
          height={size}
          className="shrink-0 mx-auto"
          role="img"
          aria-label="Matriz de concorrência: Diferenciação vs Valor percebido"
        >
          {/* Quadrantes */}
          <rect x={pad} y={pad} width={plot} height={plot} fill="#0e0e15" stroke="#ffffff14" />
          {/* Linhas centrais (eixos 2x2) */}
          <line
            x1={pad + plot / 2}
            y1={pad}
            x2={pad + plot / 2}
            y2={pad + plot}
            stroke="#ffffff20"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <line
            x1={pad}
            y1={pad + plot / 2}
            x2={pad + plot}
            y2={pad + plot / 2}
            stroke="#ffffff20"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          {/* Labels dos quadrantes */}
          <text x={pad + 6} y={pad + 14} fill="#9494A8" fontSize="8">
            Alto valor · Baixa diferenciação
          </text>
          <text x={pad + plot / 2 + 6} y={pad + 14} fill="#9494A8" fontSize="8">
            Alto valor · Alta diferenciação
          </text>
          <text x={pad + 6} y={pad + plot - 6} fill="#9494A8" fontSize="8">
            Baixo valor · Baixa diferenciação
          </text>
          <text x={pad + plot / 2 + 6} y={pad + plot - 6} fill="#9494A8" fontSize="8">
            Baixo valor · Alta diferenciação
          </text>
          {/* Eixos */}
          <text
            x={pad + plot / 2}
            y={size - 8}
            fill="#A78BFA"
            fontSize="9"
            textAnchor="middle"
            fontWeight="600"
          >
            Diferenciação →
          </text>
          <text
            x={12}
            y={pad + plot / 2}
            fill="#A78BFA"
            fontSize="9"
            textAnchor="middle"
            fontWeight="600"
            transform={`rotate(-90 12 ${pad + plot / 2})`}
          >
            Valor percebido →
          </text>
          {/* Pontos */}
          {all.map((p, i) => {
            const px = pad + (p.x / 100) * plot
            const py = pad + plot - (p.y / 100) * plot
            return (
              <g
                key={i}
                className="animate-mindmap-node"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {p.isOwn ? (
                  <>
                    <circle cx={px} cy={py} r="10" fill={`${COLORS.purple}33`} />
                    <circle
                      cx={px}
                      cy={py}
                      r="6"
                      fill={COLORS.purple}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  </>
                ) : (
                  <circle cx={px} cy={py} r="5" fill={COLORS.cyan} stroke="#fff" strokeWidth="1" />
                )}
                <text
                  x={px}
                  y={py - 12}
                  fill={p.isOwn ? '#fff' : '#9494A8'}
                  fontSize="8"
                  textAnchor="middle"
                  fontWeight={p.isOwn ? '700' : '400'}
                >
                  {p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legenda / tabela compacta */}
      <div className="flex-1 space-y-2 w-full">
        <div className="rounded-lg bg-[#0e0e15]/60 p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full" style={{ background: COLORS.purple }} />
            <span className="text-xs font-bold text-white">{own.name}</span>
            <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/40 text-[9px]">
              Você
            </Badge>
          </div>
          <p className="text-[10px] text-[#9494A8]">{ownPositioning.differential}</p>
        </div>
        {competitors.map((c, i) => (
          <div key={i} className="rounded-lg bg-[#0e0e15]/60 p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS.cyan }} />
              <span className="text-xs font-bold text-white">{c.name}</span>
            </div>
            <p className="text-[10px] text-[#9494A8]">{c.differential || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =====================================================================
   SEÇÃO 6 — FUNIL DE 5 ETAPAS (vertical)
   ===================================================================== */

function FunnelProcess({ data }: { data: DocData }) {
  const steps = data.process
  return (
    <div className="flex flex-col items-center gap-1">
      {steps.map((s, i) => {
        const width = 100 - i * 14
        return (
          <React.Fragment key={i}>
            <div
              className="rounded-xl border p-3 flex items-center gap-3 transition-transform hover:scale-[1.02] w-full"
              style={{
                maxWidth: `${width}%`,
                borderColor: `${COLORS.purple}40`,
                background: `linear-gradient(90deg, ${COLORS.purple}1a, ${COLORS.purple}05)`,
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-bold"
                style={{ background: COLORS.purple }}
              >
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{s.name}</div>
                <div className="text-[10px] text-slate-300 leading-snug">{s.description}</div>
              </div>
            </div>
            {i < steps.length - 1 && <div className="text-[#7C5CFC] text-xs">↓</div>}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* =====================================================================
   SEÇÃO 7 — PROVAS E AUTORIDADE
   ===================================================================== */

function ProofCards({ data }: { data: DocData }) {
  const proofs = data.proofs
  if (proofs.length === 0) {
    return (
      <p className="text-xs text-[#9494A8]">
        Nenhuma prova registrada. Preencha depoimentos, cases e números na pesquisa de
        Posicionamento.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {proofs.map((p, i) => (
        <div key={i} className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase">{p.type}</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{p.content}</p>
        </div>
      ))}
    </div>
  )
}

/* =====================================================================
   SEÇÃO 8 — STORYTELLING DE ORIGEM (linha do tempo)
   ===================================================================== */

function OriginStory({ data }: { data: DocData }) {
  const events = data.originTimeline
  return (
    <div
      className="rounded-2xl border-l-4 p-5 space-y-4"
      style={{ borderColor: COLORS.cyan, background: `${COLORS.cyan}08` }}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: COLORS.cyan }} />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: COLORS.cyan }}
        >
          História de Origem
        </span>
      </div>

      {/* Linha do tempo */}
      {events.length > 0 && (
        <ol
          className="relative space-y-4 pl-5 border-l-2"
          style={{ borderColor: `${COLORS.cyan}40` }}
        >
          {events.map((ev, i) => (
            <li
              key={i}
              className="relative animate-fade-in-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <span
                className="absolute -left-[1.65rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2"
                style={{ background: COLORS.cyan, borderColor: '#0e0e15' }}
              />
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: COLORS.cyan }}
              >
                {ev.label}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed mt-0.5">{ev.text}</p>
            </li>
          ))}
        </ol>
      )}

      {/* Prosa destacada */}
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap italic">
        {data.originStory}
      </p>
    </div>
  )
}

/* =====================================================================
   TIPOS E BUILD DE DADOS
   ===================================================================== */

interface DocData {
  niche: string
  subniche: string
  version: number
  generatedAtLabel: string
  mindMapBranches: { title: string; color: string; items: string[] }[]
  brandPillars: { label: string; pct: number }[]
  archetype: {
    name: string
    iconKey: string
    description: string
    manifesto: string
    colors: string[]
    tone: string
    wordsUse: string
    wordsAvoid: string
  }
  offers: { tier: string; name: string; description: string; price?: string; color: string }[]
  competitors: {
    name: string
    differential: string
    price: string
    audience: string
    weakness: string
  }[]
  ownPositioning: { differential: string; price: string; audience: string; weakness: string }
  process: { name: string; description: string }[]
  proofs: { type: string; content: string }[]
  originStory: string
  originTimeline: { label: string; text: string }[]
}

function getAsset(assets: BrandAsset[], type: string) {
  return assets.find((a) => a.type === type)
}

function buildDocData(profile: BrandProfile): DocData {
  const base = profile.base
  const research = profile.research
  const assets = profile.assets
  const interview = profile.interview

  const r = (key: string) => research.find((x) => x.fieldKey === key)?.value || ''
  const i = (code: string) => interview.find((x) => x.guideCode === code)?.transcript || ''
  const asset = (type: string) => getAsset(assets, type)?.content || ''

  const niche = base.niche?.trim() || 'Sua Marca'
  const subniche = base.subniche?.trim() || ''

  /* ---- Mapa mental — 8 ramificações nomeadas ---- */
  const mindMapBranches = [
    {
      title: 'Propósito',
      color: COLORS.purple,
      items: [
        asset('posicionamento').split('\n')[0].slice(0, 70),
        asset('promessa').split('\n')[0].slice(0, 70),
      ],
    },
    {
      title: 'Público',
      color: COLORS.cyan,
      items: [
        base.audience?.split('\n')[0].slice(0, 70) || '—',
        r('idade_ideal') || r('renda_media') || '—',
      ],
    },
    {
      title: 'Tom de Voz',
      color: COLORS.amber,
      items: [
        base.voice || asset('tom_de_voz').split('\n')[0].slice(0, 70) || '—',
        asset('vocabulario').split('\n')[0].slice(0, 70),
      ],
    },
    {
      title: 'Diferencial',
      color: COLORS.purple,
      items: [base.differential?.split('\n')[0].slice(0, 70) || '—'],
    },
    {
      title: 'Oferta',
      color: COLORS.cyan,
      items: [
        base.mainOffer?.split('\n')[0].slice(0, 70) ||
          asset('oferta_principal').split('\n')[0].slice(0, 70),
      ],
    },
    {
      title: 'Canais',
      color: COLORS.amber,
      items: [
        r('consome_conteudo') || 'Instagram, YouTube',
        asset('linha_editorial').split('\n')[0].slice(0, 70),
      ],
    },
    {
      title: 'Concorrentes',
      color: COLORS.red,
      items: (r('concorrentes') || '—')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2),
    },
    {
      title: 'Resultado',
      color: COLORS.green,
      items: [base.result?.split('\n')[0].slice(0, 70) || '—'],
    },
  ]

  /* ---- Pilares da marca (6-8 eixos de força) ---- */
  const hasPos = !!asset('posicionamento').trim()
  const hasArq = !!asset('arquetipo').trim()
  const hasTom = !!asset('tom_de_voz').trim()
  const hasProva = !!asset('stack_de_prova').trim()
  const hasVisual = !!asset('identidade_visual').trim()
  const hasPilares = !!asset('pilares_de_conteudo').trim()
  const hasStory = !!asset('storytelling').trim()
  const hasOferta = !!asset('oferta_principal').trim()
  const brandPillars = [
    { label: 'Clareza', pct: hasPos ? 82 : 45 },
    { label: 'Autoridade', pct: hasProva ? 78 : 40 },
    { label: 'Diferenciação', pct: base.differential ? 85 : 35 },
    { label: 'Conexão', pct: hasStory ? 74 : 38 },
    { label: 'Consistência', pct: hasPilares && hasTom ? 80 : 42 },
    { label: 'Identidade', pct: hasVisual ? 72 : 30 },
    { label: 'Oferta', pct: hasOferta ? 88 : 33 },
    { label: 'Arquétipo', pct: hasArq ? 76 : 28 },
  ]

  /* ---- Arquétipo ---- */
  const archetype = {
    name: 'O Sábio + O Guia',
    iconKey: 'Sábio',
    description:
      asset('arquetipo') ||
      `Você traduz complexidade de ${niche} em clareza prática e conduz o cliente até a transformação.`,
    manifesto:
      i('G7')?.slice(0, 180) ||
      `Nasci para mostrar que ${base.result || 'a transformação'} é possível quando se tem método, e não sorte.`,
    colors: (r('cores_marca') || `${COLORS.purple},${COLORS.cyan}`)
      .split(/[,;]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 5),
    tone: asset('tom_de_voz') || base.voice || 'Direto, técnico-acessível e motivador.',
    wordsUse: r('palavras_usa') || '—',
    wordsAvoid: r('palavras_nunca') || '—',
  }

  /* ---- Esteira de ofertas (Isca → Entrada → Core → Upsell → Recorrência) ---- */
  const offers = [
    {
      tier: 'Isca',
      name: r('oferta_entrada') || 'Isca gratuita',
      description: 'Atrai e qualifica o lead',
      price: 'Grátis',
      color: COLORS.cyan,
    },
    {
      tier: 'Produto de Entrada',
      name: 'Tripwire / Baixo ticket',
      description: 'Converte lead em cliente pagante',
      price: r('ticket_medio') ? `até R$97` : 'R$7–R$97',
      color: COLORS.green,
    },
    {
      tier: 'Oferta Core',
      name: r('oferta_principal') || base.service || 'Oferta principal',
      description: base.result || 'Transformação central',
      price: r('ticket_medio') || '',
      color: COLORS.purple,
    },
    {
      tier: 'Upsell',
      name: r('upsell_1') || 'Upsell',
      description: 'Aprofundamento do método',
      color: COLORS.amber,
    },
    {
      tier: 'Recorrência',
      name: r('upsell_2') || r('oferta_premium') || 'Assinatura / Mastermind',
      description: 'Acesso exclusivo contínuo',
      color: COLORS.purple,
    },
  ].filter((o) => o.name)

  /* ---- Concorrentes ---- */
  const compNames = (r('concorrentes') || 'Concorrente A, Concorrente B')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
  while (compNames.length < 2)
    compNames.push(`Concorrente ${String.fromCharCode(65 + compNames.length)}`)
  const competitors = compNames.map((name, idx) => ({
    name,
    differential: idx === 0 ? r('dif_concorrente_a') : r('dif_concorrente_b'),
    price: '—',
    audience: '—',
    weakness: idx === 0 ? r('dif_concorrente_a') : r('dif_concorrente_b'),
  }))
  const ownPositioning = {
    differential: base.differential || '—',
    price: r('ticket_medio') || '—',
    audience: base.audience || '—',
    weakness: '—',
  }

  /* ---- Processo de 5 etapas ---- */
  const process = [1, 2, 3, 4, 5].map((n) => ({
    name: r(`etapa_${n}`) || `Etapa ${n}`,
    description: `Passo ${n} do método`,
  }))

  /* ---- Provas ---- */
  const proofs: { type: string; content: string }[] = []
  if (r('depoimentos')) proofs.push({ type: 'Depoimentos', content: r('depoimentos') })
  if (r('cases')) proofs.push({ type: 'Cases', content: r('cases') })
  if (r('redes_seguidores')) proofs.push({ type: 'Seguidores', content: r('redes_seguidores') })
  if (r('selos_premiacoes')) proofs.push({ type: 'Premiações', content: r('selos_premiacoes') })
  if (r('midia')) proofs.push({ type: 'Mídia', content: r('midia') })

  /* ---- Storytelling + linha do tempo ---- */
  const originStory =
    i('G1') ||
    asset('storytelling') ||
    `A jornada começa quando você percebeu que ${base.audience || 'seus clientes'} precisavam de ${base.result || 'transformação'}, mas as opções de ${niche} não entregavam ${base.differential?.toLowerCase() || 'diferencial'}. Decidiu construir um caminho próprio.`

  const originTimeline = [
    {
      label: 'O insight',
      text:
        i('momento_aha') ||
        `Percebi que ${base.audience || 'meus clientes'} não tinham clareza em ${niche}.`,
    },
    {
      label: 'A virada',
      text: `Construí um método próprio focado em ${base.differential?.toLowerCase() || 'resultados reais'}.`,
    },
    {
      label: 'A prova',
      text:
        r('cases') ||
        `Os primeiros clientes alcançaram ${base.result?.toLowerCase() || 'transformação'}.`,
    },
    {
      label: 'O legado',
      text:
        i('G7')?.slice(0, 160) ||
        `Hoje a missão é levar ${base.result?.toLowerCase() || 'esse método'} para mais pessoas.`,
    },
  ]

  return {
    niche,
    subniche,
    version: profile.activeVersion,
    generatedAtLabel: profile.lastGeneratedAt
      ? new Date(profile.lastGeneratedAt).toLocaleDateString('pt-BR')
      : '—',
    mindMapBranches,
    brandPillars,
    archetype,
    offers,
    competitors,
    ownPositioning,
    process,
    proofs,
    originStory,
    originTimeline,
  }
}

/* =====================================================================
   ESTILOS — animações + impressão
   ===================================================================== */

const ANIM_STYLES = `
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.5s ease-out both; }
@keyframes mindmap-center {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
.animate-mindmap-center { animation: mindmap-center 0.5s ease-out both; }
@keyframes mindmap-line {
  from { stroke-dashoffset: 200; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: 0.5; }
}
.animate-mindmap-line { stroke-dasharray: 200; animation: mindmap-line 0.8s ease-out both; }
@keyframes mindmap-node {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-mindmap-node { animation: mindmap-node 0.5s ease-out both; }
@keyframes radar-in {
  from { opacity: 0; transform: scale(0.7); transform-origin: center; }
  to { opacity: 1; transform: scale(1); }
}
.animate-radar-in { animation: radar-in 0.7s ease-out both; }
`

const PRINT_STYLES = `
@media print {
  .doc-no-print { display: none !important; }
  .lumen-doc {
    background: #ffffff !important;
    color: #111111 !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
  .lumen-doc * {
    color: #111111 !important;
    border-color: #cccccc !important;
  }
  .doc-header, .doc-section {
    background: #ffffff !important;
    border: 1px solid #cccccc !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .doc-header h1, .doc-section h2, .lumen-doc h1, .lumen-doc h2, .lumen-doc h3 {
    color: #111111 !important;
  }
  .mind-map, .doc-section { break-inside: avoid; }
  svg { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .lumen-doc button { display: none !important; }
}
`
