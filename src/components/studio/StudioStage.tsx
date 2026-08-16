/* =============================================================================
   LUMEN Studio — StudioStage (canvas único para preview + gravação)
   -----------------------------------------------------------------------------
   Renderiza a composição real em um <canvas> visível via requestAnimationFrame,
   usando `drawComposition` de `src/lib/studio-compositor.ts`. A gravação usa
   `canvas.captureStream()` do MESMO canvas — preview e arquivo são idênticos.

   O HUD do teleprompter NÃO faz parte deste canvas (é um portal separado).
   ========================================================================== */

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  drawComposition,
  ASPECT_DIMENSIONS,
  type AspectRatioId,
  type CameraCrop,
  type CompositionInputs,
  type SplitMediaLayer,
  type ReactionLayer,
  type ArtLayer,
} from '@/lib/studio-compositor'
import type { BackgroundConfig, StageLayout, TitleConfig, CameraConfigLike } from '@/types/studio'

export interface StudioStageHandle {
  /** Canvas usado para preview e gravação (captureStream). */
  canvas: HTMLCanvasElement | null
  /** Cria (ou retorna) a MediaStream para gravação. */
  captureStream: (fps?: number) => MediaStream | null
}

export interface StudioStageProps {
  aspect: AspectRatioId
  layout: StageLayout
  background: BackgroundConfig
  camera: CameraConfigLike
  cameraCrop: CameraCrop
  /** Vídeo da webcam (srcObject já conectado). */
  cameraVideo: HTMLVideoElement | null
  split?: SplitMediaLayer | null
  splitMediaEl?: HTMLImageElement | HTMLVideoElement | null
  art?: ArtLayer | null
  reaction?: ReactionLayer | null
  title?: TitleConfig | null
  className?: string
  /** Mostrar guias de segurança (apenas preview, não entram na gravação). */
  showGuides?: boolean
}

export const StudioStage = forwardRef<StudioStageHandle, StudioStageProps>(function StudioStage(
  {
    aspect,
    layout,
    background,
    camera,
    cameraCrop,
    cameraVideo,
    split,
    splitMediaEl,
    art,
    reaction,
    title,
    className,
    showGuides = false,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(performance.now())

  // Mantém refs dos props para o loop de rAF ler sem recriar a cada render.
  const propsRef = useRef<StudioStageProps | null>(null)
  propsRef.current = {
    aspect,
    layout,
    background,
    camera,
    cameraCrop,
    cameraVideo,
    split,
    splitMediaEl,
    art,
    reaction,
    title,
    className,
    showGuides,
  }

  useImperativeHandle(
    ref,
    (): StudioStageHandle => ({
      get canvas() {
        return canvasRef.current
      },
      captureStream: (fps = 30) => {
        const c = canvasRef.current
        if (!c) return null
        const anyC = c as any
        if (typeof anyC.captureStream === 'function') return anyC.captureStream(fps)
        if (typeof anyC.mozCaptureStream === 'function') return anyC.mozCaptureStream(fps)
        return null
      },
    }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dims = ASPECT_DIMENSIONS[aspect]
    canvas.width = dims.width
    canvas.height = dims.height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const render = () => {
      const p = propsRef.current
      if (!p) {
        rafRef.current = requestAnimationFrame(render)
        return
      }
      const elapsed = (performance.now() - startRef.current) / 1000
      const input: CompositionInputs = {
        ctx,
        width: canvas.width,
        height: canvas.height,
        layout: p.layout,
        background: p.background,
        camera: p.camera,
        cameraCrop: p.cameraCrop,
        cameraVideo: p.cameraVideo,
        split: p.split,
        splitMediaEl: p.splitMediaEl,
        art: p.art,
        reaction: p.reaction,
        title: p.title,
        elapsedSec: elapsed,
      }
      drawComposition(input)
      if (p.showGuides) drawGuides(ctx, canvas.width, canvas.height)
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [aspect])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Pré-visualização da composição da gravadora"
      role="img"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  )
})

/** Guias de segurança — só no preview, nunca na gravação. */
function drawGuides(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(124,92,252,0.5)'
  ctx.lineWidth = Math.max(1, W * 0.002)
  ctx.setLineDash([W * 0.02, W * 0.02])
  // área de ação segura 90%
  const m = W * 0.05
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
  // linha de botões (85%) e legenda (92%)
  ctx.beginPath()
  ctx.moveTo(m, H * 0.85)
  ctx.lineTo(W - m, H * 0.85)
  ctx.moveTo(m, H * 0.92)
  ctx.lineTo(W - m, H * 0.92)
  ctx.stroke()
  ctx.restore()
}

export default StudioStage
