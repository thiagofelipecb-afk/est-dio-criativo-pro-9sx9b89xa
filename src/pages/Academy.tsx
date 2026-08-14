import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleHeader } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Clock, Play, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Mapeamento dos módulos da plataforma: rota + label da aba Academy local de cada módulo.
// As aulas abaixo são um índice transversal — o player real vive na aba Academy de cada módulo.
type ModuleKey = 'posicionamento' | 'conteudo' | 'funis' | 'escala' | 'vendas'

interface IndexedLesson {
  id: string // mesmo id usado dentro do módulo (chave de progresso compartilhada)
  title: string
  duration: string
  module: ModuleKey
  moduleLabel: string
  level: 'iniciante' | 'intermediário' | 'avançado'
  description: string
  // rota do módulo onde o player real está; a aba Academy é a padrão ao chegar
  route: string
}

const MODULE_LABELS: Record<ModuleKey, string> = {
  posicionamento: 'Posicionamento',
  conteudo: 'Conteúdo',
  funis: 'Funis',
  escala: 'Escala',
  vendas: 'Vendas',
}

const MODULE_ROUTES: Record<ModuleKey, string> = {
  posicionamento: '/posicionamento',
  conteudo: '/modulo-2',
  funis: '/funis',
  escala: '/modulo-5',
  vendas: '/modulo-6',
}

