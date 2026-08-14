import React, { useState } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import {
  ModuleHeader,
  EmptyState,
  AcademyPanel,
  Field,
  inputClass,
  GenerateButton,
  BlockEditor,
  SavedItemCard,
} from '@/components/marketing/Shared'
import { ContentItem, ContentBlock, IdeaItem, FunnelStage, Awareness } from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PenSquare,
  Layers,
  Film,
  Sparkles,
  Search,
  CalendarDays,
  Plus,
  Trash2,
  Download,
  Wand2,
  Eye,
  Users,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStudio } from '@/context/StudioContext'
import { useNavigate } from 'react-router-dom'

const STORY_ARCS = [
  {
    id: 'levantada',
    name: 'Levantada de Mão',
    blocks: ['Enquete', 'Mini-conteúdo', 'Prova', 'CTA'],
    use: 'Qualificar dor no topo',
  },
  {
    id: 'dor_solucao_oferta',
    name: 'Dor > Solução > Oferta',
    blocks: ['Tensão', 'Mini-conteúdo', 'Oferta'],
    use: 'Sequência rápida de venda',
  },
  {
    id: 'quebra_objecao',
    name: 'Quebra de Objeção',
    blocks: ['Gancho', 'Objeção', 'Virada', 'Prova', 'CTA'],
    use: 'Destravar decisão',
  },
  {
    id: 'prova_social',
    name: 'Prova Social',
    blocks: ['Contexto', 'Ação', 'Resultado', 'CTA'],
    use: 'Contar caso real',
  },
  {
    id: 'bastidor',
    name: 'Bastidor que Vende',
    blocks: ['Bastidor', 'Gancho', 'Mini-licão', 'CTA'],
    use: 'Autoridade com intimidade',
  },
  {
    id: 'relampago',
    name: 'Oferta Relâmpago',
    blocks: ['Gancho', 'Oferta', 'Prova', 'CTA'],
    use: 'Promoção de curta duração',
  },
  {
    id: 'enxuto',
    name: 'Arco Enxuto',
    blocks: ['Gancho', 'Tensão', 'Interação', 'CTA'],
    use: 'Rotina de topo',
  },
  {
    id: 'completo',
    name: 'Arco Completo',
    blocks: ['Gancho', 'Tensão', 'Empatia', 'Virada', 'Prova', 'Interação', 'CTA'],
    use: 'Venda/lançamento',
  },
]

const REEL_BLOCKS = [
  'Gancho visual',
  'Gancho verbal',
  'Setup',
  'Desenvolvimento',
  'Insight',
  'Payoff',
  'Legenda',
  'Hashtags',
]

const COPY_RESOURCES = [
  'Afirmação',
  'Promessa',
  'Prova',
  'Problema',
  'Agitação',
  'Causa',
  'Solução',
  'História',
  'CTA',
  'Urgência',
  'Curiosidade',
  'Contraintuitivo',
]

