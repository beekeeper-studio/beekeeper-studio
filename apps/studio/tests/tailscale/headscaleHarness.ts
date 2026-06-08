// Test harness that stands up a self-hosted Tailscale network (headscale control
// plane + two tailscale nodes) used to reproduce issue #4358.
//
// Topology (all on one docker network):
//
//   headscale   - control plane (embedded DERP, sqlite, file ACL policy)
//   postgres    - the database the SSH tunnel ultimately forwards to
//   ts-node     - tailscale node running Tailscale SSH (`tailscale up --ssh`).
//                 Tagged tag:node, so the ACL offers passwordless `none` auth.
//   ts-client   - tailscale node acting as the entry point onto the tailnet.
//                 A busybox `nc` listener bridges its published port to
//                 `tailscale nc <ts-node-ip> 22`, so the jest process on the
//                 host (which is NOT on the tailnet) can reach ts-node's
//                 Tailscale SSH server.
//
// Auth path under test:
//   host -> ts-client:2222 (published) -> tailnet -> ts-node Tailscale SSH
//        -> (after auth) direct-tcpip forward -> postgres:5432
//
// Tailscale runs in userspace-networking mode so no /dev/net/tun device or
// elevated capabilities are required.

import * as path from 'path'
import { GenericContainer, Network, Wait, StartedTestContainer, StartedNetwork } from 'testcontainers'

// This is an opt-in suite that always cleans up after itself (see stop()), and
// the testcontainers reaper image (testcontainers/ryuk) lives on a rate-limited
// registry. Disable it unless the caller already chose a value.
if (process.env.TESTCONTAINERS_RYUK_DISABLED === undefined) {
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true'
}

const HEADSCALE_IMAGE = process.env.BKS_HEADSCALE_IMAGE || 'ghcr.io/juanfont/headscale:0.26.1'
const TAILSCALE_IMAGE = process.env.BKS_TAILSCALE_IMAGE || 'ghcr.io/tailscale/tailscale:latest'
const POSTGRES_IMAGE = process.env.BKS_POSTGRES_IMAGE || 'postgres:13'

const HEADSCALE_DIR = path.resolve(__dirname, '../docker/headscale')

export interface TailscaleHarness {
  /** Host the published bridge port is reachable on. */
  sshHost: string
  /** Host port mapped to ts-client's bridge (forwards to ts-node Tailscale SSH). */
  sshPort: number
  /** Hostname (docker network alias) of the database, as seen from ts-node. */
  dbHost: string
  dbPort: number
  stop: () => Promise<void>
}

async function execOrThrow(container: StartedTestContainer, cmd: string[], what: string): Promise<string> {
  const res = await container.exec(cmd)
  if (res.exitCode !== 0) {
    throw new Error(`${what} failed (exit ${res.exitCode}): ${res.output}`)
  }
  return res.output
}

function parsePreauthKey(output: string): string {
  const match = output.match(/\b[a-f0-9]{48}\b/)
  if (!match) {
    throw new Error(`Could not parse pre-auth key from headscale output: ${output}`)
  }
  return match[0]
}

/** Poll the bridge until ts-node's Tailscale SSH server answers with a banner. */
async function waitForSshBanner(tsClient: StartedTestContainer, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let last = ''
  while (Date.now() < deadline) {
    const res = await tsClient.exec(['sh', '-c', '(sleep 2) | nc 127.0.0.1 2222 2>/dev/null | head -c 30'])
    last = res.output || ''
    if (last.includes('SSH-2.0')) return
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`Tailscale SSH never became reachable through the bridge. Last banner attempt: ${JSON.stringify(last)}`)
}

