/* =============================================================================
   LUMEN Studio — Testes do fluxo de gravação (Módulos 5, 6, 7)
   Cobre:
   - Transições da máquina de estados (idle → ... → saved).
   - Botão Gravar desabilitado em `idle`.
   - beforeunload registrado durante `recording`.
   - Toast aparece em `saved` e `error`.
   - Checklist: câmera/microfone faltando bloqueiam; roteiro faltando só avisa.

   Ambiente: node (vitest.config). O hook useRecordingStateMachine usa
   `window.addEventListener` apenas dentro de useEffect (recording/paused), então
   polyfilla window + BeforeUnloadEvent mínima antes de renderizar o hook.
   ========================================================================== */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, render, screen } from '@testing-library/react'
import {
  RECORDING_TRANSITIONS,
  canTransition,
  dockButtonsEnabled,
  evaluatePreFlight,
  hasBlockingItems,
  isActivelyRecording,
  type RecordingState,
  type PreFlightInput,
} from '@/lib/studio-recording-logic'
import { useRecordingStateMachine } from '@/hooks/use-recording-state-machine'
import { RecordingDock } from '@/components/studio/RecordingDock'
import React from 'react'

/* ---------- Polyfills mínimos de window para o hook (ambiente node) ---------- */
type Listener = (e: any) => void
const listeners: Record<string, Listener[]> = {}

