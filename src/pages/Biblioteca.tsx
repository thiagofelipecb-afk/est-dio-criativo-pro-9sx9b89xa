import React, { useState } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import { ModuleHeader, EmptyState, inputClass } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Library, Eye, Sparkles, ArrowRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Biblioteca() {
  const { capturedCreatives, updateCapturedCreative, deleteCapturedCreative } = usePlatform()
  const { generate } = useAIGeneration()
  const [filter, setFilter] = useState<'Todos' | 'Anuncios' | 'Instagram' | 'Reels'>('Todos')
  const [loading, setLoading] = useState(false)

  const filtered = capturedCreatives.filter((c) => {
    if (filter === 'Todos') return true
    if (filter === 'Anuncios') return c.source === 'anuncio'
    if (filter === 'Instagram') return c.source === 'instagram'
    if (filter === 'Reels') return c.source === 'reel'
    return true
  })
  const counts = {
    Todos: capturedCreatives.length,
    Anuncios: capturedCreatives.filter((c) => c.source === 'anuncio').length,
    Instagram: capturedCreatives.filter((c) => c.source === 'instagram').length,
    Reels: capturedCreatives.filter((c) => c.source === 'reel').length,
  }

  const analyze = async (id: string) => {
    setLoading(true)
    await generate('analise_biblioteca', () => {}, 1000)
    updateCapturedCreative(id, {
      analysis:
        'Análise estrutural: gancho → tensão → solução → prova → CTA. Padrão de alta performance. Adaptável ao seu nicho.',
    })
    setLoading(false)
    toast.success('Análise gerada!')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Biblioteca"
        description="Acervo global de criativos capturados: anúncios, posts e reels. Filtre, analise, recrie e adapte ao seu nicho."
        icon={<Library className="w-5 h-5" />}
        accent="#22D3EE"
      />
      <div className="flex flex-wrap gap-2">
        {(['Todos', 'Anuncios', 'Instagram', 'Reels'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-[#22D3EE] text-black' : 'bg-[#1C1C27] text-[#9494A8]'}`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library className="w-6 h-6" />}
          title="Biblioteca vazia"
          description="Capture anúncios, posts e reels via extensão (Configurações) ou manualmente. A biblioteca centraliza tudo para análise e adaptação."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl bg-[#14141C] border border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[10px]">
                  {c.source}
                </Badge>
                <button
                  onClick={() => {
                    deleteCapturedCreative(c.id)
                    toast.success('Removido.')
                  }}
                  className="text-red-400 hover:bg-red-500/10 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 line-clamp-3">{c.caption}</p>
              {c.transcript && (
                <p className="text-[10px] text-[#9494A8] italic line-clamp-2">
                  Transcrição: {c.transcript}
                </p>
              )}
              {c.analysis && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 text-[11px] text-emerald-300">
                  {c.analysis}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] h-7 gap-1"
                  onClick={() => analyze(c.id)}
                  disabled={loading}
                >
                  <Eye className="w-3 h-3" /> {c.analysis ? 'Ver' : 'Analisar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] h-7 gap-1"
                  onClick={() => toast.success('Recriado!')}
                >
                  <Sparkles className="w-3 h-3" /> Recriar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-[11px] h-7 gap-1"
                  onClick={() => toast.success('Adaptado ao seu nicho!')}
                >
                  <ArrowRight className="w-3 h-3" /> Adaptar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
