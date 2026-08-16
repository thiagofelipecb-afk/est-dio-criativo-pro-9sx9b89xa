import React, { useEffect, useRef, useState } from 'react'
import {
  ImagePlus,
  Trash2,
  Scissors,
  Eye,
  AlertCircle,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Wand2,
  Eraser,
} from 'lucide-react'
import { assetManager } from '@/lib/asset-manager'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useStudio } from '@/context/StudioContext'
import { fileToDataUrl } from '@/hooks/use-block-media'
import {
  subscribeSegmentationStatus,
  getSegmentationStatus,
  type SegmentationStatus,
} from '@/lib/segmentation'
import type { BackgroundConfig, BackgroundType, MediaAsset } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   BackgroundPanel — v0.0.75
   Aba "Fundo" do painel inferior da Gravadora. Define o fundo renderizado
   ATRÁS da pessoa no canvas 9:16:
     - Nenhum (preto)
     - Cor sólida (12 presets profissionais + color picker)
     - Gradiente (2 cores + direção)
     - Imagem (upload + biblioteca lumen_media_assets)
     - Desfoque (slider 0–100%)
     - Remoção de fundo (segmentação; sem fundo/transparente → preto)
   A segmentação (MediaPipe Selfie Segmentation) é carregada sob demanda e
   seu status é exibido em tempo real. O pipeline real vive no StudioStage;
   aqui apenas lemos o store global de status.
   ─────────────────────────────────────────────────────────────────────────── */

/** 12 cores predefinidas profissionais para o modo "Cor Sólida". */
const PRESET_COLORS: { name: string; value: string }[] = [
  { name: 'Azul petróleo', value: '#1E3A5F' },
  { name: 'Cinza frio', value: '#4A4A4F' },
  { name: 'Grafite premium', value: '#2C2C30' },
  { name: 'Off white quente', value: '#F5F0EB' },
  { name: 'Rosa glow', value: '#FF2D55' },
  { name: 'Verde oliva', value: '#4A5D3E' },
  { name: 'Azul royal', value: '#1E40AF' },
  { name: 'Violeta', value: '#7C5CFC' },
  { name: 'Terracota', value: '#C2410C' },
  { name: 'Pêssego', value: '#FB923C' },
  { name: 'Turquesa', value: '#0D9488' },
  { name: 'Bordô', value: '#7F1D1D' },
]

/** Direções de gradiente disponíveis no seletor. */
const GRADIENT_DIRECTIONS: { id: string; label: string; angle: number }[] = [
  { id: 'horizontal', label: 'Horizontal', angle: 90 },
  { id: 'vertical', label: 'Vertical', angle: 180 },
  { id: 'diagonal', label: 'Diagonal', angle: 135 },
]

const TYPE_OPTIONS: { id: BackgroundType; label: string; icon: React.ReactNode }[] = [
  { id: 'none', label: 'Nenhum', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'blur', label: 'Desfoque', icon: <Scissors className="w-3.5 h-3.5" /> },
  {
    id: 'preset',
    label: 'Cor',
    icon: <span className="w-3 h-3 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#FF2D55]" />,
  },
  { id: 'gradient', label: 'Gradiente', icon: <Wand2 className="w-3.5 h-3.5" /> },
  { id: 'image', label: 'Imagem', icon: <ImagePlus className="w-3.5 h-3.5" /> },
  { id: 'removal', label: 'Remover', icon: <Eraser className="w-3.5 h-3.5" /> },
]

/** Texto/ícone do estado da segmentação exibido no painel. */
function SegmentationBadge({ status }: { status: SegmentationStatus }) {
  switch (status) {
    case 'loading':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando modelo...
        </span>
      )
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.5">
          <CheckCircle2 className="w-3 h-3" /> Modelo pronto ✓
        </span>
      )
    case 'unavailable':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-300 bg-red-500/15 border border-red-500/30 rounded px-1.5 py-0.5">
          <XCircle className="w-3 h-3" /> Falha ao carregar
        </span>
      )
    case 'no-person':
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-300 bg-orange-500/15 border border-orange-500/30 rounded px-1.5 py-0.5">
          <AlertCircle className="w-3 h-3" /> Nenhum rosto detectado
        </span>
      )
  }
}

