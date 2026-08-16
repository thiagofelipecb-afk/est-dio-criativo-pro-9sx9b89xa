import React, { useCallback } from 'react'
import { Slider } from '@/components/ui/slider'
import { X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  EFFECT_PRESETS,
  EffectPresetId,
  EffectsState,
  TransitionType,
  editorKey,
  saveEditorState,
} from '@/components/studio/editor-types'

interface EffectsPanelProps {
  projectId: string
  effects: EffectsState
  onChange: (e: EffectsState) => void
}

const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'dissolve', label: 'Dissolver' },
  { id: 'slide', label: 'Deslizar' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'glitch', label: 'Glitch' },
]

export function EffectsPanel({ projectId, effects, onChange }: EffectsPanelProps) {
  const update = useCallback(
    (patch: Partial<EffectsState>) => {
      const next = { ...effects, ...patch }
      onChange(next)
      saveEditorState(projectId, 'effects', next)
    },
    [effects, onChange, projectId],
  )

  const toggleFilter = (id: EffectPresetId) => {
    if (effects.activeFilters.includes(id)) {
      update({ activeFilters: effects.activeFilters.filter((f) => f !== id) })
      toast.info('Filtro removido.')
    } else {
      update({ activeFilters: [...effects.activeFilters, id] })
      const preset = EFFECT_PRESETS.find((p) => p.id === id)
      toast.success(`Filtro "${preset?.label}" aplicado.`)
    }
  }

  const removeFilter = (id: EffectPresetId) => {
    update({ activeFilters: effects.activeFilters.filter((f) => f !== id) })
  }

  return (
    <div className="space-y-3">
      {/* Filtros aplicados */}
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2">
        <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">Filtros ativos</span>
        {effects.activeFilters.length === 0 ? (
          <p className="text-[10px] text-[#9494A8]/70">Nenhum filtro aplicado.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {effects.activeFilters.map((id) => {
              const preset = EFFECT_PRESETS.find((p) => p.id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 text-[#7C5CFC] text-[10px] font-medium px-2 py-0.5 rounded-full"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {preset?.label || id}
                  <button
                    onClick={() => removeFilter(id)}
                    className="ml-0.5 hover:text-white"
                    aria-label={`Remover ${preset?.label}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Galeria de presets */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white">Filtros visuais</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {EFFECT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleFilter(p.id)}
              className={`p-2 rounded-lg text-left transition-colors border ${
                effects.activeFilters.includes(p.id)
                  ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                  : 'border-white/5 bg-[#1C1C27] hover:border-white/20'
              }`}
            >
              <span className="block text-[11px] font-bold text-white">{p.label}</span>
              <span className="block text-[9px] text-[#9494A8] leading-tight mt-0.5">
                {p.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Transições */}
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2">
        <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
          Transições entre segmentos
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {TRANSITIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => update({ transition: t.id })}
              className={`py-1.5 text-[10px] rounded-md font-medium transition-colors ${
                effects.transition === t.id
                  ? 'bg-[#7C5CFC] text-white'
                  : 'bg-[#14141C] text-[#9494A8] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] text-[#9494A8]">
            <span>Duração da transição</span>
            <span className="font-mono">{effects.transitionDuration.toFixed(1)}s</span>
          </div>
          <Slider
            value={[Math.round(effects.transitionDuration * 10)]}
            min={1}
            max={20}
            step={1}
            onValueChange={(v) => update({ transitionDuration: v[0] / 10 })}
          />
        </div>
        <p className="text-[9px] text-[#9494A8]/70 leading-relaxed">
          A transição selecionada aplica-se entre os segmentos da timeline. O preview visual aparece
          no player quando suportado.
        </p>
      </div>
    </div>
  )
}

export default EffectsPanel
