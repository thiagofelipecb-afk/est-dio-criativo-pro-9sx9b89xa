import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Layers, Clock, ArrowRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { TEMPLATES } from '@/lib/libraryData'
import type { TemplateModel } from '@/types/library'

const CATEGORIES = ['Todos', 'Reels', 'TikTok', 'YouTube', 'Stories', 'Carrossel', 'Post'] as const

export default function Modelos() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Todos')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => {
      if (category !== 'Todos' && t.category !== category) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [category, search])

  const handleUseTemplate = (tpl: TemplateModel) => {
    // Simula duplicação como novo projeto (armazena referência)
    const projects = JSON.parse(localStorage.getItem('lumen_projects') || '[]')
    const newProj = {
      id: `proj-${Date.now()}`,
      name: `${tpl.name}`,
      template: tpl.id,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('lumen_projects', JSON.stringify([newProj, ...projects]))
    toast.success(`Modelo "${tpl.name}" aplicado!`)
    navigate(tpl.editorRoute)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-[#7C5CFC]" /> Modelos
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Templates prontos para acelerar sua criação. Escolha um e comece a editar.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9494A8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelo..."
            className="bg-[#14141C] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] w-full sm:w-64"
          />
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="group rounded-2xl bg-[#14141C] border border-white/10 hover:border-[#7C5CFC]/40 transition-all overflow-hidden flex flex-col"
          >
            <div
              className={`relative aspect-video bg-gradient-to-br ${tpl.gradient} flex items-center justify-center`}
            >
              <span className="text-5xl drop-shadow-lg">{tpl.icon}</span>
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white">
                {tpl.category}
              </span>
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {tpl.duration}
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
              <p className="text-xs text-[#9494A8] flex-1">{tpl.description}</p>
              <Button
                size="sm"
                onClick={() => handleUseTemplate(tpl)}
                className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold gap-1.5 mt-2"
              >
                Usar modelo <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Layers className="w-10 h-10 text-[#9494A8]/40 mx-auto mb-3" />
          <p className="text-sm text-[#9494A8]">Nenhum modelo encontrado.</p>
        </div>
      )}
    </div>
  )
}
