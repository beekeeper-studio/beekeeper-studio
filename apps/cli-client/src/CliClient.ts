import { EventEmitter } from 'events'
import net from 'net'
import {
  CliError,
  ConnectionsParams,
  CliResponse,
  CliResultResponse,
  EntitiesParams,
  SchemasParams,
  QueryParams,
  StructureParams,
  CreateTabParams,
  CreateTabResult,
  SwitchTabParams,
  SwitchTabResult,
} from './protocol'
import { ConnectionsReply } from './replies/ConnectionsReply'
import { EntitiesReply } from './replies/EntitiesReply'
import { SchemasReply } from './replies/SchemasReply'
import { QueryReply } from './replies/QueryReply'
import { StructureReply } from './replies/StructureReply'
import { CliReply } from './replies/CliReply'

export const CLI_EXIT_OK = 0
export const CLI_EXIT_ERROR = 1
export const CLI_EXIT_USAGE = 2

const CONNECT_ERROR_CODES = new Set(['ENOENT', 'ECONNREFUSED', 'EACCES', 'ENOTSOCK', 'EPIPE', 'ECONNRESET'])

/** Whether the socket could not be reached, i.e. the app is not running or not listening there. */
export function isConnectError(error: any): boolean {
  return !!error && CONNECT_ERROR_CODES.has(error.code)
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

  async connections(params: ConnectionsParams = {}): Promise<ConnectionsReply> {
    const response = await this.request('connections', params)
    return new ConnectionsReply(response)
  }

  async schemas(params: SchemasParams): Promise<SchemasReply> {
    const response = await this.request('schemas', params)
    return new SchemasReply(response)
  }

  async entities(params: EntitiesParams): Promise<EntitiesReply> {
    const response = await this.request('entities', params)
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

  async createTab(params: CreateTabParams): Promise<CliReply<CreateTabResult>> {
    const response = await this.request('createTab', params)
    return new CliReply(response)
  }

  async switchTab(params: SwitchTabParams): Promise<CliReply<SwitchTabResult>> {
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
