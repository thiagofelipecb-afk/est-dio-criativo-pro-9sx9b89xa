/* ===========================================================================
   LUMEN Studio — PROMPT 2 — Hook reativo sobre o mediaService canônico
   --------------------------------------------------------------------------
   Única fonte de verdade reativa para mídias. Qualquer tela que precise listar
   ou manipular mídias (Midias, Biblioteca, Gravadora, Editor) deve usar este
   hook. Persiste em `lumen_media_assets` (via mediaService).

   Sincroniza múltiplas instâncias via evento `storage` + um evento custom
   `lumen-media-assets-changed` disparado a cada mutação local.
   =========================================================================== */

import { useCallback, useEffect, useState } from 'react'
import type { MediaAsset } from '@/types/studio'
import {
  MEDIA_ASSETS_KEY,
  addMediaFromFile,
  deleteAsset,
  loadAssets,
  saveAsset,
  updateAsset,
} from '@/services/mediaService'

/** Evento custom para sincronização entre abas/instâncias na mesma janela. */
export const MEDIA_ASSETS_EVENT = 'lumen-media-assets-changed'

function notifyChange() {
  try {
    window.dispatchEvent(new CustomEvent(MEDIA_ASSETS_EVENT))
  } catch {
    /* noop */
  }
}

export interface UseMediaAssetsResult {
  assets: MediaAsset[]
  loading: boolean
  error: string | null
  addAsset: (asset: MediaAsset) => MediaAsset
  removeAsset: (id: string) => void
  update: (id: string, updates: Partial<MediaAsset>) => MediaAsset | null
  addFromFile: (
    file: File,
    opts?: { workspaceId?: string; projectId?: string; source?: MediaAsset['source'] },
  ) => Promise<MediaAsset>
  refresh: () => void
}

export function useMediaAssets(): UseMediaAssetsResult {
  const [assets, setAssets] = useState<MediaAsset[]>(() => loadAssets())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setAssets(loadAssets())
  }, [])

  // Sincroniza com mudanças em outras abas (storage event) e nesta janela
  // (evento custom disparado pelas mutações abaixo).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MEDIA_ASSETS_KEY) refresh()
    }
    const onCustom = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener(MEDIA_ASSETS_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(MEDIA_ASSETS_EVENT, onCustom)
    }
  }, [refresh])

  const addAsset = useCallback((asset: MediaAsset): MediaAsset => {
    const saved = saveAsset(asset)
    notifyChange()
    return saved
  }, [])

  const removeAsset = useCallback((id: string) => {
    deleteAsset(id)
    notifyChange()
  }, [])

  const update = useCallback((id: string, updates: Partial<MediaAsset>): MediaAsset | null => {
    const updated = updateAsset(id, updates)
    notifyChange()
    return updated
  }, [])

  const addFromFile = useCallback(
    async (
      file: File,
      opts?: { workspaceId?: string; projectId?: string; source?: MediaAsset['source'] },
    ): Promise<MediaAsset> => {
      setLoading(true)
      setError(null)
      try {
        const asset = await addMediaFromFile(file, opts)
        notifyChange()
        return asset
      } catch (e: any) {
        const msg = e?.message || 'Falha ao adicionar mídia.'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { assets, loading, error, addAsset, removeAsset, update, addFromFile, refresh }
}
