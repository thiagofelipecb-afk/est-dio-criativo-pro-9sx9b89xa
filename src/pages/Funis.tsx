import React, { useEffect, useMemo, useState } from 'react'
import { wait } from '@/lib/funnel-catalog'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import {
  ModuleHeader,
  EmptyState,
  Field,
  inputClass,
  AcademyPanel,
  useDebouncedEffect,
} from '@/components/marketing/Shared'
import {
  FunnelDiagnosis,
  FunnelEcosystem,
  FunnelPlan,
  FunnelPlanStage,
  FunnelPlanAsset,
  ChecklistItem,
  ChecklistPrioridade,
  FunnelCatalogItem,
  BrandAsset,
} from '@/types/platform'
import {
  FUNNEL_CATALOG,
  isFunnelEligible,
  eligibleFunnels,
  eligibleFunnelsForStage,
  recommendFunnels,
  labelTicket,
  labelValidacao,
  labelAudiencia,
  labelObjetivo,
  labelHoras,
  labelOrcamento,
  labelFazVideo,
  labelEquipe,
  labelAquecimento,
  labelDificuldade,
  labelStatus,
  labelEtapa,
} from '@/lib/funnel-catalog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  GitBranch,
  Filter,
  CheckCircle2,
  Download,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Map as MapIcon,
  Sparkles,
  RotateCcw,
  Eye,
  History,
  Loader2,
  XCircle,
  ArrowRight,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// Opções dos selects do Raio-X
const TICKET_OPTS = ['ate_97', '97_297', '297_997', '997_2497', '2497_9997', 'acima_9997'] as const
const VALIDACAO_OPTS = [
  'nao_validado',
  'alguns_clientes',
  'clientes_recorrentes',
  'escalando',
  'dominante',
] as const
const AUDIENCIA_OPTS = ['0_500', '500_2k', '2k_10k', '10k_50k', '50k_200k', '200k_mais'] as const
const OBJETIVO_OPTS = [
  'aquisicao_leads',
  'vendas_diretas',
  'nutricao_relacionamento',
  'lancamento',
  'recorrencia_retencao',
  'escala_anuncios',
] as const
const HORAS_OPTS = ['1_5h', '5_10h', '10_20h', '20_40h', 'full_time_equipe'] as const
const ORCAMENTO_OPTS = ['0_500', '500_2000', '2000_10000', '10000_mais'] as const
const FAZ_VIDEO_OPTS = ['nao_gravo', 'esporadicamente', 'regularmente', 'avancado'] as const
const EQUIPE_OPTS = [
  'solo',
  'freelancers_pontuais',
  'equipe_enxuta',
  'equipe_4_10',
  'agencia_empresa',
] as const
const AQUECIMENTO_OPTS = ['fria', 'morna', 'quente', 'mista'] as const

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

function emptyDiagnosis(): FunnelDiagnosis {
  return {
    oferta_esteira: '',
    produto_principal: '',
    ticket: '',
    validacao: '',
    audiencia: '',
    objetivo: '',
    horas_semana: '',
    orcamento: '',
    faz_video: '',
    equipe: '',
    aquecimento: '',
    nicho: '',
  }
}

