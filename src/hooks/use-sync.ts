/* =====================================================================
   src/hooks/use-sync.ts
   ---------------------------------------------------------------------
   Hook de sincronização entre localStorage (cache/fallback) e Supabase.

   - Verifica se o Supabase está configurado e conectado.
   - Executa a migração localStorage -> Supabase na primeira montagem.
   - Fornece funções CRUD que escrevem no Supabase e atualizam o
     localStorage como cache de leitura.
   - Degrada graciosamente: se o Supabase não estiver acessível,
     opera apenas em localStorage (o app continua funcionando).

   Não altera PlatformContext nem StudioContext — é uma camada
   adicional opcional, usada por componentes que quiserem persistir
   diretamente no Supabase mantendo o cache local.
   ===================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '@/lib/supabase'
import {
  migrateLocalStorageToSupabase,
  isMigrationDone,
  markMigrationDone,
  type MigrationReport,
} from '@/lib/migration'

export interface SyncState {
  /** Supabase está configurado via env. */
  configured: boolean
  /** Conexão com o Supabase foi verificada e está ativa. */
  connected: boolean
  /** Mensagem amigável sobre o status da conexão. */
  message: string
  /** Migração localStorage -> Supabase já foi executada nesta sessão. */
  migrated: boolean
  /** Migração está em andamento. */
  migrating: boolean
  /** Relatório da última migração. */
  migrationReport: MigrationReport | null
  /** Erro de conexão, se houver. */
  error: string | null
}

export interface SyncActions {
  /** Verifica a conexão com o Supabase. */
  checkConnection: () => Promise<void>
  /** Executa a migração localStorage -> Supabase manualmente. */
  runMigration: () => Promise<MigrationReport>
  /**
   * Upsert genérico: escreve no Supabase e atualiza o localStorage
   * como cache de leitura. Retorna true se escreveu no Supabase.
   */
  upsert: (table: string, row: Record<string, unknown>, cacheKey: string) => Promise<boolean>
  /**
   * Delete genérico: remove do Supabase e do cache local.
   */
  remove: (table: string, id: string, cacheKey: string, idField?: string) => Promise<boolean>
  /**
   * Leitura com fallback: tenta o Supabase; se falhar, lê do localStorage.
   */
  fetch: <T>(table: string, cacheKey: string, fallback: T) => Promise<T>
}

export type UseSyncReturn = SyncState & SyncActions

// Chave de flag para evitar múltiplas execuções concorrentes da migração
const MIGRATING_KEY = 'lumen_supabase_migrating'

