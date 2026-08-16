import { useEffect, useState } from 'react'
import { useStudio } from '@/context/StudioContext'
import type { BlockMediaAssignment } from '@/types/studio'

/* ===========================================================================
   PROMPT 3 — BlockArtStageOverlay
   Renderiza as artes do bloco atual sobre o palco da Gravadora.
   - layout 'full'        → overlay absoluto sobre a câmera (z abaixo do título)
   - layout 'camera-top'  → arte na parte inferior (abaixo da câmera)
   - layout 'camera-bottom' → arte na parte superior (acima da câmera)
   Múltiplas artes ciclam com crossfade de 500ms.
   =========================================================================== */

interface Props {
  layout: 'full' | 'split-top' | 'split-bottom' | 'split'
  splitCameraRatio: number
}

export function BlockArtStageOverlay({ layout, splitCameraRatio }: Props) {
  const {
    scriptBlocks,
    activeBlockIndex,
    artBlockIndex,
    syncArtsEnabled,
    getAssignmentsForBlock,
    mediaAssets,
  } = useStudio()

  const idx = syncArtsEnabled ? activeBlockIndex : artBlockIndex
  const block = scriptBlocks[idx]
  const assignments: BlockMediaAssignment[] = block ? getAssignmentsForBlock(block.id) : []

  // Ciclo entre múltiplas artes a cada 4s com crossfade.
  const [cycleIdx, setCycleIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    setCycleIdx(0)
    setFade(true)
  }, [idx, assignments.length])

  useEffect(() => {
    if (assignments.length <= 1) return
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCycleIdx((i) => (i + 1) % assignments.length)
        setFade(true)
      }, 250)
    }, 4000)
    return () => clearInterval(id)
  }, [assignments.length])

  if (assignments.length === 0) return null

  const safeCycle = Math.min(cycleIdx, assignments.length - 1)
  const assignment = assignments[safeCycle]
  const asset = mediaAssets.find((a) => a.id === assignment.assetId)
  if (!asset) return null
  const url = asset.publicUrl || asset.thumbnailUrl || ''

  const objectFit =
    assignment.fit === 'cover' ? 'cover' : assignment.fit === 'fill' ? 'fill' : 'contain'
  const tx = (assignment.positionX - 0.5) * 100
  const ty = (assignment.positionY - 0.5) * 100

  const renderMedia = (key: string) =>
    asset.type === 'video' ? (
      <video
        key={key}
        src={url}
        className="w-full h-full"
        style={{
          objectFit: objectFit as any,
          transform: `translate(${tx}%, ${ty}%) scale(${assignment.scale})`,
          opacity: fade ? 1 : 0,
          transition: 'opacity 250ms ease-in-out',
        }}
        muted
        loop
        autoPlay
        playsInline
      />
    ) : (
      <img
        key={key}
        src={url}
        alt="arte"
        className="w-full h-full"
        style={{
          objectFit: objectFit as any,
          transform: `translate(${tx}%, ${ty}%) scale(${assignment.scale})`,
          opacity: fade ? 1 : 0,
          transition: 'opacity 250ms ease-in-out',
        }}
      />
    )

  const inner = (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: assignment.backgroundColor }}
    >
      {renderMedia(assignment.id + '-' + safeCycle)}
    </div>
  )

  // Posicionamento conforme o layout.
  if (layout === 'split-bottom') {
    // Arte na parte superior (acima da câmera).
    return (
      <div
        className="absolute left-0 right-0 top-0 z-[15] overflow-hidden"
        style={{ height: `${(1 - splitCameraRatio) * 100}%` }}
      >
        {inner}
      </div>
    )
  }
  if (layout === 'split-top' || layout === 'split') {
    // Arte na parte inferior (abaixo da câmera).
    return (
      <div
        className="absolute left-0 right-0 bottom-0 z-[15] overflow-hidden"
        style={{ height: `${(1 - splitCameraRatio) * 100}%` }}
      >
        {inner}
      </div>
    )
  }
  // full: overlay sobre toda a câmera, abaixo do título (z-15 < título).
  return <div className="absolute inset-0 z-[15] overflow-hidden">{inner}</div>
}

export default BlockArtStageOverlay
