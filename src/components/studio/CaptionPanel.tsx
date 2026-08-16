import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Trash2,
  Plus,
  Search,
  Replace,
  Scissors,
  Combine,
  Upload,
  Download,
  Undo2,
  Redo2,
  Type,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CaptionCue,
  CaptionPreset,
  CaptionStyle,
  CaptionTrack,
  CaptionWord,
  CAPTION_ANIMATIONS,
  CAPTION_FONTS,
  CAPTION_PRESETS,
  DEFAULT_CAPTION_STYLE,
  editorKey,
  formatTimestamp,
  loadEditorState,
  saveEditorState,
} from '@/components/studio/editor-types'

interface CaptionPanelProps {
  projectId: string
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

function tokenize(text: string, startTime: number, endTime: number): CaptionWord[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const per = (endTime - startTime) / words.length
  return words.map((word, i) => ({
    word,
    start: startTime + i * per,
    end: startTime + (i + 1) * per,
  }))
}

function parseSrt(content: string): CaptionCue[] {
  const blocks = content.replace(/\r/g, '').split(/\n\n+/).filter(Boolean)
  const cues: CaptionCue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean)
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue
    const [startStr, endStr] = timeLine.split('-->')
    const toSec = (s: string): number => {
      const [hms, ms] = s.trim().split(',')
      const [h, m, sec] = hms.split(':').map(Number)
      return (h || 0) * 3600 + (m || 0) * 60 + (sec || 0) + (Number(ms) || 0) / 1000
    }
    const start = toSec(startStr)
    const end = toSec(endStr)
    const text = lines.filter((l) => !l.includes('-->') && !/^\d+$/.test(l)).join(' ')
    const id = 'cue-' + Math.random().toString(36).slice(2, 9)
    cues.push({
      id,
      startTime: start,
      endTime: end,
      text,
      words: tokenize(text, start, end),
      style: 'clean-center',
      animation: 'fade',
      version: 1,
    })
  }
  return cues
}

function cuesToSrt(cues: CaptionCue[]): string {
  return cues
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
    .map((cue, i) => {
      return `${i + 1}\n${formatTimestamp(cue.startTime, true)} --> ${formatTimestamp(cue.endTime, true)}\n${cue.text}\n`
    })
    .join('\n')
}

function cuesToVtt(cues: CaptionCue[]): string {
  return (
    'WEBVTT\n\n' +
    cues
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .map((cue, i) => {
        return `${i + 1}\n${formatTimestamp(cue.startTime)} --> ${formatTimestamp(cue.endTime)}\n${cue.text}\n`
      })
      .join('\n')
  )
}

const SECTION_CLASS = 'rounded-xl border border-white/10 bg-[#1C1C27]/60 p-2.5 space-y-2'
const LABEL_CLASS = 'text-[10px] text-[#9494A8] uppercase tracking-wider'
const ROW_CLASS = 'flex justify-between items-center'

