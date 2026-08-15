import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '@/lib/supabase'
import { migrateLocalStorageToSupabase, isMigrationDone, markMigrationDone } from '@/lib/migration'

interface SupabaseContextValue {
  supabase: SupabaseClient | null
  isConfigured: boolean
  /** Conexão verificada e ativa. */
  isConnected: boolean
  /** Mensagem de status amigável. */
  statusMessage: string
  /** Migração localStorage -> Supabase já foi executada. */
  migrated: boolean
}

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  isConfigured: false,
  isConnected: false,
  statusMessage: 'Supabase não configurado.',
  migrated: false,
})

interface SupabaseProviderProps {
  children: ReactNode
}

/**
 * Provider de passagem: disponibiliza o cliente Supabase (ou null) via
 * contexto. Quando configurado, verifica a conexão na primeira carga e
 * executa a migração localStorage -> Supabase uma única vez (idempotente).
 *
 * Não altera o fluxo de renderização — quando o Supabase não está
 * configurado, o app segue em modo offline/localStorage normalmente.
 */
export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const configured = isSupabaseConfigured()
  const [isConnected, setIsConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    configured ? 'Verificando conexão com Supabase…' : 'Supabase não configurado.',
  )
  const [migrated, setMigrated] = useState(isMigrationDone())

  // PASSO 1 — Verificar conexão na primeira carga.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!configured) {
        return
      }
      const res = await checkSupabaseConnection()
      if (cancelled) return
      setIsConnected(res.ok)
      setStatusMessage(res.message)
      if (!res.ok && res.error !== 'ENV_MISSING') {
        // Reporta o erro exato no console; o app continua em modo offline.
        console.error('[LUMEN Studio] Conexão Supabase falhou:', res.message)
      }

      // PASSO 5/6 — Executa a migração automaticamente na primeira carga
      // com Supabase conectado (e ainda não migrado nesta máquina).
      if (res.ok && !isMigrationDone() && supabase) {
        try {
          const report = await migrateLocalStorageToSupabase()
          if (cancelled) return
          setMigrated(true)
          markMigrationDone(report)
          if (report.ok) {
            console.log('[LUMEN Studio] ✅ Migração localStorage -> Supabase concluída.')
          } else {
            console.warn(
              '[LUMEN Studio] Migração parcial — tabelas com erro:',
              report.tables.filter((t) => !t.ok),
            )
          }
        } catch (e) {
          console.error('[LUMEN Studio] Migração falhou:', e)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [configured])

  const value: SupabaseContextValue = {
    supabase,
    isConfigured: configured,
    isConnected,
    statusMessage,
    migrated,
  }

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

/**
 * Hook para acessar o contexto do Supabase.
 * Retorna `{ supabase, isConfigured, isConnected, statusMessage, migrated }`.
 */
export const useSupabase = (): SupabaseContextValue => {
  return useContext(SupabaseContext)
}

export default SupabaseProvider
