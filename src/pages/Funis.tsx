import React, { useState } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import {
  ModuleHeader,
  EmptyState,
  Field,
  inputClass,
  GenerateButton,
  AcademyPanel,
} from '@/components/marketing/Shared'
import {
  FunnelDiagnosis,
  FunnelEcosystem,
  FunnelPlan,
  ChecklistItem,
  FunnelCatalogItem,
} from '@/types/platform'
import { FUNNEL_CATALOG, eligibleFunnels } from '@/lib/funnel-catalog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Filter,
  GitBranch,
  CheckCircle2,
  Download,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Map,
} from 'lucide-react'
import { toast } from 'sonner'

const STAGE_LABEL = { entrada: 'Entrada', nutricao: 'Nutrição', conversao: 'Conversão' }

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export default function Funis() {
  const { ecosystem, setEcosystem, funnelPlans, setFunnelPlans, brandProfile } = usePlatform()
  const { generate } = useAIGeneration()
  const [diag, setDiag] = useState<FunnelDiagnosis>(
    ecosystem?.diagnosis || {
      ladder: brandProfile.base.mainOffer || '',
      offerName: '',
      ticket: '',
      validation: '1_2_vezes',
      audience: 'pequena_engajada',
      objective: 'leads',
      hoursPerWeek: 8,
      budget: 'R$ 500/mês',
      appearsInVideo: true,
      hasTeam: false,
      heating: 'hibrido',
      niche: brandProfile.base.niche || '',
    },
  )
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const status = ecosystem?.status || 'diagnostico'

  const handleRecommend = async () => {
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'funil_recomendacao',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1800,
    )
    const eligible = eligibleFunnels(diag)
    const entrada = eligible.filter((f) => f.stage === 'entrada').slice(0, 2)
    const nutricao = eligible.filter((f) => f.stage === 'nutricao').slice(0, 2)
    const conversao = eligible.filter((f) => f.stage === 'conversao').slice(0, 2)
    const selected = [
      ...entrada.map((f) => ({
        catalogItemId: f.id,
        stage: 'entrada' as const,
        justification: `Ideal para ${diag.objective} com audiência ${diag.audience}.`,
      })),
      ...nutricao.map((f) => ({
        catalogItemId: f.id,
        stage: 'nutricao' as const,
        justification: `Nutrição compatível com ${diag.heating}.`,
      })),
      ...conversao.map((f) => ({
        catalogItemId: f.id,
        stage: 'conversao' as const,
        justification: `Conversão para ticket ${diag.ticket || 'médio'}.`,
      })),
    ]
    const eco: FunnelEcosystem = {
      diagnosis: diag,
      status: 'recomendado',
      rationale: `Tese geral: para um negócio de ${diag.niche || 'seu nicho'} com validação "${diag.validation}" e audiência "${diag.audience}", o ecossistema prioriza ${diag.objective}. Recursos: ${diag.hoursPerWeek}h/semana, ${diag.budget}.`,
      version: 1,
      selected,
      createdAt: new Date().toISOString(),
    }
    setEcosystem(eco)
    setLoading(false)
    setProgress(0)
    toast.success('Ecossistema recomendado!')
  }

  const handleApprove = () => {
    if (!ecosystem) return
    // Gera planos para cada funil aprovado
    const plans: FunnelPlan[] = ecosystem.selected.map((s, i) => {
      const item = FUNNEL_CATALOG.find((f) => f.id === s.catalogItemId)!
      return buildPlan(item, s.justification, i + 1)
    })
    setFunnelPlans(plans)
    setEcosystem({ ...ecosystem, status: 'aprovado' })
    toast.success('Ecossistema aprovado! Planos detalhados liberados.')
  }

  const handleReview = () => {
    if (!ecosystem) return
    setEcosystem({ ...ecosystem, status: 'em_revisao' })
    toast.info('Em revisão — você pode trocar modelos sem perder a versão aprovada.')
  }

  const swapFunnel = (idx: number, newId: string) => {
    if (!ecosystem) return
    const item = FUNNEL_CATALOG.find((f) => f.id === newId)!
    const selected = [...ecosystem.selected]
    selected[idx] = {
      catalogItemId: newId,
      stage: item.stage,
      justification: 'Troca manual pelo usuário.',
    }
    setEcosystem({ ...ecosystem, selected })
    toast.success(`${item.name} selecionado para ${STAGE_LABEL[item.stage]}.`)
  }

  const eligible = eligibleFunnels(diag)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 3 — Funis"
        description="Recomende um ecossistema de aquisição e conversão de acordo com oferta, validação, audiência, objetivo, recursos e nicho."
        icon={<GitBranch className="w-5 h-5" />}
        accent="#7C5CFC"
        actions={
          status === 'aprovado' && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5"
              onClick={() => toast.success('PDF do ecossistema gerado!')}
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
          )
        }
      />

      {/* Raio-X */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#7C5CFC]" /> Raio-X
          </h3>
          <Badge className={statusBadge(status)}>{statusLabel(status)}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Esteira (do Brand OS)" hint="Corrigir apenas para esta geração">
            <textarea
              className={inputClass}
              rows={2}
              value={diag.ladder}
              onChange={(e) => setDiag({ ...diag, ladder: e.target.value })}
            />
          </Field>
          <Field label="Oferta (nome)">
            <input
              className={inputClass}
              value={diag.offerName}
              onChange={(e) => setDiag({ ...diag, offerName: e.target.value })}
              placeholder="Produto principal"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Ticket">
            <input
              className={inputClass}
              value={diag.ticket}
              onChange={(e) => setDiag({ ...diag, ticket: e.target.value })}
              placeholder="R$ 497"
            />
          </Field>
          <Field label="Validação">
            <select
              className={inputClass}
              value={diag.validation}
              onChange={(e) =>
                setDiag({ ...diag, validation: e.target.value as FunnelDiagnosis['validation'] })
              }
            >
              <option value="nunca_vendeu">Nunca vendeu</option>
              <option value="1_2_vezes">1-2 vezes informal</option>
              <option value="recorrente">Recorrente</option>
            </select>
          </Field>
          <Field label="Audiência">
            <select
              className={inputClass}
              value={diag.audience}
              onChange={(e) =>
                setDiag({ ...diag, audience: e.target.value as FunnelDiagnosis['audience'] })
              }
            >
              <option value="sem">Sem audiência</option>
              <option value="pequena_fria">Pequena fria</option>
              <option value="pequena_engajada">Pequena engajada</option>
              <option value="media">Média</option>
              <option value="grande">Grande</option>
              <option value="parada">Base parada</option>
            </select>
          </Field>
          <Field label="Objetivo">
            <select
              className={inputClass}
              value={diag.objective}
              onChange={(e) =>
                setDiag({ ...diag, objective: e.target.value as FunnelDiagnosis['objective'] })
              }
            >
              <option value="leads">Leads</option>
              <option value="aquecer">Aquecer</option>
              <option value="fechar_direto">Fechar direto</option>
              <option value="lancar">Lançar</option>
              <option value="crescer_seguidores">Crescer seguidores</option>
              <option value="vender_digital">Vender produto digital</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label={`Horas/semana: ${diag.hoursPerWeek}`}>
            <input
              type="range"
              min={1}
              max={40}
              value={diag.hoursPerWeek}
              onChange={(e) => setDiag({ ...diag, hoursPerWeek: Number(e.target.value) })}
              className="w-full accent-[#7C5CFC]"
            />
          </Field>
          <Field label="Orçamento de tráfego">
            <input
              className={inputClass}
              value={diag.budget}
              onChange={(e) => setDiag({ ...diag, budget: e.target.value })}
            />
          </Field>
          <Field label="Aparece em vídeo?">
            <select
              className={inputClass}
              value={String(diag.appearsInVideo)}
              onChange={(e) => setDiag({ ...diag, appearsInVideo: e.target.value === 'true' })}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </Field>
          <Field label="Tem equipe?">
            <select
              className={inputClass}
              value={String(diag.hasTeam)}
              onChange={(e) => setDiag({ ...diag, hasTeam: e.target.value === 'true' })}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Aquecimento">
            <select
              className={inputClass}
              value={diag.heating}
              onChange={(e) =>
                setDiag({ ...diag, heating: e.target.value as FunnelDiagnosis['heating'] })
              }
            >
              <option value="organico">Orgânico</option>
              <option value="pago">Pago</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </Field>
          <Field label="Nicho">
            <input
              className={inputClass}
              value={diag.niche}
              onChange={(e) => setDiag({ ...diag, niche: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GenerateButton
            onClick={handleRecommend}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            label="Recomendar ecossistema"
          />
          {status === 'recomendado' && (
            <Button
              size="sm"
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Aprovar ecossistema
            </Button>
          )}
          {status === 'aprovado' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReview}
              className="border-white/10 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Rever ecossistema
            </Button>
          )}
        </div>
      </div>

      {/* Recomendação */}
      {ecosystem && (
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Ecossistema recomendado</h3>
          <p className="text-xs text-slate-300 rounded-lg bg-[#0e0e15]/60 p-3 border-l-2 border-[#7C5CFC]">
            {ecosystem.rationale}
          </p>
          <div className="space-y-2">
            {ecosystem.selected.map((s, i) => {
              const item = FUNNEL_CATALOG.find((f) => f.id === s.catalogItemId)
              if (!item) return null
              const eligForStage = eligible.filter((f) => f.stage === s.stage)
              return (
                <div key={i} className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C5CFC] text-white text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <Badge className="bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30 text-[10px]">
                        {STAGE_LABEL[s.stage]}
                      </Badge>
                      <span className="text-sm font-bold text-white">{item.name}</span>
                    </div>
                    {(status === 'recomendado' || status === 'em_revisao') &&
                      eligForStage.length > 1 && (
                        <select
                          className="bg-[#1C1C27] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                          value={s.catalogItemId}
                          onChange={(e) => swapFunnel(i, e.target.value)}
                        >
                          {eligForStage.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      )}
                  </div>
                  <p className="text-[11px] text-[#9494A8]">{s.justification}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Planos por funil */}
      {status === 'aprovado' && funnelPlans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Planos por funil</h3>
          {funnelPlans.map((p, i) => {
            const item = FUNNEL_CATALOG.find((f) => f.id === p.catalogItemId)!
            const isOpen = selectedPlan === p.catalogItemId
            const checklistDone = p.checklist.filter((c) => c.done).length
            return (
              <div
                key={i}
                className="rounded-2xl bg-[#14141C] border border-white/5 overflow-hidden"
              >
                <button
                  onClick={() => setSelectedPlan(isOpen ? null : p.catalogItemId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C5CFC] text-white text-[10px] font-bold">
                      {p.order}
                    </span>
                    <span className="text-sm font-bold text-white">{item.name}</span>
                    <Badge className="bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30 text-[10px]">
                      {STAGE_LABEL[item.stage]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                      {checklistDone}/{p.checklist.length}
                    </Badge>
                    <ChevronRight
                      className={`w-4 h-4 text-[#9494A8] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>
                {isOpen && <FunnelPlanDetail plan={p} itemName={item.name} />}
              </div>
            )
          })}
        </div>
      )}

      <AcademyPanel
        moduleTitle="Funis"
        lessons={[
          { title: 'Como preencher o Raio-X', duration: '8 min' },
          { title: 'Entendendo o catálogo de 24 funis', duration: '12 min' },
          { title: 'Recomendação, revisão e aprovação', duration: '10 min' },
          { title: 'Lendo o plano por funil', duration: '9 min' },
          { title: 'Checklist de execução', duration: '6 min' },
        ]}
      />
    </div>
  )
}

function FunnelPlanDetail({ plan, itemName }: { plan: FunnelPlan; itemName: string }) {
  const { setFunnelPlans, funnelPlans } = usePlatform()
  const toggleCheck = (id: string) => {
    const updated = funnelPlans.map((p) =>
      p.catalogItemId === plan.catalogItemId
        ? {
            ...p,
            checklist: p.checklist.map((c) =>
              c.id === id
                ? { ...c, done: !c.done, doneAt: !c.done ? new Date().toISOString() : null }
                : c,
            ),
          }
        : p,
    )
    setFunnelPlans(updated)
  }
  const tabs = [
    'Análise',
    'Estrutura',
    'Config técnica',
    'Cadência',
    'Alertas',
    'Mapa',
    'Ativos',
    'Checklist',
  ] as const
  const [tab, setTab] = useState<(typeof tabs)[number]>('Análise')
  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${tab === t ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-300">
        {tab === 'Análise' && (
          <div className="rounded-lg bg-[#0e0e15]/60 p-3 border-l-2 border-[#7C5CFC]">
            {plan.analysis}
          </div>
        )}
        {tab === 'Estrutura' && (
          <ol className="space-y-1">
            {plan.structure.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#7C5CFC] font-bold">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}
        {tab === 'Config técnica' && (
          <ul className="space-y-1">
            {plan.techConfig.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#22D3EE]">▸</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === 'Cadência' && (
          <ul className="space-y-1">
            {plan.cadence.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#22D3EE] font-bold">D{i + 1}:</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === 'Alertas' && (
          <ul className="space-y-1">
            {plan.alerts.map((s, i) => (
              <li key={i} className="flex gap-2 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === 'Mapa' && (
          <div className="flex flex-wrap items-center gap-1">
            {plan.map.map((s, i) => (
              <React.Fragment key={i}>
                <span className="px-2 py-1 rounded-lg bg-[#1C1C27] text-[11px] text-white">
                  {s}
                </span>
                {i < plan.map.length - 1 && <ChevronRight className="w-3 h-3 text-[#9494A8]" />}
              </React.Fragment>
            ))}
          </div>
        )}
        {tab === 'Ativos' && (
          <div className="space-y-1.5">
            {plan.assets.map((a, i) => (
              <div key={i} className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                <p className="font-semibold text-white">{a.type}</p>
                <p className="text-[11px] text-[#9494A8]">{a.rationale}</p>
                <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px] mt-1">
                  {a.recommended}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {tab === 'Checklist' && (
          <div className="space-y-1.5">
            {plan.checklist.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-lg bg-[#0e0e15]/60 p-2.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={() => toggleCheck(c.id)}
                  className="accent-[#7C5CFC]"
                />
                <span
                  className={`text-xs flex-1 ${c.done ? 'line-through text-[#9494A8]' : 'text-white'}`}
                >
                  {c.title}
                </span>
                <Badge
                  className={`text-[10px] ${c.priority === 'alta' ? 'bg-red-500/15 text-red-400 border-red-500/30' : c.priority === 'media' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-white/5 text-[#9494A8] border-white/10'}`}
                >
                  {c.priority}
                </Badge>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-[10px] text-[#9494A8]">
          {plan.generatedAt
            ? `Gerado em ${new Date(plan.generatedAt).toLocaleDateString('pt-BR')}`
            : 'Não gerado'}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 text-[11px] gap-1.5"
          onClick={() => toast.success(`Plano de "${itemName}" regenerado!`)}
        >
          <RefreshCw className="w-3 h-3" /> Regenerar
        </Button>
      </div>
    </div>
  )
}

function buildPlan(item: FunnelCatalogItem, justification: string, order: number): FunnelPlan {
  return {
    catalogItemId: item.id,
    order,
    analysis: `${item.name} faz sentido porque ${justification.toLowerCase()} O modelo atende ${item.stage} com ticket compatível.`,
    structure: [
      `Origem: tráfego ${item.stage === 'entrada' ? 'frio' : 'orgânico'}`,
      'Captura: lead opt-in',
      'Página: captura/VSL',
      'Follow-up: sequência de e-mail/DM',
      'Conversão: oferta principal',
    ],
    techConfig: [
      'Ferramenta: ManyChat + Landing page',
      'Configuração: automação de DM',
      'Integração: CRM/planilha',
      'Pixel: Meta + GA4',
    ],
    cadence: [
      'Conteúdo de aquecimento',
      'Oferta indireta',
      'Oferta direta',
      'Follow-up 24h',
      'Follow-up 72h',
    ],
    alerts: [
      'Não pular aquecimento',
      'Evitar oferta precoce no topo',
      'Manter consistência de cadência',
      'Proteger lista de warm leads',
    ],
    map: ['Origem', 'Captura', 'Página', 'Vídeo', 'Conversão'],
    assets: [
      { type: 'Página de captura', recommended: 'Captura', rationale: 'Coletar leads no topo.' },
      { type: 'VSL', recommended: 'VSL', rationale: 'Conversão por vídeo.' },
      { type: 'Vídeo de autoridade', recommended: 'Autoridade', rationale: 'Aquecimento.' },
    ],
    checklist: [
      {
        id: uid('ck'),
        title: 'Configurar pixel e eventos',
        priority: 'alta',
        done: false,
        doneAt: null,
      },
      {
        id: uid('ck'),
        title: 'Criar página de captura',
        priority: 'alta',
        done: false,
        doneAt: null,
      },
      { id: uid('ck'), title: 'Gravar VSL', priority: 'media', done: false, doneAt: null },
      {
        id: uid('ck'),
        title: 'Configurar automação de DM',
        priority: 'media',
        done: false,
        doneAt: null,
      },
      {
        id: uid('ck'),
        title: 'Testar fluxo completo',
        priority: 'alta',
        done: false,
        doneAt: null,
      },
      {
        id: uid('ck'),
        title: 'Subir campanha de tráfego',
        priority: 'baixa',
        done: false,
        doneAt: null,
      },
    ],
    generatedAt: new Date().toISOString(),
  }
}

function statusBadge(s: string) {
  switch (s) {
    case 'diagnostico':
      return 'bg-white/5 text-[#9494A8] border-white/10'
    case 'recomendado':
      return 'bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30'
    case 'aprovado':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'em_revisao':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    default:
      return 'bg-white/5 text-[#9494A8] border-white/10'
  }
}
function statusLabel(s: string) {
  switch (s) {
    case 'diagnostico':
      return 'Diagnóstico'
    case 'recomendado':
      return 'Recomendado'
    case 'aprovado':
      return 'Aprovado'
    case 'em_revisao':
      return 'Em revisão'
    default:
      return s
  }
}
