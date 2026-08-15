import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Resultado da verificação de conexão com o Supabase.
 */
export interface SupabaseConnectionResult {
  ok: boolean
  message: string
  error?: string
}

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

/**
 * Verifica se a conexão com o Supabase está realmente ativa, executando
 * uma consulta simples (`SELECT 1`). Retorna um resultado estruturado em
 * português, sem lançar — para que o app possa degradar graciosamente.
 *
 * No navegador (cliente Supabase JS), não há método `.raw()` direto para
 * SQL arbitrário, então usamos `.rpc`-free fallback: tentamos `.from()`
 * com um limite 0 sobre uma tabela do sistema via `supabase` e, se isso
 * falhar por qualquer motivo de rede/auth, reportamos o erro exato.
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionResult> {
  if (!isSupabaseConfigured() || !supabase) {
    const msg =
      'Supabase não configurado: variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes.'
    console.warn('[LUMEN Studio]', msg)
    return { ok: false, message: msg, error: 'ENV_MISSING' }
  }

  try {
    // Consulta simples e barata: lê 1 linha de uma tabela do catálogo.
    // Usamos `pg_catalog`-estilo via `.from()` com `head: true` para não
    // depender de nenhuma tabela de negócio existir ainda.
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })

    // `error` pode ser PGRST205 (schema não carregado) ou 42P01 (tabela
    // ainda não existe) — em ambos os casos a CONEXÃO está ativa; apenas
    // o schema ainda não foi criado. Consideramos conexão OK nesses casos.
    if (error) {
      const code = (error as { code?: string }).code
      // Códigos que indicam "conectou, mas a tabela/schema ainda não existe"
      const connectionOkCodes = [
        '42P01', // undefined_table
        'PGRST205', // schema does not exist
        'PGRST204', // schema cache miss
        'PGRST301', // relation não encontrada
      ]
      if (code && connectionOkCodes.includes(code)) {
        const msg = '✅ Supabase conectado! (schema ainda não criado)'
        console.log('[LUMEN Studio]', msg)
        return { ok: true, message: msg }
      }
      // Outros erros (auth, rede, etc.) — conexão efetivamente falhou
      const msg = `Falha ao conectar com Supabase: ${error.message} (código ${code || 'desconhecido'})`
      console.error('[LUMEN Studio]', msg, error)
      return { ok: false, message: msg, error: code || 'REQUEST_ERROR' }
    }

    const msg = '✅ Supabase conectado!'
    console.log('[LUMEN Studio]', msg)
    return { ok: true, message: msg }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    const msg = `Erro inesperado ao conectar com Supabase: ${err.message}`
    console.error('[LUMEN Studio]', msg, err)
    return { ok: false, message: msg, error: err.message }
  }
}