// Índice transversal. IDs correspondem aos usados nas academias locais quando aplicável;
// para módulos cuja academy usa listas simples (sem id estável), geramos ids estáveis
// prefixados pelo módulo para que o progresso seja rastreado de forma estável e compartilhada.
const LESSONS: IndexedLesson[] = [
  // Posicionamento — 3 aulas
  {
    id: 'pos-1',
    title: 'Fundamentos do Brand OS: oferta, ICP e diferencial',
    duration: '12 min',
    module: 'posicionamento',
    moduleLabel: MODULE_LABELS.posicionamento,
    level: 'iniciante',
    description:
      'Como preencher a base do Brand OS (nichos, serviço, público, resultado e diferencial) que alimenta todos os geradores de IA.',
    route: MODULE_ROUTES.posicionamento,
  },
  {
    id: 'pos-2',
    title: 'Pesquisa Completa e Entrevista Guiada',
    duration: '18 min',
    module: 'posicionamento',
    moduleLabel: MODULE_LABELS.posicionamento,
    level: 'intermediário',
    description:
      'Estruture a pesquisa de mercado e a entrevista guiada (G1–G8) para extrair a voz real da marca.',
    route: MODULE_ROUTES.posicionamento,
  },
  {
    id: 'pos-3',
    title: 'Gerando e versionando seus 13 ativos de marca',
    duration: '15 min',
    module: 'posicionamento',
    moduleLabel: MODULE_LABELS.posicionamento,
    level: 'avançado',
    description:
      'Do posicionamento à oferta principal: entenda cada ativo gerado e como versionar o Brand OS.',
    route: MODULE_ROUTES.posicionamento,
  },
  // Conteúdo — 5 aulas (ids alinhados ao catálogo do Módulo 2 quando possível)
  {
    id: 'a1',
    title: 'Estratégia de Conteúdo para Instagram em 2024',
    duration: '18 min',
    module: 'conteudo',
    moduleLabel: MODULE_LABELS.conteudo,
    level: 'iniciante',
    description:
      'Aprenda a estruturar seu Instagram com pilares de conteúdo, frequência e análise de métricas.',
    route: MODULE_ROUTES.conteudo,
  },
  {
    id: 'a2',
    title: 'Como Viralizar no TikTok: Ganchos que Funcionam',
    duration: '14 min',
    module: 'conteudo',
    moduleLabel: MODULE_LABELS.conteudo,
    level: 'intermediário',
    description: 'Domine os 3 primeiros segundos e os padrões de gancho que retêm no TikTok.',
    route: MODULE_ROUTES.conteudo,
  },
  {
    id: 'a3',
    title: 'Roteiro de YouTube que Reteém até o Fim',
    duration: '22 min',
    module: 'conteudo',
    moduleLabel: MODULE_LABELS.conteudo,
    level: 'avançado',
    description: 'Estrutura narrativa para vídeos longos com curva de retenção crescente.',
    route: MODULE_ROUTES.conteudo,
  },
  {
    id: 'a4',
    title: 'Edição Cinematográfica no Celular',
    duration: '16 min',
    module: 'conteudo',
    moduleLabel: MODULE_LABELS.conteudo,
    level: 'intermediário',
    description: 'Cortes, transições e coloração que elevam a percepção de qualidade.',
    route: MODULE_ROUTES.conteudo,
  },
  {
    id: 'a5',
    title: 'Funil de Conteúdo: de Seguidor a Cliente',
    duration: '25 min',
    module: 'conteudo',
    moduleLabel: MODULE_LABELS.conteudo,
    level: 'avançado',
    description: 'Mapeie a jornada do público do topo ao fundo de funil com conteúdo estratégico.',
    route: MODULE_ROUTES.conteudo,
  },
  // Funis — 4 aulas
  {
    id: 'fun-1',
    title: 'Como preencher o Raio-X do negócio',
    duration: '8 min',
    module: 'funis',
    moduleLabel: MODULE_LABELS.funis,
    level: 'iniciante',
    description: 'Preencha os 12 campos do diagnóstico que disparam a recomendação de ecossistema.',
    route: MODULE_ROUTES.funis,
  },
  {
    id: 'fun-2',
    title: 'Entendendo o catálogo de 21 funis',
    duration: '12 min',
    module: 'funis',
    moduleLabel: MODULE_LABELS.funis,
    level: 'intermediário',
    description:
      'Navegue pelo catálogo completo e entenda etapas, ticket e dificuldade de cada funil.',
    route: MODULE_ROUTES.funis,
  },
  {
    id: 'fun-3',
    title: 'Recomendação, troca, aprovação e revisão',
    duration: '10 min',
    module: 'funis',
    moduleLabel: MODULE_LABELS.funis,
    level: 'intermediário',
    description: 'Fluxo de aprovação do ecossistema recomendado e como trocar funis por etapa.',
    route: MODULE_ROUTES.funis,
  },
  {
    id: 'fun-4',
    title: 'Lendo os planos por funil (8 abas)',
    duration: '9 min',
    module: 'funis',
    moduleLabel: MODULE_LABELS.funis,
    level: 'avançado',
    description: 'Estrutura, tech config, cadência, alertas, mapa, ativos e checklist de execução.',
    route: MODULE_ROUTES.funis,
  },
  // Escala — 5 aulas
  {
    id: 'esc-1',
    title: 'Criar anúncios com base no posicionamento',
    duration: '10 min',
    module: 'escala',
    moduleLabel: MODULE_LABELS.escala,
    level: 'iniciante',
    description: 'Gere anúncios alinhados ao Brand OS e ao ecossistema de funis aprovado.',
    route: MODULE_ROUTES.escala,
  },
  {
    id: 'esc-2',
    title: 'Criar anúncios modelando outros players',
    duration: '12 min',
    module: 'escala',
    moduleLabel: MODULE_LABELS.escala,
    level: 'intermediário',
    description: 'Adapte criativos validados mantendo seu diferencial e tom de voz.',
    route: MODULE_ROUTES.escala,
  },
  {
    id: 'esc-3',
    title: 'Lendo a Meta Ad Library',
    duration: '8 min',
    module: 'escala',
    moduleLabel: MODULE_LABELS.escala,
    level: 'iniciante',
    description: 'Intel de anúncios: como ler duração, copy e criativos da concorrência.',
    route: MODULE_ROUTES.escala,
  },
  {
    id: 'esc-4',
    title: 'Modelando criativos de outros players (sem copiar)',
    duration: '14 min',
    module: 'escala',
    moduleLabel: MODULE_LABELS.escala,
    level: 'intermediário',
    description: 'Framework de modelagem ética de criativos de alta performance.',
    route: MODULE_ROUTES.escala,
  },
  {
    id: 'esc-5',
    title: 'Do primeiro impulso à escala: jornada de anúncios',
    duration: '16 min',
    module: 'escala',
    moduleLabel: MODULE_LABELS.escala,
    level: 'avançado',
    description: 'Estrutura de campanhas, testes de criativo e escala sustentável.',
    route: MODULE_ROUTES.escala,
  },
  // Vendas — 5 aulas
  {
    id: 'ven-1',
    title: 'Assistente em tempo real',
    duration: '10 min',
    module: 'vendas',
    moduleLabel: MODULE_LABELS.vendas,
    level: 'iniciante',
    description: 'Como usar o assistente de vendas por etapa comercial e modo de entrada.',
    route: MODULE_ROUTES.vendas,
  },
  {
    id: 'ven-2',
    title: '16 scripts de vendas',
    duration: '15 min',
    module: 'vendas',
    moduleLabel: MODULE_LABELS.vendas,
    level: 'intermediário',
    description: 'Biblioteca de scripts por tipo, com variações editáveis e contexto.',
    route: MODULE_ROUTES.vendas,
  },
  {
    id: 'ven-3',
    title: 'Social selling com perfil capturado',
    duration: '9 min',
    module: 'vendas',
    moduleLabel: MODULE_LABELS.vendas,
    level: 'intermediário',
    description: 'Use o relatório de perfil capturado para abrir conversas com valor.',
    route: MODULE_ROUTES.vendas,
  },
  {
    id: 'ven-4',
    title: 'Tratando objeções comuns por etapa',
    duration: '11 min',
    module: 'vendas',
    moduleLabel: MODULE_LABELS.vendas,
    level: 'avançado',
    description: 'Mapa de objeções e respostas ancoradas no seu diferencial.',
    route: MODULE_ROUTES.vendas,
  },
  {
    id: 'ven-5',
    title: 'Follow-up e fechamento sem ruído',
    duration: '13 min',
    module: 'vendas',
    moduleLabel: MODULE_LABELS.vendas,
    level: 'avançado',
    description: 'Cadência de follow-up e técnicas de fechamento natural.',
    route: MODULE_ROUTES.vendas,
  },
]

