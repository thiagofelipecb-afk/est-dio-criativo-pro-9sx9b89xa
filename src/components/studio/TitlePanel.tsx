import React from 'react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  Move,
  ArrowDownToLine,
  Type,
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useStudio } from '@/context/StudioContext'
import type {
  TitleConfig,
  TitleFont,
  TitleAlignment,
  TitleVerticalPosition,
  TitleDuration,
} from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   TitlePanel — FASE 4.2
   Aba "Título" do painel inferior da Gravadora. Controles completos do
   título overlay: texto, fonte, tamanho, largura, cores, alinhamento,
   posição vertical, arraste livre e duração. Persiste em
   lumen_gravadora_titulo via StudioContext.
   ─────────────────────────────────────────────────────────────────────────── */

const TEXT_SWATCHES: { name: string; value: string }[] = [
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Preto', value: '#000000' },
  { name: 'Roxo LUMEN', value: '#7C5CFC' },
  { name: 'Ciano', value: '#22D3EE' },
  { name: 'Amarelo', value: '#FACC15' },
  { name: 'Rosa', value: '#FF2D55' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Laranja', value: '#F97316' },
]

const FONTS: { id: TitleFont; label: string; family: string }[] = [
  { id: 'Anton', label: 'Anton', family: "'Anton', sans-serif" },
  { id: 'Montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'Caveat', label: 'Caveat', family: "'Caveat', cursive" },
]

const ALIGNS: { id: TitleAlignment; icon: React.ReactNode; label: string }[] = [
  { id: 'left', icon: <AlignLeft className="w-3.5 h-3.5" />, label: 'Esquerda' },
  { id: 'center', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Centro' },
  { id: 'right', icon: <AlignRight className="w-3.5 h-3.5" />, label: 'Direita' },
]

const V_POSITIONS: { id: TitleVerticalPosition; icon: React.ReactNode; label: string }[] = [
  { id: 'top', icon: <ArrowUpToLine className="w-3.5 h-3.5" />, label: 'Topo' },
  { id: 'middle', icon: <Move className="w-3.5 h-3.5" />, label: 'Costura' },
  { id: 'bottom', icon: <ArrowDownToLine className="w-3.5 h-3.5" />, label: 'Base' },
]

export function TitlePanel() {
  const { titleConfig, setTitleConfig } = useStudio()

  const update = (patch: Partial<TitleConfig>) => setTitleConfig({ ...titleConfig, ...patch })

  return (
    <div className="flex h-full">
      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-y-auto scrollbar-thin">
        <div className="px-3 py-2 border-b border-white/5 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#7C5CFC]" /> Título do Vídeo
            </h3>
            <p className="text-[10px] text-[#9494A8] mt-0.5">
              Overlay de título acima de todas as camadas do canvas.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#9494A8]">Exibir título</span>
            <Switch checked={titleConfig.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
        </div>

        {titleConfig.enabled ? (
          <div className="p-3 space-y-3.5">
            {/* Texto do título */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                  Texto do título
                </label>
                <span className="text-[9px] text-[#9494A8] font-mono">
                  {titleConfig.text.length}/100
                </span>
              </div>
              <input
                type="text"
                value={titleConfig.text}
                maxLength={100}
                placeholder="Digite o título do vídeo..."
                onChange={(e) => update({ text: e.target.value })}
                className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              />
            </div>

            {/* Fonte */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">Fonte</label>
              <div className="grid grid-cols-3 gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => update({ font: f.id })}
                    className={`py-2 rounded-lg border text-[11px] transition-colors ${
                      titleConfig.font === f.id
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-white'
                        : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
                    }`}
                    style={{ fontFamily: f.family }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tamanho */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Tamanho</span>
                <span className="font-mono">{titleConfig.fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[titleConfig.fontSize]}
                  min={30}
                  max={180}
                  step={2}
                  onValueChange={(v) => update({ fontSize: v[0] })}
                />
                <input
                  type="number"
                  min={30}
                  max={180}
                  step={2}
                  value={titleConfig.fontSize}
                  onChange={(e) => {
                    const n = Math.min(180, Math.max(30, Number(e.target.value) || 30))
                    update({ fontSize: n })
                  }}
                  className="w-14 bg-[#1C1C27] border border-white/10 rounded-md px-1.5 py-1 text-[10px] text-white text-center focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                />
              </div>
            </div>

            {/* Largura */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Largura (relativa ao canvas)</span>
                <span className="font-mono">{titleConfig.width}%</span>
              </div>
              <Slider
                value={[titleConfig.width]}
                min={20}
                max={100}
                step={5}
                onValueChange={(v) => update({ width: v[0] })}
              />
            </div>

            {/* Cor do texto */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Cor do texto
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {TEXT_SWATCHES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => update({ color: c.value })}
                    title={c.name}
                    className={`aspect-square rounded-md border-2 transition-all ${
                      titleConfig.color === c.value
                        ? 'border-[#7C5CFC] scale-105'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Fundo do texto */}
            <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                  Fundo do texto
                </span>
                <Switch
                  checked={titleConfig.bgEnabled}
                  onCheckedChange={(v) =>
                    update({
                      bgEnabled: v,
                      bgColor:
                        v && titleConfig.bgColor === 'transparent'
                          ? '#7C5CFC'
                          : titleConfig.bgColor,
                    })
                  }
                />
              </div>
              {titleConfig.bgEnabled && (
                <div className="grid grid-cols-9 gap-1.5">
                  <button
                    onClick={() => update({ bgColor: 'transparent' })}
                    title="Transparente"
                    className={`aspect-square rounded-md border-2 flex items-center justify-center text-[8px] font-bold transition-all ${
                      titleConfig.bgColor === 'transparent'
                        ? 'border-[#7C5CFC] text-white'
                        : 'border-white/10 text-[#9494A8] hover:border-white/30'
                    }`}
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
                      backgroundSize: '6px 6px',
                      backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                    }}
                  >
                    Off
                  </button>
                  {TEXT_SWATCHES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => update({ bgColor: c.value })}
                      title={c.name}
                      className={`aspect-square rounded-md border-2 transition-all ${
                        titleConfig.bgColor === c.value
                          ? 'border-[#7C5CFC] scale-105'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Alinhamento */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Alinhamento
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ALIGNS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => update({ alignment: a.id })}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border transition-colors ${
                      titleConfig.alignment === a.id
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-white'
                        : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
                    }`}
                    title={a.label}
                  >
                    {a.icon}
                    <span className="text-[8px]">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Posição vertical */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Posição vertical
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {V_POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => update({ position: p.id })}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border transition-colors ${
                      titleConfig.position === p.id
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-white'
                        : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
                    }`}
                    title={p.label}
                  >
                    {p.icon}
                    <span className="text-[8px]">{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-[#9494A8]">Arraste livre:</span>
                <span className="text-[9px] font-mono text-[#22D3EE] bg-[#22D3EE]/10 px-1.5 py-0.5 rounded">
                  X {titleConfig.normalizedX.toFixed(2)} · Y {titleConfig.normalizedY.toFixed(2)}
                </span>
                {titleConfig.position === 'custom' && (
                  <button
                    onClick={() =>
                      update({ position: 'middle', normalizedX: 0.5, normalizedY: 0.5 })
                    }
                    className="text-[9px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-1.5 py-0.5 rounded"
                  >
                    Resetar
                  </button>
                )}
              </div>
              <p className="text-[8px] text-[#9494A8]/70 leading-relaxed">
                Arraste o título diretamente no canvas para posicionamento livre.
              </p>
            </div>

            {/* Duração */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#9494A8] uppercase tracking-wider">Duração</label>
              <div className="flex items-center gap-3">
                {(['full', 'seconds'] as TitleDuration[]).map((d) => (
                  <label
                    key={d}
                    className="flex items-center gap-1.5 text-[10px] text-white cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="title-duration"
                      checked={titleConfig.duration === d}
                      onChange={() => update({ duration: d })}
                      className="accent-[#7C5CFC]"
                    />
                    {d === 'full' ? 'Vídeo inteiro' : 'Primeiros N segundos'}
                  </label>
                ))}
              </div>
              {titleConfig.duration === 'seconds' && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={titleConfig.durationSeconds}
                    onChange={(e) => {
                      const n = Math.min(120, Math.max(1, Number(e.target.value) || 1))
                      update({ durationSeconds: n })
                    }}
                    className="w-20 bg-[#1C1C27] border border-white/10 rounded-md px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                  />
                  <span className="text-[9px] text-[#9494A8]">segundos (1 a 120)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Type className="w-8 h-8 text-[#9494A8]/40 mb-2" />
            <p className="text-xs text-[#9494A8]">
              Ative "Exibir título" para configurar o título.
            </p>
          </div>
        )}
      </div>

      {/* Coluna lateral: dica */}
      <div className="w-44 shrink-0 bg-[#14141C] p-2.5 space-y-2 overflow-y-auto scrollbar-thin">
        <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Type className="w-3 h-3 text-[#7C5CFC]" /> Como funciona
        </span>
        <ul className="text-[9px] text-[#9494A8] space-y-1.5 leading-relaxed list-disc pl-3">
          <li>O título aparece acima de artes, reação, B-roll e quadro.</li>
          <li>Arraste direto no canvas para posicionar livremente.</li>
          <li>Contêiner com pointer-events: none — não bloqueia o quadro.</li>
          <li>O fundo do título tem padding de 16px e borda de 8px.</li>
          <li>Os controles de gravação (REC, timer) ficam acima do título.</li>
        </ul>
      </div>
    </div>
  )
}

export default TitlePanel
