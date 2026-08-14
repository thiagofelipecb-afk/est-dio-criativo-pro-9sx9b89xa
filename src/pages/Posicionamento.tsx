import React, { useState } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import {
  ModuleHeader,
  EmptyState,
  AcademyPanel,
  GenerationMetaBar,
  Field,
  inputClass,
  GenerateButton,
} from '@/components/marketing/Shared'
import {
  BrandAsset,
  BrandAssetType,
  BrandProfile,
  ResearchAnswer,
  InterviewAnswer,
} from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Compass,
  Sparkles,
  Download,
  ClipboardList,
  Mic,
  CheckCircle2,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

const RESEARCH_GROUPS: {
  group: number
  title: string
  fields: { key: string; label: string; hint?: string }[]
}[] = [
  {
    group: 1,
    title: '1. Trajetória e credenciais',
    fields: [
      { key: 'anos_mercado', label: 'Anos no mercado' },
      { key: 'modelo_atendimento', label: 'Modelo de atendimento' },
      { key: 'formacao', label: 'Formação' },
      { key: 'certificacoes', label: 'Certificações' },
      { key: 'premios', label: 'Prêmios e reconhecimentos' },
    ],
  },
  {
    group: 2,
    title: '2. O que você vende',
    fields: [
      {
        key: 'esteira_precos',
        label: 'Descrição da esteira com preços',
        hint: 'Essencial — alimenta funis e conteúdo',
      },
      { key: 'tipos_produto', label: 'Tipos de produto/serviço' },
    ],
  },
  {
    group: 3,
    title: '3. Negócio e números',
    fields: [
      { key: 'ticket_medio', label: 'Ticket médio' },
      { key: 'faturamento', label: 'Faturamento mensal' },
      { key: 'clientes_atendidos', label: 'Clientes atendidos' },
      { key: 'recorrencia', label: 'Recorrência' },
      { key: 'casos_sucesso', label: 'Casos de sucesso' },
    ],
  },
  {
    group: 4,
    title: '4. Cliente ideal',
    fields: [
      { key: 'faixa_etaria', label: 'Faixa etária' },
      { key: 'genero', label: 'Gênero' },
      { key: 'profissao', label: 'Profissão' },
      { key: 'classe_social', label: 'Classe social' },
      { key: 'localizacao', label: 'Localização' },
      { key: 'momento_vida', label: 'Momento de vida' },
      { key: 'estado_emocional', label: 'Estado emocional' },
    ],
  },
  {
    group: 5,
    title: '5. Mercado e concorrência',
    fields: [
      { key: 'concorrentes', label: 'Concorrentes' },
      { key: 'perfis_admirados', label: 'Perfis admirados' },
      { key: 'perfis_rejeitados', label: 'Perfis rejeitados' },
      { key: 'cliches_mentiras', label: 'Clichês e mentiras do nicho' },
    ],
  },
  {
    group: 6,
    title: '6. Vocabulário e visual',
    fields: [
      { key: 'palavras_marca', label: 'Palavras da marca' },
      { key: 'palavras_proibidas', label: 'Palavras proibidas' },
      { key: 'estilo_visual', label: 'Estilo visual' },
      { key: 'referencia_pinterest', label: 'Referência/Pinterest' },
    ],
  },
  {
    group: 7,
    title: '7. Como você trabalha',
    fields: [
      { key: 'processo', label: 'Processo' },
      { key: 'preco', label: 'Preço' },
      { key: 'prazo_medio', label: 'Prazo médio' },
      { key: 'garantias', label: 'Garantias' },
    ],
  },
  {
    group: 8,
    title: '8. Provas e autoridade',
    fields: [
      { key: 'numeros_impacto', label: 'Números de impacto' },
      { key: 'depoimentos', label: 'Depoimentos e frases de clientes' },
    ],
  },
]

