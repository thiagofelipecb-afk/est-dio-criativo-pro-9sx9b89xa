import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, FileJson, Video, AlertCircle, CheckCircle2, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { RecoveryManifest, RecordingTake } from '@/types/studio'

export interface ImportTakeProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Callback quando a importação é validada com sucesso.
   * Entrega o Take de gravação completo com seu vídeo, miniatura e manifesto.
   */
  onImportSuccess: (take: RecordingTake, videoFile: File, manifest: RecoveryManifest) => void
}

export function ImportTake({ isOpen, onClose, onImportSuccess }: ImportTakeProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [manifestData, setManifestJsonData] = useState<RecoveryManifest | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('O arquivo selecionado não é um vídeo válido.')
      return
    }
    setVideoFile(file)
    setValidationError(null)
  }

  const handleJsonSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text) as RecoveryManifest
      // Validação do schema mínimo do manifesto
      if (!json || typeof json !== 'object' || !json.schemaVersion) {
        setValidationError('O arquivo JSON não é um manifesto de recuperação LUMEN Studio válido.')
        setJsonFile(null)
        setManifestJsonData(null)
        return
      }
      setJsonFile(file)
      setManifestJsonData(json)
      setValidationError(null)
    } catch {
      setValidationError('Formato JSON inválido no arquivo de manifesto.')
      setJsonFile(null)
      setManifestJsonData(null)
    }
  }

  const handleProcessImport = async () => {
    if (!videoFile || !manifestData) {
      toast.warning('Selecione tanto o arquivo de vídeo (.webm/.mp4) quanto o manifesto (.json).')
      return
    }

    setIsValidating(true)
    try {
      // 1. Cria Object URL para o arquivo de vídeo importado
      const videoUrl = URL.createObjectURL(videoFile)

      // 2. Extrai ou calcula parâmetros
      const duration = manifestData.durationMs ? manifestData.durationMs / 1000 : 10
      const minutes = Math.floor(duration / 60)
      const seconds = Math.floor(duration % 60)
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

      const takeId = manifestData.takeId || `imported-${Date.now()}`

      const importedTake: RecordingTake = {
        id: takeId,
        url: videoUrl,
        duration,
        timeString,
        createdAt: manifestData.createdAt
          ? new Date(manifestData.createdAt).toISOString()
          : new Date().toISOString(),
        timestamp: manifestData.createdAt || Date.now(),
        mimeType: manifestData.mimeType || videoFile.type || 'video/webm',
        resolution: manifestData.resolution,
        warnings: manifestData.warnings || [],
        thumbnail: manifestData.thumbnail || null,
        recoveryManifest: manifestData,
      }

      toast.success('Pacote do take importado e validado com sucesso!')
      onImportSuccess(importedTake, videoFile, manifestData)
      resetAndClose()
    } catch (err) {
      console.error('[ImportTake] Erro ao restaurar take:', err)
      toast.error('Falha ao processar o pacote de importação.')
    } finally {
      setIsValidating(false)
    }
  }

  const resetAndClose = () => {
    setVideoFile(null)
    setJsonFile(null)
    setManifestJsonData(null)
    setValidationError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-md bg-[#14141C] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
            <PackageCheck className="w-5 h-5 text-[#7C5CFC]" /> Importar Pacote de Gravação
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9494A8]">
            Selecione o par de arquivos (Vídeo + Manifesto JSON) exportado do LUMEN Studio para
            restaurar a sessão no estúdio/editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor de Vídeo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9494A8] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#22D3EE]" /> Vídeo Bruto (.webm / .mp4)
              </span>
              {videoFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </label>
            <div className="relative">
              <input
                type="file"
                accept="video/webm,video/mp4,video/*"
                onChange={handleVideoSelect}
                className="hidden"
                id="take-video-input"
              />
              <label
                htmlFor="take-video-input"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                  videoFile
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                    : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:border-white/20'
                }`}
              >
                <span className="truncate max-w-[240px]">
                  {videoFile ? videoFile.name : 'Clique para selecionar o arquivo de vídeo...'}
                </span>
                <Upload className="w-4 h-4 shrink-0 text-[#7C5CFC]" />
              </label>
            </div>
          </div>

          {/* Seletor de Manifesto JSON */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9494A8] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-amber-400" /> Manifesto de Recuperação (.json)
              </span>
              {jsonFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </label>
            <div className="relative">
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleJsonSelect}
                className="hidden"
                id="take-json-input"
              />
              <label
                htmlFor="take-json-input"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                  jsonFile
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                    : 'border-white/10 bg-[#1C1C27] text-[#9494A8] hover:border-white/20'
                }`}
              >
                <span className="truncate max-w-[240px]">
                  {jsonFile ? jsonFile.name : 'Clique para selecionar o arquivo JSON...'}
                </span>
                <Upload className="w-4 h-4 shrink-0 text-amber-400" />
              </label>
            </div>
          </div>

          {/* Banner de erro de validação */}
          {validationError && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Detalhes do Manifesto Validado */}
          {manifestData && !validationError && (
            <div className="p-3 rounded-xl bg-[#1C1C27] border border-white/10 space-y-1.5 text-xs text-[#9494A8]">
              <div className="flex items-center justify-between text-white font-medium">
                <span>Versão do Manifesto:</span>
                <span className="font-mono text-[#7C5CFC]">v{manifestData.schemaVersion}</span>
              </div>
              {manifestData.layout && (
                <div className="flex items-center justify-between">
                  <span>Layout do Palco:</span>
                  <span className="text-white capitalize">{manifestData.layout}</span>
                </div>
              )}
              {manifestData.durationMs && (
                <div className="flex items-center justify-between">
                  <span>Duração Estimada:</span>
                  <span className="text-white">{(manifestData.durationMs / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAndClose}
            className="text-xs text-[#9494A8] hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleProcessImport}
            disabled={!videoFile || !manifestData || !!validationError || isValidating}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold px-4"
          >
            {isValidating ? 'Processando...' : 'Restaurar Take'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportTake
