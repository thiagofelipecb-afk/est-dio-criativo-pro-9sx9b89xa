/* =============================================================================
   Testes da Máquina de Estados do Modo Estúdio (FASE 6)
   Validam useStudioMode: estado inicial, transições, bloqueio de ações e o
   ciclo completo RECORDING → PAUSED → RECORDING → PROCESSING → PROMPTER.
   ============================================================================= */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStudioMode, allowedActions, blockedMessage, modeLabel } from '@/hooks/use-studio-mode'
import type { StudioMode } from '@/types/studio'

describe('useStudioMode — funções puras', () => {
  it('modeLabel retorna rótulo amigável em pt-BR', () => {
    expect(modeLabel('prepare')).toBe('Preparando')
    expect(modeLabel('recording')).toBe('Gravando')
    expect(modeLabel('paused')).toBe('Pausado')
    expect(modeLabel('processing')).toBe('Processando')
    expect(modeLabel('prompter')).toBe('Câmera Pronta')
    expect(modeLabel('recovering')).toBe('Recuperando')
    expect(modeLabel('error')).toBe('Erro')
  })

  it('allowedActions retorna o conjunto correto por estado', () => {
    expect(allowedActions('prepare').has('startCamera')).toBe(true)
    expect(allowedActions('prepare').has('startRecording')).toBe(false)

    expect(allowedActions('prompter').has('startRecording')).toBe(true)
    expect(allowedActions('prompter').has('pauseRecording')).toBe(false)

    expect(allowedActions('recording').has('pauseRecording')).toBe(true)
    expect(allowedActions('recording').has('stopRecording')).toBe(true)
    expect(allowedActions('recording').has('startRecording')).toBe(false)

    expect(allowedActions('paused').has('resumeRecording')).toBe(true)
    expect(allowedActions('paused').has('stopRecording')).toBe(true)

    expect(allowedActions('processing').size).toBe(0)

    expect(allowedActions('recovering').has('recoverRecording')).toBe(true)
    expect(allowedActions('recovering').has('discardRecording')).toBe(true)

    expect(allowedActions('error').has('retryCamera')).toBe(true)
    expect(allowedActions('error').has('goToSettings')).toBe(true)
  })

  it('blockedMessage retorna null para ação permitida e mensagem para bloqueada', () => {
    expect(blockedMessage('prepare', 'startCamera')).toBeNull()
    expect(blockedMessage('prepare', 'startRecording')).not.toBeNull()
    expect(blockedMessage('processing', 'startRecording')).not.toBeNull()
    expect(blockedMessage('recording', 'pauseRecording')).toBeNull()
  })
})

describe('useStudioMode — hook (useReducer)', () => {
  it('Teste 1: na montagem, modo deve ser "prepare"', () => {
    const { result } = renderHook(() => useStudioMode())
    expect(result.current.mode).toBe('prepare')
  })

  it('Teste 2: após startCamera (transition para prompter), modo deve ser "prompter"', () => {
    const { result } = renderHook(() => useStudioMode())
    act(() => {
      result.current.transition('prompter')
    })
    expect(result.current.mode).toBe('prompter')
  })

  it('Teste 3: tentar gravar em PREPARE → ação bloqueada (isAllowed=false)', () => {
    const { result } = renderHook(() => useStudioMode())
    // Em prepare, startRecording NÃO é permitido.
    expect(result.current.isAllowed('startRecording')).toBe(false)
    // blockedMessage devolve mensagem.
    expect(blockedMessage(result.current.mode, 'startRecording')).not.toBeNull()
  })

  it('Teste 4: ciclo completo RECORDING → PAUSED → RECORDING → PROCESSING → PROMPTER', () => {
    const { result } = renderHook(() => useStudioMode())
    // prepare → prompter (startCamera)
    act(() => result.current.transition('prompter'))
    expect(result.current.mode).toBe('prompter')

    // prompter → recording (Gravar)
    act(() => result.current.transition('recording'))
    expect(result.current.mode).toBe('recording')

    // recording → paused (Pausar)
    act(() => result.current.transition('paused'))
    expect(result.current.mode).toBe('paused')

    // paused → recording (Retomar)
    act(() => result.current.transition('recording'))
    expect(result.current.mode).toBe('recording')

    // recording → processing (Parar)
    act(() => result.current.transition('processing'))
    expect(result.current.mode).toBe('processing')

    // processing → prompter (finalizeTake concluído)
    act(() => result.current.transition('prompter'))
    expect(result.current.mode).toBe('prompter')
  })

  it('Teste 5: PROCESSING não permite nenhuma ação até concluir', () => {
    const { result } = renderHook(() => useStudioMode())
    act(() => result.current.transition('prompter'))
    act(() => result.current.transition('recording'))
    act(() => result.current.transition('processing'))
    expect(result.current.mode).toBe('processing')
    // Nenhuma ação permitida.
    expect(result.current.allowedActions.size).toBe(0)
    expect(result.current.isAllowed('startRecording')).toBe(false)
    expect(result.current.isAllowed('stopRecording')).toBe(false)
    expect(result.current.isAllowed('pauseRecording')).toBe(false)
  })

  it('rejeita transições inválidas (fail-safe: mantém o estado)', () => {
    const { result } = renderHook(() => useStudioMode())
    // prepare → recording é inválido (precisa passar por prompter).
    act(() => result.current.transition('recording'))
    expect(result.current.mode).toBe('prepare')

    // prepare → prompter (válido), então prompter → paused (inválido).
    act(() => result.current.transition('prompter'))
    expect(result.current.mode).toBe('prompter')
    act(() => result.current.transition('paused'))
    expect(result.current.mode).toBe('prompter')
  })

  it('suporta fluxo de recuperação: PREPARE → RECOVERING → PROMPTER/PROCESSING', () => {
    const { result } = renderHook(() => useStudioMode())
    act(() => result.current.transition('recovering'))
    expect(result.current.mode).toBe('recovering')
    expect(result.current.isAllowed('recoverRecording')).toBe(true)
    expect(result.current.isAllowed('discardRecording')).toBe(true)

    // descartar → prompter
    act(() => result.current.transition('prompter'))
    expect(result.current.mode).toBe('prompter')
  })

  it('suporta fluxo de erro: PREPARE → ERROR → PREPARE', () => {
    const { result } = renderHook(() => useStudioMode())
    act(() => result.current.transition('error'))
    expect(result.current.mode).toBe('error')
    expect(result.current.isAllowed('retryCamera')).toBe(true)
    act(() => result.current.transition('prepare'))
    expect(result.current.mode).toBe('prepare')
  })

  it('reset volta para prepare', () => {
    const { result } = renderHook(() => useStudioMode())
    act(() => result.current.transition('prompter'))
    act(() => result.current.reset())
    expect(result.current.mode).toBe('prepare')
  })
})

describe('useStudioMode — exaustão de rótulos', () => {
  const ALL_MODES: StudioMode[] = [
    'prepare',
    'prompter',
    'recording',
    'paused',
    'processing',
    'recovering',
    'error',
  ]
  it('todos os modos têm label não-vazia', () => {
    for (const m of ALL_MODES) {
      expect(modeLabel(m).length).toBeGreaterThan(0)
    }
  })
  it('todos os modos têm conjunto de ações definido (mesmo vazio)', () => {
    for (const m of ALL_MODES) {
      expect(allowedActions(m)).toBeInstanceOf(Set)
    }
  })
})