const INTERVIEW_GUIDES: { code: string; tema: string; duracao: string; objetivo: string }[] = [
  {
    code: 'G1',
    tema: 'A origem',
    duracao: '5-8 min',
    objetivo: 'Capturar história real e motivação.',
  },
  {
    code: 'G2',
    tema: 'O caso que transformou',
    duracao: '5-8 min',
    objetivo: 'Extrair caso antes/depois.',
  },
  {
    code: 'G3',
    tema: 'O cliente que não serve',
    duracao: '3-5 min',
    objetivo: 'Definir anti-ICP e aprendizados.',
  },
  {
    code: 'G4',
    tema: 'A raiva do mercado',
    duracao: '3-5 min',
    objetivo: 'Mapear inimigo narrativo e crenças.',
  },
  {
    code: 'G5',
    tema: 'A voz do cliente',
    duracao: '3-5 min',
    objetivo: 'Preservar linguagem real de compra.',
  },
  {
    code: 'G6',
    tema: 'A personalidade da marca',
    duracao: '3-5 min',
    objetivo: 'Definir arquétipos por analogia.',
  },
  { code: 'G7', tema: 'O legado', duracao: '3-5 min', objetivo: 'Direção de longo prazo.' },
  {
    code: 'G8',
    tema: 'Livre — o que mais importa',
    duracao: '2-5 min',
    objetivo: 'Capturar lacunas não cobertas.',
  },
]

const ASSET_DEFS: { type: BrandAssetType; layer: BrandAsset['layer']; title: string }[] = [
  { type: 'posicionamento', layer: 'quem_voce_e', title: 'Posicionamento' },
  { type: 'promessa', layer: 'quem_voce_e', title: 'Promessa' },
  { type: 'arquetipo', layer: 'quem_voce_e', title: 'Arquétipo' },
  { type: 'inimigo_narrativo', layer: 'quem_voce_e', title: 'Inimigo narrativo' },
  { type: 'tom_de_voz', layer: 'como_voce_fala', title: 'Tom de voz' },
  { type: 'vocabulario', layer: 'como_voce_fala', title: 'Vocabulário' },
  { type: 'storytelling', layer: 'como_voce_fala', title: 'Storytelling de origem' },
  { type: 'stack_de_prova', layer: 'como_voce_prova', title: 'Stack de prova' },
  { type: 'identidade_visual', layer: 'como_voce_prova', title: 'Identidade visual' },
  { type: 'pilares_de_conteudo', layer: 'como_voce_publica', title: 'Pilares de conteúdo' },
  { type: 'linha_editorial', layer: 'como_voce_publica', title: 'Linha editorial' },
  { type: 'bio_taglines', layer: 'como_voce_publica', title: 'Bio e taglines' },
  { type: 'oferta_principal', layer: 'como_voce_vende', title: 'Oferta principal' },
]

const LAYER_LABELS: Record<BrandAsset['layer'], string> = {
  quem_voce_e: 'Quem você é',
  como_voce_fala: 'Como você fala',
  como_voce_prova: 'Como você prova',
  como_voce_publica: 'Como você publica',
  como_voce_vende: 'Como você vende',
}

const LAYER_ORDER: BrandAsset['layer'][] = [
  'quem_voce_e',
  'como_voce_fala',
  'como_voce_prova',
  'como_voce_publica',
  'como_voce_vende',
]

