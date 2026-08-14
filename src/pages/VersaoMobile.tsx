import React, { useState } from 'react'
import { ModuleHeader } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Smartphone, QrCode, Film, Layers, Apple, Chrome, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function VersaoMobile() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<'iphone' | 'android'>('iphone')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Versão Mobile (PWA)"
        description="Instale o app no celular focado em criar Reels e Stories. Demais módulos permanecem no computador."
        icon={<Smartphone className="w-5 h-5" />}
        accent="#22D3EE"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR + instalação */}
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Instalação por QR Code</h3>
          <div className="flex items-center justify-center p-6 bg-white rounded-xl">
            <div className="grid grid-cols-12 gap-0.5 w-48 h-48">
              {Array.from({ length: 144 }).map((_, i) => {
                const on =
                  (i * 7 + (i % 11) * 3) % 3 === 0 ||
                  (i < 36 && i % 12 < 3 && i < 12) ||
                  (i < 36 && i % 12 > 8 && i < 12)
                return <div key={i} className={`${on ? 'bg-black' : 'bg-white'}`} />
              })}
            </div>
          </div>
          <p className="text-center text-[11px] text-[#9494A8]">
            Aponte a câmera do celular para instalar
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPlatform('iphone')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${platform === 'iphone' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              <Apple className="w-4 h-4" /> iPhone / Safari
            </button>
            <button
              onClick={() => setPlatform('android')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${platform === 'android' ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              <Chrome className="w-4 h-4" /> Android / Chrome
            </button>
          </div>
          <div className="rounded-lg bg-[#0e0e15]/60 p-3 text-[11px] text-slate-300 space-y-1">
            {platform === 'iphone' ? (
              <>
                <p>1. Abra o Safari e acesse a URL do app</p>
                <p>2. Toque em Compartilhar → Adicionar à Tela de Início</p>
                <p>3. Confirme. O ícone será adicionado à tela inicial</p>
                <p>4. Faça login com o mesmo e-mail</p>
              </>
            ) : (
              <>
                <p>1. Abra o Chrome no celular e acesse a URL do app</p>
                <p>2. Toque no menu (⋮) → Adicionar à tela inicial</p>
                <p>3. Confirme. O ícone será adicionado</p>
                <p>4. Faça login com o mesmo e-mail</p>
              </>
            )}
          </div>
        </div>

        {/* Escopo */}
        <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">O que você pode fazer no mobile</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg bg-[#0e0e15]/60 p-3">
              <Film className="w-5 h-5 text-[#7C5CFC]" />
              <div>
                <p className="text-xs font-semibold text-white">Criar Reels</p>
                <p className="text-[10px] text-[#9494A8]">Grave e edite roteiros por blocos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-[#0e0e15]/60 p-3">
              <Layers className="w-5 h-5 text-[#22D3EE]" />
              <div>
                <p className="text-xs font-semibold text-white">Criar Stories (FIO)</p>
                <p className="text-[10px] text-[#9494A8]">Sequências com arcos narrativos</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-[11px] text-amber-300">
            Os demais módulos (Posicionamento, Funis, Ativos, Escala, Vendas) permanecem no
            computador para a experiência completa.
          </div>
          <Button
            onClick={() => navigate('/gravadora')}
            className="w-full bg-[#22D3EE] text-black text-xs gap-1.5"
          >
            <ArrowRight className="w-4 h-4" /> Abrir gravadora
          </Button>
        </div>
      </div>
    </div>
  )
}
