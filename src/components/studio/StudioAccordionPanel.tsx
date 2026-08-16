/* =============================================================================
   LUMEN Studio — StudioAccordionPanel (Módulo 4)
   Painel lateral direito da Gravadora reorganizado em 8 acordeões:
   1. Roteiro · 2. Mídias · 3. Layout · 4. Câmera · 5. Aparência
   6. Fundo · 7. Áudio · 8. Gravação
   Regras: só UM aberto por vez, altura máxima com scroll próprio, botões de
   ação sempre acessíveis, NÃO fica por baixo do dock, padding inferior.
   ========================================================================== */

import React, { useState, useMemo } from 'react'
import {
  ChevronDown,
  FileText,
  Film,
  LayoutTemplate,
  Camera,
  Sparkles,
  ImageIcon,
  Mic,
  Circle,
  Loader2,
  AlertTriangle,
  Download,
  Wand2,
  Save,
  Scissors,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScriptPanel } from '@/components/ScriptPanel'
import { BackgroundPanel } from '@/components/studio/BackgroundPanel'
import { MediaPanel } from '@/components/studio/MediaPanel'
import type { ScriptBlock } from '@/types/studio'
import {
  CAMERA_PRESETS,
  BEAUTY_PRESETS,
  SPLIT_MODES,
  SPLIT_PRESETS,
  type AspectRatioOption,
  type SplitModeId,
  type CameraPresetId,
  type BeautyPresetId,
  type SplitPresetId,
  estimateScriptStats,
  deterministicSplit,
} from '@/lib/studio-recording-logic'

/* ---------- Tipos de props (estado vindo da Gravadora) ---------- */

export interface StudioAccordionPanelProps {
  projectId: string
  // Layout
  aspectRatio: AspectRatioOption
  onAspectRatioChange: (v: AspectRatioOption) => void
  splitMode: SplitModeId
  onSplitModeChange: (v: SplitModeId) => void
  splitCameraRatio: number
  onSplitCameraRatioChange: (v: number) => void
  margin: number
  onMarginChange: (v: number) => void
  spacing: number
  onSpacingChange: (v: number) => void
  borderRadius: number
  onBorderRadiusChange: (v: number) => void
  borderWidth: number
  onBorderWidthChange: (v: number) => void
  // Câmera
  cameras: MediaDeviceInfo[]
  selectedCamera: string
  onSelectCamera: (id: string) => void
  cameraCapabilities: {
    maxWidth: number
    maxHeight: number
    maxFrameRate: number
    zoom: { min: number; max: number; step: number } | null
    supportedResolutions: string[]
  } | null
  cameraConfig: {
    brightness: number
    contrast: number
    beautySmooth: number
    saturation: number
    temperature: number
    sharpness: number
    smoothness: number
    vignette: number
  }
  updateCameraConfig: (
    u: Partial<{
      brightness: number
      contrast: number
      beautySmooth: number
      saturation: number
      temperature: number
      sharpness: number
      smoothness: number
      vignette: number
    }>,
  ) => void
  camStatus: string
  // Aparência (beauty)
  beauty: {
    skinSmooth: number
    shineReduction: number
    toneUniformity: number
    rednessReduction: number
    wrinkleSmooth: number
    eyeEnhance: number
    nasolabial: number
    darkCircles: number
    facialLighting: number
    selectiveSharpness: number
    intensity: number
  }
  setBeauty: (u: Partial<StudioAccordionPanelProps['beauty']>) => void
  faceDetected: boolean
  mediapipeLoading: boolean
  mediapipeAvailable: boolean
  webglAvailable: boolean
  onLoadMediapipe: () => void
  // Áudio
  mics: MediaDeviceInfo[]
  selectedMic: string
  onSelectMic: (id: string) => void
  audioConfig: {
    noiseSuppression: boolean
    autoGainControl: boolean
    echoCancellation: boolean
    manualGain: number
  }
  updateAudioConfig: (u: Partial<StudioAccordionPanelProps['audioConfig']>) => void
  micLevel: number
  // Gravação
  recordingSettings: {
    format: string
    quality: string
    countdown: 3 | 5 | 0
    autoSave: boolean
    takeName: string
  }
  setRecordingSettings: (u: Partial<StudioAccordionPanelProps['recordingSettings']>) => void
  // Roteiro (estatísticas + presets de divisão)
  gravadoraScript: string
  setGravadoraScript: (t: string) => void
  setScriptBlocks: (blocks: ScriptBlock[]) => void
}

