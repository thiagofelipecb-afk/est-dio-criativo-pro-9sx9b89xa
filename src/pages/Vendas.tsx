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
  SalesStage,
  SalesInputMode,
  SalesAssistRequest,
  SalesScript,
  ProfileCapture,
} from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Headphones,
  FileText,
  Users,
  Sparkles,
  Copy,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const STAGES: { id: SalesStage; label: string; def: string }[] = [
  { id: 'prospeccao', label: 'Prospecção', def: 'Primeiro contato com o lead' },
  { id: 'qualificacao', label: 'Qualificação', def: 'Decidir se vale a reunião' },
  { id: 'reuniao', label: 'Reunião', def: 'Diagnóstico e proposta' },
  { id: 'objecao', label: 'Objeção', def: 'Lead travou ou recusou' },
  { id: 'follow_up', label: 'Follow-up', def: 'Sem resposta ou sem decisão' },
  { id: 'fechamento', label: 'Fechamento', def: 'Pedir a decisão' },
]

const SCRIPT_TYPES = [
  'Prospecção - Modelo Master',
  'Abordagem de Lead Morno',
  'Abordagem de Lead Curioso',
  'Reativação de Oportunidade Perdida',
  'Pré-qualificação pelo WhatsApp',
  'Abertura da Reunião - Método ESTAR',
  'Diagnóstico - Aprofundar a Dor',
  'Pergunta de Ouro - antes do preço',
  'Acordo de Decisão',
  'Quebra de Objeção - Preciso Pensar',
  'Quebra de Objeção - Sem Dinheiro',
  'Quebra de Objeção - Já Tentei Antes',
  'Downsell Ético',
  'Follow-up após Reunião - 24h',
  'Follow-up de Reativação - 30 dias',
  'Pedido de Indicação',
]

export default function Vendas() {
  const [sub, setSub] = useState<'assistente' | 'scripts' | 'social' | 'academy'>('assistente')
  const tabs = [
    { id: 'assistente', label: 'Assistente', icon: Headphones },
    { id: 'scripts', label: 'Gerador de Scripts', icon: FileText },
    { id: 'social', label: 'Social Selling', icon: Users },
    { id: 'academy', label: 'Academy', icon: Sparkles },
  ] as const
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 6 — Vendas"
        description="Apoie prospecção, qualificação, reunião, fechamento e follow-up com contexto da marca, sem prompts livres."
        icon={<Headphones className="w-5 h-5" />}
        accent="#7C5CFC"
      />
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0e0e15] rounded-xl border border-white/5">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = sub === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id as typeof sub)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-[#7C5CFC] text-white' : 'text-[#9494A8] hover:text-white hover:bg-white/5'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>
      {sub === 'assistente' && <AssistentePanel />}
      {sub === 'scripts' && <ScriptsPanel />}
      {sub === 'social' && <SocialPanel />}
      {sub === 'academy' && (
        <AcademyPanel
          moduleTitle="Vendas"
          lessons={[
            { title: 'Assistente em tempo real', duration: '10 min' },
            { title: '16 scripts de vendas', duration: '15 min' },
            { title: 'Social selling com perfil capturado', duration: '9 min' },
          ]}
        />
      )}
    </div>
  )
}

function AssistentePanel() {
  const { brandProfile, salesRequests, saveSalesRequest } = usePlatform()
  const { generate } = useAIGeneration()
  const [stage, setStage] = useState<SalesStage>('prospeccao')
  const [inputMode, setInputMode] = useState<SalesInputMode>('descrever')
  const [situation, setSituation] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<SalesAssistRequest | null>(null)

  const handleGenerate = async () => {
    if (!situation.trim()) {
      toast.error('Descreva a situação, cole a conversa ou envie o print.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'sales_assist',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1500,
    )
    const result = {
      script: buildScript(stage, situation, brandProfile.base),
      avoid: buildAvoid(stage, brandProfile.base),
      nextStep: buildNextStep(stage, brandProfile.base),
      confidence: buildConfidence(stage, { situation, context }, brandProfile.base),
      missing: missingFields(stage, { situation, context }),
    }
    const req: SalesAssistRequest = {
      id: uid('sa'),
      stage,
      inputMode,
      situation,
      context,
      result,
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
    }
    saveSalesRequest(req)
    setCurrent(req)
    setLoading(false)
    setProgress(0)
    toast.success('Orientação gerada!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Assistente em tempo real</h3>
          <div>
            <p className="text-xs text-[#9494A8] mb-2">Etapa comercial</p>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStage(s.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium text-center ${stage === s.id ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                  title={s.def}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Modo de entrada">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['descrever', 'Descrever situação'],
                  ['colar', 'Colar conversa'],
                  ['print', 'Enviar print'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setInputMode(id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium ${inputMode === id ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label={
              inputMode === 'print'
                ? 'Descreva o print enviado'
                : inputMode === 'colar'
                  ? 'Cole a conversa'
                  : 'Descreva a situação'
            }
            required
          >
            <textarea
              className={inputClass}
              rows={4}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder={
                inputMode === 'colar' ? 'Cole aqui a conversa…' : 'O que está acontecendo agora?'
              }
            />
          </Field>
          <Field label="Contexto adicional (opcional)" hint="Origem, ticket, histórico, timing">
            <input
              className={inputClass}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Lead veio do Instagram, ticket R$ 997"
            />
          </Field>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!situation.trim()}
            label="O que fazer agora?"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Histórico ({salesRequests.length})
          </p>
          {salesRequests.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="rounded-xl bg-[#14141C] border border-white/5 p-3 cursor-pointer hover:border-[#7C5CFC]/40"
              onClick={() => setCurrent(r)}
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
                  {STAGES.find((s) => s.id === r.stage)?.label}
                </Badge>
                <span className="text-[10px] text-[#9494A8]">
                  {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{r.situation}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        {current?.result ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Orientação</h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                Brand OS v{current.contextVersion}
              </Badge>
            </div>
            {/* Nível de confiança & dados faltantes */}
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase text-amber-400">
                  Nível de confiança &amp; dados faltantes
                </span>
                <Badge
                  className={`text-[10px] ${
                    current.result.confidence === 'Alta'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : current.result.confidence === 'Média'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  Confiança {current.result.confidence || 'Média'}
                </Badge>
              </div>
              {current.result.missing && current.result.missing.length > 0 ? (
                <p className="text-[11px] text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-semibold">⚠️ Dados faltantes:</span>{' '}
                    {current.result.missing.join(', ')}
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-emerald-300">
                  Contexto completo — nenhuma informação crítica faltando.
                </p>
              )}
            </div>
            <div className="rounded-lg bg-[#0e0e15]/60 p-3 border-l-2 border-emerald-500">
              <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Script certo</p>
              <p className="text-xs text-slate-200 whitespace-pre-wrap">{current.result.script}</p>
            </div>
            <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
              <p className="text-[10px] font-bold text-red-400 uppercase mb-1">O que não fazer</p>
              <ul className="text-xs text-red-300 space-y-0.5">
                {current.result.avoid.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-[#22D3EE]/5 border border-[#22D3EE]/20 p-3">
              <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">Próximo passo</p>
              <p className="text-xs text-slate-200">{current.result.nextStep}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5 flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(current.result!.script)
                  toast.success('Script copiado!')
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Copiar script
              </Button>
              <Button
                size="sm"
                className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs gap-1.5 flex-1"
                onClick={() => {
                  const all = `SCRIPT\n${current.result!.script}\n\nO QUE NÃO FAZER\n${current
                    .result!.avoid.map((a) => `• ${a}`)
                    .join('\n')}\n\nPRÓXIMO PASSO\n${current.result!.nextStep}`
                  navigator.clipboard.writeText(all)
                  toast.success('Tudo copiado!')
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Copiar tudo
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Headphones className="w-6 h-6" />}
            title="Assistente de vendas"
            description="Selecione a etapa, descreva a situação e receba o script certo, o que evitar e o próximo passo."
          />
        )}
      </div>
    </div>
  )
}

function buildScript(stage: SalesStage, situation: string, base: any): string {
  const service = base.service || 'especialistas'
  const result = base.result || 'o resultado'
  const diff = base.differential || 'nosso método'
  const audience = base.audience || 'seu cliente'
  const offer = base.mainOffer || 'nossa oferta'
  const voice = base.voice || ''
  const voiceHint = voice ? ` (tom ${voice})` : ''
  switch (stage) {
    case 'prospeccao':
      return `Oi [Nome], vi seu conteúdo sobre [tema] e faz muito sentido. Trabalho com ${service} entregando ${result} através de ${diff}. Te interessa um diagnóstico rápido de 15min?${voiceHint}`
    case 'qualificacao':
      return `Antes de agendar, duas perguntas rápidas: 1) qual seu maior desafio hoje com [dor] — considerando que atendemos ${audience}? 2) já investiu em ${service} antes? Assim eu te direciono direito.`
    case 'reuniao':
      return `Baseado no que você compartilhou, o gargalo é [X]. Nosso foco seria ${result} em até 90 dias com ${diff}, que é o que sustenta ${offer}. Faz sentido pra você?`
    case 'objecao':
      return `Entendo perfeitamente. Me explica uma coisa: o que te faz hesitar — é o investimento, o timing ou a certeza de que ${service} vai funcionar pra você?`
    case 'follow_up':
      return `Oi [Nome], passando para saber se você teve chance de pensar sobre alcançar ${result}. Fico à disposição para tirar qualquer dúvida restante.`
    case 'fechamento':
      return `Então, pelo que conversamos, faz sentido avançar com ${offer}. Você prefere iniciar hoje ou amanhã? Assim já garanto seu lugar na agenda.`
  }
}

function buildConfidence(
  stage: SalesStage,
  input: { situation: string; context: string },
  base: any,
): 'Alta' | 'Média' | 'Baixa' {
  const hasBrand = !!(base.service || base.result || base.differential)
  const hasContext = input.context.trim().length > 0
  const hasSituation = input.situation.trim().length >= 40
  let score = 0
  if (hasBrand) score += 1
  if (hasContext) score += 1
  if (hasSituation) score += 1
  if (score >= 3) return 'Alta'
  if (score === 2) return 'Média'
  return 'Baixa'
}

function missingFields(stage: SalesStage, input: { situation: string; context: string }): string[] {
  const missing: string[] = []
  const ctx = input.context.toLowerCase()
  if (!ctx.includes('origem')) missing.push('origem do lead')
  if (!ctx.includes('ticket') && !ctx.includes('r$')) missing.push('ticket médio')
  if (!ctx.includes('timing') && !ctx.includes('prazo') && !ctx.includes('decisão'))
    missing.push('timing da decisão')
  if (input.situation.trim().length < 40) missing.push('detalhamento da situação')
  return missing
}

function buildAvoid(stage: SalesStage, base: any): string[] {
  const service = base.service || 'nosso serviço'
  const diff = base.differential || 'nosso método'
  const map: Record<SalesStage, string[]> = {
    prospeccao: [
      'Não enviar áudio longo no primeiro contato',
      'Não falar de preço antes de valor',
      'Não parecer genérico',
      `Não citar ${service} sem ancora no ${diff} — o nome do serviço vem depois do valor`,
    ],
    qualificacao: [
      'Não agendar reunião sem qualificar',
      'Não ignorar sinais de não-fit',
      'Não pressionar',
      `Não qualificar sem checar fit com ${diff} — evita reunião improdutiva`,
    ],
    reuniao: [
      'Não apresentar solução antes do diagnóstico',
      'Não falar de você demais',
      'Não pular prova',
      `Não apresentar a proposta sem antes mostrar como ${service} resolve a dor`,
    ],
    objecao: [
      'Não discordar do lead',
      'Não justificar demais',
      'Não baixar preço de cara',
      `Não defender ${service} com argumento genérico — use ${diff} como prova`,
    ],
    follow_up: [
      'Não cobrar resposta',
      'Não sumir por dias',
      'Não repetir a mesma mensagem',
      `Não seguir sem valor — retome sempre ${diff} como motivo de continuar a conversa`,
    ],
    fechamento: [
      'Não pedir decisão sem revisar valor',
      'Não criar urgência falsa',
      'Não deixar em aberto',
      `Não fechar sem reforçar que ${service} entrega ${base.result || 'o resultado'} prometido`,
    ],
  }
  return map[stage]
}
function buildNextStep(stage: SalesStage, base: any): string {
  const service = base.service || 'o serviço'
  const diff = base.differential || 'o método'
  const map: Record<SalesStage, string> = {
    prospeccao: 'Aguardar resposta e, se positivo, agendar diagnóstico.',
    qualificacao: 'Se fit, agendar reunião; se não-fit, indicar outro recurso.',
    reuniao: 'Enviar proposta e definir prazo de decisão.',
    objecao: 'Isolar a objeção real e endereçar com prova.',
    follow_up: 'Se sem resposta em 48h, reativar com novo ângulo.',
    fechamento: 'Processar pagamento e iniciar onboarding.',
  }
  const extra: Record<SalesStage, string> = {
    prospeccao: ` Em todo contato, manter vivo o gancho de ${diff}.`,
    qualificacao: ` Confirmar alinhamento com ${service} antes de avançar.`,
    reuniao: ` Revisar se a proposta reflete ${diff}.`,
    objecao: ` Ancorar a resposta em ${diff} como diferencial comprovado.`,
    follow_up: ` Reabrir a conversa conectando a ${service}.`,
    fechamento: ` Reforçar a entrega de ${base.result || 'o resultado'} no onboarding.`,
  }
  return map[stage] + (extra[stage] || '')
}

function ScriptsPanel() {
  const { brandProfile, salesScripts, saveSalesScript } = usePlatform()
  const { generate } = useAIGeneration()
  const [type, setType] = useState(SCRIPT_TYPES[0])
  const [contextNote, setContextNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<SalesScript | null>(null)
  const [drafts, setDrafts] = useState<string[]>([])
  const [edited, setEdited] = useState<boolean[]>([])

  const handleGenerate = async () => {
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'sales_script',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1400,
    )
    const variations = [
      `Versão 1 (direta): ${type} — ${brandProfile.base.differential || 'método'} • ${contextNote || 'contexto geral'}.`,
      `Versão 2 (storytelling): Começa com uma história que ilustra ${brandProfile.base.result || 'a transformação'}, depois conduz à oferta.`,
      `Versão 3 (pergunta): Abre com uma pergunta provocativa sobre ${brandProfile.base.audience || 'o cliente'}, cria tensão e apresenta a solução.`,
    ]
    const script: SalesScript = {
      id: uid('ss'),
      type,
      contextNote,
      variations,
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
    }
    saveSalesScript(script)
    setCurrent(script)
    setDrafts(variations)
    setEdited([false, false, false])
    setLoading(false)
    setProgress(0)
    toast.success('3 variações geradas!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Gerador de Scripts (16 tipos)</h3>
          <Field label="Tipo de script">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              {SCRIPT_TYPES.map((s, i) => (
                <option key={s} value={s}>
                  {i + 1}. {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contexto (opcional)">
            <textarea
              className={inputClass}
              rows={2}
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="Detalhes específicos para personalizar…"
            />
          </Field>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            label="Gerar 3 variações"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Scripts salvos ({salesScripts.length})
          </p>
          {salesScripts.map((s) => (
            <div
              key={s.id}
              className="rounded-xl bg-[#14141C] border border-white/5 p-3 cursor-pointer hover:border-[#7C5CFC]/40"
              onClick={() => {
                setCurrent(s)
                setDrafts(s.variations)
                setEdited(s.variations.map(() => false))
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white truncate">{s.type}</span>
                <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                  v{s.contextVersion}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{current.type}</h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                v{current.contextVersion}
              </Badge>
            </div>
            {current.variations.map((v, i) => (
              <div
                key={i}
                className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#7C5CFC]">
                    Variação {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {edited[i] && (
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px]">
                        Editado
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(drafts[i] ?? v)
                        toast.success('Copiado!')
                      }}
                      className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                </div>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={drafts[i] ?? v}
                  onChange={(e) => {
                    setDrafts((d) => {
                      const next = [...d]
                      next[i] = e.target.value
                      return next
                    })
                    setEdited((ed) => {
                      const next = [...ed]
                      next[i] = (e.target.value ?? v) !== v
                      return next
                    })
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-[10px] gap-1 h-7"
                    onClick={() => {
                      if (!current) return
                      const updated: SalesScript = {
                        ...current,
                        variations: current.variations.map((vv, idx) =>
                          idx === i ? (drafts[i] ?? v) : vv,
                        ),
                      }
                      saveSalesScript(updated)
                      setCurrent(updated)
                      setEdited((ed) => {
                        const next = [...ed]
                        next[i] = false
                        return next
                      })
                      toast.success('Edição salva!')
                    }}
                  >
                    Salvar edição
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="Nenhum script gerado"
            description="Escolha um dos 16 tipos e gere 3 variações personalizadas com o contexto do Brand OS."
          />
        )}
      </div>
    </div>
  )
}

interface FitBreakdown {
  total: number
  niche: number
  audience: number
  educational: number
  engagement: number
  reasons: string[]
}

function computeFit(profile: ProfileCapture, brandNiche: string): FitBreakdown {
  const reasons: string[] = []
  // 1. Nicho compatível (+30) — keywords do nicho do Brand OS presentes no snapshot
  let nichePts = 0
  if (brandNiche) {
    const kw = brandNiche
      .toLowerCase()
      .split(/[\s/,]+/)
      .filter((w) => w.length > 3)
    const snap = (profile.snapshot || '').toLowerCase()
    const hit = kw.some((w) => snap.includes(w))
    if (hit) {
      nichePts = 30
      reasons.push(`Nicho +30 (palavras-chave de "${brandNiche}" encontradas no perfil)`)
    } else {
      reasons.push('Nicho +0 (sem sobreposição de palavras-chave)')
    }
  } else {
    reasons.push('Nicho +0 (Brand OS sem nicho definido)')
  }

  // 2. Tamanho de audiência (+25 se postsCount > 10)
  const audiencePts = profile.postsCount > 10 ? 25 : 0
  reasons.push(`Audiência +${audiencePts} (${profile.postsCount} posts)`)

  // 3. Conteúdo educacional (+25 baseado no snapshot)
  let educationalPts = 0
  const snapLower = (profile.snapshot || '').toLowerCase()
  const eduSignals = ['como', 'passo a passo', 'dica', 'tutorial', 'aprenda', 'guia', 'método']
  if (eduSignals.some((s) => snapLower.includes(s))) {
    educationalPts = 25
    reasons.push('Educacional +25 (sinais de conteúdo educativo no snapshot)')
  } else if (profile.postsCount > 0) {
    educationalPts = 10
    reasons.push('Educacional +10 (perfil ativo, sinais educativos limitados)')
  } else {
    reasons.push('Educacional +0 (sem sinais educativos)')
  }

  // 4. Engajamento visível (+20) — heurística: snapshot menciona curtidas/comentários
  let engagementPts = 0
  if (/curti|coment|engage|salvou|compartilhou/.test(snapLower)) {
    engagementPts = 20
    reasons.push('Engajamento +20 (sinais de interação visíveis)')
  } else {
    reasons.push('Engajamento +0 (sem sinais de interação visíveis)')
  }

  const total = Math.min(100, nichePts + audiencePts + educationalPts + engagementPts)
  return {
    total,
    niche: nichePts,
    audience: audiencePts,
    educational: educationalPts,
    engagement: engagementPts,
    reasons,
  }
}

function temperatureLabel(fit: number): string {
  if (fit >= 80) return 'Quente 🔥'
  if (fit >= 50) return 'Morno 🌤️'
  return 'Frio ❄️'
}

function SocialPanel() {
  const { profileCaptures, brandProfile } = usePlatform()
  const { generate } = useAIGeneration()
  const [loading, setLoading] = useState(false)
  const [approach, setApproach] = useState<string | null>(null)
  const [fitMap, setFitMap] = useState<Record<string, FitBreakdown>>({})
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)

  const handleGenerate = async (profile: ProfileCapture) => {
    setLoading(true)
    setSelectedProfile(profile.id)
    await generate('social_selling', () => {}, 1200)
    const fit = computeFit(profile, brandProfile.base.niche)
    setFitMap((m) => ({ ...m, [profile.id]: fit }))
    const temp = temperatureLabel(fit.total)
    setApproach(
      `Fit: ${fit.total}/100 • Temperatura: ${temp}\n\nBreakdown: ${fit.reasons.join('\n')}\n\nAbordagem: "Oi [Nome], acompanho seu conteúdo sobre [tema do perfil]. Trabalho com ${brandProfile.base.service || 'especialistas'} entregando ${brandProfile.base.result || 'resultado'}. Achei que faria sentido conversar — te interessa um diagnóstico rápido?"`,
    )
    setLoading(false)
    toast.success('Abordagem de social selling gerada!')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5">
        <h3 className="text-sm font-bold text-white mb-1">Social Selling</h3>
        <p className="text-xs text-[#9494A8]">
          Cruza o perfil capturado com seu posicionamento e gera nota de fit, temperatura e
          abordagens prontas.
        </p>
      </div>
      {profileCaptures.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Nenhum perfil capturado"
          description="Capture perfis no Módulo 2 (Espionagem) para gerar abordagens de social selling."
        />
      ) : (
        <div className="space-y-3">
          {profileCaptures.map((p) => {
            const fit = fitMap[p.id]
            return (
              <div
                key={p.id}
                className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{p.handle}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-[11px] gap-1"
                    onClick={() => handleGenerate(p)}
                    disabled={loading && selectedProfile === p.id}
                  >
                    <Sparkles className="w-3 h-3" />{' '}
                    {loading && selectedProfile === p.id ? 'Gerando…' : 'Gerar abordagem'}
                  </Button>
                </div>
                {fit && (
                  <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] ${
                          fit.total >= 80
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : fit.total >= 50
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        }`}
                      >
                        {temperatureLabel(fit.total)}
                      </Badge>
                      <span className="text-[11px] font-semibold text-white">
                        Fit: {fit.total}/100
                      </span>
                      <span className="text-[10px] text-[#9494A8]">
                        (Nicho +{fit.niche}, Audiência +{fit.audience}, Educacional +
                        {fit.educational}, Engajamento +{fit.engagement})
                      </span>
                    </div>
                    <ul className="text-[10px] text-[#9494A8] space-y-0.5">
                      {fit.reasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedProfile === p.id && approach && (
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-xs text-slate-200 whitespace-pre-wrap">
                    {approach}
                  </div>
                )}
              </div>
            )
          })}
          <p className="text-[10px] text-[#9494A8]/70 italic px-1">
            Esta análise é baseada em dados públicos do perfil e heurísticas. Não representa
            garantia de conversão.
          </p>
        </div>
      )}
    </div>
  )
}
