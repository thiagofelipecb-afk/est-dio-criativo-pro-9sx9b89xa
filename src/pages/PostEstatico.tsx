import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { StaticPostProject } from '@/types/studio'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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
} from 'lucide-react'
import { toast } from 'sonner'

export default function PostEstatico() {
  const navigate = useNavigate()
  const { staticPosts, saveStaticPost, schedulePost } = useStudio()

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
