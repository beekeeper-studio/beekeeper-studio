// Force resolvePagentExePath() down its repo-relative branch. Under TEST_MODE=1
// mainPlatformInfo.ts pins env.development=false, which would resolve pagent.exe
// under process.resourcesPath — wrong when running via jest.
jest.mock('@/common/platform_info', () => ({
  __esModule: true,
  default: {
    env: { development: true, production: false },
    resourcesPath: '',
  },
}))

import { SSHConnection } from '@/vendor/node-ssh-forward'

const enabled = process.platform === 'win32' && process.env.PAGEANT_TEST === '1'
const describeFn = enabled ? describe : describe.skip

// ssh2's Client can emit 'error' (usually ECONNRESET) asynchronously during
// teardown, after SSHConnection.shutdown() has already called removeAllListeners
// on the Client. With no handler, Node crashes the process. Swallow those
// specific late errors but rethrow anything else.
const swallowLateEconnreset = (err) => {
  if (err && err.code === 'ECONNRESET') return
  throw err
}
process.on('uncaughtException', swallowLateEconnreset)

describeFn('Pageant SSH agent forwarding (Windows)', () => {
  jest.setTimeout(60000)
  let conn

  afterEach(async () => {
    if (conn) {
      await conn.shutdown()
      conn = null
    }
    // Give ssh2's socket a beat to emit any late 'error' so our handler
    // absorbs it before jest tears down the worker.
    await new Promise((resolve) => setTimeout(resolve, 200))
  })

  it('authenticates via Pageant when SSH_AUTH_SOCK is unset', async () => {
    delete process.env.SSH_AUTH_SOCK
    conn = new SSHConnection({
      endHost: '127.0.0.1',
      endPort: 22,
      username: process.env.USERNAME,
      agentForward: true,
      skipAutoPrivateKey: true,
      noReadline: true,
    })
    await conn.forward({ fromPort: 0, toPort: 22 })
  })
})
