// Regression test for https://github.com/beekeeper-studio/beekeeper-studio/issues/4358
//
// SSH tunnels over Tailscale stopped working in v5.8.0. Tailscale runs an
// embedded SSH server that authenticates the *tailnet identity* itself, so the
// connection is allowed without a key or password ("none"). v5.8.0 (commit
// 3c8a0913) started passing an explicit ssh2 `authHandler` built from the chosen
// mode. In Automatic/agent mode that list is ['agent'] and never includes
// 'none'. When the ssh-agent offers no usable key -- which is exactly the case
// for a Tailscale user, who has no SSH key for the host because Tailscale itself
// is the credential -- ssh2 exhausts the agent with no successful attempt and,
// because 'none' was never offered, fails with:
//   "SSH Tunnel Connection Error: All configured authentication methods failed".
// Before 5.8.0 no authHandler was set, so ssh2's default flow offered 'none' and
// the server accepted it.
//
// This test stands up a real Tailscale network (headscale control plane + two
// tailscale nodes, see headscaleHarness.ts) and connects through it in agent
// mode with a running-but-empty ssh-agent, exactly as an affected user would. It
// asserts the connection succeeds and a query runs. It is RED on the current
// code (auth fails) and goes GREEN once the tunnel also offers the 'none' method.
//
// This suite is intentionally NOT part of test:integration -- it needs docker,
// pulls Tailscale/headscale images, and waits for tailnet convergence. Run it
// explicitly with `yarn test:tailscale`.

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { dbtimeout } from '../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { startTailscaleHarness, TailscaleHarness } from './headscaleHarness'

// Agent mode reads the ssh-agent socket from platform_info.sshAuthSock; point it
// at the ephemeral agent we start below.
let mockSshAuthSock: string
jest.mock('@/common/platform_info', () => {
  const actual = jest.requireActual('@/common/platform_info')
  return {
    __esModule: true,
    default: new Proxy(actual.default, {
      get(target, prop) {
        if (prop === 'sshAuthSock') return mockSshAuthSock
        return target[prop]
      },
    }),
  }
})

const ConnectionProvider = require('@commercial/backend/lib/connection-provider').default

describe('Tailscale SSH Tunnel (#4358)', () => {
  jest.setTimeout(dbtimeout * 3)

  let harness: TailscaleHarness
  let database: any
  let workDir: string
  let agentPid: number | undefined
  let originalHome: string | undefined

  beforeAll(async () => {
    await TestOrmConnection.connect()

    // Ephemeral ssh-agent with NO keys added. This is the crux of #4358: a
    // Tailscale user has no SSH key for the host (Tailscale is the credential),
    // so the agent offers nothing. Agent mode requires the agent socket to be
    // present (so haveAgent is true and authHandler becomes ['agent']), but the
    // empty agent yields no successful attempt. Deliberately no `ssh-add`.
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-tailscale-'))

    const sock = path.join(workDir, 'agent.sock')
    const agentOut = execSync(`ssh-agent -a "${sock}"`).toString()
    const m = agentOut.match(/SSH_AGENT_PID=(\d+)/)
    if (!m) throw new Error(`Failed to start ssh-agent: ${agentOut}`)
    agentPid = Number(m[1])
    mockSshAuthSock = sock

    // Empty fake HOME so connection-provider's ~/.ssh/config lookup is a no-op.
    const fakeHome = path.join(workDir, 'home')
    fs.mkdirSync(path.join(fakeHome, '.ssh'), { recursive: true })
    originalHome = process.env.HOME
    process.env.HOME = fakeHome

    harness = await startTailscaleHarness()

    const config = {
      connectionType: 'postgresql',
      host: harness.dbHost,
      port: harness.dbPort,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      // Automatic / agent mode -- the default, and what affected users hit.
      sshMode: 'agent',
      sshHost: harness.sshHost,
      sshPort: harness.sshPort,
      // Any tailnet user permitted by the SSH ACL; "root" is in the policy.
      sshUsername: 'root',
    }

    const connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  it('connects through a Tailscale (none-auth) SSH tunnel and runs a query', async () => {
    const query = await database.query('select 1')
    await query.execute()
  })

  afterAll(async () => {
    if (database) {
      try { await database.disconnect() } catch { /* ignore */ }
    }
    if (harness) {
      await harness.stop()
    }
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
    if (agentPid) {
      try { process.kill(agentPid) } catch { /* ignore */ }
    }
    if (workDir && fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true })
    }
    await TestOrmConnection.disconnect()
  })
})
