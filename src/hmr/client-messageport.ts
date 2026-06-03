/**
 * MessagePort-based HMR client for preview iframe
 *
 * This replaces WebSocket when running in an iframe with HmrServer.
 * Communicates with parent window via MessagePort for HMR updates.
 *
 * Based on utoo's HMR implementation:
 * https://github.com/utooland/utoo
 */

type WebSocketMessage =
  | {
      type: 'turbopack-connected'
    }
  | {
      type: 'turbopack-message'
      data: Record<string, unknown>
    }

let port: MessagePort | null = null
let eventCallbacks: Array<(event: WebSocketMessage) => void> = []

function dispatchMessage(message: WebSocketMessage) {
  for (const eventCallback of eventCallbacks) {
    eventCallback(message)
  }
}

export function addMessageListener(callback: (event: WebSocketMessage) => void) {
  eventCallbacks.push(callback)
}

export function sendMessage(data: unknown) {
  if (port) {
    const message = typeof data === 'string' ? data : JSON.stringify(data)
    port.postMessage(message)
  }
}

export interface HMROptions {
  path?: string
}

let reloading = false
let serverSessionId: number | null = null

function handleMessage(event: MessageEvent<string>) {
  if (reloading) {
    return
  }

  try {
    const msg =
      typeof event.data === 'string' ? JSON.parse(event.data) : event.data

    if (msg.action === 'turbopack-connected') {
      if (serverSessionId !== null && serverSessionId !== msg.data.sessionId) {
        window.location.reload()
        reloading = true
        return
      }

      serverSessionId = msg.data.sessionId

      const connected: WebSocketMessage = { type: 'turbopack-connected' }
      dispatchMessage(connected)
      return
    }

    if (msg.action === 'reload') {
      window.location.reload()
      reloading = true
      return
    }

    if (msg.action === 'turbopack-message') {
      const turbopackMessage: WebSocketMessage = {
        type: 'turbopack-message',
        data: msg.data,
      }
      dispatchMessage(turbopackMessage)
      return
    }

    if (
      msg.type &&
      ['partial', 'restart', 'notFound', 'issues'].includes(msg.type)
    ) {
      const turbopackMessage: WebSocketMessage = {
        type: 'turbopack-message',
        data: msg,
      }
      dispatchMessage(turbopackMessage)
      return
    }
  } catch (e) {
    console.error('[HMR] Failed to parse message:', e)
  }
}

/**
 * Connect to HMR server via MessagePort.
 * The iframe sends "hmr-ready" to parent, and parent responds with "hmr-connect"
 * containing the MessagePort for bidirectional communication.
 */
export function connectHMR(_options?: HMROptions) {
  if (typeof window === 'undefined') {
    return
  }

  console.log('[HMR] Waiting for MessagePort connection...')

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'hmr-connect' && event.ports.length > 0) {
      if (port) {
        port.close()
      }

      port = event.ports[0]
      port.onmessage = handleMessage
      port.onmessageerror = () => {
        console.error('[HMR] MessagePort error')
        port = null
      }

      console.log('[HMR] Connected via MessagePort')
    }
  })

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'hmr-ready' }, '*')
    console.log('[HMR] Sent hmr-ready to parent')
  }
}

/**
 * Check if HMR is connected
 */
export function isConnected(): boolean {
  return port !== null
}

/**
 * Disconnect HMR
 */
export function disconnect() {
  if (port) {
    port.close()
    port = null
  }
  eventCallbacks = []
  serverSessionId = null
  reloading = false
}

export default {
  addMessageListener,
  sendMessage,
  connectHMR,
  isConnected,
  disconnect,
}