export async function startTailscaleHarness(): Promise<TailscaleHarness> {
  const startupTimeout = 180_000
  const network = await new Network().start()
  const started: StartedTestContainer[] = []

  const stop = async () => {
    for (const c of started.reverse()) {
      try { await c.stop() } catch { /* ignore */ }
    }
    try { await network.stop() } catch { /* ignore */ }
  }

  try {
    // 1. Control plane.
    const headscale = await new GenericContainer(HEADSCALE_IMAGE)
      .withNetwork(network)
      .withNetworkAliases('headscale')
      .withBindMounts([
        { source: path.join(HEADSCALE_DIR, 'config.yaml'), target: '/etc/headscale/config.yaml', mode: 'ro' },
        { source: path.join(HEADSCALE_DIR, 'policy.hujson'), target: '/etc/headscale/policy.hujson', mode: 'ro' },
      ])
      .withCommand(['serve'])
      .withWaitStrategy(Wait.forLogMessage('listening and serving HTTP'))
      .withStartupTimeout(startupTimeout)
      .start()
    started.push(headscale)

    // Create the user and two pre-auth keys. ts-node's key carries tag:node so
    // the SSH ACL matches it; ts-client's key is a plain tailnet member.
    await execOrThrow(headscale, ['headscale', 'users', 'create', 'test'], 'create user')
    const usersJson = await execOrThrow(headscale, ['headscale', 'users', 'list', '-o', 'json'], 'list users')
    const users = JSON.parse(usersJson)
    const user = users.find((u: { name: string }) => u.name === 'test')
    if (!user) throw new Error(`User "test" not found in: ${usersJson}`)
    const userId = String(user.id)

    const nodeKey = parsePreauthKey(await execOrThrow(
      headscale,
      ['headscale', 'preauthkeys', 'create', '--user', userId, '--reusable', '--tags', 'tag:node', '--expiration', '24h'],
      'create node pre-auth key',
    ))
    const clientKey = parsePreauthKey(await execOrThrow(
      headscale,
      ['headscale', 'preauthkeys', 'create', '--user', userId, '--reusable', '--expiration', '24h'],
      'create client pre-auth key',
    ))

    // 2. The database the tunnel forwards to.
    const postgres = await new GenericContainer(POSTGRES_IMAGE)
      .withNetwork(network)
      .withNetworkAliases('postgres')
      .withEnvironment({
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'example',
        POSTGRES_DB: 'integration_test',
      })
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .withStartupTimeout(startupTimeout)
      .start()
    started.push(postgres)

    // 3. Tailscale SSH target.
    const tsNode = await new GenericContainer(TAILSCALE_IMAGE)
      .withNetwork(network)
      .withNetworkAliases('ts-node')
      .withEnvironment({
        TS_AUTHKEY: nodeKey,
        TS_USERSPACE: 'true',
        TS_EXTRA_ARGS: '--login-server=http://headscale:8080 --hostname=ts-node --ssh',
      })
      .withWaitStrategy(Wait.forLogMessage('Startup complete'))
      .withStartupTimeout(startupTimeout)
      .start()
    started.push(tsNode)

    // 4. Tailnet entry point reachable from the host.
    const tsClient = await new GenericContainer(TAILSCALE_IMAGE)
      .withNetwork(network)
      .withNetworkAliases('ts-client')
      .withExposedPorts(2222)
      .withEnvironment({
        TS_AUTHKEY: clientKey,
        TS_USERSPACE: 'true',
        TS_EXTRA_ARGS: '--login-server=http://headscale:8080 --hostname=ts-client',
      })
      .withWaitStrategy(Wait.forLogMessage('Startup complete'))
      .withStartupTimeout(startupTimeout)
      .start()
    started.push(tsClient)

    // ts-node's tailnet IP. MagicDNS name resolution is unreliable from
    // `tailscale nc` in userspace mode, so dial the address directly.
    const nodeIp = (await execOrThrow(tsNode, ['tailscale', 'ip', '-4'], 'get ts-node ip')).trim().split(/\s+/)[0]

    // Bridge: published 2222 -> tailnet -> ts-node:22. busybox `nc -lk -e` pipes
    // each inbound connection through `tailscale nc`, which dials the tailnet via
    // tailscaled's userspace netstack. setsid detaches it so it survives the exec.
    await execOrThrow(tsClient, [
      'sh', '-c',
      `setsid nc -lk -p 2222 -e tailscale nc ${nodeIp} 22 >/tmp/bridge.log 2>&1 </dev/null & sleep 1; echo bridge-started`,
    ], 'start ssh bridge')

    // Wait until the whole path (bridge + tailnet + Tailscale SSH + ACL) is live.
    await waitForSshBanner(tsClient, 60_000)

    return {
      sshHost: tsClient.getHost(),
      sshPort: tsClient.getMappedPort(2222),
      dbHost: 'postgres',
      dbPort: 5432,
      stop,
    }
  } catch (err) {
    await stop()
    throw err
  }
}
