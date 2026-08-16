/* ===========================================================================
   LUMEN Studio — Máquina de Estados do Modo Estúdio (FASE 6)
   Hook com useReducer que controla as transições de StudioMode e expõe
   utilitários de validação (allowedActions / blockedMessage / modeLabel).
   Camada ADICIONAL de validação — não substitui a lógica existente.
   =========================================================================== */

import { useReducer, useCallback, useMemo } from 'react'
import type { StudioMode } from '@/types/studio'

/** Ações permitidas em cada estado (strings livres para extensibilidade). */
export type StudioAction =
  | 'startCamera'
  | 'configureScript'
  | 'configureAudio'
  | 'configureBackground'
  | 'configureTitle'
  | 'toggleLowerPanel'
  | 'startRecording'
  | 'changeDevice'
  | 'toggleFocusMode'
  | 'toggleGuides'
  | 'toggleLayout'
  | 'pauseRecording'
  | 'stopRecording'
  | 'resumeRecording'
  | 'recoverRecording'
  | 'discardRecording'
  | 'retryCamera'
  | 'goToSettings'

/** Mapa estático de ações permitidas por estado. */
const ALLOWED_ACTIONS: Record<StudioMode, readonly StudioAction[]> = {
  prepare: [
    'startCamera',
    'configureScript',
    'configureAudio',
    'configureBackground',
    'configureTitle',
    'toggleLowerPanel',
  ],
  prompter: [
    'startRecording',
    'changeDevice',
    'toggleFocusMode',
    'toggleGuides',
    'toggleLayout',
    'configureScript',
    'configureAudio',
    'configureBackground',
    'configureTitle',
  ],
  recording: ['pauseRecording', 'stopRecording', 'toggleFocusMode'],
  paused: ['resumeRecording', 'stopRecording'],
  processing: [],
  recovering: ['recoverRecording', 'discardRecording'],
  error: ['retryCamera', 'goToSettings'],
}

/** Mensagens pt-BR para ações bloqueadas por estado. */
const BLOCKED_MESSAGES: Record<StudioMode, string> = {
  prepare: 'Inicie a câmera antes de gravar.',
  prompter: 'A câmera precisa estar ativa para esta ação.',
  recording: 'Já existe uma gravação em andamento.',
  paused: 'A gravação está pausada — retome ou pare.',
  processing: 'Aguarde o processamento do vídeo concluir.',
  recovering: 'Decida o que fazer com a gravação interrompida primeiro.',
  error: 'Resolva o erro de câmera antes de continuar.',
}

/** Rótulo amigável (pt-BR), para badge no canvas. */
const MODE_LABELS: Record<StudioMode, string> = {
  prepare: 'Preparando',
  prompter: 'Câmera Pronta',
  recording: 'Gravando',
  paused: 'Pausado',
  processing: 'Processando',
  recovering: 'Recuperando',
  error: 'Erro',
}

/**
 * Tabela de transições válidas: origem → conjunto de destinos permitidos.
 * Qualquer transição fora desta tabela é rejeitada (modo imutável/seguro).
 */
const TRANSITIONS: Record<StudioMode, readonly StudioMode[]> = {
  prepare: ['prompter', 'error', 'recovering'],
  prompter: ['recording', 'error'],
  recording: ['paused', 'processing', 'error'],
  paused: ['recording', 'processing'],
  processing: ['prompter', 'error'],
  recovering: ['prompter', 'processing'],
  error: ['prepare'],
}

/* ── Reducer ─────────────────────────────────────────────────────────────── */

type ModeState = { mode: StudioMode }

type ModeAction = { type: 'TRANSITION'; to: StudioMode } | { type: 'RESET' }

function modeReducer(state: ModeState, action: ModeAction): ModeState {
  switch (action.type) {
    case 'TRANSITION': {
      const allowed = TRANSITIONS[state.mode]
      if (!allowed.includes(action.to)) {
        // Transição inválida: mantém o estado atual (fail-safe).
        return state
      }
      return { mode: action.to }
    }
    case 'RESET':
      return { mode: 'prepare' }
    default:
      return state
  }
}

/* ── Funções puras exportadas (para testes e reuso) ───────────────────────── */

/** Retorna o conjunto de ações permitidas no estado informado. */
export function allowedActions(mode: StudioMode): Set<StudioAction> {
  return new Set(ALLOWED_ACTIONS[mode])
}

/** Retorna a mensagem de bloqueio se a ação não for permitida, ou null. */
export function blockedMessage(mode: StudioMode, action: string): string | null {
  if (ALLOWED_ACTIONS[mode].includes(action as StudioAction)) return null
  return BLOCKED_MESSAGES[mode]
}

/** Retorna o rótulo amigável (pt-BR) do estado. */
export function modeLabel(mode: StudioMode): string {
  return MODE_LABELS[mode]
}

/* ── Hook principal ───────────────────────────────────────────────────────── */

export interface UseStudioModeReturn {
  mode: StudioMode
  /** Tenta transitar para `to`; rejeita silenciosamente se inválida. */
  transition: (to: StudioMode) => void
  /** Reinicia para 'prepare' (ex.: ao fechar modal de erro). */
  reset: () => void
  /** Conjunto de ações permitidas no estado atual. */
  allowedActions: Set<StudioAction>
  /** Retorna true se a ação for permitida no estado atual. */
  isAllowed: (action: string) => boolean
  /** Rótulo amigável do estado atual. */
  label: string
}

export function useStudioMode(): UseStudioModeReturn {
  const [state, dispatch] = useReducer(modeReducer, { mode: 'prepare' } as ModeState)

  const transition = useCallback((to: StudioMode) => {
    dispatch({ type: 'TRANSITION', to })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const allowed = useMemo(() => allowedActions(state.mode), [state.mode])

  const isAllowed = useCallback((action: string) => allowed.has(action as StudioAction), [allowed])

  const label = modeLabel(state.mode)

  return { mode: state.mode, transition, reset, allowedActions: allowed, isAllowed, label }
}
