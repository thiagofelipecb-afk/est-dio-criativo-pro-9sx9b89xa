import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { AdCreation, AdIntelItem, CapturedCreative } from '@/types/platform'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Megaphone,
  Search,
  Library,
  Sparkles,
  ExternalLink,
  Eye,
  ArrowRight,
  Copy,
  Film,
  Layers,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const SAMPLE_ADS: AdIntelItem[] = [
  {
    id: 'ad-1',
    keyword: 'tráfego pago',
    advertiser: 'Especialista X',
    daysActive: 42,
    caption: 'Pare de queimar dinheiro com tráfego pago. Veja o método que escala sem perder ROI.',
    mediaUrl: 'https://img.usecurling.com/p/400/400?q=facebook+ads+marketing',
    libraryUrl: 'https://www.facebook.com/ads/library/',
  },
  {
    id: 'ad-2',
    keyword: 'tráfego pago',
    advertiser: 'Agência Y',
    daysActive: 28,
    caption: 'Como faturar 6 dígitos com R$ 10/dia de tráfego. Aula gratuita.',
    mediaUrl: 'https://img.usecurling.com/p/400/400?q=digital+marketing+money',
    libraryUrl: 'https://www.facebook.com/ads/library/',
  },
  {
    id: 'ad-3',
    keyword: 'tráfego pago',
    advertiser: 'Mentor Z',
    daysActive: 65,
    caption: 'O erro que 90% cometem no gerenciador de anúncios.',
    mediaUrl: 'https://img.usecurling.com/p/400/400?q=social+media+analytics',
    libraryUrl: 'https://www.facebook.com/ads/library/',
  },
]

