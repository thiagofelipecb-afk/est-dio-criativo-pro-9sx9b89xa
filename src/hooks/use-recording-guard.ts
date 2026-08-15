import { useBlocker } from 'react-router-dom'

/**
 * CORREÇÃO 3 — Bloqueia navegação interna (cliques na sidebar) durante a
 * gravação ou processamento do take. O `beforeunload` já protege contra
 * fechar a aba; este hook protege contra trocar de rota dentro do SPA.
 *
 * Retorna o blocker do react-router v7 quando `isRecording || isProcessing`
 * é verdadeiro. O consumidor renderiza um dialog LUMEN quando
 * `blocker.state === 'blocked'`.
 *
 * O callback `onStopAndProceed` deve finalizar a gravação (salvar chunks) e
 * então chamar `blocker.proceed()`.
 */
export function useRecordingGuard(
  isRecording: boolean,
  isProcessing: boolean,
  _onStopAndProceed?: () => void,
) {
  const shouldBlock = isRecording || isProcessing
  const blocker = useBlocker(shouldBlock)
  return blocker
}
