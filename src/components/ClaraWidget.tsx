import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { useStudio } from '@/context/StudioContext'
import type { Project } from '@/types/studio'
import {
  Sparkles,
  X,
  Send,
  Bot,
  Trash2,
  Video,
  Hash,
  Type,
  Film,
  Scissors,
  Copy,
  Check,
} from 'lucide-react'
import {
  analyzeVideo,
  suggestHashtags,
  suggestTitles,
  suggestBRoll,
  transformToShorts,
  fmtTimecode,
  type VideoSegment,
  type HashtagSuggestion,
  type BrollSuggestion,
} from '@/lib/clara-heuristics'

interface ClaraMessage {
  role: 'clara' | 'user'
  text: string
  at: string
  /** Resultado estruturado opcional (para cards acionáveis). */
  result?: ClaraResult
}

type ClaraResult =
  | { kind: 'video-analysis'; segments: VideoSegment[]; summary: string }
  | { kind: 'hashtags'; suggestions: HashtagSuggestion[] }
  | { kind: 'titles'; titles: string[] }
  | { kind: 'broll'; suggestions: BrollSuggestion[] }
  | { kind: 'shorts'; script: string; estimatedSec: number }

const STORAGE_KEY = 'lumen_clara'
const MAX_MESSAGES = 50

function loadMessages(): ClaraMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed?.messages && Array.isArray(parsed.messages)) return parsed.messages
    }
  } catch {
    /* ignore */
  }
  return [
    {
      role: 'clara',
      text: 'Olá! Eu sou a Clara, sua assistente de marketing com IA. Como posso ajudar você hoje?',
      at: new Date().toISOString(),
    },
  ]
}

function saveMessages(messages: ClaraMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }))
  } catch {
    /* ignore */
  }
}

// Mapeia a rota atual para um contexto de módulo amigável
const ROUTE_CONTEXT: { match: RegExp; label: string; help: string }[] = [
  {
    match: /^\/posicionamento|modulo-1/,
    label: 'Posicionamento',
    help: 'Posso ajudar com a Pesquisa Completa, a Entrevista Guiada e a geração dos 13 ativos do Brand OS.',
  },
  {
    match: /modulo-2|\/conteudo/,
    label: 'Conteúdo',
    help: 'Posso sugerir pilares de conteúdo, ideias e estruturas de roteiro para Reels, TikTok e YouTube.',
  },
  {
    match: /\/funis/,
    label: 'Funis',
    help: 'Posso ajudar com o Raio-X, recomendações de funil, aprovação do ecossistema e planos por etapa.',
  },
  {
    match: /modulo-4|\/ativos/,
    label: 'Ativos',
    help: 'Posso orientar sobre páginas de captura, VSL, cartas e roteiros de vídeo.',
  },
  {
    match: /modulo-5|\/escala/,
    label: 'Escala',
    help: 'Posso ajudar a criar anúncios, modelar criativos e ler a Meta Ad Library.',
  },
  {
    match: /modulo-6|\/vendas/,
    label: 'Vendas',
    help: 'Posso ajudar com o assistente de vendas, scripts e social selling.',
  },
  {
    match: /\/biblioteca/,
    label: 'Biblioteca',
    help: 'Posso ajudar a buscar mídias, elementos, modelos e criativos capturados.',
  },
  {
    match: /\/metricas/,
    label: 'Métricas',
    help: 'Posso orientar sobre leituras manuais, tendências e evolução de watch time.',
  },
  {
    match: /\/analytics/,
    label: 'Analytics',
    help: 'Posso analisar suas métricas de uso da plataforma e sugerir próximos passos.',
  },
  {
    match: /\/agendamento/,
    label: 'Agendamento',
    help: 'Posso ajudar a planejar e agendar suas publicações.',
  },
  {
    match: /\/academy/,
    label: 'Academy',
    help: 'Posso indicar aulas por módulo e acompanhar seu progresso global.',
  },
  {
    match: /\/configuracoes/,
    label: 'Configurações',
    help: 'Posso ajudar com perfil, Brand OS ativo, token de captura e exportação de dados.',
  },
]

function routeInfo(pathname: string) {
  const found = ROUTE_CONTEXT.find((r) => r.match.test(pathname))
  if (found) return found
  return {
    label: 'Dashboard',
    help: 'Posso te dar um panorama dos módulos e sugerir próximos passos com base nos seus dados.',
  }
}

