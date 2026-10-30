import net from 'net'
import { CLI_USAGE, CliInvocation, parseCliArgs } from './args'
import { formatResult } from './format'
import { CliError, CliErrorPayload, CliRequest, CliResponse, isCliError } from './protocol'

export const CLI_EXIT_OK = 0
export const CLI_EXIT_ERROR = 1
export const CLI_EXIT_USAGE = 2

export interface CliClientIO {
  writeOut(text: string): void
  writeErr(text: string): void
  readFile(path: string): Promise<string>
  readStdin(): Promise<string>
}

export type CliSender = (socketPath: string, request: CliRequest, timeoutMs?: number) => Promise<CliResponse>

export interface RunCliOptions {
  socketPath: string
  io: CliClientIO
  /** 0 disables the timeout. Queries can legitimately run for a long time. */
  timeoutMs?: number
  /** Test seam. Defaults to sendCliRequest. */
  send?: CliSender
}

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
    'the socket it listens on and pass it in the BKS_CLI_SOCKET environment variable.',
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

/** Sends one request and resolves with the one response line the app writes back. */
export function sendCliRequest(socketPath: string, request: CliRequest, timeoutMs = 0): Promise<CliResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath)
    socket.setEncoding('utf8')

    let buffer = ''
    let settled = false
    let timer: NodeJS.Timeout | null = null

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
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

    if (timeoutMs > 0) {
      timer = setTimeout(
        () => finish(() => reject(new CliError('INTERNAL', `No reply from Beekeeper Studio after ${timeoutMs}ms.`))),
        timeoutMs
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

/**
 * The whole client: parse the arguments, send the request, print the reply.
 * Returns the process exit code; writes only through `io`.
 */
export async function runCli(args: string[], options: RunCliOptions): Promise<number> {
  const { io } = options

  let invocation: CliInvocation
  try {
    invocation = parseCliArgs(args)
  } catch (error) {
    const message = isCliError(error) ? error.message : error?.message ?? String(error)
    io.writeErr(`${message}\n\n${CLI_USAGE}\n`)
    return CLI_EXIT_USAGE
  }

  if (invocation.help || !invocation.request) {
    io.writeOut(CLI_USAGE + '\n')
    return CLI_EXIT_OK
  }

  const request = invocation.request
  if (invocation.sqlFile) {
    try {
      request.args.sql = await io.readFile(invocation.sqlFile)
    } catch (error) {
      io.writeErr(`Could not read ${invocation.sqlFile}: ${error?.message ?? error}\n`)
      return CLI_EXIT_USAGE
    }
  } else if (invocation.sqlFromStdin) {
    request.args.sql = await io.readStdin()
  }
  if (request.command === 'query' && !request.args.sql?.trim()) {
    io.writeErr('No SQL to run: the input was empty.\n')
    return CLI_EXIT_USAGE
  }

  let response: CliResponse
  try {
    response = await (options.send ?? sendCliRequest)(options.socketPath, request, options.timeoutMs ?? 0)
  } catch (error) {
    if (isConnectError(error)) {
      io.writeErr(notRunningMessage(options.socketPath) + '\n')
    } else {
      io.writeErr(`Could not talk to Beekeeper Studio: ${error?.message ?? error}\n`)
    }
    return CLI_EXIT_ERROR
  }

  if (!response || typeof response !== 'object' || !('ok' in response)) {
    io.writeErr('Beekeeper Studio sent an unexpected reply.\n')
    return CLI_EXIT_ERROR
  }

  if (!response.ok) {
    io.writeErr(formatErrorPayload(response.error) + '\n')
    return CLI_EXIT_ERROR
  }

  io.writeOut(formatResult(request.command, response.result, invocation.format) + '\n')
  return CLI_EXIT_OK
}