export default function Funis() {
  const {
    funnelDiagnosis,
    funnelDiagnosisAutosave,
    snapshotFunnelDiagnosis,
    restoreFunnelDiagnosisVersion,
    ecosystem,
    setEcosystem,
    funnelPlans,
    setFunnelPlans,
    brandProfile,
    hasBrandOS,
  } = usePlatform()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()

  const [diag, setDiag] = useState<FunnelDiagnosis>(
    funnelDiagnosis?.current || ecosystem?.diagnosis || emptyDiagnosis(),
  )
  const [savedTick, setSavedTick] = useState<string | null>(null)
  const [modalState, setModalState] = useState<
    | null
    | { kind: 'queued' }
    | { kind: 'running'; pct: number; label: string }
    | { kind: 'completed'; eco: FunnelEcosystem }
    | { kind: 'failed'; error: string }
  >(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)

  // Pré-preenche nicho do Brand OS se vazio
  useEffect(() => {
    if (!diag.nicho && brandProfile.base.niche) {
      setDiag((d) => ({ ...d, nicho: brandProfile.base.niche }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandProfile.base.niche])

  // Autosave debounce 2s
  useDebouncedEffect(
    diag,
    (v) => {
      funnelDiagnosisAutosave(v)
      setSavedTick(new Date().toISOString())
    },
    2000,
  )

  const status = ecosystem?.status || 'diagnostico'

  const filledCount = useMemo(() => countFilled(diag), [diag])
  const canRecommend = filledCount >= 8

  // ---- Ações ----
  const handleRecommend = async () => {
    setModalState({ kind: 'queued' })
    try {
      // pequena pausa para mostrar estado "queued"
      await wait(400)
      setModalState({ kind: 'running', pct: 10, label: 'Carregando contexto do Brand OS…' })
      await generate(
        'funil_recomendacao',
        (pct, label) => setModalState({ kind: 'running', pct, label }),
        1800,
      )
      const eco = recommendFunnels(diag, {
        nicho: brandProfile.base.niche,
        oferta: brandProfile.base.mainOffer,
        voz: brandProfile.base.voice,
        diferencial: brandProfile.base.differential,
      })
      if (eco.selected.length === 0) {
        setModalState({
          kind: 'failed',
          error:
            'Nenhum funil elegível encontrado para este Raio-X. Ajuste ticket, validação ou audiência.',
        })
        return
      }
      // preserva última versão aprovada se houver
      if (ecosystem?.approvedSelected) {
        eco.approvedSelected = ecosystem.approvedSelected
        eco.approvedAt = ecosystem.approvedAt
      }
      setEcosystem(eco)
      setModalState({ kind: 'completed', eco })
      toast.success('Ecossistema recomendado!')
    } catch (e) {
      setModalState({
        kind: 'failed',
        error: e instanceof Error ? e.message : 'Falha ao gerar recomendação.',
      })
    }
  }

  const handleApprove = () => {
    if (!ecosystem) return
    // Idempotente: se já aprovado, não duplica
    if (ecosystem.status === 'aprovado') {
      toast.info('Ecossistema já aprovado.')
      return
    }
    const plans: FunnelPlan[] = ecosystem.selected.map((s, i) => {
      const item = FUNNEL_CATALOG.find((f) => f.id === s.catalogItemId)!
      return buildPlan(item, s.justificativa, i + 1, diag, brandProfile.assets)
    })
    setFunnelPlans(plans)
    setEcosystem({
      ...ecosystem,
      status: 'aprovado',
      approvedSelected: ecosystem.selected,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    toast.success('Ecossistema aprovado! Planos detalhados liberados.')
  }

  const handleReview = () => {
    if (!ecosystem) return
    setEcosystem({ ...ecosystem, status: 'em_revisao', updatedAt: new Date().toISOString() })
    toast.info('Em revisão — planos da última aprovação continuam visíveis.')
  }

  const handleRestart = () => {
    setEcosystem(null)
    setFunnelPlans([])
    setSelectedPlanId(null)
    toast.info('Ecossistema limpo. Volte ao Raio-X para recomeçar.')
  }

  const swapFunnel = (idx: number, newId: string) => {
    if (!ecosystem) return
    const item = FUNNEL_CATALOG.find((f) => f.id === newId)
    if (!item) return
    const selected = [...ecosystem.selected]
    selected[idx] = {
      catalogItemId: newId,
      etapa: item.etapa,
      justificativa: ecosystem.justificativas[newId] || 'Troca manual pelo usuário.',
    }
    setEcosystem({ ...ecosystem, selected, updatedAt: new Date().toISOString() })
    toast.success(`${item.nome} selecionado para ${ETAPA_LABEL[item.etapa]}.`)
  }

  const exportEcosystem = () => {
    const lines: string[] = []
    lines.push('═══════════════════════════════════════════')
    lines.push('  ECOSSISTEMA DE FUNIS — LUMEN Studio')
    lines.push('═══════════════════════════════════════════')
    lines.push('')
    lines.push(`Nicho: ${diag.nicho || '—'}`)
    lines.push(`Oferta principal: ${diag.produto_principal || '—'}`)
    lines.push(`Ticket: ${diag.ticket ? labelTicket(diag.ticket) : '—'}`)
    lines.push(`Validação: ${diag.validacao ? labelValidacao(diag.validacao) : '—'}`)
    lines.push(`Audiência: ${diag.audiencia ? labelAudiencia(diag.audiencia) : '—'}`)
    lines.push('')
    lines.push('TESE GERAL:')
    lines.push(ecosystem?.tese_geral || ecosystem?.rationale || '—')
    lines.push('')
    lines.push('FUNIS APROVADOS:')
    lines.push('')
    funnelPlans.forEach((p) => {
      const item = FUNNEL_CATALOG.find((f) => f.id === p.catalogItemId)
      lines.push(`───────────────────────────────────────────`)
      lines.push(
        `#${p.order} — ${item?.nome || p.catalogItemId}  [${item ? ETAPA_LABEL[item.etapa] : ''}]`,
      )
      lines.push(
        `Dificuldade: ${item ? labelDificuldade(item.dificuldade) : '—'}  |  Tempo: ${item?.tempo_estimado || '—'}`,
      )
      lines.push('')
      lines.push('ANÁLISE ESTRATÉGICA:')
      lines.push(p.analysis)
      lines.push('')
      lines.push('ESTRUTURA:')
      p.estrutura.forEach((s) =>
        lines.push(`  ${s.ordem}. ${s.nome} (${s.canal}, ${s.duracao}) — ${s.descricao}`),
      )
      lines.push('')
      lines.push('CONFIGURAÇÃO TÉCNICA:')
      p.techConfig.forEach((s) => lines.push(`  • ${s}`))
      lines.push('')
      lines.push('CADÊNCIA:')
      p.cadence.forEach((s) => lines.push(`  • ${s}`))
      lines.push('')
      lines.push('ALERTAS:')
      p.alerts.forEach((s) => lines.push(`  ⚠ ${s}`))
      lines.push('')
      lines.push('MAPA:')
      lines.push('  ' + p.mapa.join(' → '))
      lines.push('')
      lines.push('ATIVOS (Brand OS):')
      p.ativos.forEach((a) => lines.push(`  • [${a.status}] ${a.nome} — ${a.rationale}`))
      lines.push('')
      const done = p.checklist.filter((c) => c.concluido_em).length
      lines.push(`CHECKLIST (${done}/${p.checklist.length}):`)
      p.checklist.forEach((c) =>
        lines.push(`  [${c.concluido_em ? 'x' : ' '}] (${c.prioridade}) ${c.title}`),
      )
      lines.push('')
    })
    lines.push('═══════════════════════════════════════════')
    const text = lines.join('\n')
    console.log('[LUMEN] Exportar Ecossistema de Funis\n', text)
    try {
      navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
    toast.success('Ecossistema exportado! (texto copiado + console.log)')
  }

  const eligible = eligibleFunnels(diag)

  // Progresso geral: Diagnóstico → Recomendação → Planos
  const stepProgress = (() => {
    if (status === 'diagnostico') return Math.round((filledCount / 12) * 33)
    if (status === 'recomendado' || status === 'em_revisao') return 66
    return 100
  })()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 3 — Funis"
        description="Raio-X do negócio, catálogo de 21 modelos e ecossistema de aquisição e conversão recomendado por IA."
        icon={<GitBranch className="w-5 h-5" />}
        accent="#7C5CFC"
        actions={
          status === 'aprovado' && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5"
              onClick={exportEcosystem}
            >
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          )
        }
      />

      {/* Banner Brand OS ausente */}
      {!hasBrandOS && (
        <button
          onClick={() => navigate('/posicionamento')}
          className="w-full flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-500/15 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-200">
            ⚠️ Configure seu Brand OS em Posicionamento para recomendações mais precisas.{' '}
            <span className="underline">Clique para ir.</span>
          </span>
        </button>
      )}

      {/* Barra de progresso geral */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[#9494A8]">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Diagnóstico {filledCount}/12
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Recomendação
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Planos
          </span>
        </div>
        <Progress value={stepProgress} className="h-1.5 bg-white/10" />
        <div className="flex items-center justify-between">
          <Badge className={statusBadge(status)}>{statusLabel(status)}</Badge>
          {savedTick && (
            <span className="text-[10px] text-[#9494A8]/70">
              Rascunho salvo às {new Date(savedTick).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Raio-X */}
      <RaioXForm
        diag={diag}
        setDiag={setDiag}
        filledCount={filledCount}
        canRecommend={canRecommend}
        status={status}
        onRecommend={handleRecommend}
        onApprove={handleApprove}
        onReview={handleReview}
        onRestart={handleRestart}
        brandNiche={brandProfile.base.niche}
        versions={funnelDiagnosis.versions}
        onSnapshot={() => {
          snapshotFunnelDiagnosis(`Snapshot ${new Date().toLocaleString('pt-BR')}`)
          toast.success('Versão do diagnóstico salva.')
        }}
        onRestore={(v) => {
          restoreFunnelDiagnosisVersion(v)
          // recarrega do contexto
          setTimeout(() => {
            const fresh = JSON.parse(localStorage.getItem('lumen_funnel_diagnosis') || '{}')
            if (fresh?.current) setDiag(fresh.current)
          }, 50)
          setShowVersions(false)
          toast.success(`Versão #${v} restaurada.`)
        }}
        showVersions={showVersions}
        setShowVersions={setShowVersions}
      />

      {/* Recomendação / Ecossistema */}
      {ecosystem && (status === 'recomendado' || status === 'em_revisao') && (
        <EcosystemPanel
          ecosystem={ecosystem}
          diag={diag}
          onSwap={swapFunnel}
          onApprove={handleApprove}
          onReview={handleReview}
        />
      )}

      {/* Planos por funil (aprovado ou em_revisao com planos) */}
      {funnelPlans.length > 0 && (status === 'aprovado' || status === 'em_revisao') && (
        <PlansSection
          plans={funnelPlans}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
        />
      )}

      {/* Estado vazio: sem ecossistema */}
      {!ecosystem && (
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="Nenhum ecossistema gerado"
          description="Preencha o Raio-X do negócio (mínimo 8 de 12 campos) e clique em Recomendar Ecossistema para gerar a arquitetura de funis."
          example="Oferta, ticket, validação de mercado, audiência, objetivo, recursos e nicho."
        />
      )}

      {/* Modal de progresso da recomendação */}
      <RecommendModal
        state={modalState}
        onClose={() => setModalState(null)}
        onRetry={handleRecommend}
      />

      <AcademyPanel
        moduleTitle="Funis"
        lessons={[
          { title: 'Como preencher o Raio-X do negócio', duration: '8 min' },
          { title: 'Entendendo o catálogo de 21 funis', duration: '12 min' },
          { title: 'Recomendação, troca, aprovação e revisão', duration: '10 min' },
          { title: 'Lendo os planos por funil (8 abas)', duration: '9 min' },
          { title: 'Checklist de execução persistente', duration: '6 min' },
        ]}
      />
    </div>
  )
}

/* =====================================================================
   RAIO-X — formulário completo
   ===================================================================== */

function RaioXForm({
  diag,
  setDiag,
  filledCount,
  canRecommend,
  status,
  onRecommend,
  onApprove,
  onReview,
  onRestart,
  brandNiche,
  versions,
  onSnapshot,
  onRestore,
  showVersions,
  setShowVersions,
}: {
  diag: FunnelDiagnosis
  setDiag: React.Dispatch<React.SetStateAction<FunnelDiagnosis>>
  filledCount: number
  canRecommend: boolean
  status: string
  onRecommend: () => void
  onApprove: () => void
  onReview: () => void
  onRestart: () => void
  brandNiche: string
  versions: { version: number; createdAt: string; label?: string }[]
  onSnapshot: () => void
  onRestore: (v: number) => void
  showVersions: boolean
  setShowVersions: (v: boolean) => void
}) {
  const set = <K extends keyof FunnelDiagnosis>(k: K, v: FunnelDiagnosis[K]) =>
    setDiag((d) => ({ ...d, [k]: v }))

  const pct = Math.round((filledCount / 12) * 100)

  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#7C5CFC]" /> Raio-X do Negócio
        </h3>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
            {filledCount}/12 preenchidos
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] gap-1 text-[#9494A8]"
                onClick={() => setShowVersions(!showVersions)}
              >
                <History className="w-3 h-3" /> Versões ({versions.length})
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
              Versionar snapshots do diagnóstico
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Barra de progresso de preenchimento */}
      <div>
        <Progress value={pct} className="h-1.5 bg-white/10" />
      </div>

      {showVersions && (
        <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white">Snapshots do diagnóstico</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1"
              onClick={onSnapshot}
            >
              <History className="w-3 h-3" /> Salvar versão atual
            </Button>
          </div>
          {versions.length === 0 ? (
            <p className="text-[11px] text-[#9494A8]">Nenhuma versão salva ainda.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {versions
                .slice()
                .reverse()
                .map((v) => (
                  <div
                    key={v.version}
                    className="flex items-center justify-between rounded-md bg-[#1C1C27] px-2 py-1.5"
                  >
                    <span className="text-[11px] text-white">
                      #{v.version} — {v.label || 'Snapshot'} •{' '}
                      {new Date(v.createdAt).toLocaleString('pt-BR')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-[#22D3EE]"
                      onClick={() => onRestore(v.version)}
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Oferta / Esteira"
          hint="Descreva a esteira de ofertas (entrada, principal, upsell)"
        >
          <textarea
            className={inputClass}
            rows={2}
            value={diag.oferta_esteira}
            onChange={(e) => set('oferta_esteira', e.target.value)}
            placeholder="Ex: E-book grátis → Mentoria R$1.997 → Mastermind R$9.997"
          />
        </Field>
        <Field label="Produto principal">
          <input
            className={inputClass}
            value={diag.produto_principal}
            onChange={(e) => set('produto_principal', e.target.value)}
            placeholder="Ex: Mentoria de 8 semanas"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Ticket médio">
          <SelectField
            value={diag.ticket}
            placeholder="Selecione…"
            options={TICKET_OPTS.map((o) => ({ value: o, label: labelTicket(o) }))}
            onChange={(v) => set('ticket', v as FunnelDiagnosis['ticket'])}
          />
        </Field>
        <Field label="Validação de mercado">
          <SelectField
            value={diag.validacao}
            placeholder="Selecione…"
            options={VALIDACAO_OPTS.map((o) => ({ value: o, label: labelValidacao(o) }))}
            onChange={(v) => set('validacao', v as FunnelDiagnosis['validacao'])}
          />
        </Field>
        <Field label="Audiência">
          <SelectField
            value={diag.audiencia}
            placeholder="Selecione…"
            options={AUDIENCIA_OPTS.map((o) => ({ value: o, label: labelAudiencia(o) }))}
            onChange={(v) => set('audiencia', v as FunnelDiagnosis['audiencia'])}
          />
        </Field>
        <Field label="Objetivo principal">
          <SelectField
            value={diag.objetivo}
            placeholder="Selecione…"
            options={OBJETIVO_OPTS.map((o) => ({ value: o, label: labelObjetivo(o) }))}
            onChange={(v) => set('objetivo', v as FunnelDiagnosis['objetivo'])}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Horas/semana disponíveis">
          <SelectField
            value={diag.horas_semana}
            placeholder="Selecione…"
            options={HORAS_OPTS.map((o) => ({ value: o, label: labelHoras(o) }))}
            onChange={(v) => set('horas_semana', v as FunnelDiagnosis['horas_semana'])}
          />
        </Field>
        <Field label="Orçamento mensal">
          <SelectField
            value={diag.orcamento}
            placeholder="Selecione…"
            options={ORCAMENTO_OPTS.map((o) => ({ value: o, label: labelOrcamento(o) }))}
            onChange={(v) => set('orcamento', v as FunnelDiagnosis['orcamento'])}
          />
        </Field>
        <Field label="Faz vídeo?">
          <SelectField
            value={diag.faz_video}
            placeholder="Selecione…"
            options={FAZ_VIDEO_OPTS.map((o) => ({ value: o, label: labelFazVideo(o) }))}
            onChange={(v) => set('faz_video', v as FunnelDiagnosis['faz_video'])}
          />
        </Field>
        <Field label="Equipe">
          <SelectField
            value={diag.equipe}
            placeholder="Selecione…"
            options={EQUIPE_OPTS.map((o) => ({ value: o, label: labelEquipe(o) }))}
            onChange={(v) => set('equipe', v as FunnelDiagnosis['equipe'])}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Aquecimento da audiência">
          <SelectField
            value={diag.aquecimento}
            placeholder="Selecione…"
            options={AQUECIMENTO_OPTS.map((o) => ({ value: o, label: labelAquecimento(o) }))}
            onChange={(v) => set('aquecimento', v as FunnelDiagnosis['aquecimento'])}
          />
        </Field>
        <Field label="Nicho" hint={brandNiche ? `Sugerido do Brand OS: ${brandNiche}` : undefined}>
          <input
            className={inputClass}
            value={diag.nicho}
            onChange={(e) => set('nicho', e.target.value)}
            placeholder="Ex: Marketing digital para dentistas"
            list="brand-niche-list"
          />
          <datalist id="brand-niche-list">{brandNiche && <option value={brandNiche} />}</datalist>
        </Field>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          onClick={onRecommend}
          disabled={!canRecommend}
          className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" /> Recomendar Ecossistema
        </Button>
        {!canRecommend && (
          <span className="text-[10px] text-amber-400">
            Preencha pelo menos 8 de 12 campos ({filledCount}/12)
          </span>
        )}
        {status === 'recomendado' && (
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Aprovar
          </Button>
        )}
        {(status === 'aprovado' || status === 'em_revisao') && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReview}
            className="border-white/10 text-xs gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Rever
          </Button>
        )}
        {ecosystemPresent(status) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRestart}
            className="text-xs gap-1.5 text-red-400 hover:bg-red-500/10"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Recomeçar
          </Button>
        )}
      </div>
    </div>
  )
}

function ecosystemPresent(status: string) {
  return status !== 'diagnostico'
}

/* =====================================================================
   ECOSYSTEM PANEL — recomendação, troca, aprovação
   ===================================================================== */

function EcosystemPanel({
  ecosystem,
  diag,
  onSwap,
  onApprove,
  onReview,
}: {
  ecosystem: FunnelEcosystem
  diag: FunnelDiagnosis
  onSwap: (idx: number, newId: string) => void
  onApprove: () => void
  onReview: () => void
}) {
  const status = ecosystem.status
  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7C5CFC]" /> Ecossistema Recomendado
        </h3>
        <Badge className={statusBadge(status)}>{statusLabel(status)}</Badge>
      </div>

      <div className="rounded-lg bg-[#0e0e15]/60 p-3 border-l-2 border-[#7C5CFC]">
        <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
          {ecosystem.tese_geral || ecosystem.rationale}
        </p>
      </div>

      <div className="space-y-2">
        {ecosystem.selected.map((s, i) => {
          const item = FUNNEL_CATALOG.find((f) => f.id === s.catalogItemId)
          if (!item) return null
          const eligForStage = eligibleFunnelsForStage(diag, s.etapa)
          const color = ETAPA_COLOR[s.etapa]
          return (
            <div
              key={i}
              className="rounded-xl bg-[#0e0e15]/60 border p-3"
              style={{ borderColor: `${color}40` }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>
                  <Badge
                    className="text-[10px] border"
                    style={{ background: `${color}1a`, color, borderColor: `${color}40` }}
                  >
                    {ETAPA_LABEL[s.etapa]}
                  </Badge>
                  <span className="text-sm font-bold text-white truncate">{item.nome}</span>
                  <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[9px]">
                    {labelDificuldade(item.dificuldade)}
                  </Badge>
                </div>
                {(status === 'recomendado' || status === 'em_revisao') &&
                  eligForStage.length > 1 && (
                    <Select value={s.catalogItemId} onValueChange={(v) => onSwap(i, v)}>
                      <SelectTrigger className="h-7 w-44 text-[11px] bg-[#1C1C27] border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1C1C27] border-white/10">
                        {eligForStage.map((f) => (
                          <SelectItem key={f.id} value={f.id} className="text-xs text-white">
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
              </div>
              <p className="text-[11px] text-[#9494A8] leading-relaxed">{s.justificativa}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {item.ativos_necessarios.map((a) => (
                  <span
                    key={a}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {status === 'recomendado' && (
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Aprovar ecossistema
          </Button>
        )}
        {status === 'em_revisao' && (
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Reaprovar
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={onReview}
          className="border-white/10 text-xs gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" /> Rever
        </Button>
      </div>
    </div>
  )
}

/* =====================================================================
   PLANS SECTION — abas por funil
   ===================================================================== */

function PlansSection({
  plans,
  selectedPlanId,
  setSelectedPlanId,
}: {
  plans: FunnelPlan[]
  selectedPlanId: string | null
  setSelectedPlanId: (id: string | null) => void
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Planos por Funil
      </h3>
      {plans.map((p) => {
        const item = FUNNEL_CATALOG.find((f) => f.id === p.catalogItemId)
        const isOpen = selectedPlanId === p.catalogItemId
        const done = p.checklist.filter((c) => c.concluido_em).length
        const color = item ? ETAPA_COLOR[item.etapa] : '#7C5CFC'
        return (
          <div
            key={p.catalogItemId}
            className="rounded-2xl bg-[#14141C] border overflow-hidden"
            style={{ borderColor: `${color}33` }}
          >
            <button
              onClick={() => setSelectedPlanId(isOpen ? null : p.catalogItemId)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
                  style={{ background: color }}
                >
                  {p.order}
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {item?.nome || p.catalogItemId}
                </span>
                {item && (
                  <Badge
                    className="text-[10px] border"
                    style={{ background: `${color}1a`, color, borderColor: `${color}40` }}
                  >
                    {ETAPA_LABEL[item.etapa]}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {done}/{p.checklist.length}
                </Badge>
                <ChevronRight
                  className={`w-4 h-4 text-[#9494A8] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </div>
            </button>
            {isOpen && <FunnelPlanDetail plan={p} />}
          </div>
        )
      })}
    </div>
  )
}

function FunnelPlanDetail({ plan }: { plan: FunnelPlan }) {
  const { setFunnelPlans, funnelPlans } = usePlatform()
  const item = FUNNEL_CATALOG.find((f) => f.id === plan.catalogItemId)

  const toggleCheck = (id: string) => {
    const updated = funnelPlans.map((p) =>
      p.catalogItemId === plan.catalogItemId
        ? {
            ...p,
            checklist: p.checklist.map((c) =>
              c.id === id
                ? {
                    ...c,
                    concluido_em: c.concluido_em ? null : new Date().toISOString(),
                  }
                : c,
            ),
          }
        : p,
    )
    setFunnelPlans(updated)
  }

  const done = plan.checklist.filter((c) => c.concluido_em).length
  const pct = plan.checklist.length ? Math.round((done / plan.checklist.length) * 100) : 0

  return (
    <div className="px-4 pb-4">
      <Tabs defaultValue="analise" className="w-full">
        <TabsList className="bg-[#0e0e15] border border-white/5 h-auto flex flex-wrap p-1 gap-1">
          <TabsTrigger value="analise" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Análise
          </TabsTrigger>
          <TabsTrigger value="estrutura" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Estrutura
          </TabsTrigger>
          <TabsTrigger value="tecnica" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Config Técnica
          </TabsTrigger>
          <TabsTrigger value="cadencia" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Cadência
          </TabsTrigger>
          <TabsTrigger value="alertas" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Alertas
          </TabsTrigger>
          <TabsTrigger value="mapa" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Mapa
          </TabsTrigger>
          <TabsTrigger value="ativos" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Ativos
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-[11px] data-[state=active]:bg-[#7C5CFC]">
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analise" className="mt-3">
          <div className="rounded-lg bg-[#0e0e15]/60 p-3 border-l-2 border-[#7C5CFC]">
            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {plan.analysis}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="estrutura" className="mt-3">
          {/* Diagrama visual de etapas encadeadas com setas CSS */}
          <div className="flex flex-col gap-1">
            {plan.estrutura.map((s, i) => (
              <div key={i}>
                <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white">
                      {s.ordem}. {s.nome}
                    </span>
                    <Badge className="bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30 text-[9px]">
                      {s.canal}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#9494A8]">{s.descricao}</p>
                  <p className="text-[10px] text-[#9494A8]/70 mt-0.5">⏱ {s.duracao}</p>
                </div>
                {i < plan.estrutura.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ChevronRight className="w-3 h-3 text-[#7C5CFC] rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tecnica" className="mt-3">
          <ul className="space-y-1.5">
            {plan.techConfig.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300">
                <Link2 className="w-3 h-3 text-[#22D3EE] shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="cadencia" className="mt-3">
          <ul className="space-y-1.5">
            {plan.cadence.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300">
                <span className="text-[#22D3EE] font-bold">D{i + 1}:</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="alertas" className="mt-3">
          <ul className="space-y-1.5">
            {plan.alerts.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="mapa" className="mt-3">
          <div className="rounded-lg bg-[#0e0e15]/60 p-3 border border-white/5">
            <div className="flex flex-wrap items-center gap-1">
              {plan.mapa.map((s, i) => (
                <React.Fragment key={i}>
                  <span className="px-2 py-1 rounded-lg bg-[#1C1C27] text-[11px] text-white">
                    {s}
                  </span>
                  {i < plan.mapa.length - 1 && <ArrowRight className="w-3 h-3 text-[#7C5CFC]" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ativos" className="mt-3">
          <div className="space-y-1.5">
            {plan.ativos.length === 0 && (
              <p className="text-[11px] text-[#9494A8]">Nenhum ativo do Brand OS necessário.</p>
            )}
            {plan.ativos.map((a, i) => (
              <div key={i} className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-white">{a.nome}</span>
                  <Badge
                    className={`text-[9px] ${
                      a.status === 'pronto'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : a.status === 'pendente'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                    }`}
                  >
                    {a.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-[#9494A8]">{a.rationale}</p>
                <p className="text-[9px] text-[#22D3EE] mt-0.5">ID: {a.assetId}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="mt-3">
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-[#9494A8] mb-1">
              <span>
                {done}/{plan.checklist.length} concluídas
              </span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5 bg-white/10" />
          </div>
          <div className="space-y-1.5">
            {plan.checklist.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-lg bg-[#0e0e15]/60 p-2.5 cursor-pointer hover:bg-[#0e0e15]"
              >
                <input
                  type="checkbox"
                  checked={!!c.concluido_em}
                  onChange={() => toggleCheck(c.id)}
                  className="accent-[#7C5CFC] w-4 h-4"
                />
                <span
                  className={`text-xs flex-1 ${c.concluido_em ? 'line-through text-[#9494A8]' : 'text-white'}`}
                >
                  {c.title}
                </span>
                <Badge className={prioridadeBadge(c.prioridade)}>{c.prioridade}</Badge>
              </label>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
        <span className="text-[10px] text-[#9494A8]">
          {plan.generatedAt
            ? `Gerado em ${new Date(plan.generatedAt).toLocaleDateString('pt-BR')}`
            : 'Não gerado'}
          {item ? ` • ${labelDificuldade(item.dificuldade)} • ${item.tempo_estimado}` : ''}
        </span>
      </div>
    </div>
  )
}

/* =====================================================================
   RECOMMEND MODAL — estados queued/running/completed/failed
   ===================================================================== */

function RecommendModal({
  state,
  onClose,
  onRetry,
}: {
  state:
    | null
    | { kind: 'queued' }
    | { kind: 'running'; pct: number; label: string }
    | { kind: 'completed'; eco: FunnelEcosystem }
    | { kind: 'failed'; error: string }
  onClose: () => void
  onRetry: () => void
}) {
  const open = state !== null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#14141C] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-[#7C5CFC]" /> Recomendação de Ecossistema
          </DialogTitle>
          <DialogDescription className="text-[#9494A8] text-xs">
            {state?.kind === 'queued' && 'Enfileirando análise do Raio-X…'}
            {state?.kind === 'running' && state.label}
            {state?.kind === 'completed' && 'Ecossistema gerado com sucesso.'}
            {state?.kind === 'failed' && 'Falha na recomendação.'}
          </DialogDescription>
        </DialogHeader>

        {state?.kind === 'queued' && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-[#7C5CFC] animate-spin" />
          </div>
        )}

        {state?.kind === 'running' && (
          <div className="py-4 space-y-2">
            <Progress value={state.pct} className="h-2 bg-white/10" />
            <p className="text-[11px] text-[#9494A8] text-center">{state.pct}%</p>
          </div>
        )}

        {state?.kind === 'completed' && (
          <div className="py-2 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" /> {state.eco.selected.length} funis selecionados
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {state.eco.selected.map((s, i) => {
                const item = FUNNEL_CATALOG.find((f) => f.id === s.catalogItemId)
                return (
                  <div key={i} className="rounded-lg bg-[#0e0e15]/60 p-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-[9px]"
                        style={{
                          background: `${ETAPA_COLOR[s.etapa]}1a`,
                          color: ETAPA_COLOR[s.etapa],
                          borderColor: `${ETAPA_COLOR[s.etapa]}40`,
                        }}
                      >
                        {ETAPA_LABEL[s.etapa]}
                      </Badge>
                      <span className="text-xs font-semibold text-white">
                        {item?.nome || s.catalogItemId}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {state?.kind === 'failed' && (
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-2 text-red-400 text-xs">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {state?.kind === 'failed' && (
            <Button size="sm" onClick={onRetry} className="bg-[#7C5CFC] text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
            </Button>
          )}
          {state?.kind === 'completed' && (
            <Button size="sm" onClick={onClose} className="bg-emerald-600 text-xs gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ver ecossistema
            </Button>
          )}
          {(state?.kind === 'queued' || state?.kind === 'running') && (
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* =====================================================================
   SELECT FIELD helper (shadcn Select)
   ===================================================================== */

function SelectField({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={`${inputClass} h-9`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#1C1C27] border-white/10 max-h-60">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs text-white">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* =====================================================================
   HELPERS — contagem, badges, builder de plano
   ===================================================================== */

function countFilled(d: FunnelDiagnosis): number {
  return [
    d.oferta_esteira,
    d.produto_principal,
    d.ticket,
    d.validacao,
    d.audiencia,
    d.objetivo,
    d.horas_semana,
    d.orcamento,
    d.faz_video,
    d.equipe,
    d.aquecimento,
    d.nicho,
  ].filter((v) => v && String(v).trim() !== '').length
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

function prioridadeBadge(p: ChecklistPrioridade) {
  switch (p) {
    case 'critica':
      return 'bg-red-500/15 text-red-400 border-red-500/30 text-[9px]'
    case 'alta':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30 text-[9px]'
    case 'media':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px]'
    case 'baixa':
      return 'bg-white/5 text-[#9494A8] border-white/10 text-[9px]'
  }
}

// Status de um ativo do Brand OS: pronto se existir, pendente se ausente
function assetStatus(
  assetId: string,
  brandAssets: BrandAsset[],
): 'pronto' | 'pendente' | 'ausente' {
  const found = brandAssets.find((a) => a.type === assetId)
  if (found && found.content && found.content.trim()) return 'pronto'
  if (found) return 'pendente'
  return 'ausente'
}

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

function buildPlan(
  item: FunnelCatalogItem,
  justification: string,
  order: number,
  diag: FunnelDiagnosis,
  brandAssets: BrandAsset[],
): FunnelPlan {
  // Estrutura detalhada por etapa do funil
  const estrutura: FunnelPlanStage[] = estruturaPorFunil(item, diag)
  const mapa = estrutura.map((s) => s.nome)

  // Ativos referenciados por ID real do Brand OS
  const ativos: FunnelPlanAsset[] = (item.ativos_necessarios || []).map((aid) => ({
    assetId: aid,
    nome: ASSET_LABELS[aid] || aid,
    rationale: ativoRationale(aid, item),
    status: assetStatus(aid, brandAssets),
  }))

  // Checklist com prioridades
  const checklist: ChecklistItem[] = checklistPorFunil(item, diag)

  // Campos legados (compat com Ativos.tsx)
  const structure = estrutura.map((s) => `${s.ordem}. ${s.nome} (${s.canal}) — ${s.descricao}`)
  const assetsLegacy = ativos.map((a) => ({
    type: a.nome,
    recommended: a.status,
    rationale: a.rationale,
  }))

  return {
    catalogItemId: item.id,
    order,
    analysis: `${item.nome} — ${item.descricao}\n\n${justification}\n\nCliente ideal: ${clienteIdeal(
      diag,
    )}. Objeções comuns: ${objecoes(item, diag)}. Copy strategy: ${copyStrategy(item, diag)}.`,
    estrutura,
    techConfig: techConfigPorFunil(item),
    cadence: cadencePorFunil(item, diag),
    alerts: alertsPorFunil(item, diag),
    mapa,
    ativos,
    checklist,
    generatedAt: new Date().toISOString(),
    // legados
    structure,
    map: mapa,
    assets: assetsLegacy,
  }
}

function estruturaPorFunil(item: FunnelCatalogItem, diag: FunnelDiagnosis): FunnelPlanStage[] {
  const base: Record<string, FunnelPlanStage[]> = {
    reativacao_base: [
      {
        nome: 'Extração da lista',
        descricao: 'Exportar contatos parados do CRM/email',
        canal: 'CRM',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Sequência de reativação',
        descricao: '3 toques de valor + 1 oferta',
        canal: 'Email/WhatsApp',
        duracao: '5 dias',
        ordem: 2,
      },
      {
        nome: 'Oferta de reativação',
        descricao: 'Condição especial por tempo limitado',
        canal: 'Email',
        duracao: '2 dias',
        ordem: 3,
      },
      {
        nome: 'Follow-up',
        descricao: 'Recuperação de não-aberturas',
        canal: 'WhatsApp',
        duracao: '2 dias',
        ordem: 4,
      },
    ],
    isca_digital: [
      {
        nome: 'Criação do lead magnet',
        descricao: 'Material gratuito alinhado à oferta',
        canal: 'Conteúdo',
        duracao: '3-5 dias',
        ordem: 1,
      },
      {
        nome: 'Página de captura',
        descricao: 'Landing page com opt-in',
        canal: 'Web',
        duracao: '1-2 dias',
        ordem: 2,
      },
      {
        nome: 'Sequência de email',
        descricao: '5-7 emails de educação + oferta',
        canal: 'Email',
        duracao: '7-10 dias',
        ordem: 3,
      },
      {
        nome: 'Oferta principal',
        descricao: 'Pitch da oferta principal',
        canal: 'Email/VSL',
        duracao: '2 dias',
        ordem: 4,
      },
    ],
    reels_manychat: [
      {
        nome: 'Produção de Reels',
        descricao: 'Vídeos curtos com gancho forte',
        canal: 'Instagram',
        duracao: 'Contínuo',
        ordem: 1,
      },
      {
        nome: 'Automação ManyChat',
        descricao: 'Comentário dispara DM com isca/oferta',
        canal: 'ManyChat',
        duracao: '1 dia',
        ordem: 2,
      },
      {
        nome: 'Entrega via DM',
        descricao: 'Link/material enviado por DM',
        canal: 'Instagram DM',
        duracao: 'Imediato',
        ordem: 3,
      },
      {
        nome: 'Conversão',
        descricao: 'Oferta dentro da sequência de DM',
        canal: 'DM/Link',
        duracao: '1-2 dias',
        ordem: 4,
      },
    ],
    nissin_miojo: [
      {
        nome: 'Roteiro Nissin',
        descricao: 'Vídeo curto de 8-10 min (autoridade→oferta)',
        canal: 'Vídeo',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Publicação',
        descricao: 'Post no feed/Reels com link',
        canal: 'Instagram',
        duracao: 'Contínuo',
        ordem: 2,
      },
      {
        nome: 'Checkout',
        descricao: 'Checkout direto de baixo ticket',
        canal: 'Web',
        duracao: 'Imediato',
        ordem: 3,
      },
    ],
    diagnostico_publico: [
      {
        nome: 'Análise pública',
        descricao: 'Diagnóstico em vídeo/post de um caso real',
        canal: 'Instagram/YouTube',
        duracao: '2-3 dias',
        ordem: 1,
      },
      {
        nome: 'Call to action',
        descricao: 'Convite para agendamento de diagnóstico',
        canal: 'Bio/Link',
        duracao: 'Imediato',
        ordem: 2,
      },
      {
        nome: 'Agendamento',
        descricao: 'Call 1:1 de diagnóstico',
        canal: 'Videochamada',
        duracao: '30-45 min',
        ordem: 3,
      },
    ],
    jornada_documentada: [
      {
        nome: 'Definição da jornada',
        descricao: 'Escolher processo real para documentar',
        canal: 'Estratégia',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Bastidores',
        descricao: 'Registrar processo em vídeo/stories',
        canal: 'Instagram',
        duracao: '4-8 semanas',
        ordem: 2,
      },
      {
        nome: 'Atração',
        descricao: 'Conteúdo atrai por autenticidade',
        canal: 'Orgânico',
        duracao: 'Contínuo',
        ordem: 3,
      },
      {
        nome: 'Oferta',
        descricao: 'Oferta surge naturalmente da jornada',
        canal: 'Bio/Link',
        duracao: 'Contínuo',
        ordem: 4,
      },
    ],
    ia_em_acao: [
      {
        nome: 'Identificação do uso de IA',
        descricao: 'Escolher aplicação de IA no nicho',
        canal: 'Estratégia',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Demonstração',
        descricao: 'Vídeo mostrando IA em ação',
        canal: 'Instagram/YouTube',
        duracao: '2-3 dias',
        ordem: 2,
      },
      {
        nome: 'Captura',
        descricao: 'Lead quer aprender a aplicar',
        canal: 'Bio/Link',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    tripwire: [
      {
        nome: 'Captura do lead',
        descricao: 'Lead opt-in com isca',
        canal: 'Web',
        duracao: 'Imediato',
        ordem: 1,
      },
      {
        nome: 'Oferta tripwire',
        descricao: 'Oferta R$7-R$47 imediata pós-captura',
        canal: 'Checkout',
        duracao: 'Imediato',
        ordem: 2,
      },
      {
        nome: 'Upsell',
        descricao: 'Oferta principal para compradores',
        canal: 'Email/Call',
        duracao: '3-5 dias',
        ordem: 3,
      },
    ],
    emprestimo_audiencia: [
      {
        nome: 'Parcerias',
        descricao: 'Identificar perfis complementares',
        canal: 'Relacionamento',
        duracao: '1 semana',
        ordem: 1,
      },
      {
        nome: 'Collab/Live',
        descricao: 'Live ou post conjunto',
        canal: 'Instagram/YouTube',
        duracao: '1 dia',
        ordem: 2,
      },
      {
        nome: 'Captura',
        descricao: 'Audiência do parceiro vira lead',
        canal: 'Bio/Link',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    destaques_sequencia: [
      {
        nome: 'Mapeamento da jornada',
        descricao: 'Definir sequência narrativa',
        canal: 'Estratégia',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Organização de destaques',
        descricao: 'Stories organizados por categoria',
        canal: 'Instagram',
        duracao: '2-3 dias',
        ordem: 2,
      },
      {
        nome: 'Direcionamento',
        descricao: 'Bio conduz aos destaques',
        canal: 'Instagram',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    conteudo_fixado: [
      {
        nome: 'Seleção de posts',
        descricao: '3-5 posts que conduzem a narrativa',
        canal: 'Estratégia',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Fixação',
        descricao: 'Fixar posts no topo do perfil',
        canal: 'Instagram',
        duracao: 'Imediato',
        ordem: 2,
      },
      {
        nome: 'Otimização contínua',
        descricao: 'Ajustar conforme performance',
        canal: 'Instagram',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    serie_semanal: [
      {
        nome: 'Planejamento da série',
        descricao: 'Definir tema recorrente semanal',
        canal: 'Estratégia',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Produção semanal',
        descricao: '1 episódio por semana',
        canal: 'Instagram/YouTube',
        duracao: 'Contínuo',
        ordem: 2,
      },
      {
        nome: 'Expectativa',
        descricao: 'Teasers criam hábito',
        canal: 'Stories',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    broadcast: [
      {
        nome: 'Cadastro na lista',
        descricao: 'Lista de transmissão no IG/WhatsApp',
        canal: 'Instagram/WhatsApp',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Conteúdo direto',
        descricao: '2-3 mensagens de valor por semana',
        canal: 'Transmissão',
        duracao: 'Contínuo',
        ordem: 2,
      },
      {
        nome: 'Oferta',
        descricao: 'Oferta direta para a lista',
        canal: 'Transmissão',
        duracao: 'Semanal',
        ordem: 3,
      },
    ],
    close_friends_vip: [
      {
        nome: 'Seleção de VIPs',
        descricao: 'Adicionar mais engajados ao Close Friends',
        canal: 'Instagram',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Conteúdo exclusivo',
        descricao: 'Bastidores + conteúdo avançado',
        canal: 'Close Friends',
        duracao: 'Contínuo',
        ordem: 2,
      },
      {
        nome: 'Oferta VIP',
        descricao: 'Oferta exclusiva para o grupo',
        canal: 'Close Friends',
        duracao: 'Semanal',
        ordem: 3,
      },
    ],
    diagnostico: [
      {
        nome: 'Quiz/Aplicação',
        descricao: 'Formulário interativo com perguntas-chave',
        canal: 'Web',
        duracao: '1-2 dias',
        ordem: 1,
      },
      {
        nome: 'Resultado personalizado',
        descricao: 'Resultado entregue por email/tela',
        canal: 'Web',
        duracao: 'Imediato',
        ordem: 2,
      },
      {
        nome: 'Oferta',
        descricao: 'Oferta alinhada ao resultado do diagnóstico',
        canal: 'Email/Call',
        duracao: '1-2 dias',
        ordem: 3,
      },
    ],
    link_bio_vsl: [
      {
        nome: 'Produção da VSL',
        descricao: 'Vídeo de venda evergreen (15-60 min)',
        canal: 'Vídeo',
        duracao: '1-2 semanas',
        ordem: 1,
      },
      {
        nome: 'Página de vendas',
        descricao: 'VSL + copy + CTA na página',
        canal: 'Web',
        duracao: '2-3 dias',
        ordem: 2,
      },
      {
        nome: 'Bio',
        descricao: 'Link na bio conduz à VSL',
        canal: 'Instagram',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    link_bio_carta: [
      {
        nome: 'Copy da carta',
        descricao: 'Long copy persuasivo (carta de vendas)',
        canal: 'Copywriting',
        duracao: '3-5 dias',
        ordem: 1,
      },
      {
        nome: 'Página de vendas',
        descricao: 'Carta publicada com CTA',
        canal: 'Web',
        duracao: '1-2 dias',
        ordem: 2,
      },
      {
        nome: 'Bio',
        descricao: 'Link na bio conduz à carta',
        canal: 'Instagram',
        duracao: 'Contínuo',
        ordem: 3,
      },
    ],
    grupo_whatsapp: [
      {
        nome: 'Criação do grupo',
        descricao: 'Grupo WhatsApp com regras e proposta clara',
        canal: 'WhatsApp',
        duracao: '1 dia',
        ordem: 1,
      },
      {
        nome: 'Aquecimento',
        descricao: 'Conteúdo + relacionamento por 5-7 dias',
        canal: 'WhatsApp',
        duracao: '1 semana',
        ordem: 2,
      },
      {
        nome: 'Oferta',
        descricao: 'Oferta direta no grupo',
        canal: 'WhatsApp',
        duracao: '1 dia',
        ordem: 3,
      },
    ],
    aplicacao_formulario: [
      {
        nome: 'Formulário seletivo',
        descricao: 'Perguntas que filtram e qualificam',
        canal: 'Web',
        duracao: '1-2 dias',
        ordem: 1,
      },
      {
        nome: 'Triagem',
        descricao: 'Análise das aplicações',
        canal: 'Interno',
        duracao: '1-2 dias',
        ordem: 2,
      },
      {
        nome: 'Call de vendas',
        descricao: 'Call 1:1 apenas para aprovados',
        canal: 'Videochamada',
        duracao: '30-60 min',
        ordem: 3,
      },
    ],
    webinario_aula_vivo: [
      {
        nome: 'Preparação',
        descricao: 'Estrutura + slides + oferta do evento',
        canal: 'Estratégia',
        duracao: '1-2 semanas',
        ordem: 1,
      },
      {
        nome: 'Promoção',
        descricao: 'Atração de inscritos para o webinar',
        canal: 'Orgânico/Pago',
        duracao: '1-2 semanas',
        ordem: 2,
      },
      {
        nome: 'Evento ao vivo',
        descricao: 'Aula + pitch ao vivo',
        canal: 'Webinar',
        duracao: '60-90 min',
        ordem: 3,
      },
      {
        nome: 'Follow-up',
        descricao: 'Recados + recuperação de ausentes',
        canal: 'Email/WhatsApp',
        duracao: '3-5 dias',
        ordem: 4,
      },
    ],
    aula_gravada_aplicacao: [
      {
        nome: 'Gravação da aula',
        descricao: 'Aula evergreen de 20-40 min',
        canal: 'Vídeo',
        duracao: '1 semana',
        ordem: 1,
      },
      {
        nome: 'Página com replay',
        descricao: 'Aula + formulário de aplicação',
        canal: 'Web',
        duracao: '1-2 dias',
        ordem: 2,
      },
      {
        nome: 'Aplicação',
        descricao: 'Leads preenchem formulário seletivo',
        canal: 'Web',
        duracao: 'Contínuo',
        ordem: 3,
      },
      {
        nome: 'Call',
        descricao: 'Call de vendas para qualificados',
        canal: 'Videochamada',
        duracao: '30-60 min',
        ordem: 4,
      },
    ],
  }
  return (
    base[item.id] || [
      {
        nome: 'Entrada',
        descricao: item.descricao,
        canal: 'Orgânico',
        duracao: '1 semana',
        ordem: 1,
      },
      {
        nome: 'Nutrição',
        descricao: 'Aquecimento da audiência',
        canal: 'Conteúdo',
        duracao: '1 semana',
        ordem: 2,
      },
      {
        nome: 'Conversão',
        descricao: 'Oferta principal',
        canal: 'Web/Call',
        duracao: '1-2 dias',
        ordem: 3,
      },
    ]
  )
}

function techConfigPorFunil(item: FunnelCatalogItem): string[] {
  const base: Record<string, string[]> = {
    reativacao_base: [
      'CRM/Email marketing (Mailchimp, RD Station)',
      'Exportação de lista',
      'Automação de sequência',
      'Pixel de rastreamento',
    ],
    isca_digital: [
      'Ferramenta de landing page',
      'Email marketing',
      'Hospedagem do material',
      'Pixel Meta + GA4',
    ],
    reels_manychat: [
      'ManyChat (automação de DM)',
      'Instagram Business',
      'Link de entrega',
      'Pixel Meta',
    ],
    nissin_miojo: [
      'Ferramenta de checkout',
      'Hospedagem de vídeo',
      'Instagram Business',
      'Pixel Meta',
    ],
    diagnostico_publico: [
      'Ferramenta de agendamento (Calendly)',
      'Videochamada (Zoom/Meet)',
      'Instagram/YouTube',
      'CRM',
    ],
    jornada_documentada: [
      'Câmera smartphone',
      'Instagram (Stories/Reels)',
      'Editor de vídeo',
      'Backup de conteúdo',
    ],
    ia_em_acao: [
      'Ferramenta de IA (ChatGPT, etc.)',
      'Gravação de tela',
      'Instagram/YouTube',
      'Editor de vídeo',
    ],
    tripwire: ['Ferramenta de checkout', 'Landing page', 'Automação de upsell', 'Pixel Meta + GA4'],
    emprestimo_audiencia: [
      'Parceiros definidos',
      'Ferramenta de live (Instagram/YouTube)',
      'Link de captura',
      'CRM',
    ],
    destaques_sequencia: [
      'Instagram Business',
      'Organização de destaques',
      'Bio otimizada',
      'Link na bio',
    ],
    conteudo_fixado: [
      'Instagram Business',
      'Posts selecionados',
      'Bio otimizada',
      'Analytics do Instagram',
    ],
    serie_semanal: [
      'Câmera smartphone',
      'Editor de vídeo',
      'Calendário de conteúdo',
      'Instagram/YouTube',
    ],
    broadcast: [
      'Lista de transmissão Instagram/WhatsApp',
      'Conteúdo de valor',
      'Automação (opcional)',
      'CRM',
    ],
    close_friends_vip: [
      'Instagram Business',
      'Lista de Close Friends',
      'Conteúdo exclusivo',
      'Analytics',
    ],
    diagnostico: ['Ferramenta de quiz (Typeform)', 'Página de resultado', 'Email marketing', 'CRM'],
    link_bio_vsl: [
      'Hospedagem de vídeo (Vimeo/Wistia)',
      'Página de vendas',
      'Checkout',
      'Pixel Meta + GA4',
    ],
    link_bio_carta: ['Página de vendas', 'Checkout', 'Copywriting', 'Pixel Meta + GA4'],
    grupo_whatsapp: ['WhatsApp Business', 'Gestão de grupo', 'Conteúdo programado', 'CRM'],
    aplicacao_formulario: [
      'Ferramenta de formulário (Typeform)',
      'Ferramenta de call (Zoom/Meet)',
      'CRM',
      'Automação de triagem',
    ],
    webinario_aula_vivo: [
      'Plataforma de webinar (Zoom/YouTube Live)',
      'Página de inscrição',
      'Email marketing',
      'CRM',
    ],
    aula_gravada_aplicacao: [
      'Hospedagem de vídeo',
      'Página com replay',
      'Ferramenta de formulário',
      'CRM',
    ],
  }
  return base[item.id] || ['Ferramentas conforme necessidade', 'Pixel Meta + GA4', 'CRM/planilha']
}

function cadencePorFunil(item: FunnelCatalogItem, diag: FunnelDiagnosis): string[] {
  const horario =
    diag.aquecimento === 'quente'
      ? 'Manhã (8-10h)'
      : diag.aquecimento === 'fria'
        ? 'Noite (19-21h)'
        : 'Tarde (14-17h)'
  const base: Record<string, string[]> = {
    reativacao_base: [
      `Email 1: ${horario}`,
      'Email 2: +2 dias (valor)',
      'Email 3: +3 dias (oferta)',
      'Follow-up WhatsApp: +1 dia',
    ],
    isca_digital: [
      'Captura: contínuo',
      'Email 1: dia 0 (entrega)',
      'Email 2-5: dias 1-5 (educação)',
      'Oferta: dia 6-7',
      'Follow-up: dia 8',
    ],
    reels_manychat: [
      `Reels: 3-5x/semana (${horario})`,
      'DM automática: imediato',
      'Sequência DM: 1-3 dias',
      'Oferta: dia 3',
    ],
    nissin_miojo: [
      `Publicação: 2-3x/semana (${horario})`,
      'Checkout: imediato',
      'Recuperação: +24h',
    ],
    diagnostico_publico: [
      `Análise: 1x/semana (${horario})`,
      'CTA: contínuo',
      'Calls: 3-5 por semana',
    ],
    jornada_documentada: [
      `Bastidores: diário (${horario})`,
      'Stories: 3-5x/dia',
      'Reels: 2-3x/semana',
      'Oferta: quinzenal',
    ],
    ia_em_acao: [
      `Demonstração: 1-2x/semana (${horario})`,
      'Captura: contínuo',
      'Follow-up: 2-3 dias',
    ],
    tripwire: ['Captura: contínuo', 'Oferta: imediata', 'Upsell: +3-5 dias'],
    emprestimo_audiencia: [
      `Collab: 1-2x/mês`,
      `Live: ${horario}`,
      'Captura: durante + após live',
      'Follow-up: 2-3 dias',
    ],
    destaques_sequencia: [
      `Organização: 1x (${horario})`,
      'Atualização: quinzenal',
      'Direcionamento: contínuo',
    ],
    conteudo_fixado: [`Seleção: 1x (${horario})`, 'Otimização: quinzenal', 'Analytics: semanal'],
    serie_semanal: [
      `Episódio: 1x/semana (${horario})`,
      'Teaser: 1 dia antes',
      'Stories: diário',
      'Reels: 2-3x/semana',
    ],
    broadcast: [`Mensagens: 2-3x/semana (${horario})`, 'Oferta: 1x/semana', 'Interação: diário'],
    close_friends_vip: [
      `Conteúdo VIP: 3-5x/semana (${horario})`,
      'Oferta: 1x/semana',
      'Interação: diário',
    ],
    diagnostico: [
      'Quiz: contínuo',
      'Resultado: imediato',
      'Oferta: +1-2 dias',
      'Follow-up: +3 dias',
    ],
    link_bio_vsl: [
      `Tráfego: contínuo (${horario})`,
      'VSL: sempre disponível',
      'Follow-up email: 1-3 dias',
    ],
    link_bio_carta: [
      `Tráfego: contínuo (${horario})`,
      'Carta: sempre disponível',
      'Follow-up email: 1-3 dias',
    ],
    grupo_whatsapp: [
      `Aquecimento: 5-7 dias (${horario})`,
      'Conteúdo: 2-3x/dia',
      'Oferta: dia 6-7',
      'Follow-up: +1 dia',
    ],
    aplicacao_formulario: [
      'Formulário: contínuo',
      'Triagem: 1-2 dias',
      'Call: agendada',
      'Follow-up: +1-2 dias',
    ],
    webinario_aula_vivo: [
      `Promoção: 1-2 semanas (${horario})`,
      'Lembretes: 1 dia e 1h antes',
      'Evento: data fixa',
      'Follow-up: 3-5 dias',
    ],
    aula_gravada_aplicacao: [
      `Tráfego: contínuo (${horario})`,
      'Aplicação: contínua',
      'Call: agendada',
      'Follow-up: +1-2 dias',
    ],
  }
  return (
    base[item.id] || [
      `Conteúdo: 3-5x/semana (${horario})`,
      'Oferta: semanal',
      'Follow-up: 1-3 dias',
    ]
  )
}

function alertsPorFunil(item: FunnelCatalogItem, diag: FunnelDiagnosis): string[] {
  const base: string[] = [
    `Audiência ${diag.audiencia ? labelAudiencia(diag.audiencia) : 'atual'} exige aquecimento antes da oferta`,
  ]
  if (
    diag.faz_video === 'nao_gravo' &&
    item.requisitos.some((r) => r.toLowerCase().includes('vídeo'))
  ) {
    base.push('Este funil requer vídeos — você indicou não gravar. Considere delegar.')
  }
  if (diag.orcamento === '0_500' && item.categoria === 'Pago') {
    base.push('Orçamento baixo para tráfego pago — priorize orgânico ou aumente orçamento.')
  }
  if (item.dificuldade === 'avancado') {
    base.push('Funil avançado — requer consistência e afinco na execução.')
  }
  if (item.audiencia_minima && diag.audiencia) {
    base.push(
      `Audiência mínima exigida: ${labelAudiencia(item.audiencia_minima)} — monitore crescimento.`,
    )
  }
  base.push('Não pular o aquecimento antes da oferta direta.')
  return base
}

function ativoRationale(assetId: string, item: FunnelCatalogItem): string {
  const map: Record<string, string> = {
    oferta_principal: `Necessário para a oferta central do funil ${item.nome}.`,
    pilares_de_conteudo: `Pilares de conteúdo guiam a produção deste funil.`,
    linha_editorial: `Linha editorial define o estilo dos conteúdos.`,
    stack_de_prova: `Provas fortalecem a conversão de ${item.nome}.`,
    bio_taglines: `Bio e taglines conduzem ao próximo passo.`,
    posicionamento: `Posicionamento alinha a narrativa do funil.`,
    storytelling: `Storytelling cria conexão neste funil.`,
  }
  return map[assetId] || `Ativo do Brand OS usado por ${item.nome}.`
}

function clienteIdeal(d: FunnelDiagnosis): string {
  return `Profissionais/empresas de ${d.nicho || 'seu nicho'} com audiência ${
    d.audiencia ? labelAudiencia(d.audiencia) : 'a definir'
  } e validação "${d.validacao ? labelValidacao(d.validacao) : 'em construção'}"`
}

function objecoes(item: FunnelCatalogItem, d: FunnelDiagnosis): string {
  if (
    d.ticket &&
    (d.ticket === '997_2497' || d.ticket === '2497_9997' || d.ticket === 'acima_9997')
  ) {
    return `"está caro" (responda com valor/ROI), "não tenho tempo" (responda com método enxuto), "já tentei" (responda com diferencial)`
  }
  return `"não conheço você" (aqueça antes), "é para mim?" (qualifique), "como funciona?" (explique o método)`
}

function copyStrategy(item: FunnelCatalogItem, d: FunnelDiagnosis): string {
  return `Tom ${d.aquecimento === 'quente' ? 'direto e conversacional' : 'educativo e gradual'}, foco em transformação, prova e CTA claro para ${item.nome}.`
}

function checklistPorFunil(item: FunnelCatalogItem, _diag: FunnelDiagnosis): ChecklistItem[] {
  const generic: ChecklistItem[] = [
    {
      id: uid('ck'),
      title: 'Configurar pixel e eventos de conversão',
      prioridade: 'alta',
      concluido_em: null,
    },
    {
      id: uid('ck'),
      title: 'Preparar ativos do Brand OS necessários',
      prioridade: 'alta',
      concluido_em: null,
    },
    {
      id: uid('ck'),
      title: 'Configurar ferramentas e integrações',
      prioridade: 'media',
      concluido_em: null,
    },
    {
      id: uid('ck'),
      title: 'Criar/testar fluxo completo',
      prioridade: 'critica',
      concluido_em: null,
    },
    { id: uid('ck'), title: 'Subir conteúdo/campanha', prioridade: 'media', concluido_em: null },
    {
      id: uid('ck'),
      title: 'Monitorar métricas nos primeiros 7 dias',
      prioridade: 'baixa',
      concluido_em: null,
    },
  ]
  const specific: Record<string, ChecklistItem[]> = {
    reativacao_base: [
      {
        id: uid('ck'),
        title: 'Exportar lista de contatos do CRM',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Escrever sequência de 3 emails + 1 oferta',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Configurar automação de envio',
        prioridade: 'media',
        concluido_em: null,
      },
    ],
    isca_digital: [
      {
        id: uid('ck'),
        title: 'Criar o material gratuito (lead magnet)',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Construir landing page de captura',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Escrever sequência de 5-7 emails',
        prioridade: 'media',
        concluido_em: null,
      },
    ],
    reels_manychat: [
      {
        id: uid('ck'),
        title: 'Configurar automação no ManyChat',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Produzir 5+ Reels com ganchos',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Testar fluxo de DM completo',
        prioridade: 'critica',
        concluido_em: null,
      },
    ],
    link_bio_vsl: [
      {
        id: uid('ck'),
        title: 'Gravar e editar a VSL (15-60 min)',
        prioridade: 'critica',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Construir página de vendas com VSL',
        prioridade: 'alta',
        concluido_em: null,
      },
      {
        id: uid('ck'),
        title: 'Configurar checkout e pixel',
        prioridade: 'alta',
        concluido_em: null,
      },
    ],
    webinario_aula_vivo: [
      {
        id: uid('ck'),
        title: 'Definir data e estruturar o webinar',
        prioridade: 'alta',
        concluido_em: null,
      },
      { id: uid('ck'), title: 'Criar página de inscrição', prioridade: 'alta', concluido_em: null },
      { id: uid('ck'), title: 'Promover por 1-2 semanas', prioridade: 'media', concluido_em: null },
      {
        id: uid('ck'),
        title: 'Ensaiar o pitch de venda',
        prioridade: 'critica',
        concluido_em: null,
      },
    ],
  }
  return [...(specific[item.id] || []), ...generic]
}
