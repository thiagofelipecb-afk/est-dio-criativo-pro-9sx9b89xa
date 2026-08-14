import { usePlatform } from '@/context/PlatformContext'
import { BrandProfile, ResearchAnswer, InterviewAnswer } from '@/types/platform'

// Payload montado para a Edge Function generate-brand-os.
// Estrutura preparada para futura integração: basta trocar a chamada simulada
// por `supabase.functions.invoke('generate-brand-os', { body: payload })`.
export interface BrandOSPayload {
  kind: 'brand-os'
  contextVersion: number
  base: BrandProfile['base']
  research: ResearchAnswer[]
  interview: InterviewAnswer[]
  assetTypes: string[]
}

// Hook utilitário para simular geração de IA com feedback de progresso
// e registrar job/versionamento conforme especificação.
export function useAIGeneration() {
  const { createJob, completeJob, failJob, brandProfile } = usePlatform()

  const generate = async (
    kind: string,
    onProgress: (pct: number, label: string) => void,
    minMs = 1400,
  ) => {
    const clientRequestId = `${kind}-${Date.now()}`
    const job = createJob(kind, clientRequestId)
    onProgress(15, 'Carregando contexto do Brand OS…')
    await wait(minMs / 4)
    onProgress(45, 'Montando prompt versionado…')
    await wait(minMs / 4)
    onProgress(75, 'Gerando ativos com IA…')
    await wait(minMs / 4)
    onProgress(100, 'Concluído')
    const durationMs = minMs
    completeJob(job.id, durationMs)
    return { jobId: job.id, durationMs, contextVersion: brandProfile.activeVersion }
  }

  // Geração específica do Brand OS — monta o payload completo das 3 abas
  // e simula a chamada à Edge Function generate-brand-os. Quando o Supabase
  // for conectado, substituir o corpo desta função por:
  //   const { data, error } = await supabase.functions.invoke('generate-brand-os', { body: payload })
  const generateBrandOS = async (
    onProgress: (pct: number, label: string) => void,
    minMs = 2200,
  ): Promise<{ jobId: string; durationMs: number; contextVersion: number; failed: boolean }> => {
    const payload: BrandOSPayload = {
      kind: 'brand-os',
      contextVersion: brandProfile.activeVersion,
      base: brandProfile.base,
      research: brandProfile.research,
      interview: brandProfile.interview,
      assetTypes: [
        'posicionamento',
        'promessa',
        'arquetipo',
        'inimigo_narrativo',
        'tom_de_voz',
        'vocabulario',
        'storytelling',
        'stack_de_prova',
        'identidade_visual',
        'pilares_de_conteudo',
        'linha_editorial',
        'bio_taglines',
        'oferta_principal',
      ],
    }

    const clientRequestId = `brand-os-${Date.now()}`
    const job = createJob('brand-os', clientRequestId)

    try {
      onProgress(10, 'Enfileirando job de Brand OS…')
      await wait(minMs / 6)
      onProgress(30, 'Enviando payload para generate-brand-os…')
      await wait(minMs / 6)
      onProgress(55, 'Gerando 13 ativos de marca…')
      await wait(minMs / 6)
      onProgress(80, 'Versionando snapshot do BrandProfile…')
      await wait(minMs / 6)
      onProgress(100, 'Concluído')
      const durationMs = minMs
      completeJob(job.id, durationMs)
      // payload seria enviado à edge function aqui — mantido para referência
      void payload
      return {
        jobId: job.id,
        durationMs,
        contextVersion: brandProfile.activeVersion,
        failed: false,
      }
    } catch (err) {
      failJob(job.id, err instanceof Error ? err.message : 'Falha na geração do Brand OS')
      return {
        jobId: job.id,
        durationMs: 0,
        contextVersion: brandProfile.activeVersion,
        failed: true,
      }
    }
  }

  return { generate, generateBrandOS }
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