beforeEach(() => {
  Object.keys(listeners).forEach((k) => delete listeners[k])
  if (typeof (globalThis as any).window === 'undefined') {
    ;(globalThis as any).window = {
      addEventListener: (type: string, fn: Listener) => {
        ;(listeners[type] ||= []).push(fn)
      },
      removeEventListener: (type: string, fn: Listener) => {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn)
      },
      dispatchEvent: (e: any) => {
        ;(listeners[e.type] || []).forEach((fn) => fn(e))
      },
    }
  } else {
    ;(globalThis as any).window.addEventListener = (type: string, fn: Listener) => {
      ;(listeners[type] ||= []).push(fn)
    }
    ;(globalThis as any).window.removeEventListener = (type: string, fn: Listener) => {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn)
    }
    ;(globalThis as any).window.dispatchEvent = (e: any) => {
      ;(listeners[e.type] || []).forEach((fn) => fn(e))
    }
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

/* ===========================================================================
   1. Máquina de estados — transições (funções puras)
   ======================================================================== */
describe('RecordingState — transições válidas', () => {
  it('sequência completa idle → requesting-permissions → camera-ready → countdown → recording → paused → recording → stopping → processing → saved', () => {
    const seq: RecordingState[] = [
      'idle',
      'requesting-permissions',
      'camera-ready',
      'countdown',
      'recording',
      'paused',
      'recording',
      'stopping',
      'processing',
      'saved',
    ]
    for (let i = 0; i < seq.length - 1; i++) {
      expect(canTransition(seq[i], seq[i + 1])).toBe(true)
    }
  })

  it('saved → idle (novo take) é permitido', () => {
    expect(canTransition('saved', 'idle')).toBe(true)
  })

  it('error → idle (dismiss) é permitido', () => {
    expect(canTransition('error', 'idle')).toBe(true)
  })

  it('transições ilegais são rejeitadas', () => {
    expect(canTransition('idle', 'recording')).toBe(false)
    expect(canTransition('recording', 'camera-ready')).toBe(false)
    expect(canTransition('processing', 'recording')).toBe(false)
  })

  it('RECORDING_TRANSITIONS cobre todos os estados', () => {
    const all: RecordingState[] = [
      'idle',
      'requesting-permissions',
      'camera-ready',
      'countdown',
      'recording',
      'paused',
      'stopping',
      'processing',
      'saved',
      'error',
    ]
    for (const s of all) expect(Array.isArray(RECORDING_TRANSITIONS[s])).toBe(true)
  })
})

/* ===========================================================================
   2. useRecordingStateMachine — hook
   ======================================================================== */
describe('useRecordingStateMachine — hook', () => {
  it('inicia em idle', () => {
    const { result } = renderHook(() => useRecordingStateMachine())
    expect(result.current.state).toBe('idle')
  })

  it('transition valida a tabela (rejeita ilegal, aceita legal)', () => {
    const { result } = renderHook(() => useRecordingStateMachine())
    // ilegal: idle → recording
    act(() => {
      expect(result.current.transition('recording')).toBe(false)
    })
    expect(result.current.state).toBe('idle')
    // legal: idle → requesting-permissions
    act(() => {
      expect(result.current.transition('requesting-permissions')).toBe(true)
    })
    expect(result.current.state).toBe('requesting-permissions')
  })

  it('percorre a sequência completa via transition', () => {
    const { result } = renderHook(() => useRecordingStateMachine())
    const steps: RecordingState[] = [
      'requesting-permissions',
      'camera-ready',
      'countdown',
      'recording',
      'paused',
      'recording',
      'stopping',
      'processing',
      'saved',
    ]
    for (const s of steps) {
      act(() => {
        expect(result.current.transition(s)).toBe(true)
      })
    }
    expect(result.current.state).toBe('saved')
  })

  it('dismissError leva de error → idle', () => {
    const { result } = renderHook(() => useRecordingStateMachine())
    act(() => {
      result.current.transition('requesting-permissions')
      result.current.forceState('error')
      result.current.setErrorMessage('falhou')
    })
    expect(result.current.state).toBe('error')
    expect(result.current.errorMessage).toBe('falhou')
    act(() => result.current.dismissError())
    expect(result.current.state).toBe('idle')
    expect(result.current.errorMessage).toBeUndefined()
  })

  it('isActive reflete gravação ativa', () => {
    const { result } = renderHook(() => useRecordingStateMachine())
    expect(result.current.isActive).toBe(false)
    act(() => {
      result.current.transition('requesting-permissions')
      result.current.transition('camera-ready')
      result.current.transition('countdown')
    })
    expect(result.current.isActive).toBe(true)
  })
})

/* ===========================================================================
   3. Botão Gravar desabilitado em idle
   ======================================================================== */
describe('dockButtonsEnabled — Gravar desabilitado em idle', () => {
  it('idle: record=false', () => {
    expect(dockButtonsEnabled('idle').record).toBe(false)
  })
  it('camera-ready: record=true', () => {
    expect(dockButtonsEnabled('camera-ready').record).toBe(true)
  })
  it('recording: record=false (não pode gravar de novo)', () => {
    expect(dockButtonsEnabled('recording').record).toBe(false)
  })
})

/* ===========================================================================
   4. beforeunload registrado durante recording
   ======================================================================== */
describe('useRecordingStateMachine — beforeunload', () => {
  it('registra listener durante recording e remove ao sair', () => {
    const { result, unmount } = renderHook(() => useRecordingStateMachine())
    act(() => {
      result.current.transition('requesting-permissions')
      result.current.transition('camera-ready')
      result.current.transition('countdown')
      result.current.transition('recording')
    })
    expect(result.current.state).toBe('recording')
    expect(isActivelyRecording('recording')).toBe(true)
    // listener de beforeunload deve estar registrado
    expect((listeners['beforeunload'] || []).length).toBe(1)

    // Ao parar (stopping), o listener é removido (não está mais ativamente gravando).
    act(() => {
      result.current.transition('stopping')
    })
    expect((listeners['beforeunload'] || []).length).toBe(0)
    unmount()
  })

  it('NÃO registra listener em idle', () => {
    const { result, unmount } = renderHook(() => useRecordingStateMachine())
    expect(result.current.state).toBe('idle')
    expect((listeners['beforeunload'] || []).length).toBe(0)
    unmount()
  })
})

/* ===========================================================================
   5. Toast em saved e error (via RecordingDock render)
   ======================================================================== */
describe('RecordingDock — estados saved e error exibem feedback', () => {
  const baseProps = (over: Partial<React.ComponentProps<typeof RecordingDock>>) => ({
    state: 'idle' as RecordingState,
    elapsed: 0,
    cameraOn: false,
    micOn: false,
    micLevel: 0,
    countdown: 3 as 3 | 5 | 0,
    onToggleCamera: () => {},
    onToggleMic: () => {},
    onTestAudio: () => {},
    onCountdownChange: () => {},
    onRecord: () => {},
    onPause: () => {},
    onResume: () => {},
    onStop: () => {},
    onMarker: () => {},
    ...over,
  })

  it('saved: mostra rótulo "Take salvo" e nome do take', () => {
    render(<RecordingDock {...baseProps({ state: 'saved', lastTakeName: 'take-1.webm' })} />)
    expect(screen.getByText('Take salvo')).toBeTruthy()
    expect(screen.getByText('take-1.webm')).toBeTruthy()
  })

  it('error: mostra rótulo "Erro" e mensagem de erro', () => {
    render(<RecordingDock {...baseProps({ state: 'error', errorMessage: 'Permissão negada' })} />)
    expect(screen.getByText('Erro')).toBeTruthy()
    expect(screen.getByText('Permissão negada')).toBeTruthy()
  })

  it('idle: botão Gravar está desabilitado', () => {
    render(<RecordingDock {...baseProps({ state: 'idle' })} />)
    const recordBtn = screen.getByTitle('Gravar take (R)') as HTMLButtonElement
    expect(recordBtn.disabled).toBe(true)
  })
})

/* ===========================================================================
   6. Checklist pré-gravação (PreFlightCheck — evaluatePreFlight)
   ======================================================================== */
describe('PreFlightCheck — bloqueios e avisos', () => {
  const okInput: PreFlightInput = {
    cameraStream: {} as MediaStream,
    micStream: {} as MediaStream,
    composerReady: true,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    micLevel: 20,
    layout: 'full',
    hasScript: true,
    teleprompterConfigured: true,
    backgroundOk: true,
    effectsActive: true,
    blockMediaLoaded: true,
  }

  it('tudo OK → sem bloqueios', () => {
    const items = evaluatePreFlight(okInput)
    expect(hasBlockingItems(items)).toBe(false)
  })

  it('câmera faltando BLOQUEIA', () => {
    const items = evaluatePreFlight({ ...okInput, cameraStream: null })
    expect(hasBlockingItems(items)).toBe(true)
    const cam = items.find((i) => i.id === 'camera')!
    expect(cam.status).toBe('block')
  })

  it('microfone faltando BLOQUEIA', () => {
    const items = evaluatePreFlight({ ...okInput, micStream: null })
    expect(hasBlockingItems(items)).toBe(true)
    const mic = items.find((i) => i.id === 'mic')!
    expect(mic.status).toBe('block')
  })

  it('roteiro faltando NÃO bloqueia (apenas avisa)', () => {
    const items = evaluatePreFlight({ ...okInput, hasScript: false })
    expect(hasBlockingItems(items)).toBe(false)
    const script = items.find((i) => i.id === 'script')!
    expect(script.status).toBe('warning')
  })
})
