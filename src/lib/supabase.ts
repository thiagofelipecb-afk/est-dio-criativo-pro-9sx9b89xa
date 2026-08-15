import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Indica se as variáveis de ambiente do Supabase estão configuradas.
 */
export const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Cliente Supabase compartilhado.
 * Será `null` quando as variáveis de ambiente não estiverem configuradas,
 * permitindo que o app funcione em modo offline/localStorage sem quebrar.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : (() => {
      console.warn(
        '[LUMEN Studio] Supabase não configurado: variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes. ' +
          'O app continuará funcionando em modo offline (localStorage).',
      )
      return null
    })()

/**
 * Retorna o cliente Supabase ativo ou lança um erro amigável (pt-BR)
 * caso não esteja configurado. Use em pontos do código que dependam
 * de uma conexão ativa com o backend.
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu arquivo .env para habilitar a sincronização com a nuvem.',
    )
  }
  return supabase
}