const MODULES_ORDER: ModuleKey[] = ['posicionamento', 'conteudo', 'funis', 'escala', 'vendas']

const levelColor: Record<string, string> = {
  iniciante: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  intermediário: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  avançado: 'bg-red-500/15 text-red-400 border-red-500/30',
}

type ProgressMap = Record<string, { completed: boolean; pct: number }>

function loadProgress(): ProgressMap {
  try {
    const saved = localStorage.getItem('lumen_academy_progress')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export default function Academy() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<ProgressMap>(loadProgress)
  const [activeModule, setActiveModule] = useState<ModuleKey | 'all'>('all')

  useEffect(() => {
    localStorage.setItem('lumen_academy_progress', JSON.stringify(progress))
  }, [progress])

  const total = LESSONS.length
  const completed = LESSONS.filter((l) => progress[l.id]?.completed).length
  const globalPct = Math.round((completed / total) * 100)

  // Continuar assistindo: última aula com progresso > 0 e < 100 (maior pct)
  const continueLesson = useMemo(() => {
    const inProgress = LESSONS.filter((l) => {
      const p = progress[l.id]
      return p && p.pct > 0 && p.pct < 100
    }).sort((a, b) => (progress[b.id]?.pct || 0) - (progress[a.id]?.pct || 0))
    return inProgress[0] || null
  }, [progress])

  const filtered =
    activeModule === 'all' ? LESSONS : LESSONS.filter((l) => l.module === activeModule)

  const gotoLesson = (lesson: IndexedLesson) => {
    // Navega para o módulo onde o player real está. A aba Academy é aberta dentro do módulo.
    navigate(lesson.route)
    toast.success(`Abrindo "${lesson.title}" no módulo ${lesson.moduleLabel}.`, {
      description: 'Selecione a aba Academy dentro do módulo para assistir.',
    })
  }

  const resetProgress = () => {
    setProgress({})
    toast.success('Progresso da Academy reiniciado.')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Academy"
        description="Índice transversal de todas as aulas da plataforma. Cada aula abre no módulo onde o player real está — sem duplicar conteúdo."
        icon={<GraduationCap className="w-5 h-5" />}
        accent="#7C5CFC"
      />

      {/* Progresso global */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Progresso global</h3>
            <p className="text-[11px] text-[#9494A8]">
              {completed}/{total} aulas concluídas • compartilhado com as academias de cada módulo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px]">
              {globalPct}%
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-[11px] gap-1.5"
              onClick={resetProgress}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reiniciar progresso
            </Button>
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all"
            style={{ width: `${globalPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {MODULES_ORDER.map((m) => {
            const lessons = LESSONS.filter((l) => l.module === m)
            const done = lessons.filter((l) => progress[l.id]?.completed).length
            const pct = Math.round((done / lessons.length) * 100)
            return (
              <div key={m} className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
                <p className="text-[10px] font-semibold text-[#9494A8] uppercase">
                  {MODULE_LABELS[m]}
                </p>
                <p className="text-sm font-bold text-white">
                  {done}/{lessons.length}
                </p>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Continuar assistindo */}
      {continueLesson && (
        <div className="rounded-2xl bg-gradient-to-r from-[#7C5CFC]/15 to-[#22D3EE]/10 border border-[#7C5CFC]/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-[#7C5CFC]" />
            <span className="text-xs font-bold text-white">Continuar assistindo</span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{continueLesson.title}</p>
              <p className="text-[11px] text-[#9494A8]">
                {continueLesson.moduleLabel} • {continueLesson.duration} •{' '}
                {progress[continueLesson.id]?.pct || 0}%
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => gotoLesson(continueLesson)}
              className="bg-[#7C5CFC] text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Retomar no módulo
            </Button>
          </div>
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE]"
              style={{ width: `${progress[continueLesson.id]?.pct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Filtros por módulo */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveModule('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeModule === 'all' ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8]'}`}
        >
          Todos ({total})
        </button>
        {MODULES_ORDER.map((m) => {
          const count = LESSONS.filter((l) => l.module === m).length
          return (
            <button
              key={m}
              onClick={() => setActiveModule(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeModule === m ? 'bg-[#7C5CFC] text-white' : 'bg-[#1C1C27] text-[#9494A8]'}`}
            >
              {MODULE_LABELS[m]} ({count})
            </button>
          )
        })}
      </div>

      {/* Cards de aulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lesson) => {
          const p = progress[lesson.id] || { completed: false, pct: 0 }
          return (
            <div
              key={lesson.id}
              className="rounded-xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/40 overflow-hidden transition-all flex flex-col"
            >
              <div className="relative aspect-video bg-[#1C1C27] overflow-hidden group">
                <img
                  src={`https://img.usecurling.com/p/640/360?q=${encodeURIComponent(lesson.moduleLabel + ' marketing lesson')}&color=purple`}
                  alt={lesson.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <Badge className={`absolute top-2 left-2 ${levelColor[lesson.level]} text-[9px]`}>
                  {lesson.level}
                </Badge>
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                </span>
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[9px]">
                    {lesson.moduleLabel}
                  </Badge>
                  {p.completed && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Concluído
                    </Badge>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-2">{lesson.title}</h4>
                <p className="text-[11px] text-[#9494A8] line-clamp-2 flex-1">
                  {lesson.description}
                </p>
                <div className="pt-1">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#9494A8] mt-1">{p.pct}% assistido</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] gap-1.5 w-full mt-1"
                  onClick={() => gotoLesson(lesson)}
                >
                  Assistir no módulo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
