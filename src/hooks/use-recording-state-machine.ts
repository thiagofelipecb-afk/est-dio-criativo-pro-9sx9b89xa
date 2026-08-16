/* =============================================================================
   LUMEN Studio — Máquina de Estados de Gravação (Módulo 5)
   --------------------------------------------------------------------------
   Hook que encapsula TODA a lógica de transições de `RecordingState`. É a
   ÚNICA forma de mutar o estado de gravação — componente algum deve setar o
   estado diretamente. As transições são validadas contra a tabela
   `RECORDING_TRANSITIONS` (studio-recording-logic); transições ilegais são
   rejeitadas silenciosamente (fail-safe).

   Responsabilidades:
   - Guardar `RecordingState` e expor `transition(to)`.
   - Registrar `beforeunload` quando a gravação está ativa (recording/paused).
   - Guardar mensagem de erro e nome do último take (para toasts/UI).
   - Expor `dismissError` (error → idle) e `reset` (qualquer estado → idle).
   - Expor `canRecord` (guarda: stream válido + sem gravador ativo).
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type RecordingState,
  canTransition,
  isActivelyRecording,
} from '@/lib/studio-recording-logic'

export interface UseRecordingStateMachineReturn {
  /** Estado atual da máquina. */
  state: RecordingState
  /** Tenta transitar para `to`. Rejeita silenciosamente se inválida. */
  transition: (to: RecordingState) => boolean
  /** Força o estado para `to` SEM validar a tabela (uso interno da Gravadora
   *  para espelhar eventos do MediaRecorder — onstop → processing, etc.). */
  forceState: (to: RecordingState) => void
  /** Descarta o erro e volta para idle (error → idle). */
  dismissError: () => void
  /** Reinicia para idle a partir de qualquer estado. */
  reset: () => void
  /** Mensagem de erro (quando state === 'error'). */
  errorMessage: string | undefined
  /** Define a mensagem de erro (usada pela Gravadora ao capturar falhas). */
  setErrorMessage: (msg: string | undefined) => void
  /** Nome do último take salvo (para toast/confirmação). */
  lastTakeName: string | undefined
  /** Define o nome do último take. */
  setLastTakeName: (name: string | undefined) => void
  /** True quando a gravação está ativa (recording/paused/countdown/stopping/processing). */
  isActive: boolean
  /** True quando há um gravador ativo (impede dois gravadores simultâneos). */
  recorderActive: boolean
  /** Marca/desmarca a flag de gravador ativo (guarda contra duplicação). */
  setRecorderActive: (v: boolean) => void
}

export function useRecordingStateMachine(): UseRecordingStateMachineReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [lastTakeName, setLastTakeName] = useState<string | undefined>(undefined)
  const [recorderActive, setRecorderActive] = useState(false)

  // Ref espelhada para o handler de beforeunload não depender de re-render.
  const stateRef = useRef(state)
  stateRef.current = state

  /** Transição validada pela tabela. Retorna false se rejeitada. */
  const transition = useCallback((to: RecordingState): boolean => {
    let ok = false
    setState((prev) => {
      if (!canTransition(prev, to)) {
        ok = false
        return prev
      }
      ok = true
      return to
    })
    return ok
  }, [])

  /** Força o estado sem validar (uso interno controlado da Gravadora). */
  const forceState = useCallback((to: RecordingState) => {
    setState(to)
  }, [])

  const dismissError = useCallback(() => {
    setState((prev) => (prev === 'error' ? 'idle' : prev))
    setErrorMessage(undefined)
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setErrorMessage(undefined)
    setLastTakeName(undefined)
    setRecorderActive(false)
  }, [])

  // beforeunload: só bloqueia fechamento durante gravação ativa (recording/paused).
  useEffect(() => {
    const active = isActivelyRecording(state)
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state])

  return {
    state,
    transition,
    forceState,
    dismissError,
    reset,
    errorMessage,
    setErrorMessage,
    lastTakeName,
    setLastTakeName,
    isActive: isActivelyRecording(state),
    recorderActive,
    setRecorderActive,
  }
}

export default useRecordingStateMachine
