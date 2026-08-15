import { useCallback, useEffect, useRef, useState } from 'react'
import { useBeforeUnload } from 'react-router-dom'

/**
 * CORREÇÃO 3 — Bloqueia navegação durante a gravação ou processamento do take.
 *
 * O projeto usa `<BrowserRouter>` (não `createBrowserRouter`), então o
 * `useBlocker` do react-router v7 quebra com
 * "useBlocker must be used within a data router". Esta reimplementação NÃO
 * usa `useBlocker` e funciona com BrowserRouter.
 *
 * Estratégia:
 *  1. `useBeforeUnload` protege contra fechar aba / recarregar (BrowserRouter).
 *  2. Intercepta `window.history.pushState` para detectar navegações internas
 *     do react-router (cliques na sidebar, `<Link>`, `navigate()`).
 *  3. Intercepta `popstate` para detectar botão voltar/avançar do navegador.
 *
 * API de retorno (idêntica ao blocker do react-router v7):
 *   { state: 'blocked' | 'unblocked', proceed: () => void, reset: () => void }
 * A Gravadora renderiza um dialog quando `state === 'blocked'`.
 */
export function useRecordingGuard(
  isRecording: boolean,
  isProcessing: boolean,
  _onStopAndProceed?: () => void,
) {
  const shouldBlock = isRecording || isProcessing

  // Estado que dispara re-render quando bloqueamos uma navegação.
  const [state, setState] = useState<'blocked' | 'unblocked'>('unblocked')

  // URL pendente capturada quando bloqueamos um pushState interno.
  const pendingUrlRef = useRef<string | null>(null)
  // Flag que permite liberar um popstate bloqueado (proceed).
  const allowPopstateRef = useRef(false)
  // Snapshot do shouldBlock capturado no momento do override, para o handler
  // de eventos decidir bloquear mesmo entre re-renders.
  const shouldBlockRef = useRef(shouldBlock)
  shouldBlockRef.current = shouldBlock

  // `useBeforeUnload` funciona com BrowserRouter — protege fechar/recarregar.
  useBeforeUnload(
    useCallback((event: BeforeUnloadEvent) => {
      if (shouldBlockRef.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }, []),
    { capture: true },
  )

  const reset = useCallback(() => {
    pendingUrlRef.current = null
    allowPopstateRef.current = false
    setState('unblocked')
  }, [])

  const proceed = useCallback(() => {
    const pendingUrl = pendingUrlRef.current
    pendingUrlRef.current = null
    setState('unblocked')

    if (pendingUrl) {
      // Navegação interna (pushState) — segue para a URL capturada.
      window.location.href = pendingUrl
    } else {
      // popstate (voltar/avançar) — permite o movimento original.
      allowPopstateRef.current = true
      // Reemite um popstate? Não é necessário: o navegador já consumiu o
      // evento. Permitimos o próximo popstate reagendando um histórico
      // para frente/trás conforme a intenção do usuário é ambíguo; em vez
      // disso simplesmente destravamos e deixamos o próximo clique seguir.
      window.history.back()
    }
  }, [])

  useEffect(() => {
    if (!shouldBlock) {
      // Se parou de gravar/processar, garante que não fique bloqueado.
      pendingUrlRef.current = null
      allowPopstateRef.current = false
      setState('unblocked')
      return
    }

    const originalPushState = window.history.pushState

    // Intercepta pushState — navegação interna do react-router.
    const patchedPushState: typeof window.history.pushState = function (data, unused, url) {
      if (shouldBlockRef.current && !allowPopstateRef.current) {
        // Captura a URL de destino e bloqueia a navegação.
        const target = typeof url === 'string' ? url : url instanceof URL ? url.href : null
        if (target != null && target !== window.location.href) {
          pendingUrlRef.current = target
          setState('blocked')
          // Não chama o pushState original → navegação cancelada.
          return
        }
      }
      return originalPushState.apply(this, [data, unused, url] as const)
    }

    const handlePopstate = () => {
      if (shouldBlockRef.current && !allowPopstateRef.current) {
        // Bloqueia o voltar/avançar: devolve o usuário para a posição atual.
        pendingUrlRef.current = null
        setState('blocked')
        // Reempilha o estado para desfazer o movimento do navegador.
        window.history.pushState(
          window.history.state,
          '',
          window.location.pathname + window.location.search + window.location.hash,
        )
      } else if (allowPopstateRef.current) {
        // proceed() liberou — consome a flag e segue.
        allowPopstateRef.current = false
      }
    }

    window.history.pushState = patchedPushState
    window.addEventListener('popstate', handlePopstate)

    return () => {
      window.history.pushState = originalPushState
      window.removeEventListener('popstate', handlePopstate)
      pendingUrlRef.current = null
      allowPopstateRef.current = false
    }
  }, [shouldBlock])

  return { state, proceed, reset }
}
