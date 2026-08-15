import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Shapes, Copy, Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DECOR_ELEMENTS } from '@/lib/libraryData'
import type { DecorElement } from '@/types/library'

const CATEGORIES = ['Todos', 'Formas', 'Ícones', 'Molduras', 'Efeitos', 'Tipografia'] as const

export default function Elementos() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Todos')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return DECOR_ELEMENTS.filter((e) => category === 'Todos' || e.category === category)
  }, [category])

  const handleCopy = async (el: DecorElement) => {
    try {
      if (el.render === 'emoji' && el.emoji) {
        await navigator.clipboard.writeText(el.emoji)
      } else if (el.svg) {
        await navigator.clipboard.writeText(el.svg)
      }
      setCopiedId(el.id)
      setTimeout(() => setCopiedId(null), 1500)
      toast.success(`"${el.name}" copiado para a área de transferência`)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const handleUse = (el: DecorElement) => {
    const map = JSON.parse(localStorage.getItem('lumen_project_elements') || '[]')
    map.push({ id: el.id, name: el.name, emoji: el.emoji, svg: el.svg, color: el.color })
    localStorage.setItem('lumen_project_elements', JSON.stringify(map))
    toast.success(`"${el.name}" vinculado ao projeto atual`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Shapes className="w-7 h-7 text-[#7C5CFC]" /> Elementos
        </h1>
        <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
          Overlays gráficos: formas, ícones, molduras, efeitos e tipografia para seus designs.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              category === cat
                ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {filtered.map((el) => (
          <div
            key={el.id}
            className="group rounded-2xl bg-[#14141C] border border-white/10 hover:border-[#7C5CFC]/40 transition-all overflow-hidden flex flex-col"
          >
            <div className="aspect-square flex items-center justify-center bg-[#0B0B10] p-6 relative">
              {el.render === 'emoji' ? (
                <span className="text-5xl" style={{ color: el.color }}>
                  {el.emoji}
                </span>
              ) : (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: el.svg || '' }} />
              )}
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                {el.category}
              </span>
            </div>
            <div className="p-3 space-y-2">
              <h3 className="text-xs font-bold text-white truncate">{el.name}</h3>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(el)}
                  className="flex-1 border-white/10 text-[10px] gap-1"
                >
                  {copiedId === el.id ? (
                    <>
                      <Check className="w-3 h-3" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUse(el)}
                  className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-[10px] gap-1"
                >
                  <Plus className="w-3 h-3" /> Usar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Shapes className="w-10 h-10 text-[#9494A8]/40 mx-auto mb-3" />
          <p className="text-sm text-[#9494A8]">Nenhum elemento encontrado.</p>
        </div>
      )}
    </div>
  )
}
