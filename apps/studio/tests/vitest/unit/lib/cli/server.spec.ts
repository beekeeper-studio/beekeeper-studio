import { describe, it, expect, afterEach, vi } from 'vitest'
import fs from 'fs'
import net from 'net'
import os from 'os'
import path from 'path'
import { CliServer, probeSocket } from '@/lib/cli/server'
import { CLI_EXIT_ERROR, CLI_EXIT_OK, CLI_EXIT_USAGE, CliClientIO, runCli, sendCliRequest } from '@/cli/client'
import { CLI_PROTOCOL_VERSION, CliRequest, CliResponse } from '@/cli/protocol'

const isWindows = process.platform === 'win32'

let counter = 0
function tempSocketPath(): string {
  counter += 1
  // windows has no socket files: use a named pipe, like the app does
  if (isWindows) return `\\\\.\\pipe\\bks-cli-test-${process.pid}-${counter}`
  // keep it short: unix socket paths are limited to ~100 bytes
  return path.join(os.tmpdir(), `bks-cli-test-${process.pid}-${counter}.sock`)
}

function echoHandler(request: CliRequest): Promise<CliResponse> {
  return Promise.resolve({ ok: true, result: { echoed: request } })
}

function fakeIO() {
  const out: string[] = []
  const err: string[] = []
  const io: CliClientIO = {
    writeOut: (text) => { out.push(text) },
    writeErr: (text) => { err.push(text) },
    readFile: async (file) => `-- from ${file}\nselect 1`,
    readStdin: async () => 'select 2',
  }
  return { io, stdout: () => out.join(''), stderr: () => err.join('') }
}

const servers: CliServer[] = []
function createServer(options: Partial<ConstructorParameters<typeof CliServer>[0]> = {}): CliServer {
  const server = new CliServer({ socketPath: tempSocketPath(), handler: echoHandler, ...options })
  servers.push(server)
  return server
}

afterEach(async () => {
  while (servers.length) {
    await servers.pop().stop()
  }
})

describe('CliServer', () => {
  it('answers a request and removes its socket on stop', async () => {
    const server = createServer()
    expect(await server.start()).toBe(true)
    expect(server.listening).toBe(true)
    if (!isWindows) expect(fs.existsSync(server.socketPath)).toBe(true)

    const request: CliRequest = { version: CLI_PROTOCOL_VERSION, command: 'list-schemas', args: { schema: 'public' } }
    const response = await sendCliRequest(server.socketPath, request, 5000)
    expect(response).toEqual({ ok: true, result: { echoed: request } })

    const socketPath = server.socketPath
    await server.stop()
    expect(server.listening).toBe(false)
    if (!isWindows) expect(fs.existsSync(socketPath)).toBe(false)
  })

  it.skipIf(isWindows)('restricts the socket to the current user', async () => {
    const server = createServer()
    await server.start()
    const mode = fs.statSync(server.socketPath).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it.skipIf(isWindows)('replaces a stale socket file but not a live one', async () => {
    const socketPath = tempSocketPath()
    fs.writeFileSync(socketPath, '')
    expect(await probeSocket(socketPath)).toBe(false)

    const first = createServer({ socketPath })
    expect(await first.start()).toBe(true)
    expect(await probeSocket(socketPath)).toBe(true)

    const second = createServer({ socketPath })
    expect(await second.start()).toBe(false)
    expect(second.listening).toBe(false)

    // the first server still answers
    const response = await sendCliRequest(socketPath, { version: 1, command: 'connections', args: {} }, 5000)
    expect(response.ok).toBe(true)
  })

  it('refuses to start twice on the same address and leaves the first server running', async () => {
    // the pipe/socket variant of the stale-file test, valid on every platform
    const first = createServer()
    expect(await first.start()).toBe(true)
    const second = createServer({ socketPath: first.socketPath })
    expect(await second.start()).toBe(false)
    const response = await sendCliRequest(first.socketPath, { version: 1, command: 'connections', args: {} }, 5000)
    expect(response.ok).toBe(true)
  })

  it('rejects malformed requests without crashing', async () => {
    const server = createServer()
    await server.start()

    const reply = await new Promise<string>((resolve, reject) => {
      const socket = net.createConnection(server.socketPath)
      let buffer = ''
      socket.setEncoding('utf8')
      socket.on('connect', () => socket.write('this is not json\n'))
      socket.on('data', (chunk: string) => { buffer += chunk })
      socket.on('end', () => resolve(buffer))
      socket.on('error', reject)
    })
    const response = JSON.parse(reply) as CliResponse
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('USAGE')

    // still serving
    const ok = await sendCliRequest(server.socketPath, { version: 1, command: 'connections', args: {} }, 5000)
    expect(ok.ok).toBe(true)
  })

  it('answers a request that ends without a newline', async () => {
    const server = createServer()
    await server.start()
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = net.createConnection(server.socketPath)
      let buffer = ''
      socket.setEncoding('utf8')
      socket.on('connect', () => socket.end(JSON.stringify({ version: 1, command: 'connections', args: {} })))
      socket.on('data', (chunk: string) => { buffer += chunk })
      socket.on('end', () => resolve(buffer))
      socket.on('error', reject)
    })
    expect(JSON.parse(reply).ok).toBe(true)
  })

  it('reports every handled request to the observer', async () => {
    const events = []
    const server = createServer({ onRequestHandled: (event) => { events.push(event) } })
    await server.start()

    const request: CliRequest = { version: CLI_PROTOCOL_VERSION, command: 'query', args: { sql: 'select 1' } }
    const response = await sendCliRequest(server.socketPath, request, 5000)
    expect(events).toHaveLength(1)
    expect(events[0].request).toEqual(request)
    expect(events[0].response).toEqual(response)
    expect(events[0].durationMs).toBeGreaterThanOrEqual(0)
    expect(events[0].responseBytes).toBe(Buffer.byteLength(JSON.stringify(response)))

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection(server.socketPath)
      // without a reader the socket never reaches 'end', and so never 'close'
      socket.resume()
      socket.on('connect', () => socket.end('nope\n'))
      socket.on('close', () => resolve())
      socket.on('error', reject)
    })
    expect(events).toHaveLength(2)
    expect(events[1].request).toBeNull()
    expect(events[1].response.ok).toBe(false)
  })

  it('keeps serving when the observer throws', async () => {
    const server = createServer({ onRequestHandled: () => { throw new Error('observer broke') } })
    await server.start()
    const response = await sendCliRequest(server.socketPath, { version: 1, command: 'connections', args: {} }, 5000)
    expect(response.ok).toBe(true)
  })

  it('turns handler failures into error responses', async () => {
    const server = createServer({ handler: () => Promise.reject(new Error('boom')) })
    await server.start()
    const response = await sendCliRequest(server.socketPath, { version: 1, command: 'connections', args: {} }, 5000)
    expect(response).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'boom' } })
  })
})

