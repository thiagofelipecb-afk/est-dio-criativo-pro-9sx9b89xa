import { usePlatform } from '@/context/PlatformContext'

// Hook utilitário para simular geração de IA com feedback de progresso
// e registrar job/versionamento conforme especificação.
export function useAIGeneration() {
  const { createJob, completeJob, brandProfile } = usePlatform()

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

  return { generate }
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
