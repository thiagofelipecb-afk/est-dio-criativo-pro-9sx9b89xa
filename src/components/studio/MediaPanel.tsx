import React, { useMemo, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Trash2,
  Film,
  Image as ImageIcon,
  Copy,
  ChevronUp,
  ChevronDown,
  X,
  Layers,
  Check,
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Headphones,
  AlertTriangle,
  RefreshCw as SyncIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStudio } from '@/context/StudioContext'
import { useMediaAssets } from '@/hooks/useMediaAssets'
import type { BlockMediaAssignment, ReactionAudioMix, ReactionPosition } from '@/types/studio'

/* ===========================================================================
   PROMPT 3 — MediaPanel com sub-tabs (Artes / Reação / Quadro / B-roll)
   A sub-tab "Artes" implementa atribuição de mídia por bloco sincronizada
   com o teleprompter (lumen_block_assignments).
   =========================================================================== */

type SubTab = 'artes' | 'reacao' | 'quadro' | 'broll'

interface MediaPanelProps {
  projectId: string
}

export function MediaPanel({ projectId }: MediaPanelProps) {
  const [subTab, setSubTab] = useState<SubTab>('artes')

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="grid grid-cols-4 gap-1 bg-[#1C1C27] p-1 rounded-xl">
        {(
          [
            { id: 'artes', label: 'Artes' },
            { id: 'reacao', label: 'Reação' },
            { id: 'quadro', label: 'Quadro' },
            { id: 'broll', label: 'B-roll' },
          ] as { id: SubTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
              subTab === t.id
                ? 'bg-[#7C5CFC] text-white'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'artes' && <ArtesSubTab projectId={projectId} />}
      {subTab === 'reacao' && <ReacaoSubTab />}

      {(subTab === 'quadro' || subTab === 'broll') && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 border border-dashed border-white/10 rounded-xl">
          <Layers className="w-8 h-8 text-[#9494A8]/50" />
          <p className="text-xs font-semibold text-[#9494A8]">Em breve</p>
          <p className="text-[10px] text-[#9494A8]/60 max-w-[200px] leading-relaxed">
            Esta sub-aba estará disponível em uma próxima atualização do LUMEN Studio.
          </p>
        </div>
      )}
    </div>
  )
}

/* ===========================================================================
   Sub-tab Artes
   =========================================================================== */

