/**
 * HmrServer - Simulates a WebSocket server using MessagePort for HMR communication.
 *
 * This class manages HMR connections with preview iframes, forwarding Rspack
 * HMR events from the main thread to the preview iframe's HMR client.
 *
 * Architecture:
 * - Main Thread (App) -> HmrServer -> MessagePort -> Preview Iframe (HMR Client)
 *
 * Based on utoo's HMR implementation:
 * https://github.com/utooland/utoo
 */

import type { HMRUpdatePayload } from '../types/hmr'

// HMR Action types matching Rspack/Turbopack HMR protocol
export enum HMR_ACTIONS_SENT_TO_BROWSER {
  TURBOPACK_CONNECTED = 'turbopack-connected',
  BUILDING = 'building',
  BUILT = 'built',
  SYNC = 'sync',
  PARTIAL = 'partial',
  RESTART = 'restart',
  NOT_FOUND = 'not-found',
  ISSUES = 'issues',
  RELOAD = 'reload',
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
  send: (message: HMR_ACTION_TYPES) => void
  /** Close the connection to this client */
  close: () => void
}

// HMR Message types
export interface TurbopackConnectedAction {
  action: HMR_ACTIONS_SENT_TO_BROWSER.TURBOPACK_CONNECTED
  data: { sessionId: number }
}

export interface BuildingAction {
  action: HMR_ACTIONS_SENT_TO_BROWSER.BUILDING
}

export interface BuiltAction {
  action: HMR_ACTIONS_SENT_TO_BROWSER.BUILT
  hash: string
}

export interface SyncAction {
  action: HMR_ACTIONS_SENT_TO_BROWSER.SYNC
  hash: string
  errors: unknown[]
  warnings: unknown[]
}

export interface ReloadAction {
  action: HMR_ACTIONS_SENT_TO_BROWSER.RELOAD
}

export interface PartialUpdateAction {
  action: HMR_ACTIONS_SENT_TO_BROWSER.PARTIAL
  hash: string
}

export type HMR_ACTION_TYPES =
  | TurbopackConnectedAction
  | BuildingAction
  | BuiltAction
  | SyncAction
  | ReloadAction
  | PartialUpdateAction

// Client message types
export interface HmrClientMessage {
  type: 'turbopack-subscribe' | 'turbopack-unsubscribe'
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
      send: (message: HMR_ACTION_TYPES) => {
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
          case 'turbopack-subscribe':
            this.subscribe(client, message.path)
            break
          case 'turbopack-unsubscribe':
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
    const message: PartialUpdateAction = {
      action: HMR_ACTIONS_SENT_TO_BROWSER.PARTIAL,
      hash: payload.hash,
    }

    for (const client of this.clients) {
      client.send(message)
    }

    console.log('[HmrServer] Sent HMR update to', this.clients.size, 'clients')
  }

  /**
   * Notify all clients that a build is starting.
   */
  public notifyBuilding() {
    const message: BuildingAction = {
      action: HMR_ACTIONS_SENT_TO_BROWSER.BUILDING,
    }

    for (const client of this.clients) {
      client.send(message)
    }
  }

  /**
   * Notify all clients that a build has completed.
   */
  public notifyBuilt(result: { hash: string }) {
    const { hash } = result
    let message: BuiltAction = {
      action: HMR_ACTIONS_SENT_TO_BROWSER.BUILT,
      hash,
    }

    for (const client of this.clients) {
      client.send(message)
    }
  }

  /**
   * Request all clients to reload.
   */
  public requestReload() {
    const message: ReloadAction = {
      action: HMR_ACTIONS_SENT_TO_BROWSER.RELOAD,
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
