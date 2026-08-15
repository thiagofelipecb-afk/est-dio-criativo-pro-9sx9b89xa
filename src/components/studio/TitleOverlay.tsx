import React, { useCallback, useRef, useState } from 'react'
import type { TitleConfig } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   TitleOverlay — FASE 4.2
   Renderiza o título como overlay HTML posicionado absolutamente sobre o
   canvas 9:16, acima de todas as outras camadas (artes, reação, b-roll,
   quadro). Suporta arraste livre com mouse/touch — as coordenadas
   normalizadas (x,y de 0 a 1) atualizam ao soltar.
   ─────────────────────────────────────────────────────────────────────────── */

export interface TitleOverlayProps {
  config: TitleConfig
  onChange: (cfg: Partial<TitleConfig>) => void
  /** Quando true, o título não é arrastável (ex.: durante gravação). */
  locked?: boolean
  /** Tempo decorrido da gravação em segundos (para duração por segundos). */
  elapsedSeconds?: number
}

const FONT_FAMILY: Record<TitleConfig['font'], string> = {
  Anton: "'Anton', sans-serif",
  Montserrat: "'Montserrat', sans-serif",
  Caveat: "'Caveat', cursive",
}

export function TitleOverlay({ config, onChange, locked, elapsedSeconds = 0 }: TitleOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (locked) return
      const container = containerRef.current?.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      const onMove = (cx: number, cy: number) => {
        const nx = Math.min(1, Math.max(0, (cx - rect.left) / rect.width))
        const ny = Math.min(1, Math.max(0, (cy - rect.top) / rect.height))
        onChange({ normalizedX: nx, normalizedY: ny, position: 'custom' })
      }
      const onMouseMove = (ev: MouseEvent) => onMove(ev.clientX, ev.clientY)
      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches[0]) onMove(ev.touches[0].clientX, ev.touches[0].clientY)
      }
      const onUp = () => {
        setDragging(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onUp)
      }
      setDragging(true)
      onMove(clientX, clientY)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onUp)
    },
    [locked, onChange],
  )

  // Respeita a duração configurada
  if (config.enabled && config.duration === 'seconds' && elapsedSeconds > config.durationSeconds) {
    return null
  }
  if (!config.enabled || !config.text.trim()) return null

  // Posição vertical preset → coordenada Y normalizada
  let posY = config.normalizedY
  let posX = config.normalizedX
  if (config.position === 'top') posY = 0.1
  else if (config.position === 'middle') posY = 0.5
  else if (config.position === 'bottom') posY = 0.9

  // Alinhamento horizontal (textAlign) e posição X conforme alignment quando
  // não é custom.
  let translateX = '-50%'
  if (config.position !== 'custom') {
    if (config.alignment === 'left') {
      posX = 0.5
      translateX = '-50%'
    } else if (config.alignment === 'right') {
      posX = 0.5
      translateX = '-50%'
    }
  }

  const bgStyle: React.CSSProperties =
    config.bgEnabled && config.bgColor !== 'transparent'
      ? { backgroundColor: config.bgColor, padding: '16px', borderRadius: '8px' }
      : {}

  return (
    <div ref={containerRef} className="absolute inset-0 z-[25] pointer-events-none" aria-hidden>
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          startDrag(e.clientX, e.clientY)
        }}
        onTouchStart={(e) => {
          if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY)
        }}
        className="absolute transition-all duration-200 ease-out select-none"
        style={{
          left: `${posX * 100}%`,
          top: `${posY * 100}%`,
          width: `${config.width}%`,
          transform: `translate(${translateX}, -50%)`,
          pointerEvents: locked ? 'none' : 'auto',
          cursor: locked ? 'default' : dragging ? 'grabbing' : 'grab',
          ...bgStyle,
        }}
      >
        <p
          style={{
            fontFamily: FONT_FAMILY[config.font],
            fontSize: `${config.fontSize}px`,
            color: config.color,
            textAlign: config.alignment,
            lineHeight: 1.1,
            margin: 0,
            wordBreak: 'break-word',
            textShadow:
              config.bgEnabled && config.bgColor !== 'transparent'
                ? 'none'
                : '0 2px 8px rgba(0,0,0,0.55)',
          }}
        >
          {config.text}
        </p>
      </div>
    </div>
  )
}

export default TitleOverlay
