import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Film, Clock, Calendar, Inbox } from 'lucide-react'
import { useStudio } from '@/context/StudioContext'
import type { RawVideoRecord } from '@/types/studio'

/**
 * OpenTakeModal — lista os takes salvos pela Gravadora (metadados em
 * `localStorage` sob `lumen_raw_video_meta_*`) e permite abri-los no editor.
 * Cada take mostra projeto, duração e data. O blob real é carregado via
 * `loadRawVideo(projectId)` do StudioContext.
 */
export interface OpenTakeModalProps {
  open: boolean
  onClose: () => void
  onSelect: (projectId: string) => void
  /** ID do projeto atualmente aberto no editor (para destaque). */
  currentProjectId?: string
}

interface TakeEntry {
  projectId: string
  record: RawVideoRecord
  title: string
}

function fmtDuration(s: number): string {
  if (!isFinite(s) || s <= 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function OpenTakeModal({ open, onClose, onSelect, currentProjectId }: OpenTakeModalProps) {
  const { projects, loadRawVideo } = useStudio()
  const [takes, setTakes] = useState<TakeEntry[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Lista metadados de takes salvos pela Gravadora.
  useEffect(() => {
    if (!open) return
    const found: TakeEntry[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('lumen_raw_video_meta_')) continue
      try {
        const rec = JSON.parse(localStorage.getItem(key) || '') as RawVideoRecord
        if (!rec || !rec.projectId) continue
        const proj = projects.find((p) => p.id === rec.projectId)
        found.push({
          projectId: rec.projectId,
          record: rec,
          title: proj?.title || `Take ${rec.projectId}`,
        })
      } catch {
        /* noop */
      }
    }
    found.sort((a, b) => (b.record.savedAt || '').localeCompare(a.record.savedAt || ''))
    setTakes(found)
  }, [open, projects])

  const handlePick = async (projectId: string) => {
    setLoadingId(projectId)
    // Verifica se o blob realmente existe antes de fechar o modal.
    const blob = await loadRawVideo(projectId)
    setLoadingId(null)
    if (!blob) return
    onSelect(projectId)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[#14141C] border-white/10 text-white rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-white/5">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Film className="w-5 h-5 text-[#7C5CFC]" /> Abrir take da Gravadora
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9494A8]">
            Takes salvos localmente pelo Estúdio de Gravação. Selecione um para carregar no editor.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {takes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Inbox className="w-8 h-8 text-[#9494A8]/50" />
              <p className="text-xs text-[#9494A8]">Nenhum take salvo encontrado.</p>
              <p className="text-[10px] text-[#9494A8]/70">
                Grave um vídeo na Gravadora para que ele apareça aqui.
              </p>
            </div>
          ) : (
            takes.map((t) => {
              const isCurrent = t.projectId === currentProjectId
              return (
                <button
                  key={t.projectId}
                  onClick={() => handlePick(t.projectId)}
                  disabled={loadingId !== null}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 disabled:opacity-50 ${
                    isCurrent
                      ? 'border-[#22D3EE]/60 bg-[#22D3EE]/10'
                      : 'border-white/5 bg-[#1C1C27] hover:border-[#7C5CFC]/40 hover:bg-[#252535]'
                  }`}
                >
                  <div className="w-14 h-14 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    <Film className="w-6 h-6 text-[#7C5CFC]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{t.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#9494A8]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#22D3EE]" />
                        {fmtDuration(t.record.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#9494A8]" />
                        {fmtDate(t.record.savedAt)}
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[9px] font-bold text-[#22D3EE] bg-[#22D3EE]/15 px-1.5 py-0.5 rounded">
                      ATUAL
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        <DialogFooter className="p-4 border-t border-white/5">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-[#9494A8]">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OpenTakeModal
