import fs from 'fs'
import net from 'net'
import { CliRequest, CliResponse } from './protocol'
import { isWindowsPipePath } from './socketPath'

export interface CliServerLogger {
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

export interface CliServerOptions {
  socketPath: string
  handler: (request: CliRequest) => Promise<CliResponse>
  log?: CliServerLogger
  /** A request line longer than this is rejected. SQL text is the only sizeable input. */
  maxRequestBytes?: number
}

const DEFAULT_MAX_REQUEST_BYTES = 16 * 1024 * 1024

const silentLog: CliServerLogger = { info() {}, warn() {}, error() {} }

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
export class CliServer {
  private server: net.Server | null = null
  private readonly sockets = new Set<net.Socket>()
  private readonly log: CliServerLogger
  private readonly maxRequestBytes: number

  constructor(private readonly options: CliServerOptions) {
    this.log = options.log ?? silentLog
    this.maxRequestBytes = options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES
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
   */
  async start(): Promise<boolean> {
    if (this.server) return true
    const socketPath = this.options.socketPath

    if (!isWindowsPipePath(socketPath)) {
      await this.removeStaleSocketFile()
    }

    // allowHalfOpen: a client may send its request and close its writing side
    // before the reply is ready; the reply still has to go out.
    const server = net.createServer({ allowHalfOpen: true }, (socket) => this.handleConnection(socket))
    server.on('error', (error) => this.log.error('CLI socket server error', error))

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
        this.log.warn(`Another Beekeeper Studio instance is serving the CLI at ${socketPath}`)
        return false
      }
      throw error
    }

    if (!isWindowsPipePath(socketPath)) {
      // Only the user who runs the app gets to talk to its database connections.
      try {
        fs.chmodSync(socketPath, 0o600)
      } catch (error) {
        this.log.warn(`Could not restrict permissions on ${socketPath}`, error)
      }
    }

    this.server = server
    this.log.info(`CLI listening at ${socketPath}`)
    return true
  }

  private async removeStaleSocketFile(): Promise<void> {
    const socketPath = this.options.socketPath
    if (!fs.existsSync(socketPath)) return
    // A file left behind by a crashed instance blocks listen() with EADDRINUSE,
    // but so does a live instance. Only remove it when nothing answers.
    if (await probeSocket(socketPath)) return
    try {
      fs.unlinkSync(socketPath)
      this.log.info(`Removed stale CLI socket ${socketPath}`)
    } catch (error) {
      this.log.warn(`Could not remove stale CLI socket ${socketPath}`, error)
    }
  }

  private handleConnection(socket: net.Socket): void {
    this.sockets.add(socket)
    socket.on('close', () => this.sockets.delete(socket))
    socket.on('error', (error) => this.log.warn('CLI client socket error', error?.message ?? error))
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
        })
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
    let request: CliRequest
    try {
      request = JSON.parse(line)
    } catch {
      this.respond(socket, {
        ok: false,
        error: { code: 'USAGE', message: 'Malformed CLI request: expected one JSON object per line.' },
      })
      return
    }

    let response: CliResponse
    try {
      response = await this.options.handler(request)
    } catch (error) {
      this.log.error('CLI request failed', error)
      response = { ok: false, error: { code: 'INTERNAL', message: error?.message ?? String(error) } }
    }
    this.respond(socket, response)
  }

  private respond(socket: net.Socket, response: CliResponse): void {
    if (socket.destroyed) return
    let payload: string
    try {
      payload = JSON.stringify(response)
    } catch (error) {
      payload = JSON.stringify({
        ok: false,
        error: { code: 'INTERNAL', message: `Could not serialize the response: ${error?.message ?? error}` },
      })
    }
    socket.end(payload + '\n')
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    this.removeSocketFile()
  }

  /** For process 'exit' handlers, where nothing asynchronous runs anymore. */
  stopSync(): void {
    const server = this.server
    this.server = null
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
    try {
      server?.close()
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
      this.log.warn(`Could not remove CLI socket ${socketPath}`, error)
    }
  }
}
