import React, { useRef, useState } from 'react'
import { ImagePlus, Trash2, Scissors, Eye, AlertCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useStudio } from '@/context/StudioContext'
import { fileToDataUrl } from '@/hooks/use-block-media'
import type { BackgroundConfig, BackgroundType } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   BackgroundPanel — FASE 4.1
   Aba "Fundo" do painel inferior da Gravadora. Define o fundo renderizado
   atrás do canvas 9:16: nenhum, desfoque, presets de cor, imagem ou
   segmentação (quando suportada pelo navegador). Persiste em
   lumen_gravadora_fundo via StudioContext.
   ─────────────────────────────────────────────────────────────────────────── */

const PRESET_COLORS: { name: string; value: string }[] = [
  { name: 'Azul petróleo', value: '#1E3A5F' },
  { name: 'Cinza frio', value: '#4A4A4F' },
  { name: 'Grafite premium', value: '#2C2C30' },
  { name: 'Off white quente', value: '#F5F0EB' },
  { name: 'Rosa glow', value: '#FF2D55' },
  { name: 'Verde oliva', value: '#4A5D3E' },
]

/** Verifica suporte a segmentação de fundo do navegador (MediaPipe / nativa). */
function detectSegmentationSupport(): boolean {
  if (typeof window === 'undefined') return false
  // MediaPipe Tasks Vision (selfie segmentation) — detection aproximada.
  const w = window as any
  if (w.SelfieSegmentation || (w.MediaPipe && w.MediaPipe.SelfieSegmentation)) return true
  // Chrome/Edge "window.__AudioWorklet/VideoTrack" — sem API pública estável.
  // Apenas sinalizamos suporte quando há MediaPipe pré-carregado; caso
  // contrário exibimos como indisponível (sem simular ação).
  return false
}

const SEGMENTATION_SUPPORTED = detectSegmentationSupport()

const TYPE_OPTIONS: { id: BackgroundType; label: string; icon: React.ReactNode }[] = [
  { id: 'none', label: 'Nenhum', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'blur', label: 'Desfoque', icon: <Scissors className="w-3.5 h-3.5" /> },
  {
    id: 'preset',
    label: 'Cor',
    icon: <span className="w-3 h-3 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#FF2D55]" />,
  },
  { id: 'image', label: 'Imagem', icon: <ImagePlus className="w-3.5 h-3.5" /> },
]