export default function Escala() {
  const {
    adCreations,
    saveAdCreation,
    adIntelItems,
    setAdIntelItems,
    brandProfile,
    saveCapturedCreative,
  } = usePlatform()
  const { generate } = useAIGeneration()
  const navigate = useNavigate()
  const [sub, setSub] = useState<'criar' | 'inteligencia' | 'biblioteca' | 'academy'>('criar')
  const [desc, setDesc] = useState('')
  const [audience, setAudience] = useState('')
  const [outcome, setOutcome] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [keyword, setKeyword] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const tabs = [
    { id: 'criar', label: 'Criar Anúncio', icon: Megaphone },
    { id: 'inteligencia', label: 'Inteligência', icon: Search },
    { id: 'biblioteca', label: 'Biblioteca', icon: Library },
    { id: 'academy', label: 'Academy', icon: Sparkles },
  ] as const

  const handleCreate = async () => {
    if (!desc.trim()) {
      toast.error('Descreva o produto/serviço.')
      return
    }
    setLoading(true)
    setProgress(0)
    const res = await generate(
      'anuncio',
      (pct, label) => {
        setProgress(pct)
        setProgressLabel(label)
      },
      1400,
    )
    const niche = brandProfile.base.niche || 'seu nicho'
    const rec: AdCreation = {
      id: uid('ad'),
      description: desc,
      contextVersion: res.contextVersion,
      recommendation: `Com base no seu Brand OS (${niche}) e no que você descreveu, recomendamos os formatos abaixo para escalar "${desc}":\n\n1. Reel — mostra o método em vídeo curto, ideal para atenção e prova.\n2. Carrossel — quebra objeções e educa em passos.\n3. Post estático — reforça a oferta e o CTA direto.\n\nPúblico-alvo: ${audience || '—'}\nResultado esperado: ${outcome || '—'}\n\nUse os botões abaixo para criar a peça no formato escolhido.`,
      createdAt: new Date().toISOString(),
    }
    saveAdCreation(rec)
    // Evento de produto: contador de criativos gerados
    try {
      const raw = localStorage.getItem('lumen_product_events')
      const ev = raw ? JSON.parse(raw) : {}
      ev.criativos_gerados = (ev.criativos_gerados || 0) + 1
      localStorage.setItem('lumen_product_events', JSON.stringify(ev))
    } catch {
      /* ignore */
    }
    setLoading(false)
    setProgress(0)
    toast.success('Recomendação de anúncio gerada!')
  }

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast.error('Digite uma palavra-chave.')
      return
    }
    setLoading(true)
    setProgress(0)
    await generate('intel_anuncios', () => {}, 1000)
    const kw = keyword.trim().toLowerCase()
    const results = SAMPLE_ADS.filter(
      (a) => a.advertiser.toLowerCase().includes(kw) || a.caption.toLowerCase().includes(kw),
    ).map((a) => ({ ...a, id: uid('ad'), keyword }))
    setAdIntelItems(results)
    setHasSearched(true)
    setLoading(false)
    setProgress(0)
    if (results.length === 0) {
      toast.info(`Nenhum anúncio encontrado para "${keyword}".`)
    } else {
      toast.success(`${results.length} anúncios encontrados para "${keyword}"!`)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Módulo 5 — Escala"
        description="Apoie criação e modelagem de anúncios, com foco em Meta Business Suite e passagem do primeiro impulsionamento à otimização."
        icon={<Megaphone className="w-5 h-5" />}
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

      {sub === 'criar' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Criar Anúncio com contexto do Brand OS</h3>
            <Field label="Produto/Serviço" required hint="O que é, para quem e qual resultado">
              <textarea
                className={inputClass}
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ex: Mentoria de tráfego pago para iniciantes que querem faturar os primeiros R$ 10k"
              />
            </Field>
            <Field label="Para quem é" hint="Público-alvo do anúncio">
              <input
                className={inputClass}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ex: Empreendedores iniciantes em tráfego pago"
              />
            </Field>
            <Field label="Resultado esperado" hint="O que a pessoa ganha">
              <input
                className={inputClass}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Ex: Faturar os primeiros R$ 10k em 90 dias"
              />
            </Field>
            <GenerateButton
              onClick={handleCreate}
              loading={loading}
              progress={progress}
              progressLabel={progressLabel}
              disabled={!desc.trim()}
              label="Gerar recomendação"
            />
          </div>
          {adCreations.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
                  Brand OS v{a.contextVersion}
                </Badge>
                <span className="text-[10px] text-[#9494A8]">
                  {new Date(a.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-[11px] text-[#9494A8]">{a.description}</p>
              <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans">
                {a.recommendation}
              </pre>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-[#22D3EE] text-black text-[11px] gap-1 hover:bg-[#22D3EE]/90"
                  onClick={() => navigate('/gravadora')}
                >
                  <Film className="w-3 h-3" /> Criar como Reel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#7C5CFC] text-white text-[11px] gap-1 hover:bg-[#7C5CFC]/90"
                  onClick={() => navigate('/carrossel')}
                >
                  <Layers className="w-3 h-3" /> Criar como Carrossel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] gap-1"
                  onClick={() => navigate('/post')}
                >
                  <ImageIcon className="w-3 h-3" /> Criar como Post
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === 'inteligencia' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Inteligência de Anúncios</h3>
            <p className="text-[11px] text-[#9494A8]">
              Busca por palavra-chave de nicho ou concorrente. Ordenação por escala: mais dias ativo
              = maior validação.
            </p>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: tráfego pago, nome do concorrente"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#22D3EE] text-black text-xs gap-1.5"
              >
                <Search className="w-3.5 h-3.5" /> Buscar
              </Button>
            </div>
          </div>
          {adIntelItems.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title={hasSearched ? 'Nenhum anúncio encontrado' : 'Busque anúncios ativos'}
              description={
                hasSearched
                  ? `Não há resultados para "${keyword}". Tente outra palavra-chave ou explore a biblioteca de anúncios da Meta.`
                  : 'Digite uma palavra-chave de nicho ou concorrente para ver anúncios ativos ordenados por tempo de escala.'
              }
              action={
                <a
                  href="https://www.facebook.com/ads/library/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#22D3EE] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir Meta Ad Library
                </a>
              }
            />
          ) : (
            <div className="space-y-2">
              {[...adIntelItems]
                .sort((a, b) => b.daysActive - a.daysActive)
                .map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl bg-[#14141C] border border-white/5 p-4 flex gap-3"
                  >
                    <img
                      src={a.mediaUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{a.advertiser}</span>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {a.daysActive} dias ativo
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{a.caption}</p>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={a.libraryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Meta Ad Library
                            </a>
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                            Abre a biblioteca de anúncios da Meta em nova aba
                          </TooltipContent>
                        </Tooltip>
                        <button
                          onClick={() => {
                            const cap: CapturedCreative = {
                              id: uid('cap'),
                              source: 'anuncio',
                              sourceUrl: a.libraryUrl,
                              author: a.advertiser,
                              mediaType: 'image',
                              caption: a.caption,
                              transcript: '',
                              capturedAt: new Date().toISOString(),
                              analysis: null,
                            }
                            saveCapturedCreative(cap)
                            toast.success('Salvo na biblioteca!')
                          }}
                          className="text-[10px] text-[#7C5CFC] hover:underline"
                        >
                          Salvar na biblioteca
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {sub === 'biblioteca' && <BibliotecaAdsPanel />}
      {sub === 'academy' && (
        <AcademyPanel
          moduleTitle="Escala"
          lessons={[
            { title: 'Criar anúncios com base no posicionamento', duration: '10 min' },
            { title: 'Criar anúncios modelando outros players', duration: '12 min' },
            { title: 'Lendo a Meta Ad Library', duration: '8 min' },
            { title: 'Modelando criativos de outros players (sem copiar)', duration: '14 min' },
            { title: 'Do primeiro impulso à escala: jornada de anúncios', duration: '16 min' },
          ]}
        />
      )}
    </div>
  )
}

function BibliotecaAdsPanel() {
  const { capturedCreatives, updateCapturedCreative, saveCapturedCreative, brandProfile } =
    usePlatform()
  const { generate } = useAIGeneration()
  const [filter, setFilter] = useState<'Todos' | 'Anuncios' | 'Instagram' | 'Reels'>('Todos')
  const [loading, setLoading] = useState(false)
  const [adaptOpen, setAdaptOpen] = useState<string | null>(null)
  const [adaptText, setAdaptText] = useState<Record<string, string>>({})

  const filtered = capturedCreatives.filter((c) => {
    if (filter === 'Todos') return true
    if (filter === 'Anuncios') return c.source === 'anuncio'
    if (filter === 'Instagram') return c.source === 'instagram'
    if (filter === 'Reels') return c.source === 'reel'
    return true
  })

  const counts = {
    Todos: capturedCreatives.length,
    Anuncios: capturedCreatives.filter((c) => c.source === 'anuncio').length,
    Instagram: capturedCreatives.filter((c) => c.source === 'instagram').length,
    Reels: capturedCreatives.filter((c) => c.source === 'reel').length,
  }

  const analyze = async (id: string) => {
    setLoading(true)
    await generate('analise_anuncio', () => {}, 1000)
    updateCapturedCreative(id, {
      analysis:
        'Estrutura: gancho → agitação → solução → prova → CTA. Criativo validado por longa duração. Adaptável mantendo seu diferencial.',
    })
    setLoading(false)
    toast.success('Análise com IA gerada!')
  }

  const recriar = (c: CapturedCreative) => {
    const novo: CapturedCreative = {
      id: uid('cap'),
      source: 'recriado',
      sourceUrl: c.sourceUrl,
      author: c.author,
      mediaType: c.mediaType,
      caption: `[Recriado] ${c.caption}`,
      transcript: `Recriado a partir do criativo original ${c.id}`,
      capturedAt: new Date().toISOString(),
      analysis: null,
    }
    saveCapturedCreative(novo)
    toast.success('Nova versão recriada e salva na biblioteca!')
  }

  const adaptar = (c: CapturedCreative) => {
    const voice = brandProfile.base.voice || 'direto e próximo'
    const diff = brandProfile.base.differential || 'nosso método'
    const service = brandProfile.base.service || 'nosso serviço'
    const adapted = `Adaptado de: ${c.caption} • ${c.author}\n\n${c.caption}\n\n✦ Reescrito no tom de voz "${voice}", ancorado no diferencial "${diff}" e no serviço "${service}".`
    setAdaptText((s) => ({ ...s, [c.id]: adapted }))
    setAdaptOpen((o) => (o === c.id ? null : c.id))
    toast.success('Copy adaptada ao seu Brand OS!')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['Todos', 'Anuncios', 'Instagram', 'Reels'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library className="w-6 h-6" />}
          title="Biblioteca vazia"
          description="Capture anúncios e posts via extensão. A mesma biblioteca existe como rota global."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                  {c.source}
                </Badge>
                <span className="text-[10px] text-[#9494A8]">
                  {new Date(c.capturedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-3">{c.caption}</p>
              {c.analysis && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 text-[11px] text-emerald-300">
                  {c.analysis}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] gap-1"
                  onClick={() => analyze(c.id)}
                  disabled={loading}
                >
                  <Eye className="w-3 h-3" /> {c.analysis ? 'Ver' : 'Analisar IA'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] gap-1"
                  onClick={() => recriar(c)}
                >
                  <Sparkles className="w-3 h-3" /> Recriar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] gap-1"
                  onClick={() => adaptar(c)}
                >
                  <ArrowRight className="w-3 h-3" /> Adaptar
                </Button>
              </div>
              {adaptOpen === c.id && adaptText[c.id] && (
                <div className="rounded-lg bg-[#7C5CFC]/5 border border-[#7C5CFC]/20 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-[#7C5CFC]">
                    Adaptado ao seu nicho
                  </p>
                  <p className="text-[11px] text-slate-200 whitespace-pre-wrap">
                    {adaptText[c.id]}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adaptText[c.id] || '')
                      toast.success('Copy adaptada copiada!')
                    }}
                    className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
