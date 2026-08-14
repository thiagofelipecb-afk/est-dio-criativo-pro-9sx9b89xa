import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import {
  ModuleHeader,
  EmptyState,
  Field,
  inputClass,
  GenerateButton,
  BlockEditor,
  useDebouncedEffect,
} from '@/components/marketing/Shared'
import type {
  PageProject,
  VideoScript,
  VideoScriptMethod,
  PageSection,
  ContentBlock,
  FunnelStage,
  FunnelPlan,
  FunnelPlanAsset,
  BrandBase,
  BrandAsset,
} from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Boxes,
  FileCode,
  Video,
  Download,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  GraduationCap,
  Sparkles,
  Monitor,
  Smartphone,
  Link2,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { FUNNEL_CATALOG, labelTicket } from '@/lib/funnel-catalog'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// Snapshot de geração (prompt/modelo/versão do Brand OS) para auditoria
function genSnapshot(contextVersion: number) {
  return {
    brand_profile_version_id: `brand-os-v${contextVersion}`,
    prompt_version: '1.0',
    model: 'lumen-ia-v3',
    generated_at: new Date().toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ASSET_LABELS: Record<string, string> = {
  posicionamento: 'Posicionamento',
  promessa: 'Promessa',
  arquetipo: 'Arquétipo',
  inimigo_narrativo: 'Inimigo Narrativo',
  tom_de_voz: 'Tom de Voz',
  vocabulario: 'Vocabulário',
  storytelling: 'Storytelling de Origem',
  stack_de_prova: 'Stack de Prova',
  identidade_visual: 'Identidade Visual',
  pilares_de_conteudo: 'Pilares de Conteúdo',
  linha_editorial: 'Linha Editorial',
  bio_taglines: 'Bio e Taglines',
  oferta_principal: 'Oferta Principal',
}

const ETAPA_COLOR: Record<string, string> = {
  entrada: '#22D3EE',
  nutricao: '#F59E0B',
  conversao: '#7C5CFC',
}
const ETAPA_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  nutricao: 'Nutrição',
  conversao: 'Conversão',
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function Ativos() {
  const { hasBrandOS } = usePlatform()
  const navigate = useNavigate()
  const [sub, setSub] = useState<'ecossistema' | 'paginas' | 'videos' | 'academy'>('ecossistema')
  const tabs = [
    { id: 'ecossistema', label: 'Ecossistema', icon: Boxes },
    { id: 'paginas', label: 'Gerador de Páginas', icon: FileCode },
    { id: 'videos', label: 'Roteiros de Vídeo', icon: Video },
    { id: 'academy', label: 'Academy', icon: GraduationCap },
  ] as const

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 4 — Ativos"
        description="Transforme a estratégia do Módulo 3 em páginas, roteiros de vídeo e ativos executáveis."
        icon={<Boxes className="w-5 h-5" />}
        accent="#22D3EE"
      />

      {/* Banner Brand OS ausente */}
      {!hasBrandOS && (
        <button
          onClick={() => navigate('/posicionamento')}
          className="w-full flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-500/15 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-200">
            ⚠️ Configure seu Brand OS em Posicionamento para gerar ativos alinhados à sua marca.{' '}
            <span className="underline">Clique para ir.</span>
          </span>
        </button>
      )}

      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0e0e15] rounded-xl border border-white/5">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = sub === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id as typeof sub)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-[#22D3EE] text-black shadow-lg' : 'text-[#9494A8] hover:text-white hover:bg-white/5'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {sub === 'ecossistema' && <EcossistemaPanel />}
      {sub === 'paginas' && <PaginasPanel />}
      {sub === 'videos' && <VideosPanel />}
      {sub === 'academy' && <AcademyPanel />}
    </div>
  )
}