describe('runCli', () => {
  it('prints json results from a live server', async () => {
    const server = createServer({
      handler: async () => ({ ok: true, result: { connection: { id: 's', name: 'Dev' }, schemas: ['public', 'audit'] } }),
    })
    await server.start()
    const { io, stdout, stderr } = fakeIO()
    const code = await runCli(['list-schemas'], { socketPath: server.socketPath, io })
    expect(code).toBe(CLI_EXIT_OK)
    expect(stderr()).toBe('')
    expect(JSON.parse(stdout())).toEqual({ connection: { id: 's', name: 'Dev' }, schemas: ['public', 'audit'] })
  })

  it('renders markdown when asked', async () => {
    const send = vi.fn(async () => ({
      ok: true as const,
      result: {
        connection: { id: 's', name: 'Dev' },
        results: [{ command: 'SELECT', columns: ['id', 'note'], rows: [{ id: 1, note: 'a|b' }], rowCount: 1, totalRowCount: 1, truncated: false, maxRows: 20000, affectedRows: null }],
      },
    }))
    const { io, stdout } = fakeIO()
    const code = await runCli(['query', 'select 1', '--format', 'markdown'], { socketPath: '/nowhere', io, send })
    expect(code).toBe(CLI_EXIT_OK)
    expect(stdout()).toContain('Connection: Dev')
    expect(stdout()).toContain('| id | note |')
    expect(stdout()).toContain('a\\|b')
    expect(send).toHaveBeenCalledWith('/nowhere', expect.objectContaining({ command: 'query', args: { sql: 'select 1' } }), 0)
  })

  it('reads sql from a file or stdin before sending', async () => {
    const send = vi.fn(async () => ({ ok: true as const, result: { connection: { id: 's', name: 'Dev' }, results: [] } }))
    const { io } = fakeIO()
    await runCli(['query', '--file', 'report.sql'], { socketPath: '/nowhere', io, send })
    expect(send.mock.calls[0][1].args.sql).toBe('-- from report.sql\nselect 1')
    await runCli(['query', '-'], { socketPath: '/nowhere', io, send })
    expect(send.mock.calls[1][1].args.sql).toBe('select 2')
  })

  it('explains when the app is not running', async () => {
    const { io, stdout, stderr } = fakeIO()
    const code = await runCli(['list-tables'], { socketPath: tempSocketPath(), io })
    expect(code).toBe(CLI_EXIT_ERROR)
    expect(stdout()).toBe('')
    expect(stderr()).toContain('Beekeeper Studio is not running')
    expect(stderr()).toContain('connect to a database')
  })

  it('prints server errors with their hints and the open connections', async () => {
    const send = vi.fn(async () => ({
      ok: false as const,
      error: {
        code: 'CLI_DISABLED' as const,
        message: 'CLI access is not enabled for the open connection "Prod".',
        hint: 'Check "Enable CLI Access".',
        details: { connections: [{ id: 'abc', name: 'Prod', connectionType: 'postgresql', cliEnabled: false, readOnlyMode: true }] },
      },
    }))
    const { io, stdout, stderr } = fakeIO()
    const code = await runCli(['list-tables'], { socketPath: '/nowhere', io, send })
    expect(code).toBe(CLI_EXIT_ERROR)
    expect(stdout()).toBe('')
    expect(stderr()).toContain('Error (CLI_DISABLED): CLI access is not enabled')
    expect(stderr()).toContain('Check "Enable CLI Access".')
    expect(stderr()).toContain('Prod [postgresql] id=abc (CLI disabled, read only)')
  })

  it('reports usage problems without contacting the app', async () => {
    const send = vi.fn()
    const { io, stdout, stderr } = fakeIO()
    expect(await runCli(['bogus'], { socketPath: '/nowhere', io, send })).toBe(CLI_EXIT_USAGE)
    expect(stderr()).toContain('Unknown command "bogus"')
    expect(stderr()).toContain('Usage: bks <command>')
    expect(send).not.toHaveBeenCalled()

    expect(await runCli(['--help'], { socketPath: '/nowhere', io, send })).toBe(CLI_EXIT_OK)
    expect(stdout()).toContain('Usage: bks <command>')
  })
})
