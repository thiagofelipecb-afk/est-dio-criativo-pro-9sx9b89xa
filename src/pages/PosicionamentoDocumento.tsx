import React, { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandAsset, BrandProfile } from '@/types/platform'

/* Cores do tema LUMEN */
const COLORS = {
  purple: '#7C5CFC',
  cyan: '#22D3EE',
  amber: '#F59E0B',
  bg: '#0e0e15',
  card: '#14141C',
  border: '#ffffff14',
}

const LAYER_LABELS: Record<string, string> = {
  quem_voce_e: 'Quem Você É',
  como_voce_fala: 'Como Você Fala',
  como_voce_prova: 'Como Você Prova',
  como_voce_publica: 'Como Você Publica',
  como_voce_vende: 'Como Você Vende',
}

function getAsset(assets: BrandAsset[], type: string) {
  return assets.find((a) => a.type === type)
}

export default function PosicionamentoDocumento() {
  const navigate = useNavigate()
  const { brandProfile } = usePlatform()
  const [view, setView] = useState<'completa' | 'resumida'>('completa')

  const hasAssets = brandProfile.assets.length > 0

  const data = useMemo(() => buildDocData(brandProfile), [brandProfile])

  // Seções: 1 (mapa mental), 3 (arquétipo), 5 (concorrência), 8 (storytelling) no resumido
  const showSection = (n: number) => view === 'completa' || [1, 3, 5, 8].includes(n)

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado para a área de transferência!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  if (!hasAssets) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-in">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-10 text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30">
            <FileBarChart className="w-8 h-8 text-[#7C5CFC]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Documento Visual Indisponível</h2>
            <p className="text-sm text-[#9494A8] max-w-md mx-auto mt-1">
              Você ainda não gerou seu Brand OS. Gere os ativos de marca no módulo de Posicionamento
              para liberar o documento visual completo.
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

  return (
    <div className="lumen-doc p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <style>{PRINT_STYLES}</style>

      {/* Barra de ações (não imprime) */}
      <div className="doc-no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-20 bg-[#0e0e15]/90 backdrop-blur-md py-2 -mx-2 px-2 rounded-xl">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/posicionamento')}
          className="border-white/10 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => setView('resumida')}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                view === 'resumida'
                  ? 'bg-[#7C5CFC] text-white'
                  : 'bg-[#14141C] text-[#9494A8] hover:text-white'
              }`}
            >
              Versão Resumida
            </button>
            <button
              onClick={() => setView('completa')}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
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
            className="border-white/10 text-xs gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5" /> Copiar link
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Salvar como PDF
          </Button>
        </div>
      </div>

      {/* Cabeçalho do documento */}
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

      {/* Seção 2 — Gráfico de Pilares de Conteúdo (radar) */}
      {showSection(2) && (
        <Section
          n={2}
          title="Pilares de Conteúdo"
          icon={<RadarIcon className="w-4 h-4" />}
          color={COLORS.cyan}
        >
          <PillarsRadar data={data} />
        </Section>
      )}

      {/* Seção 3 — Arquétipo Visual */}
      {showSection(3) && (
        <Section
          n={3}
          title="Arquétipo Visual"
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

      {/* Seção 5 — Matriz de Concorrência */}
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
   HEADER
   ===================================================================== */

function DocHeader({ data }: { data: DocData }) {
  return (
    <div className="doc-header rounded-2xl bg-gradient-to-br from-[#1C1C27] via-[#14141C] to-[#0e0e15] border border-[#7C5CFC]/30 p-6 sm:p-8">
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
    </div>
  )
}

/* =====================================================================
   SECTION WRAPPER
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
    <section className="doc-section rounded-2xl bg-[#14141C] border border-white/5 p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
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
   SEÇÃO 1 — MAPA MENTAL (CSS puro)
   ===================================================================== */

function MindMap({ data }: { data: DocData }) {
  const center = data.niche || 'Sua Marca'
  const branches = data.mindMapBranches
  return (
    <div className="mind-map w-full overflow-x-auto">
      <div className="min-w-[680px] flex flex-col items-center gap-4 py-2">
        {/* Nó central */}
        <div className="relative">
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
          width="680"
          height="60"
          style={{ marginTop: -8 }}
        >
          {branches.map((_, i) => {
            const x = 80 + (i * (680 - 160)) / (branches.length - 1)
            return (
              <line
                key={i}
                x1="340"
                y1="0"
                x2={x}
                y2="60"
                stroke={branches[i].color}
                strokeWidth="1.5"
                strokeOpacity="0.5"
              />
            )
          })}
        </svg>

        {/* Ramificações */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full mt-4">
          {branches.map((b, i) => (
            <div
              key={i}
              className="rounded-xl border p-3 space-y-1.5"
              style={{ borderColor: `${b.color}40`, background: `${b.color}0d` }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: b.color }}
              >
                {b.title}
              </div>
              <ul className="space-y-1">
                {b.items.map((item, j) => (
                  <li key={j} className="text-[10px] text-slate-300 leading-snug">
                    <span style={{ color: b.color }}>•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
   SEÇÃO 2 — RADAR DE PILARES (SVG)
   ===================================================================== */

function PillarsRadar({ data }: { data: DocData }) {
  const pillars = data.pillars
  const cx = 130
  const cy = 130
  const r = 100
  const n = pillars.length

  // pontos do polígono de dados
  const points = pillars
    .map((p, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const dist = (p.pct / 100) * r
      return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`
    })
    .join(' ')

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <svg width="260" height="260" className="shrink-0">
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
        {/* Polígono de dados */}
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
              r="3"
              fill={COLORS.cyan}
            />
          )
        })}
        {/* Labels */}
        {pillars.map((p, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2
          const lx = cx + Math.cos(angle) * (r + 18)
          const ly = cy + Math.sin(angle) * (r + 18)
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#9494A8"
              fontSize="9"
            >
              {p.label.split(' ')[0]}
            </text>
          )
        })}
      </svg>
      <div className="flex-1 space-y-2 w-full">
        {pillars.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-white w-40 truncate">{p.label}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${p.pct}%`,
                  background:
                    i % 3 === 0 ? COLORS.purple : i % 3 === 1 ? COLORS.cyan : COLORS.amber,
                }}
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
   SEÇÃO 3 — ARQUÉTIPO VISUAL
   ===================================================================== */

