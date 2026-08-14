import React from 'react'
import { ModuleHeader, inputClass, Field } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Play, CheckCircle2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function Assessoria() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Assessoria de Implementação"
        description="Upsell de implementação completa: posicionamento, conteúdo, funis e escala feitos com você."
        icon={<Briefcase className="w-5 h-5" />}
        accent="#7C5CFC"
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1C27] via-[#14141C] to-[#0B0B10] border border-[#7C5CFC]/30 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-[#7C5CFC]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <Badge className="bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/30">
            Vagas limitadas
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Implementação completa da sua máquina de marketing com IA
          </h2>
          <p className="text-sm text-[#9494A8] max-w-xl">
            Posicionamento, conteúdo, funis e escala implementados por especialistas, com a sua
            marca e a plataforma trabalhando juntas.
          </p>
          {/* Vídeo de apresentação */}
          <div className="aspect-video rounded-xl bg-black border border-white/10 flex items-center justify-center max-w-xl">
            <div className="text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] mb-2">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <p className="text-xs text-[#9494A8]">Vídeo de apresentação</p>
            </div>
          </div>
        </div>
      </div>

      {/* O que está incluído */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          'Brand OS completo com entrevista guiada',
          'Ecossistema de funis aprovado',
          'Páginas e roteiros de vídeo',
          'Calendário de conteúdo pronto',
          'Biblioteca de referências modelada',
          'Acompanhamento de implementação',
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-xl bg-[#14141C] border border-white/5 p-3"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-200">{item}</span>
          </div>
        ))}
      </div>

      {/* Formulário / Survey */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Aplicar para uma vaga</h3>
        <p className="text-xs text-[#9494A8]">
          Preencha o formulário e nossa equipe entrará em contato em até 48h.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome">
            <input className={inputClass} placeholder="Seu nome" />
          </Field>
          <Field label="E-mail">
            <input className={inputClass} placeholder="voce@email.com" />
          </Field>
          <Field label="Nicho">
            <input className={inputClass} placeholder="Seu nicho de atuação" />
          </Field>
          <Field label="Faturamento atual">
            <input className={inputClass} placeholder="R$ /mês" />
          </Field>
        </div>
        <Field label="Qual seu maior desafio hoje?">
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Conte um pouco sobre sua situação…"
          />
        </Field>
        <Button
          onClick={() => toast.success('Aplicação enviada! Em até 48h entraremos em contato.')}
          className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] text-xs gap-1.5"
        >
          Aplicar para uma vaga <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
