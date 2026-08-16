import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Volume2, VolumeX, Waves } from 'lucide-react'
import type { EditorAudioState } from '@/components/studio/editor-types'
import { saveEditorState } from '@/components/studio/editor-types'
import {
  drawWaveform,
  extractWaveform as libExtractWaveform,
  syntheticWaveform,
  type WaveformData,
} from '@/lib/waveform'

interface AudioPanelProps {
  projectId: string
  audio: EditorAudioState
  onChange: (a: EditorAudioState) => void
  videoBlob: Blob | null
  currentTime: number
  duration: number
}

export function AudioPanel({
  projectId,
  audio,
  onChange,
  videoBlob,
  currentTime,
  duration,
}: AudioPanelProps) {
  const update = useCallback(
    (patch: Partial<EditorAudioState>) => {
      const next = { ...audio, ...patch }
      onChange(next)
      saveEditorState(projectId, 'audio', next)
    },
    [audio, onChange, projectId],
  )

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [waveform, setWaveform] = useState<WaveformData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!videoBlob) return
      try {
        const data = await libExtractWaveform(videoBlob, 200)
        if (!cancelled) setWaveform(data)
      } catch {
        if (!cancelled) setWaveform(syntheticWaveform(duration || 10, 200))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [videoBlob, duration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveform) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    const inFraction = duration > 0 ? currentTime / duration : 0
    drawWaveform(ctx, waveform, w, h, '#7C5CFC', {
      inFraction: Math.max(0, inFraction - 0.01),
      outFraction: Math.min(1, inFraction + 0.01),
      dimColor: 'rgba(124, 92, 252, 0.3)',
    })
    // playhead line
    ctx.fillStyle = '#22D3EE'
    ctx.fillRect(inFraction * w - 1, 0, 2, h)
  }, [waveform, currentTime, duration])

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2.5">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#9494A8]">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Volume da voz
            </span>
            <span className="font-mono">{audio.voiceVolume}%</span>
          </div>
          <Slider
            value={[audio.voiceVolume]}
            min={0}
            max={200}
            step={1}
            onValueChange={(v) => update({ voiceVolume: v[0] })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#9494A8]">
            <span>Volume da música</span>
            <span className="font-mono">{audio.musicVolume}%</span>
          </div>
          <Slider
            value={[audio.musicVolume]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => update({ musicVolume: v[0] })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#9494A8] flex items-center gap-1.5">
            {audio.muted ? (
              <VolumeX className="w-3 h-3 text-red-400" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
            Silenciar (mute)
          </span>
          <Switch checked={audio.muted} onCheckedChange={(v) => update({ muted: v })} />
        </div>
      </div>

      {/* Fades */}
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2.5">
        <span className="text-[10px] text-[#9494A8] uppercase tracking-wider">Fades</span>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#9494A8]">
            <span>Fade-in</span>
            <span className="font-mono">{audio.fadeIn.toFixed(1)}s</span>
          </div>
          <Slider
            value={[Math.round(audio.fadeIn * 10)]}
            min={0}
            max={50}
            step={1}
            onValueChange={(v) => update({ fadeIn: v[0] / 10 })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#9494A8]">
            <span>Fade-out</span>
            <span className="font-mono">{audio.fadeOut.toFixed(1)}s</span>
          </div>
          <Slider
            value={[Math.round(audio.fadeOut * 10)]}
            min={0}
            max={50}
            step={1}
            onValueChange={(v) => update({ fadeOut: v[0] / 10 })}
          />
        </div>
      </div>

      {/* Redução de ruído / Ducking */}
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-white">Redução de ruído</p>
            <p className="text-[9px] text-[#9494A8]/70">
              Aplica noiseSuppression quando disponível
            </p>
          </div>
          <Switch
            checked={audio.noiseSuppression}
            onCheckedChange={(v) => update({ noiseSuppression: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-white">Ducking</p>
            <p className="text-[9px] text-[#9494A8]/70">
              A música baixa automaticamente quando houver fala
            </p>
          </div>
          <Switch checked={audio.ducking} onCheckedChange={(v) => update({ ducking: v })} />
        </div>
      </div>

      {/* Waveform */}
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2">
        <span className="text-[10px] text-[#9494A8] uppercase tracking-wider flex items-center gap-1">
          <Waves className="w-3 h-3" /> Forma de onda do áudio
        </span>
        <canvas
          ref={canvasRef}
          width={280}
          height={56}
          className="w-full h-14 rounded-lg bg-[#0B0B10] border border-white/5"
        />
        {!waveform && <p className="text-[9px] text-[#9494A8]/70">Analisando áudio...</p>}
      </div>

      {/* Sincronização */}
      <div className="rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#9494A8]">Tempo atual sincronizado</span>
        <span className="font-mono text-[11px] text-[#22D3EE]">
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>
      </div>
    </div>
  )
}

export default AudioPanel