function ArchetypeCard({ data }: { data: DocData }) {
  const a = data.archetype
  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ borderColor: `${COLORS.amber}40`, background: `${COLORS.amber}0a` }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-extrabold text-white">{a.name}</h3>
        <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 text-[10px]">
          Arquétipo Dominante
        </Badge>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{a.description}</p>
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
   SEÇÃO 4 — ESTEIRA DE OFERTAS (linha do tempo)
   ===================================================================== */

function OfferTimeline({ data }: { data: DocData }) {
  const offers = data.offers
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-2">
      {offers.map((o, i) => (
        <React.Fragment key={i}>
          <div
            className="flex-1 rounded-xl border p-3 space-y-1 min-w-[140px]"
            style={{
              borderColor: `${o.color}40`,
              background: `${o.color}0d`,
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
            {o.price && <div className="text-[11px] font-bold text-white">{o.price}</div>}
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
  )
}

/* =====================================================================
   SEÇÃO 5 — MATRIZ DE CONCORRÊNCIA
   ===================================================================== */

function CompetitorMatrix({ data }: { data: DocData }) {
  const { competitors } = data
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-3 text-[#9494A8] font-semibold">Critério</th>
            <th className="text-left py-2 px-3 text-[#7C5CFC] font-semibold">
              {data.niche || 'Sua Marca'}
            </th>
            {competitors.map((c, i) => (
              <th key={i} className="text-left py-2 px-3 text-[#9494A8] font-semibold">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: 'Diferencial', key: 'differential' as const },
            { label: 'Preço', key: 'price' as const },
            { label: 'Público', key: 'audience' as const },
            { label: 'Fraqueza', key: 'weakness' as const },
          ].map((row) => (
            <tr key={row.key} className="border-b border-white/5">
              <td className="py-2 px-3 text-[#9494A8] font-medium">{row.label}</td>
              <td className="py-2 px-3 text-white">{data.ownPositioning[row.key]}</td>
              {competitors.map((c, i) => (
                <td key={i} className="py-2 px-3 text-slate-300">
                  {c[row.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
              className="rounded-xl border p-3 flex items-center gap-3 transition-all"
              style={{
                width: `${width}%`,
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
   SEÇÃO 8 — STORYTELLING DE ORIGEM
   ===================================================================== */

function OriginStory({ data }: { data: DocData }) {
  return (
    <div
      className="rounded-2xl border-l-4 p-5 space-y-2"
      style={{ borderColor: COLORS.cyan, background: `${COLORS.cyan}08` }}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: COLORS.cyan }} />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: COLORS.cyan }}
        >
          História do Fundador
        </span>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
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
  pillars: { label: string; pct: number }[]
  archetype: {
    name: string
    description: string
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

  // Mapa mental — ramificações com conteúdo real
  const mindMapBranches = [
    {
      title: 'Quem Você É',
      color: COLORS.purple,
      items: [
        asset('posicionamento').slice(0, 80),
        asset('promessa').slice(0, 60),
        asset('arquetipo').slice(0, 60),
        asset('inimigo_narrativo').slice(0, 60),
      ].map((s) => s.split('\n')[0].slice(0, 70)),
    },
    {
      title: 'Como Você Fala',
      color: COLORS.cyan,
      items: [asset('tom_de_voz'), asset('vocabulario'), asset('storytelling')].map((s) =>
        s.split('\n')[0].slice(0, 70),
      ),
    },
    {
      title: 'Como Você Prova',
      color: COLORS.amber,
      items: [asset('stack_de_prova'), asset('identidade_visual')].map((s) =>
        s.split('\n')[0].slice(0, 70),
      ),
    },
    {
      title: 'Como Você Publica',
      color: COLORS.purple,
      items: [asset('pilares_de_conteudo'), asset('linha_editorial'), asset('bio_taglines')].map(
        (s) => s.split('\n')[0].slice(0, 70),
      ),
    },
    {
      title: 'Como Você Vende',
      color: COLORS.cyan,
      items: [asset('oferta_principal').split('\n')[0].slice(0, 70)],
    },
  ]

  // Pilares — distribuição simulada 20-35%
  const pillarLines = asset('pilares_de_conteudo')
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5)
  const pcts = [30, 25, 22, 13, 10].slice(0, pillarLines.length || 1)
  // normaliza para somar ~100 considerando qtd
  const sum = pcts.reduce((a, b) => a + b, 0) || 1
  const pillars = (
    pillarLines.length ? pillarLines : ['Educação', 'Bastidores', 'Prova', 'Conexão', 'Conversão']
  ).map((label, idx) => ({
    label: label.split(':')[0].slice(0, 24) || `Pilar ${idx + 1}`,
    pct: pcts[idx] != null ? Math.round((pcts[idx] / sum) * 100) : 20,
  }))

  // Arquétipo
  const archetype = {
    name: 'O Sábio + O Guia',
    description: asset('arquetipo'),
    colors: (r('cores_marca') || `${COLORS.purple},${COLORS.cyan}`)
      .split(/[,;]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 5),
    tone: asset('tom_de_voz'),
    wordsUse: r('palavras_usa') || '—',
    wordsAvoid: r('palavras_nunca') || '—',
  }

  // Esteira de ofertas
  const offers = [
    {
      tier: 'Entrada',
      name: r('oferta_entrada') || 'Isca gratuita',
      description: 'Atrai e qualifica o lead',
      price: 'Grátis',
      color: COLORS.cyan,
    },
    {
      tier: 'Principal',
      name: r('oferta_principal') || base.service || 'Oferta principal',
      description: base.result || 'Transformação central',
      price: r('ticket_medio') || '',
      color: COLORS.purple,
    },
    {
      tier: 'Upsell 1',
      name: r('upsell_1') || 'Upsell',
      description: 'Aprofundamento',
      color: COLORS.amber,
    },
    {
      tier: 'Upsell 2',
      name: r('upsell_2') || 'Upsell premium',
      description: 'Acesso exclusivo',
      color: COLORS.amber,
    },
    {
      tier: 'Premium',
      name: r('oferta_premium') || 'Oferta premium',
      description: 'Done-for-you / alta exigência',
      color: COLORS.purple,
    },
  ].filter((o) => o.name)

  // Concorrentes
  const compNames = (r('concorrentes') || 'Concorrente A, Concorrente B')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
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

  // Processo de 5 etapas
  const process = [1, 2, 3, 4, 5].map((n) => ({
    name: r(`etapa_${n}`) || `Etapa ${n}`,
    description: `Passo ${n} do método`,
  }))

  // Provas
  const proofs: { type: string; content: string }[] = []
  if (r('depoimentos')) proofs.push({ type: 'Depoimentos', content: r('depoimentos') })
  if (r('cases')) proofs.push({ type: 'Cases', content: r('cases') })
  if (r('redes_seguidores')) proofs.push({ type: 'Seguidores', content: r('redes_seguidores') })
  if (r('selos_premiacoes')) proofs.push({ type: 'Premiações', content: r('selos_premiacoes') })
  if (r('midia')) proofs.push({ type: 'Mídia', content: r('midia') })

  // Storytelling
  const originStory =
    i('G1') ||
    asset('storytelling') ||
    `A jornada começa quando você percebeu que ${base.audience || 'seus clientes'} precisavam de ${base.result || 'transformação'}, mas as opções de ${niche} não entregavam ${base.differential?.toLowerCase() || 'diferencial'}. Decidiu construir um caminho próprio.`

  return {
    niche,
    subniche,
    version: profile.activeVersion,
    generatedAtLabel: profile.lastGeneratedAt
      ? new Date(profile.lastGeneratedAt).toLocaleDateString('pt-BR')
      : '—',
    mindMapBranches,
    pillars,
    archetype,
    offers,
    competitors,
    ownPositioning,
    process,
    proofs,
    originStory,
  }
}

/* =====================================================================
   ESTILOS DE IMPRESSÃO (print = fundo branco, texto escuro)
   ===================================================================== */

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