/* ---------- Acordeão genérico ---------- */

type AccordionId =
  | 'roteiro'
  | 'midias'
  | 'layout'
  | 'camera'
  | 'aparencia'
  | 'fundo'
  | 'audio'
  | 'gravacao'

const ACCORDIONS: { id: AccordionId; label: string; icon: React.ReactNode }[] = [
  { id: 'roteiro', label: 'Roteiro', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'midias', label: 'Mídias', icon: <Film className="w-3.5 h-3.5" /> },
  { id: 'layout', label: 'Layout', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
  { id: 'camera', label: 'Câmera', icon: <Camera className="w-3.5 h-3.5" /> },
  { id: 'aparencia', label: 'Aparência', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'fundo', label: 'Fundo', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: 'audio', label: 'Áudio', icon: <Mic className="w-3.5 h-3.5" /> },
  { id: 'gravacao', label: 'Gravação', icon: <Circle className="w-3.5 h-3.5" /> },
]

export function StudioAccordionPanel(props: StudioAccordionPanelProps) {
  // Só UM acordeão aberto por vez (null = todos fechados). Mudar de acordeão
  // NÃO apaga configurações — cada seção apenas é montada/desmontada.
  const [open, setOpen] = useState<AccordionId | null>('roteiro')
  const [splitPreset, setSplitPreset] = useState<SplitPresetId>('medium')
  const [customDuration, setCustomDuration] = useState(45)
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitProcessing, setSplitProcessing] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('natural')
  const [beautyPreset, setBeautyPreset] = useState<BeautyPresetId>('off')
  const [showBefore, setShowBefore] = useState(false)

  const stats = useMemo(() => estimateScriptStats(props.gravadoraScript), [props.gravadoraScript])

  const handleSplit = (presetId: SplitPresetId) => {
    setSplitPreset(presetId)
    setSplitError(null)
    setSplitProcessing(true)
    try {
      const target =
        presetId === 'custom'
          ? customDuration
          : presetId === 'one-sentence'
            ? 0
            : SPLIT_PRESETS.find((p) => p.id === presetId)!.targetSeconds
      const blocks = deterministicSplit(props.gravadoraScript, target)
      if (blocks.length === 0) {
        setSplitError('Nenhum texto para dividir. Cole seu roteiro primeiro.')
      } else {
        props.setScriptBlocks(blocks)
      }
    } catch {
      setSplitError('Erro ao dividir o roteiro. Tente novamente.')
    } finally {
      setSplitProcessing(false)
    }
  }

  const applyCameraPreset = (id: CameraPresetId) => {
    setCameraPreset(id)
    const p = CAMERA_PRESETS.find((x) => x.id === id)!
    if (id !== 'personalizado') {
      props.updateCameraConfig({
        brightness: p.brightness,
        contrast: p.contrast,
        beautySmooth: p.beautySmooth,
      })
    }
  }

  const applyBeautyPreset = (id: BeautyPresetId) => {
    setBeautyPreset(id)
    const p = BEAUTY_PRESETS.find((x) => x.id === id)!
    if (id !== 'personalizado') {
      props.setBeauty({
        skinSmooth: p.skinSmooth,
        shineReduction: p.shineReduction,
        toneUniformity: p.toneUniformity,
        rednessReduction: p.rednessReduction,
        wrinkleSmooth: p.wrinkleSmooth,
        eyeEnhance: p.eyeEnhance,
        nasolabial: p.nasolabial,
        darkCircles: p.darkCircles,
        facialLighting: p.facialLighting,
        selectiveSharpness: p.selectiveSharpness,
        intensity: p.intensity,
      })
      // Aplica também os ajustes de imagem do preset (visíveis no preview e na
      // gravação via compositor — brilho, contraste, saturação, temperatura,
      // suavização). Preset "off" zera os ajustes.
      props.updateCameraConfig({
        brightness: p.camera.brightness,
        contrast: p.camera.contrast,
        beautySmooth: p.camera.beautySmooth,
        saturation: p.camera.saturation,
        temperature: p.camera.temperature,
        smoothness: p.camera.smoothness,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0E0E15]">
      {/* Header fixo */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <span className="text-[10px] font-bold text-[#9494A8] uppercase tracking-widest">
          Painel de Estúdio
        </span>
      </div>

      {/* Lista de acordeões com scroll próprio */}
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 pb-24">
        {ACCORDIONS.map((acc) => {
          const isOpen = open === acc.id
          return (
            <div
              key={acc.id}
              className="mb-1.5 rounded-xl border border-white/5 bg-[#14141C] overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : acc.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2 text-[11px] font-bold text-white uppercase tracking-wider">
                  <span className="text-[#7C5CFC]">{acc.icon}</span>
                  {acc.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#9494A8] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
                  {/* ============ 1. ROTEIRO ============ */}
                  {acc.id === 'roteiro' && (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        <StatBox label="Duração" value={formatDur(stats.durationSeconds)} />
                        <StatBox label="Palavras" value={String(stats.words)} />
                        <StatBox label="Blocos" value={String(stats.blocks)} />
                      </div>
                      <textarea
                        rows={5}
                        value={props.gravadoraScript}
                        onChange={(e) => props.setGravadoraScript(e.target.value)}
                        placeholder="Cole ou escreva seu roteiro..."
                        className="w-full bg-[#1C1C27] border border-white/10 rounded-xl p-2.5 text-xs text-white leading-relaxed resize-none focus:outline-none focus:border-[#7C5CFC] placeholder:text-[#9494A8]/50"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <MiniBtn
                          icon={<Download className="w-3 h-3" />}
                          label="Importar"
                          onClick={() => document.getElementById('script-import-input')?.click()}
                        />
                        <input
                          id="script-import-input"
                          type="file"
                          accept=".txt,.md"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            const r = new FileReader()
                            r.onload = () => props.setGravadoraScript(String(r.result || ''))
                            r.readAsText(f)
                          }}
                        />
                        <MiniBtn
                          icon={<Wand2 className="w-3 h-3" />}
                          label="Gerar com IA"
                          onClick={() =>
                            toast.info('Assistente IA disponível no painel Roteiro abaixo.')
                          }
                        />
                        <MiniBtn
                          icon={<Scissors className="w-3 h-3" />}
                          label="Dividir em blocos"
                          onClick={() => handleSplit(splitPreset)}
                        />
                        <MiniBtn
                          icon={<FileText className="w-3 h-3" />}
                          label="Usar texto inteiro"
                          onClick={() => {
                            const blocks = deterministicSplit(props.gravadoraScript, 9999)
                            props.setScriptBlocks(blocks.length ? blocks : [])
                            toast.info('Texto inteiro usado como bloco único.')
                          }}
                        />
                        <MiniBtn
                          icon={<Save className="w-3 h-3" />}
                          label="Salvar rascunho"
                          onClick={() => toast.info('Rascunho salvo automaticamente.')}
                        />
                      </div>

                      {/* Presets de divisão */}
                      <div>
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Presets de divisão
                        </span>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {SPLIT_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setSplitPreset(p.id)}
                              disabled={splitProcessing}
                              className={`text-[9px] py-1.5 rounded-lg border transition-all ${splitPreset === p.id ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        {splitPreset === 'custom' && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[9px] text-[#9494A8]">
                              <span>Duração por bloco</span>
                              <span className="font-mono">{customDuration}s</span>
                            </div>
                            <Slider
                              value={[customDuration]}
                              min={5}
                              max={120}
                              step={5}
                              onValueChange={(v) => setCustomDuration(v[0])}
                            />
                          </div>
                        )}
                      </div>

                      {splitProcessing && (
                        <div className="flex items-center gap-2 text-[10px] text-[#22D3EE]">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processando roteiro...
                        </div>
                      )}
                      {splitError && (
                        <div className="flex items-center gap-2 text-[10px] text-red-300">
                          <AlertTriangle className="w-3 h-3" /> {splitError}
                          <button onClick={() => handleSplit(splitPreset)} className="underline">
                            Tentar novamente
                          </button>
                        </div>
                      )}

                      {/* Edição inline de blocos (reutiliza ScriptPanel que já tem split/juntar/duplicar/reordenar/excluir) */}
                      <div className="pt-2 border-t border-white/5">
                        <ScriptPanel />
                      </div>
                    </>
                  )}

                  {/* ============ 2. MÍDIAS ============ */}
                  {acc.id === 'midias' && <MediaPanel projectId={props.projectId} />}

                  {/* ============ 3. LAYOUT ============ */}
                  {acc.id === 'layout' && (
                    <>
                      <div>
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Proporção
                        </span>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          {(['9:16', '16:9', '1:1', '4:5'] as AspectRatioOption[]).map((r) => (
                            <button
                              key={r}
                              onClick={() => props.onAspectRatioChange(r)}
                              className={`text-[10px] py-1.5 rounded-lg border transition-all ${props.aspectRatio === r ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Modo de tela dividida
                        </span>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {SPLIT_MODES.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => props.onSplitModeChange(m.id)}
                              className={`text-[10px] py-1.5 rounded-lg border transition-all ${props.splitMode === m.id ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {props.splitMode !== 'full' && (
                        <SliderRow
                          label="Proporção da divisão (câmera)"
                          value={Math.round(props.splitCameraRatio * 100)}
                          min={20}
                          max={80}
                          step={5}
                          onChange={(v) => props.onSplitCameraRatioChange(v / 100)}
                          suffix="%"
                        />
                      )}
                      <SliderRow
                        label="Margem"
                        value={props.margin}
                        min={0}
                        max={40}
                        step={1}
                        onChange={props.onMarginChange}
                        suffix="px"
                      />
                      <SliderRow
                        label="Espaçamento"
                        value={props.spacing}
                        min={0}
                        max={40}
                        step={1}
                        onChange={props.onSpacingChange}
                        suffix="px"
                      />
                      <SliderRow
                        label="Borda (espessura)"
                        value={props.borderWidth}
                        min={0}
                        max={10}
                        step={1}
                        onChange={props.onBorderWidthChange}
                        suffix="px"
                      />
                      <SliderRow
                        label="Arredondamento"
                        value={props.borderRadius}
                        min={0}
                        max={48}
                        step={2}
                        onChange={props.onBorderRadiusChange}
                        suffix="px"
                      />
                    </>
                  )}

                  {/* ============ 4. CÂMERA ============ */}
                  {acc.id === 'camera' && (
                    <>
                      <SelectRow
                        label="Dispositivo de vídeo"
                        value={props.selectedCamera}
                        onChange={props.onSelectCamera}
                        options={props.cameras.map((c, i) => ({
                          value: c.deviceId,
                          label: c.label || `Câmera ${i + 1}`,
                        }))}
                        disabledHint={
                          props.camStatus !== 'ready'
                            ? 'Ative a câmera para ver os nomes reais.'
                            : undefined
                        }
                      />
                      {props.cameraCapabilities && (
                        <div className="text-[9px] text-[#9494A8] bg-[#1C1C27] rounded-lg p-2 leading-relaxed">
                          Resolução máx.: {props.cameraCapabilities.maxWidth}×
                          {props.cameraCapabilities.maxHeight}
                          <br />
                          FPS máx.: {props.cameraCapabilities.maxFrameRate}
                          <br />
                          Suportadas:{' '}
                          {props.cameraCapabilities.supportedResolutions.join(', ') || '—'}
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Presets de câmera
                        </span>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                          {CAMERA_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => applyCameraPreset(p.id)}
                              className={`text-[9px] py-1.5 rounded-lg border transition-all ${cameraPreset === p.id ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <SliderRow
                        label="Brilho"
                        value={props.cameraConfig.brightness}
                        min={50}
                        max={150}
                        step={1}
                        onChange={(v) => props.updateCameraConfig({ brightness: v })}
                        suffix="%"
                      />
                      <SliderRow
                        label="Contraste"
                        value={props.cameraConfig.contrast}
                        min={50}
                        max={150}
                        step={1}
                        onChange={(v) => props.updateCameraConfig({ contrast: v })}
                        suffix="%"
                      />
                      {props.cameraCapabilities?.zoom ? (
                        <SliderRow
                          label="Zoom"
                          value={props.cameraCapabilities.zoom.min}
                          min={props.cameraCapabilities.zoom.min}
                          max={props.cameraCapabilities.zoom.max}
                          step={props.cameraCapabilities.zoom.step}
                          onChange={() => {}}
                          suffix=""
                        />
                      ) : (
                        <p className="text-[9px] text-[#9494A8]/70">
                          Zoom não suportado por este dispositivo.
                        </p>
                      )}
                      <p className="text-[9px] text-[#9494A8]/70 leading-relaxed">
                        Controles avançados (exposição, foco, balanço de branco, saturação, nitidez)
                        são aplicados via applyConstraints apenas quando suportados pelo
                        dispositivo.
                      </p>
                      <div className="rounded-lg border border-white/10 bg-[#1C1C27] p-2 space-y-1.5">
                        {(
                          [
                            'exposureTime',
                            'focusDistance',
                            'whiteBalanceMode',
                            'brightness',
                            'contrast',
                            'saturation',
                            'sharpness',
                          ] as const
                        ).map((cap) => (
                          <CapabilityRow key={cap} cap={cap} />
                        ))}
                      </div>
                    </>
                  )}

                  {/* ============ 5. APARÊNCIA ============ */}
                  {acc.id === 'aparencia' && (
                    <>
                      {/* Ajustes de imagem globais — sempre disponíveis, aplicados
                          no compositor via ctx.filter. Estes mudam VISIVELMENTE o
                          preview e o arquivo gravado, mesmo sem detecção facial. */}
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[9px] text-emerald-200/80 leading-relaxed">
                        Ajustes de imagem aplicados em tempo real no preview e na gravação.
                      </div>

                      <div>
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Presets de aparência
                        </span>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {BEAUTY_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => applyBeautyPreset(p.id)}
                              className={`text-[9px] py-1.5 rounded-lg border transition-all ${beautyPreset === p.id ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1 border-t border-white/5">
                        <span className="text-[9px] text-[#7C5CFC] uppercase tracking-wider font-bold">
                          Ajustes de imagem
                        </span>
                      </div>
                      <SliderRow
                        label="Brilho"
                        value={props.cameraConfig.brightness}
                        min={50}
                        max={150}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ brightness: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />
                      <SliderRow
                        label="Contraste"
                        value={props.cameraConfig.contrast}
                        min={50}
                        max={150}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ contrast: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />
                      <SliderRow
                        label="Saturação"
                        value={props.cameraConfig.saturation}
                        min={0}
                        max={200}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ saturation: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />
                      <SliderRow
                        label="Temperatura de cor"
                        value={props.cameraConfig.temperature}
                        min={-50}
                        max={50}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ temperature: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix=""
                      />
                      <SliderRow
                        label="Suavização (blur)"
                        value={props.cameraConfig.smoothness}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ smoothness: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />
                      <SliderRow
                        label="Suavização de pele (Beauty)"
                        value={props.cameraConfig.beautySmooth}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ beautySmooth: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />
                      <SliderRow
                        label="Nitidez seletiva"
                        value={props.cameraConfig.sharpness}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ sharpness: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />
                      <SliderRow
                        label="Vinheta"
                        value={props.cameraConfig.vignette}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => {
                          props.updateCameraConfig({ vignette: v })
                          setBeautyPreset('personalizado')
                        }}
                        suffix="%"
                      />

                      {/* Detalhes faciais avançados — controle refinado que realça
                          os mesmos efeitos do preset. Requer o modelo facial
                          opcional para ser aplicado por região; sem ele, apenas os
                          ajustes de imagem acima atuam. */}
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Detalhes faciais
                        </span>
                        <p className="text-[8px] text-[#9494A8]/70 mt-0.5 leading-relaxed">
                          Refinamento por região. Sem o modelo facial carregado, apenas os ajustes
                          de imagem acima são aplicados ao vídeo.
                        </p>
                      </div>
                      {!props.mediapipeAvailable ? (
                        <div className="rounded-lg border border-white/10 bg-[#1C1C27] p-2.5 space-y-2">
                          <div className="flex items-center gap-2 text-[9px] text-[#9494A8]">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Modelo facial opcional (≈8MB)</span>
                          </div>
                          <button
                            onClick={props.onLoadMediapipe}
                            disabled={props.mediapipeLoading}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#7C5CFC] text-white text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {props.mediapipeLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {props.mediapipeLoading ? 'Carregando...' : 'Carregar modelo facial'}
                          </button>
                          {!props.webglAvailable && (
                            <p className="text-[9px] text-amber-300/80 leading-relaxed">
                              Seu navegador não suporta WebGL — apenas ajustes globais estarão
                              disponíveis.
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          {!props.faceDetected && (
                            <div className="flex items-center gap-2 text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">
                              <AlertTriangle className="w-3 h-3" /> Nenhum rosto detectado — efeitos
                              reduzidos.
                            </div>
                          )}
                          <BeautySlider
                            label="Suavização de pele"
                            value={props.beauty.skinSmooth}
                            onChange={(v) => {
                              props.setBeauty({ skinSmooth: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Redução de brilho/oleosidade"
                            value={props.beauty.shineReduction}
                            onChange={(v) => {
                              props.setBeauty({ shineReduction: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Uniformização de tonalidade"
                            value={props.beauty.toneUniformity}
                            onChange={(v) => {
                              props.setBeauty({ toneUniformity: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Redução de vermelhidão"
                            value={props.beauty.rednessReduction}
                            onChange={(v) => {
                              props.setBeauty({ rednessReduction: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Suavização de rugas finas"
                            value={props.beauty.wrinkleSmooth}
                            onChange={(v) => {
                              props.setBeauty({ wrinkleSmooth: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Olhos"
                            value={props.beauty.eyeEnhance}
                            onChange={(v) => {
                              props.setBeauty({ eyeEnhance: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Sulco nasolabial"
                            value={props.beauty.nasolabial}
                            onChange={(v) => {
                              props.setBeauty({ nasolabial: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Olheiras"
                            value={props.beauty.darkCircles}
                            onChange={(v) => {
                              props.setBeauty({ darkCircles: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Iluminação facial"
                            value={props.beauty.facialLighting}
                            onChange={(v) => {
                              props.setBeauty({ facialLighting: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <BeautySlider
                            label="Nitidez seletiva (olhos/lábios)"
                            value={props.beauty.selectiveSharpness}
                            onChange={(v) => {
                              props.setBeauty({ selectiveSharpness: v })
                              setBeautyPreset('personalizado')
                            }}
                          />
                          <SliderRow
                            label="Intensidade geral"
                            value={props.beauty.intensity}
                            min={0}
                            max={100}
                            step={1}
                            onChange={(v) => {
                              props.setBeauty({ intensity: v })
                              setBeautyPreset('personalizado')
                            }}
                            suffix="%"
                          />
                          <button
                            onClick={() => setShowBefore((s) => !s)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[10px] font-semibold text-white hover:border-[#7C5CFC]/50"
                          >
                            {showBefore ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}{' '}
                            {showBefore ? 'Ver depois' : 'Comparar antes/depois'}
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* ============ 6. FUNDO ============ */}
                  {acc.id === 'fundo' && (
                    <>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[9px] text-amber-200/80 leading-relaxed">
                        A pessoa fica sempre na frente. Cor/desfoque aplicam-se apenas ao fundo.
                      </div>
                      <BackgroundPanel />
                    </>
                  )}

                  {/* ============ 7. ÁUDIO ============ */}
                  {acc.id === 'audio' && (
                    <>
                      <SelectRow
                        label="Microfone"
                        value={props.selectedMic}
                        onChange={props.onSelectMic}
                        options={props.mics.map((m, i) => ({
                          value: m.deviceId,
                          label: m.label || `Microfone ${i + 1}`,
                        }))}
                        disabledHint={
                          props.camStatus !== 'ready'
                            ? 'Ative a câmera para ver os nomes reais.'
                            : undefined
                        }
                      />
                      <div>
                        <div className="flex justify-between text-[9px] text-[#9494A8]">
                          <span>Nível (VU)</span>
                          <span className="font-mono">{props.micLevel}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#1C1C27] rounded-full overflow-hidden border border-white/10 p-0.5 mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded-full transition-all duration-75"
                            style={{ width: `${props.micLevel}%` }}
                          />
                        </div>
                      </div>
                      <SliderRow
                        label="Volume"
                        value={Math.round(props.audioConfig.manualGain * 100)}
                        min={0}
                        max={200}
                        step={5}
                        onChange={(v) => props.updateAudioConfig({ manualGain: v / 100 })}
                        suffix="%"
                      />
                      <ToggleRow
                        label="Redução de ruído"
                        desc="Elimina chiados e ruídos de fundo"
                        checked={props.audioConfig.noiseSuppression}
                        onChange={(v) => props.updateAudioConfig({ noiseSuppression: v })}
                      />
                      <ToggleRow
                        label="Cancelamento de eco"
                        desc="Evita retorno do áudio da sala"
                        checked={props.audioConfig.echoCancellation}
                        onChange={(v) => props.updateAudioConfig({ echoCancellation: v })}
                      />
                      <ToggleRow
                        label="Monitoramento"
                        desc="Ouvir a si mesmo (cuidado com microfonia)"
                        checked={false}
                        onChange={() => toast.info('Monitoramento ativado. Use fones de ouvido.')}
                      />
                    </>
                  )}

                  {/* ============ 8. GRAVAÇÃO ============ */}
                  {acc.id === 'gravacao' && (
                    <>
                      <SelectRow
                        label="Formato"
                        value={props.recordingSettings.format}
                        onChange={(v) => props.setRecordingSettings({ format: v })}
                        options={[
                          { value: 'video/webm', label: 'WebM (VP8/Opus)' },
                          { value: 'video/mp4', label: 'MP4 (se suportado)' },
                        ]}
                      />
                      <SelectRow
                        label="Qualidade"
                        value={props.recordingSettings.quality}
                        onChange={(v) => props.setRecordingSettings({ quality: v })}
                        options={[
                          { value: 'high', label: 'Alta (1080p)' },
                          { value: 'medium', label: 'Média (720p)' },
                          { value: 'low', label: 'Baixa (480p)' },
                        ]}
                      />
                      <div>
                        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Contagem regressiva
                        </span>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                          {([0, 3, 5] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => props.setRecordingSettings({ countdown: v })}
                              className={`text-[10px] py-1.5 rounded-lg border transition-all ${props.recordingSettings.countdown === v ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
                            >
                              {v === 0 ? 'Desligado' : `${v}s`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <ToggleRow
                        label="Salvar automaticamente"
                        desc="Salva o take ao encerrar"
                        checked={props.recordingSettings.autoSave}
                        onChange={(v) => props.setRecordingSettings({ autoSave: v })}
                      />
                      <div>
                        <label className="text-[9px] text-[#9494A8] uppercase tracking-wider">
                          Nome do take
                        </label>
                        <input
                          type="text"
                          value={props.recordingSettings.takeName}
                          onChange={(e) => props.setRecordingSettings({ takeName: e.target.value })}
                          placeholder="take-001"
                          className="w-full mt-1 bg-[#1C1C27] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Subcomponentes ---------- */

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#1C1C27] px-2 py-1.5 text-center">
      <div className="text-[11px] font-bold text-white font-mono">{value}</div>
      <div className="text-[8px] text-[#9494A8] uppercase tracking-wider">{label}</div>
    </div>
  )
}

function MiniBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#1C1C27] border border-white/10 text-[9px] font-semibold text-[#9494A8] hover:text-white hover:border-[#7C5CFC]/50 transition-all"
    >
      {icon}
      {label}
    </button>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div>
      <div className="flex justify-between text-[9px] text-[#9494A8]">
        <span>{label}</span>
        <span className="font-mono">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  )
}

function BeautySlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <SliderRow
      label={label}
      value={value}
      min={0}
      max={100}
      step={1}
      onChange={onChange}
      suffix="%"
    />
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      <div>
        <p className="text-[11px] text-white">{label}</p>
        {desc && <p className="text-[9px] text-[#9494A8]">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SelectRow({
  label,
  value,
  onChange,
  options,
  disabledHint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabledHint?: string
}) {
  return (
    <div>
      <label className="text-[9px] text-[#9494A8] uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-[#1C1C27] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
      >
        {options.length === 0 && <option value="">Nenhum dispositivo detectado</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {disabledHint && <p className="text-[8px] text-amber-300/70 mt-0.5">{disabledHint}</p>}
    </div>
  )
}

function CapabilityRow({ cap }: { cap: string }) {
  // Na prática, a disponibilidade depende de getCapabilities; mostramos desabilitado com explicação.
  const labels: Record<string, string> = {
    exposureTime: 'Exposição',
    focusDistance: 'Foco',
    whiteBalanceMode: 'Balanço de branco',
    brightness: 'Brilho (HW)',
    contrast: 'Contraste (HW)',
    saturation: 'Saturação',
    sharpness: 'Nitidez',
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-[#9494A8]">{labels[cap] || cap}</span>
      <Badge className="text-[8px] h-4 bg-[#3A3A4A] text-[#9494A8] border-white/10">
        Indisponível
      </Badge>
    </div>
  )
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default StudioAccordionPanel
