import React, { useState } from 'react'
import { Search, Loader2, Wand2, Check, X, RefreshCw, Film, AlertCircle } from 'lucide-react'
import { useBlockBRoll } from '@/hooks/use-block-media'
import {
  searchPexelsVideos,
  suggestBRollTerms,
  pexelsResultToBRoll,
  type PexelsVideoResult,
} from '@/lib/broll'
import { toast } from 'sonner'
import type { BlockBRoll } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   BlockBRoll — FASE 3.4
   Seção de B-roll por bloco: busca textual no Pexels, grade de resultados,
   seleção com checkmark, trocar/remover, sugerir com IA (heurística local),
   créditos obrigatórios. Persiste em localStorage (key por bloco).
   ─────────────────────────────────────────────────────────────────────────── */

export interface BlockBRollProps {
  blockId: string
  blockText: string
  stopPropagation?: boolean
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function BlockBRoll({ blockId, blockText, stopPropagation = true }: BlockBRollProps) {
  const { broll, setBRoll } = useBlockBRoll(blockId)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PexelsVideoResult[]>([])
  const [suggestions, setSuggestions] = useState<{ term: string; label: string }[]>([])

  const stop = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
  }

  const doSearch = async (term: string) => {
    if (!term.trim()) {
      toast.warning('Digite um termo para buscar.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { results: rs, error: err } = await searchPexelsVideos(term, 12)
      if (err) {
        setError(err)
        setResults([])
      } else if (rs.length === 0) {
        setError('Nenhum vídeo encontrado para este termo.')
        setResults([])
      } else {
        setResults(rs)
      }
    } catch {
      setError('Falha inesperada ao buscar vídeos.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestAI = async () => {
    if (!blockText.trim()) {
      toast.warning('Este bloco não tem texto para analisar.')
      return
    }
    setAiLoading(true)
    setError(null)
    setResults([])
    try {
      // Spinner visível por no mínimo 600ms para UX
      const [terms] = await Promise.all([
        Promise.resolve(suggestBRollTerms(blockText)),
        new Promise((r) => setTimeout(r, 600)),
      ])
      setSuggestions(terms)
      if (terms.length === 0) {
        toast.info('Nenhum termo sugerido para o texto deste bloco.')
      } else {
        toast.success(`${terms.length} termo(s) sugerido(s). Clique para buscar.`)
      }
    } finally {
      setAiLoading(false)
    }
  }

  const selectResult = (r: PexelsVideoResult) => {
    setBRoll(pexelsResultToBRoll(r))
    toast.success('B-roll selecionado para este bloco.')
  }

  return (
    <div onClick={stop} className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Film className="w-3 h-3 text-[#22D3EE]" /> B-roll do bloco
        </span>
        <button
          onClick={(e) => {
            stop(e)
            handleSuggestAI()
          }}
          disabled={aiLoading}
          className="flex items-center gap-1 text-[9px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-1.5 py-0.5 rounded font-semibold disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          Sugerir com IA
        </button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-1 mb-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') doSearch(query)
          }}
          placeholder="termo de busca (ex.: cidade, natureza)..."
          className="flex-1 min-w-0 bg-[#1C1C27] border border-white/10 rounded-md px-1.5 py-1 text-[9px] text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
        />
        <button
          onClick={(e) => {
            stop(e)
            doSearch(query)
          }}
          disabled={loading}
          className="flex items-center gap-1 text-[9px] bg-[#7C5CFC] hover:bg-[#6A48E0] text-white px-1.5 py-1 rounded-md font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          Buscar no Pexels
        </button>
      </div>

      {/* Sugestões IA */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {suggestions.map((s) => (
            <button
              key={s.term}
              onClick={(e) => {
                stop(e)
                setQuery(s.term)
                doSearch(s.term)
              }}
              className="text-[8px] bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 text-[#7C5CFC] rounded px-1.5 py-0.5 hover:bg-[#7C5CFC]/30"
              title={`Buscar: ${s.term}`}
            >
              {s.label} →
            </button>
          ))}
        </div>
      )}

      {/* Erro / fallback */}
      {error && error === 'Falha na busca — tente novamente' ? (
        <div className="flex items-start gap-1.5 text-[9px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-1.5 py-1 mb-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
          <span className="leading-tight">{error}</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-1.5 text-[9px] text-[#A78BFA]/70 bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 rounded-md px-1.5 py-1 mb-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-px text-[#A78BFA]" />
          <span className="leading-tight">{error}</span>
        </div>
      ) : null}

      {/* B-roll selecionado */}
      {broll && (
        <div className="mb-1.5 rounded-md border border-[#22D3EE]/40 bg-[#22D3EE]/5 p-1.5">
          <div className="flex items-center gap-1.5">
            <img
              src={broll.thumbnail}
              alt="B-roll"
              className="w-16 h-10 object-cover rounded border border-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] text-white font-semibold truncate">B-roll ativo</span>
              </div>
              <span className="text-[8px] text-[#9494A8] block">
                {formatDuration(broll.duration)}
                {broll.resolution ? ` · ${broll.resolution}` : ''}
              </span>
              <span className="text-[8px] text-[#9494A8]/80 block italic">
                Vídeo por {broll.author} no Pexels
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={(e) => {
                  stop(e)
                  doSearch(query || broll.author)
                }}
                className="text-[8px] text-[#22D3EE] hover:bg-[#22D3EE]/10 px-1 py-0.5 rounded flex items-center gap-0.5"
                title="Trocar B-roll"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Trocar
              </button>
              <button
                onClick={(e) => {
                  stop(e)
                  setBRoll(null)
                  toast.info('B-roll removido do bloco.')
                }}
                className="text-[8px] text-red-400 hover:bg-red-500/10 px-1 py-0.5 rounded flex items-center gap-0.5"
                title="Remover B-roll"
              >
                <X className="w-2.5 h-2.5" /> Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estados: vazio / carregando / sem resultados / sucesso */}
      {!loading && !error && results.length === 0 && !broll ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <Search className="w-4 h-4 text-[#A78BFA]/40" />
          <p className="text-[9px] text-[#A78BFA]/50">Busque por um termo</p>
        </div>
      ) : null}

      {loading && (
        <div className="flex flex-col items-center justify-center py-4 gap-1">
          <Loader2 className="w-4 h-4 animate-spin text-[#7C5CFC]" />
          <p className="text-[9px] text-[#A78BFA]/70">Buscando vídeos…</p>
        </div>
      )}

      {!loading && error === 'Nenhum vídeo encontrado para este termo.' && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <AlertCircle className="w-4 h-4 text-[#A78BFA]/40" />
          <p className="text-[9px] text-[#A78BFA]/50">Nada encontrado</p>
        </div>
      )}

      {/* Grade de resultados */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto scrollbar-thin">
          {results.map((r) => {
            const best = [...(r.video_files ?? [])].sort(
              (a, b) => b.width * b.height - a.width * a.height,
            )[0]
            const isSelected = broll?.pexelsId === r.id
            return (
              <button
                key={r.id}
                onClick={(e) => {
                  stop(e)
                  selectResult(r)
                }}
                className={`relative rounded-lg overflow-hidden border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                  isSelected
                    ? 'border-emerald-400 ring-1 ring-emerald-400'
                    : 'border-[#1E1E2A] hover:border-[#22D3EE]/40'
                }`}
                title={`Selecionar vídeo de ${r.user?.name ?? 'Pexels'}`}
              >
                <img
                  src={r.image}
                  alt={r.user?.name ?? 'vídeo'}
                  className="w-full h-12 object-cover"
                />
                <div className="absolute top-0.5 left-0.5 px-1 py-0 rounded bg-black/80 text-[7px] font-mono text-white">
                  {formatDuration(r.duration)}
                </div>
                {best && (
                  <div className="absolute bottom-4 right-0.5 px-1 py-0 rounded bg-black/80 text-[7px] font-mono text-[#22D3EE]">
                    {best.width}×{best.height}
                  </div>
                )}
                <div className="px-1 py-0.5 bg-[#1C1C27]">
                  <span className="text-[10px] text-[#A78BFA]/50 truncate block">
                    {r.user?.name ?? 'Pexels'}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-300 drop-shadow" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BlockBRoll
