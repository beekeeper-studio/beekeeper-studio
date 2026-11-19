import net from 'net'
import { CliCommandArgs, CliCommandName, CliError, CliErrorPayload, CliRequest, CliResponse } from './protocol'

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
  /** Defaults to 5000ms. 0 disables the timeout. */
  timeout?: number;
}

export class CliClient {
  constructor(private readonly options: CliClientOptions) {}

  get timeout(): number {
    return this.options.timeout ?? 5000;
  }

  /** Resolves with the result, or rejects with the CliError the app replied with. */
  async call(command: CliCommandName, args: CliCommandArgs): Promise<unknown> {
    const response = await this.send({ command, args });
    if (!response || typeof response !== "object" || !("ok" in response)) {
      throw new CliError("INTERNAL", "Beekeeper Studio sent an unexpected reply.");
    }
    if (response.ok === false) {
      const { code, message, hint, details } = response.error;
      throw new CliError(code, message, { hint, details });
    }
    return response.result;
  }

  /** Sends one request and resolves with the one response line the app writes back. */
  send(request: CliRequest): Promise<CliResponse> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.options.socketPath)
      socket.setEncoding('utf8')

      let buffer = ''
      let timer: NodeJS.Timeout | null = null

      const finish = (fn: () => void) => {
        if (timer) clearTimeout(timer)
        socket.destroy()
        fn()
      }

      const parse = (line: string) => {
        try {
          resolve(JSON.parse(line) as CliResponse)
        } catch {
          reject(new CliError('INTERNAL', 'Beekeeper Studio sent a reply that is not valid JSON.'))
        }
      }

      if (this.timeout > 0) {
        timer = setTimeout(
          () => finish(() => reject(new CliError('INTERNAL', `No reply from Beekeeper Studio after ${this.timeout}ms.`))),
          this.timeout
        )
      }

      socket.on('connect', () => {
        socket.write(JSON.stringify(request) + '\n')
      })
      socket.on('data', (chunk: string) => {
        buffer += chunk
        const newline = buffer.indexOf('\n')
        if (newline !== -1) finish(() => parse(buffer.slice(0, newline)))
      })
      socket.on('end', () => {
        if (buffer.trim()) {
          finish(() => parse(buffer))
        } else {
          finish(() => reject(new CliError('INTERNAL', 'Beekeeper Studio closed the connection without replying.')))
        }
      })
      socket.on('error', (error) => finish(() => reject(error)))
    })
  }
}