export function CaptionPanel({ projectId, currentTime, duration, onSeek }: CaptionPanelProps) {
  const storageKey = editorKey(projectId, 'captions')

  const [track, setTrack] = useState<CaptionTrack>(() => {
    const saved = loadEditorState<CaptionTrack | null>(projectId, 'captions', null)
    return saved ?? { id: 'cap-' + projectId, cues: [], preset: 'clean-center', version: 1 }
  })
  const [presetId, setPresetId] = useState<string>(track.preset || 'clean-center')
  const [style, setStyle] = useState<CaptionStyle>(() => {
    const found = CAPTION_PRESETS.find((p) => p.id === (track.preset || 'clean-center'))
    return found ? { ...found.style } : { ...DEFAULT_CAPTION_STYLE }
  })
  const [animation, setAnimation] = useState(track.cues[0]?.animation || 'fade')
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)

  // Undo/redo
  const undoStack = useRef<CaptionTrack[]>([])
  const redoStack = useRef<CaptionTrack[]>([])
  const [, forceRender] = useState(0)

  const pushHistory = useCallback((prev: CaptionTrack) => {
    undoStack.current.push(prev)
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
  }, [])

  const updateTrack = useCallback(
    (next: CaptionTrack, record = true) => {
      if (record) pushHistory(track)
      setTrack(next)
      saveEditorState(projectId, 'captions', next)
    },
    [track, projectId, pushHistory],
  )

  useEffect(() => {
    saveEditorState(projectId, 'captions', track)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track])

  const selectedCue = useMemo(
    () => track.cues.find((c) => c.id === selectedCueId) || null,
    [track.cues, selectedCueId],
  )

  const applyPreset = useCallback((p: CaptionPreset) => {
    setPresetId(p.id)
    setStyle({ ...p.style })
    setAnimation(p.animation)
    toast.success(`Preset "${p.label}" aplicado.`)
  }, [])

  const handleAddCue = useCallback(() => {
    const start = currentTime
    const end = Math.min(duration, start + 3)
    const id = 'cue-' + Math.random().toString(36).slice(2, 9)
    const cue: CaptionCue = {
      id,
      startTime: start,
      endTime: end,
      text: 'Nova legenda',
      words: tokenize('Nova legenda', start, end),
      style: presetId,
      animation,
      version: 1,
    }
    updateTrack({ ...track, cues: [...track.cues, cue] })
    setSelectedCueId(id)
    toast.success('Legenda adicionada.')
  }, [currentTime, duration, presetId, animation, track, updateTrack])

  const handleDeleteCue = useCallback(
    (id: string) => {
      updateTrack({ ...track, cues: track.cues.filter((c) => c.id !== id) })
      if (selectedCueId === id) setSelectedCueId(null)
    },
    [track, selectedCueId, updateTrack],
  )

  const handleSplitCue = useCallback(
    (cue: CaptionCue) => {
      const mid = (cue.startTime + cue.endTime) / 2
      const leftText = cue.text
        .split(' ')
        .slice(0, Math.ceil(cue.text.split(' ').length / 2))
        .join(' ')
      const rightText = cue.text
        .split(' ')
        .slice(Math.ceil(cue.text.split(' ').length / 2))
        .join(' ')
      const left: CaptionCue = {
        ...cue,
        id: 'cue-' + Math.random().toString(36).slice(2, 9),
        endTime: mid,
        text: leftText,
        words: tokenize(leftText, cue.startTime, mid),
        version: cue.version + 1,
      }
      const right: CaptionCue = {
        ...cue,
        id: 'cue-' + Math.random().toString(36).slice(2, 9),
        startTime: mid,
        text: rightText,
        words: tokenize(rightText, mid, cue.endTime),
        version: cue.version + 1,
      }
      updateTrack({
        ...track,
        cues: track.cues.flatMap((c) => (c.id === cue.id ? [left, right] : [c])),
      })
      toast.success('Legenda dividida.')
    },
    [track, updateTrack],
  )

  const handleMergeCue = useCallback(
    (cue: CaptionCue) => {
      const idx = track.cues.findIndex((c) => c.id === cue.id)
      if (idx < 0 || idx >= track.cues.length - 1) {
        toast.info('Selecione uma legenda que tenha uma próxima para juntar.')
        return
      }
      const next = track.cues[idx + 1]
      const merged: CaptionCue = {
        ...cue,
        endTime: next.endTime,
        text: cue.text + ' ' + next.text,
        words: tokenize(cue.text + ' ' + next.text, cue.startTime, next.endTime),
        version: cue.version + 1,
      }
      updateTrack({
        ...track,
        cues: track.cues.flatMap((c, i) => (i === idx ? [merged] : i === idx + 1 ? [] : [c])),
      })
      toast.success('Legendas juntadas.')
    },
    [track, updateTrack],
  )

  const handleUpdateCue = useCallback(
    (id: string, patch: Partial<CaptionCue>) => {
      updateTrack({
        ...track,
        cues: track.cues.map((c) =>
          c.id === id
            ? {
                ...c,
                ...patch,
                words:
                  patch.text !== undefined ? tokenize(patch.text, c.startTime, c.endTime) : c.words,
                version: c.version + 1,
              }
            : c,
        ),
      })
    },
    [track, updateTrack],
  )

  const applyStyleToAll = useCallback(() => {
    updateTrack({
      ...track,
      preset: presetId,
      cues: track.cues.map((c) => ({ ...c, style: presetId, animation, version: c.version + 1 })),
    })
    toast.success('Estilo aplicado a todas as legendas.')
  }, [track, presetId, animation, updateTrack])

  const handleSearchReplace = useCallback(() => {
    if (!search.trim()) {
      toast.info('Digite um texto para buscar.')
      return
    }
    if (!replaceText.trim() && !showReplace) {
      // apenas busca
      const found = track.cues.filter((c) => c.text.toLowerCase().includes(search.toLowerCase()))
      toast.info(`${found.length} legenda(s) encontrada(s).`)
      if (found[0]) {
        setSelectedCueId(found[0].id)
        onSeek(found[0].startTime)
      }
      return
    }
    let count = 0
    const nextCues = track.cues.map((c) => {
      if (c.text.toLowerCase().includes(search.toLowerCase())) {
        count++
        const newText = c.text.replace(new RegExp(search, 'gi'), replaceText)
        return {
          ...c,
          text: newText,
          words: tokenize(newText, c.startTime, c.endTime),
          version: c.version + 1,
        }
      }
      return c
    })
    updateTrack({ ...track, cues: nextCues })
    toast.success(`${count} ocorrência(s) substituída(s).`)
  }, [search, replaceText, showReplace, track, updateTrack, onSeek])

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) {
      toast.info('Nada para desfazer.')
      return
    }
    redoStack.current.push(track)
    setTrack(prev)
    saveEditorState(projectId, 'captions', prev)
    forceRender((n) => n + 1)
  }, [track, projectId])

  const handleRedo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) {
      toast.info('Nada para refazer.')
      return
    }
    undoStack.current.push(track)
    setTrack(next)
    saveEditorState(projectId, 'captions', next)
    forceRender((n) => n + 1)
  }, [track, projectId])

  const fileImportRef = useRef<HTMLInputElement | null>(null)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const cues = parseSrt(content)
      if (cues.length === 0) {
        toast.error('Nenhuma legenda válida encontrada no arquivo.')
        return
      }
      updateTrack({ ...track, cues: [...track.cues, ...cues] })
      toast.success(`${cues.length} legendas importadas.`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExport = (format: 'srt' | 'vtt') => {
    if (track.cues.length === 0) {
      toast.info('Nenhuma legenda para exportar.')
      return
    }
    const content = format === 'srt' ? cuesToSrt(track.cues) : cuesToVtt(track.cues)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `legendas.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Legendas exportadas em ${format.toUpperCase()}.`)
  }

  const filteredCues = useMemo(() => {
    if (!search.trim()) return track.cues
    return track.cues.filter((c) => c.text.toLowerCase().includes(search.toLowerCase()))
  }, [track.cues, search])

  const updateStyle = (patch: Partial<CaptionStyle>) => setStyle((s) => ({ ...s, ...patch }))

  return (
    <div className="space-y-3">
      {/* Undo/Redo + Import/Export */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={handleUndo}
          className="h-7 text-[10px] border-white/10 text-[#9494A8] hover:text-white gap-1"
        >
          <Undo2 className="w-3 h-3" /> Desfazer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRedo}
          className="h-7 text-[10px] border-white/10 text-[#9494A8] hover:text-white gap-1"
        >
          <Redo2 className="w-3 h-3" /> Refazer
        </Button>
        <input
          ref={fileImportRef}
          type="file"
          accept=".srt,.vtt,text/plain"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileImportRef.current?.click()}
          className="h-7 text-[10px] border-white/10 text-[#9494A8] hover:text-white gap-1"
        >
          <Upload className="w-3 h-3" /> Importar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport('srt')}
          className="h-7 text-[10px] border-white/10 text-[#9494A8] hover:text-white gap-1"
        >
          <Download className="w-3 h-3" /> SRT
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport('vtt')}
          className="h-7 text-[10px] border-white/10 text-[#9494A8] hover:text-white gap-1"
        >
          <Download className="w-3 h-3" /> VTT
        </Button>
      </div>

      {/* Presets */}
      <div className={SECTION_CLASS}>
        <div className={ROW_CLASS}>
          <span className={LABEL_CLASS}>Presets de estilo</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CAPTION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-medium text-left transition-colors ${
                presetId === p.id
                  ? 'bg-[#7C5CFC] text-white'
                  : 'bg-[#14141C] text-[#9494A8] hover:text-white border border-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tipografia */}
      <div className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>Tipografia</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] text-[#9494A8]">Família</label>
            <select
              value={style.fontFamily}
              onChange={(e) => updateStyle({ fontFamily: e.target.value })}
              className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
            >
              {CAPTION_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-[#9494A8]">Peso</label>
            <select
              value={style.fontWeight}
              onChange={(e) => updateStyle({ fontWeight: Number(e.target.value) })}
              className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
            >
              {[400, 500, 600, 700, 800, 900].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#9494A8]">
            <span>Tamanho</span>
            <span className="font-mono">{style.fontSize}px</span>
          </div>
          <Slider
            value={[style.fontSize]}
            min={16}
            max={72}
            step={1}
            onValueChange={(v) => updateStyle({ fontSize: v[0] })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={style.uppercase}
            onCheckedChange={(v) => updateStyle({ uppercase: v })}
          />
          <span className="text-[10px] text-[#9494A8]">Caixa alta</span>
        </div>
      </div>

      {/* Cores */}
      <div className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>Cores</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-[#9494A8]">Cor principal</label>
            <input
              type="color"
              value={style.color}
              onChange={(e) => updateStyle({ color: e.target.value })}
              className="w-full h-8 rounded-lg bg-transparent border-0 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-[9px] text-[#9494A8]">Palavra ativa</label>
            <input
              type="color"
              value={style.activeColor}
              onChange={(e) => updateStyle({ activeColor: e.target.value })}
              className="w-full h-8 rounded-lg bg-transparent border-0 cursor-pointer"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[9px] text-[#9494A8]">Fundo</label>
            <input
              type="color"
              value={style.background === 'transparent' ? '#000000' : style.background}
              onChange={(e) => updateStyle({ background: e.target.value })}
              className="w-full h-8 rounded-lg bg-transparent border-0 cursor-pointer"
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch
              checked={style.background !== 'transparent'}
              onCheckedChange={(v) => updateStyle({ background: v ? '#000000' : 'transparent' })}
            />
            <span className="text-[9px] text-[#9494A8]">Fundo</span>
          </div>
        </div>
      </div>

      {/* Contorno / sombra / fundo / opacidade / padding / raio */}
      <div className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>Aparência</span>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <Switch checked={style.outline} onCheckedChange={(v) => updateStyle({ outline: v })} />
            <span className="text-[10px] text-[#9494A8]">Contorno</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={style.shadow} onCheckedChange={(v) => updateStyle({ shadow: v })} />
            <span className="text-[10px] text-[#9494A8]">Sombra</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#9494A8]">
            <span>Opacidade</span>
            <span className="font-mono">{style.opacity}%</span>
          </div>
          <Slider
            value={[style.opacity]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => updateStyle({ opacity: v[0] })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Padding</span>
              <span className="font-mono">{style.padding}px</span>
            </div>
            <Slider
              value={[style.padding]}
              min={0}
              max={32}
              step={1}
              onValueChange={(v) => updateStyle({ padding: v[0] })}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Raio</span>
              <span className="font-mono">{style.borderRadius}px</span>
            </div>
            <Slider
              value={[style.borderRadius]}
              min={0}
              max={32}
              step={1}
              onValueChange={(v) => updateStyle({ borderRadius: v[0] })}
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>Layout</span>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#9494A8]">
            <span>Largura máxima</span>
            <span className="font-mono">{style.maxWidth}%</span>
          </div>
          <Slider
            value={[style.maxWidth]}
            min={40}
            max={100}
            step={5}
            onValueChange={(v) => updateStyle({ maxWidth: v[0] })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Linhas</span>
              <span className="font-mono">{style.lines}</span>
            </div>
            <Slider
              value={[style.lines]}
              min={1}
              max={3}
              step={1}
              onValueChange={(v) => updateStyle({ lines: v[0] })}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-[#9494A8]">
              <span>Altura linha</span>
              <span className="font-mono">{style.lineHeight.toFixed(2)}</span>
            </div>
            <Slider
              value={[Math.round(style.lineHeight * 100)]}
              min={80}
              max={200}
              step={5}
              onValueChange={(v) => updateStyle({ lineHeight: v[0] / 100 })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#9494A8]">
            <span>Espaçamento letras</span>
            <span className="font-mono">{style.letterSpacing}px</span>
          </div>
          <Slider
            value={[style.letterSpacing]}
            min={-5}
            max={20}
            step={1}
            onValueChange={(v) => updateStyle({ letterSpacing: v[0] })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-[#9494A8]">Alinhamento</label>
            <div className="grid grid-cols-3 gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => updateStyle({ align: a })}
                  className={`py-1 text-[9px] rounded-md ${style.align === a ? 'bg-[#7C5CFC] text-white' : 'bg-[#14141C] text-[#9494A8]'}`}
                >
                  {a === 'left' ? 'Esq' : a === 'center' ? 'Centro' : 'Dir'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] text-[#9494A8]">Posição vertical</label>
            <div className="grid grid-cols-3 gap-1">
              {(['top', 'middle', 'bottom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => updateStyle({ vertical: p })}
                  className={`py-1 text-[9px] rounded-md ${style.vertical === p ? 'bg-[#7C5CFC] text-white' : 'bg-[#14141C] text-[#9494A8]'}`}
                >
                  {p === 'top' ? 'Topo' : p === 'middle' ? 'Centro' : 'Base'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[9px] text-[#9494A8]">Arraste livre:</span>
          <span className="text-[9px] font-mono text-[#22D3EE] bg-[#22D3EE]/10 px-1.5 py-0.5 rounded">
            X {(selectedCue?.position?.x ?? 0.5).toFixed(2)} · Y{' '}
            {(selectedCue?.position?.y ?? 0.9).toFixed(2)}
          </span>
        </div>
        <label className="flex items-center gap-2 pt-1">
          <input type="checkbox" defaultChecked className="accent-[#7C5CFC]" />
          <span className="text-[9px] text-[#9494A8]">Mostrar zona segura no player</span>
        </label>
      </div>

      {/* Animações */}
      <div className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>Animação</span>
        <div className="grid grid-cols-4 gap-1">
          {CAPTION_ANIMATIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAnimation(a.id)}
              className={`py-1.5 text-[9px] rounded-md font-medium ${animation === a.id ? 'bg-[#7C5CFC] text-white' : 'bg-[#14141C] text-[#9494A8] hover:text-white'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buscar e substituir */}
      <div className={SECTION_CLASS}>
        <div className={ROW_CLASS}>
          <span className={LABEL_CLASS}>Buscar e substituir</span>
          <button
            onClick={() => setShowReplace((s) => !s)}
            className="text-[9px] text-[#7C5CFC] hover:underline flex items-center gap-1"
          >
            <Replace className="w-3 h-3" /> {showReplace ? 'Ocultar' : 'Substituir'}
          </button>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 text-[#9494A8] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar texto..."
            className="w-full bg-[#14141C] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-white focus:outline-none"
          />
        </div>
        {showReplace && (
          <input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Substituir por..."
            className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
          />
        )}
        <Button
          size="sm"
          onClick={handleSearchReplace}
          className="w-full h-7 text-[10px] bg-[#7C5CFC] hover:bg-[#6A48E0]"
        >
          {showReplace ? 'Buscar e substituir' : 'Buscar'}
        </Button>
      </div>

      {/* Aplicar estilo */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleAddCue}
          className="flex-1 h-8 text-[11px] bg-[#7C5CFC] hover:bg-[#6A48E0] gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar legenda
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={applyStyleToAll}
          className="flex-1 h-8 text-[11px] border-white/10 text-white hover:bg-white/5"
        >
          Aplicar a todas
        </Button>
      </div>

      {/* Edição temporal da legenda selecionada */}
      {selectedCue && (
        <div className={SECTION_CLASS}>
          <span className={LABEL_CLASS}>Editar legenda selecionada</span>
          <textarea
            value={selectedCue.text}
            onChange={(e) => handleUpdateCue(selectedCue.id, { text: e.target.value })}
            className="w-full bg-[#14141C] border border-white/10 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-[#9494A8]">Início (s)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={duration}
                value={selectedCue.startTime.toFixed(2)}
                onChange={(e) =>
                  handleUpdateCue(selectedCue.id, {
                    startTime: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-[#9494A8]">Fim (s)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={duration}
                value={selectedCue.endTime.toFixed(2)}
                onChange={(e) =>
                  handleUpdateCue(selectedCue.id, {
                    endTime: Math.min(duration, Number(e.target.value) || 0),
                  })
                }
                className="w-full bg-[#14141C] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSplitCue(selectedCue)}
              className="flex-1 h-7 text-[10px] border-white/10 text-white hover:bg-white/5 gap-1"
            >
              <Scissors className="w-3 h-3" /> Dividir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMergeCue(selectedCue)}
              className="flex-1 h-7 text-[10px] border-white/10 text-white hover:bg-white/5 gap-1"
            >
              <Combine className="w-3 h-3" /> Juntar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de legendas */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-[#7C5CFC]" /> Legendas ({track.cues.length})
        </h4>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {filteredCues.length === 0 ? (
            <p className="text-[11px] text-[#9494A8]">Nenhuma legenda adicionada.</p>
          ) : (
            filteredCues
              .slice()
              .sort((a, b) => a.startTime - b.startTime)
              .map((cue) => (
                <div
                  key={cue.id}
                  onClick={() => {
                    onSeek(cue.startTime)
                    setSelectedCueId(cue.id)
                  }}
                  className={`p-2 rounded-xl bg-[#1C1C27] border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    selectedCueId === cue.id
                      ? 'border-[#7C5CFC] text-white'
                      : 'border-white/5 text-[#9494A8] hover:text-white'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-[10px] text-[#22D3EE] mr-2">
                      {formatTimestamp(cue.startTime)} → {formatTimestamp(cue.endTime)}
                    </span>
                    <span>{cue.text}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCue(cue.id)
                    }}
                    className="p-1 text-[#9494A8] hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptionPanel
