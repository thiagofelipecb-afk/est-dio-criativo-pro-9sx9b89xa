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
  BlockEditor,
} from '@/components/marketing/Shared'
import {
  PageProject,
  VideoScript,
  VideoScriptMethod,
  PageSection,
  ContentBlock,
  FunnelStage,
} from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { toast } from 'sonner'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const PAGE_TYPES = [
  { id: 'captura', label: 'Captura', desc: 'Coletar leads com material gratuito' },
  { id: 'vsl', label: 'Vendas - VSL', desc: 'Vídeo com seções de conversão' },
  { id: 'carta', label: 'Vendas - Carta', desc: 'Long copy persuasivo' },
  { id: 'aplicacao', label: 'Aplicação', desc: 'Filtrar e qualificar leads' },
  { id: 'obrigado', label: 'Obrigado', desc: 'Pós-preenchimento ou pós-compra' },
] as const

const SECTION_BLOCKS = [
  'Headline',
  'Pré-headline',
  'Credenciais',
  'Seletividade',
  'Critérios',
  'Como funciona',
  'Para quem é',
  'Urgência',
  'Formulário',
  'Próxima etapa',
  'Rodapé de confiança',
  'Seção personalizada',
]

export default function Ativos() {
  const [sub, setSub] = useState<'ecossistema' | 'paginas' | 'videos' | 'academy'>('ecossistema')
  const tabs = [
    { id: 'ecossistema', label: 'Ecossistema', icon: Boxes },
    { id: 'paginas', label: 'Gerador de Páginas', icon: FileCode },
    { id: 'videos', label: 'Roteiros de Vídeo', icon: Video },
    { id: 'academy', label: 'Academy', icon: RefreshCw },
  ] as const
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 4 — Ativos"
        description="Transforme a estratégia do Módulo 3 em páginas e roteiros executáveis."
        icon={<Boxes className="w-5 h-5" />}
        accent="#22D3EE"
      />
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0e0e15] rounded-xl border border-white/5">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = sub === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id as typeof sub)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-[#22D3EE] text-black' : 'text-[#9494A8] hover:text-white hover:bg-white/5'}`}
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
      {sub === 'academy' && (
        <AcademyPanel
          moduleTitle="Ativos"
          lessons={[
            { title: 'Ativos do ecossistema', duration: '8 min' },
            { title: 'Páginas customizadas', duration: '12 min' },
            { title: 'Vídeos customizados', duration: '10 min' },
            { title: 'Exportação para Elementor', duration: '7 min' },
          ]}
        />
      )}
    </div>
  )
}

