import React, { useCallback, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import {
  AdjustmentsState,
  DEFAULT_ADJUSTMENTS,
  editorKey,
  loadEditorState,
  saveEditorState,
} from '@/components/studio/editor-types'

interface AdjustmentsPanelProps {
  projectId: string
  adjustments: AdjustmentsState
  onChange: (a: AdjustmentsState) => void
}

const SLIDER_DEF = [
  { key: 'brightness', label: 'Brilho', min: 0, max: 200, step: 1, suffix: '%' },
  { key: 'contrast', label: 'Contraste', min: 0, max: 200, step: 1, suffix: '%' },
  { key: 'saturation', label: 'Saturação', min: 0, max: 200, step: 1, suffix: '%' },
  { key: 'temperature', label: 'Temperatura', min: -50, max: 50, step: 1, suffix: '' },
  { key: 'hue', label: 'Matiz', min: -180, max: 180, step: 1, suffix: '°' },
  { key: 'exposure', label: 'Exposição', min: -50, max: 50, step: 1, suffix: '' },
  { key: 'shadows', label: 'Sombras', min: -100, max: 100, step: 1, suffix: '' },
  { key: 'highlights', label: 'Realces', min: -100, max: 100, step: 1, suffix: '' },
  { key: 'sharpness', label: 'Nitidez', min: 0, max: 100, step: 1, suffix: '%' },
  { key: 'smoothness', label: 'Suavização', min: 0, max: 100, step: 1, suffix: '%' },
  { key: 'vignette', label: 'Vinheta', min: 0, max: 100, step: 1, suffix: '%' },
] as const

export function AdjustmentsPanel({ projectId, adjustments, onChange }: AdjustmentsPanelProps) {
  const update = useCallback(
    (patch: Partial<AdjustmentsState>) => {
      const next = { ...adjustments, ...patch }
      onChange(next)
      saveEditorState(projectId, 'adjustments', next)
    },
    [adjustments, onChange, projectId],
  )

  const handleReset = () => {
    onChange({ ...DEFAULT_ADJUSTMENTS })
    saveEditorState(projectId, 'adjustments', DEFAULT_ADJUSTMENTS)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white">Ajustes de imagem</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="h-7 text-[10px] border-white/10 text-[#9494A8] hover:text-white gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Redefinir
        </Button>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2.5">
        {SLIDER_DEF.map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#9494A8]">
              <span>{s.label}</span>
              <span className="font-mono">
                {adjustments[s.key]}
                {s.suffix}
              </span>
            </div>
            <Slider
              value={[adjustments[s.key]]}
              min={s.min}
              max={s.max}
              step={s.step}
              onValueChange={(v) => update({ [s.key]: v[0] } as Partial<AdjustmentsState>)}
            />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#9494A8]/70 leading-relaxed">
        Os ajustes são aplicados em tempo real no player via CSS filter e persistidos por projeto.
        Nitidez e vinheta são indicadores visuais (renderização final limitada pelo navegador).
      </p>
    </div>
  )
}

export default AdjustmentsPanel