export default function Conteudo() {
  const [sub, setSub] = useState<
    | 'posts'
    | 'stories'
    | 'reels'
    | 'carrosseis'
    | 'ideias'
    | 'espionagem'
    | 'calendario'
    | 'academy'
  >('posts')
  const subTabs = [
    { id: 'posts', label: 'Posts', icon: PenSquare },
    { id: 'stories', label: 'Stories (FIO)', icon: Layers },
    { id: 'reels', label: 'Reels', icon: Film },
    { id: 'carrosseis', label: 'Carrosséis', icon: Layers },
    { id: 'ideias', label: 'Banco de ideias', icon: Lightbulb },
    { id: 'espionagem', label: 'Espionagem', icon: Search },
    { id: 'calendario', label: 'Calendário', icon: CalendarDays },
    { id: 'academy', label: 'Academy', icon: Sparkles },
  ] as const

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 2 — Conteúdo"
        description="Transforme o Brand OS em peças sociais, calendários, banco de ideias e inteligência competitiva."
        icon={<PenSquare className="w-5 h-5" />}
        accent="#22D3EE"
      />
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0e0e15] rounded-xl border border-white/5">
        {subTabs.map((t) => {
          const Icon = t.icon
          const active = sub === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id as typeof sub)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-[#22D3EE] text-black shadow-lg'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {sub === 'posts' && <PostsPanel />}
      {sub === 'stories' && <StoriesPanel />}
      {sub === 'reels' && <ReelsPanel />}
      {sub === 'carrosseis' && <CarrosseisPanel />}
      {sub === 'ideias' && <IdeasPanel />}
      {sub === 'espionagem' && <EspionagemPanel />}
      {sub === 'calendario' && <CalendarioPanel />}
      {sub === 'academy' && (
        <AcademyPanel
          moduleTitle="Conteúdo"
          lessons={[
            { title: 'Posts estáticos que convertem', duration: '8 min' },
            { title: 'Stories com FIO e arcos narrativos', duration: '12 min' },
            { title: 'Reels: estrutura por blocos', duration: '10 min' },
            { title: 'Gravação no Estúdio', duration: '15 min' },
            { title: 'Roteiros de carrossel', duration: '9 min' },
            { title: 'Artes de carrossel', duration: '11 min' },
            { title: 'Banco de ideias', duration: '6 min' },
            { title: 'Espionagem de conteúdos', duration: '10 min' },
            { title: 'Espionagem de perfis', duration: '10 min' },
          ]}
        />
      )}
    </div>
  )
}

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function newBlock(blockType: string, position: number, text = ''): ContentBlock {
  return { id: uid('blk'), blockType, position, text, version: 1 }
}

// ---------- Posts ----------
function PostsPanel() {
  const { brandProfile, contentItems, saveContentItem, deleteContentItem } = usePlatform()
  const { generate } = useAIGeneration()
  const [objective, setObjective] = useState<FunnelStage>('topo')
  const [awareness, setAwareness] = useState<Awareness>(3)
  const [cta, setCta] = useState('Comentar')
  const [theme, setTheme] = useState('')
  const [details, setDetails] = useState('')
  const [resources, setResources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)

  const posts = contentItems.filter((c) => c.type === 'post')

  const handleGenerate = async () => {
    if (!theme.trim()) {
      toast.error('Informe o tema do post.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'post_estatico',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1500,
    )
    const chosenResources = resources.length ? resources : ['IA decide']
    const blocks: ContentBlock[] = [
      newBlock(
        'Headline',
        0,
        `Você não precisa de mais ${theme.toLowerCase()}. Precisa de método.`,
      ),
      newBlock(
        'Corpo',
        1,
        `Se você é ${brandProfile.base.audience || 'criador'} e ainda ${theme.toLowerCase()} sem estratégia, está perdendo tempo.\n\nAqui vai o que realmente funciona: ${brandProfile.base.differential || 'foco em execução com método'}.\n\nRecursos usados: ${chosenResources.join(', ')}.`,
      ),
      newBlock('CTA', 2, `${cta}: comente "${cta.toUpperCase()}" e te envio o passo a passo.`),
    ]
    const item: ContentItem = {
      id: uid('post'),
      type: 'post',
      title: theme,
      blocks,
      funnelStage: objective,
      awareness,
      cta,
      status: 'gerado',
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveContentItem(item)
    setCurrent(item)
    setLoading(false)
    setProgress(0)
    toast.success('Post estático gerado!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Gerar post estático</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Objetivo">
              <select
                className={inputClass}
                value={objective}
                onChange={(e) => setObjective(e.target.value as FunnelStage)}
              >
                <option value="topo">Topo de funil</option>
                <option value="meio">Meio de funil</option>
                <option value="fundo">Fundo de funil</option>
              </select>
            </Field>
            <Field label="Consciência (1-5)">
              <select
                className={inputClass}
                value={awareness}
                onChange={(e) => setAwareness(Number(e.target.value) as Awareness)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="CTA">
            <select className={inputClass} value={cta} onChange={(e) => setCta(e.target.value)}>
              {['Comentar', 'Salvar', 'Compartilhar', 'Link na bio', 'Direct'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Tema" required>
            <input
              className={inputClass}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Erros ao criar conteúdo"
            />
          </Field>
          <Field label="Detalhes (opcional)">
            <textarea
              className={inputClass}
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Contexto adicional…"
            />
          </Field>
          <div>
            <p className="text-xs text-[#9494A8] mb-2">Recursos de copy</p>
            <div className="flex flex-wrap gap-1.5">
              {COPY_RESOURCES.map((r) => {
                const active = resources.includes(r)
                return (
                  <button
                    key={r}
                    onClick={() =>
                      setResources(active ? resources.filter((x) => x !== r) : [...resources, r])
                    }
                    className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${
                      active
                        ? 'bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/40'
                        : 'bg-[#1C1C27] text-[#9494A8] border-white/10 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          </div>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!theme.trim()}
            label="Gerar conteúdo completo"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase tracking-wider">
            Posts salvos ({posts.length})
          </p>
          {posts.length === 0 ? (
            <p className="text-xs text-[#9494A8]/60">Nenhum post salvo ainda.</p>
          ) : (
            posts.map((p) => (
              <SavedItemCard
                key={p.id}
                title={p.title}
                subtitle={`${p.funnelStage} • consciência ${p.awareness} • CTA: ${p.cta}`}
                status={p.status}
                date={p.createdAt}
                contextVersion={p.contextVersion}
                onClick={() => setCurrent(p)}
                actions={
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteContentItem(p.id)
                      if (current?.id === p.id) setCurrent(null)
                    }}
                    className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                }
              />
            ))
          )}
        </div>
      </div>

      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{current.title}</h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                Brand OS v{current.contextVersion}
              </Badge>
            </div>
            <BlockEditor
              blocks={current.blocks}
              onChange={(blocks) => {
                const u = { ...current, blocks, updatedAt: new Date().toISOString() }
                setCurrent(u)
                saveContentItem(u)
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(current.blocks.map((b) => b.text).join('\n\n'))
                toast.success('Copy copiada!')
              }}
            >
              <Download className="w-3.5 h-3.5" /> Copiar copy
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={<PenSquare className="w-6 h-6" />}
            title="Nenhum post selecionado"
            description="Configure os parâmetros e gere seu primeiro post estático com IA."
            example="Tema: 3 erros que travam seu crescimento • CTA: Comentar"
          />
        )}
      </div>
    </div>
  )
}

// ---------- Stories (FIO) ----------
function StoriesPanel() {
  const { brandProfile, contentItems, saveContentItem, deleteContentItem } = usePlatform()
  const { generate } = useAIGeneration()
  const [objective, setObjective] = useState<FunnelStage>('topo')
  const [awareness, setAwareness] = useState<Awareness>(3)
  const [cta, setCta] = useState('Direct')
  const [theme, setTheme] = useState('')
  const [arc, setArc] = useState('auto')
  const [delivery, setDelivery] = useState('misto')
  const [mode2, setMode2] = useState<'sequencia' | 'semana'>('sequencia')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)

  const stories = contentItems.filter((c) => c.type === 'story')

  const handleGenerate = async () => {
    if (!theme.trim()) {
      toast.error('Informe o tema.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'story_fio',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1500,
    )
    const chosenArc =
      arc === 'auto' ? STORY_ARCS[0] : STORY_ARCS.find((a) => a.id === arc) || STORY_ARCS[0]
    const blocks: ContentBlock[] = chosenArc.blocks.map((b, i) =>
      newBlock(
        b,
        i,
        `[${b}] ${theme} — ${brandProfile.base.differential || 'entrega de valor'} (entrega: ${delivery})`,
      ),
    )
    blocks.push(newBlock('CTA', blocks.length, cta))
    const item: ContentItem = {
      id: uid('story'),
      type: 'story',
      title: `FIO: ${theme}`,
      blocks,
      funnelStage: objective,
      awareness,
      cta,
      status: 'gerado',
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveContentItem(item)
    setCurrent(item)
    setLoading(false)
    setProgress(0)
    toast.success(`FIO gerado com arco "${chosenArc.name}"!`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Criar FIO (Stories)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modo">
              <select
                className={inputClass}
                value={mode2}
                onChange={(e) => setMode2(e.target.value as 'sequencia' | 'semana')}
              >
                <option value="sequencia">Sequência</option>
                <option value="semana">Semana</option>
              </select>
            </Field>
            <Field label="Entrega">
              <select
                className={inputClass}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              >
                <option value="texto">Texto</option>
                <option value="falado">Falado</option>
                <option value="misto">Misto</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Objetivo">
              <select
                className={inputClass}
                value={objective}
                onChange={(e) => setObjective(e.target.value as FunnelStage)}
              >
                <option value="topo">Topo</option>
                <option value="meio">Meio</option>
                <option value="fundo">Fundo</option>
              </select>
            </Field>
            <Field label="Consciência">
              <select
                className={inputClass}
                value={awareness}
                onChange={(e) => setAwareness(Number(e.target.value) as Awareness)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Tema" required>
            <input
              className={inputClass}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Mitos sobre tráfego pago"
            />
          </Field>
          <Field label="CTA">
            <select className={inputClass} value={cta} onChange={(e) => setCta(e.target.value)}>
              {['Direct', 'Link', 'Enquete', 'Responder'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Arco narrativo">
            <select className={inputClass} value={arc} onChange={(e) => setArc(e.target.value)}>
              <option value="auto">IA decide automaticamente</option>
              {STORY_ARCS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!theme.trim()}
            label="Gerar FIO"
          />
        </div>
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4">
          <p className="text-xs font-semibold text-[#9494A8] uppercase mb-2">Arcos disponíveis</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STORY_ARCS.map((a) => (
              <div key={a.id} className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
                <p className="text-xs font-bold text-white">{a.name}</p>
                <p className="text-[10px] text-[#9494A8]">{a.use}</p>
                <p className="text-[10px] text-[#22D3EE] mt-1">{a.blocks.join(' → ')}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase tracking-wider">
            FIOs salvos ({stories.length})
          </p>
          {stories.map((s) => (
            <SavedItemCard
              key={s.id}
              title={s.title}
              subtitle={`${s.funnelStage} • ${s.cta}`}
              status={s.status}
              date={s.createdAt}
              contextVersion={s.contextVersion}
              onClick={() => setCurrent(s)}
              actions={
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteContentItem(s.id)
                  }}
                  className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              }
            />
          ))}
        </div>
      </div>
      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{current.title}</h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                v{current.contextVersion}
              </Badge>
            </div>
            <BlockEditor
              blocks={current.blocks}
              onChange={(blocks) => {
                const u = { ...current, blocks, updatedAt: new Date().toISOString() }
                setCurrent(u)
                saveContentItem(u)
              }}
            />
          </div>
        ) : (
          <EmptyState
            icon={<Layers className="w-6 h-6" />}
            title="Nenhum FIO selecionado"
            description="Crie sequências de stories com arcos narrativos orientados a conversão."
          />
        )}
      </div>
    </div>
  )
}

// ---------- Reels ----------
function ReelsPanel() {
  const { contentItems, saveContentItem, deleteContentItem } = usePlatform()
  const { generate } = useAIGeneration()
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)
  const navigate = useNavigate()
  const { createProject } = useStudio()

  const reels = contentItems.filter((c) => c.type === 'reel')

  const handleGenerate = async () => {
    if (!theme.trim()) {
      toast.error('Informe o tema.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'reel',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1600,
    )
    const blocks: ContentBlock[] = REEL_BLOCKS.map((b, i) => newBlock(b, i, reelContent(b, theme)))
    const item: ContentItem = {
      id: uid('reel'),
      type: 'reel',
      title: `Reel: ${theme}`,
      blocks,
      funnelStage: 'topo',
      awareness: 2,
      cta: 'Salvar',
      status: 'gerado',
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveContentItem(item)
    setCurrent(item)
    setLoading(false)
    setProgress(0)
    toast.success('Reel gerado!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Estúdio de Reels</h3>
          <Field label="Tema do Reel" required>
            <input
              className={inputClass}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: 3 segundos que salvam seu vídeo"
            />
          </Field>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!theme.trim()}
            label="Gerar roteiro por blocos"
          />
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5"
              onClick={() => navigate('/gravadora')}
            >
              <Film className="w-3.5 h-3.5" /> Gravar no estúdio
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5"
              onClick={() => {
                const p = createProject({ title: `Reel: ${theme || 'Sem tema'}`, type: 'reel' })
                navigate(`/editor/${p.id}`)
              }}
            >
              <Wand2 className="w-3.5 h-3.5" /> Editar
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Reels salvos ({reels.length})
          </p>
          {reels.map((r) => (
            <SavedItemCard
              key={r.id}
              title={r.title}
              subtitle={`${r.blocks.length} blocos`}
              status={r.status}
              date={r.createdAt}
              contextVersion={r.contextVersion}
              onClick={() => setCurrent(r)}
              actions={
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteContentItem(r.id)
                  }}
                  className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              }
            />
          ))}
        </div>
      </div>
      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{current.title}</h3>
              <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                v{current.contextVersion}
              </Badge>
            </div>
            <BlockEditor
              blocks={current.blocks}
              onChange={(blocks) => {
                const u = { ...current, blocks, updatedAt: new Date().toISOString() }
                setCurrent(u)
                saveContentItem(u)
              }}
              onAdjust={() =>
                toast.info('Bloco ajustado individualmente — os demais permanecem intactos.')
              }
            />
          </div>
        ) : (
          <EmptyState
            icon={<Film className="w-6 h-6" />}
            title="Nenhum Reel selecionado"
            description="Estrutura editável por blocos: gancho visual, gancho verbal, setup, desenvolvimento, insight, payoff, legenda e hashtags."
          />
        )}
      </div>
    </div>
  )
}

function reelContent(blockType: string, theme: string): string {
  const map: Record<string, string> = {
    'Gancho visual': `Primeiro frame: texto grande "${theme.toUpperCase()}" com movimento brusco de câmera.`,
    'Gancho verbal': `"Ninguém te conta isso sobre ${theme.toLowerCase()}, mas…"`,
    Setup: `Contexto em 3s: por que isso importa agora.`,
    Desenvolvimento: `Explique o ponto central com 1 exemplo concreto.`,
    Insight: `A virada: o que muda quando você aplica isso.`,
    Payoff: `Resumo + gancho de retenção ("calma, ainda tem mais").`,
    Legenda: `Legenda completa sobre ${theme}. Comente "REEL" para o material completo.`,
    Hashtags: `#${theme.split(' ')[0].toLowerCase()} #marketing #conteudo #lumen`,
  }
  return map[blockType] || ''
}

// ---------- Carrosséis (workflow completo) ----------
function CarrosseisPanel() {
  const { brandProfile, contentItems, saveContentItem, deleteContentItem } = usePlatform()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()
  const [briefing, setBriefing] = useState('')
  const [hookCategory, setHookCategory] = useState('pergunta')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)

  const carousels = contentItems.filter((c) => c.type === 'carrossel')
  const CARD_ROLES = ['Capa', 'Dor', 'Re-gancho', 'Virada', 'Credencial', 'Conteúdo', 'CTA']

  const handleGenerate = async () => {
    if (!briefing.trim()) {
      toast.error('Informe o briefing.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'carrossel',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1700,
    )
    const hookTexts: Record<string, string> = {
      pergunta: `Por que ${briefing.toLowerCase()} ainda trava seu crescimento?`,
      polemica: `O mercado mente sobre ${briefing.toLowerCase()}.`,
      dor: `Cansado de ${briefing.toLowerCase()} sem resultado?`,
      promessa: `Em 5 slides você vai dominar ${briefing.toLowerCase()}.`,
      dado: `87% falham em ${briefing.toLowerCase()}. Veja o porquê.`,
    }
    const blocks: ContentBlock[] = [
      newBlock('Capa', 0, hookTexts[hookCategory]),
      ...CARD_ROLES.slice(1).map((r, i) =>
        newBlock(
          r,
          i + 1,
          `[${r}] ${briefing} — ${brandProfile.base.differential || 'entrega de valor'}`,
        ),
      ),
    ]
    const item: ContentItem = {
      id: uid('car'),
      type: 'carrossel',
      title: `Carrossel: ${briefing}`,
      blocks,
      funnelStage: 'topo',
      awareness: 2,
      cta: 'Salvar',
      status: 'rascunho',
      contextVersion: res.contextVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveContentItem(item)
    setCurrent(item)
    setLoading(false)
    setProgress(0)
    toast.success('Carrossel gerado! Copy pronta para aprovação.')
  }

  const approveCopy = () => {
    if (!current) return
    const u = { ...current, status: 'aprovado' as const, updatedAt: new Date().toISOString() }
    setCurrent(u)
    saveContentItem(u)
    toast.success('Copy aprovada! Pronta para arte e legenda.')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Workflow de Carrossel</h3>
          <div className="flex items-center gap-2 text-[10px]">
            {[
              'Briefing',
              'Hooks de capa',
              'Copy card a card',
              'Aprovar',
              'Artes PNG/ZIP',
              'Legenda',
            ].map((s, i) => (
              <React.Fragment key={s}>
                <span
                  className={`px-2 py-0.5 rounded-full ${current ? (i <= 3 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-[#9494A8]') : 'bg-white/5 text-[#9494A8]'}`}
                >
                  {s}
                </span>
                {i < 5 && <ChevronRight className="w-3 h-3 text-[#9494A8]/40" />}
              </React.Fragment>
            ))}
          </div>
          <Field label="Briefing" required>
            <textarea
              className={inputClass}
              rows={2}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Ex: 5 erros de copy que matam o engajamento"
            />
          </Field>
          <Field label="Categoria do hook de capa">
            <select
              className={inputClass}
              value={hookCategory}
              onChange={(e) => setHookCategory(e.target.value)}
            >
              {['pergunta', 'polemica', 'dor', 'promessa', 'dado'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!briefing.trim()}
            label="Gerar copy card a card"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Carrosséis salvos ({carousels.length})
          </p>
          {carousels.map((c) => (
            <SavedItemCard
              key={c.id}
              title={c.title}
              subtitle={`${c.blocks.length} cards • ${c.status}`}
              status={c.status}
              date={c.createdAt}
              contextVersion={c.contextVersion}
              onClick={() => setCurrent(c)}
              actions={
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteContentItem(c.id)
                  }}
                  className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              }
            />
          ))}
        </div>
      </div>
      <div>
        {current ? (
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{current.title}</h3>
              <Badge
                className={
                  current.status === 'aprovado'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }
              >
                {current.status}
              </Badge>
            </div>
            <BlockEditor
              blocks={current.blocks}
              onChange={(blocks) => {
                const u = { ...current, blocks, updatedAt: new Date().toISOString() }
                setCurrent(u)
                saveContentItem(u)
              }}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                onClick={approveCopy}
                disabled={current.status === 'aprovado'}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
              >
                <CheckIcon /> Aprovar copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5"
                onClick={() => {
                  const txt = current.blocks
                    .map((b, i) => `# Card ${i + 1} — ${b.blockType}\n${b.text}`)
                    .join('\n\n')
                  const blob = new Blob([txt], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'carrossel-copy.txt'
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Copy em TXT baixada!')
                }}
              >
                <Download className="w-3.5 h-3.5" /> Baixar TXT
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5"
                onClick={() => toast.success('Artes PNG geradas e empacotadas em ZIP!')}
              >
                <Layers className="w-3.5 h-3.5" /> PNG/ZIP
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5"
                onClick={() => toast.success('Legenda gerada com IA!')}
              >
                <Sparkles className="w-3.5 h-3.5" /> Legenda IA
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5"
                onClick={() => navigate('/carrossel')}
              >
                <Wand2 className="w-3.5 h-3.5" /> Editor visual
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Layers className="w-6 h-6" />}
            title="Nenhum carrossel"
            description="Workflow completo: briefing → hooks → copy card a card → aprovação → artes → legenda."
          />
        )}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

// ---------- Banco de ideias ----------
function IdeasPanel() {
  const { brandProfile, ideas, saveIdeas } = usePlatform()
  const { generate } = useAIGeneration()
  const [pillar, setPillar] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const navigate = useNavigate()

  const pillars = brandProfile.assets.find((a) => a.type === 'pilares_de_conteudo')?.content || ''
  const pillarList = ['Educação', 'Bastidores', 'Prova', 'Conexão', 'Conversão']

  const handleGenerate = async () => {
    if (!pillar.trim()) {
      toast.error('Selecione um pilar.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'ideias',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1200,
    )
    const newIdeas: IdeaItem[] = Array.from({ length: 10 }).map((_, i) => ({
      id: uid('idea'),
      pillar,
      title: `${pillar} #${i + 1}: ideia ${['original', 'com prova', 'polêmica', 'didática', 'bastidor', 'curiosidade', 'antes/depois', 'mito', 'checklist', 'CTA'][i]}`,
      angle: `Ângulo baseado em ${brandProfile.base.differential || 'seu diferencial'}`,
      transformed: false,
      createdAt: new Date().toISOString(),
    }))
    saveIdeas(newIdeas)
    setLoading(false)
    setProgress(0)
    toast.success(`10 ideias geradas para o pilar "${pillar}"!`)
  }

  const transform = (idea: IdeaItem, format: 'post' | 'story' | 'reel' | 'carrossel') => {
    toast.success(`Ideia transformada em ${format}! O contexto do Brand OS já está carregado.`)
    if (format === 'reel') navigate('/modulo-2')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Banco de Ideias</h3>
        <Field
          label="Pilar de conteúdo"
          hint={
            pillars
              ? `Do Brand OS: ${pillars.slice(0, 120)}`
              : 'Selecione um pilar da arquitetura de marca'
          }
        >
          <select className={inputClass} value={pillar} onChange={(e) => setPillar(e.target.value)}>
            <option value="">Selecione…</option>
            {pillarList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <GenerateButton
          onClick={handleGenerate}
          loading={loading}
          progress={progress}
          progressLabel={progressLabel}
          disabled={!pillar}
          label="Gerar 10 ideias"
        />
      </div>
      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
                  {idea.pillar}
                </Badge>
                {idea.transformed && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Transformada
                  </Badge>
                )}
              </div>
              <h4 className="text-xs font-bold text-white">{idea.title}</h4>
              <p className="text-[11px] text-[#9494A8]">{idea.angle}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(['post', 'story', 'reel', 'carrossel'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => transform(idea, f)}
                    className="px-2 py-1 rounded-lg text-[10px] bg-[#1C1C27] text-[#9494A8] hover:text-white hover:bg-white/10 border border-white/5 capitalize"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Espionagem ----------
function EspionagemPanel() {
  const {
    capturedCreatives,
    profileCaptures,
    saveCapturedCreative,
    updateCapturedCreative,
    saveProfileCapture,
  } = usePlatform()
  const { generate } = useAIGeneration()
  const [tab, setTab] = useState<'posts' | 'perfis'>('posts')
  const [loading, setLoading] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const postsCaptured = capturedCreatives.length
  const profilesAnalyzed = profileCaptures.length

  const handleAnalyzePost = async (id: string) => {
    setLoading(true)
    await generate('analise_post', () => {}, 1000)
    updateCapturedCreative(id, {
      analysis: `Estrutura: gancho → problema → solução → prova → CTA. Padrão de alta retenção. Tom direto. Hook dominante: pergunta. Adaptável ao seu nicho mantendo o diferencial.`,
    })
    setLoading(false)
    toast.success('Análise estrutural gerada!')
  }

  const handleAnalyzeProfile = async (id: string) => {
    setLoading(true)
    await generate('relatorio_perfil', () => {}, 1200)
    const p = profileCaptures.find((x) => x.id === id)
    if (!p) return
    saveProfileCapture({
      ...p,
      report: {
        summary: `Perfil focado em conteúdo educacional de alta frequência. Posicionamento claro e nichado.`,
        socialSelling: `Abordagem: comentar referenciando dor específica + offer de diagnóstico gratuito.`,
        mix: [
          { type: 'Educativo', pct: 50 },
          { type: 'Prova', pct: 25 },
          { type: 'Bastidor', pct: 15 },
          { type: 'Oferta', pct: 10 },
        ],
        patterns: [
          'Postagem diária',
          'Hook sempre na primeira linha',
          'CTA de interação em 80% das peças',
        ],
        hooks: ['Pergunta provocativa', 'Dado surpreendente', 'Anti-recomendação'],
        ideas: [
          'Adaptar o formato lista para seu nicho',
          'Recriar o caso antes/depois com seu cliente',
          'Usar o mesmo padrão de hook com seu diferencial',
        ],
      },
    })
    setLoading(false)
    toast.success('Relatório estratégico gerado!')
  }

  const addManual = () => {
    if (!urlInput.trim()) return
    saveCapturedCreative({
      id: uid('cap'),
      source: 'instagram',
      sourceUrl: urlInput,
      author: '@capturado',
      mediaType: 'image',
      caption: 'Legenda capturada manualmente.',
      transcript: '',
      capturedAt: new Date().toISOString(),
      analysis: null,
    })
    setUrlInput('')
    toast.success('Post capturado!')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30">
          {postsCaptured} posts salvos
        </Badge>
        <Badge className="bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30">
          {profilesAnalyzed} perfis analisados
        </Badge>
        <span className="text-[10px] text-[#9494A8]">
          Limitação: carrosséis do Instagram capturam apenas a primeira imagem.
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setTab('posts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'posts' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
        >
          Espionagem de posts
        </button>
        <button
          onClick={() => setTab('perfis')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'perfis' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
        >
          Espionagem de perfis
        </button>
      </div>

      {tab === 'posts' ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Cole a URL do post (ou use a extensão)"
            />
            <Button size="sm" onClick={addManual} className="bg-[#7C5CFC] text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Capturar
            </Button>
          </div>
          {capturedCreatives.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="Nenhum post capturado"
              description="Capture posts do Instagram via extensão ou cole a URL manualmente. Transcrição automática para vídeos."
            />
          ) : (
            capturedCreatives.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                      {c.source}
                    </Badge>
                    <span className="text-xs font-semibold text-white">{c.author}</span>
                  </div>
                  <span className="text-[10px] text-[#9494A8]">
                    {new Date(c.capturedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{c.caption}</p>
                {c.transcript && (
                  <p className="text-[11px] text-[#9494A8] italic">
                    Transcrição: {c.transcript.slice(0, 100)}…
                  </p>
                )}
                {c.analysis && (
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300">
                    {c.analysis}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-[11px] gap-1.5"
                    onClick={() => handleAnalyzePost(c.id)}
                    disabled={loading}
                  >
                    <Eye className="w-3 h-3" /> {c.analysis ? 'Ver análise' : 'Analisar estrutura'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-[11px] gap-1.5"
                    onClick={() => toast.success('Ideia adaptada ao seu nicho!')}
                  >
                    <Sparkles className="w-3 h-3" /> Adaptar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {profileCaptures.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="Nenhum perfil analisado"
              description="Capture perfis do Instagram via extensão. Cada perfil gera relatório estratégico com social selling e 5 ideias adaptadas."
              action={
                <Button
                  size="sm"
                  onClick={() =>
                    saveProfileCapture({
                      id: uid('prof'),
                      handle: '@exemplo',
                      postsCount: 0,
                      snapshot: 'Snapshot público',
                      capturedAt: new Date().toISOString(),
                      report: null,
                    })
                  }
                  className="bg-[#7C5CFC] gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Adicionar perfil exemplo
                </Button>
              }
            />
          ) : (
            profileCaptures.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.handle}</span>
                    <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                      {p.postsCount} posts
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-[11px] gap-1.5"
                    onClick={() => handleAnalyzeProfile(p.id)}
                    disabled={loading}
                  >
                    <Eye className="w-3 h-3" /> {p.report ? 'Ver relatório' : 'Gerar relatório'}
                  </Button>
                </div>
                {p.report && (
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                      <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">
                        Resumo estratégico
                      </p>
                      <p className="text-slate-300">{p.report.summary}</p>
                    </div>
                    <div className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                      <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">
                        Social selling
                      </p>
                      <p className="text-slate-300">{p.report.socialSelling}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                        <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">
                          Mix de conteúdo
                        </p>
                        {p.report.mix.map((m) => (
                          <p key={m.type} className="text-slate-300">
                            {m.type}: {m.pct}%
                          </p>
                        ))}
                      </div>
                      <div className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                        <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">
                          Hooks dominantes
                        </p>
                        {p.report.hooks.map((h) => (
                          <p key={h} className="text-slate-300">
                            • {h}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                      <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">
                        5 ideias adaptadas
                      </p>
                      {p.report.ideas.map((idea) => (
                        <p key={idea} className="text-slate-300">
                          → {idea}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Calendário ----------
function CalendarioPanel() {
  const { scheduleEvents, saveScheduleEvent, deleteScheduleEvent } = usePlatform()
  const [refDate, setRefDate] = useState(new Date())

  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7 // segunda=0

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const eventsForDay = (day: number) =>
    scheduleEvents.filter((e) => {
      const ed = new Date(e.date)
      return ed.getFullYear() === year && ed.getMonth() === month && ed.getDate() === day
    })

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-bold text-white">
            {monthNames[month]} {year}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-xs"
            onClick={() => setRefDate(new Date())}
          >
            Hoje
          </Button>
          <Button
            size="sm"
            className="bg-[#22D3EE] text-black text-xs gap-1.5"
            onClick={() => {
              saveScheduleEvent({
                id: uid('evt'),
                title: 'Novo post agendado',
                date: new Date().toISOString(),
                channel: 'Instagram',
                status: 'planejado',
              })
              toast.success('Post agendado!')
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Agendar post
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((w) => (
          <div key={w} className="text-center text-[10px] font-bold text-[#9494A8] uppercase py-1">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear()
          const evs = day ? eventsForDay(day) : []
          return (
            <div
              key={i}
              className={`min-h-[80px] rounded-lg border p-1.5 ${day ? 'bg-[#14141C] border-white/5' : 'bg-transparent border-transparent'} ${isToday ? 'ring-1 ring-[#22D3EE]' : ''}`}
            >
              {day && (
                <span
                  className={`text-[10px] font-bold ${isToday ? 'text-[#22D3EE]' : 'text-[#9494A8]'}`}
                >
                  {day}
                </span>
              )}
              {evs.map((e) => (
                <div
                  key={e.id}
                  className="mt-1 rounded bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 px-1 py-0.5 text-[9px] text-[#7C5CFC] truncate flex items-center justify-between group"
                >
                  <span className="truncate">{e.title}</span>
                  <button
                    onClick={() => deleteScheduleEvent(e.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
