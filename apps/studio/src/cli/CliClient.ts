import { EventEmitter } from 'events'
import net from 'net'
import {
  CliError,
  CliErrorPayload,
  CliEntityType,
  CliResponse,
  CliResultResponse,
  EntitiesParams,
  SchemasParams,
  QueryParams,
  StructureParams,
  CreateTabParams,
  SwitchTabParams,
} from './protocol'
import { ConnectionsReply } from './replies/ConnectionsReply'
import { EntitiesReply } from './replies/EntitiesReply'
import { SchemasReply } from './replies/SchemasReply'
import { QueryReply } from './replies/QueryReply'
import { StructureReply } from './replies/StructureReply'
import { CliReply } from './replies/CliReply'

export const ENTITY_TYPE_ALIASES = {
  table: 'table',
  tables: 'table',
  view: 'view',
  views: 'view',
  'materialized-view': 'materialized-view',
  'materialized-views': 'materialized-view',
  materialized_view: 'materialized-view',
  matview: 'materialized-view',
  matviews: 'materialized-view',
  routine: 'routine',
  routines: 'routine',
  function: 'routine',
  functions: 'routine',
  procedure: 'routine',
  procedures: 'routine',
} as const satisfies Record<string, CliEntityType>

export type EntityTypeAlias = keyof typeof ENTITY_TYPE_ALIASES

export const CLI_EXIT_OK = 0
export const CLI_EXIT_ERROR = 1
export const CLI_EXIT_USAGE = 2

const CONNECT_ERROR_CODES = new Set(['ENOENT', 'ECONNREFUSED', 'EACCES', 'ENOTSOCK', 'EPIPE', 'ECONNRESET'])

export function isConnectError(error: any): boolean {
  return !!error && CONNECT_ERROR_CODES.has(error.code)
}

export function notRunningMessage(socketPath: string): string {
  return [
    'Beekeeper Studio is not running (or is still starting up).',
    `The CLI talks to the running desktop app through ${socketPath}, and nothing is listening there.`,
    'Start Beekeeper Studio, connect to a database, then run the command again.',
    'If the app is running, it may use another data directory: run `beekeeper-studio cli` to see',
    'the socket it listens on and pass it with --socket or the BKS_CLI_SOCKET environment variable.',
  ].join('\n')
}

export function formatErrorPayload(error: CliErrorPayload): string {
  const lines = [`Error (${error.code}): ${error.message}`]
  if (error.hint) lines.push(error.hint)
  const connections = (error.details as any)?.connections
  if (Array.isArray(connections) && connections.length > 0) {
    lines.push('Open connections:')
    for (const c of connections) {
      const flags = [c.cliEnabled ? 'CLI enabled' : 'CLI disabled', c.readOnlyMode ? 'read only' : null]
        .filter(Boolean)
        .join(', ')
      lines.push(`  - ${c.name} [${c.connectionType}] id=${c.id} (${flags})`)
    }
  }
  return lines.join('\n')
}

export interface CliClientOptions {
  socketPath: string;
  /** Milliseconds to wait for a reply. 0 disables the timeout. */
  timeout: number;
}

/** Emits "error" for requests that get no reply: the app is not running, a timeout, a dropped connection. */
export class CliClient extends EventEmitter<{ error: [unknown] }> {
  constructor(private readonly options: CliClientOptions) {
    super()
  }

  async connections(): Promise<ConnectionsReply> {
    const response = await this.request('connections', {})
    return new ConnectionsReply(response)
  }

  async schemas(params: SchemasParams): Promise<SchemasReply> {
    const response = await this.request('schemas', params)
    return new SchemasReply(response)
  }

  async entities(
    params: Omit<EntitiesParams, 'entityTypes'> & { entityTypes?: EntityTypeAlias[] }
  ): Promise<EntitiesReply> {
    let entityTypes: CliEntityType[] | undefined
    if (params.entityTypes) {
      entityTypes = [...new Set(params.entityTypes.map((alias) => ENTITY_TYPE_ALIASES[alias]))]
    }
    const response = await this.request('entities', { ...params, entityTypes })
    return new EntitiesReply(response)
  }

  async structure(params: StructureParams): Promise<StructureReply> {
    const response = await this.request('structure', params)
    return new StructureReply(response)
  }

  async query(params: QueryParams): Promise<QueryReply> {
    const response = await this.request('query', params)
    return new QueryReply(response)
  }

  // FIXME: the reply is untyped (unknown).
  async createTab(params: CreateTabParams): Promise<CliReply<unknown>> {
    const response = await this.request('createTab', params)
    return new CliReply(response)
  }

  // FIXME: the reply is untyped (unknown).
  async switchTab(params: SwitchTabParams): Promise<CliReply<unknown>> {
    const response = await this.request('switchTab', params)
    return new CliReply(response)
  }

  /** Sends one request and resolves with the app's reply, or throws the CliError it replied with. */
  private async request(method: unknown, params: unknown): Promise<CliResultResponse> {
    const reply = new Promise<string>((resolve, reject) => {
      const socket = net.createConnection(this.options.socketPath)
      socket.setEncoding('utf8')

      let buffer = ''
      let timer: NodeJS.Timeout | null = null

      const finish = (fn: () => void) => {
        if (timer) clearTimeout(timer)
        socket.destroy()
        fn()
      }


      if (this.options.timeout > 0) {
        timer = setTimeout(
          () => finish(() => reject(new CliError('INTERNAL', `No reply from Beekeeper Studio after ${this.options.timeout}ms.`))),
          this.options.timeout
        )
      }

      socket.on('connect', () => {
        socket.write(JSON.stringify({ method, params }) + '\n')
      })
      socket.on('data', (chunk: string) => {
        buffer += chunk
        const newline = buffer.indexOf('\n')
        if (newline !== -1) finish(() => resolve(buffer.slice(0, newline)))
      })
      socket.on('end', () => {
        if (buffer.trim()) {
          finish(() => resolve(buffer))
        } else {
          finish(() => reject(new CliError('INTERNAL', 'Beekeeper Studio closed the connection without replying.')))
        }
      })
      socket.on('error', (error) => finish(() => reject(error)))
    })
    let raw: string
    try {
      raw = await reply
    } catch (error) {
      // Emitted here, not in the socket callbacks, so a listener that throws
      // rejects this request instead of crashing the process.
      this.emit('error', error)
      throw error
    }

    let response: CliResponse
    try {
      response = JSON.parse(raw)
    } catch {
      throw new CliError('INTERNAL', 'Beekeeper Studio sent a reply that is not valid JSON.')
    }
    if (!response || typeof response !== 'object' || !('ok' in response)) {
      throw new CliError('INTERNAL', 'Beekeeper Studio sent an unexpected reply.')
    }
    if (response.ok === false) {
      const error = response.error
      throw new CliError(error.code, error.message, { hint: error.hint, details: error.details })
    }
    return response
  }
}