const QUICK_ACTIONS = [
  { id: 'analyze', label: 'Analisar vídeo', icon: Video },
  { id: 'hashtags', label: 'Sugerir hashtags', icon: Hash },
  { id: 'titles', label: 'Sugerir título', icon: Type },
  { id: 'broll', label: 'Sugerir B-roll', icon: Film },
  { id: 'shorts', label: 'Transformar em Shorts', icon: Scissors },
] as const

type QuickActionId = (typeof QUICK_ACTIONS)[number]['id']

export default function ClaraWidget() {
  const { hasBrandOS, brandProfile } = usePlatform()
  const { projects, activeProjectId } = useStudio()
  const location = useLocation()
  // Guarda o texto do roteiro do projeto ativo (vindo do snapshot/StudioContext)
  // para alimentar as heurísticas da Clara. projects é Project[] do StudioContext.
  void projects as Project[]
  void activeProjectId
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ClaraMessage[]>(loadMessages)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [actionLoading, setActionLoading] = useState<QuickActionId | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const welcomedRef = useRef<string>('')

  // Projeto ativo (para análise de vídeo)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Persistir sempre que mudar (com truncagem para 50)
  useEffect(() => {
    const trimmed = messages.slice(-MAX_MESSAGES)
    saveMessages(trimmed)
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, typing, actionLoading])

  const info = routeInfo(location.pathname)

  // Mensagem de boas-vindas contextualizada ao abrir (uma vez por rota)
  useEffect(() => {
    if (!open) return
    if (welcomedRef.current === location.pathname) return
    welcomedRef.current = location.pathname
    const brandLine = hasBrandOS
      ? `Vejo que seu Brand OS está ativo para ${brandProfile.base.service || 'seu serviço'}${brandProfile.base.niche ? ` no nicho ${brandProfile.base.niche}` : ''}, com tom de voz ${brandProfile.base.voice || 'direto'}.`
      : 'Ainda não vejo um Brand OS configurado. Que tal começar configurando seu Brand OS em /posicionamento?'
    const welcome = `Você está no módulo ${info.label}. ${info.help} ${brandLine}`
    setTyping(true)
    const t = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'clara', text: welcome, at: new Date().toISOString() },
      ])
      setTyping(false)
    }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location.pathname])

  const buildReply = useCallback(
    (userText: string): string => {
      const base = brandProfile.base
      const brandCtx = hasBrandOS
        ? ` (alinhado ao seu serviço: ${base.service || '—'}, público: ${base.audience || '—'}, tom: ${base.voice || '—'})`
        : ''
      const replies = [
        `Entendi! Sobre "${userText.slice(0, 60)}" — posso te ajudar com isso. Quer que eu sugira um próximo passo baseado no seu posicionamento?${brandCtx}`,
        `Ótima pergunta. Recomendo começar pelo Brand OS no Módulo 1 para garantir coerência em todas as gerações${hasBrandOS ? ' — você já tem um ativo, ótimo!' : '.'}`,
        `No módulo ${info.label}, posso orientar sobre ${info.help.toLowerCase().replace('posso ', '')}. Qual detalhe você quer explorar?`,
        `Já registrei sua dúvida. Uma boa prática é manter o Brand OS atualizado antes de gerar novas peças.${brandCtx}`,
      ]
      return replies[Math.floor(Math.random() * replies.length)]
    },
    [hasBrandOS, brandProfile, info],
  )

  const send = () => {
    if (!input.trim()) return
    const userMsg: ClaraMessage = { role: 'user', text: input.trim(), at: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'clara', text: buildReply(userMsg.text), at: new Date().toISOString() },
      ])
      setTyping(false)
    }, 1100)
  }

  const clearConversation = () => {
    const fresh: ClaraMessage[] = [
      {
        role: 'clara',
        text: 'Conversa limpa! Como posso ajudar agora?',
        at: new Date().toISOString(),
      },
    ]
    setMessages(fresh)
    welcomedRef.current = '' // permite regerar boas-vindas contextualizada
  }

  /** Executa uma ação rápida da Clara (heurística local). */
  const runQuickAction = useCallback(
    (actionId: QuickActionId) => {
      // Texto de referência: título + legenda + roteiro do projeto ativo.
      const projectText = [activeProject?.title || '', activeProject?.scriptText || '']
        .join('\n')
        .trim()
      const fallbackText = 'criação de conteúdo marketing digital'
      const text = projectText || fallbackText

      setActionLoading(actionId)
      setTyping(true)

      // Simula "pensando" com delay progressivo.
      const delay = 900 + Math.random() * 600
      setTimeout(() => {
        let result: ClaraResult | null = null
        let intro = ''

        switch (actionId) {
          case 'analyze': {
            const duration = activeProject?.duration || 30
            const analysis = analyzeVideo(duration, activeProject?.resolution)
            result = {
              kind: 'video-analysis',
              segments: analysis.segments,
              summary: analysis.summary,
            }
            intro = '🔍 Analisei seu vídeo. Aqui está minha sugestão de cortes:'
            break
          }
          case 'hashtags': {
            const suggestions = suggestHashtags(text)
            result = { kind: 'hashtags', suggestions }
            intro = `🏷️ Gerei ${suggestions.length} hashtags relevantes para "${activeProject?.title || 'seu conteúdo'}":`
            break
          }
          case 'titles': {
            const titles = suggestTitles(text)
            result = { kind: 'titles', titles }
            intro = '✍️ Aqui estão 3 opções de título otimizadas para engajamento:'
            break
          }
          case 'broll': {
            const suggestions = suggestBRoll(text)
            result = { kind: 'broll', suggestions }
            intro = 'Sugestões de B-roll (termos de busca para Pexels) por bloco:'
            break
          }
          case 'shorts': {
            const script = transformToShorts(activeProject?.scriptText || text)
            result = { kind: 'shorts', script: script.script, estimatedSec: script.estimatedSec }
            intro = `✂️ Versão condensada para Shorts (~${script.estimatedSec}s):`
            break
          }
        }

        setMessages((prev) => [
          ...prev,
          { role: 'clara', text: intro, at: new Date().toISOString(), result: result || undefined },
        ])
        setTyping(false)
        setActionLoading(null)
      }, delay)
    },
    [activeProject],
  )

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#22D3EE] shadow-lg shadow-[#7C5CFC]/40 hover:scale-105 transition-all animate-pulse-glow"
        aria-label="Abrir assistente Clara"
      >
        <Sparkles className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75 animate-ping" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-[#22D3EE] text-[8px] font-bold text-black flex items-center justify-center">
            IA
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-[#14141C] border border-white/15 shadow-2xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#7C5CFC]/20 to-[#22D3EE]/10 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#22D3EE] shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Clara</p>
            <p className="text-[10px] text-[#22D3EE] truncate">{info.label} • Assistente IA</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={clearConversation}
            className="p-1.5 rounded-lg text-[#9494A8] hover:bg-white/10 hover:text-white"
            aria-label="Limpar conversa"
            title="Limpar conversa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-[#9494A8] hover:bg-white/10 hover:text-white"
            aria-label="Fechar assistente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="px-2.5 py-2 bg-[#0e0e15]/60 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          const isLoading = actionLoading === action.id
          return (
            <button
              key={action.id}
              onClick={() => runQuickAction(action.id)}
              disabled={actionLoading !== null}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                isLoading
                  ? 'bg-[#7C5CFC]/30 text-[#7C5CFC]'
                  : 'bg-[#1C1C27] text-[#9494A8] hover:bg-white/10 hover:text-white'
              } disabled:cursor-not-allowed`}
              title={action.label}
            >
              <Icon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              {action.label}
            </button>
          )
        })}
      </div>

      {/* Contexto da rota */}
      <div className="px-3 py-1.5 bg-[#0e0e15]/60 border-b border-white/5">
        <p className="text-[10px] text-[#9494A8] truncate">
          <span className="text-[#7C5CFC] font-semibold">Contexto:</span> {info.label} •{' '}
          {hasBrandOS ? 'Brand OS ativo' : 'sem Brand OS'}
          {activeProject && <span className="text-[#22D3EE]"> • {activeProject.title}</span>}
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#7C5CFC] text-white rounded-br-sm'
                  : 'bg-[#1C1C27] text-slate-200 rounded-bl-sm border border-white/5'
              }`}
            >
              {m.text}
              {m.result && (
                <ResultCard result={m.result} onCopy={copyToClipboard} copied={copied} />
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-[#1C1C27] rounded-2xl rounded-bl-sm px-3 py-2.5 border border-white/5 flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#9494A8] animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#9494A8] animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#9494A8] animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escreva sua mensagem…"
          aria-label="Mensagem para a Clara"
          className="flex-1 bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] placeholder:text-[#9494A8]/50"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          aria-label="Enviar mensagem"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C5CFC] text-white disabled:opacity-30 hover:bg-[#6A48E0] transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── Card de resultado estruturado (acionável) ─────────────────────────── */

function ResultCard({
  result,
  onCopy,
  copied,
}: {
  result: ClaraResult
  onCopy: (text: string, id: string) => void
  copied: string | null
}) {
  if (result.kind === 'video-analysis') {
    const total = result.segments[result.segments.length - 1]?.endSec || 1
    return (
      <div className="mt-2 space-y-2">
        <p className="text-[10px] text-[#9494A8]">{result.summary}</p>
        {/* Preview visual dos segmentos na timeline */}
        <div className="flex h-8 rounded-lg overflow-hidden border border-white/10">
          {result.segments.map((seg, i) => {
            const widthPct = ((seg.endSec - seg.startSec) / total) * 100
            const colors = ['#7C5CFC', '#22D3EE', '#FBBF24']
            return (
              <div
                key={i}
                className="flex items-center justify-center text-[8px] font-bold text-black/70"
                style={{ width: `${widthPct}%`, background: colors[i % 3] }}
                title={`${seg.label}: ${fmtTimecode(seg.startSec)}-${fmtTimecode(seg.endSec)}`}
              >
                {widthPct > 15 ? seg.label.slice(0, 8) : ''}
              </div>
            )
          })}
        </div>
        <div className="space-y-1">
          {result.segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] bg-black/30 rounded px-2 py-1"
            >
              <span className="text-white font-medium">{seg.label}</span>
              <span className="text-[#22D3EE] font-mono">
                {fmtTimecode(seg.startSec)} - {fmtTimecode(seg.endSec)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (result.kind === 'hashtags') {
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {result.suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onCopy(s.tag, `ht-${i}`)}
            className="text-[10px] text-[#7C5CFC] bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 px-2 py-0.5 rounded hover:bg-[#7C5CFC]/20 transition-colors"
            title={`Copiar ${s.tag}`}
          >
            {copied === `ht-${i}` ? <Check className="w-2.5 h-2.5 inline" /> : s.tag}
          </button>
        ))}
      </div>
    )
  }

  if (result.kind === 'titles') {
    return (
      <div className="mt-2 space-y-1.5">
        {result.titles.map((t, i) => (
          <button
            key={i}
            onClick={() => onCopy(t, `ti-${i}`)}
            className="w-full text-left text-[11px] text-slate-200 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 hover:border-[#7C5CFC]/40 transition-colors"
          >
            <span className="text-[#22D3EE] font-bold mr-1">{i + 1}.</span>
            {t}
            {copied === `ti-${i}` && <Check className="w-3 h-3 inline ml-1 text-emerald-400" />}
          </button>
        ))}
      </div>
    )
  }

  if (result.kind === 'broll') {
    return (
      <div className="mt-2 space-y-1">
        {result.suggestions.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-[10px] bg-black/30 rounded px-2 py-1"
          >
            <span className="text-white">
              <span className="text-[#9494A8] mr-1">{i + 1}.</span>
              {s.keyword}
            </span>
            <button
              onClick={() => onCopy(s.query, `br-${i}`)}
              className="text-[#22D3EE] hover:underline font-mono"
            >
              {copied === `br-${i}` ? (
                <Check className="w-2.5 h-2.5 inline" />
              ) : (
                `pexels:${s.query}`
              )}
            </button>
          </div>
        ))}
      </div>
    )
  }

  if (result.kind === 'shorts') {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-[10px] text-[#9494A8]">Duração estimada: ~{result.estimatedSec}s</p>
        <div className="text-[11px] text-slate-200 bg-black/30 border border-white/10 rounded-lg p-2.5 max-h-32 overflow-y-auto whitespace-pre-wrap">
          {result.script}
        </div>
        <button
          onClick={() => onCopy(result.script, 'shorts')}
          className="flex items-center gap-1 text-[10px] text-[#22D3EE] hover:underline"
        >
          {copied === 'shorts' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copiar roteiro
        </button>
      </div>
    )
  }

  return null
}