function ArtesSubTab({ projectId }: { projectId: string }) {
  const {
    scriptBlocks,
    mediaAssets,
    blockAssignments,
    addBlockAssignment,
    updateBlockAssignment,
    deleteBlockAssignment,
    getAssignmentsForBlock,
    syncArtsEnabled,
    setSyncArtsEnabled,
    artBlockIndex,
    setArtBlockIndex,
  } = useStudio()

  const [assetFilter, setAssetFilter] = useState<'all' | 'image' | 'video'>('all')
  const [carouselIdx, setCarouselIdx] = useState(0)
  const [multiSelectOpen, setMultiSelectOpen] = useState(false)
  const [multiSelectBlocks, setMultiSelectBlocks] = useState<Set<string>>(new Set())
  const [pendingDupAssetId, setPendingDupAssetId] = useState<string | null>(null)

  const safeArtIndex = Math.min(artBlockIndex, Math.max(0, scriptBlocks.length - 1))
  const selectedBlock = scriptBlocks[safeArtIndex]
  const assignments = selectedBlock ? getAssignmentsForBlock(selectedBlock.id) : []

  // Reset carousel quando muda o bloco selecionado ou as atribuições.
  React.useEffect(() => {
    setCarouselIdx(0)
  }, [safeArtIndex, assignments.length])

  const filteredAssets = useMemo(() => {
    return mediaAssets.filter((a) => {
      if (assetFilter === 'image') return a.type === 'image'
      if (assetFilter === 'video') return a.type === 'video'
      return a.type === 'image' || a.type === 'video'
    })
  }, [mediaAssets, assetFilter])

  // Quando não há blocos, não há o que atribuir.
  if (scriptBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed border-white/10 rounded-xl">
        <Layers className="w-7 h-7 text-[#9494A8]/50" />
        <p className="text-xs text-[#9494A8]">Nenhum bloco de roteiro encontrado.</p>
        <p className="text-[10px] text-[#9494A8]/70 max-w-[220px]">
          Crie blocos na aba "Roteiro" para atribuir artes a cada parte da fala.
        </p>
      </div>
    )
  }

  const safeCarouselIdx = Math.min(carouselIdx, Math.max(0, assignments.length - 1))
  const currentAssignment = assignments[safeCarouselIdx]

  const assignedAssetIds = new Set(assignments.map((a) => a.assetId))

  const handleAssignAsset = (assetId: string) => {
    if (!selectedBlock) return
    const existing = blockAssignments.find(
      (a) => a.blockId === selectedBlock.id && a.assetId === assetId,
    )
    if (existing) {
      toast.info('Esta mídia já está atribuída a este bloco.')
      return
    }
    addBlockAssignment({
      projectId,
      blockId: selectedBlock.id,
      assetId,
      kind: 'art',
      order: assignments.length,
      enabled: true,
      fit: 'contain',
      positionX: 0.5,
      positionY: 0.5,
      scale: 1,
      backgroundColor: '#000000',
    })
    toast.success('Arte atribuída ao bloco.')
  }

  const handleApplyToMany = (assetId: string) => {
    if (multiSelectBlocks.size === 0) {
      toast.warning('Selecione ao menos um bloco.')
      return
    }
    let count = 0
    multiSelectBlocks.forEach((blockId) => {
      const existing = blockAssignments.find((a) => a.blockId === blockId && a.assetId === assetId)
      if (existing) return
      const order = blockAssignments.filter((a) => a.blockId === blockId).length
      addBlockAssignment({
        projectId,
        blockId,
        assetId,
        kind: 'art',
        order,
        enabled: true,
        fit: 'contain',
        positionX: 0.5,
        positionY: 0.5,
        scale: 1,
        backgroundColor: '#000000',
      })
      count += 1
    })
    toast.success(`Arte aplicada a ${count} bloco(s).`)
    setMultiSelectBlocks(new Set())
    setMultiSelectOpen(false)
    setPendingDupAssetId(null)
  }

  const handleRemoveAssignment = (id: string) => {
    deleteBlockAssignment(id)
  }

  const handleReorder = (id: string, dir: -1 | 1) => {
    const idx = assignments.findIndex((a) => a.id === id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= assignments.length) return
    const a = assignments[idx]
    const b = assignments[target]
    updateBlockAssignment(a.id, { order: b.order })
    updateBlockAssignment(b.id, { order: a.order })
  }

  const handleDuplicateTo = (assignment: BlockMediaAssignment, targetBlockId: string) => {
    const existing = blockAssignments.find(
      (a) => a.blockId === targetBlockId && a.assetId === assignment.assetId,
    )
    if (existing) {
      toast.info('Já existe essa arte no bloco de destino.')
      return
    }
    const order = blockAssignments.filter((a) => a.blockId === targetBlockId).length
    addBlockAssignment({
      ...assignment,
      blockId: targetBlockId,
      order,
    })
    toast.success('Arte duplicada para o bloco.')
  }

  const assetById = (id: string) => mediaAssets.find((a) => a.id === id)

  const fitOptions: { id: BlockMediaAssignment['fit']; label: string }[] = [
    { id: 'contain', label: 'Conter' },
    { id: 'cover', label: 'Cobrir' },
    { id: 'fill', label: 'Preencher' },
  ]

  return (
    <div className="space-y-3">
      {/* Header com toggle de sincronização */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1C1C27]/60 px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white">Sincronizar com artes</span>
          <span className="text-[9px] text-[#9494A8] leading-tight">
            {syncArtsEnabled ? 'Palco segue o teleprompter' : 'Navegação manual no painel'}
          </span>
        </div>
        <button
          onClick={() => setSyncArtsEnabled(!syncArtsEnabled)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            syncArtsEnabled ? 'bg-[#7C5CFC]' : 'bg-[#3A3A4A]'
          }`}
          title="Alternar sincronização com o teleprompter"
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              syncArtsEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2">
        {/* Coluna esquerda — lista de blocos (~30%) */}
        <div className="col-span-4 space-y-1 max-h-[360px] overflow-y-auto pr-1">
          <span className="text-[9px] font-bold text-[#9494A8] uppercase tracking-wider px-1">
            Blocos
          </span>
          {scriptBlocks.map((block, idx) => {
            const hasArt = blockAssignments.some((a) => a.blockId === block.id && a.enabled)
            const isSelected = idx === safeArtIndex
            return (
              <button
                key={block.id}
                onClick={() => {
                  if (syncArtsEnabled) {
                    toast.info('Desative "Sincronizar com artes" para navegar manualmente.')
                    return
                  }
                  setArtBlockIndex(idx)
                }}
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-[#7C5CFC] bg-[#7C5CFC]/10'
                    : 'border-white/5 bg-[#14141C] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold text-white/80 shrink-0">{idx + 1}</span>
                  <Badge
                    className={`text-[8px] px-1 py-0 h-4 ${
                      hasArt
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {hasArt ? 'Pronto' : 'Pendente'}
                  </Badge>
                </div>
                <p className="text-[10px] text-white/70 line-clamp-2 leading-tight mt-1">
                  {block.text}
                </p>
              </button>
            )
          })}
        </div>

        {/* Coluna central — preview (~45%) */}
        <div className="col-span-5 space-y-2">
          <div className="relative aspect-video bg-[#0B0B10] rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center gap-1.5 p-3">
                <ImageIcon className="w-6 h-6 text-[#9494A8]/50" />
                <span className="text-[10px] text-[#9494A8]">
                  Nenhuma arte atribuída a este bloco
                </span>
              </div>
            ) : (
              <ArtPreview
                assignment={currentAssignment}
                asset={assetById(currentAssignment.assetId)}
              />
            )}

            {/* Carousel dots */}
            {assignments.length > 1 && (
              <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
                {assignments.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setCarouselIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === safeCarouselIdx ? 'bg-white w-3' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Carousel nav */}
          {assignments.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCarouselIdx((i) => Math.max(0, i - 1))}
                disabled={safeCarouselIdx === 0}
                className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronUp className="w-3.5 h-3.5 rotate-[-90deg]" />
              </button>
              <span className="text-[9px] text-[#9494A8] font-mono">
                {safeCarouselIdx + 1}/{assignments.length}
              </span>
              <button
                onClick={() => setCarouselIdx((i) => Math.min(assignments.length - 1, i + 1))}
                disabled={safeCarouselIdx >= assignments.length - 1}
                className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
              </button>
            </div>
          )}

          {/* Controles da arte selecionada */}
          {currentAssignment && (
            <div className="rounded-lg border border-white/10 bg-[#1C1C27]/60 p-2 space-y-2">
              <div className="flex items-center gap-1">
                {fitOptions.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateBlockAssignment(currentAssignment.id, { fit: f.id })}
                    className={`flex-1 py-1 text-[9px] font-semibold rounded transition-all ${
                      currentAssignment.fit === f.id
                        ? 'bg-[#7C5CFC] text-white'
                        : 'bg-[#14141C] text-[#9494A8] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <SliderRow
                label="Posição X"
                value={currentAssignment.positionX}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => updateBlockAssignment(currentAssignment.id, { positionX: v })}
                format={(v) => v.toFixed(2)}
              />
              <SliderRow
                label="Posição Y"
                value={currentAssignment.positionY}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => updateBlockAssignment(currentAssignment.id, { positionY: v })}
                format={(v) => v.toFixed(2)}
              />
              <SliderRow
                label="Escala"
                value={currentAssignment.scale}
                min={0.5}
                max={2}
                step={0.05}
                onChange={(v) => updateBlockAssignment(currentAssignment.id, { scale: v })}
                format={(v) => v.toFixed(2) + 'x'}
              />

              <div className="flex items-center justify-between gap-2">
                <label className="text-[9px] text-[#9494A8]">Cor de fundo</label>
                <input
                  type="color"
                  value={currentAssignment.backgroundColor}
                  onChange={(e) =>
                    updateBlockAssignment(currentAssignment.id, {
                      backgroundColor: e.target.value,
                    })
                  }
                  className="w-6 h-5 rounded border border-white/10 bg-transparent cursor-pointer"
                />
              </div>

              {/* Ações por atribuição */}
              <div className="flex items-center gap-1 pt-1 border-t border-white/5">
                <button
                  onClick={() => handleReorder(currentAssignment.id, -1)}
                  disabled={safeCarouselIdx === 0}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-30"
                  title="Mover para esquerda"
                >
                  <ChevronUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                </button>
                <button
                  onClick={() => handleReorder(currentAssignment.id, 1)}
                  disabled={safeCarouselIdx >= assignments.length - 1}
                  className="p-1 rounded text-[#9494A8] hover:text-white hover:bg-white/5 disabled:opacity-30"
                  title="Mover para direita"
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                </button>
                <select
                  className="flex-1 bg-[#14141C] border border-white/10 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDuplicateTo(currentAssignment, e.target.value)
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="" disabled>
                    Duplicar para...
                  </option>
                  {scriptBlocks
                    .filter((b) => b.id !== selectedBlock?.id)
                    .map((b, i) => (
                      <option key={b.id} value={b.id}>
                        Bloco {i + 1}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => handleRemoveAssignment(currentAssignment.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-500/10"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita — biblioteca de mídias (~25%) */}
        <div className="col-span-3 space-y-2">
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'image', label: 'Img' },
                { id: 'video', label: 'Vid' },
              ] as { id: typeof assetFilter; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setAssetFilter(f.id)}
                className={`flex-1 py-1 text-[9px] font-semibold rounded transition-all ${
                  assetFilter === f.id
                    ? 'bg-[#7C5CFC] text-white'
                    : 'bg-[#14141C] text-[#9494A8] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5">
            {filteredAssets.length === 0 && (
              <p className="col-span-2 text-[10px] text-[#9494A8] text-center py-4">
                Nenhuma mídia na biblioteca.
              </p>
            )}
            {filteredAssets.map((asset) => {
              const isAssigned = assignedAssetIds.has(asset.id)
              return (
                <button
                  key={asset.id}
                  onClick={() => handleAssignAsset(asset.id)}
                  onDoubleClick={() => {
                    setPendingDupAssetId(asset.id)
                    setMultiSelectOpen(true)
                  }}
                  className="relative rounded-md overflow-hidden border border-white/5 hover:border-[#7C5CFC]/50 transition-all group"
                  title={
                    isAssigned ? 'Atribuída — clique para adicionar outra' : 'Atribuir ao bloco'
                  }
                >
                  <div className="aspect-square bg-[#0B0B10]">
                    <img
                      src={asset.thumbnailUrl || asset.publicUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {isAssigned && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white px-1 py-0.5 truncate text-left flex items-center gap-0.5">
                    {asset.type === 'video' ? (
                      <Film className="w-2 h-2 text-pink-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-2 h-2 text-cyan-400 shrink-0" />
                    )}
                    {asset.name}
                  </span>
                </button>
              )
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setMultiSelectOpen((v) => !v)}
            className="w-full h-7 text-[9px] border-white/10 text-[#9494A8] hover:text-white gap-1"
          >
            <Copy className="w-3 h-3" /> Aplicar a vários blocos
          </Button>

          {multiSelectOpen && (
            <div className="rounded-lg border border-white/10 bg-[#14141C] p-2 space-y-1.5">
              <span className="text-[9px] text-[#9494A8]">Selecione os blocos:</span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {scriptBlocks.map((b, i) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-1.5 text-[10px] text-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={multiSelectBlocks.has(b.id)}
                      onChange={(e) => {
                        const next = new Set(multiSelectBlocks)
                        if (e.target.checked) next.add(b.id)
                        else next.delete(b.id)
                        setMultiSelectBlocks(next)
                      }}
                      className="w-3 h-3 accent-[#7C5CFC]"
                    />
                    <span className="truncate">
                      Bloco {i + 1}: {b.text.slice(0, 20)}
                    </span>
                  </label>
                ))}
              </div>
              <select
                className="w-full bg-[#0B0B10] border border-white/10 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none"
                value={pendingDupAssetId || ''}
                onChange={(e) => setPendingDupAssetId(e.target.value || null)}
              >
                <option value="">Selecione a mídia...</option>
                {filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => pendingDupAssetId && handleApplyToMany(pendingDupAssetId)}
                disabled={!pendingDupAssetId || multiSelectBlocks.size === 0}
                className="w-full h-6 text-[9px] bg-[#7C5CFC] hover:bg-[#6A48E0] gap-1"
              >
                <Check className="w-3 h-3" /> Aplicar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- ArtPreview — renderiza uma arte conforme fit/position/scale ---------- */

function ArtPreview({
  assignment,
  asset,
}: {
  assignment: BlockMediaAssignment
  asset: { publicUrl?: string; thumbnailUrl?: string; type: string } | undefined
}) {
  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-1">
        <X className="w-5 h-5 text-red-400/60" />
        <span className="text-[9px] text-[#9494A8]">Mídia não encontrada</span>
      </div>
    )
  }
  const url = asset.publicUrl || asset.thumbnailUrl || ''
  const objectFit =
    assignment.fit === 'cover' ? 'cover' : assignment.fit === 'fill' ? 'fill' : 'contain'
  const tx = (assignment.positionX - 0.5) * 100
  const ty = (assignment.positionY - 0.5) * 100
  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: assignment.backgroundColor }}
    >
      {asset.type === 'video' ? (
        <video
          src={url}
          className="w-full h-full"
          style={{
            objectFit: objectFit as any,
            transform: `translate(${tx}%, ${ty}%) scale(${assignment.scale})`,
          }}
          muted
          loop
          autoPlay
          playsInline
        />
      ) : (
        <img
          src={url}
          alt="arte"
          className="w-full h-full"
          style={{
            objectFit: objectFit as any,
            transform: `translate(${tx}%, ${ty}%) scale(${assignment.scale})`,
          }}
        />
      )}
    </div>
  )
}

/* ---------- SliderRow helper ---------- */

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px] text-[#9494A8]">
        <span>{label}</span>
        <span className="font-mono">{format(value)}</span>
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

/* ===========================================================================
   Sub-tab Reação — vídeo de reação sobreposto ao palco
   =========================================================================== */

const POSITION_OPTIONS: { id: ReactionPosition; label: string }[] = [
  { id: 'top-left', label: '↖' },
  { id: 'top-right', label: '↗' },
  { id: 'bottom-left', label: '↙' },
  { id: 'bottom-right', label: '↘' },
  { id: 'split', label: '⬓' },
]

const AUDIO_MIX_OPTIONS: { id: ReactionAudioMix; label: string; desc: string }[] = [
  { id: 'voice-only', label: 'Apenas voz', desc: 'Só o microfone' },
  { id: 'reaction-only', label: 'Apenas reação', desc: 'Só o áudio do vídeo' },
  { id: 'mix', label: 'Mixar voz + reação', desc: 'Ambos juntos' },
]

function formatDuration(ms: number | undefined): string {
  if (!ms || !isFinite(ms)) return '--:--'
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function ReacaoSubTab() {
  const { reactionConfig, updateReactionConfig, mediaAssets, addMediaAsset } = useStudio()
  const { addFromFile } = useMediaAssets()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)

  const asset = reactionConfig.assetId
    ? mediaAssets.find((a) => a.id === reactionConfig.assetId)
    : null

  const videoAssets = useMemo(() => mediaAssets.filter((a) => a.type === 'video'), [mediaAssets])

  // Sync do preview player.
  React.useEffect(() => {
    const v = previewVideoRef.current
    if (!v) return
    v.muted = reactionConfig.muted
    v.volume = Math.max(0, Math.min(1, reactionConfig.volume / 100))
    v.loop = reactionConfig.loop
  }, [reactionConfig.muted, reactionConfig.volume, reactionConfig.loop, reactionConfig.assetId])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    if (!file.type.match(/^video\/(mp4|webm)$/)) {
      toast.error('Formato não suportado. Use MP4 ou WebM.')
      return
    }
    setUploading(true)
    try {
      const saved = await addFromFile(file, { source: 'upload' })
      // addFromFile já persiste via mediaService e dispara o evento; mas o
      // StudioContext também precisa saber — addMediaAsset força o refresh.
      addMediaAsset(saved)
      updateReactionConfig({ assetId: saved.id, enabled: true })
      toast.success(`Vídeo "${saved.name}" adicionado à biblioteca.`)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao adicionar vídeo.')
    } finally {
      setUploading(false)
    }
  }

  const handleSelectFromLibrary = (assetId: string) => {
    updateReactionConfig({ assetId, enabled: true })
    setShowLibrary(false)
    toast.success('Vídeo de reação selecionado.')
  }

  const handleRemove = () => {
    updateReactionConfig({ assetId: null, enabled: false })
    toast.info('Vídeo de reação removido.')
  }

  const togglePlay = () => {
    const v = previewVideoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setIsPlaying(true)
    } else {
      v.pause()
      setIsPlaying(false)
    }
  }

  const restart = () => {
    const v = previewVideoRef.current
    if (!v) return
    v.currentTime = reactionConfig.startOffsetMs / 1000 || 0
    v.play().catch(() => {})
    setIsPlaying(true)
  }

  const onVideoEnded = () => setIsPlaying(false)

  // --- Estado: nenhum vídeo selecionado ---
  if (!reactionConfig.assetId) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2 border border-dashed border-white/10 rounded-xl">
          <Film className="w-8 h-8 text-[#9494A8]/50" />
          <p className="text-xs font-semibold text-[#9494A8]">Nenhum vídeo de reação selecionado</p>
          <p className="text-[10px] text-[#9494A8]/60 max-w-[220px] leading-relaxed">
            Escolha um vídeo MP4/WebM da biblioteca ou envie um novo arquivo.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileUpload(f)
            e.target.value = ''
          }}
        />

        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-9 bg-[#7C5CFC] hover:bg-[#6A48E0] text-[11px] gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Enviando...' : 'Enviar vídeo'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLibrary((v) => !v)}
            className="w-full h-9 border-white/10 text-[#9494A8] hover:text-white text-[11px] gap-1.5"
          >
            <Film className="w-3.5 h-3.5" /> Selecionar da biblioteca
          </Button>
        </div>

        {showLibrary && (
          <div className="rounded-lg border border-white/10 bg-[#14141C] p-2 space-y-1.5">
            <span className="text-[9px] text-[#9494A8]">Vídeos da biblioteca:</span>
            {videoAssets.length === 0 ? (
              <p className="text-[10px] text-[#9494A8]/70 text-center py-3">
                Nenhum vídeo na biblioteca ainda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {videoAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelectFromLibrary(a.id)}
                    className="relative rounded-md overflow-hidden border border-white/5 hover:border-[#7C5CFC]/50 transition-all"
                    title={a.name}
                  >
                    <div className="aspect-video bg-[#0B0B10]">
                      <img
                        src={a.thumbnailUrl || ''}
                        alt={a.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white px-1 py-0.5 truncate text-left flex items-center gap-0.5">
                      <Film className="w-2 h-2 text-pink-400 shrink-0" />
                      {a.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // --- Estado: arquivo ausente (assetId set mas asset não encontrado) ---
  if (!asset) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2 border border-dashed border-red-500/30 rounded-xl bg-red-500/5">
          <AlertTriangle className="w-8 h-8 text-red-400/70" />
          <p className="text-xs font-semibold text-red-300">Arquivo ausente</p>
          <p className="text-[10px] text-[#9494A8]/70 max-w-[220px] leading-relaxed">
            O vídeo de reação selecionado não foi encontrado na biblioteca. Pode ter sido removido.
          </p>
        </div>
        <Button
          onClick={handleRemove}
          variant="outline"
          className="w-full h-8 border-red-500/30 text-red-300 hover:bg-red-500/10 text-[10px] gap-1.5"
        >
          <Trash2 className="w-3 h-3" /> Remover referência
        </Button>
      </div>
    )
  }

  // --- Estado: formato não suportado ---
  const supportedFormat = asset.mimeType === 'video/mp4' || asset.mimeType === 'video/webm'
  if (!supportedFormat) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2 border border-dashed border-amber-500/30 rounded-xl bg-amber-500/5">
          <AlertTriangle className="w-8 h-8 text-amber-400/70" />
          <p className="text-xs font-semibold text-amber-300">Formato não suportado</p>
          <p className="text-[10px] text-[#9494A8]/70 max-w-[220px] leading-relaxed">
            O formato "{asset.mimeType}" não é suportado para reação. Use MP4 ou WebM.
          </p>
        </div>
        <Button
          onClick={handleRemove}
          variant="outline"
          className="w-full h-8 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-[10px] gap-1.5"
        >
          <Trash2 className="w-3 h-3" /> Remover
        </Button>
      </div>
    )
  }

  const url = asset.publicUrl || ''

  // --- Estado: vídeo selecionado, controles completos ---
  return (
    <div className="space-y-3">
      {/* Preview com player */}
      <div className="relative aspect-video bg-[#0B0B10] rounded-lg border border-white/10 overflow-hidden group">
        <video
          ref={previewVideoRef}
          src={url}
          className="w-full h-full object-contain"
          playsInline
          onEnded={onVideoEnded}
        />
        {/* Controles do player */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex items-center gap-2 opacity-90">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-full bg-[#7C5CFC] hover:bg-[#6A48E0] text-white"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={restart}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Voltar ao início"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1" />
          <span className="text-[9px] font-mono text-white/80">
            {formatDuration(asset.durationMs)}
          </span>
        </div>
      </div>

      {/* Metadados */}
      <div className="flex items-center gap-2 flex-wrap text-[9px] text-[#9494A8]">
        <Badge className="text-[8px] bg-pink-500/20 text-pink-300 border-pink-500/30">
          <Film className="w-2.5 h-2.5 mr-0.5" /> {asset.mimeType}
        </Badge>
        {asset.width && asset.height && (
          <Badge className="text-[8px] bg-white/5 text-white/70 border-white/10">
            {asset.width}×{asset.height}
          </Badge>
        )}
        <Badge className="text-[8px] bg-white/5 text-white/70 border-white/10">
          {formatBytes(asset.sizeBytes)}
        </Badge>
      </div>

      {/* Sync toggle (enabled) */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1C1C27]/60 px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white">Sincronizar no palco</span>
          <span className="text-[9px] text-[#9494A8] leading-tight">
            {reactionConfig.enabled ? 'Reação visível na gravação' : 'Reação oculta'}
          </span>
        </div>
        <button
          onClick={() => updateReactionConfig({ enabled: !reactionConfig.enabled })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
            reactionConfig.enabled ? 'bg-[#7C5CFC] text-white' : 'bg-[#3A3A4A] text-[#9494A8]'
          }`}
        >
          <SyncIcon className="w-3 h-3" />
          {reactionConfig.enabled ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      {/* Volume + Mute + Loop */}
      <div className="rounded-lg border border-white/10 bg-[#1C1C27]/60 p-2 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateReactionConfig({ muted: !reactionConfig.muted })}
            className={`p-1.5 rounded-lg ${
              reactionConfig.muted ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'
            }`}
            title={reactionConfig.muted ? 'Ativar som' : 'Silenciar'}
          >
            {reactionConfig.muted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => updateReactionConfig({ loop: !reactionConfig.loop })}
            className={`p-1.5 rounded-lg ${
              reactionConfig.loop ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]' : 'bg-white/10 text-[#9494A8]'
            }`}
            title="Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1">
            <SliderRow
              label="Volume"
              value={reactionConfig.volume}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateReactionConfig({ volume: v })}
              format={(v) => `${v}%`}
            />
          </div>
        </div>
      </div>

      {/* Posição */}
      <div className="space-y-1">
        <label className="text-[9px] text-[#9494A8] uppercase tracking-wider">Posição</label>
        <div className="grid grid-cols-5 gap-1">
          {POSITION_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => updateReactionConfig({ position: p.id })}
              className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                reactionConfig.position === p.id
                  ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                  : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
              }`}
              title={p.id}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Escala */}
      <SliderRow
        label="Escala"
        value={reactionConfig.scale}
        min={0.1}
        max={0.4}
        step={0.01}
        onChange={(v) => updateReactionConfig({ scale: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />

      {/* Bordas */}
      <SliderRow
        label="Cantos arredondados"
        value={reactionConfig.borderRadius}
        min={0}
        max={40}
        step={1}
        onChange={(v) => updateReactionConfig({ borderRadius: v })}
        format={(v) => `${v}px`}
      />
      <SliderRow
        label="Espessura da borda"
        value={reactionConfig.borderWidth}
        min={0}
        max={10}
        step={1}
        onChange={(v) => updateReactionConfig({ borderWidth: v })}
        format={(v) => `${v}px`}
      />
      <div className="flex items-center justify-between gap-2">
        <label className="text-[9px] text-[#9494A8]">Cor da borda</label>
        <input
          type="color"
          value={reactionConfig.borderColor}
          onChange={(e) => updateReactionConfig({ borderColor: e.target.value })}
          className="w-6 h-5 rounded border border-white/10 bg-transparent cursor-pointer"
        />
      </div>

      {/* Offset */}
      <SliderRow
        label="Iniciar em (offset)"
        value={reactionConfig.startOffsetMs}
        min={0}
        max={5000}
        step={100}
        onChange={(v) => updateReactionConfig({ startOffsetMs: v })}
        format={(v) => `${(v / 1000).toFixed(1)}s`}
      />

      {/* Mixagem de áudio */}
      <div className="rounded-lg border border-white/10 bg-[#1C1C27]/60 p-2 space-y-2">
        <span className="text-[9px] text-[#9494A8] uppercase tracking-wider">Mixagem de áudio</span>
        <div className="space-y-1">
          {AUDIO_MIX_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 text-[10px] text-white cursor-pointer"
            >
              <input
                type="radio"
                name="audioMix"
                checked={reactionConfig.audioMix === opt.id}
                onChange={() => updateReactionConfig({ audioMix: opt.id })}
                className="w-3 h-3 accent-[#7C5CFC]"
              />
              <span className="font-semibold">{opt.label}</span>
              <span className="text-[#9494A8]">— {opt.desc}</span>
            </label>
          ))}
        </div>
        <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 p-1.5">
          <Headphones className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" />
          <span className="text-[9px] text-amber-200/90 leading-relaxed">
            Use fones de ouvido para evitar eco durante a gravação.
          </span>
        </div>
      </div>

      {/* Remover */}
      <Button
        onClick={handleRemove}
        variant="outline"
        className="w-full h-8 border-red-500/30 text-red-300 hover:bg-red-500/10 text-[10px] gap-1.5"
      >
        <Trash2 className="w-3 h-3" /> Remover vídeo de reação
      </Button>
    </div>
  )
}

export default MediaPanel