export function BackgroundPanel() {
  const { backgroundConfig, setBackgroundConfig } = useStudio()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const update = (patch: Partial<BackgroundConfig>) =>
    setBackgroundConfig({ ...backgroundConfig, ...patch })

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/image\/(jpeg|png|webp)/.test(file.type)) {
      toast.warning('Apenas JPEG, PNG e WebP são suportados.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      update({ type: 'image', imageDataUrl: dataUrl, imageName: file.name })
      toast.success('Imagem de fundo carregada.')
    } catch {
      toast.error('Falha ao ler a imagem.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeImage = () => {
    update({ type: 'none', imageDataUrl: undefined, imageName: undefined })
    setConfirmRemove(false)
    toast.info('Imagem de fundo removida.')
  }

  const onToggleSegmentation = (v: boolean) => {
    if (v && !SEGMENTATION_SUPPORTED) {
      // Não deveria acontecer (checkbox desabilitado), mas tratamos mesmo assim.
      toast.error('Segmentação não suportada neste dispositivo')
      return
    }
    if (v) {
      // Tenta ativar a segmentação. Como não há pipeline MediaPipe carregado no
      // template, sinalizamos falha real e fazemos fallback ao fundo atual.
      toast.error('Segmentação não suportada neste dispositivo')
      update({ segmentationEnabled: false })
      return
    }
    update({ segmentationEnabled: false })
  }

  return (
    <div className="flex h-full">
      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-y-auto scrollbar-thin">
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5 text-[#7C5CFC]" /> Fundo do Canvas
          </h3>
          <p className="text-[10px] text-[#9494A8] mt-0.5">
            Renderizado atrás do canvas 9:16. O canvas fica centralizado sobre o fundo.
          </p>
        </div>

        <div className="p-3 space-y-4">
          {/* Seletor de tipo de fundo */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
              Tipo de fundo
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update({ type: opt.id })}
                  aria-pressed={backgroundConfig.type === opt.id}
                  aria-label={`Tipo de fundo: ${opt.label}`}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                    backgroundConfig.type === opt.id
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-white'
                      : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desfoque — slider de intensidade 4-25px */}
          {backgroundConfig.type === 'blur' && (
            <div className="space-y-1 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Intensidade do desfoque</span>
                <span className="font-mono">{backgroundConfig.blurAmount ?? 12}px</span>
              </div>
              <Slider
                value={[backgroundConfig.blurAmount ?? 12]}
                min={4}
                max={25}
                step={1}
                onValueChange={(v) => update({ blurAmount: v[0] })}
              />
              <p className="text-[9px] text-[#9494A8]/70">
                Aplica um desfoque no vídeo da câmera como fundo atrás do canvas.
              </p>
            </div>
          )}

          {/* Presets de cor */}
          {backgroundConfig.type === 'preset' && (
            <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Presets de cor
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => update({ presetColor: c.value })}
                    aria-pressed={backgroundConfig.presetColor === c.value}
                    aria-label={`Cor de fundo: ${c.name}`}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1.5 border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10] ${
                      backgroundConfig.presetColor === c.value
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span
                      className="w-full h-9 rounded-md border border-white/10"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="text-[9px] text-white text-center leading-tight">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Imagem */}
          {backgroundConfig.type === 'image' && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Imagem de fundo
              </span>
              {backgroundConfig.imageDataUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={backgroundConfig.imageDataUrl}
                      alt={backgroundConfig.imageName ?? 'fundo'}
                      className="w-16 h-16 object-cover rounded-md border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-white truncate">
                        {backgroundConfig.imageName ?? 'imagem.png'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <button
                          onClick={() => fileRef.current?.click()}
                          aria-label="Trocar imagem de fundo"
                          className="flex items-center gap-1 text-[9px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-1.5 py-0.5 rounded font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                        >
                          <Upload className="w-3 h-3" /> Trocar
                        </button>
                        {confirmRemove ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-red-300">Remover?</span>
                            <button
                              onClick={removeImage}
                              aria-label="Confirmar remoção"
                              className="text-[9px] text-red-400 hover:bg-red-500/20 px-1 rounded font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmRemove(false)}
                              aria-label="Cancelar remoção"
                              className="text-[9px] text-[#9494A8] hover:text-white px-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(true)}
                            aria-label="Remover imagem de fundo"
                            className="flex items-center gap-1 text-[9px] text-red-400 hover:bg-red-500/10 px-1.5 py-0.5 rounded font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-white/10 rounded-lg gap-2">
                  <ImagePlus className="w-6 h-6 text-[#9494A8]/50" />
                  <p className="text-[10px] text-[#9494A8]">Nenhuma imagem selecionada.</p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    aria-label="Selecionar imagem de fundo"
                    className="flex items-center gap-1.5 text-[10px] bg-[#7C5CFC] hover:bg-[#6A48E0] text-white px-3 py-1.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> Selecionar imagem
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePick}
              />
            </div>
          )}

          {/* Segmentação */}
          <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-[#22D3EE]" /> Remover fundo da câmera
                </p>
                <p className="text-[9px] text-[#9494A8]/70 mt-0.5">
                  Segmentação (MediaPipe / API nativa). Em caso de falha, usa o fundo selecionado.
                </p>
              </div>
              <div
                className="relative flex items-center"
                title={SEGMENTATION_SUPPORTED ? '' : 'Indisponível no seu navegador'}
              >
                <Switch
                  checked={backgroundConfig.segmentationEnabled && SEGMENTATION_SUPPORTED}
                  onCheckedChange={onToggleSegmentation}
                  disabled={!SEGMENTATION_SUPPORTED}
                />
              </div>
            </div>
            {!SEGMENTATION_SUPPORTED && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">
                  <AlertCircle className="w-3 h-3" /> Indisponível no seu navegador
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coluna lateral: dica */}
      <div className="w-44 shrink-0 bg-[#14141C] p-2.5 space-y-2 overflow-y-auto scrollbar-thin">
        <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Eye className="w-3 h-3 text-[#7C5CFC]" /> Como funciona
        </span>
        <ul className="text-[9px] text-[#9494A8] space-y-1.5 leading-relaxed list-disc pl-3">
          <li>O fundo preenche toda a área atrás do canvas 9:16.</li>
          <li>"Nenhum" = fundo preto puro (padrão).</li>
          <li>"Desfoque" usa o vídeo da câmera desfocado.</li>
          <li>As cores preset cobrem toda a área de fundo.</li>
          <li>A imagem é redimensionada para cobrir a área (object-cover).</li>
          <li>Segmentação requer suporte do navegador; senão, mostra badge.</li>
        </ul>
      </div>
    </div>
  )
}

export default BackgroundPanel
