import React, { useState, useMemo, useCallback } from 'react'
import {
  Search,
  Loader2,
  Wand2,
  Check,
  X,
  RefreshCw,
  Film,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { useBlockBRoll, registerBRollAsset, unregisterBRollAsset } from '@/hooks/use-block-media'
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

/**
 * PROMPT 55 — calcula o aspect ratio (largura/altura) do melhor arquivo de
 * um resultado. Retorna 0 quando não há arquivos. Valores ≤0.75 são verticais.
 */
function resultAspectRatio(r: PexelsVideoResult): number {
  const best = [...(r.video_files ?? [])].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  if (!best || !best.height) return 0
  return best.width / best.height
}

/**
 * PROMPT 55 — ordena resultados priorizando vídeos verticais (aspect ≤0.75)
 * primeiro, mantendo a ordem original dentro de cada grupo (estável).
 */
function sortVerticalFirst(items: PexelsVideoResult[]): PexelsVideoResult[] {
  const vertical: PexelsVideoResult[] = []
  const other: PexelsVideoResult[] = []
  for (const r of items) {
    if (resultAspectRatio(r) > 0 && resultAspectRatio(r) <= 0.75) vertical.push(r)
    else other.push(r)
  }
  return [...vertical, ...other]
}

export function BlockBRoll({ blockId, blockText, stopPropagation = true }: BlockBRollProps) {
  const { broll, setBRoll } = useBlockBRoll(blockId)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PexelsVideoResult[]>([])
  const [suggestions, setSuggestions] = useState<{ term: string; label: string }[]>([])
  // PROMPT 55 — paginação: página atual e total de resultados.
  const [page, setPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  // Termo da última busca realizada (para "Carregar mais").
  const [lastQuery, setLastQuery] = useState('')

  const stop = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
  }

  const doSearch = useCallback(async (term: string, opts?: { append?: boolean; page?: number }) => {
    if (!term.trim()) {
      toast.warning('Digite um termo para buscar.')
      return
    }
    const append = opts?.append ?? false
    const nextPage = opts?.page ?? 1
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const {
        results: rs,
        error: err,
        totalResults: tr,
      } = await searchPexelsVideos(term, 12, nextPage)
      if (err) {
        setError(err)
        if (!append) setResults([])
      } else if (rs.length === 0 && !append) {
        setError('Nenhum vídeo encontrado para este termo.')
        setResults([])
      } else {
        // PROMPT 55 — prioriza vídeos verticais na ordenação.
        const sorted = sortVerticalFirst(rs)
        if (append) {
          setResults((prev) => [...prev, ...sorted])
        } else {
          setResults(sorted)
        }
        if (typeof tr === 'number') setTotalResults(tr)
        setLastQuery(term)
        setPage(nextPage)
      }
    } catch {
      if (!append) {
        setError('Falha inesperada ao buscar vídeos.')
        setResults([])
      } else {
        toast.error('Falha ao carregar mais vídeos.')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const handleLoadMore = useCallback(() => {
    if (!lastQuery.trim() || loadingMore || loading) return
    void doSearch(lastQuery, { append: true, page: page + 1 })
  }, [lastQuery, loadingMore, loading, page, doSearch])

  // PROMPT 55 — há mais páginas para carregar?
  const hasMore = useMemo(() => {
    if (results.length === 0) return false
    if (totalResults > 0) return results.length < totalResults
    // Sem total_results conhecido: permite carregar enquanto a última página
    // retornou resultados cheios (12 por página).
    return true
  }, [results.length, totalResults])

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

  const selectResult = async (r: PexelsVideoResult) => {
    // PROMPT 67 / GAP 1 — registra o B-roll do Pexels no assetManager.
    const base = pexelsResultToBRoll(r)
    const registered = await registerBRollAsset(base)
    // Decrementa o ativo anterior, se houver.
    if (broll?.assetId) unregisterBRollAsset(broll)
    setBRoll(registered)
    // Notifica listeners (contador global de B-roll no ScriptPanel).
    window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
    toast.success('B-roll selecionado para este bloco.')
  }

  // PROMPT 53 (GAP 2) — botão "Sugerir com IA" desabilitado visualmente quando
  // não há texto no bloco. Sem blocos no roteiro (blockText vazio), exibe label
  // "Crie um roteiro primeiro"; com bloco mas sem texto, exibe "Sugerir com IA"
  // desabilitado com tooltip explicativo.
  const hasBlockText = blockText.trim().length > 0
  const aiDisabled = !hasBlockText || aiLoading
  const aiLabel = hasBlockText ? 'Sugerir com IA' : 'Crie um roteiro primeiro'
  const aiTooltip = hasBlockText
    ? aiLoading
      ? 'Analisando texto do bloco…'
      : 'Sugerir termos de B-roll a partir do texto do bloco'
    : 'Adicione texto ao bloco para usar IA'

  return (
    <div onClick={stop} className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Film className="w-3 h-3 text-[#22D3EE]" /> B-roll do bloco
        </span>
        <button
          onClick={(e) => {
            stop(e)
            if (!aiDisabled) handleSuggestAI()
          }}
          disabled={aiDisabled}
          aria-disabled={aiDisabled}
          title={aiTooltip}
          className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
            aiDisabled
              ? 'text-[#9494A8]/50 bg-white/5 cursor-not-allowed'
              : 'text-[#7C5CFC] hover:bg-[#7C5CFC]/10'
          }`}
        >
          {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          {aiLabel}
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
              {/* PROMPT 58 — link "Ver no Pexels" para a página do vídeo. */}
              {broll.licenseUrl && (
                <a
                  href={broll.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-[8px] text-[#22D3EE] hover:text-[#22D3EE]/80 hover:underline mt-0.5"
                  title="Abrir página do vídeo no Pexels"
                >
                  Ver no Pexels <ExternalLink className="w-2.5 h-2.5" />→
                </a>
              )}
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
                  if (broll?.assetId) unregisterBRollAsset(broll)
                  setBRoll(null)
                  window.dispatchEvent(new CustomEvent('lumen-block-media-changed'))
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
        <>
          <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto scrollbar-thin">
            {results.map((r) => {
              const best = [...(r.video_files ?? [])].sort(
                (a, b) => b.width * b.height - a.width * a.height,
              )[0]
              const isSelected = broll?.pexelsId === r.id
              // PROMPT 55 — flag vertical para badge.
              const isVertical = best ? best.width / best.height <= 0.75 : false
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
                  {/* PROMPT 55 — badge "Vertical" para vídeos com aspect ≤0.75 */}
                  {isVertical && (
                    <div className="absolute top-0.5 right-0.5 px-1 py-0 rounded bg-[#22D3EE]/90 text-[7px] font-bold text-black">
                      9:16
                    </div>
                  )}
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

          {/* PROMPT 55 — botão "Carregar mais" (próxima página em append) */}
          {hasMore && (
            <button
              onClick={(e) => {
                stop(e)
                handleLoadMore()
              }}
              disabled={loadingMore}
              className="mt-1.5 w-full flex items-center justify-center gap-1 text-[9px] text-[#22D3EE] hover:bg-[#22D3EE]/10 border border-[#22D3EE]/30 rounded-md py-1 font-semibold disabled:opacity-50"
              title="Carregar mais resultados da próxima página"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando…
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" /> Carregar mais
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default BlockBRoll