export function BackgroundPanel() {
  const { backgroundConfig, setBackgroundConfig, mediaAssets } = useStudio()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [segStatus, setSegStatus] = useState<SegmentationStatus>(() => getSegmentationStatus())

  // Assina o store global de status da segmentação (atualizado pelo StudioStage).
  useEffect(() => {
    const unsub = subscribeSegmentationStatus((s) => setSegStatus(s))
    return () => {
      unsub()
    }
  }, [])

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
      await assetManager.addAsset(file, 'upload', { type: 'background' })
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

  /** Aplica um ativo da biblioteca canônica como imagem de fundo. */
  const applyLibraryAsset = (asset: MediaAsset) => {
    if (asset.type !== 'image' || !asset.publicUrl) {
      toast.warning('Selecione uma imagem da biblioteca.')
      return
    }
    update({
      type: 'image',
      imageDataUrl: asset.publicUrl,
      imageName: asset.name,
    })
    toast.success(`Fundo definido: ${asset.name}`)
  }

  const onToggleSegmentation = (v: boolean) => {
    update({ segmentationEnabled: v })
    if (v) {
      // O StudioStage detecta a mudança e carrega o pipeline; o status
      // transita para 'loading' e depois 'ready'/'unavailable'/'no-person'.
      toast.info('Iniciando segmentação...')
    } else {
      toast.info('Segmentação desativada.')
    }
  }

  // Quando o usuário escolhe "Remoção de fundo", ligamos a segmentação
  // automaticamente (ela é o mecanismo que recorta a pessoa).
  const selectType = (type: BackgroundType) => {
    if (type === 'removal') {
      update({ type: 'removal', segmentationEnabled: true })
    } else {
      update({ type })
    }
  }

  // Filtra apenas imagens da biblioteca canônica para o seletor de fundo.
  const libraryImages = (mediaAssets || []).filter((a) => a.type === 'image' && a.publicUrl)

  return (
    <div className="flex h-full">
      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-y-auto scrollbar-thin">
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5 text-[#7C5CFC]" /> Fundo do Canvas
          </h3>
          <p className="text-[10px] text-[#9494A8] mt-0.5">
            Renderizado atrás da pessoa no canvas 9:16. A pessoa é sempre visível.
          </p>
        </div>

        <div className="p-3 space-y-4">
          {/* Seletor de tipo de fundo */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
              Tipo de fundo
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => selectType(opt.id)}
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

          {/* Desfoque — slider 0–100 (percentual) */}
          {backgroundConfig.type === 'blur' && (
            <div className="space-y-1 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <div className="flex justify-between text-[10px] text-[#9494A8]">
                <span>Intensidade do desfoque</span>
                <span className="font-mono">{backgroundConfig.blurAmount ?? 50}%</span>
              </div>
              <Slider
                value={[backgroundConfig.blurAmount ?? 50]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => update({ blurAmount: v[0] })}
              />
              <p className="text-[9px] text-[#9494A8]/70">
                Apenas o fundo fica desfocado; a pessoa permanece nítida (segmentação).
              </p>
            </div>
          )}

          {/* Cor sólida — 12 presets + color picker */}
          {backgroundConfig.type === 'preset' && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">
                Cores profissionais
              </span>
              <div className="grid grid-cols-4 gap-2">
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
                      className="w-full h-8 rounded-md border border-white/10"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="text-[8px] text-white text-center leading-tight truncate w-full">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label
                  className="text-[9px] text-[#9494A8] cursor-pointer"
                  htmlFor="bg-custom-color"
                >
                  Cor personalizada:
                </label>
                <input
                  id="bg-custom-color"
                  type="color"
                  value={backgroundConfig.presetColor ?? '#1E3A5F'}
                  onChange={(e) => update({ presetColor: e.target.value })}
                  className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                  aria-label="Cor personalizada de fundo"
                />
              </div>
            </div>
          )}

          {/* Gradiente — 2 cores + direção */}
          {backgroundConfig.type === 'gradient' && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">Gradiente</span>
              <div className="flex items-center gap-2">
                <label className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#9494A8]">Cor 1</span>
                  <input
                    type="color"
                    value={backgroundConfig.gradientColor1 ?? '#7C5CFC'}
                    onChange={(e) => update({ gradientColor1: e.target.value })}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                    aria-label="Cor 1 do gradiente"
                  />
                </label>
                <label className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#9494A8]">Cor 2</span>
                  <input
                    type="color"
                    value={backgroundConfig.gradientColor2 ?? '#22D3EE'}
                    onChange={(e) => update({ gradientColor2: e.target.value })}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                    aria-label="Cor 2 do gradiente"
                  />
                </label>
                <div
                  className="flex-1 h-10 rounded-md border border-white/10"
                  style={{
                    background: `linear-gradient(${backgroundConfig.gradientAngle ?? 135}deg, ${
                      backgroundConfig.gradientColor1 ?? '#7C5CFC'
                    }, ${backgroundConfig.gradientColor2 ?? '#22D3EE'})`,
                  }}
                  aria-hidden
                />
              </div>
              <div className="flex items-center gap-1.5">
                {GRADIENT_DIRECTIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => update({ gradientAngle: d.angle })}
                    aria-pressed={(backgroundConfig.gradientAngle ?? 135) === d.angle}
                    className={`flex-1 text-[9px] py-1 rounded border font-semibold transition-colors ${
                      (backgroundConfig.gradientAngle ?? 135) === d.angle
                        ? 'border-[#7C5CFC] bg-[#7C5CFC]/10 text-white'
                        : 'border-white/10 text-[#9494A8] hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Imagem — upload + biblioteca */}
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
              {/* Biblioteca de mídias (lumen_media_assets) */}
              {libraryImages.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                    Da biblioteca
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                    {libraryImages.slice(0, 24).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => applyLibraryAsset(a)}
                        aria-label={`Usar ${a.name} como fundo`}
                        className="relative aspect-square rounded-md overflow-hidden border border-white/10 hover:border-[#7C5CFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
                      >
                        <img
                          src={a.thumbnailUrl || a.publicUrl}
                          alt={a.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Segmentação — estado + toggle (para modos que usam recorte) */}
          <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-[#22D3EE]" /> Segmentação (recorte da
                  pessoa)
                </p>
                <p className="text-[9px] text-[#9494A8]/70 mt-0.5">
                  Recorta a pessoa do fundo (cabelo, ombros, mãos). Em caso de falha, usa o fundo
                  original.
                </p>
              </div>
              <Switch
                checked={backgroundConfig.segmentationEnabled}
                onCheckedChange={onToggleSegmentation}
                aria-label="Ativar segmentação"
              />
            </div>
            {/* Estado do modelo de segmentação */}
            {backgroundConfig.segmentationEnabled && (
              <div className="flex items-center justify-between gap-2 mt-1">
                <SegmentationBadge status={segStatus} />
                {/* Botão "Desativar segmentação" quando há problema. */}
                {(segStatus === 'unavailable' || segStatus === 'no-person') && (
                  <button
                    onClick={() => onToggleSegmentation(false)}
                    className="text-[9px] text-[#9494A8] hover:text-white underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] rounded px-1"
                    aria-label="Desativar segmentação"
                  >
                    Desativar segmentação
                  </button>
                )}
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
          <li>A pessoa é SEMPRE desenhada à frente do fundo.</li>
          <li>"Nenhum" = preto puro (padrão).</li>
          <li>"Cor" ou "Gradiente" preenchem o fundo atrás da pessoa.</li>
          <li>"Desfoque" borra o fundo real da câmera.</li>
          <li>"Remover" usa segmentação para recortar a pessoa.</li>
          <li>A segmentação pode falhar; nesse caso, usamos o fundo original.</li>
        </ul>
      </div>
    </div>
  )
}

export default BackgroundPanel
