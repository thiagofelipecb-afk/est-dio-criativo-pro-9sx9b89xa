import React, { useState, useRef, useEffect } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { Sparkles, X, Send, Bot } from 'lucide-react'

export default function ClaraWidget() {
  const { claraConversation, addClaraMessage } = usePlatform()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [claraConversation.messages, open, typing])

  const send = () => {
    if (!input.trim()) return
    addClaraMessage('user', input.trim())
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const replies = [
        'Entendi! Posso te ajudar com isso. Quer que eu sugira um próximo passo baseado no seu posicionamento?',
        'Ótima pergunta. Recomendo começar pelo Brand OS no Módulo 1 para garantir coerência em todas as gerações.',
        'Posso orientar sobre conteúdo, funis, ativos, anúncios e vendas. Qual módulo você quer explorar?',
        'Já registrei sua dúvida. Uma boa prática é manter o Brand OS atualizado antes de gerar novas peças.',
      ]
      addClaraMessage('clara', replies[Math.floor(Math.random() * replies.length)])
      setTyping(false)
    }, 1100)
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
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#22D3EE]">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Clara</p>
            <p className="text-[10px] text-[#22D3EE]">Assistente virtual com IA</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg text-[#9494A8] hover:bg-white/10 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {claraConversation.messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
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
          className="flex-1 bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] placeholder:text-[#9494A8]/50"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C5CFC] text-white disabled:opacity-30 hover:bg-[#6A48E0] transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
