import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactionConfig, ReactionPosition } from '@/types/studio'
import { useStudio } from '@/context/StudioContext'

/* ===========================================================================
   ReactionStageOverlay
   --------------------------------------------------------------------------
   Renderiza o <video> de reação sobre o palco da Gravadora.
   - Posicionado em um dos 4 cantos (offset 16px) ou em "split" (metade).
   - Tamanho: scale * largura do container (cantos) / metade (split).
   - Loop, mute, volume e offset conforme reactionConfig.
   - Handles de arraste (move entre cantos) e resize (ajusta escala) aparecem
     SOMENTE fora da gravação (não entram no vídeo exportado).
   - Expõe a ref do <video> para a Gravadora usar na mixagem de áudio (Web Audio)
     e no drawImage do exporter.
   =========================================================================== */

interface Props {
  /** True quando está gravando — oculta os handles de edição. */
  isRecording: boolean
}

export interface ReactionStageOverlayHandle {
  /** Elemento <video> da reação (para Web Audio + drawImage no exporter). */
  video: HTMLVideoElement | null
}

const POSITION_LABELS: Record<ReactionPosition, string> = {
  'top-left': ' Superior esquerdo',
  'top-right': ' Superior direito',
  'bottom-left': ' Inferior esquerdo',
  'bottom-right': ' Inferior direito',
  split: ' Tela dividida',
}

