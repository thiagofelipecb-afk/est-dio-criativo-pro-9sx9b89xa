import { createContext, useContext, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface SupabaseContextValue {
  supabase: SupabaseClient | null
  isConfigured: boolean
}

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  isConfigured: false,
})

interface SupabaseProviderProps {
  children: ReactNode
}

/**
 * Provider de passagem: apenas disponibiliza o cliente Supabase (ou null)
 * via contexto. Não altera o fluxo de renderização — quando o Supabase não
 * está configurado, o app segue em modo offline/localStorage normalmente.
 */
export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const value: SupabaseContextValue = {
    supabase,
    isConfigured: isSupabaseConfigured(),
  }

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

/**
 * Hook para acessar o contexto do Supabase.
 * Retorna `{ supabase: SupabaseClient | null, isConfigured: boolean }`.
 */
export const useSupabase = (): SupabaseContextValue => {
  return useContext(SupabaseContext)
}

export default SupabaseProvider
