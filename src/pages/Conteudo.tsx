import React, { useState, useEffect, useMemo } from 'react'
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
  useDebouncedEffect,
} from '@/components/marketing/Shared'
import { ContentItem, ContentBlock, IdeaItem, FunnelStage, Awareness } from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  Play,
  GraduationCap,
  Clock,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStudio } from '@/context/StudioContext'
import { useNavigate } from 'react-router-dom'

// ============================================================
// ARCOS DE STORIES — 8 modelos (spec)
// ============================================================
const STORY_ARCS = [
  {
    id: 'antes_depois',
    name: 'Antes e Depois',
    blocks: ['Antes', 'Transformação', 'Depois', 'CTA'],
    use: 'Mostrar evolução',
  },
  {
    id: 'bastidores',
    name: 'Bastidores',
    blocks: ['Contexto', 'Processo', 'Resultado', 'CTA'],
    use: 'Autoridade com intimidade',
  },
  {
    id: 'tutorial',
    name: 'Tutorial Rápido',
    blocks: ['Gancho', 'Passo 1', 'Passo 2', 'Passo 3', 'CTA'],
    use: 'Ensinar algo prático',
  },
  {
    id: 'pergunta_resposta',
    name: 'Pergunta e Resposta',
    blocks: ['Pergunta', 'Resposta', 'Prova', 'CTA'],
    use: 'Engajar e qualificar',
  },
  {
    id: 'dia_na_vida',
    name: 'Dia na Vida',
    blocks: ['Manhã', 'Meio-dia', 'Tarde', 'Noite', 'CTA'],
    use: 'Conexão pessoal',
  },
  {
    id: 'provocacao_solucao',
    name: 'Provocação + Solução',
    blocks: ['Provocação', 'Tensão', 'Solução', 'CTA'],
    use: 'Despertar dor e resolver',
  },
  {
    id: 'carrossel_dicas',
    name: 'Carrossel de Dicas',
    blocks: ['Dica 1', 'Dica 2', 'Dica 3', 'Dica 4', 'CTA'],
    use: 'Entregar valor em lista',
  },
  {
    id: 'historia_cliente',
    name: 'História do Cliente',
    blocks: ['Contexto', 'Desafio', 'Virada', 'Resultado', 'CTA'],
    use: 'Prova social narrativa',
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

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function newBlock(
  blockType: string,
  position: number,
  text = '',
  aiGenerated = false,
): ContentBlock {
  return {
    id: uid('blk'),
    blockType,
    position,
    text,
    version: 1,
    aiGenerated,
    locked: false,
    order: position,
  }
}

// Snapshot de geração (prompt/modelo/timestamp)
function genSnapshot(contextVersion: number) {
  return {
    contextVersion,
    brand_profile_version_id: `brand-os-v${contextVersion}`,
    prompt_version: '1.0',
    model: 'lumen-simulated-v1',
    generated_at: new Date().toISOString(),
  }
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
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
    { id: 'academy', label: 'Academy', icon: GraduationCap },
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
      {sub === 'academy' && <AcademyFullPanel />}
    </div>
  )
}

// ============================================================
// GUARD DE BRAND OS (botão desabilitado c/ tooltip)
// ============================================================
function GuardWrapper({
  children,
  can,
  message = 'Configure seu Brand OS primeiro em Posicionamento.',
}: {
  children: React.ReactNode
  can: boolean
  message?: string
}) {
  if (can) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block cursor-not-allowed opacity-60">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs max-w-xs">
        {message}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================
// POSTS ESTÁTICOS
// ============================================================
function PostsPanel() {
  const { brandProfile, hasBrandOS, contentItems, saveContentItem, deleteContentItem } =
    usePlatform()
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
  const [error, setError] = useState(false)

  const posts = contentItems.filter((c) => c.type === 'post')

  const handleGenerate = async () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.', {
        description: 'A geração usa o Brand OS ativo como contexto.',
        action: { label: 'Tentar novamente', onClick: () => handleGenerate() },
      })
      return
    }
    if (!theme.trim()) {
      toast.error('Informe o tema do post.')
      return
    }
    setLoading(true)
    setProgress(0)
    setError(false)
    try {
      const res = await generate(
        'post_estatico',
        (pct, label) => {
          setProgress(pct)
          setProgressLabel(label)
        },
        1500,
      )
      const chosenResources = resources.length ? resources : ['IA decide']
      const aud = brandProfile.base.audience || 'criador'
      const diff = brandProfile.base.differential || 'foco em execução com método'
      const blocks: ContentBlock[] = [
        newBlock(
          'headline',
          0,
          `Você não precisa de mais ${theme.toLowerCase()}. Precisa de método.`,
          true,
        ),
        newBlock(
          'body',
          1,
          `Se você é ${aud} e ainda ${theme.toLowerCase()} sem estratégia, está perdendo tempo.\n\nAqui vai o que realmente funciona: ${diff}.\n\nRecursos usados: ${chosenResources.join(', ')}.`,
          true,
        ),
        newBlock(
          'cta',
          2,
          `${cta}: comente "${cta.toUpperCase()}" e te envio o passo a passo.`,
          true,
        ),
        newBlock(
          'hashtags',
          3,
          `#${theme.split(' ')[0].toLowerCase()} #marketing #conteudo #lumen`,
          true,
        ),
        newBlock(
          'caption',
          4,
          `Legenda: ${theme} — salve este post para consultar depois. ${diff}.`,
          true,
        ),
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
        ...genSnapshot(res.contextVersion),
        funnel_stage: objective,
        theme,
        objective: `${objective} • consciência ${awareness}`,
      }
      saveContentItem(item)
      setCurrent(item)
      toast.success('Post estático gerado!')
    } catch (e) {
      setError(true)
      toast.error('Falha na geração.', {
        action: { label: 'Tentar novamente', onClick: () => handleGenerate() },
      })
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Gerar post estático</h3>
            {hasBrandOS ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                Brand OS v{brandProfile.activeVersion}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                Brand OS pendente
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Objetivo">
              <select
                className={inputClass}
                value={objective}
                onChange={(e) => setObjective(e.target.value as FunnelStage)}
              >
                <option value="topo">Topo de Funil</option>
                <option value="meio">Meio de Funil</option>
                <option value="fundo">Fundo de Funil</option>
              </select>
            </Field>
            <Field label="Nível de Consciência (1-5)" hint="Eugene Schwartz">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={awareness}
                  onChange={(e) => setAwareness(Number(e.target.value) as Awareness)}
                  className="flex-1 accent-[#7C5CFC]"
                />
                <span className="text-xs text-white font-bold w-6 text-center">{awareness}</span>
              </div>
            </Field>
          </div>
          <Field label="CTA">
            <input
              className={inputClass}
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Ex: Comentar, Salvar, Link na bio"
            />
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
          <GuardWrapper can={hasBrandOS}>
            <GenerateButton
              onClick={handleGenerate}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!theme.trim() || !hasBrandOS}
              label="Gerar conteúdo completo"
            />
          </GuardWrapper>
          {error && <p className="text-[11px] text-red-400">Falha na geração. Tente novamente.</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase tracking-wider">
            Posts salvos ({posts.length})
          </p>
          {posts.length === 0 ? (
            <EmptyState
              icon={<PenSquare className="w-6 h-6" />}
              title="Nenhum post salvo"
              description="Gere seu primeiro post estático com IA usando o Brand OS ativo."
            />
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
          <PostPreview current={current} onChange={setCurrent} onSave={saveContentItem} />
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

function PostPreview({
  current,
  onChange,
  onSave,
}: {
  current: ContentItem
  onChange: (c: ContentItem) => void
  onSave: (c: ContentItem) => void
}) {
  // Autosave com debounce 2s
  useDebouncedEffect(
    current,
    (c) => {
      onSave({ ...c, updatedAt: new Date().toISOString() })
    },
    2000,
  )

  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{current.title}</h3>
        <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
          Brand OS v{current.contextVersion}
        </Badge>
      </div>
      <BlockEditor
        blocks={current.blocks}
        onChange={(blocks) => onChange({ ...current, blocks })}
      />
      <div className="flex flex-wrap gap-2 pt-2">
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
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 text-xs gap-1.5"
          onClick={() => toast.success('Legenda e hashtags copiadas separadas!')}
        >
          <Sparkles className="w-3.5 h-3.5" /> Legenda + Hashtags
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// STORIES / FIO
// ============================================================
function StoriesPanel() {
  const { brandProfile, hasBrandOS, contentItems, saveContentItem, deleteContentItem } =
    usePlatform()
  const { generate } = useAIGeneration()
  const [objective, setObjective] = useState<FunnelStage>('topo')
  const [awareness, setAwareness] = useState<Awareness>(3)
  const [cta, setCta] = useState('Direct')
  const [theme, setTheme] = useState('')
  const [arc, setArc] = useState(STORY_ARCS[0].id)
  const [delivery, setDelivery] = useState<'texto' | 'falado' | 'misto'>('misto')
  const [mode2, setMode2] = useState<'sequencia' | 'semana'>('sequencia')
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)

  const stories = contentItems.filter((c) => c.type === 'story')

  const handleGenerate = async () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.')
      return
    }
    if (!theme.trim()) {
      toast.error('Informe o tema.')
      return
    }
    setLoading(true)
    setProgress(0)
    try {
      const res = await generate(
        'story_fio',
        (pct, label) => {
          setProgress(pct)
          setProgressLabel(label)
        },
        1500,
      )
      const chosenArc = STORY_ARCS.find((a) => a.id === arc) || STORY_ARCS[0]
      const totalStories = mode2 === 'semana' ? 7 : Math.max(1, count)
      const blocks: ContentBlock[] = []
      for (let s = 0; s < totalStories; s++) {
        const dayLabel =
          mode2 === 'semana'
            ? ` — ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][s]}`
            : ` #${s + 1}`
        chosenArc.blocks.forEach((b, i) => {
          blocks.push(
            newBlock(
              `Story ${s + 1}${dayLabel} • ${b}`,
              blocks.length,
              `[${b}] ${theme} — ${brandProfile.base.differential || 'entrega de valor'} (entrega: ${delivery})`,
              true,
            ),
          )
        })
      }
      blocks.push(newBlock('CTA', blocks.length, cta, true))
      const item: ContentItem = {
        id: uid('story'),
        type: 'story',
        title: `FIO: ${theme}`,
        blocks,
        funnelStage: objective,
        awareness,
        cta,
        status: 'rascunho',
        contextVersion: res.contextVersion,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...genSnapshot(res.contextVersion),
        funnel_stage: objective,
        theme,
        metadata: { arc: chosenArc.name, delivery, mode: mode2, totalStories },
      }
      saveContentItem(item)
      setCurrent(item)
      toast.success(`FIO gerado com arco "${chosenArc.name}" (${totalStories} stories)!`)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Criar FIO (Stories)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modo de criação">
              <select
                className={inputClass}
                value={mode2}
                onChange={(e) => setMode2(e.target.value as 'sequencia' | 'semana')}
              >
                <option value="sequencia">Sequência (definir quantidade)</option>
                <option value="semana">Semana (7 stories)</option>
              </select>
            </Field>
            <Field label="Modo de entrega">
              <select
                className={inputClass}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value as 'texto' | 'falado' | 'misto')}
              >
                <option value="texto">Texto</option>
                <option value="falado">Falado</option>
                <option value="misto">Misto</option>
              </select>
            </Field>
          </div>
          {mode2 === 'sequencia' && (
            <Field label={`Quantidade de stories: ${count}`}>
              <input
                type="range"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[#7C5CFC]"
              />
            </Field>
          )}
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
            <input className={inputClass} value={cta} onChange={(e) => setCta(e.target.value)} />
          </Field>
          <Field label="Arco narrativo (8 modelos)">
            <select className={inputClass} value={arc} onChange={(e) => setArc(e.target.value)}>
              {STORY_ARCS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.use}
                </option>
              ))}
            </select>
          </Field>
          <GuardWrapper can={hasBrandOS}>
            <GenerateButton
              onClick={handleGenerate}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!theme.trim() || !hasBrandOS}
              label="Gerar FIO"
            />
          </GuardWrapper>
        </div>
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-4">
          <p className="text-xs font-semibold text-[#9494A8] uppercase mb-2">8 Arcos disponíveis</p>
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
          {stories.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-6 h-6" />}
              title="Nenhum FIO salvo"
              description="Crie sequências de stories com arcos narrativos."
            />
          ) : (
            stories.map((s) => (
              <SavedItemCard
                key={s.id}
                title={s.title}
                subtitle={`${s.funnelStage} • ${s.cta} • ${s.metadata?.arc || ''}`}
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
            ))
          )}
        </div>
      </div>
      <div>
        {current ? (
          <StoryPreview current={current} onChange={setCurrent} onSave={saveContentItem} />
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

function StoryPreview({
  current,
  onChange,
  onSave,
}: {
  current: ContentItem
  onChange: (c: ContentItem) => void
  onSave: (c: ContentItem) => void
}) {
  useDebouncedEffect(
    current,
    (c) => {
      onSave({ ...c, updatedAt: new Date().toISOString() })
    },
    2000,
  )
  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{current.title}</h3>
        <Badge
          className={
            current.status === 'pronto' || current.status === 'approved'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }
        >
          {current.status === 'pronto' || current.status === 'approved' ? 'Pronto' : 'Rascunho'}
        </Badge>
      </div>
      <BlockEditor
        blocks={current.blocks}
        onChange={(blocks) => onChange({ ...current, blocks })}
        onAdjust={() => toast.info('Story ajustado individualmente.')}
      />
      <Button
        size="sm"
        variant="outline"
        className="border-white/10 text-xs gap-1.5"
        onClick={() => {
          const u = { ...current, status: 'pronto' as const }
          onChange(u)
          onSave(u)
          toast.success('Marcado como pronto!')
        }}
      >
        Marcar como pronto
      </Button>
    </div>
  )
}

// ============================================================
// REELS
// ============================================================
function ReelsPanel() {
  const { hasBrandOS, contentItems, saveContentItem, deleteContentItem } = usePlatform()
  const { generate } = useAIGeneration()
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)
  const navigate = useNavigate()

  const reels = contentItems.filter((c) => c.type === 'reel')

  const handleGenerate = async () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.')
      return
    }
    if (!theme.trim()) {
      toast.error('Informe o tema.')
      return
    }
    setLoading(true)
    setProgress(0)
    try {
      const res = await generate(
        'reel',
        (pct, label) => {
          setProgress(pct)
          setProgressLabel(label)
        },
        1600,
      )
      const blocks: ContentBlock[] = REEL_BLOCKS.map((b, i) =>
        newBlock(b, i, reelContent(b, theme), true),
      )
      const item: ContentItem = {
        id: uid('reel'),
        type: 'reel',
        title: `Reel: ${theme}`,
        blocks,
        funnelStage: 'topo',
        awareness: 2,
        cta: 'Salvar',
        status: 'rascunho',
        contextVersion: res.contextVersion,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...genSnapshot(res.contextVersion),
        theme,
      }
      saveContentItem(item)
      setCurrent(item)
      toast.success('Reel gerado!')
    } finally {
      setLoading(false)
      setProgress(0)
    }
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
          <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-3 text-[11px] text-[#9494A8]">
            Estrutura por blocos: {REEL_BLOCKS.join(' → ')}
          </div>
          <GuardWrapper can={hasBrandOS}>
            <GenerateButton
              onClick={handleGenerate}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!theme.trim() || !hasBrandOS}
              label="Gerar roteiro por blocos"
            />
          </GuardWrapper>
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
              onClick={() => toast.success('Take enviado como bloco de desenvolvimento do reel!')}
            >
              <Wand2 className="w-3.5 h-3.5" /> Enviar take p/ reel
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Reels salvos ({reels.length})
          </p>
          {reels.length === 0 ? (
            <EmptyState
              icon={<Film className="w-6 h-6" />}
              title="Nenhum reel salvo"
              description="Gere roteiros por blocos sequenciais."
            />
          ) : (
            reels.map((r) => (
              <SavedItemCard
                key={r.id}
                title={r.title}
                subtitle={`${r.blocks.length} blocos • ${r.status}`}
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
            ))
          )}
        </div>
      </div>
      <div>
        {current ? (
          <ReelPreview current={current} onChange={setCurrent} onSave={saveContentItem} />
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

function ReelPreview({
  current,
  onChange,
  onSave,
}: {
  current: ContentItem
  onChange: (c: ContentItem) => void
  onSave: (c: ContentItem) => void
}) {
  useDebouncedEffect(
    current,
    (c) => {
      onSave({ ...c, updatedAt: new Date().toISOString() })
    },
    2000,
  )
  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{current.title}</h3>
        <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
          v{current.contextVersion}
        </Badge>
      </div>
      <BlockEditor
        blocks={current.blocks}
        onChange={(blocks) => onChange({ ...current, blocks })}
        onAdjust={() => toast.info('Bloco ajustado individualmente.')}
        enableReorder
      />
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

// ============================================================
// CARROSSÉIS
// ============================================================
function CarrosseisPanel() {
  const { brandProfile, hasBrandOS, contentItems, saveContentItem, deleteContentItem } =
    usePlatform()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()
  const [briefing, setBriefing] = useState('')
  const [audience, setAudience] = useState('')
  const [message, setMessage] = useState('')
  const [hookCategory, setHookCategory] = useState('problema')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [current, setCurrent] = useState<ContentItem | null>(null)

  const carousels = contentItems.filter((c) => c.type === 'carrossel')

  // Autosave briefing
  useDebouncedEffect(
    { briefing, audience, message },
    (v) => {
      localStorage.setItem('lumen_carousel_briefing', JSON.stringify(v))
    },
    2000,
  )
  useEffect(() => {
    const saved = localStorage.getItem('lumen_carousel_briefing')
    if (saved) {
      try {
        const v = JSON.parse(saved)
        if (v.briefing) setBriefing(v.briefing)
        if (v.audience) setAudience(v.audience)
        if (v.message) setMessage(v.message)
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  const handleGenerate = async () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.')
      return
    }
    if (!briefing.trim()) {
      toast.error('Informe o briefing.')
      return
    }
    setLoading(true)
    setProgress(0)
    try {
      const res = await generate(
        'carrossel',
        (pct, label) => {
          setProgress(pct)
          setProgressLabel(label)
        },
        1700,
      )
      const hookTexts: Record<string, string> = {
        problema: `Cansado de ${briefing.toLowerCase()} sem resultado?`,
        curiosidade: `O que ninguém te conta sobre ${briefing.toLowerCase()}:`,
        passo_passo: `Passo a passo para dominar ${briefing.toLowerCase()}:`,
        lista: `5 coisas sobre ${briefing.toLowerCase()} que você precisa saber:`,
        comparacao: `Erro comum vs. jeito certo de ${briefing.toLowerCase()}:`,
      }
      const roles = ['Capa', 'Dor', 'Re-gancho', 'Virada', 'Credencial', 'Conteúdo', 'CTA']
      const blocks: ContentBlock[] = [
        newBlock('card', 0, hookTexts[hookCategory], true),
        ...roles
          .slice(1)
          .map((r, i) =>
            newBlock(
              'card',
              i + 1,
              `[${r}] ${briefing} — ${brandProfile.base.differential || 'entrega de valor'}`,
              true,
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
        ...genSnapshot(res.contextVersion),
        theme: briefing,
        metadata: { hookCategory, audience, message },
      }
      saveContentItem(item)
      setCurrent(item)
      toast.success('Carrossel gerado! Copy pronta para aprovação.')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Workflow de Carrossel</h3>
          <Field label="Briefing" required>
            <textarea
              className={inputClass}
              rows={2}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Ex: 5 erros de copy que matam o engajamento"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Público">
              <input
                className={inputClass}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ex: Criadores iniciantes"
              />
            </Field>
            <Field label="Mensagem principal">
              <input
                className={inputClass}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Método > inspiração"
              />
            </Field>
          </div>
          <Field label="Categoria do hook de capa">
            <select
              className={inputClass}
              value={hookCategory}
              onChange={(e) => setHookCategory(e.target.value)}
            >
              {[
                { id: 'problema', label: 'Problema' },
                { id: 'curiosidade', label: 'Curiosidade' },
                { id: 'passo_passo', label: 'Passo a passo' },
                { id: 'lista', label: 'Lista' },
                { id: 'comparacao', label: 'Comparação' },
              ].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <GuardWrapper can={hasBrandOS}>
            <GenerateButton
              onClick={handleGenerate}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!briefing.trim() || !hasBrandOS}
              label="Gerar copy card a card"
            />
          </GuardWrapper>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#9494A8] uppercase">
            Carrosséis salvos ({carousels.length})
          </p>
          {carousels.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-6 h-6" />}
              title="Nenhum carrossel"
              description="Workflow: briefing → hooks → copy → aprovação → artes → legenda."
            />
          ) : (
            carousels.map((c) => (
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
            ))
          )}
        </div>
      </div>
      <div>
        {current ? (
          <CarouselPreview
            current={current}
            onChange={setCurrent}
            onSave={saveContentItem}
            onOpenEditor={() => navigate('/carrossel')}
          />
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

function CarouselPreview({
  current,
  onChange,
  onSave,
  onOpenEditor,
}: {
  current: ContentItem
  onChange: (c: ContentItem) => void
  onSave: (c: ContentItem) => void
  onOpenEditor: () => void
}) {
  useDebouncedEffect(
    current,
    (c) => {
      onSave({ ...c, updatedAt: new Date().toISOString() })
    },
    2000,
  )

  const rewriteCard = (id: string) => {
    if (!current) return
    onChange({
      ...current,
      blocks: current.blocks.map((b) =>
        b.id === id ? { ...b, text: `[Reescrito] ${b.text}`, version: b.version + 1 } : b,
      ),
    })
    toast.success('Card reescrito com Brand OS!')
  }
  const condenseCard = (id: string) => {
    if (!current) return
    onChange({
      ...current,
      blocks: current.blocks.map((b) =>
        b.id === id ? { ...b, text: b.text.split('.')[0] + '.', version: b.version + 1 } : b,
      ),
    })
    toast.success('Card condensado!')
  }

  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{current.title}</h3>
        <Badge
          className={
            current.status === 'aprovado' || current.status === 'approved'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : current.status === 'scheduled' || current.status === 'agendado'
                ? 'bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }
        >
          {current.status}
        </Badge>
      </div>
      <BlockEditor
        blocks={current.blocks}
        onChange={(blocks) => onChange({ ...current, blocks })}
        enableReorder
      />
      <div className="space-y-1.5 pt-2">
        <p className="text-[10px] text-[#9494A8] uppercase">Ações por card</p>
        <div className="flex flex-wrap gap-1.5">
          {current.blocks.map((b) => (
            <div key={b.id} className="flex gap-1">
              <button
                onClick={() => rewriteCard(b.id)}
                className="px-2 py-1 rounded-lg text-[10px] bg-[#1C1C27] text-[#22D3EE] hover:bg-[#22D3EE]/10 border border-white/5"
              >
                Reescrever #{b.position + 1}
              </button>
              <button
                onClick={() => condenseCard(b.id)}
                className="px-2 py-1 rounded-lg text-[10px] bg-[#1C1C27] text-[#9494A8] hover:text-white border border-white/5"
              >
                Condensar
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          onClick={() => {
            const u = { ...current, status: 'aprovado' as const }
            onChange(u)
            onSave(u)
            toast.success('Copy aprovada!')
          }}
          disabled={current.status === 'aprovado'}
          className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
        >
          Aprovar copy
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
            toast.success('TXT baixado!')
          }}
        >
          <Download className="w-3.5 h-3.5" /> TXT
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 text-xs gap-1.5"
          onClick={() =>
            toast.info('Exportação PNG/ZIP', {
              description:
                'A renderização real depende de integração com motor de imagem. O conteúdo está pronto.',
            })
          }
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
          onClick={onOpenEditor}
        >
          <Wand2 className="w-3.5 h-3.5" /> Editor visual
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// BANCO DE IDEIAS
// ============================================================
function IdeasPanel() {
  const { brandProfile, hasBrandOS, ideas, saveIdeas } = usePlatform()
  const { generate } = useAIGeneration()
  const [pillar, setPillar] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [transformIdea, setTransformIdea] = useState<IdeaItem | null>(null)
  const [transformFormat, setTransformFormat] = useState<'post' | 'story' | 'reel' | 'carrossel'>(
    'post',
  )
  const navigate = useNavigate()

  const pillarsAsset =
    brandProfile.assets.find((a) => a.type === 'pilares_de_conteudo')?.content || ''
  const pillarList = useMemo(() => {
    if (pillarsAsset) {
      // tenta extrair pilares do texto
      const lines = pillarsAsset
        .split('\n')
        .map((l) => l.replace(/^[-•*\d.\s]+/, '').trim())
        .filter(Boolean)
      if (lines.length >= 2) return lines.slice(0, 8)
    }
    return ['Educação', 'Bastidores', 'Prova', 'Conexão', 'Conversão']
  }, [pillarsAsset])

  const handleGenerate = async () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.')
      return
    }
    if (!pillar.trim()) {
      toast.error('Selecione um pilar.')
      return
    }
    setLoading(true)
    setProgress(0)
    try {
      const res = await generate(
        'ideias',
        (pct, label) => {
          setProgress(pct)
          setProgressLabel(label)
        },
        1200,
      )
      const angles = [
        'original',
        'com prova',
        'polêmica',
        'didática',
        'bastidor',
        'curiosidade',
        'antes/depois',
        'mito',
        'checklist',
        'CTA',
      ]
      const formats: Array<'post' | 'story' | 'reel' | 'carrossel'> = [
        'post',
        'story',
        'reel',
        'carrossel',
      ]
      const newIdeas: IdeaItem[] = Array.from({ length: 10 }).map((_, i) => ({
        id: uid('idea'),
        pillar,
        title: `${pillar} #${i + 1}: ideia ${angles[i]}`,
        angle: `Ângulo ${angles[i]} baseado em ${brandProfile.base.differential || 'seu diferencial'}`,
        transformed: false,
        createdAt: new Date().toISOString(),
      }))
      saveIdeas(newIdeas)
      toast.success(`10 ideias geradas para o pilar "${pillar}"!`)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const transform = (idea: IdeaItem, format: 'post' | 'story' | 'reel' | 'carrossel') => {
    setTransformIdea(idea)
    setTransformFormat(format)
  }

  const confirmTransform = () => {
    if (!transformIdea) return
    // Pré-popula o editor correspondente via localStorage (contexto da ideia)
    localStorage.setItem(
      'lumen_idea_context',
      JSON.stringify({ idea: transformIdea, format: transformFormat }),
    )
    const updated = ideas.map((i) => (i.id === transformIdea.id ? { ...i, transformed: true } : i))
    saveIdeas(updated)
    toast.success(`Ideia transformada em ${transformFormat}! Contexto pré-carregado.`)
    setTransformIdea(null)
    if (transformFormat === 'reel') navigate('/modulo-2')
  }

  if (!hasBrandOS) {
    return (
      <EmptyState
        icon={<Lightbulb className="w-6 h-6" />}
        title="Banco de ideias exige Brand OS"
        description="Configure seu Brand OS em Posicionamento para gerar ideias alinhadas à sua marca."
        action={
          <Button
            size="sm"
            onClick={() => navigate('/posicionamento')}
            className="bg-[#7C5CFC] gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Configurar Brand OS
          </Button>
        }
      />
    )
  }

  const formatIcon = (f: string) => {
    switch (f) {
      case 'post':
        return <PenSquare className="w-3 h-3" />
      case 'story':
        return <Layers className="w-3 h-3" />
      case 'reel':
        return <Film className="w-3 h-3" />
      case 'carrossel':
        return <Layers className="w-3 h-3" />
      default:
        return <Sparkles className="w-3 h-3" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Banco de Ideias</h3>
        <Field
          label="Pilar de conteúdo"
          hint={pillarsAsset ? `Do Brand OS: ${pillarsAsset.slice(0, 120)}` : 'Selecione um pilar'}
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
        <GuardWrapper can={hasBrandOS}>
          <GenerateButton
            onClick={handleGenerate}
            loading={loading}
            progress={progress}
            progressLabel={progressLabel}
            disabled={!pillar || !hasBrandOS}
            label="Gerar 10 ideias"
          />
        </GuardWrapper>
      </div>
      {ideas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-6 h-6" />}
          title="Nenhuma ideia gerada"
          description="Selecione um pilar e gere 10 ideias alinhadas ao seu Brand OS."
        />
      ) : (
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
                    className="px-2 py-1 rounded-lg text-[10px] bg-[#1C1C27] text-[#9494A8] hover:text-white hover:bg-white/10 border border-white/5 capitalize flex items-center gap-1"
                  >
                    {formatIcon(f)} {f}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de transformação */}
      {transformIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#14141C] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Transformar em {transformFormat}</h3>
              <button
                onClick={() => setTransformIdea(null)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#9494A8]">
              A ideia será pré-populada no editor de {transformFormat} com o contexto do Brand OS,
              sem redigitar nada.
            </p>
            <div className="rounded-lg bg-[#0e0e15]/60 p-3 text-xs text-slate-300">
              <p className="font-bold text-white mb-1">{transformIdea.title}</p>
              <p>{transformIdea.angle}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTransformIdea(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmTransform} className="bg-[#7C5CFC] text-xs gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Transformar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// ESPIONAGEM (preservada)
// ============================================================
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
              description="Capture posts do Instagram via extensão ou cole a URL manualmente."
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
              description="Capture perfis do Instagram via extensão. Cada perfil gera relatório estratégico."
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
                      <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">Resumo</p>
                      <p className="text-slate-300">{p.report.summary}</p>
                    </div>
                    <div className="rounded-lg bg-[#0e0e15]/60 p-2.5">
                      <p className="text-[10px] font-bold text-[#22D3EE] uppercase mb-1">
                        Social selling
                      </p>
                      <p className="text-slate-300">{p.report.socialSelling}</p>
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

// ============================================================
// CALENDÁRIO
// ============================================================
const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  post: { bg: 'bg-[#7C5CFC]/15', border: 'border-[#7C5CFC]/30', text: 'text-[#7C5CFC]' },
  story: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' },
  reel: { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-400' },
  carrossel: { bg: 'bg-[#22D3EE]/15', border: 'border-[#22D3EE]/30', text: 'text-[#22D3EE]' },
}

const STATUS_STYLES: Record<string, string> = {
  rascunho: 'text-[#9494A8] line-through',
  draft: 'text-[#9494A8] line-through',
  aprovado: 'text-blue-400',
  approved: 'text-blue-400',
  scheduled: 'text-[#7C5CFC]',
  pronto: 'text-[#7C5CFC]',
  published: 'text-emerald-400',
  cancelled: 'text-red-400 line-through',
}

function CalendarioPanel() {
  const { contentItems, saveContentItem, scheduleEvents, saveScheduleEvent, deleteScheduleEvent } =
    usePlatform()
  const [refDate, setRefDate] = useState(new Date())
  const [scheduleModal, setScheduleModal] = useState<{ day: number } | null>(null)
  const [editModal, setEditModal] = useState<{ event: any } | null>(null)
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState('18:00')

  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Combina scheduleEvents + contentItems agendados
  const allEvents = useMemo(() => {
    const fromItems = contentItems
      .filter((c) => c.scheduled_at)
      .map((c) => ({
        id: c.id,
        title: c.title,
        date: c.scheduled_at!,
        type: c.type,
        status: c.status,
        source: 'content' as const,
      }))
    const fromSchedule = scheduleEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      type: 'post' as const,
      status: e.status,
      source: 'schedule' as const,
    }))
    return [...fromItems, ...fromSchedule]
  }, [contentItems, scheduleEvents])

  const eventsForDay = (day: number) =>
    allEvents.filter((e) => {
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

  const readyItems = contentItems.filter(
    (c) => c.status === 'pronto' || c.status === 'aprovado' || c.status === 'gerado',
  )

  const scheduleItem = () => {
    if (!scheduleModal || !selectedItem) {
      toast.error('Selecione um item para agendar.')
      return
    }
    const item = contentItems.find((c) => c.id === selectedItem)
    if (!item) return
    const date = new Date(year, month, scheduleModal.day, ...selectedTime.split(':').map(Number))
    const updated = {
      ...item,
      scheduled_at: date.toISOString(),
      status: 'scheduled' as const,
      updatedAt: new Date().toISOString(),
    }
    saveContentItem(updated)
    toast.success(`${item.title} agendado para ${date.toLocaleString('pt-BR')}!`)
    setScheduleModal(null)
    setSelectedItem('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
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
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-xs"
            onClick={() => setRefDate(new Date())}
          >
            Hoje
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[10px] text-[#9494A8]">
                <span className="w-2 h-2 rounded-full bg-[#7C5CFC]" /> post
                <span className="w-2 h-2 rounded-full bg-orange-400" /> story
                <span className="w-2 h-2 rounded-full bg-pink-400" /> reel
                <span className="w-2 h-2 rounded-full bg-[#22D3EE]" /> carrossel
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
              Cores por tipo de conteúdo
            </TooltipContent>
          </Tooltip>
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
              className={`min-h-[80px] rounded-lg border p-1.5 ${day ? 'bg-[#14141C] border-white/5 cursor-pointer hover:border-white/20' : 'bg-transparent border-transparent'} ${isToday ? 'ring-1 ring-[#22D3EE]' : ''}`}
              onClick={() => day && setScheduleModal({ day })}
            >
              {day && (
                <span
                  className={`text-[10px] font-bold ${isToday ? 'text-[#22D3EE]' : 'text-[#9494A8]'}`}
                >
                  {day}
                </span>
              )}
              {evs.map((e) => {
                const color = TYPE_COLORS[e.type] || TYPE_COLORS.post
                return (
                  <div
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setEditModal({ event: e })
                    }}
                    className={`mt-1 rounded ${color.bg} border ${color.border} px-1 py-0.5 text-[9px] ${color.text} ${STATUS_STYLES[e.status] || ''} truncate flex items-center justify-between group`}
                  >
                    <span className="truncate">{e.title}</span>
                    {e.source === 'schedule' && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation()
                          deleteScheduleEvent(e.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Modal agendar item */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#14141C] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Agendar item — {scheduleModal.day}/{month + 1}
              </h3>
              <button
                onClick={() => setScheduleModal(null)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {readyItems.length === 0 ? (
              <p className="text-xs text-[#9494A8]">
                Nenhum item pronto para agendar. Marque um conteúdo como "pronto" ou "aprovado"
                primeiro.
              </p>
            ) : (
              <>
                <Field label="Item">
                  <select
                    className={inputClass}
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {readyItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.title} ({it.type})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Horário">
                  <input
                    type="time"
                    className={inputClass}
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScheduleModal(null)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={scheduleItem} className="bg-[#7C5CFC] text-xs gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Agendar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal editar evento */}
      {editModal && (
        <EditEventModal
          event={editModal.event}
          onClose={() => setEditModal(null)}
          onSave={(updates) => {
            const ev = editModal.event
            if (ev.source === 'content') {
              const item = contentItems.find((c) => c.id === ev.id)
              if (item) {
                saveContentItem({
                  ...item,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                })
              }
            } else {
              saveScheduleEvent({
                id: ev.id,
                title: ev.title,
                date: updates.scheduled_at || ev.date,
                channel: 'Instagram',
                status: updates.status || ev.status,
              })
            }
            toast.success('Evento atualizado!')
            setEditModal(null)
          }}
        />
      )}
    </div>
  )
}

function EditEventModal({
  event,
  onClose,
  onSave,
}: {
  event: any
  onClose: () => void
  onSave: (updates: any) => void
}) {
  const [date, setDate] = useState(new Date(event.date).toISOString().slice(0, 10))
  const [time, setTime] = useState(new Date(event.date).toTimeString().slice(0, 5))
  const [status, setStatus] = useState(event.status || 'scheduled')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#14141C] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Editar agendamento</h3>
          <button onClick={onClose} className="text-[#9494A8] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white font-semibold">{event.title}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Horário">
            <input
              type="time"
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="scheduled">Agendado</option>
            <option value="published">Publicado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </Field>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-[10px] text-[#9494A8] italic">
              ℹ️ Publicação manual — a integração com redes sociais não está ativa.
            </p>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
            O status "publicado" é um toggle manual. Não há publicação automática.
          </TooltipContent>
        </Tooltip>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                scheduled_at: new Date(`${date}T${time}`).toISOString(),
                published_at: status === 'published' ? new Date().toISOString() : null,
                status,
              })
            }
            className="bg-[#7C5CFC] text-xs"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ACADEMY (completo)
// ============================================================
const ACADEMY_LESSONS = [
  {
    id: 'a1',
    category: 'Instagram',
    title: 'Estratégia de Conteúdo para Instagram em 2024',
    duration: '18 min',
    level: 'iniciante',
    youtubeId: 'dQw4w9WgXcQ',
    description:
      'Aprenda a estruturar seu Instagram com pilares de conteúdo, frequência e análise de métricas.',
  },
  {
    id: 'a2',
    category: 'TikTok',
    title: 'Como Viralizar no TikTok: Ganchos que Funcionam',
    duration: '14 min',
    level: 'intermediário',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Domine os 3 primeiros segundos e os padrões de gancho que retêm no TikTok.',
  },
  {
    id: 'a3',
    category: 'YouTube',
    title: 'Roteiro de YouTube que Reteém até o Fim',
    duration: '22 min',
    level: 'avançado',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Estrutura narrativa para vídeos longos com curva de retenção crescente.',
  },
  {
    id: 'a4',
    category: 'Edição',
    title: 'Edição Cinematográfica no Celular',
    duration: '16 min',
    level: 'intermediário',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Cortes, transições e coloração que elevam a percepção de qualidade.',
  },
  {
    id: 'a5',
    category: 'Estratégia',
    title: 'Funil de Conteúdo: de Seguidor a Cliente',
    duration: '25 min',
    level: 'avançado',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Mapeie a jornada do público do topo ao fundo de funil com conteúdo estratégico.',
  },
  {
    id: 'a6',
    category: 'Vendas',
    title: 'Vendas via DM: Roteiro que Converte',
    duration: '12 min',
    level: 'intermediário',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Abordagem, qualificação e fechamento no direct sem parecer invasivo.',
  },
  {
    id: 'a7',
    category: 'Instagram',
    title: 'Reels que Explodem: Estrutura por Blocos',
    duration: '15 min',
    level: 'iniciante',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'A fórmula de 8 blocos para reels de alta retenção.',
  },
  {
    id: 'a8',
    category: 'Edição',
    title: 'Legendas Dinâmicas que Retêm Atenção',
    duration: '10 min',
    level: 'iniciante',
    youtubeId: 'dQw4w9WgXcQ',
    description: 'Como criar legendas animadas que mantêm o espectador assistindo.',
  },
]

const CATEGORIES = ['Instagram', 'TikTok', 'YouTube', 'Edição', 'Estratégia', 'Vendas']

function AcademyFullPanel() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openLesson, setOpenLesson] = useState<(typeof ACADEMY_LESSONS)[0] | null>(null)
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
      ? ACADEMY_LESSONS
      : ACADEMY_LESSONS.filter((l) => l.category === activeCategory)

  const levelColor: Record<string, string> = {
    iniciante: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    intermediário: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    avançado: 'bg-red-500/15 text-red-400 border-red-500/30',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeCategory === 'all' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
        >
          Todas
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeCategory === c ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lesson) => {
          const p = progress[lesson.id] || { completed: false, pct: 0 }
          return (
            <div
              key={lesson.id}
              className="rounded-xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/40 overflow-hidden transition-all cursor-pointer group"
              onClick={() => setOpenLesson(lesson)}
            >
              <div className="relative aspect-video bg-[#1C1C27] overflow-hidden">
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
            </div>
          )
        })}
      </div>

      {/* Player modal */}
      {openLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14141C] border border-white/10 rounded-2xl p-6 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{openLesson.title}</h3>
                <p className="text-[11px] text-[#9494A8]">
                  {openLesson.category} • {openLesson.duration} • {openLesson.level}
                </p>
              </div>
              <button
                onClick={() => setOpenLesson(null)}
                className="text-[#9494A8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-black border border-white/10">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${openLesson.youtubeId}`}
                title={openLesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-300">{openLesson.description}</p>
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <input
                type="range"
                min={0}
                max={100}
                value={progress[openLesson.id]?.pct || 0}
                onChange={(e) =>
                  setProgress((p) => ({
                    ...p,
                    [openLesson.id]: {
                      pct: Number(e.target.value),
                      completed:
                        Number(e.target.value) >= 100 ? true : p[openLesson.id]?.completed || false,
                    },
                  }))
                }
                className="flex-1 accent-[#7C5CFC]"
              />
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs gap-1.5"
                onClick={() =>
                  setProgress((p) => ({
                    ...p,
                    [openLesson.id]: { pct: 100, completed: true },
                  }))
                }
              >
                Marcar como concluído
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
