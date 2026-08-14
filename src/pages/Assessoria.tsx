import React, { useState } from 'react'
import { ModuleHeader, inputClass, Field } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Play, ArrowRight, Users, GitBranch, Clapperboard, X } from 'lucide-react'
import { toast } from 'sonner'

interface AssessoriaRequest {
  id: string
  nome: string
  email: string
  servico: string
  mensagem: string
  createdAt: string
}

const SERVICE_OPTIONS = [
  { id: 'mentoria', label: 'Mentoria 1:1' },
  { id: 'funis', label: 'Análise de Funis' },
  { id: 'producao', label: 'Produção de Conteúdo' },
]

export default function Assessoria() {
  const [formOpen, setFormOpen] = useState(false)
  const [preselected, setPreselected] = useState<string>('mentoria')
  const [form, setForm] = useState({ nome: '', email: '', servico: 'mentoria', mensagem: '' })

  const openForm = (servicoId: string) => {
    setPreselected(servicoId)
    setForm((f) => ({ ...f, servico: servicoId }))
    setFormOpen(true)
  }

  const submit = () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error('Preencha nome e e-mail.')
      return
    }
    const req: AssessoriaRequest = {
      id: `ass-${Date.now()}`,
      nome: form.nome,
      email: form.email,
      servico: form.servico,
      mensagem: form.mensagem,
      createdAt: new Date().toISOString(),
    }
    try {
      const saved = localStorage.getItem('lumen_assessoria')
      const arr: AssessoriaRequest[] = saved ? JSON.parse(saved) : []
      arr.push(req)
      localStorage.setItem('lumen_assessoria', JSON.stringify(arr))
    } catch {
      localStorage.setItem('lumen_assessoria', JSON.stringify([req]))
    }
    setForm({ nome: '', email: '', servico: 'mentoria', mensagem: '' })
    setFormOpen(false)
    toast.success('Solicitação enviada! Entraremos em contato em até 48h.', {
      description: `Serviço: ${SERVICE_OPTIONS.find((s) => s.id === req.servico)?.label}`,
    })
  }

  const services = [
    {
      id: 'mentoria',
      icon: <Users className="w-5 h-5 text-[#7C5CFC]" />,
      title: 'Mentoria 1:1',
      desc: 'Sessões individuais para estruturar seu posicionamento, conteúdo e funis com acompanhamento próximo de um especialista.',
      points: ['Diagnóstico personalizado', 'Plano de ação semanal', 'Suporte direto'],
    },
    {
      id: 'funis',
      icon: <GitBranch className="w-5 h-5 text-[#22D3EE]" />,
      title: 'Análise de Funis',
      desc: 'Auditoria completa do seu ecossistema de funis, com recomendações de etapas, ativos e cadência para escalar.',
      points: ['Raio-X aprofundado', 'Recomendação de ecossistema', 'Plano de execução'],
    },
    {
      id: 'producao',
      icon: <Clapperboard className="w-5 h-5 text-emerald-400" />,
      title: 'Produção de Conteúdo',
      desc: 'Produzimos roteiros, páginas e criativos com você, aplicando seu Brand OS e o catálogo de funis da plataforma.',
      points: ['Roteiros e páginas', 'Calendário pronto', 'Criativos validados'],
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Assessoria"
        description="Ajuda personalizada para implementar sua máquina de marketing com IA — separada do produto operacional."
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
            Precisa de ajuda personalizada?
          </h2>
          <p className="text-sm text-[#9494A8] max-w-xl">
            Implementação completa da sua máquina de marketing com IA — posicionamento, conteúdo,
            funis e escala feitos com você por especialistas, com sua marca e a plataforma
            trabalhando juntas.
          </p>
          {/* Vídeo placeholder 16:9 */}
          <div className="aspect-video rounded-xl bg-black border border-white/10 flex items-center justify-center max-w-xl">
            <div className="text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] mb-2">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <p className="text-xs text-[#9494A8]">Vídeo de apresentação em breve</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 cards de serviços */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3 flex flex-col"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/5">
              {s.icon}
            </div>
            <h3 className="text-sm font-bold text-white">{s.title}</h3>
            <p className="text-xs text-[#9494A8] leading-relaxed flex-1">{s.desc}</p>
            <ul className="space-y-1">
              {s.points.map((p) => (
                <li key={p} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#22D3EE]" /> {p}
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              onClick={() => openForm(s.id)}
              className="bg-[#7C5CFC] text-xs gap-1.5 w-full"
            >
              Solicitar <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Modal do formulário */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#14141C] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Solicitar assessoria</h3>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1 rounded text-[#9494A8] hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome" required>
                <input
                  aria-label="Nome"
                  className={inputClass}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Seu nome"
                />
              </Field>
              <Field label="E-mail" required>
                <input
                  type="email"
                  aria-label="E-mail"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="voce@email.com"
                />
              </Field>
            </div>
            <Field label="Serviço desejado">
              <select
                aria-label="Serviço desejado"
                className={inputClass}
                value={form.servico}
                onChange={(e) => setForm({ ...form, servico: e.target.value })}
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mensagem">
              <textarea
                aria-label="Mensagem"
                className={inputClass}
                rows={3}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                placeholder="Conte um pouco sobre seu momento e objetivo…"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={submit} className="bg-[#7C5CFC] text-xs gap-1.5">
                Enviar <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
