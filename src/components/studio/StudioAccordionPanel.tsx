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
  CheckCircle2,
  Crosshair,
  RotateCcw,
  Lock,
} from 'lucide-react'
import {
  type CameraCapabilities as CamCaps,
  type CameraHardwareSettings,
  type ResolutionOption,
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  DIGITAL_ZOOM_MIN,
  DIGITAL_ZOOM_MAX,
  supportedResolutions,
  supportedFrameRates,
  isControlSupported,
  clampZoom,
  clampPan,
  parseCapabilities,
  aspectLabel,
} from '@/lib/camera-controls'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScriptPanel } from '@/components/ScriptPanel'
import { BackgroundPanel } from '@/components/studio/BackgroundPanel'
import { MediaPanel } from '@/components/studio/MediaPanel'
import type { ScriptBlock, FaceStatus } from '@/types/studio'
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

export type StudioAccordionVariant = 'inline' | 'drawer' | 'fullscreen'

export interface StudioAccordionPanelProps {
  /** Modo de exibição: inline (desktop xl+), drawer (overlay lateral md–xl),
   *  fullscreen (mobile <900px). Apenas ajusta layout/padding — sem mudança de
   *  comportamento. */
  variant?: StudioAccordionVariant
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
  /** Capacidades cruas do hardware (saída de getCapabilities normalizada). */
  hardwareCapabilities: CamCaps | null
  /** Resolução/FPS solicitados (id / número) pelo usuário. */
  requestedResolution: ResolutionOption['id'] | 'auto'
  requestedFrameRate: number | 'auto'
  /** Resolução/FPS efetivamente entregues após applyConstraints (getSettings). */
  deliveredWidth?: number
  deliveredHeight?: number
  deliveredFrameRate?: number
  /** Estado da câmera: idle | requesting | ready | denied | error. */
  camStatus: 'idle' | 'requesting' | 'ready' | 'denied' | 'error'
  camError: string
  /** Aciona a (re)inicialização do stream (botão "Tentar novamente"). */
  onRetryCamera: () => void
  /** Troca de resolução/FPS aplicada via applyConstraints. */
  onRequestResolution: (id: ResolutionOption['id'] | 'auto') => void
  onRequestFrameRate: (fps: number | 'auto') => void
  /** Zoom digital (crop no compositor) 1..4 + pan X/Y normalizados. */
  zoom: number
  panX: number
  panY: number
  onZoomChange: (z: number) => void
  onPanChange: (x: number, y: number) => void
  onCenterFace: () => void
  onResetCrop: () => void
  /** Hardware settings manuais (exposição, foco, WB, etc.). */
  hardware: CameraHardwareSettings
  onUpdateHardware: (u: Partial<CameraHardwareSettings>) => void
  /** Espelhamento horizontal (só no preview). */
  mirror: boolean
  onMirrorChange: (v: boolean) => void
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
  /** Restaura padrões de câmera (preset natural + zoom 1x + hardware auto). */
  onRestoreDefaults: () => void
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
  faceStatus: FaceStatus
  mediapipeLoading: boolean
  mediapipeAvailable: boolean
  webglAvailable: boolean
  /** Master toggle de todos os efeitos faciais. */
  beautyEnabled: boolean
  onBeautyEnabledChange: (v: boolean) => void
  /** Botão "Comparar" — mostra o frame sem efeitos enquanto pressionado. */
  compareBefore: boolean
  onCompareBeforeChange: (v: boolean) => void
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
  const variant = props.variant ?? 'inline'
  // Só UM acordeão aberto por vez (null = todos fechados). Mudar de acordeão
  // NÃO apaga configurações — cada seção apenas é montada/desmontada.
  const [open, setOpen] = useState<AccordionId | null>('roteiro')
  const [splitPreset, setSplitPreset] = useState<SplitPresetId>('medium')
  const [customDuration, setCustomDuration] = useState(45)
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitProcessing, setSplitProcessing] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('natural')
  const [beautyPreset, setBeautyPreset] = useState<BeautyPresetId>('off')

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
    if (id !== 'personalizado') {
      const p = CAMERA_PRESETS.find((x) => x.id === id)!
      props.updateCameraConfig({
        brightness: p.brightness,
        contrast: p.contrast,
        beautySmooth: p.beautySmooth,
        saturation: p.saturation,
        temperature: p.temperature,
        sharpness: p.sharpness,
        smoothness: p.smoothness,
        vignette: p.vignette,
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

      {/* Lista de acordeões com scroll próprio. No modo inline reservamos
          padding inferior para o dock fixo; em drawer/fullscreen o painel
          cobre a área do dock, então não precisamos do espaçamento extra. */}
      <div
        className={`flex-1 overflow-y-auto min-h-0 px-2 py-2 ${variant === 'inline' ? 'pb-24' : 'pb-4'}`}
      >
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

                      {/* Edição inline de blocos (reutiliza ScriptPanel — agora com
                          drag handle, menu de contexto, duplicar, juntar adjacentes,
                          status badge, divisão via modal) */}
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
                    <CameraAccordionSection
                      {...props}
                      cameraPreset={cameraPreset}
                      applyCameraPreset={applyCameraPreset}
                      setCameraPreset={setCameraPreset}
                    />
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
                      {/* Toggle master de efeitos faciais + botão Comparar */}
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#1C1C27] px-2.5 py-2">
                        <div>
                          <p className="text-[10px] font-semibold text-white">Retoque facial</p>
                          <p className="text-[9px] text-[#9494A8]">
                            {props.beautyEnabled ? 'Ativado (WebGL)' : 'Desativado'}
                          </p>
                        </div>
                        <button
                          onClick={() => props.onBeautyEnabledChange(!props.beautyEnabled)}
                          role="switch"
                          aria-checked={props.beautyEnabled}
                          className={`relative h-5 w-9 rounded-full transition-colors ${props.beautyEnabled ? 'bg-[#7C5CFC]' : 'bg-white/15'}`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${props.beautyEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                      <button
                        onClick={() => props.onCompareBeforeChange(!props.compareBefore)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[10px] font-semibold text-white hover:border-[#7C5CFC]/50"
                      >
                        {props.compareBefore ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}{' '}
                        {props.compareBefore ? 'Ver depois' : 'Comparar antes/depois'}
                      </button>

                      {/* Indicador de status do pipeline facial */}
                      <FaceStatusBadge
                        status={props.faceStatus}
                        webglAvailable={props.webglAvailable}
                        mediapipeAvailable={props.mediapipeAvailable}
                      />

                      {!props.mediapipeAvailable ? (
                        <div className="rounded-lg border border-white/10 bg-[#1C1C27] p-2.5 space-y-2">
                          <div className="flex items-center gap-2 text-[9px] text-[#9494A8]">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Modelo facial (detecção por região)</span>
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
                              Seu navegador não suporta WebGL — usando fallback de software (filtros
                              globais).
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
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
                            label="Sulco Nasolabial (Bigode Chinês)"
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

/** Badge de status do pipeline facial WebGL — feedback claro para o usuário. */
function FaceStatusBadge({
  status,
  webglAvailable,
  mediapipeAvailable,
}: {
  status: FaceStatus
  webglAvailable: boolean
  mediapipeAvailable: boolean
}) {
  const map: Record<FaceStatus, { text: string; cls: string; icon: React.ReactNode }> = {
    detected: {
      text: 'Rosto detectado — efeitos regionais ativos',
      cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    unstable: {
      text: 'Detecção instável — intensidade reduzida',
      cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    'not-detected': {
      text: 'Rosto não detectado',
      cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    'no-model': {
      text: mediapipeAvailable
        ? 'Modelo carregando…'
        : 'Sem modelo facial — usando fallback de software',
      cls: 'text-[#9494A8] bg-white/5 border-white/10',
      icon: <Sparkles className="w-3 h-3" />,
    },
    'no-webgl': {
      text: 'WebGL indisponível — usando fallback de software',
      cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    disabled: {
      text: 'Retoque facial desligado',
      cls: 'text-[#9494A8] bg-white/5 border-white/10',
      icon: <EyeOff className="w-3 h-3" />,
    },
  }
  void webglAvailable
  const s = map[status] || map['no-model']
  return (
    <div className={`flex items-center gap-2 text-[9px] rounded-lg px-2 py-1.5 border ${s.cls}`}>
      {s.icon}
      <span>{s.text}</span>
    </div>
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

/* ---------------------------------------------------------------------------
   PROMPT 6 — Seção Câmera: diagnósticos, resolução/FPS reais, zoom digital
   (crop no compositor), presets profissionais e controles manuais de hardware.
   ------------------------------------------------------------------------- */
function CameraAccordionSection({
  cameras,
  selectedCamera,
  onSelectCamera,
  hardwareCapabilities,
  requestedResolution,
  requestedFrameRate,
  deliveredWidth,
  deliveredHeight,
  deliveredFrameRate,
  camStatus,
  camError,
  onRetryCamera,
  onRequestResolution,
  onRequestFrameRate,
  zoom,
  panX,
  panY,
  onZoomChange,
  onPanChange,
  onCenterFace,
  onResetCrop,
  hardware,
  onUpdateHardware,
  mirror,
  onMirrorChange,
  cameraConfig,
  updateCameraConfig,
  onRestoreDefaults,
  faceDetected,
  cameraPreset,
  applyCameraPreset,
  setCameraPreset,
}: StudioAccordionPanelProps & {
  cameraPreset: CameraPresetId
  applyCameraPreset: (id: CameraPresetId) => void
  setCameraPreset: (id: CameraPresetId) => void
}) {
  const caps = hardwareCapabilities
  const resOptions = useMemo(() => (caps ? supportedResolutions(caps) : []), [caps])
  const fpsOptions = useMemo(() => (caps ? supportedFrameRates(caps) : []), [caps])
  const reqRes =
    requestedResolution === 'auto'
      ? 'Auto'
      : (resOptions.find((r) => r.id === requestedResolution)?.label ?? requestedResolution)
  const reqFps = requestedFrameRate === 'auto' ? 'Auto' : `${requestedFrameRate} FPS`
  const deliveredRes =
    deliveredWidth && deliveredHeight ? `${deliveredWidth}×${deliveredHeight}` : '—'
  const deliveredFpsS = deliveredFrameRate ? `${Math.round(deliveredFrameRate)} FPS` : '—'
  const aspectS =
    deliveredWidth && deliveredHeight ? aspectLabel(deliveredWidth, deliveredHeight) : '—'

  // Controle manual habilitado quando suportado pelo hardware.
  const supported = (c: Parameters<typeof isControlSupported>[1]) =>
    isControlSupported(caps ?? parseCapabilities(null), c)

  return (
    <>
      {/* ---- Dispositivo ---- */}
      <SelectRow
        label="Dispositivo de vídeo"
        value={selectedCamera}
        onChange={onSelectCamera}
        options={cameras.map((c, i) => ({
          value: c.deviceId,
          label: c.label || `Câmera ${i + 1}`,
        }))}
        disabledHint={camStatus !== 'ready' ? 'Ative a câmera para ver os nomes reais.' : undefined}
      />

      {/* ---- Estado da câmera ---- */}
      <CameraStatusBadge status={camStatus} error={camError} onRetry={onRetryCamera} />

      {/* ---- Diagnóstico: solicitado vs entregue ---- */}
      {camStatus === 'ready' && (
        <div className="rounded-lg border border-white/10 bg-[#1C1C27] p-2 space-y-1 text-[9px] text-[#9494A8] leading-relaxed">
          <div className="flex justify-between">
            <span>Resolução</span>
            <span className="font-mono text-white">
              {reqRes} solicitado → {deliveredRes} entregue
            </span>
          </div>
          <div className="flex justify-between">
            <span>FPS</span>
            <span className="font-mono text-white">
              {reqFps} solicitado → {deliveredFpsS} entregue
            </span>
          </div>
          <div className="flex justify-between">
            <span>Proporção</span>
            <span className="font-mono text-white">{aspectS}</span>
          </div>
          {caps?.width && caps.height && (
            <div className="flex justify-between text-[#9494A8]/80">
              <span>Máx. hardware</span>
              <span className="font-mono">
                {caps.width.max}×{caps.height.max} @ {caps.frameRate?.max?.toFixed(0) ?? '—'} FPS
              </span>
            </div>
          )}
        </div>
      )}

      {/* ---- Resolução real (apenas opções suportadas) ---- */}
      {camStatus === 'ready' && (
        <div>
          <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">Resolução</span>
          <div className="grid grid-cols-3 gap-1 mt-1">
            <button
              onClick={() => onRequestResolution('auto')}
              className={`text-[9px] py-1.5 rounded-lg border transition-all ${requestedResolution === 'auto' ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
            >
              Auto
            </button>
            {RESOLUTION_OPTIONS.map((r) => {
              const ok = resOptions.some((s) => s.id === r.id)
              return (
                <button
                  key={r.id}
                  disabled={!ok}
                  onClick={() => ok && onRequestResolution(r.id)}
                  className={`text-[9px] py-1.5 rounded-lg border transition-all ${requestedResolution === r.id ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : ok ? 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white' : 'border-white/5 bg-[#1C1C27]/50 text-[#9494A8]/30 cursor-not-allowed'}`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
          <p className="text-[8px] text-[#9494A8]/70 mt-0.5 leading-relaxed">
            Apenas resoluções suportadas pelo hardware são selecionáveis.
          </p>
        </div>
      )}

      {/* ---- FPS reais (apenas suportados) ---- */}
      {camStatus === 'ready' && (
        <div>
          <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">FPS</span>
          <div className="grid grid-cols-4 gap-1 mt-1">
            <button
              onClick={() => onRequestFrameRate('auto')}
              className={`text-[9px] py-1.5 rounded-lg border transition-all ${requestedFrameRate === 'auto' ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
            >
              Auto
            </button>
            {FPS_OPTIONS.map((f) => {
              const ok = fpsOptions.includes(f)
              return (
                <button
                  key={f}
                  disabled={!ok}
                  onClick={() => ok && onRequestFrameRate(f)}
                  className={`text-[9px] py-1.5 rounded-lg border transition-all ${requestedFrameRate === f ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : ok ? 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white' : 'border-white/5 bg-[#1C1C27]/50 text-[#9494A8]/30 cursor-not-allowed'}`}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- Zoom digital (crop no compositor) ---- */}
      <div className="pt-1 border-t border-white/5">
        <span className="text-[9px] text-[#7C5CFC] uppercase tracking-wider font-bold">
          Zoom digital
        </span>
        <p className="text-[8px] text-[#9494A8]/70 mt-0.5 leading-relaxed">
          Crop + scale aplicado no compositor (canvas) — aparece no arquivo gravado.
        </p>
      </div>
      <SliderRow
        label="Zoom"
        value={Number(zoom.toFixed(2))}
        min={DIGITAL_ZOOM_MIN}
        max={DIGITAL_ZOOM_MAX}
        step={0.05}
        onChange={(v) => onZoomChange(clampZoom(v))}
        suffix="x"
      />
      <SliderRow
        label="Enquadramento X"
        value={Math.round(panX * 100)}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => onPanChange(clampPan(v / 100), panY)}
        suffix=""
      />
      <SliderRow
        label="Enquadramento Y"
        value={Math.round(panY * 100)}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => onPanChange(panX, clampPan(v / 100))}
        suffix=""
      />
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={onCenterFace}
          disabled={!faceDetected}
          className="flex items-center justify-center gap-1 text-[9px] py-1.5 rounded-lg border border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white hover:border-[#7C5CFC]/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Crosshair className="w-3 h-3" /> Centralizar rosto
        </button>
        <button
          onClick={onResetCrop}
          className="flex items-center justify-center gap-1 text-[9px] py-1.5 rounded-lg border border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white hover:border-[#7C5CFC]/50"
        >
          <RotateCcw className="w-3 h-3" /> Restaurar
        </button>
        <button
          onClick={() => onMirrorChange(!mirror)}
          className={`flex items-center justify-center gap-1 text-[9px] py-1.5 rounded-lg border transition-all ${mirror ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
        >
          Espelhar
        </button>
      </div>
      {!faceDetected && (
        <p className="text-[8px] text-[#9494A8]/70 leading-relaxed">
          "Centralizar rosto" fica disponível quando um rosto é detectado no preview.
        </p>
      )}

      {/* ---- Presets profissionais ---- */}
      <div className="pt-1 border-t border-white/5">
        <span className="text-[9px] text-[#7C5CFC] uppercase tracking-wider font-bold">
          Presets de câmera
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {CAMERA_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyCameraPreset(p.id)}
            className={`text-[9px] py-1.5 rounded-lg border transition-all ${cameraPreset === p.id ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
      </div>
      {(() => {
        const p = CAMERA_PRESETS.find((x) => x.id === cameraPreset)
        if (!p || p.id === 'personalizado') return null
        const mods: string[] = []
        if (p.brightness !== 100) mods.push(`Brilho ${p.brightness}%`)
        if (p.contrast !== 100) mods.push(`Contraste ${p.contrast}%`)
        if (p.saturation !== 100) mods.push(`Saturação ${p.saturation}%`)
        if (p.temperature !== 0) mods.push(`Temp. ${p.temperature > 0 ? '+' : ''}${p.temperature}`)
        if (p.sharpness !== 0) mods.push(`Nitidez ${p.sharpness}`)
        return (
          <p className="text-[8px] text-[#9494A8]/80 leading-relaxed">
            {p.description} {mods.length > 0 && `· ${mods.join(', ')}`}
          </p>
        )
      })()}

      {/* ---- Ajustes de imagem (fallback digital via canvas) ---- */}
      <div className="pt-1 border-t border-white/5">
        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
          Ajustes de imagem (digital)
        </span>
      </div>
      <SliderRow
        label="Brilho"
        value={cameraConfig.brightness}
        min={50}
        max={150}
        step={1}
        onChange={(v) => {
          updateCameraConfig({ brightness: v })
          setCameraPreset('personalizado')
        }}
        suffix="%"
      />
      <SliderRow
        label="Contraste"
        value={cameraConfig.contrast}
        min={50}
        max={150}
        step={1}
        onChange={(v) => {
          updateCameraConfig({ contrast: v })
          setCameraPreset('personalizado')
        }}
        suffix="%"
      />
      <SliderRow
        label="Saturação"
        value={cameraConfig.saturation}
        min={0}
        max={200}
        step={1}
        onChange={(v) => {
          updateCameraConfig({ saturation: v })
          setCameraPreset('personalizado')
        }}
        suffix="%"
      />
      <SliderRow
        label="Temperatura"
        value={cameraConfig.temperature}
        min={-50}
        max={50}
        step={1}
        onChange={(v) => {
          updateCameraConfig({ temperature: v })
          setCameraPreset('personalizado')
        }}
        suffix=""
      />
      <SliderRow
        label="Nitidez"
        value={cameraConfig.sharpness}
        min={0}
        max={100}
        step={1}
        onChange={(v) => {
          updateCameraConfig({ sharpness: v })
          setCameraPreset('personalizado')
        }}
        suffix="%"
      />

      {/* ---- Controles manuais de hardware (applyConstraints) ---- */}
      <div className="pt-1 border-t border-white/5">
        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">
          Controles de hardware
        </span>
        <p className="text-[8px] text-[#9494A8]/70 mt-0.5 leading-relaxed">
          Aplicados via <code className="text-[#7C5CFC]">applyConstraints</code> quando suportados.
          Controles não suportados aparecem desabilitados.
        </p>
      </div>
      <HardwareToggleRow
        label="Exposição (auto)"
        options={caps?.exposureMode ?? null}
        value={hardware.exposureMode}
        onChange={(v) => onUpdateHardware({ exposureMode: v })}
        supported={supported('exposureMode')}
      />
      <HardwareSliderRow
        label="Compensação de exposição"
        range={caps?.exposureCompensation ?? null}
        value={hardware.exposureCompensation}
        onChange={(v) => onUpdateHardware({ exposureCompensation: v })}
        supported={supported('exposureCompensation')}
      />
      <HardwareToggleRow
        label="Foco (modo)"
        options={caps?.focusMode ?? null}
        value={hardware.focusMode}
        onChange={(v) => onUpdateHardware({ focusMode: v })}
        supported={supported('focusMode')}
      />
      <HardwareSliderRow
        label="Distância de foco"
        range={caps?.focusDistance ?? null}
        value={hardware.focusDistance}
        onChange={(v) => onUpdateHardware({ focusDistance: v })}
        supported={supported('focusDistance')}
      />
      <HardwareToggleRow
        label="Balanço de branco"
        options={caps?.whiteBalanceMode ?? null}
        value={hardware.whiteBalanceMode}
        onChange={(v) => onUpdateHardware({ whiteBalanceMode: v })}
        supported={supported('whiteBalanceMode')}
      />
      <HardwareSliderRow
        label="Temperatura de cor (K)"
        range={caps?.colorTemperature ?? null}
        value={hardware.colorTemperature}
        onChange={(v) => onUpdateHardware({ colorTemperature: v })}
        supported={supported('colorTemperature')}
      />
      <HardwareSliderRow
        label="Brilho (HW)"
        range={caps?.brightness ?? null}
        value={hardware.brightness}
        onChange={(v) => onUpdateHardware({ brightness: v })}
        supported={supported('brightness')}
      />
      <HardwareSliderRow
        label="Contraste (HW)"
        range={caps?.contrast ?? null}
        value={hardware.contrast}
        onChange={(v) => onUpdateHardware({ contrast: v })}
        supported={supported('contrast')}
      />
      <HardwareSliderRow
        label="Saturação (HW)"
        range={caps?.saturation ?? null}
        value={hardware.saturation}
        onChange={(v) => onUpdateHardware({ saturation: v })}
        supported={supported('saturation')}
      />
      <HardwareSliderRow
        label="Nitidez (HW)"
        range={caps?.sharpness ?? null}
        value={hardware.sharpness}
        onChange={(v) => onUpdateHardware({ sharpness: v })}
        supported={supported('sharpness')}
      />

      {/* ---- Restaurar padrões ---- */}
      <button
        onClick={onRestoreDefaults}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1C1C27] border border-white/10 text-[10px] font-semibold text-white hover:border-[#7C5CFC]/50"
      >
        <RotateCcw className="w-3 h-3" /> Restaurar padrões
      </button>
    </>
  )
}

/** Badge de estado da câmera com botão "Tentar novamente" em caso de erro. */
function CameraStatusBadge({
  status,
  error,
  onRetry,
}: {
  status: 'idle' | 'requesting' | 'ready' | 'denied' | 'error'
  error: string
  onRetry: () => void
}) {
  if (status === 'ready') {
    return (
      <div className="flex items-center gap-2 text-[9px] rounded-lg px-2 py-1.5 border text-emerald-300 bg-emerald-500/10 border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Câmera pronta
      </div>
    )
  }
  if (status === 'requesting') {
    return (
      <div className="flex items-center gap-2 text-[9px] rounded-lg px-2 py-1.5 border text-[#22D3EE] bg-[#22D3EE]/10 border-[#22D3EE]/30">
        <Loader2 className="w-3 h-3 animate-spin" /> Solicitando acesso à câmera...
      </div>
    )
  }
  if (status === 'idle') {
    return (
      <div className="flex items-center gap-2 text-[9px] rounded-lg px-2 py-1.5 border text-[#9494A8] bg-white/5 border-white/10">
        <Camera className="w-3 h-3" /> Câmera desligada
      </div>
    )
  }
  // denied | error
  return (
    <div className="rounded-lg px-2 py-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[9px] space-y-1.5">
      <div className="flex items-start gap-2">
        {status === 'denied' ? (
          <Lock className="w-3 h-3 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        )}
        <span className="leading-relaxed">
          {error || (status === 'denied' ? 'Permissão negada.' : 'Erro de câmera.')}
        </span>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-[9px] font-bold text-white bg-[#1C1C27] border border-white/10 rounded-md px-2 py-1 hover:border-[#7C5CFC]/50"
      >
        <RotateCcw className="w-3 h-3" /> Tentar novamente
      </button>
    </div>
  )
}

/** Slider de controle de hardware — desabilitado quando não suportado. */
function HardwareSliderRow({
  label,
  range,
  value,
  onChange,
  supported,
}: {
  label: string
  range: { min: number; max: number; step: number } | null
  value: number | undefined
  onChange: (v: number) => void
  supported: boolean
}) {
  if (!supported || !range) {
    return (
      <div className="flex items-center justify-between opacity-50">
        <span className="text-[9px] text-[#9494A8]">
          {label} <span className="text-[8px]">(não suportado)</span>
        </span>
        <Badge className="text-[8px] h-4 bg-[#3A3A4A] text-[#9494A8] border-white/10">—</Badge>
      </div>
    )
  }
  const v = typeof value === 'number' ? value : range.min
  return (
    <SliderRow
      label={label}
      value={v}
      min={range.min}
      max={range.max}
      step={range.step || 0.01}
      onChange={onChange}
      suffix=""
    />
  )
}

/** Seletor de modo (ex.: exposureMode 'continuous'/'manual') baseado em capabilities. */
function HardwareToggleRow({
  label,
  options,
  value,
  onChange,
  supported,
}: {
  label: string
  options: string[] | null
  value: string | undefined
  onChange: (v: string) => void
  supported: boolean
}) {
  if (!supported || !options || options.length === 0) {
    return (
      <div className="flex items-center justify-between opacity-50">
        <span className="text-[9px] text-[#9494A8]">
          {label} <span className="text-[8px]">(não suportado)</span>
        </span>
        <Badge className="text-[8px] h-4 bg-[#3A3A4A] text-[#9494A8] border-white/10">—</Badge>
      </div>
    )
  }
  return (
    <div>
      <label className="text-[9px] text-[#9494A8] uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`text-[9px] py-1 rounded-lg border transition-all ${value === o ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 text-white' : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default StudioAccordionPanel
