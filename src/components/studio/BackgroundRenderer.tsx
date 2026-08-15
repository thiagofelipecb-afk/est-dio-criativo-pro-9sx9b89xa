import React from 'react'
import { useStudio } from '@/context/StudioContext'
import type { BackgroundConfig } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   BackgroundRenderer — FASE 4.1
   Renderiza o fundo selecionado ATRÁS do canvas 9:16 (preenchendo toda a
   área do contêiner do palco). O canvas fica centralizado sobre este fundo.
   ─────────────────────────────────────────────────────────────────────────── */

export interface BackgroundRendererProps {
  config: BackgroundConfig
  /** URL do vídeo da câmera (para o modo desfoque). Opcional. */
  cameraStreamUrl?: string | null
  className?: string
}

export function BackgroundRenderer({
  config,
  cameraStreamUrl,
  className,
}: BackgroundRendererProps) {
  const base = 'absolute inset-0 w-full h-full overflow-hidden'

  if (config.type === 'blur') {
    return (
      <div className={`${base} ${className ?? ''}`} aria-hidden>
        {cameraStreamUrl ? (
          <video
            src={cameraStreamUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ filter: `blur(${config.blurAmount ?? 12}px)`, transform: 'scale(1.1)' }}
          />
        ) : (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              filter: `blur(${config.blurAmount ?? 12}px)`,
              transform: 'scale(1.1)',
              backgroundImage:
                "url('https://img.usecurling.com/p/1920/1080?q=modern+studio+cyberpunk+dark')",
            }}
          />
        )}
      </div>
    )
  }

  if (config.type === 'preset' && config.presetColor) {
    return (
      <div
        className={`${base} ${className ?? ''}`}
        style={{ backgroundColor: config.presetColor }}
        aria-hidden
      />
    )
  }

  if (config.type === 'image' && config.imageDataUrl) {
    return (
      <div
        className={`${base} ${className ?? ''} bg-cover bg-center`}
        style={{ backgroundImage: `url(${config.imageDataUrl})` }}
        aria-hidden
      />
    )
  }

  // none (padrão) — fundo preto puro
  return <div className={`${base} bg-black ${className ?? ''}`} aria-hidden />
}

/** Conector que lê a config do StudioContext. */
export function BackgroundRendererConnected({
  cameraStreamUrl,
}: {
  cameraStreamUrl?: string | null
}) {
  const { backgroundConfig } = useStudio()
  return <BackgroundRenderer config={backgroundConfig} cameraStreamUrl={cameraStreamUrl} />
}

export default BackgroundRenderer