export function useSync(): UseSyncReturn {
  const configured = isSupabaseConfigured()
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState(
    configured ? 'Verificando conexão com Supabase…' : 'Supabase não configurado.',
  )
  const [migrated, setMigrated] = useState(isMigrationDone())
  const [migrating, setMigrating] = useState(false)
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  const checkConnection = useCallback(async () => {
    if (!configured) {
      setConnected(false)
      setMessage('Supabase não configurado — modo offline (localStorage).')
      setError(null)
      return
    }
    const res = await checkSupabaseConnection()
    setConnected(res.ok)
    setMessage(res.message)
    setError(res.ok ? null : res.error || null)
    if (res.ok) {
      toast.success('✅ Supabase conectado!')
    } else if (res.error !== 'ENV_MISSING') {
      // Não incomoda o usuário com toast se for apenas falta de env.
      toast.error('Falha ao conectar com Supabase. Modo offline ativado.')
    }
  }, [configured])

  const runMigration = useCallback(async (): Promise<MigrationReport> => {
    if (!configured || !supabase) {
      const empty: MigrationReport = {
        ok: false,
        workspaceId: null,
        tables: [],
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      }
      return empty
    }
    // Evita concorrência (outra aba/sessão executando)
    if (sessionStorage.getItem(MIGRATING_KEY)) {
      return (
        migrationReport || {
          ok: false,
          workspaceId: null,
          tables: [],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        }
      )
    }
    sessionStorage.setItem(MIGRATING_KEY, '1')
    setMigrating(true)
    try {
      const report = await migrateLocalStorageToSupabase()
      setMigrationReport(report)
      setMigrated(true)
      markMigrationDone(report)
      if (report.ok) {
        toast.success('Migração de dados concluída com sucesso!')
      } else {
        toast.warning('Migração parcial: algumas tabelas não foram sincronizadas.')
      }
      return report
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[useSync] migração falhou:', msg)
      toast.error('Erro na migração: ' + msg)
      const report: MigrationReport = {
        ok: false,
        workspaceId: null,
        tables: [],
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      }
      return report
    } finally {
      setMigrating(false)
      sessionStorage.removeItem(MIGRATING_KEY)
    }
  }, [configured, migrationReport])

  // Inicialização: verifica conexão e executa migração na primeira carga.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void (async () => {
      await checkConnection()
      // Se conectado e ainda não migrou, executa automaticamente.
      if (configured && !isMigrationDone()) {
        await runMigration()
      }
    })()
  }, [checkConnection, configured, runMigration])

  // ---- CRUD genérico -------------------------------------------------

  const upsert = useCallback(
    async (table: string, row: Record<string, unknown>, cacheKey: string): Promise<boolean> => {
      // 1) Atualiza cache local (sempre — fallback offline)
      try {
        const raw = localStorage.getItem(cacheKey)
        const arr: Record<string, unknown>[] = raw ? JSON.parse(raw) : []
        const idField = 'id'
        const idx = arr.findIndex((x) => x[idField] === row[idField])
        if (idx >= 0) arr[idx] = { ...arr[idx], ...row }
        else arr.unshift(row)
        localStorage.setItem(cacheKey, JSON.stringify(arr))
      } catch {
        /* ignore cache errors */
      }

      // 2) Tenta escrever no Supabase
      if (!configured || !supabase) return false
      try {
        const { error: err } = await supabase.from(table).upsert(row, { onConflict: 'id' })
        if (err) {
          console.warn(`[useSync] upsert ${table} falhou:`, err.message)
          return false
        }
        return true
      } catch (e) {
        console.warn(`[useSync] upsert ${table} exceção:`, e)
        return false
      }
    },
    [configured],
  )

  const remove = useCallback(
    async (table: string, id: string, cacheKey: string, idField = 'id'): Promise<boolean> => {
      // 1) Remove do cache local
      try {
        const raw = localStorage.getItem(cacheKey)
        const arr: Record<string, unknown>[] = raw ? JSON.parse(raw) : []
        const next = arr.filter((x) => x[idField] !== id)
        localStorage.setItem(cacheKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }

      // 2) Tenta remover do Supabase
      if (!configured || !supabase) return false
      try {
        const { error: err } = await supabase.from(table).delete().eq(idField, id)
        if (err) {
          console.warn(`[useSync] delete ${table} falhou:`, err.message)
          return false
        }
        return true
      } catch (e) {
        console.warn(`[useSync] delete ${table} exceção:`, e)
        return false
      }
    },
    [configured],
  )

  const fetch = useCallback(
    async <T>(table: string, cacheKey: string, fallback: T): Promise<T> => {
      // Tenta Supabase primeiro
      if (configured && supabase) {
        try {
          const { data, error: err } = await supabase.from(table).select('*')
          if (!err && data) {
            // Atualiza cache local
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data))
            } catch {
              /* ignore */
            }
            return data as T
          }
        } catch {
          /* cai para fallback */
        }
      }
      // Fallback: lê do localStorage
      try {
        const raw = localStorage.getItem(cacheKey)
        return raw ? (JSON.parse(raw) as T) : fallback
      } catch {
        return fallback
      }
    },
    [configured],
  )

  return {
    configured,
    connected,
    message,
    migrated,
    migrating,
    migrationReport,
    error,
    checkConnection,
    runMigration,
    upsert,
    remove,
    fetch,
  }
}

export default useSync