export const ReactionStageOverlay = forwardRef<ReactionStageOverlayHandle, Props>(
  function ReactionStageOverlay({ isRecording }, ref) {
    const { reactionConfig, updateReactionConfig, mediaAssets } = useStudio()
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Expõe o handle para o pai.
    React.useImperativeHandle(ref, () => ({
      get video() {
        return videoRef.current
      },
    }))

    const asset = reactionConfig.assetId
      ? mediaAssets.find((a) => a.id === reactionConfig.assetId)
      : null

    // Aplica startOffsetMs quando o vídeo carrega.
    useEffect(() => {
      const v = videoRef.current
      if (!v) return
      const onLoaded = () => {
        if (reactionConfig.startOffsetMs > 0) {
          try {
            v.currentTime = reactionConfig.startOffsetMs / 1000
          } catch {
            /* noop */
          }
        }
      }
      v.addEventListener('loadedmetadata', onLoaded)
      return () => v.removeEventListener('loadedmetadata', onLoaded)
    }, [reactionConfig.assetId, reactionConfig.startOffsetMs])

    // Atualiza volume/muted do elemento.
    useEffect(() => {
      const v = videoRef.current
      if (!v) return
      v.muted = reactionConfig.muted
      v.volume = Math.max(0, Math.min(1, reactionConfig.volume / 100))
      v.loop = reactionConfig.loop
    }, [reactionConfig.muted, reactionConfig.volume, reactionConfig.loop, reactionConfig.assetId])

    // --- Arrasto: mover entre cantos clicando e arrastando ---
    const [dragging, setDragging] = useState(false)
    const dragStart = useRef<{ x: number; y: number } | null>(null)

    const onPointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (isRecording) return
        if (reactionConfig.position === 'split') return // split não é arrastável
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        setDragging(true)
        dragStart.current = { x: e.clientX, y: e.clientY }
      },
      [isRecording, reactionConfig.position],
    )

    const onPointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!dragging || !dragStart.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const midX = rect.width / 2
        const midY = rect.height / 2
        const next: ReactionPosition =
          cx < midX
            ? cy < midY
              ? 'top-left'
              : 'bottom-left'
            : cy < midY
              ? 'top-right'
              : 'bottom-right'
        if (next !== reactionConfig.position) {
          updateReactionConfig({ position: next })
        }
      },
      [dragging, reactionConfig.position, updateReactionConfig],
    )

    const onPointerUp = useCallback((e: React.PointerEvent) => {
      setDragging(false)
      dragStart.current = null
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    }, [])

    // --- Resize: arrastar a alça inferior direita ajusta a escala ---
    const [resizing, setResizing] = useState(false)
    const resizeStart = useRef<{ y: number; scale: number } | null>(null)

    const onResizePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (isRecording) return
        e.preventDefault()
        e.stopPropagation()
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        setResizing(true)
        resizeStart.current = { y: e.clientY, scale: reactionConfig.scale }
      },
      [isRecording, reactionConfig.scale],
    )

    const onResizePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!resizing || !resizeStart.current) return
        const dy = e.clientY - resizeStart.current.y
        // Arrastar para baixo aumenta a escala; para cima diminui.
        const delta = dy / 400
        const next = Math.max(0.1, Math.min(0.4, resizeStart.current.scale + delta))
        updateReactionConfig({ scale: Number(next.toFixed(3)) })
      },
      [resizing, updateReactionConfig],
    )

    const onResizePointerUp = useCallback((e: React.PointerEvent) => {
      setResizing(false)
      resizeStart.current = null
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    }, [])

    if (!reactionConfig.enabled || !asset) return null

    const url = asset.publicUrl || ''
    if (!url) return null

    const { position, scale, borderRadius, borderWidth, borderColor } = reactionConfig

    // Estilo comum do <video>.
    const videoEl = (
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        autoPlay
        loop={reactionConfig.loop}
        muted={reactionConfig.muted}
        playsInline
        style={{ borderRadius, pointerEvents: 'none' }}
      />
    )

    // Wrapper de borda (aplica border + radius + cursor).
    const borderStyle: React.CSSProperties = {
      borderRadius,
      border: `${borderWidth}px solid ${borderColor}`,
      boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
      overflow: 'hidden',
    }

    // Split: ocupa metade inferior, sem handles.
    if (position === 'split') {
      return (
        <div className="absolute inset-x-0 bottom-0 z-[18] pointer-events-none">
          <div className="w-full" style={{ height: '50%', ...borderStyle, borderRadius: 0 }}>
            {videoEl}
          </div>
        </div>
      )
    }

    // Cantos: tamanho = scale * largura do container (estimado via % do stage).
    // Usamos percentuais relativos ao palco: largura ≈ scale * 100% do width
    // não funciona bem em 9:16, então fixamos em vh-like usando aspect square.
    const sizePct = scale * 100 // % da largura do container

    const cornerStyle: React.CSSProperties = {
      position: 'absolute',
      width: `${sizePct}%`,
      aspectRatio: '1 / 1',
      ...borderStyle,
    }
    const offset = 16
    const posStyle: React.CSSProperties =
      position === 'top-left'
        ? { top: offset, left: offset }
        : position === 'top-right'
          ? { top: offset, right: offset }
          : position === 'bottom-left'
            ? { bottom: offset, left: offset }
            : { bottom: offset, right: offset }

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 z-[18]"
        style={{ pointerEvents: isRecording ? 'none' : 'auto' }}
        onPointerMove={(e) => {
          onPointerMove(e)
          onResizePointerMove(e)
        }}
        onPointerUp={(e) => {
          onPointerUp(e)
          onResizePointerUp(e)
        }}
      >
        <div
          style={{ ...cornerStyle, ...posStyle, cursor: dragging ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          title={`Reação —${POSITION_LABELS[position]}`}
        >
          {videoEl}

          {/* Handle de resize (canto inferior direito) — só fora da gravação */}
          {!isRecording && (
            <div
              onPointerDown={onResizePointerDown}
              style={{
                position: 'absolute',
                right: -6,
                bottom: -6,
                width: 16,
                height: 16,
                borderRadius: 9999,
                background: '#7C5CFC',
                border: '2px solid #fff',
                cursor: 'nwse-resize',
                zIndex: 2,
                touchAction: 'none',
              }}
              title="Arraste para redimensionar"
            />
          )}

          {/* Badge de posição */}
          {!isRecording && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                padding: '1px 6px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {Math.round(scale * 100)}%
            </div>
          )}
        </div>
      </div>
    )
  },
)

export default ReactionStageOverlay
