import fs from 'fs'
import net from 'net'
import { CliRequestEvent } from './auditLog'
import { CliCallContext, clientInfo } from './commands'
import { CliError, CliRequest, CliResponse, isCliError, isWindowsPipePath } from '@beekeeperstudio/cli-client'
import { EventEmitter } from '@/common/EventEmitter'
import { serializeBigInt } from '@/services/plugin/utils'
import rawLog from '@bksLogger';

const log = rawLog.scope('CliServer');

export interface CliServerOptions {
  socketPath: string
  /** A request line longer than this is rejected. SQL text is the only sizeable input. */
  maxRequestBytes?: number
}

export interface CliServerEventMap {
  /** Fires after every reply, malformed requests included. Feeds the audit log. */
  requestHandled: (event: CliRequestEvent) => void
}

const DEFAULT_MAX_REQUEST_BYTES = 16 * 1024 * 1024

export class CliServerError extends Error {
  static readonly SocketPathNotProvided = 'SOCKET_PATH_NOT_PROVIDED'

  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'CliServerError'
  }
}

/** Resolves true when something is listening at the path, false when nothing answers. */
export function probeSocket(socketPath: string, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(socketPath)
    const done = (alive: boolean) => {
      clearTimeout(timer)
      socket.removeAllListeners()
      socket.destroy()
      resolve(alive)
    }
    const timer = setTimeout(() => done(false), timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

/**
 * Newline-delimited JSON over a local socket: the client sends one request
 * line, the server answers with one response line and closes. Lives in the
 * utility process, next to the database connections it exposes.
 */
export class CliServer extends EventEmitter<CliServerEventMap> {
  private server: net.Server | null = null
  private started = false
  private readonly sockets = new Set<net.Socket>()
  private readonly maxRequestBytes: number
  private readonly funcs = new Map<string, Function>()

  constructor(private readonly options: CliServerOptions) {
    super()
    this.maxRequestBytes = options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES
    this.handleConnection = this.handleConnection.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  register(name: string, func: Function): void {
    this.funcs.set(name, func)
  }

  get socketPath(): string {
    return this.options.socketPath
  }

  get listening(): boolean {
    return !!this.server?.listening
  }

  /**
   * Resolves true once listening, false when another app instance already
   * serves the socket (that one keeps answering CLI requests).
   *
   * @throws {Error} if it fails to start
   */
  async start(): Promise<void> {
    if (this.started) {
      log.warn("Calling start when already started");
      return;
    }
    const socketPath = this.options.socketPath
    if (!socketPath) {
      throw new CliServerError(CliServerError.SocketPathNotProvided, 'No CLI socket path was provided.')
    }

    if (!isWindowsPipePath(this.socketPath)) {
      await this.removeStaleSocketFile()
    }

    // allowHalfOpen: a client may send its request and close its writing side
    // before the reply is ready; the reply still has to go out.
    const server = net.createServer({ allowHalfOpen: true }, this.handleConnection)
    server.on('error', this.handleError)

    await this.listen(server)

    if (!isWindowsPipePath(socketPath)) {
      // Only the user who runs the app gets to talk to its database connections.
      try {
        fs.chmodSync(socketPath, 0o600)
      } catch (error) {
        log.warn(`Could not restrict permissions on ${socketPath}`, error)
      }
    }

    this.server = server
    this.started = true
    log.info(`CLI listening at ${socketPath}`)
  }

  private async listen(server: net.Server): Promise<void> {
    const socketPath = this.options.socketPath
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(socketPath, () => {
          server.off('error', reject)
          resolve()
        })
      })
    } catch (error) {
      if (error?.code === 'EADDRINUSE') {
        log.warn(`Another Beekeeper Studio instance is serving the CLI at ${socketPath}`)
      }
      throw error
    }
  }

  private handleError(error: Error): void {
    log.error('CLI socket server error', error)
  }

  private async removeStaleSocketFile(): Promise<void> {
    const socketPath = this.options.socketPath
    if (!fs.existsSync(socketPath)) return
    // A file left behind by a crashed instance blocks listen() with EADDRINUSE,
    // but so does a live instance. Only remove it when nothing answers.
    if (await probeSocket(socketPath)) return
    try {
      fs.unlinkSync(socketPath)
      log.info(`Removed stale CLI socket ${socketPath}`)
    } catch (error) {
      log.warn(`Could not remove stale CLI socket ${socketPath}`, error)
    }
  }

  private handleConnection(socket: net.Socket): void {
    this.sockets.add(socket)
    socket.on('close', () => this.sockets.delete(socket))
    socket.on('error', (error) => log.warn('CLI client socket error', error?.message ?? error))
    socket.setEncoding('utf8')

    let buffer = ''
    let handled = false

    socket.on('data', (chunk: string) => {
      if (handled) return
      buffer += chunk
      if (buffer.length > this.maxRequestBytes) {
        handled = true
        this.respond(socket, {
          ok: false,
          error: { code: 'USAGE', message: `Request is larger than ${this.maxRequestBytes} bytes.` },
        }, null, Date.now())
        return
      }
      const newline = buffer.indexOf('\n')
      if (newline === -1) return
      handled = true
      this.process(socket, buffer.slice(0, newline))
    })

    // A client that half-closes without a trailing newline still gets an answer.
    socket.on('end', () => {
      if (handled) return
      handled = true
      if (buffer.trim()) {
        this.process(socket, buffer)
      } else {
        socket.end()
      }
    })
  }

  private async process(socket: net.Socket, line: string): Promise<void> {
    const started = Date.now()
    let request: CliRequest | null = null
    try {
      request = JSON.parse(line)
    } catch {
      this.respond(socket, {
        ok: false,
        error: { code: 'USAGE', message: 'Malformed CLI request: expected one JSON object per line.' },
      }, null, started)
      return
    }

    const caller = new AbortController()
    const hangUp = () => caller.abort()
    // A client that half-closed to mark the end of its request is still listening.
    if (!socket.readableEnded) {
      socket.once('end', hangUp)
    }
    socket.once('close', hangUp)
    const context: CliCallContext = { client: clientInfo(request?.client), signal: caller.signal }
    const response = await this.call(request, context)
    socket.off('end', hangUp)
    socket.off('close', hangUp)
    this.respond(socket, response, request, started)
  }

  private async call(request: CliRequest, context: CliCallContext): Promise<CliResponse> {
    try {
      const method = typeof request?.method === 'string' ? this.funcs.get(request.method) : null
      if (!method) {
        throw new CliError('USAGE', `Unknown method "${request?.method}".`, {
          hint: `Methods: ${[...this.funcs.keys()].join(', ')}.`,
        })
      }
      const result = await method(request.params || {}, context)
      return { ok: true, result }
    } catch (error) {
      if (isCliError(error)) {
        return { ok: false, error: error.toPayload() }
      }
      log.error('CLI request failed', error)
      return { ok: false, error: { code: 'INTERNAL', message: error?.message ?? String(error) } }
    }
  }

  private respond(socket: net.Socket, response: CliResponse, request: CliRequest | null, started: number): void {
    let payload: string
    try {
      payload = JSON.stringify(response, (_key, value) => serializeBigInt(value))
    } catch (error) {
      response = {
        ok: false,
        error: { code: 'INTERNAL', message: `Could not serialize the response: ${error?.message ?? error}` },
      }
      payload = JSON.stringify(response)
    }
    if (!socket.destroyed) {
      socket.end(payload + '\n')
    }
    this.notify({ request, response, durationMs: Date.now() - started, responseBytes: Buffer.byteLength(payload) })
  }

  private notify(event: CliRequestEvent): void {
    try {
      this.emit('requestHandled', event)
    } catch (error) {
      log.warn('CLI request observer failed', error)
    }
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    this.started = false
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
    if (!server) {
      return
    }
    await new Promise<void>((resolve) => server.close(() => resolve()))
    this.removeSocketFile()
  }

  /** For process 'exit' handlers, where nothing asynchronous runs anymore. */
  stopSync(): void {
    const server = this.server
    this.server = null
    this.started = false
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
    // An instance that never listened must not delete the socket another instance is serving.
    if (!server) {
      return
    }
    try {
      server.close()
    } catch {
      // nothing to do, the process is going away
    }
    this.removeSocketFile()
  }

  private removeSocketFile(): void {
    const socketPath = this.options.socketPath
    if (isWindowsPipePath(socketPath)) return
    try {
      if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath)
    } catch (error) {
      log.warn(`Could not remove CLI socket ${socketPath}`, error)
    }
  }
}
