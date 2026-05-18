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

jest.mock('ssh2', () => {
  const actual = jest.requireActual('ssh2')
  const { EventEmitter } = require('events')
  class MockClient extends EventEmitter {
    connect(cfg: any) {
      capturedConfigs.push(cfg)
      setImmediate(() => this.emit('ready'))
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
