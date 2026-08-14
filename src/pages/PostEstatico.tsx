import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { usePlatform } from '@/context/PlatformContext'
import { StaticPostProject } from '@/types/studio'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FileImage,
  Download,
  Calendar,
  Sparkles,
  Type,
  Palette,
  Eye,
  Sliders,
  Check,
  ShieldCheck,
  Smile,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ContentBlock, FunnelStage, Awareness } from '@/types/platform'

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

export default function PostEstatico() {
  const navigate = useNavigate()
  const { staticPosts, saveStaticPost, schedulePost } = useStudio()
  const { hasBrandOS, brandProfile, saveContentItem } = usePlatform()

  const [post, setPost] = useState<StaticPostProject>(() => {
    return (
      staticPosts[0] || {
        id: 'post-new-' + Date.now(),
        title: 'Frase Motivacional Tech',
        aspectRatio: '1:1',
        bgType: 'gradient',
        bgColor: '#14141C',
        bgGradient: 'from-violet-950 via-slate-950 to-cyan-950',
        blurAmount: 0,
        headline: 'A consistência vence o algoritmo todos os dias.',
        subtitle: 'Não espere a inspiração perfeita: publique, analise e evolua.',
        authorName: 'LUMEN Studio',
        authorHandle: '@lumenstudio.ia',
        authorAvatar: 'https://img.usecurling.com/ppl/medium?seed=42',
        badgeText: 'INSIGHT DO DIA',
        watermark: true,
        filter: 'cinematic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: 'https://img.usecurling.com/p/1080/1080?q=cyberpunk+quote+studio&color=purple',
      }
    )
  })

  const updatePost = (updates: Partial<StaticPostProject>) => {
    const updated = { ...post, ...updates, updatedAt: new Date().toISOString() }
    setPost(updated)
    saveStaticPost(updated)
  }

  // === Painel de configuração (Topo de funil / Consciência / CTA / Tema / Detalhes) ===
  const [showConfig, setShowConfig] = useState(true)
  const [objective, setObjective] = useState<FunnelStage>(
    (post as any).funnelStage || (post as any).funnel_stage || 'topo',
  )
  const [awareness, setAwareness] = useState<Awareness>((post as any).awareness || 3)
  const [cta, setCta] = useState((post as any).cta || 'Comentar')
  const [theme, setTheme] = useState((post as any).theme || '')
  const [details, setDetails] = useState((post as any).details || '')

  // Autosave do briefing com debounce 2s
  useEffect(() => {
    const t = setTimeout(() => {
      const briefing = { objective, awareness, cta, theme, details }
      localStorage.setItem('lumen_post_briefing', JSON.stringify(briefing))
    }, 2000)
    return () => clearTimeout(t)
  }, [objective, awareness, cta, theme, details])

  useEffect(() => {
    const saved = localStorage.getItem('lumen_post_briefing')
    if (saved) {
      try {
        const v = JSON.parse(saved)
        if (v.objective) setObjective(v.objective)
        if (v.awareness) setAwareness(v.awareness)
        if (v.cta) setCta(v.cta)
        if (v.theme) setTheme(v.theme)
        if (v.details) setDetails(v.details)
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  // === Saída editável por blocos (ContentBlock) ===
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    const saved = localStorage.getItem('lumen_post_blocks')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* intentionally ignored */
      }
    }
    return [
      newBlock('headline', 0, post.headline, false),
      newBlock('body', 1, post.subtitle, false),
      newBlock('cta', 2, cta, false),
      newBlock('hashtags', 3, '#lumenstudio #criadores #conteudo', false),
      newBlock('caption', 4, `${post.headline} — ${post.subtitle}`, false),
    ]
  })

  // Autosave dos blocos com debounce 2s
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem('lumen_post_blocks', JSON.stringify(blocks))
    }, 2000)
    return () => clearTimeout(t)
  }, [blocks])

  const updateBlock = (id: string, text: string) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, text, version: b.version + 1 } : b)))
  }

  const regenBlock = (b: ContentBlock) => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.', {
        description: 'A regeneração usa o Brand OS ativo como contexto.',
      })
      return
    }
    const diff = brandProfile.base.differential || 'entrega de valor'
    const variants = [
      `${b.text.replace(/\.$/, '')} — e é por isso que ${diff.toLowerCase()}.`,
      `Reescrito: ${b.text}`,
      `${b.text}\n\n→ ${diff}.`,
    ]
    updateBlock(b.id, variants[Math.floor(Math.random() * variants.length)])
    toast.success('Bloco regenerado com IA (simulada).')
  }

  const generateBlocks = () => {
    if (!hasBrandOS) {
      toast.error('Configure seu Brand OS primeiro em Posicionamento.', {
        action: { label: 'Tentar novamente', onClick: generateBlocks },
      })
      return
    }
    if (!theme.trim()) {
      toast.error('Informe o tema antes de gerar.')
      return
    }
    const aud = brandProfile.base.audience || 'criador'
    const diff = brandProfile.base.differential || 'foco em execução com método'
    setBlocks([
      newBlock(
        'headline',
        0,
        `Você não precisa de mais ${theme.toLowerCase()}. Precisa de método.`,
        true,
      ),
      newBlock(
        'body',
        1,
        `Se você é ${aud} e ainda ${theme.toLowerCase()} sem estratégia, está perdendo tempo.\n\nAqui vai o que realmente funciona: ${diff}.${details ? `\n\n${details}` : ''}`,
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
      newBlock('caption', 4, `${theme} — salve este post para consultar depois. ${diff}.`, true),
    ])
    // Salva como ContentItem no Módulo Conteúdo
    const id = uid('post')
    saveContentItem({
      id,
      type: 'post',
      title: theme,
      blocks,
      funnelStage: objective,
      funnel_stage: objective,
      awareness,
      cta,
      status: 'gerado',
      contextVersion: brandProfile.activeVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme,
      objective: `${objective} • consciência ${awareness}`,
      brand_profile_version_id: `brand-os-v${brandProfile.activeVersion}`,
      prompt_version: '1.0',
      model: 'lumen-simulated-v1',
      generated_at: new Date().toISOString(),
    })
    toast.success('Conteúdo gerado por blocos e salvo no Módulo Conteúdo!')
  }

  const handleExport = () => {
    toast.success('Imagem exportada em ultra definição (PNG)!')
  }

  const handleSchedule = () => {
    schedulePost({
      title: post.title,
      mediaUrl: post.thumbnail,
      mediaType: 'post',
      platforms: ['instagram'],
      scheduledDate: new Date(Date.now() + 3600000 * 18).toISOString(),
      caption: `"${post.headline}" ✨ ${post.subtitle} #lumenstudio #mindset #criadores`,
      hashtags: ['#lumenstudio', '#frasedodia', '#criacaodeconteudo', '#marketing'],
      status: 'scheduled',
    })
    navigate('/agendamento')
    toast.success('Post agendado para publicação!')
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto gap-4 overflow-y-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projetos')}
            className="text-xs text-[#9494A8] hover:text-white"
          >
            ← Voltar
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <FileImage className="w-6 h-6 text-amber-400" />
              Criador de Post Estático
            </h1>
            <p className="text-xs text-[#9494A8]">
              Design de citações, anúncios e imagens de alto impacto para Feed, Stories e Quadrados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExport}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-xs font-semibold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Imagem
          </Button>

          <Button
            size="sm"
            onClick={handleSchedule}
            className="bg-[#22D3EE] hover:bg-[#1CBAD1] text-black text-xs font-bold gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> Agendar Post
          </Button>
        </div>
      </div>

      {/* === PAINEL DE CONFIGURAÇÃO (Objetivo / Consciência / CTA / Tema / Detalhes) === */}
      <div className="rounded-2xl bg-[#14141C] border border-white/10 p-4 space-y-3">
        <button
          onClick={() => setShowConfig((s) => !s)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#7C5CFC]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Configuração do conteúdo
            </h3>
            {hasBrandOS ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
                Brand OS v{brandProfile.activeVersion}
              </Badge>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] cursor-help">
                    Brand OS pendente
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                  Configure seu Brand OS primeiro em Posicionamento para gerar conteúdo.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {showConfig ? (
            <ChevronUp className="w-4 h-4 text-[#9494A8]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#9494A8]" />
          )}
        </button>
        {showConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Objetivo</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as FunnelStage)}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              >
                <option value="topo">Topo de Funil</option>
                <option value="meio">Meio de Funil</option>
                <option value="fundo">Fundo de Funil</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">
                Nível de Consciência: <span className="text-white font-bold">{awareness}</span>
                <span className="text-[#9494A8]/60 ml-1">(Eugene Schwartz)</span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setAwareness(n as Awareness)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      awareness === n
                        ? 'bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/40'
                        : 'bg-[#1C1C27] text-[#9494A8] border-white/10 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">CTA</label>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Ex: Comentar, Salvar, Link na bio"
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Tema *</label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Erros ao criar conteúdo"
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-[#9494A8] block mb-1">Detalhes (opcional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                placeholder="Contexto adicional para a geração…"
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      onClick={generateBlocks}
                      disabled={!hasBrandOS || !theme.trim()}
                      className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-xs font-semibold gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Gerar conteúdo por blocos
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasBrandOS && (
                  <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                    Configure seu Brand OS primeiro em Posicionamento.
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* === SAÍDA EDITÁVEL POR BLOCOS (ContentBlock) === */}
      <div className="rounded-2xl bg-[#14141C] border border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#22D3EE]" /> Saída por blocos (editável)
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-[11px] gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(blocks.map((b) => b.text).join('\n\n'))
              toast.success('Copy completa copiada!')
            }}
          >
            <Copy className="w-3 h-3" /> Copiar tudo
          </Button>
        </div>
        {blocks.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-white/10 bg-[#0e0e15]/60 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC]">
                  {b.blockType}
                </span>
                {b.aiGenerated && (
                  <Badge className="bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/20 text-[9px]">
                    IA
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(b.text)
                    toast.success('Bloco copiado!')
                  }}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5"
                  title="Copiar"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => regenBlock(b)}
                  className="p-1 rounded text-[#22D3EE] hover:bg-[#22D3EE]/10"
                  title="Regenerar bloco"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </div>
            <textarea
              value={b.text}
              onChange={(e) => updateBlock(b.id, e.target.value)}
              rows={Math.min(6, Math.max(2, b.text.split('\n').length))}
              className="w-full bg-[#1C1C27] border border-white/10 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] resize-none leading-relaxed"
            />
          </div>
        ))}
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[500px]">
        {/* CENTER POST CANVAS (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-[#07070A] rounded-2xl border border-white/10 p-6 relative shadow-2xl">
          {/* Ratio Switcher Bar */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 z-20">
            {(['1:1', '4:5', '9:16'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => updatePost({ aspectRatio: ratio })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  post.aspectRatio === ratio
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#9494A8] hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Post Visual Canvas */}
          <div
            className={`relative rounded-2xl shadow-2xl border border-white/15 p-8 flex flex-col justify-between overflow-hidden transition-all ${
              post.aspectRatio === '1:1'
                ? 'w-[360px] sm:w-[400px] aspect-square'
                : post.aspectRatio === '4:5'
                  ? 'w-[340px] sm:w-[380px] aspect-[4/5]'
                  : 'w-[280px] sm:w-[320px] aspect-[9/16]'
            } ${post.bgType === 'gradient' ? `bg-gradient-to-br ${post.bgGradient}` : ''}`}
            style={{
              backgroundColor: post.bgType === 'color' ? post.bgColor : undefined,
              filter:
                post.filter === 'cinematic'
                  ? 'contrast(115%) saturate(120%)'
                  : post.filter === 'vintage'
                    ? 'sepia(30%)'
                    : 'none',
            }}
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase text-[#22D3EE] border border-white/10">
                {post.badgeText}
              </span>
              {post.watermark && (
                <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">
                  LUMEN STUDIO
                </span>
              )}
            </div>

            {/* Central Headline and Subtitle */}
            <div className="space-y-4 my-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight drop-shadow-md">
                "{post.headline}"
              </h2>
              {post.subtitle && (
                <p className="text-sm text-slate-300 leading-relaxed drop-shadow">
                  {post.subtitle}
                </p>
              )}
            </div>

            {/* Author Card Footer */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7C5CFC]"
              />
              <div>
                <h4 className="text-xs font-bold text-white">{post.authorName}</h4>
                <p className="text-[11px] text-[#22D3EE] font-mono">{post.authorHandle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PROPERTY CONTROLS (4 cols) */}
        <div className="lg:col-span-4 bg-[#14141C] border border-white/10 rounded-2xl p-4 space-y-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/5">
            <Type className="w-3.5 h-3.5 text-amber-400" />
            Configurações do Post
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Frase de Destaque</label>
              <textarea
                value={post.headline}
                onChange={(e) => updatePost({ headline: e.target.value })}
                rows={3}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">
                Subtítulo / Explicação
              </label>
              <textarea
                value={post.subtitle}
                onChange={(e) => updatePost({ subtitle: e.target.value })}
                rows={2}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#9494A8] block mb-1">Badge Superior</label>
              <input
                type="text"
                value={post.badgeText}
                onChange={(e) => updatePost({ badgeText: e.target.value })}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            {/* Gradient Switcher */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-[11px] text-[#9494A8] block">Paleta de Fundo</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    id: 'g1',
                    label: 'Violeta / Ciano',
                    grad: 'from-violet-950 via-slate-950 to-cyan-950',
                  },
                  { id: 'g2', label: 'Dark Neon', grad: 'from-purple-950 via-black to-slate-950' },
                  {
                    id: 'g3',
                    label: 'Âmbar Dourado',
                    grad: 'from-amber-950 via-slate-950 to-black',
                  },
                  { id: 'g4', label: 'Esmeralda', grad: 'from-emerald-950 via-slate-950 to-black' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => updatePost({ bgType: 'gradient', bgGradient: g.grad })}
                    className="p-2 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 text-[11px] font-medium text-white"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark toggle */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-[#9494A8]">Marca d'água LUMEN</span>
              <Switch
                checked={post.watermark}
                onCheckedChange={(val) => updatePost({ watermark: val })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
