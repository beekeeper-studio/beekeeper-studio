import fs from 'fs'
import net from 'net'
import { CliRequestEvent } from './auditLog'
import { CliCallContext, clientInfo } from './commands'
import { CancelError, Request, Reply, isCliError, isWindowsPipePath } from '@beekeeperstudio/cli'
import { UnknownMethodError } from '@/rpc/RpcServer'
import { EventEmitter } from '@/common/EventEmitter'
import { uuidv4 } from '@/lib/uuid'
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
type CliMethod = (...args: any[]) => unknown

export class CliServer extends EventEmitter<CliServerEventMap> {
  private readonly handlers = new Map<string, CliMethod>()
  private readonly runningRequests = new Map<string, AbortController>()
  private server: net.Server | null = null
  private started = false
  private readonly sockets = new Set<net.Socket>()
  private readonly maxRequestBytes: number

  constructor(private readonly options: CliServerOptions) {
    super()
    this.maxRequestBytes = options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES
    this.handleConnection = this.handleConnection.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  register(name: string, handler: CliMethod): void {
    this.handlers.set(name, handler)
  }

  /** Removes the handler only if it is still the one registered under `name`. */
  unregister(name: string, handler: CliMethod): void {
    if (this.handlers.get(name) === handler) {
      this.handlers.delete(name)
    }
  }

  /** Aborts the signal of the request with this id, if it is still running. */
  cancel(id: string): void {
    this.runningRequests.get(id)?.abort()
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
          id: null,
          type: 'error',
          error: `Request is larger than ${this.maxRequestBytes} bytes.`,
          errorCode: 'USAGE',
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
    let request: Request | null = null
    try {
      request = JSON.parse(line)
    } catch {
      this.respond(socket, {
        id: null,
        type: 'error',
        error: 'Malformed CLI request: expected one JSON object per line.',
        errorCode: 'USAGE',
      }, null, started)
      return
    }

    if (request && request.id === undefined && request.name === '$/cancel') {
      const args = request.args as { id: string }
      this.cancel(args?.id)
      socket.end()
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
    const response = await this.dispatch(request, context)
    socket.off('end', hangUp)
    socket.off('close', hangUp)
    this.respond(socket, response, request, started)
  }

  private async dispatch(request: Request, context: CliCallContext): Promise<Reply> {
    const id = request?.id ?? null
    try {
      const data = await this.call(request?.id ?? uuidv4(), request?.name, request?.args || {}, context)
      return { id, type: 'reply', data }
    } catch (error) {
      if (error instanceof UnknownMethodError) {
        return { id, type: 'error', error: error.message, errorName: error.name, errorCode: 'USAGE' }
      }
      if (isCliError(error)) {
        return {
          id,
          type: 'error',
          error: error.message,
          errorName: error.name,
          errorCode: error.code,
          errorHint: error.hint,
          errorDetail: error.details,
        }
      }
      if (error instanceof CancelError) {
        return { id, type: 'error', error: error.message, errorName: error.name }
      }
      log.error('CLI request failed', error)
      return { id, type: 'error', error: error?.message ?? String(error), errorName: error?.name, errorCode: 'INTERNAL' }
    }
  }

  private respond(socket: net.Socket, response: Reply, request: Request | null, started: number): void {
    let payload: string
    try {
      payload = JSON.stringify(response, (_key, value) => serializeBigInt(value))
    } catch (error) {
      response = {
        id: response.id,
        type: 'error',
        error: `Could not serialize the response: ${error?.message ?? error}`,
        errorCode: 'INTERNAL',
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

  /**
   * Runs the handler registered under `name` with `args`, plus a last
   * argument: a signal that `cancel(id)` aborts.
   */
  private async call(
    id: string,
    name: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const handler = this.handlers.get(name)
    if (!handler) {
      const methods = [...this.handlers.keys()]
      throw new UnknownMethodError(name, methods)
    }
    const controller = new AbortController()
    this.runningRequests.set(id, controller)
    // The handler may ignore the signal, so stop waiting on it once aborted
    const cancelled = Promise.withResolvers<never>()
    controller.signal.addEventListener(
      'abort',
      cancelled.reject.bind(null, new CancelError(id)),
      { once: true },
    )
    try {
      const result = await Promise.race([
        handler(...args, controller.signal),
        cancelled.promise,
      ])
      return result
    } finally {
      this.runningRequests.delete(id)
    }
  }
}
