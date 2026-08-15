import { supabase as supabaseClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * LUMEN Studio — ponto de acesso ÚNICO ao cliente Supabase.
 *
 * FASE 4B — Centralização: existe apenast uma instância de `createClient`
 * (em `@/lib/supabase/client`). Este módulo reexporta esse singleton e
 * mantém os helpers de verificação de conexão usados pelo app. Nenhum
 * outro arquivo do projeto deve chamar `createClient` diretamente.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined

/** Resultado da verificação de conexão com o Supabase. */
export interface SupabaseConnectionResult {
  ok: boolean
  message: string
}

/** Indica se as variáveis de ambiente do Supabase estão configuradas. */
export const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Cliente Supabase compartilhado (singleton de `@/lib/supabase/client`).
 * Nunca é null — se as variáveis de ambiente estiverem ausentes, o cliente
 * scaffoldado ainda existirá, mas as chamadas de rede falharão graciosamente.
 */
export const supabase: SupabaseClient = supabaseClient

/** Retorna o cliente Supabase ativo. */
export const getSupabase = (): SupabaseClient => supabaseClient

/** Verifica se a conexão com o Supabase está realmente ativa. */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        'Supabase não configurado: variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes.',
    }
  }
  try {
    const { error, count } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    if (error) {
      // 42P01 = relation does not exist (schema ainda não migrado)
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { ok: true, message: '✅ Supabase conectado! (schema ainda não criado)' }
      }
      const code = (error as { code?: string }).code
      return {
        ok: false,
        message: `Falha ao conectar com Supabase: ${error.message} (código ${code || 'desconhecido'})`,
      }
    }
    if (typeof count === 'number') {
      return { ok: true, message: '✅ Supabase conectado!' }
    }
    return { ok: true, message: '✅ Supabase conectado!' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `Erro inesperado ao conectar com Supabase: ${msg}` }
  }
}