function EcossistemaPanel() {
  const { ecosystem, funnelPlans, pageProjects, savePageProject, videoScripts } = usePlatform()
  if (!ecosystem || ecosystem.status !== 'aprovado') {
    return (
      <EmptyState
        icon={<Boxes className="w-6 h-6" />}
        title="Nenhum ecossistema aprovado"
        description="Aprove um ecossistema no Módulo 3 para liberar os ativos organizados por funil."
      />
    )
  }
  return (
    <div className="space-y-3">
      {funnelPlans.map((p, i) => {
        const assets = p.assets
        return (
          <div key={i} className="rounded-2xl bg-[#14141C] border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                {i + 1}. {assets.length} ativo(s)
              </h4>
              <Badge className="bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30 text-[10px]">
                Funil #{p.order}
              </Badge>
            </div>
            <p className="text-[11px] text-[#9494A8]">{p.analysis}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {assets.map((a, j) => (
                <div key={j} className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{a.type}</span>
                    <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
                      {a.recommended}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-[#9494A8] mb-2">{a.rationale}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-[10px] h-7 gap-1"
                    onClick={() => toast.success(`Gerando ${a.type}…`)}
                  >
                    Gerar/regenerar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PaginasPanel() {
  const { brandProfile, pageProjects, savePageProject } = usePlatform()
  const { generate } = useAIGeneration()
  const [type, setType] = useState<PageProject['type']>('captura')
  const [stage, setStage] = useState<FunnelStage>('topo')
  const [objective, setObjective] = useState('Capturar leads')
  const [voice, setVoice] = useState(brandProfile.base.voice || 'Direto e autoritativo')
  const [accent, setAccent] = useState('#7C5CFC')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<PageProject | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'pagina',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1600,
    )
    const sections: PageSection[] = SECTION_BLOCKS.slice(0, 6).map((s, i) => ({
      id: uid('sec'),
      sectionType: s,
      position: i,
      content: pageContent(s, type, brandProfile.base),
    }))
    const proj: PageProject = {
      id: uid('page'),
      type,
      stage,
      objective,
      voice,
      accent,
      sections,
      status: 'gerado',
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    savePageProject(proj)
    setCurrent(proj)
    setLoading(false)
    setProgress(0)
    toast.success('Página gerada!')
  }

  const exportHTML = () => {
    if (!current) return
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${current.objective}</title></head><body style="background:${current.accent}10;font-family:Inter,sans-serif;color:#111;max-width:680px;margin:auto;padding:24px">${current.sections.map((s) => `<section style="margin-bottom:24px"><h3 style="color:${current.accent}">${s.sectionType}</h3><p>${s.content}</p></section>`).join('')}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pagina-elementor.html'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('HTML para Elementor exportado!')
  }

  const copyDoc = () => {
    if (!current) return
    const doc = current.sections.map((s) => `## ${s.sectionType}\n${s.content}`).join('\n\n')
    navigator.clipboard.writeText(doc)
    toast.success('Documento de copy copiado!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
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
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Etapa do funil">
              <select
                className={inputClass}
                value={stage}
                onChange={(e) => setStage(e.target.value as FunnelStage)}
              >
                <option value="topo">Topo - Atração</option>
                <option value="meio">Meio - Relacionamento</option>
                <option value="fundo">Fundo - Conversão</option>
              </select>
            </Field>
            <Field label="Objetivo">
              <input
                className={inputClass}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tom">
              <input
                className={inputClass}
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              />
            </Field>
            <Field label="Cor de destaque">
              <input
                type="color"
                className="w-full h-9 bg-[#1C1C27] border border-white/10 rounded-xl"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </Field>
          </div>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            label="Gerar todas as seções"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Páginas salvas ({pageProjects.length})
          </p>
          {pageProjects.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-[#14141C] border border-white/5 p-3 cursor-pointer hover:border-[#7C5CFC]/40"
              onClick={() => setCurrent(p)}
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
      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {PAGE_TYPES.find((t) => t.id === current.type)?.label}
              </h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                v{current.contextVersion}
              </Badge>
            </div>
            <p className="text-[10px] text-[#9494A8]">
              {current.sections.filter((s) => s.content).length}/{current.sections.length} seções
              preenchidas
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {current.sections.map((s) => (
                <div key={s.id} className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-[#7C5CFC]">
                      {s.sectionType}
                    </span>
                    <button
                      onClick={() => {
                        const sec = current.sections.filter((x) => x.id !== s.id)
                        const u = { ...current, sections: sec }
                        setCurrent(u)
                        savePageProject(u)
                      }}
                      className="text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none resize-none"
                    rows={3}
                    value={s.content}
                    onChange={(e) => {
                      const u = {
                        ...current,
                        sections: current.sections.map((x) =>
                          x.id === s.id ? { ...x, content: e.target.value } : x,
                        ),
                      }
                      setCurrent(u)
                      savePageProject(u)
                    }}
                  />
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-dashed border-white/20 text-[11px] w-full gap-1"
              onClick={() => {
                const u = {
                  ...current,
                  sections: [
                    ...current.sections,
                    {
                      id: uid('sec'),
                      sectionType: 'Seção personalizada',
                      position: current.sections.length,
                      content: '',
                    },
                  ],
                }
                setCurrent(u)
                savePageProject(u)
              }}
            >
              <Plus className="w-3 h-3" /> Adicionar bloco
            </Button>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5 flex-1"
                onClick={copyDoc}
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5 flex-1"
                onClick={exportHTML}
              >
                <Download className="w-3.5 h-3.5" /> HTML
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<FileCode className="w-6 h-6" />}
            title="Nenhuma página"
            description="Gere páginas de Captura, VSL, Carta, Aplicação e Obrigado com seções editáveis e exportação HTML/DOCX."
          />
        )}
      </div>
    </div>
  )
}

function pageContent(sectionType: string, type: PageProject['type'], base: any): string {
  const map: Record<string, string> = {
    Headline: `Descubra como ${base.result || 'alcançar o resultado'} mesmo que ${base.audience || 'você'} esteja começando.`,
    'Pré-headline': `Para ${base.audience || 'profissionais'} que querem ${base.result || 'resultado'}.`,
    Credenciais: `${base.differential || 'Método validado'} • ${base.niche || 'Especialista'} com cases reais.`,
    Seletividade: `Esta página é para quem: já tentou ${base.niche || 'o método'} e falhou; está disposto a executar; quer resultado previsível.`,
    Critérios: `Não é para quem: busca mágica; não tem tempo; quer atalho sem método.`,
    'Como funciona': `1. Diagnóstico • 2. Plano • 3. Execução • 4. Resultado.`,
    'Para quem é': `${base.audience || 'Profissionais'} que valorizam ${base.result || 'transformação'}.`,
    Urgência: `Vagas limitadas para garantir atendimento individual.`,
    Formulário: `Nome • E-mail • WhatsApp • Aplicação.`,
    'Próxima etapa': `Após enviar, você recebe o diagnóstico em até 24h.`,
    'Rodapé de confiança': `© ${new Date().getFullYear()} • Política de Privacidade • Termos`,
    'Seção personalizada': `Conteúdo personalizado da seção.`,
  }
  return map[sectionType] || ''
}

function VideosPanel() {
  const { brandProfile, videoScripts, saveVideoScript } = usePlatform()
  const { generate } = useAIGeneration()
  const [method, setMethod] = useState<VideoScriptMethod>('vsl_benson')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<VideoScript | null>(null)

  const methods = [
    {
      id: 'vsl_benson',
      label: 'VSL - Jon Benson',
      duration: '15-60 min',
      structure: '9 blocos: interrupção, falsas soluções, mecanismo, valor, urgência e CTA',
    },
    {
      id: 'nissin_miojo',
      label: 'Nissin Miojo',
      duration: '8-10 min',
      structure: '5 partes: autoridade, problema/mito, objeções, CTA e encerramento',
    },
    {
      id: 'aula_vendas',
      label: 'Aula de Vendas',
      duration: '20 min',
      structure: '8 blocos: framework, epifania, prova de conceito e oferta natural',
    },
  ] as const

  const commonFields = [
    { key: 'servico', label: 'Serviço/oferta' },
    { key: 'ticket', label: 'Ticket' },
    { key: 'persona', label: 'Persona' },
    { key: 'dor', label: 'Dor emocional' },
    { key: 'resultado', label: 'Resultado' },
    { key: 'diferencial', label: 'Diferencial' },
    { key: 'cta', label: 'CTA' },
  ]
  const specificFields: Record<VideoScriptMethod, { key: string; label: string }[]> = {
    vsl_benson: [
      { key: 'solucoes_falsas', label: 'Soluções falsas' },
      { key: 'mecanismo_unico', label: 'Mecanismo único' },
      { key: 'garantia', label: 'Garantia' },
      { key: 'urgencia_real', label: 'Urgência real' },
      { key: 'duracao_desejada', label: 'Duração desejada' },
    ],
    nissin_miojo: [
      { key: 'mito_nicho', label: 'Mito do nicho' },
      { key: 'objecoes', label: '2-3 objeções' },
      { key: 'tom', label: 'Tom' },
      { key: 'local_uso', label: 'Local de uso' },
    ],
    aula_vendas: [
      { key: 'crenca_errada', label: 'Crença errada' },
      { key: 'pilares', label: 'Pilares' },
      { key: 'nome_framework', label: 'Nome do framework' },
      { key: 'objecoes', label: 'Objeções' },
    ],
  }

  const handleGenerate = async () => {
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'roteiro_video',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1600,
    )
    const blockDefs: Record<VideoScriptMethod, string[]> = {
      vsl_benson: [
        'Interrupção',
        'Falsas soluções',
        'Mecanismo',
        'Valor',
        'Urgência',
        'CTA',
        'Stack',
        'Garantia',
        'Fechamento',
      ],
      nissin_miojo: ['Autoridade', 'Problema/Mito', 'Objeções', 'CTA', 'Encerramento'],
      aula_vendas: [
        'Framework',
        'Epifania',
        'Prova de conceito',
        'Oferta natural',
        'Pilares 1',
        'Pilares 2',
        'Objeções',
        'CTA',
      ],
    }
    const blocks: ContentBlock[] = blockDefs[method].map((b, i) =>
      newBlock(b, i, scriptContent(b, inputs, brandProfile.base)),
    )
    const script: VideoScript = {
      id: uid('vs'),
      method,
      inputs,
      blocks,
      status: 'gerado',
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveVideoScript(script)
    setCurrent(script)
    setLoading(false)
    setProgress(0)
    toast.success(`Roteiro ${methods.find((m) => m.id === method)?.label} gerado!`)
  }

  const setVal = (k: string, v: string) => setInputs({ ...inputs, [k]: v })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Roteiros de Vídeo</h3>
          <Field label="Modelo">
            <select
              className={inputClass}
              value={method}
              onChange={(e) => setMethod(e.target.value as VideoScriptMethod)}
            >
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.duration})
                </option>
              ))}
            </select>
          </Field>
          <p className="text-[11px] text-[#9494A8]">
            {methods.find((m) => m.id === method)?.structure}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {commonFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  className={inputClass}
                  value={inputs[f.key] || ''}
                  onChange={(e) => setVal(f.key, e.target.value)}
                />
              </Field>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {specificFields[method].map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  className={inputClass}
                  value={inputs[f.key] || ''}
                  onChange={(e) => setVal(f.key, e.target.value)}
                />
              </Field>
            ))}
          </div>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            label="Gerar roteiro"
          />
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
                  {methods.find((m) => m.id === s.method)?.label}
                </span>
                <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                  {s.blocks.length} blocos
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
              <h3 className="text-sm font-bold text-white">
                {methods.find((m) => m.id === current.method)?.label}
              </h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                v{current.contextVersion}
              </Badge>
            </div>
            <BlockEditor
              blocks={current.blocks}
              onChange={(blocks) => {
                const u = { ...current, blocks, updatedAt: new Date().toISOString() }
                setCurrent(u)
                saveVideoScript(u)
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5 w-full"
              onClick={() => {
                navigator.clipboard.writeText(
                  current.blocks.map((b) => `[${b.blockType}]\n${b.text}`).join('\n\n'),
                )
                toast.success('Roteiro copiado!')
              }}
            >
              <Copy className="w-3.5 h-3.5" /> Copiar roteiro
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={<Video className="w-6 h-6" />}
            title="Nenhum roteiro"
            description="VSL Jon Benson, Nissin Miojo e Aula de Vendas. Campos específicos por método."
          />
        )}
      </div>
    </div>
  )
}

function newBlock(blockType: string, position: number, text: string): ContentBlock {
  return { id: uid('blk'), blockType, position, text, version: 1 }
}

function scriptContent(blockType: string, inputs: Record<string, string>, base: any): string {
  const servico = inputs.servico || base.service || 'seu serviço'
  const ticket = inputs.ticket || 'R$ 497'
  const persona = inputs.persona || base.audience || 'seu público'
  const dor = inputs.dor || 'a dor emocional'
  const resultado = inputs.resultado || base.result || 'o resultado'
  const cta = inputs.cta || 'Comprar agora'
  const map: Record<string, string> = {
    Interrupção: `Se você é ${persona} e ainda sofre com ${dor}, pare tudo e escute.`,
    'Falsas soluções': `Talvez você já tentou ${inputs.solucoes_falsas || 'cursos genéricos, mentoria de grupo, ferramentas mágicas'}. Nada disso resolve a raiz.`,
    Mecanismo: `Nosso método único: ${inputs.mecanismo_unico || base.differential || 'um sistema passo a passo'} que ataca a causa real.`,
    Valor: `Isso vale ${ticket} — mas você também recebe bônus que multiplicam o ROI.`,
    Urgência: `${inputs.urgencia_real || 'Vagas encerram nesta semana.'}`,
    CTA: `${cta}: clique no botão e garanta sua vaga.`,
    Stack: `Inclui: método completo, bônus, comunidade e suporte.`,
    Garantia: `${inputs.garantia || '7 dias de garantia incondicional.'}`,
    Fechamento: `Você tem duas escolhas: continuar com ${dor} ou garantir ${resultado}.`,
    Autoridade: `Quem fala é referência em ${base.niche || 'seu nicho'}.`,
    'Problema/Mito': `O mito: ${inputs.mito_nicho || 'você precisa de mais seguidores'}. A verdade é outra.`,
    Objeções: `Objeções: ${inputs.objecoes || 'é caro, não tenho tempo, já tentei'}. Resposta uma a uma.`,
    Encerramento: `Decida agora. ${cta}.`,
    Framework: `Apresente o framework: ${inputs.nome_framework || 'Método X'}.`,
    Epifania: `O momento "aha": quando ${persona} entende a virada.`,
    'Prova de conceito': `Prova real de que ${resultado} é possível.`,
    'Oferta natural': `A oferta surge naturalmente da compreensão.`,
    'Pilares 1': `Pilar 1: ${inputs.pilares || 'Clareza'}.`,
    'Pilares 2': `Pilar 2: Execução.`,
  }
  return map[blockType] || `Conteúdo do bloco ${blockType}.`
}
