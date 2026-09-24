/**
 * @jest-environment node
 */

// resolvePagentExePath() is evaluated at ElectronFriendlyPageantAgent module
// load. Under TEST_MODE=1 it points at process.resourcesPath/vendor/pagent.exe
// which breaks the import. Stub platformInfo so it uses the repo-relative path
// (no file is actually launched in this unit test).
jest.mock('@/common/platform_info', () => ({
  __esModule: true,
  default: {
    env: { development: true, production: false },
    resourcesPath: '',
  },
}))

const capturedConfigs: any[] = []

// What the mocked ssh2 Client does once connect() is called. Defaults to a successful connection; individual tests override it to emit errors.
const mockConnectSuccess = (client: any) => setImmediate(() => client.emit('ready'))
let mockOnConnect = mockConnectSuccess

jest.mock('ssh2', () => {
  const actual = jest.requireActual('ssh2')
  const { EventEmitter } = require('events')
  class MockClient extends EventEmitter {
    connect(cfg: any) {
      capturedConfigs.push(cfg)
      mockOnConnect(this)
    }
    end() {}
  }
  return { ...actual, Client: MockClient }
})

import { BaseAgent } from 'ssh2'
import { SSHConnection } from '@/vendor/node-ssh-forward'

describe('SSHConnection Windows agent branch', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!
  const originalAuthSock = process.env.SSH_AUTH_SOCK

  beforeAll(() => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
  })
  afterAll(() => {
    Object.defineProperty(process, 'platform', originalPlatform)
    if (originalAuthSock === undefined) delete process.env.SSH_AUTH_SOCK
    else process.env.SSH_AUTH_SOCK = originalAuthSock
  })

  beforeEach(() => {
    capturedConfigs.length = 0
    delete process.env.SSH_AUTH_SOCK
  })

  // Regression test for #4093: agentDefault was being set to the class itself
  // instead of an instance, so ssh2's isAgent(val) => val instanceof BaseAgent
  // returned false and the agent was silently dropped.
  it('passes a BaseAgent instance (not a class) to ssh2 when agentForward is on and SSH_AUTH_SOCK is unset', async () => {
    const conn = new SSHConnection({
      endHost: '127.0.0.1',
      endPort: 22,
      username: 'x',
      agentForward: true,
      skipAutoPrivateKey: true,
      noReadline: true,
    })
    await conn.forward({ fromPort: 0, toPort: 22 })
    await conn.shutdown()

    expect(capturedConfigs).toHaveLength(1)
    const cfg = capturedConfigs[0]
    expect(cfg.agent).toBeDefined()
    // This is the exact check ssh2's internal isAgent() performs.
    expect(cfg.agent instanceof BaseAgent).toBe(true)
  })
})

// Regression tests #4661: when no agent is running (Pageant not started on windows)
describe('SSHConnection agent error handling', () => {
  const connectionOptions = {
    endHost: '127.0.0.1',
    endPort: 22,
    username: 'x',
    skipAutoPrivateKey: true,
    noReadline: true,
  }

  afterEach(() => {
    mockOnConnect = mockConnectSuccess
  })

  it('ignores a non-fatal agent error and connects', async () => {
    mockOnConnect = (client: any) => setImmediate(() => {
      const err: any = new Error('Failed to retrieve identities from agent')
      err.level = 'agent'
      client.emit('error', err)
      setImmediate(() => client.emit('ready'))
    })

    const conn = new SSHConnection(connectionOptions)
    await expect(conn.forward({ fromPort: 0, toPort: 22 })).resolves.toBeDefined()
    await conn.shutdown()
  })

  it('still rejects when authentication ultimately fails', async () => {
    mockOnConnect = (client: any) => setImmediate(() => {
      const err: any = new Error('All configured authentication methods failed')
      err.level = 'client-authentication'
      client.emit('error', err)
    })

    const conn = new SSHConnection(connectionOptions)
    await expect(conn.forward({ fromPort: 0, toPort: 22 }))
      .rejects.toThrow('All configured authentication methods failed')
    await conn.shutdown()
  })
})