// ============================================================
// 1. ECOSSISTEMA DE ATIVOS
// ============================================================
function EcossistemaPanel() {
  const { ecosystem, funnelPlans, setFunnelPlans, brandProfile, hasBrandOS } = usePlatform()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()
  const [batch, setBatch] = useState<{
    active: boolean
    current: number
    total: number
    label: string
  }>({ active: false, current: 0, total: 0, label: '' })

  const approved = ecosystem?.status === 'aprovado'
  const plans = approved ? funnelPlans : []

  const updateAsset = (catalogItemId: string, assetId: string, patch: Partial<FunnelPlanAsset>) => {
    setFunnelPlans(
      funnelPlans.map((p) =>
        p.catalogItemId === catalogItemId
          ? {
              ...p,
              ativos: p.ativos.map((a) => (a.assetId === assetId ? { ...a, ...patch } : a)),
            }
          : p,
      ),
    )
  }

  const currentVersionId = `brand-os-v${brandProfile.activeVersion}`

  const generateAsset = async (plan: FunnelPlan, asset: FunnelPlanAsset) => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.', {
        description: 'A geração usa o Brand OS ativo como contexto.',
      })
      return
    }
    updateAsset(plan.catalogItemId, asset.assetId, { genStatus: 'gerando' })
    try {
      const res = await generate('ativo_funil', () => {}, 1200)
      updateAsset(plan.catalogItemId, asset.assetId, {
        genStatus: 'concluido',
        status: 'pronto',
        content: assetContent(asset.assetId, brandProfile.base, brandProfile.assets),
        ...genSnapshot(res.contextVersion),
      })
      toast.success(`${asset.nome} gerado!`)
    } catch {
      updateAsset(plan.catalogItemId, asset.assetId, { genStatus: 'falhou' })
      toast.error('Falha ao gerar ativo.')
    }
  }

  const generateAll = async (plan: FunnelPlan) => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.')
      return
    }
    const pending = plan.ativos.filter(
      (a) => !a.genStatus || a.genStatus === 'pendente' || a.genStatus === 'falhou',
    )
    if (!pending.length) {
      toast.info('Todos os ativos já foram gerados.')
      return
    }
    setBatch({ active: true, current: 0, total: pending.length, label: 'Iniciando…' })
    for (let i = 0; i < pending.length; i++) {
      const a = pending[i]
      setBatch({ active: true, current: i, total: pending.length, label: `Gerando ${a.nome}…` })
      updateAsset(plan.catalogItemId, a.assetId, { genStatus: 'gerando' })
      try {
        const res = await generate('ativo_funil', () => {}, 1000)
        updateAsset(plan.catalogItemId, a.assetId, {
          genStatus: 'concluido',
          status: 'pronto',
          content: assetContent(a.assetId, brandProfile.base, brandProfile.assets),
          ...genSnapshot(res.contextVersion),
        })
      } catch {
        updateAsset(plan.catalogItemId, a.assetId, { genStatus: 'falhou' })
      }
    }
    setBatch({ active: false, current: 0, total: 0, label: '' })
    toast.success('Geração em lote concluída!')
  }

  if (!approved || plans.length === 0) {
    return (
      <EmptyState
        icon={<Boxes className="w-6 h-6" />}
        title="Nenhum funil aprovado"
        description="Aprove um ecossistema no Módulo 3 para liberar os ativos organizados por funil."
        action={
          <Button size="sm" onClick={() => navigate('/funis')} className="bg-[#7C5CFC] gap-1.5">
            <Layers className="w-4 h-4" /> Ir para Funis
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Progresso da geração em lote */}
      {batch.active && (
        <div className="rounded-2xl bg-[#14141C] border border-[#22D3EE]/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#22D3EE]" /> {batch.label}
            </span>
            <span className="text-[#9494A8]">
              {batch.current}/{batch.total}
            </span>
          </div>
          <Progress
            value={batch.total ? (batch.current / batch.total) * 100 : 0}
            className="h-1.5 bg-white/10"
          />
        </div>
      )}

      {plans.map((plan) => {
        const item = FUNNEL_CATALOG.find((f) => f.id === plan.catalogItemId)
        const color = item ? ETAPA_COLOR[item.etapa] : '#7C5CFC'
        const total = plan.ativos.length
        const concluidos = plan.ativos.filter((a) => a.genStatus === 'concluido').length
        const pendentes = plan.ativos.filter(
          (a) => !a.genStatus || a.genStatus === 'pendente' || a.genStatus === 'falhou',
        ).length
        const cobertos = plan.ativos.filter(
          (a) => a.brand_profile_version_id === currentVersionId,
        ).length
        const cobertura = total ? Math.round((cobertos / total) * 100) : 0
        const checkDone = plan.checklist.filter((c) => c.concluido_em).length
        const garantia =
          plan.techConfig.find((t) => /garantia/i.test(t)) ||
          'Garantia padrão de 7 dias incondicional'

        return (
          <div
            key={plan.catalogItemId}
            className="rounded-2xl bg-[#14141C] border overflow-hidden"
            style={{ borderColor: `${color}33` }}
          >
            {/* Cabeçalho do funil */}
            <div className="p-4 space-y-3 border-b border-white/5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0"
                    style={{ background: color }}
                  >
                    {plan.order}
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {item?.nome || plan.catalogItemId}
                  </span>
                  <Badge
                    className="text-[10px] border"
                    style={{ background: `${color}1a`, color, borderColor: `${color}40` }}
                  >
                    {item ? ETAPA_LABEL[item.etapa] : '—'}
                  </Badge>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Ecossistema aprovado
                </Badge>
              </div>

              {/* Métricas do funil */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Metric
                  label="Ativos"
                  value={`${total}`}
                  hint={`${concluidos} concluídos • ${pendentes} pendentes`}
                />
                <Metric
                  label="Cobertura copy-base"
                  value={`${cobertura}%`}
                  hint={`${cobertos}/${total} na versão atual`}
                />
                <Metric
                  label="Checklist técnico"
                  value={`${checkDone}/${plan.checklist.length}`}
                  hint="etapas"
                />
                <Metric label="Garantia" value="Configurada" hint={garantia} />
              </div>

              {/* Contexto da copy-base (Brand OS) */}
              <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
                <p className="text-[10px] font-bold uppercase text-[#22D3EE] mb-1">
                  Contexto da copy-base (Brand OS)
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-white font-semibold">{brandProfile.base.niche || '—'}</span>
                  {brandProfile.base.subniche ? ` • ${brandProfile.base.subniche}` : ''} • Oferta:{' '}
                  <span className="text-white">{brandProfile.base.mainOffer || '—'}</span> • Voz:{' '}
                  <span className="text-white">{brandProfile.base.voice || '—'}</span> •
                  Diferencial:{' '}
                  <span className="text-white">{brandProfile.base.differential || '—'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => generateAll(plan)}
                  disabled={batch.active || pendentes === 0}
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-xs gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Gerar todos ({pendentes} pendentes)
                </Button>
                {pendentes === 0 && total > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Todos os ativos gerados
                  </Badge>
                )}
              </div>
            </div>

            {/* Lista de ativos */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {plan.ativos.map((a) => {
                const genStatus = a.genStatus || 'pendente'
                const outdated =
                  !!a.brand_profile_version_id && a.brand_profile_version_id !== currentVersionId
                const brandAsset = brandProfile.assets.find((ba) => ba.type === a.assetId)
                return (
                  <div
                    key={a.assetId}
                    className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {a.nome}
                        </span>
                        <span className="text-[9px] text-[#22D3EE] flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" /> ID: {a.assetId}
                        </span>
                      </div>
                      <GenStatusBadge status={genStatus} />
                    </div>
                    <p className="text-[10px] text-[#9494A8] leading-relaxed">{a.rationale}</p>
                    {outdated && (
                      <div className="flex items-center gap-1 text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Desatualizado (gerado com Brand OS{' '}
                        {a.brand_profile_version_id})
                      </div>
                    )}
                    {brandAsset && !brandAsset.content?.trim() && (
                      <p className="text-[9px] text-amber-400">
                        Ativo do Brand OS pendente de conteúdo.
                      </p>
                    )}
                    {a.content && genStatus === 'concluido' && (
                      <div className="rounded bg-[#1C1C27] border border-white/5 p-2 text-[10px] text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                        {a.content}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-[10px] h-7 gap-1 flex-1"
                        disabled={batch.active || genStatus === 'gerando'}
                        onClick={() => generateAsset(plan, a)}
                      >
                        {genStatus === 'concluido' ? (
                          <>
                            <RefreshCw className="w-3 h-3" /> Regenerar
                          </>
                        ) : genStatus === 'gerando' ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Gerando…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" /> Gerar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Checklist técnico resumido */}
            <div className="px-4 pb-4">
              <details className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3">
                <summary className="text-xs font-semibold text-white cursor-pointer flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Checklist técnico ({checkDone}/{plan.checklist.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {plan.checklist.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-[11px]">
                      <span className={c.concluido_em ? 'text-emerald-400' : 'text-[#9494A8]'}>
                        {c.concluido_em ? '☑' : '☐'}
                      </span>
                      <span
                        className={
                          c.concluido_em ? 'text-[#9494A8] line-through' : 'text-slate-300'
                        }
                      >
                        {c.title}
                      </span>
                      <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[9px] ml-auto">
                        {c.prioridade}
                      </Badge>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
      <p className="text-[9px] uppercase text-[#9494A8] tracking-wider">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
      {hint && <p className="text-[9px] text-[#9494A8] mt-0.5">{hint}</p>}
    </div>
  )
}

function GenStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'concluido':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Concluído
        </Badge>
      )
    case 'gerando':
      return (
        <Badge className="bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30 text-[9px]">
          <RefreshCw className="w-2.5 h-2.5 mr-0.5 animate-spin" /> Gerando
        </Badge>
      )
    case 'falhou':
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[9px]">
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Falhou
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px]">
          <Clock className="w-2.5 h-2.5 mr-0.5" /> Pendente
        </Badge>
      )
  }
}

function assetContent(assetId: string, base: BrandBase, assets: BrandAsset[]): string {
  const ba = assets.find((a) => a.type === assetId)
  if (ba && ba.content && ba.content.trim()) return ba.content
  switch (assetId) {
    case 'oferta_principal':
      return `Oferta principal: ${base.mainOffer || base.service || '—'}.\nPromessa: ajudar ${base.audience || 'seu público'} a ${base.result || 'alcançar o resultado'}.\nDiferencial: ${base.differential || 'método validado'}.`
    case 'stack_de_prova':
      return `Stack de prova para ${base.mainOffer || 'sua oferta'}:\n• Cases de ${base.audience || 'clientes'}\n• Depoimentos em vídeo\n• Resultados mensuráveis\n• Autoridade em ${base.niche || 'seu nicho'}`
    case 'posicionamento':
      return `Posicionamento: ${base.niche || '—'}${base.subniche ? ` • ${base.subniche}` : ''}. Para ${base.audience || 'profissionais'} que querem ${base.result || 'transformação'}.`
    case 'pilares_de_conteudo':
      return `Pilares: Educação, Bastidores, Prova e Conversão — alinhados a "${base.differential || 'sua entrega de valor'}".`
    case 'linha_editorial':
      return `Linha editorial: tom ${base.voice || 'direto e próximo'}, foco em ${base.niche || 'seu nicho'}, evitando jargão e sempre ancorando em prova.`
    case 'bio_taglines':
      return `Bio: ${base.niche || 'Especialista'} • ${base.differential || 'Método validado'}\nTagline: ${base.result || 'Resultado previsível'} para ${base.audience || 'quem executa'}.`
    case 'storytelling':
      return `Storytelling de origem: a jornada que levou a ${base.result || 'o resultado'} e por que ${base.audience || 'seu público'} deve confiar.`
    default:
      return `Ativo "${ASSET_LABELS[assetId] || assetId}" gerado a partir do Brand OS (nicho: ${base.niche || '—'}).`
  }
}

// ============================================================
// 2. GERADOR DE PÁGINAS — stepper 3 etapas
// ============================================================
const PAGE_TYPES = [
  { id: 'captura', label: 'Captura', desc: 'Coletar leads com material gratuito' },
  { id: 'vsl', label: 'Vendas VSL', desc: 'Vídeo com seções de conversão' },
  { id: 'carta', label: 'Vendas Carta', desc: 'Long copy persuasivo' },
  { id: 'aplicacao', label: 'Aplicação', desc: 'Filtrar e qualificar leads' },
  { id: 'obrigado', label: 'Obrigado', desc: 'Pós-preenchimento ou pós-compra' },
] as const

const SECTION_BLOCKS = [
  'Headline',
  'Pré-headline',
  'Seletividade',
  'Critérios',
  'Credenciais',
  'Como funciona',
  'Para quem é',
  'Formulário',
  'Próxima etapa',
  'Urgência',
  'Rodapé de confiança',
  'Oferta',
  'Dor',
  'Resultado',
  'Prova',
  'CTA',
  'Garantia',
  'Seção personalizada',
] as const

const SECTIONS_BY_TYPE: Record<PageProject['type'], string[]> = {
  captura: [
    'Headline',
    'Pré-headline',
    'Credenciais',
    'Como funciona',
    'Formulário',
    'Rodapé de confiança',
  ],
  vsl: ['Headline', 'Dor', 'Resultado', 'Prova', 'Oferta', 'CTA', 'Garantia', 'Urgência'],
  carta: ['Headline', 'Pré-headline', 'Dor', 'Resultado', 'Prova', 'Oferta', 'CTA', 'Garantia'],
  aplicacao: [
    'Headline',
    'Seletividade',
    'Critérios',
    'Como funciona',
    'Formulário',
    'Próxima etapa',
  ],
  obrigado: ['Headline', 'Próxima etapa', 'CTA', 'Rodapé de confiança'],
}

const PAGE_DRAFT_KEY = 'lumen_page_draft'

function PaginasPanel() {
  const { brandProfile, pageProjects, savePageProject } = usePlatform()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Etapa 1 — contexto
  const [type, setType] = useState<PageProject['type']>('captura')
  const [stage, setStage] = useState<FunnelStage>('topo')
  const [objective, setObjective] = useState('Capturar leads qualificados')
  const [voice, setVoice] = useState(brandProfile.base.voice || 'Direto e autoritativo')
  const [accent, setAccent] = useState('#7C5CFC')

  const [current, setCurrent] = useState<PageProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  // Restaurar rascunho
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PAGE_DRAFT_KEY)
      if (saved) {
        const v = JSON.parse(saved)
        if (v.type) setType(v.type)
        if (v.stage) setStage(v.stage)
        if (v.objective) setObjective(v.objective)
        if (v.voice) setVoice(v.voice)
        if (v.accent) setAccent(v.accent)
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Autosave debounce 2s
  useDebouncedEffect(
    { type, stage, objective, voice, accent },
    (v) => {
      localStorage.setItem(PAGE_DRAFT_KEY, JSON.stringify(v))
    },
    2000,
  )

  const generateAllSections = async () => {
    setLoading(true)
    setProgress(0)
    try {
      const res = await generate(
        'pagina',
        (pct, label) => {
          setProgress(pct)
          setProgressLabel(label)
        },
        1600,
      )
      const suggested = SECTIONS_BY_TYPE[type]
      const sections: PageSection[] = suggested.map((s, i) => ({
        id: uid('sec'),
        sectionType: s,
        position: i,
        content: pageContent(s, type, brandProfile.base),
      }))
      const proj: PageProject = {
        id: current?.id || uid('page'),
        type,
        stage,
        objective,
        voice,
        accent,
        sections,
        status: 'gerado',
        contextVersion: res.contextVersion,
        createdAt: current?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...genSnapshot(res.contextVersion),
      }
      savePageProject(proj)
      setCurrent(proj)
      setStep(2)
      toast.success('Seções geradas!')
    } catch {
      toast.error('Falha na geração.')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const updateCurrent = (updater: (p: PageProject) => PageProject) => {
    setCurrent((prev) => {
      if (!prev) return prev
      const u = updater(prev)
      return u
    })
  }

  // Autosave do projeto de página
  useDebouncedEffect(
    current,
    (c) => {
      if (c) savePageProject({ ...c, updatedAt: new Date().toISOString() })
    },
    2000,
  )

  const filledSections = current ? current.sections.filter((s) => s.content.trim()).length : 0

  return (
    <div className="space-y-4">
      {/* Stepper visual */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4">
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Contexto' },
            { n: 2, label: 'Seções' },
            { n: 3, label: 'Exportar' },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <button
                onClick={() => setStep(s.n as 1 | 2 | 3)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${step === s.n ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step === s.n ? 'bg-black/20 text-black' : 'bg-white/10 text-[#9494A8]'}`}
                >
                  {s.n}
                </span>
                {s.label}
              </button>
              {i < 2 && <ChevronRight className="w-3 h-3 text-[#9494A8]" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Etapa 1 — Contexto */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Contexto da página</h3>
            <Field label="Tipo de página">
              <select
                className={inputClass}
                value={type}
                onChange={(e) => setType(e.target.value as PageProject['type'])}
              >
                {PAGE_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.desc}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Etapa do funil">
              <select
                className={inputClass}
                value={stage}
                onChange={(e) => setStage(e.target.value as FunnelStage)}
              >
                <option value="topo">Topo / Atração</option>
                <option value="meio">Meio / Relacionamento</option>
                <option value="fundo">Fundo / Conversão</option>
              </select>
            </Field>
            <Field label="Objetivo">
              <textarea
                className={inputClass}
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tom (Brand OS)">
                <select
                  className={inputClass}
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  <option value={brandProfile.base.voice || 'Direto e autoritativo'}>
                    {brandProfile.base.voice || 'Direto e autoritativo'}
                  </option>
                  <option value="Próximo e conversacional">Próximo e conversacional</option>
                  <option value="Inspirador e motivacional">Inspirador e motivacional</option>
                  <option value="Técnico e didático">Técnico e didático</option>
                </select>
              </Field>
              <Field label="Cor de destaque">
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-10 h-9 bg-[#1C1C27] border border-white/10 rounded-xl cursor-pointer"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                  />
                  <input
                    className={`${inputClass} flex-1`}
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                  />
                </div>
              </Field>
            </div>
            <GenerateButton
              onClick={generateAllSections}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              label="Gerar todas as seções"
            />
            <p className="text-[10px] text-[#9494A8]">Rascunho salvo automaticamente a cada 2s.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#9494A8] uppercase">
              Páginas salvas ({pageProjects.length})
            </p>
            {pageProjects.length === 0 && (
              <EmptyState
                icon={<FileCode className="w-6 h-6" />}
                title="Nenhuma página"
                description="Gere páginas de Captura, VSL, Carta, Aplicação e Obrigado com seções editáveis e exportação HTML."
              />
            )}
            {pageProjects.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-[#14141C] border border-white/5 p-3 cursor-pointer hover:border-[#7C5CFC]/40"
                onClick={() => {
                  setCurrent(p)
                  setType(p.type)
                  setStage(p.stage)
                  setObjective(p.objective)
                  setVoice(p.voice)
                  setAccent(p.accent)
                  setStep(2)
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {PAGE_TYPES.find((t) => t.id === p.type)?.label}
                  </span>
                  <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                    {p.sections.length} seções
                  </Badge>
                </div>
                <p className="text-[10px] text-[#9494A8] mt-1">
                  {p.objective} • v{p.contextVersion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Etapa 2 — Seções */}
      {step === 2 && (
        <PageSectionsStep
          current={current}
          brandBase={brandProfile.base}
          updateCurrent={updateCurrent}
          filledSections={filledSections}
          onPrev={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {/* Etapa 3 — Exportar */}
      {step === 3 && <PageExportStep current={current} onPrev={() => setStep(2)} />}
    </div>
  )
}

function PageSectionsStep({
  current,
  brandBase,
  updateCurrent,
  filledSections,
  onPrev,
  onNext,
}: {
  current: PageProject | null
  brandBase: BrandBase
  updateCurrent: (updater: (p: PageProject) => PageProject) => void
  filledSections: number
  onPrev: () => void
  onNext: () => void
}) {
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({})
  const [newBlockType, setNewBlockType] = useState<string>('Headline')
  const { generate } = useAIGeneration()
  const [regenId, setRegenId] = useState<string | null>(null)

  if (!current) {
    return (
      <EmptyState
        icon={<FileCode className="w-6 h-6" />}
        title="Nenhuma página ativa"
        description="Volte à Etapa 1 e gere as seções da página."
        action={
          <Button size="sm" onClick={onPrev} className="bg-[#7C5CFC] gap-1.5">
            Ir para Contexto
          </Button>
        }
      />
    )
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...current.sections]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    updateCurrent((p) => ({ ...p, sections: next.map((s, i) => ({ ...s, position: i })) }))
  }

  const remove = (id: string) => {
    updateCurrent((p) => ({
      ...p,
      sections: p.sections.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })),
    }))
  }

  const addBlock = () => {
    const sec: PageSection = {
      id: uid('sec'),
      sectionType: newBlockType,
      position: current.sections.length,
      content: '',
    }
    updateCurrent((p) => ({ ...p, sections: [...p.sections, sec] }))
  }

  const saveEdit = (id: string) => {
    updateCurrent((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === id ? { ...s, content: editing[id] ?? s.content } : s,
      ),
    }))
    setIsEditing((e) => ({ ...e, [id]: false }))
  }

  const regenSection = async (id: string) => {
    setRegenId(id)
    try {
      await generate('pagina_secao', () => {}, 900)
      updateCurrent((p) => ({
        ...p,
        sections: p.sections.map((s) =>
          s.id === id
            ? {
                ...s,
                content: pageContent(s.sectionType, current.type, brandBase) + ' (regenerado)',
              }
            : s,
        ),
      }))
      toast.success('Seção regenerada!')
    } catch {
      toast.error('Falha ao regenerar seção.')
    } finally {
      setRegenId(null)
    }
  }

  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white">
          Seções — {PAGE_TYPES.find((t) => t.id === current.type)?.label}
        </h3>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
            {filledSections}/{current.sections.length} preenchidas
          </Badge>
          <div className="w-24">
            <Progress
              value={current.sections.length ? (filledSections / current.sections.length) * 100 : 0}
              className="h-1.5 bg-white/10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {current.sections.map((s, i) => (
          <div
            key={s.id}
            className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-[#9494A8] hover:text-white disabled:opacity-20"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === current.sections.length - 1}
                    className="text-[#9494A8] hover:text-white disabled:opacity-20"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC] truncate">
                  {s.sectionType}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => regenSection(s.id)}
                  disabled={!!regenId}
                  className="p-1 rounded text-[#22D3EE] hover:bg-[#22D3EE]/10"
                  title="Regenerar seção"
                >
                  <RefreshCw className={`w-3 h-3 ${regenId === s.id ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-500/10"
                  title="Remover bloco"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {isEditing[s.id] ? (
              <div className="space-y-1.5">
                <textarea
                  className="w-full bg-[#1C1C27] border border-white/10 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none leading-relaxed"
                  rows={Math.min(10, Math.max(3, (editing[s.id] ?? s.content).split('\n').length))}
                  value={editing[s.id] ?? s.content}
                  onChange={(e) => setEditing((ed) => ({ ...ed, [s.id]: e.target.value }))}
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-6 text-[10px] bg-emerald-600"
                    onClick={() => saveEdit(s.id)}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px]"
                    onClick={() => setIsEditing((e) => ({ ...e, [s.id]: false }))}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="w-full text-left"
                onClick={() => {
                  setEditing((ed) => ({ ...ed, [s.id]: s.content }))
                  setIsEditing((e) => ({ ...e, [s.id]: true }))
                }}
              >
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {s.content || (
                    <span className="text-[#9494A8]/50 italic">Clique para editar…</span>
                  )}
                </p>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar bloco */}
      <div className="flex gap-2">
        <select
          className={inputClass}
          value={newBlockType}
          onChange={(e) => setNewBlockType(e.target.value)}
        >
          {SECTION_BLOCKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          className="border-dashed border-white/20 text-[11px] gap-1"
          onClick={addBlock}
        >
          <Plus className="w-3 h-3" /> Adicionar bloco
        </Button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <Button size="sm" variant="ghost" onClick={onPrev} className="text-xs gap-1.5">
          <ChevronDown className="w-3.5 h-3.5 rotate-90" /> Voltar
        </Button>
        <Button size="sm" onClick={onNext} className="bg-[#7C5CFC] text-xs gap-1.5">
          Exportar <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

function PageExportStep({ current, onPrev }: { current: PageProject | null; onPrev: () => void }) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  if (!current) {
    return (
      <EmptyState
        icon={<FileCode className="w-6 h-6" />}
        title="Nenhuma página para exportar"
        description="Gere uma página nas etapas anteriores antes de exportar."
        action={
          <Button size="sm" onClick={onPrev} className="bg-[#7C5CFC] gap-1.5">
            Voltar
          </Button>
        }
      />
    )
  }

  const html = buildElementorHTML(current)

  const copyDoc = () => {
    const doc = current.sections
      .filter((s) => s.content.trim())
      .map((s) => `## ${s.sectionType}\n${s.content}`)
      .join('\n\n')
    navigator.clipboard.writeText(doc)
    toast.success('Documento de copy copiado!')
  }

  const copyHTML = () => {
    navigator.clipboard.writeText(html)
    toast.success('HTML copiado para a área de transferência!')
  }

  const downloadHTML = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pagina-elementor.html'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('HTML baixado!')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">Exportar — {current.objective}</h3>
          <div className="flex items-center gap-1 bg-[#0e0e15] rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${previewMode === 'desktop' ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8]'}`}
            >
              <Monitor className="w-3 h-3" /> Desktop
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${previewMode === 'mobile' ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8]'}`}
            >
              <Smartphone className="w-3 h-3" /> Mobile
            </button>
          </div>
        </div>

        {/* Preview responsivo em sandbox iframe */}
        <div className="flex justify-center">
          <div
            className={`bg-white rounded-lg overflow-hidden border border-white/10 transition-all ${previewMode === 'mobile' ? 'w-[390px]' : 'w-full'}`}
            style={{ maxWidth: previewMode === 'mobile' ? '390px' : '100%' }}
          >
            <iframe
              title="preview-pagina"
              srcDoc={html}
              className="w-full"
              style={{ height: '480px', border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-xs gap-1.5"
            onClick={copyDoc}
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-xs gap-1.5"
            onClick={copyHTML}
          >
            <Copy className="w-3.5 h-3.5" /> Copiar HTML
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-xs gap-1.5"
            onClick={downloadHTML}
          >
            <Download className="w-3.5 h-3.5" /> Baixar HTML
          </Button>
          <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={onPrev}>
            <ChevronDown className="w-3.5 h-3.5 rotate-90" /> Voltar
          </Button>
        </div>

        <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 text-[10px] text-[#9494A8]">
          <p className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <CheckCircle2 className="w-3 h-3" /> HTML limpo e semântico para Elementor
          </p>
          <p>• Sem scripts, iframes ou tags perigosas</p>
          <p>• Conteúdo sanitizado (HTML entities escapadas)</p>
          <p>• Classes CSS inline prontas para Elementor</p>
          <p>• Nenhum secret ou token exposto</p>
        </div>
      </div>
    </div>
  )
}

function pageContent(sectionType: string, type: PageProject['type'], base: BrandBase): string {
  const map: Record<string, string> = {
    Headline: `Descubra como ${base.result || 'alcançar o resultado'} mesmo que ${base.audience || 'você'} esteja começando.`,
    'Pré-headline': `Para ${base.audience || 'profissionais'} que querem ${base.result || 'resultado'}.`,
    Credenciais: `${base.differential || 'Método validado'} • ${base.niche || 'Especialista'} com cases reais.`,
    Seletividade: `Esta página é para quem: já tentou ${base.niche || 'o método'} e falhou; está disposto a executar; quer resultado previsível.`,
    Critérios: `Não é para quem: busca mágica; não tem tempo; quer atalho sem método.`,
    'Como funciona': `1. Diagnóstico • 2. Plano personalizado • 3. Execução guiada • 4. Resultado mensurável.`,
    'Para quem é': `${base.audience || 'Profissionais'} que valorizam ${base.result || 'transformação real'}.`,
    Urgência: `Vagas limitadas para garantir atendimento individual nesta semana.`,
    Formulário: `Preencha: Nome • E-mail • WhatsApp • Breve descrição do seu momento.`,
    'Próxima etapa': `Após enviar, você recebe o diagnóstico personalizado em até 24h no seu e-mail.`,
    'Rodapé de confiança': `© ${new Date().getFullYear()} ${base.niche || 'LUMEN Studio'} • Política de Privacidade • Termos de Uso`,
    Oferta: `Oferta: ${base.mainOffer || base.service || '—'}. Investimento acessível com garantia incondicional.`,
    Dor: `Se você é ${base.audience || 'profissional'} e ainda sofre sem ${base.result || 'resultado'}, isso é para você.`,
    Resultado: `Imagine ${base.result || 'o resultado'} em semanas, não anos — com método e suporte.`,
    Prova: `Cases reais de ${base.audience || 'clientes'} que aplicaram ${base.differential || 'o método'} e transformaram seus resultados.`,
    CTA: `Quero ${base.result || 'começar agora'} →`,
    Garantia: `Garantia incondicional de 7 dias. Se não for para você, devolvemos 100% do investimento.`,
    'Seção personalizada': `Conteúdo personalizado da seção.`,
  }
  return map[sectionType] || ''
}

// Escapa HTML entities — sanitização para o HTML exportado
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return c
    }
  })
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildElementorHTML(p: PageProject): string {
  const sections = p.sections.filter((s) => s.content.trim())
  const accent = p.accent || '#7C5CFC'
  const body = sections
    .map((s) => {
      const cls = `lumen-section lumen-${slug(s.sectionType)}`
      if (/formulário/i.test(s.sectionType)) {
        return `    <section class="${cls}">
      <h2 class="lumen-heading">${esc(s.sectionType)}</h2>
      <form class="lumen-form" onsubmit="return false">
        <input type="text" class="lumen-input" placeholder="Nome" />
        <input type="email" class="lumen-input" placeholder="E-mail" />
        <input type="tel" class="lumen-input" placeholder="WhatsApp" />
        <button type="button" class="lumen-btn">Quero receber</button>
      </form>
    </section>`
      }
      if (/^cta$/i.test(s.sectionType)) {
        return `    <section class="${cls}">
      <a href="#" class="lumen-btn lumen-btn-cta">${esc(s.content)}</a>
    </section>`
      }
      return `    <section class="${cls}">
      <h2 class="lumen-heading">${esc(s.sectionType)}</h2>
      <p class="lumen-text">${esc(s.content)}</p>
    </section>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.objective)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; color: #1a1a2e; background: #f7f7fb; line-height: 1.6; }
    .lumen-section { max-width: 720px; margin: 0 auto; padding: 32px 20px; }
    .lumen-heading { color: ${accent}; font-size: 22px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.01em; }
    .lumen-text { color: #333; font-size: 16px; white-space: pre-wrap; }
    .lumen-form { display: flex; flex-direction: column; gap: 10px; }
    .lumen-input { width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 10px; font-size: 15px; }
    .lumen-btn { display: inline-block; background: ${accent}; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-size: 16px; text-align: center; }
    .lumen-btn-cta { font-size: 18px; padding: 18px 36px; }
    .lumen-headline .lumen-heading { font-size: 32px; line-height: 1.2; }
    .lumen-dor .lumen-text, .lumen-urgencia .lumen-text { color: #b00020; }
    @media (max-width: 600px) {
      .lumen-section { padding: 24px 16px; }
      .lumen-headline .lumen-heading { font-size: 26px; }
      .lumen-heading { font-size: 19px; }
      .lumen-text { font-size: 15px; }
      .lumen-btn { width: 100%; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`
}

// ============================================================
// 3. ROTEIROS DE VÍDEO
// ============================================================
const VIDEO_DRAFT_KEY = 'lumen_video_draft'

const VIDEO_METHODS = [
  {
    id: 'vsl_benson' as VideoScriptMethod,
    label: 'VSL — Jon Benson',
    duration: '15-60 min',
    structure:
      'Gancho, falsas soluções, mecanismo único, stack de prova, valor, urgência, CTA e garantia.',
  },
  {
    id: 'nissin_miojo' as VideoScriptMethod,
    label: 'Nissin Miojo',
    duration: '8-10 min',
    structure: 'Promessa rápida, mini-VSL, aplicação imediata e prova relâmpago.',
  },
  {
    id: 'aula_vendas' as VideoScriptMethod,
    label: 'Aula de Vendas',
    duration: '20 min',
    structure: 'Framework, epifania, prova, oferta natural, bônus e slide de fechamento.',
  },
]

const COMMON_FIELDS: {
  key: string
  label: string
  type: 'text' | 'textarea'
  autocomplete?: boolean
}[] = [
  { key: 'oferta', label: 'Oferta', type: 'text', autocomplete: true },
  { key: 'ticket', label: 'Ticket', type: 'text' },
  { key: 'persona', label: 'Persona', type: 'textarea' },
  { key: 'dor', label: 'Dor emocional', type: 'textarea' },
  { key: 'resultado', label: 'Resultado desejado', type: 'textarea' },
  { key: 'diferencial', label: 'Diferencial', type: 'textarea', autocomplete: true },
  { key: 'cta', label: 'CTA principal', type: 'text' },
]

const SPECIFIC_FIELDS: Record<
  VideoScriptMethod,
  { key: string; label: string; autocomplete?: boolean }[]
> = {
  vsl_benson: [
    { key: 'gancho_abertura', label: 'Gancho de abertura' },
    { key: 'mecanismo_unico', label: 'Mecanismo único' },
    { key: 'stack_prova', label: 'Stack de prova', autocomplete: true },
    { key: 'garantia', label: 'Garantia' },
    { key: 'urgencia', label: 'Urgência / Escassez' },
  ],
  nissin_miojo: [
    { key: 'promessa_3min', label: 'Promessa dos 3 minutos' },
    { key: 'mini_vsl', label: 'Mini-VSL de aquecimento' },
    { key: 'aplicacao_imediata', label: 'Aplicação imediata' },
    { key: 'prova_relampago', label: 'Prova relâmpago' },
  ],
  aula_vendas: [
    { key: 'estrutura_aula', label: 'Estrutura da aula (módulos)' },
    { key: 'momento_oferta', label: 'Momento da oferta' },
    { key: 'bonus_aula', label: 'Bônus da aula' },
    { key: 'slide_fechamento', label: 'Slide de fechamento' },
  ],
}

const TICKET_OPTS = ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'] as const

function VideosPanel() {
  const { brandProfile, videoScripts, saveVideoScript } = usePlatform()
  const { generate } = useAIGeneration()
  const [method, setMethod] = useState<VideoScriptMethod>('vsl_benson')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState<VideoScript | null>(null)
  const [genState, setGenState] = useState<{
    status: 'idle' | 'queued' | 'running' | 'completed' | 'failed'
    pct: number
    label: string
    error?: string
  }>({ status: 'idle', pct: 0, label: '' })

  // Restaurar rascunho
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIDEO_DRAFT_KEY)
      if (saved) {
        const v = JSON.parse(saved)
        if (v.method) setMethod(v.method)
        if (v.inputs) setInputs(v.inputs)
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Autosave rascunho
  useDebouncedEffect(
    { method, inputs },
    (v) => localStorage.setItem(VIDEO_DRAFT_KEY, JSON.stringify(v)),
    2000,
  )

  const setVal = (k: string, v: string) => setInputs((prev) => ({ ...prev, [k]: v }))

  const handleGenerate = async () => {
    setGenState({ status: 'queued', pct: 0, label: 'Enfileirando…' })
    try {
      await new Promise((r) => setTimeout(r, 300))
      setGenState({ status: 'running', pct: 10, label: 'Carregando contexto do Brand OS…' })
      const res = await generate(
        'roteiro_video',
        (pct, label) => setGenState({ status: 'running', pct, label }),
        1600,
      )
      const blockDefs: Record<VideoScriptMethod, string[]> = {
        vsl_benson: [
          'Gancho de abertura',
          'Falsas soluções',
          'Mecanismo único',
          'Stack de prova',
          'Valor',
          'Urgência / Escassez',
          'CTA',
          'Garantia',
          'Fechamento',
        ],
        nissin_miojo: [
          'Promessa dos 3 minutos',
          'Mini-VSL de aquecimento',
          'Aplicação imediata',
          'Prova relâmpago',
          'CTA',
          'Encerramento',
        ],
        aula_vendas: [
          'Estrutura da aula',
          'Epifania',
          'Prova de conceito',
          'Momento da oferta',
          'Bônus da aula',
          'Slide de fechamento',
          'Objeções',
          'CTA',
        ],
      }
      const blocks: ContentBlock[] = blockDefs[method].map((b, i) =>
        newBlock(b, i, scriptContent(b, inputs, brandProfile.base)),
      )
      const script: VideoScript = {
        id: current?.id || uid('vs'),
        method,
        inputs,
        blocks,
        status: 'gerado',
        contextVersion: res.contextVersion,
        createdAt: current?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...genSnapshot(res.contextVersion),
      }
      saveVideoScript(script)
      setCurrent(script)
      setGenState({ status: 'completed', pct: 100, label: 'Concluído' })
      toast.success(`Roteiro ${VIDEO_METHODS.find((m) => m.id === method)?.label} gerado!`)
    } catch (e) {
      setGenState({
        status: 'failed',
        pct: 0,
        label: '',
        error: e instanceof Error ? e.message : 'Falha na geração.',
      })
      toast.error('Falha na geração do roteiro.')
    }
  }

  const copyTXT = () => {
    if (!current) return
    const txt = current.blocks.map((b) => `[${b.blockType}]\n${b.text}`).join('\n\n')
    navigator.clipboard.writeText(txt)
    toast.success('Roteiro copiado (TXT)!')
  }

  const downloadMD = () => {
    if (!current) return
    const md =
      `# Roteiro — ${VIDEO_METHODS.find((m) => m.id === current.method)?.label}\n\n` +
      current.blocks.map((b) => `## ${b.blockType}\n\n${b.text}`).join('\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roteiro-${current.method}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Markdown baixado!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Roteiros de Vídeo</h3>

          {/* Campos comuns */}
          <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase text-[#22D3EE]">Campos comuns</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMMON_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === 'textarea' ? (
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={inputs[f.key] || ''}
                      onChange={(e) => setVal(f.key, e.target.value)}
                    />
                  ) : f.key === 'ticket' ? (
                    <select
                      className={inputClass}
                      value={inputs[f.key] || ''}
                      onChange={(e) => setVal(f.key, e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {TICKET_OPTS.map((t) => (
                        <option key={t} value={t}>
                          {labelTicket(t)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        className={inputClass}
                        value={inputs[f.key] || ''}
                        onChange={(e) => setVal(f.key, e.target.value)}
                        list={`dl-${f.key}`}
                      />
                      {f.autocomplete && (
                        <datalist id={`dl-${f.key}`}>
                          {f.key === 'oferta' && brandProfile.base.mainOffer && (
                            <option value={brandProfile.base.mainOffer} />
                          )}
                          {f.key === 'diferencial' && brandProfile.base.differential && (
                            <option value={brandProfile.base.differential} />
                          )}
                        </datalist>
                      )}
                    </>
                  )}
                </Field>
              ))}
            </div>
          </div>

          {/* Tabs de método */}
          <Tabs value={method} onValueChange={(v) => setMethod(v as VideoScriptMethod)}>
            <TabsList className="bg-[#0e0e15] border border-white/5 h-auto flex flex-wrap p-1 gap-1 w-full">
              {VIDEO_METHODS.map((m) => (
                <TabsTrigger
                  key={m.id}
                  value={m.id}
                  className="text-[11px] data-[state=active]:bg-[#7C5CFC] flex-1"
                >
                  {m.label} ({m.duration})
                </TabsTrigger>
              ))}
            </TabsList>
            {VIDEO_METHODS.map((m) => (
              <TabsContent key={m.id} value={m.id} className="mt-3 space-y-3">
                <p className="text-[11px] text-[#9494A8]">{m.structure}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SPECIFIC_FIELDS[m.id].map((f) => (
                    <Field key={f.key} label={f.label}>
                      {f.autocomplete ? (
                        <>
                          <input
                            className={inputClass}
                            value={inputs[f.key] || ''}
                            onChange={(e) => setVal(f.key, e.target.value)}
                            list={`dl-${f.key}`}
                          />
                          <datalist id={`dl-${f.key}`}>
                            {f.key === 'stack_prova' &&
                              brandProfile.assets
                                .find((a) => a.type === 'stack_de_prova')
                                ?.content.split('\n')
                                .filter(Boolean)
                                .map((line, i) => <option key={i} value={line} />)}
                          </datalist>
                        </>
                      ) : (
                        <textarea
                          className={inputClass}
                          rows={2}
                          value={inputs[f.key] || ''}
                          onChange={(e) => setVal(f.key, e.target.value)}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Botão gerar com estados */}
          <div className="space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={genState.status === 'queued' || genState.status === 'running'}
              className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-1.5 disabled:opacity-50 w-full"
            >
              <Sparkles
                className={`w-4 h-4 ${genState.status === 'queued' || genState.status === 'running' ? 'animate-spin' : ''}`}
              />
              {genState.status === 'queued'
                ? 'Enfileirado…'
                : genState.status === 'running'
                  ? 'Gerando…'
                  : 'Gerar Roteiro'}
            </Button>
            {genState.status === 'running' && (
              <div>
                <Progress value={genState.pct} className="h-1.5 bg-white/10" />
                <p className="text-[10px] text-[#9494A8] mt-1">{genState.label}</p>
              </div>
            )}
            {genState.status === 'failed' && (
              <p className="text-[11px] text-red-400">{genState.error}</p>
            )}
          </div>
          <p className="text-[10px] text-[#9494A8]">Rascunho salvo automaticamente a cada 2s.</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Roteiros salvos ({videoScripts.length})
          </p>
          {videoScripts.map((s) => (
            <div
              key={s.id}
              className="rounded-xl bg-[#14141C] border border-white/5 p-3 cursor-pointer hover:border-[#7C5CFC]/40"
              onClick={() => setCurrent(s)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {VIDEO_METHODS.find((m) => m.id === s.method)?.label}
                </span>
                <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                  {s.blocks.length} blocos
                </Badge>
              </div>
              <p className="text-[10px] text-[#9494A8] mt-1">v{s.contextVersion}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {VIDEO_METHODS.find((m) => m.id === current.method)?.label}
              </h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                v{current.contextVersion}
              </Badge>
            </div>
            {current.generated_at && (
              <p className="text-[10px] text-[#9494A8]">
                Gerado em {new Date(current.generated_at).toLocaleString('pt-BR')} • {current.model}
              </p>
            )}
            <BlockEditor
              blocks={current.blocks}
              onChange={(blocks) => {
                const u = { ...current, blocks, updatedAt: new Date().toISOString() }
                setCurrent(u)
                saveVideoScript(u)
              }}
              enableReorder
            />
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5 flex-1"
                onClick={copyTXT}
              >
                <Copy className="w-3.5 h-3.5" /> TXT
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5 flex-1"
                onClick={downloadMD}
              >
                <Download className="w-3.5 h-3.5" /> Markdown
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Video className="w-6 h-6" />}
            title="Nenhum roteiro"
            description="VSL Jon Benson, Nissin Miojo e Aula de Vendas. Campos comuns e específicos por método."
          />
        )}
      </div>
    </div>
  )
}

function newBlock(blockType: string, position: number, text: string): ContentBlock {
  return { id: uid('blk'), blockType, position, text, version: 1 }
}

function scriptContent(blockType: string, inputs: Record<string, string>, base: BrandBase): string {
  const oferta = inputs.oferta || base.mainOffer || base.service || 'seu serviço'
  const ticket = inputs.ticket ? labelTicket(inputs.ticket) : 'R$ 497'
  const persona = inputs.persona || base.audience || 'seu público'
  const dor = inputs.dor || 'a dor emocional'
  const resultado = inputs.resultado || base.result || 'o resultado'
  const cta = inputs.cta || 'Comprar agora'
  const diferencial = inputs.diferencial || base.differential || 'um sistema passo a passo'
  const map: Record<string, string> = {
    'Gancho de abertura': `${inputs.gancho_abertura || `Se você é ${persona} e ainda sofre com ${dor}, pare tudo e escute por 2 minutos.`}`,
    'Falsas soluções': `Talvez você já tentou cursos genéricos, mentoria de grupo, ferramentas mágicas. Nada disso resolve a raiz.`,
    'Mecanismo único': `Nosso método único: ${inputs.mecanismo_unico || diferencial} que ataca a causa real.`,
    'Stack de prova': `Stack de prova: ${inputs.stack_prova || 'cases reais, depoimentos, resultados mensuráveis e autoridade comprovada.'}`,
    Valor: `Isso vale ${ticket} — mas você também recebe bônus que multiplicam o ROI.`,
    'Urgência / Escassez': `${inputs.urgencia || 'Vagas encerram nesta semana. Decidir depois significa perder a condição.'}`,
    CTA: `${cta}: clique no botão e garanta sua vaga agora.`,
    Garantia: `${inputs.garantia || '7 dias de garantia incondicional. Se não for para você, devolvemos 100%.'}`,
    Fechamento: `Você tem duas escolhas: continuar com ${dor} ou garantir ${resultado}. A decisão é sua.`,
    'Promessa dos 3 minutos': `${inputs.promessa_3min || `Em 3 minutos você vai descobrir como ${persona} pode ${resultado} sem ${dor}.`}`,
    'Mini-VSL de aquecimento': `${inputs.mini_vsl || `Aquecimento rápido: mostre o problema, a virada e a prova de que é possível.`}`,
    'Aplicação imediata': `${inputs.aplicacao_imediata || `Aplique este único passo hoje e sinta a diferença ainda esta semana.`}`,
    'Prova relâmpago': `${inputs.prova_relampago || `Prova em 30s: resultado real de quem aplicou — antes e depois.`}`,
    Encerramento: `Decida agora. ${cta}.`,
    'Estrutura da aula': `${inputs.estrutura_aula || `Módulo 1: Diagnóstico • Módulo 2: Método • Módulo 3: Execução • Módulo 4: Resultado.`}`,
    Epifania: `O momento "aha": quando ${persona} entende que a virada é possível com ${diferencial}.`,
    'Prova de conceito': `Prova real de que ${resultado} é possível — case documentado.`,
    'Momento da oferta': `${inputs.momento_oferta || `A oferta surge naturalmente: "${oferta}" por ${ticket}.`}`,
    'Bônus da aula': `${inputs.bonus_aula || `Bônus exclusivos para quem decide agora: material complementar e suporte.`}`,
    'Slide de fechamento': `${inputs.slide_fechamento || `Slide final: ${cta}. Garantia de 7 dias. Escassez real.`}`,
    Objeções: `Objeções: é caro, não tenho tempo, já tentei. Resposta uma a uma com empatia e prova.`,
  }
  return map[blockType] || `Conteúdo do bloco ${blockType}.`
}

// ============================================================
// 4. ACADEMY
// ============================================================
const ACADEMY_LESSONS_ATIVOS = [
  {
    id: 'atv1',
    category: 'Estratégia',
    title: 'Como montar o ecossistema de ativos do seu funil',
    duration: '14 min',
    level: 'intermediário',
    youtubeId: 'dQw4w9WgXcQ',
    description:
      'Entenda como cada ativo se conecta a um funil aprovado e gera cobertura de copy-base.',
  },
  {
    id: 'atv2',
    category: 'Estratégia',
    title: 'Páginas de captura que convertem: anatomia de uma LP',
    duration: '18 min',
    level: 'iniciante',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Estrutura de seções, ganchos e formulário que maximizam opt-in.',
  },
  {
    id: 'atv3',
    category: 'Vendas',
    title: 'VSL Jon Benson: a estrutura completa do roteiro',
    duration: '22 min',
    level: 'avançado',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Do gancho à garantia — como estruturar uma VSL de 15-60 min que converte.',
  },
  {
    id: 'atv4',
    category: 'Vendas',
    title: 'Nissin Miojo: venda em 8-10 minutos',
    duration: '11 min',
    level: 'intermediário',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Promessa rápida, prova relâmpago e CTA direto para baixo ticket.',
  },
  {
    id: 'atv5',
    category: 'Vendas',
    title: 'Aula de Vendas: do framework ao slide de fechamento',
    duration: '20 min',
    level: 'avançado',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Estrutura de 20 minutos que converte por autoridade e oferta natural.',
  },
  {
    id: 'atv6',
    category: 'Edição',
    title: 'Exportando páginas para Elementor sem erros',
    duration: '9 min',
    level: 'iniciante',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'HTML semântico, sanitização e como colar no Elementor sem quebrar.',
  },
  {
    id: 'atv7',
    category: 'Instagram',
    title: 'Bio e taglines que conduzem ao funil',
    duration: '8 min',
    level: 'iniciante',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Como usar a bio como portão de entrada do seu ecossistema de ativos.',
  },
  {
    id: 'atv8',
    category: 'YouTube',
    title: 'Roteiro de YouTube longo com curva de retenção',
    duration: '16 min',
    level: 'intermediário',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Aplique os blocos de roteiro em vídeos longos para gerar tráfego qualificado.',
  },
]

const ACADEMY_CATEGORIES = ['Instagram', 'TikTok', 'YouTube', 'Edição', 'Estratégia', 'Vendas']

function AcademyPanel() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, { completed: boolean; pct: number }>>(
    () => {
      try {
        const saved = localStorage.getItem('lumen_academy_progress')
        return saved ? JSON.parse(saved) : {}
      } catch {
        return {}
      }
    },
  )

  useEffect(() => {
    localStorage.setItem('lumen_academy_progress', JSON.stringify(progress))
  }, [progress])

  const filtered =
    activeCategory === 'all'
      ? ACADEMY_LESSONS_ATIVOS
      : ACADEMY_LESSONS_ATIVOS.filter((l) => l.category === activeCategory)

  // Continuar assistindo: última aula com progresso > 0 e < 100
  const continueLesson = useMemo(() => {
    const inProgress = ACADEMY_LESSONS_ATIVOS.filter((l) => {
      const p = progress[l.id]
      return p && p.pct > 0 && p.pct < 100
    }).sort((a, b) => (progress[b.id]?.pct || 0) - (progress[a.id]?.pct || 0))
    return inProgress[0] || null
  }, [progress])

  const levelColor: Record<string, string> = {
    iniciante: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    intermediário: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    avançado: 'bg-red-500/15 text-red-400 border-red-500/30',
  }

  return (
    <div className="space-y-4">
      {/* Continuar assistindo */}
      {continueLesson && (
        <div className="rounded-2xl bg-gradient-to-r from-[#7C5CFC]/15 to-[#22D3EE]/10 border border-[#7C5CFC]/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-[#7C5CFC]" />
            <span className="text-xs font-bold text-white">Continuar assistindo</span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{continueLesson.title}</p>
              <p className="text-[11px] text-[#9494A8]">
                {continueLesson.category} • {continueLesson.duration} •{' '}
                {progress[continueLesson.id]?.pct || 0}%
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setOpenLessonId(continueLesson.id)
                setActiveCategory('all')
              }}
              className="bg-[#7C5CFC] text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Retomar
            </Button>
          </div>
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE]"
              style={{ width: `${progress[continueLesson.id]?.pct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Filtros por categoria */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeCategory === 'all' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
        >
          Todas
        </button>
        {ACADEMY_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeCategory === c ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cards de aulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lesson) => {
          const p = progress[lesson.id] || { completed: false, pct: 0 }
          const isOpen = openLessonId === lesson.id
          return (
            <div
              key={lesson.id}
              className="rounded-xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/40 overflow-hidden transition-all"
            >
              <div
                className="relative aspect-video bg-[#1C1C27] overflow-hidden cursor-pointer group"
                onClick={() => setOpenLessonId(isOpen ? null : lesson.id)}
              >
                <img
                  src={`https://img.usecurling.com/p/640/360?q=${encodeURIComponent(lesson.category + ' marketing video')}&color=purple`}
                  alt={lesson.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[#7C5CFC]/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-current" />
                  </div>
                </div>
                <Badge className={`absolute top-2 left-2 ${levelColor[lesson.level]} text-[9px]`}>
                  {lesson.level}
                </Badge>
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[9px]">
                    {lesson.category}
                  </Badge>
                  {p.completed && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
                      Concluído
                    </Badge>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-2">{lesson.title}</h4>
                <div className="pt-1">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#9494A8] mt-1">{p.pct}% assistido</p>
                </div>
              </div>

              {/* Player inline (não em modal) */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-3">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black border border-white/10">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${lesson.youtubeId}`}
                      title={lesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="text-[11px] text-slate-300">{lesson.description}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progress[lesson.id]?.pct || 0}
                      onChange={(e) =>
                        setProgress((prev) => ({
                          ...prev,
                          [lesson.id]: {
                            pct: Number(e.target.value),
                            completed:
                              Number(e.target.value) >= 100
                                ? true
                                : prev[lesson.id]?.completed || false,
                          },
                        }))
                      }
                      className="flex-1 accent-[#7C5CFC]"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-[10px] gap-1"
                      onClick={() =>
                        setProgress((prev) => ({
                          ...prev,
                          [lesson.id]: { pct: 100, completed: true },
                        }))
                      }
                    >
                      Concluir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
