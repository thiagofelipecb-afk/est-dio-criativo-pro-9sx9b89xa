import React, { useState, useEffect } from 'react'
import { ModuleHeader } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Smartphone,
  Film,
  Layers,
  Mic,
  Camera,
  Apple,
  Chrome,
  ArrowRight,
  Monitor,
  Share,
  Plus,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function VersaoMobile() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<'iphone' | 'android'>('iphone')
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const check = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari fallback
      (window.navigator as any).standalone === true
    setIsStandalone(check())
  }, [])

  const installSteps =
    platform === 'iphone'
      ? [
          {
            icon: <Apple className="w-4 h-4" />,
            title: 'Abrir no Safari',
            desc: 'Acesse a URL do LUMEN Studio no Safari do iPhone (o Chrome no iOS não suporta instalar PWA).',
          },
          {
            icon: <Share className="w-4 h-4" />,
            title: 'Toque em Compartilhar',
            desc: 'Toque no ícone de Compartilhar (quadrado com seta para cima) na barra inferior.',
          },
          {
            icon: <Plus className="w-4 h-4" />,
            title: 'Adicionar à Tela de Início',
            desc: 'Role e selecione "Adicionar à Tela de Início". Confirme. O ícone do LUMEN aparecerá na tela inicial.',
          },
        ]
      : [
          {
            icon: <Chrome className="w-4 h-4" />,
            title: 'Abrir no Chrome',
            desc: 'Acesse a URL do LUMEN Studio no Google Chrome do Android.',
          },
          {
            icon: <Share className="w-4 h-4" />,
            title: 'Menu (⋮) ou banner',
            desc: 'Toque no menu de três pontos (⋮) no canto superior — ou aceite o banner "Instalar app" se aparecer.',
          },
          {
            icon: <Plus className="w-4 h-4" />,
            title: 'Adicionar à tela inicial',
            desc: 'Escolha "Adicionar à tela inicial" e confirme. O LUMEN será instalado como app.',
          },
        ]

  const mobileFeatures = [
    {
      icon: <Film className="w-5 h-5 text-[#7C5CFC]" />,
      title: 'Reels',
      desc: 'Grave e edite roteiros por blocos com teleprompter.',
      path: '/gravadora',
    },
    {
      icon: <Layers className="w-5 h-5 text-[#22D3EE]" />,
      title: 'Stories',
      desc: 'Sequências com arcos narrativos (FIO) otimizadas para vertical.',
      path: '/carrossel',
    },
    {
      icon: <Mic className="w-5 h-5 text-emerald-400" />,
      title: 'Teleprompter',
      desc: 'Leia seu roteiro enquanto grava, com controle de velocidade.',
      path: '/teleprompter',
    },
    {
      icon: <Camera className="w-5 h-5 text-amber-400" />,
      title: 'Captura',
      desc: 'Capture criativos de referência direto do navegador mobile.',
      path: '/biblioteca',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Versão Mobile (PWA)"
        description="Instale o LUMEN Studio como app no celular. Foco em criação mobile — todos os módulos seguem disponíveis no desktop."
        icon={<Smartphone className="w-5 h-5" />}
        accent="#22D3EE"
      />

      {/* PWA Ready badge */}
      {isStandalone && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            PWA Ready — você está rodando o LUMEN como app instalado.
          </span>
        </div>
      )}

      {/* Instalação — 3 passos */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">Como instalar (PWA)</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPlatform('iphone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${platform === 'iphone' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              <Apple className="w-3.5 h-3.5" /> iOS
            </button>
            <button
              onClick={() => setPlatform('android')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${platform === 'android' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              <Chrome className="w-3.5 h-3.5" /> Android
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {installSteps.map((s, i) => (
            <div key={i} className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] text-[11px] font-bold">
                  {i + 1}
                </span>
                <span className="text-[#22D3EE]">{s.icon}</span>
              </div>
              <p className="text-xs font-bold text-white">{s.title}</p>
              <p className="text-[11px] text-[#9494A8] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#9494A8]">
          Após instalar, faça login com o mesmo e-mail — seus dados sincronizam pelo navegador.
        </p>
      </div>

      {/* Experiência Mobile */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-sm font-bold text-white">Experiência Mobile otimizada</h3>
        </div>
        <p className="text-xs text-[#9494A8]">
          Estes fluxos foram pensados para uso no celular, em formato vertical e toque:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mobileFeatures.map((f) => (
            <button
              key={f.title}
              onClick={() => navigate(f.path)}
              className="flex items-center gap-3 rounded-xl bg-[#0e0e15]/60 border border-white/5 hover:border-[#22D3EE]/40 p-3 text-left transition-all"
            >
              <span className="shrink-0">{f.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{f.title}</p>
                <p className="text-[10px] text-[#9494A8]">{f.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#9494A8] shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[#7C5CFC]" />
          <h3 className="text-sm font-bold text-white">Desktop</h3>
        </div>
        <p className="text-xs text-[#9494A8]">
          Todos os módulos da plataforma estão disponíveis no computador, com a experiência completa
          de edição e gestão:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            'Posicionamento',
            'Conteúdo',
            'Funis',
            'Ativos',
            'Escala',
            'Vendas',
            'Editor de Vídeo',
            'Carrossel',
            'Post Estático',
            'Agendamento',
            'Biblioteca',
            'Métricas',
            'Academy',
          ].map((m) => (
            <Badge key={m} className="bg-white/5 text-slate-300 border-white/10 text-[10px]">
              {m}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => navigate('/gravadora')}
          className="flex-1 bg-[#22D3EE] text-black text-xs gap-1.5"
        >
          <Film className="w-4 h-4" /> Abrir Gravadora
        </Button>
        <Button
          onClick={() => {
            toast.success('Dica: no iPhone use o Safari; no Android use o Chrome.')
          }}
          variant="outline"
          className="flex-1 border-white/10 text-xs gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Repetir dica de instalação
        </Button>
      </div>
    </div>
  )
}
