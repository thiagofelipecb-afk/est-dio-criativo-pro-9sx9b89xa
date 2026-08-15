import React, { useRef, useState } from 'react'
import { Video, Headphones, Play, Pause, Volume2, VolumeX, Upload, Trash2 } from 'lucide-react'
import { useReactionVideo, fileToDataUrl } from '@/hooks/use-block-media'
import { toast } from 'sonner'
import type { OverlayCorner, ReactionVideo as ReactionVideoType } from '@/types/studio'

/* ───────────────────────────────────────────────────────────────────────────
   ReactionVideoPanel — FASE 3.2
   Aba "Vídeo de Reação" do painel inferior da Gravadora. File picker para
   vídeo local, preview com controles, aviso de fones, slider de tamanho
   (10%–40%), grade 2×2 de cantos. Persiste em localStorage.
   ─────────────────────────────────────────────────────────────────────────── */

const DEFAULT_REACTION: Omit<ReactionVideoType, 'dataUrl' | 'name'> = {
  size: 0.2,
  corner: 'bottom-right',
}

const CORNERS: { id: OverlayCorner; label: string }[] = [
  { id: 'top-left', label: '↖' },
  { id: 'top-right', label: '↗' },
  { id: 'bottom-left', label: '↙' },
  { id: 'bottom-right', label: '↘' },
]

export function ReactionVideoPanel() {
  const { reaction, setReaction } = useReactionVideo()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const previewRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/video\/(mp4|webm)/.test(file.type)) {
      toast.warning('Apenas MP4 e WebM são suportados.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setReaction({
        dataUrl,
        name: file.name,
        ...DEFAULT_REACTION,
      })
      toast.success('Vídeo de reação carregado.')
    } catch {
      toast.error('Falha ao ler o vídeo.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const togglePlay = () => {
    const v = previewRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  const toggleMute = () => {
    const v = previewRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const remove = () => {
    setReaction(null)
    setPlaying(false)
    toast.info('Vídeo de reação removido.')
  }

  return (
    <div className="flex h-full">
      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-y-auto scrollbar-thin">
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-[#22D3EE]" /> Vídeo de Reação
          </h3>
          <p className="text-[10px] text-[#9494A8] mt-0.5">
            Sobreponha um vídeo de reação ao canvas durante a gravação.
          </p>
        </div>

        <div className="p-3 space-y-3">
          {/* Aviso de fones */}
          <div className="flex items-start gap-2 text-[10px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
            <Headphones className="w-3.5 h-3.5 shrink-0 mt-px text-amber-300" />
            <span className="leading-tight">
              Use fones de ouvido para evitar eco na gravação. Durante a gravação o áudio do vídeo
              não sai pelos alto-falantes (mute interno).
            </span>
          </div>

          {/* Seletor */}
          {!reaction ? (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-white/10 rounded-xl gap-2">
              <Video className="w-8 h-8 text-[#9494A8]/50" />
              <p className="text-[11px] text-[#9494A8]">Nenhum vídeo de reação selecionado.</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-[10px] bg-[#7C5CFC] hover:bg-[#6A48E0] text-white px-3 py-1.5 rounded-lg font-semibold"
              >
                <Upload className="w-3.5 h-3.5" /> Selecionar vídeo (MP4/WebM)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview + controles */}
              <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
                <video
                  ref={previewRef}
                  src={reaction.dataUrl}
                  className="w-full max-h-44 object-contain bg-black"
                  loop
                  muted={muted}
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1C1C27] border-t border-white/5">
                  <button
                    onClick={togglePlay}
                    className="p-1 rounded-md text-white hover:bg-white/10"
                    title={playing ? 'Pausar' : 'Reproduzir'}
                  >
                    {playing ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-1 rounded-md text-white hover:bg-white/10"
                    title={muted ? 'Ativar som' : 'Silenciar'}
                  >
                    {muted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-[9px] text-[#9494A8] truncate flex-1">
                    {reaction.name ?? 'vídeo.mp4'}
                  </span>
                  <button
                    onClick={remove}
                    className="p-1 rounded-md text-red-400 hover:bg-red-500/10"
                    title="Remover vídeo de reação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tamanho */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#9494A8]">
                  <span>Tamanho do overlay</span>
                  <span className="font-mono">{Math.round(reaction.size * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.4}
                  step={0.01}
                  value={reaction.size}
                  onChange={(e) => setReaction({ ...reaction, size: parseFloat(e.target.value) })}
                  className="w-full accent-[#7C5CFC]"
                />
              </div>

              {/* Posição (4 cantos) */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#9494A8] block">Posição no canvas</span>
                <div className="grid grid-cols-2 gap-1.5 w-32">
                  {CORNERS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setReaction({ ...reaction, corner: c.id })}
                      className={`aspect-square rounded-lg border text-lg flex items-center justify-center transition-colors ${
                        reaction.corner === c.id
                          ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                          : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:text-white'
                      }`}
                      title={c.id}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-[10px] text-[#7C5CFC] hover:bg-[#7C5CFC]/10 px-2 py-1 rounded font-semibold"
              >
                <Upload className="w-3 h-3" /> Trocar vídeo
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handlePick}
          />
        </div>
      </div>

      {/* Coluna lateral: dica */}
      <div className="w-44 shrink-0 bg-[#14141C] p-2.5 space-y-2 overflow-y-auto scrollbar-thin">
        <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Headphones className="w-3 h-3 text-[#7C5CFC]" /> Como funciona
        </span>
        <ul className="text-[9px] text-[#9494A8] space-y-1.5 leading-relaxed list-disc pl-3">
          <li>O vídeo aparece sobre o canvas durante a gravação.</li>
          <li>Por padrão: canto inferior direito, 20% do canvas, borda arredondada.</li>
          <li>O áudio é silenciado internamente para evitar eco.</li>
          <li>Ajuste o tamanho entre 10% e 40%.</li>
          <li>Escolha qualquer um dos 4 cantos.</li>
        </ul>
      </div>
    </div>
  )
}

export default ReactionVideoPanel
