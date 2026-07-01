import type { HMRUpdatePayload } from '../types/hmr'

export enum BUILD_ACTIONS_SENT_TO_BROWSER {
  BUILT = 'built',
  UPDATE = 'hmr-update',
}

export interface HmrServerOptions {
  /** Session ID for this HMR server instance */
  sessionId?: number
  /** Callback when a client subscribes to an HMR path */
  onSubscribe?: (path: string, client: HmrClient) => void
  /** Callback when a client unsubscribes from an HMR path */
  onUnsubscribe?: (path: string, client: HmrClient) => void
}

export interface HmrClient {
  /** Unique client ID */
  id: string
  /** The MessagePort for this client */
  port: MessagePort
  /** Send a message to this client */
  send: (message: BUILD_ACTION_TYPES) => void
  /** Close the connection to this client */
  close: () => void
}

export interface BuiltAction {
  action: BUILD_ACTIONS_SENT_TO_BROWSER.BUILT
  hash: string
}

export interface HMRAction {
  action: BUILD_ACTIONS_SENT_TO_BROWSER.UPDATE
  hash: string
}

export type BUILD_ACTION_TYPES =
  | BuiltAction
  | HMRAction

// Client message types
export interface HmrClientMessage {
  type: 'subscribe' | 'unsubscribe'
  path: string
}

let clientIdCounter = 0

/**
 * HmrServer manages HMR connections with preview iframes.
 */
export class HmrServer {
  private clients = new Set<HmrClient>()
  private subscriptions = new Map<string, Set<HmrClient>>()
  private sessionId: number
  private options: HmrServerOptions

  constructor(options: HmrServerOptions = {}) {
    this.options = options
    this.sessionId =
      options.sessionId ?? Math.floor(Number.MAX_SAFE_INTEGER * Math.random())
  }

  /**
   * Create a MessageChannel and return the port that should be sent to the iframe.
   * The other port is kept by the server for communication.
   */
  public createConnection(): { clientPort: MessagePort; client: HmrClient } {
    const { port1, port2 } = new MessageChannel()
    const clientId = `hmr-client-${++clientIdCounter}`

    const client: HmrClient = {
      id: clientId,
      port: port1,
      send: (message: BUILD_ACTION_TYPES) => {
        port1.postMessage(message)
      },
      close: () => {
        this.removeClient(client)
        port1.close()
      },
    }

    port1.onmessage = (event) => {
      this.handleClientMessage(client, event.data)
    }

    port1.onmessageerror = () => {
      this.removeClient(client)
    }

    this.clients.add(client)

    return { clientPort: port2, client }
  }

  /**
   * Connect an iframe to the HMR server.
   * This posts a message to the iframe with the client port.
   */
  public connectIframe(
    iframe: HTMLIFrameElement,
    origin: string = '*'
  ): HmrClient | null {
    if (!iframe.contentWindow) {
      console.warn('[HmrServer] Cannot connect: iframe has no contentWindow')
      return null
    }

    const { clientPort, client } = this.createConnection()

    // Send the port to the iframe
    iframe.contentWindow.postMessage(
      { type: 'hmr-connect', sessionId: this.sessionId },
      origin,
      [clientPort]
    )

    console.log('[HmrServer] Connected to iframe, client:', client.id)

    return client
  }

  private handleClientMessage(client: HmrClient, data: string) {
    try {
      const message: HmrClientMessage =
        typeof data === 'string' ? JSON.parse(data) : data

      console.log('[HmrServer] Received message from client:', client.id, 'message:', message)

      if ('type' in message) {
        switch (message.type) {
          case 'subscribe':
            this.subscribe(client, message.path)
            break
          case 'unsubscribe':
            this.unsubscribe(client, message.path)
            break
        }
      }
    } catch (e) {
      console.error('[HmrServer] Failed to parse client message:', e)
    }
  }

  private subscribe(client: HmrClient, path: string) {
    if (!this.subscriptions.has(path)) {
      this.subscriptions.set(path, new Set())
    }
    this.subscriptions.get(path)!.add(client)
    this.options.onSubscribe?.(path, client)
    console.log('[HmrServer] Client subscribed to path:', path, 'client:', client.id)
  }

  private unsubscribe(client: HmrClient, path: string) {
    const subs = this.subscriptions.get(path)
    if (subs) {
      subs.delete(client)
      if (subs.size === 0) {
        this.subscriptions.delete(path)
      }
      this.options.onUnsubscribe?.(path, client)
    }
  }

  private removeClient(client: HmrClient) {
    this.clients.delete(client)

    // Remove from all subscriptions
    for (const [path, subs] of this.subscriptions) {
      if (subs.has(client)) {
        this.unsubscribe(client, path)
      }
    }
  }

  /**
   * Send an HMR update to all connected clients.
   */
  public sendUpdate(payload: HMRUpdatePayload) {
    const message: HMRAction = {
      action: BUILD_ACTIONS_SENT_TO_BROWSER.UPDATE,
      hash: payload.hash,
    }

    for (const client of this.clients) {
      client.send(message)
    }

    console.log('[HmrServer] Sent HMR update to', this.clients.size, 'clients')
  }

  /**
   * Notify all clients that a build has completed.
   */
  public notifyBuilt(result: { hash: string }) {
    const { hash } = result
    let message: BuiltAction = {
      action: BUILD_ACTIONS_SENT_TO_BROWSER.BUILT,
      hash,
    }

    for (const client of this.clients) {
      client.send(message)
    }
  }

  /**
   * Get the number of connected clients.
   */
  public getClientCount(): number {
    return this.clients.size
  }

  /**
   * Close all connections and cleanup.
   */
  public dispose() {
    for (const client of this.clients) {
      client.close()
    }
    this.clients.clear()
    this.subscriptions.clear()
  }
}

export default HmrServer
