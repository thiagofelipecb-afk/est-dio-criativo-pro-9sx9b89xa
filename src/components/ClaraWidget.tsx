import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { Sparkles, X, Send, Bot, Trash2 } from 'lucide-react'

interface ClaraMessage {
  role: 'clara' | 'user'
  text: string
  at: string
}

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

export default function ClaraWidget() {
  const { hasBrandOS, brandProfile } = usePlatform()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ClaraMessage[]>(loadMessages)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const welcomedRef = useRef<string>('')

  // Persistir sempre que mudar (com truncagem para 50)
  useEffect(() => {
    const trimmed = messages.slice(-MAX_MESSAGES)
    saveMessages(trimmed)
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, typing])

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
    <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-[#14141C] border border-white/15 shadow-2xl overflow-hidden animate-fade-in-up">
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

      {/* Contexto da rota */}
      <div className="px-3 py-1.5 bg-[#0e0e15]/60 border-b border-white/5">
        <p className="text-[10px] text-[#9494A8] truncate">
          <span className="text-[#7C5CFC] font-semibold">Contexto:</span> {info.label} •{' '}
          {hasBrandOS ? 'Brand OS ativo' : 'sem Brand OS'}
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#7C5CFC] text-white rounded-br-sm'
                  : 'bg-[#1C1C27] text-slate-200 rounded-bl-sm border border-white/5'
              }`}
            >
              {m.text}
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
