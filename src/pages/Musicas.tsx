import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Music, Play, Pause, Search, Volume2, SkipBack, SkipForward, Check } from 'lucide-react'
import { toast } from 'sonner'
import { MUSIC_TRACKS } from '@/lib/libraryData'
import type { MusicTrack } from '@/types/library'

const GENRES = ['Todos', 'Lo-fi', 'Cinematic', 'Eletrônico', 'Pop', 'Hip-hop', 'Ambiente'] as const

const formatTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Musicas() {
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Todos')
  const [search, setSearch] = useState('')
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const intervalRef = useRef<number | null>(null)

  const filtered = useMemo(() => {
    return MUSIC_TRACKS.filter((t) => {
      if (genre !== 'Todos' && t.genre !== genre) return false
      if (
        search &&
        !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.artist.toLowerCase().includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [genre, search])

  // Player simulado
  useEffect(() => {
    if (isPlaying && currentTrack) {
      intervalRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= currentTrack.duration) {
            setIsPlaying(false)
            return 0
          }
          return p + 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [isPlaying, currentTrack])

  const handlePlay = (track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentTrack(track)
      setProgress(0)
      setIsPlaying(true)
    }
  }

  const handleUseMusic = (track: MusicTrack) => {
    const musicMap = JSON.parse(localStorage.getItem('lumen_project_music') || '{}')
    musicMap['current'] = { id: track.id, title: track.title, artist: track.artist }
    localStorage.setItem('lumen_project_music', JSON.stringify(musicMap))
    toast.success(`"${track.title}" vinculada ao projeto atual`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Music className="w-7 h-7 text-[#7C5CFC]" /> Músicas
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Biblioteca de faixas para trilha sonora dos seus vídeos.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9494A8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou artista..."
            className="bg-[#14141C] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] w-full sm:w-72"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              genre === g
                ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                : 'text-[#9494A8] hover:text-white hover:bg-white/5'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((track) => {
          const isCurrent = currentTrack?.id === track.id
          return (
            <div
              key={track.id}
              className={`rounded-2xl bg-[#14141C] border transition-all overflow-hidden flex flex-col ${
                isCurrent
                  ? 'border-[#7C5CFC] shadow-lg shadow-[#7C5CFC]/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div
                className="relative aspect-square"
                style={{ background: `linear-gradient(135deg, ${track.color}, #0B0B10)` }}
              >
                <img
                  src={track.cover}
                  alt={track.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <button
                  onClick={() => handlePlay(track)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="p-3 rounded-full bg-[#7C5CFC] text-white shadow-lg">
                    {isCurrent && isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </span>
                </button>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                  {track.genre} · {track.bpm} BPM
                </span>
              </div>
              <div className="p-3 space-y-1 flex-1">
                <h3 className="text-xs font-bold text-white truncate">{track.title}</h3>
                <p className="text-[10px] text-[#9494A8] truncate">{track.artist}</p>
                <p className="text-[10px] text-[#9494A8]">{formatTime(track.duration)}</p>
              </div>
              <div className="p-3 pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUseMusic(track)}
                  className="w-full border-white/10 text-[10px] gap-1"
                >
                  <Check className="w-3 h-3" /> Usar esta música
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Music className="w-10 h-10 text-[#9494A8]/40 mx-auto mb-3" />
          <p className="text-sm text-[#9494A8]">Nenhuma música encontrada.</p>
        </div>
      )}

      {/* Player fixo */}
      {currentTrack && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-[#14141C] border border-white/10 rounded-2xl p-3 shadow-2xl z-50">
          <div className="flex items-center gap-3">
            <img src={currentTrack.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
              <p className="text-[10px] text-[#9494A8] truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-[#9494A8] hover:text-white">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full bg-[#7C5CFC] text-white hover:bg-[#6A48E0]"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button className="p-2 text-[#9494A8] hover:text-white">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 w-20">
              <Volume2 className="w-3.5 h-3.5 text-[#9494A8]" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-[#7C5CFC] h-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] text-[#9494A8] font-mono w-8">{formatTime(progress)}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] transition-all"
                style={{ width: `${(progress / currentTrack.duration) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-[#9494A8] font-mono w-8">
              {formatTime(currentTrack.duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