export default function Posicionamento() {
  const { brandProfile, setBrandBase, setResearch, setInterview, setAssets, setGenerationMeta } =
    usePlatform()
  const { generate } = useAIGeneration()
  const [mode, setMode] = useState<
    'simplificado' | 'completo' | 'entrevista' | 'ativos' | 'academy'
  >('simplificado')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [expandedLayer, setExpandedLayer] = useState<BrandAsset['layer'] | null>('quem_voce_e')

  const base = brandProfile.base
  const updateBase = (key: keyof typeof base, value: string) =>
    setBrandBase({ ...base, [key]: value })

  // Research helpers
  const getResearch = (group: number, fieldKey: string) =>
    brandProfile.research.find((r) => r.group === group && r.fieldKey === fieldKey)?.value || ''
  const setResearchValue = (group: number, fieldKey: string, value: string) => {
    const others = brandProfile.research.filter(
      (r) => !(r.group === group && r.fieldKey === fieldKey),
    )
    const updated: ResearchAnswer[] = value ? [...others, { group, fieldKey, value }] : others
    setResearch(updated)
  }

  // Interview helpers
  const getInterview = (code: string) =>
    brandProfile.interview.find((i) => i.guideCode === code)?.transcript || ''
  const setInterviewValue = (code: string, value: string) => {
    const others = brandProfile.interview.filter((i) => i.guideCode !== code)
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
    const updated: InterviewAnswer[] = value
      ? [...others, { guideCode: code, transcript: value, wordCount }]
      : others
    setInterview(updated)
  }

  const interviewsCompleted = INTERVIEW_GUIDES.filter((g) => getInterview(g.code).trim()).length
  const researchFilled = brandProfile.research.length

  const requiredBaseOk = base.service && base.audience && base.result && base.differential

  const handleGenerate = async (full: boolean) => {
    if (!requiredBaseOk) {
      toast.error('Preencha os campos obrigatórios da base essencial.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      full ? 'brand_os_completo' : 'brand_os_simplificado',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1800,
    )
    // Monta os 13 ativos simulados
    const nicheTxt = base.niche || 'seu nicho'
    const assets: BrandAsset[] = ASSET_DEFS.map((def) => ({
      type: def.type,
      layer: def.layer,
      title: def.title,
      content: generateAssetContent(
        def.type,
        base,
        full ? brandProfile.research : [],
        full ? brandProfile.interview : [],
      ),
    }))
    setAssets(assets)
    setGenerationMeta({
      lastGeneratedAt: new Date().toISOString(),
      lastModel: res.contextVersion >= 0 ? 'lumen-ia-v3' : 'lumen-ia-v3',
      lastDurationMs: res.durationMs,
    })
    setLoading(false)
    setProgress(0)
    setProgressLabel('')
    setMode('ativos')
    toast.success(
      `Arquitetura de marca gerada! ${assets.length} ativos criados com Brand OS v${res.contextVersion + 1}.`,
    )
  }

  const handleExport = () => {
    const md = buildExportMarkdown(brandProfile)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumen-brand-os-arquitetura.md'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Arquitetura do Brand OS exportada!')
  }

  const hasAssets = brandProfile.assets.length > 0

  const subTabs = [
    { id: 'simplificado', label: 'Base essencial', icon: Compass },
    { id: 'completo', label: 'Formulário completo', icon: ClipboardList },
    { id: 'entrevista', label: 'Entrevista guiada', icon: Mic },
    { id: 'ativos', label: `Ativos de marca (${brandProfile.assets.length})`, icon: Sparkles },
    { id: 'academy', label: 'Academy', icon: FileText },
  ] as const

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 1 — Posicionamento (Brand OS)"
        description="A fonte única de verdade da marca. Alimenta todos os geradores de IA da plataforma com contexto coerente."
        icon={<Compass className="w-5 h-5" />}
        accent="#7C5CFC"
        actions={
          hasAssets && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-white/10 text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Exportar arquitetura
            </Button>
          )
        }
      />

      {/* Sub-abas */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0e0e15] rounded-xl border border-white/5">
        {subTabs.map((t) => {
          const Icon = t.icon
          const active = mode === t.id
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id as typeof mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-[#7C5CFC] text-white shadow-lg shadow-[#7C5CFC]/25'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Escolha de profundidade (banner) */}
      {mode === 'simplificado' && !hasAssets && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#1C1C27] to-[#14141C] border border-[#7C5CFC]/30 p-5 space-y-3">
            <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">Rápida</Badge>
            <h3 className="text-base font-bold text-white">Versão simplificada</h3>
            <p className="text-xs text-[#9494A8]">
              Somente a base essencial. A IA supre lacunas com suposições. Geração mais rápida,
              porém mais genérica.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#1C1C27] to-[#14141C] border border-[#22D3EE]/30 p-5 space-y-3">
            <Badge className="bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/30">Profunda</Badge>
            <h3 className="text-base font-bold text-white">Versão completa</h3>
            <p className="text-xs text-[#9494A8]">
              Base + formulário estruturado + 8 transcrições de entrevista. Mais profunda e
              personalizada.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode('completo')}
              className="border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/10 text-xs gap-1.5"
            >
              Ir para formulário completo →
            </Button>
          </div>
        </div>
      )}

      {/* Base essencial */}
      {mode === 'simplificado' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nicho de mercado">
                <input
                  className={inputClass}
                  value={base.niche}
                  onChange={(e) => updateBase('niche', e.target.value)}
                  placeholder="Ex: Marketing digital"
                />
              </Field>
              <Field label="Subnicho">
                <input
                  className={inputClass}
                  value={base.subniche}
                  onChange={(e) => updateBase('subniche', e.target.value)}
                  placeholder="Ex: Tráfego pago para infoprodutos"
                />
              </Field>
            </div>
            <Field label="Serviço que oferece" required hint="Essencial para funis e conteúdo">
              <textarea
                className={inputClass}
                rows={2}
                value={base.service}
                onChange={(e) => updateBase('service', e.target.value)}
                placeholder="Descreva o serviço principal que você entrega…"
              />
            </Field>
            <Field label="Público-alvo" required>
              <textarea
                className={inputClass}
                rows={2}
                value={base.audience}
                onChange={(e) => updateBase('audience', e.target.value)}
                placeholder="Quem é o cliente ideal que você atende…"
              />
            </Field>
            <Field label="Resultado que entrega" required>
              <textarea
                className={inputClass}
                rows={2}
                value={base.result}
                onChange={(e) => updateBase('result', e.target.value)}
                placeholder="Que transformação o cliente obtém…"
              />
            </Field>
            <Field label="Diferencial" required>
              <textarea
                className={inputClass}
                rows={2}
                value={base.differential}
                onChange={(e) => updateBase('differential', e.target.value)}
                placeholder="O que torna sua oferta única…"
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tom de voz">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={base.voice}
                  onChange={(e) => updateBase('voice', e.target.value)}
                  placeholder="Como sua marca fala…"
                />
              </Field>
              <Field label="Oferta principal">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={base.mainOffer}
                  onChange={(e) => updateBase('mainOffer', e.target.value)}
                  placeholder="Sua oferta principal…"
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GenerateButton
              onClick={() => handleGenerate(false)}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!requiredBaseOk}
              label="Gerar pela base simplificada"
            />
            <Button
              variant="outline"
              onClick={() => handleGenerate(true)}
              disabled={loading || !requiredBaseOk}
              className="border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/10 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerar com formulário + entrevista
            </Button>
          </div>
          {!requiredBaseOk && (
            <p className="text-[11px] text-amber-400">
              Preencha os campos obrigatórios (*): serviço, público-alvo, resultado e diferencial.
            </p>
          )}
          {hasAssets && brandProfile.lastGeneratedAt && (
            <GenerationMetaBar
              contextVersion={brandProfile.activeVersion}
              generatedAt={brandProfile.lastGeneratedAt}
              model={brandProfile.lastModel}
              durationMs={brandProfile.lastDurationMs}
            />
          )}
        </div>
      )}

      {/* Formulário completo */}
      {mode === 'completo' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9494A8]">
              {researchFilled} campo(s) preenchido(s). Salvamento automático.
            </p>
            <span className="text-[10px] text-[#9494A8]">
              O grupo "O que você vende" é essencial.
            </span>
          </div>
          {RESEARCH_GROUPS.map((g) => (
            <div key={g.group} className="rounded-2xl bg-[#14141C] border border-white/5 p-4">
              <h3 className="text-sm font-bold text-white mb-3">{g.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {g.fields.map((f) => (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    <input
                      className={inputClass}
                      value={getResearch(g.group, f.key)}
                      onChange={(e) => setResearchValue(g.group, f.key, e.target.value)}
                      placeholder="…"
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <GenerateButton
              onClick={() => handleGenerate(true)}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!requiredBaseOk}
              label="Gerar arquitetura completa"
            />
          </div>
        </div>
      )}

      {/* Entrevista guiada */}
      {mode === 'entrevista' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-[#14141C] border border-white/5 p-3">
            <p className="text-xs text-[#9494A8]">
              Orientação: grave fora, transcreva e cole o texto. {interviewsCompleted}/8 guias
              preenchidos.
            </p>
            <Badge
              className={
                interviewsCompleted === 8
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 text-[#9494A8] border-white/10'
              }
            >
              {interviewsCompleted === 8 ? 'Pronto para gerar' : `${interviewsCompleted}/8`}
            </Badge>
          </div>
          {INTERVIEW_GUIDES.map((g) => {
            const txt = getInterview(g.code)
            const wc = txt.trim() ? txt.trim().split(/\s+/).length : 0
            return (
              <div
                key={g.code}
                className="rounded-2xl bg-[#14141C] border border-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                      {g.code}
                    </Badge>
                    <div>
                      <h4 className="text-sm font-bold text-white">{g.tema}</h4>
                      <p className="text-[11px] text-[#9494A8]">
                        {g.duracao} • {g.objetivo}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#9494A8]">{wc} palavras</span>
                </div>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={txt}
                  onChange={(e) => setInterviewValue(g.code, e.target.value)}
                  placeholder="Cole aqui a transcrição da entrevista…"
                />
              </div>
            )
          })}
          <GenerateButton
            onClick={() => handleGenerate(true)}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!requiredBaseOk}
            label="Gerar com base + entrevista"
          />
        </div>
      )}

      {/* Ativos de marca */}
      {mode === 'ativos' && (
        <div className="space-y-4">
          {!hasAssets ? (
            <EmptyState
              icon={<Sparkles className="w-6 h-6" />}
              title="Nenhum ativo de marca gerado ainda"
              description="Preencha a base essencial e gere a arquitetura para criar os 13 ativos de marca que alimentam todos os módulos."
              action={
                <Button
                  size="sm"
                  onClick={() => setMode('simplificado')}
                  className="bg-[#7C5CFC] gap-1.5"
                >
                  <Compass className="w-4 h-4" /> Ir para a base essencial
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#9494A8]">
                  {brandProfile.assets.length} ativos gerados em 5 camadas estruturadas.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="border-white/10 text-xs gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar arquitetura
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleGenerate(true)}
                    className="bg-[#7C5CFC] text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerar
                  </Button>
                </div>
              </div>
              {brandProfile.lastGeneratedAt && (
                <GenerationMetaBar
                  contextVersion={brandProfile.activeVersion}
                  generatedAt={brandProfile.lastGeneratedAt}
                  model={brandProfile.lastModel}
                  durationMs={brandProfile.lastDurationMs}
                />
              )}
              {LAYER_ORDER.map((layer) => {
                const layerAssets = brandProfile.assets.filter((a) => a.layer === layer)
                if (!layerAssets.length) return null
                const isOpen = expandedLayer === layer
                return (
                  <div
                    key={layer}
                    className="rounded-2xl bg-[#14141C] border border-white/5 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedLayer(isOpen ? null : layer)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5"
                    >
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-[#7C5CFC]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#7C5CFC]" />
                        )}
                        {LAYER_LABELS[layer]}
                      </span>
                      <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                        {layerAssets.length} ativos
                      </Badge>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-2">
                        {layerAssets.map((a) => (
                          <AssetCard key={a.type} asset={a} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Academy */}
      {mode === 'academy' && (
        <AcademyPanel
          moduleTitle="Posicionamento"
          lessons={[
            { title: 'Base simplificada: como preencher rápido', duration: '6 min' },
            { title: 'Base completa: formulário estruturado', duration: '12 min' },
            { title: 'Como conduzir as 8 entrevistas guiadas', duration: '15 min' },
            { title: 'Entendendo os 13 ativos de marca', duration: '10 min' },
            { title: 'Como exportar e usar a arquitetura', duration: '7 min' },
          ]}
        />
      )}
    </div>
  )
}

function AssetCard({ asset }: { asset: BrandAsset }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(asset.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success(`"${asset.title}" copiado!`)
  }
  return (
    <div className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <h5 className="text-xs font-bold text-white">{asset.title}</h5>
        <button
          onClick={copy}
          className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-1"
        >
          {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{asset.content}</p>
    </div>
  )
}

function generateAssetContent(
  type: BrandAssetType,
  base: BrandProfile['base'],
  research: ResearchAnswer[],
  interview: InterviewAnswer[],
): string {
  const niche = base.niche || 'seu nicho'
  const audience = base.audience || 'seu público'
  const result = base.result || 'o resultado prometido'
  const differential = base.differential || 'seu diferencial'
  const service = base.service || 'seu serviço'

  const r = (key: string) => research.find((x) => x.fieldKey === key)?.value
  const i = (code: string) => interview.find((x) => x.guideCode === code)?.transcript

  switch (type) {
    case 'posicionamento':
      return `Para ${audience} que buscam ${result}, ${service} é a alternativa que entrega ${differential} — diferente das soluções genéricas de ${niche}.`
    case 'promessa':
      return `Em até 90 dias você vai ${result.toLowerCase()}, ou seu investimento de volta. Sem promessas vazias — entregamos ${differential.toLowerCase()}.`
    case 'arquetipo':
      return `${i('G6') ? 'Baseado na sua personalidade: ' : ''}Arquétipo "O Sábio + O Guia". Você traduz complexidade de ${niche} em clareza prática e conduz o cliente até a transformação.`
    case 'inimigo_narrativo':
      return `O inimigo é a abordagem superficial de ${niche} que promete rápido e entrega pouco. ${i('G4') ? 'Sua raiva do mercado sustenta essa narrativa.' : 'Combata a desinformação e o atalho ilusório.'}`
    case 'tom_de_voz':
      return base.voice
        ? `${base.voice}`
        : `Direto, técnico-acessível e motivador. Sem jargão desnecessário, com autoridade de quem executa, não só ensina.`
    case 'vocabulario':
      return `Palavras da marca: ${r('palavras_marca') || 'transformação, método, clareza, execução'}.\nPalavras proibidas: ${r('palavras_proibidas') || 'mágico, fácil, segredo, faça você mesmo sem método'}.`
    case 'storytelling':
      return i('G1')
        ? `História de origem: ${i('G1').slice(0, 280)}…`
        : `A jornada começa quando você percebeu que ${audience} precisavam de ${result}, mas as opções de ${niche} não entregavam ${differential.toLowerCase()}. Decidiu construir um caminho próprio.`
    case 'stack_de_prova':
      return `1. Números: ${r('numeros_impacto') || 'X clientes atendidos'}\n2. Casos: ${r('casos_sucesso') || 'depoimentos antes/depois'}\n3. Depoimentos: ${r('depoimentos') || 'frases reais de clientes'}\n4. Autoridade: ${r('premios') || r('certificacoes') || 'reconhecimento de mercado'}`
    case 'identidade_visual':
      return `Estilo: ${r('estilo_visual') || 'moderno, escuro, premium'}. Referência: ${r('referencia_pinterest') || 'paleta violeta + ciano sobre fundo carbono'}. Manter consistência em todas as peças.`
    case 'pilares_de_conteudo':
      return `1. Educação: quebre mitos de ${niche}\n2. Bastidores: mostre o método em ação\n3. Prova: casos e resultados\n4. Conexão: histórias de ${audience}\n5. Conversão: oferta e garantia`
    case 'linha_editorial':
      return `Conteúdo orientado por ${differential.toLowerCase()}. Evite clichês de ${niche}. Toda peça leva a um próximo passo claro. Foco em ${audience} que valorizam ${result.toLowerCase()}.`
    case 'bio_taglines':
      return `Bio: ${service} para ${audience}. ${result}.\nTagline 1: ${differential}\nTagline 2: ${niche} sem enrolação.\nTagline 3: O método que entrega ${result.toLowerCase()}.`
    case 'oferta_principal':
      return base.mainOffer
        ? base.mainOffer
        : `${service} para ${audience}. Entrega: ${result}. Diferencial: ${differential}. Garantia: ${r('garantias') || 'condições claras de reembolso'}.`
  }
}

function buildExportMarkdown(profile: BrandProfile): string {
  let md = `# Arquitetura de Marca — Brand OS\n\n`
  md += `> Plataforma de Marketing e Vendas com IA — LUMEN Studio\n\n`
  md += `- **Versão:** ${profile.activeVersion}\n`
  md += `- **Gerado em:** ${profile.lastGeneratedAt ? new Date(profile.lastGeneratedAt).toLocaleString('pt-BR') : '-'}\n`
  md += `- **Modelo:** ${profile.lastModel || '-'}\n\n`
  md += `## Base essencial\n\n`
  const b = profile.base
  md += `- Nicho: ${b.niche}\n- Subnicho: ${b.subniche}\n- Serviço: ${b.service}\n- Público: ${b.audience}\n- Resultado: ${b.result}\n- Diferencial: ${b.differential}\n- Tom de voz: ${b.voice}\n- Oferta: ${b.mainOffer}\n\n`
  md += `## Ativos de marca (${profile.assets.length})\n\n`
  for (const layer of LAYER_ORDER) {
    const assets = profile.assets.filter((a) => a.layer === layer)
    if (!assets.length) continue
    md += `### ${LAYER_LABELS[layer]}\n\n`
    for (const a of assets) {
      md += `#### ${a.title}\n\n${a.content}\n\n`
    }
  }
  return md
}
