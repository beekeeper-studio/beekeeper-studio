import { DockerComposeEnvironment, Wait } from 'testcontainers'
import net from 'net'
import dns from 'dns'
import ConnectionProvider from '@commercial/backend/lib/connection-provider'
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'

/**
 * Reproduction of https://github.com/beekeeper-studio/beekeeper-studio/issues/1939
 *
 * Postgres is started with its port bound only to the IPv6 loopback. The
 * test runner can reach it via the literal address `::1` but not via
 * `127.0.0.1`. A connection to `localhost` therefore depends on whether the
 * stack falls back to IPv6 when the IPv4 lookup result is unreachable.
 */

const PORT = 54399

function probe(host: string, port: number, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    const done = (err?: Error) => {
      socket.destroy()
      err ? reject(err) : resolve()
    }
    socket.setTimeout(timeoutMs, () => done(new Error('probe timeout')))
    socket.once('error', done)
    socket.once('connect', () => done())
    socket.connect(port, host)
  })
}

describe('IPv6 connectivity (issue #1939)', () => {
  jest.setTimeout(dbtimeout)

  let environment: any
  let ipv6Available = false

  beforeAll(async () => {
    await TestOrmConnection.connect()

    // Skip the suite if the runner has no IPv6 loopback (some CI sandboxes).
    try {
      await new Promise<void>((resolve, reject) => {
        const s = net.createServer()
        s.once('error', reject)
        s.listen(0, '::1', () => {
          s.close(() => resolve())
        })
      })
      ipv6Available = true
    } catch {
      console.warn('IPv6 loopback unavailable on this host; skipping IPv6 suite')
      return
    }

    environment = await new DockerComposeEnvironment('tests/docker', 'ipv6.yml')
      .withWaitStrategy(
        'test_ipv6_postgres',
        Wait.forLogMessage('database system is ready to accept connections', 2)
      )
      .up()

    // Sanity: confirm postgres is reachable on ::1 and unreachable on
    // 127.0.0.1. If the docker daemon silently falls back to a dual-stack
    // bind, the rest of the suite can't tell us anything meaningful.
    await probe('::1', PORT)
    await expect(probe('127.0.0.1', PORT, 1500)).rejects.toBeDefined()
  })

  afterAll(async () => {
    if (environment) {
      await environment.down()
    }
    await TestOrmConnection.disconnect()
  })

  it('connects when the host is the IPv6 literal ::1', async () => {
    if (!ipv6Available) return

    const config = {
      connectionType: 'postgresql',
      host: '::1',
      port: PORT,
      user: 'postgres',
      password: 'example',
    }
    const connection = ConnectionProvider.for(config as any)
    const database = connection.createConnection('integration_test')
    try {
      await database.connect()
      const query = await database.query('select 1')
      await query.execute()
    } finally {
      await database.disconnect()
    }
  })

  it('connects when the host is a name that resolves only to AAAA', async () => {
    if (!ipv6Available) return

    // `ip6-localhost` is the conventional /etc/hosts entry that resolves only
    // to ::1. If it isn't present (some macOS / minimal images), fall back to
    // probing `localhost` which is dual-stack on most systems and lets us
    // observe whether the driver falls back to IPv6 when 127.0.0.1 fails.
    const candidates = ['ip6-localhost', 'localhost']
    let hostname: string | undefined
    for (const name of candidates) {
      try {
        const records = await dns.promises.lookup(name, { all: true })
        if (records.some((r) => r.family === 6)) {
          hostname = name
          break
        }
      } catch {
        // try the next candidate
      }
    }

    if (!hostname) {
      console.warn('No hostname resolves to ::1 on this host; skipping')
      return
    }

    const config = {
      connectionType: 'postgresql',
      host: hostname,
      port: PORT,
      user: 'postgres',
      password: 'example',
    }
    const connection = ConnectionProvider.for(config as any)
    const database = connection.createConnection('integration_test')
    try {
      // This is the failure mode reported in issue #1939: when a hostname
      // resolves only to an IPv6 record (or when the IPv4 result is
      // unreachable), the connection attempt errors with ENOTFOUND /
      // ECONNREFUSED instead of completing over IPv6.
      await database.connect()
      const query = await database.query('select 1')
      await query.execute()
    } finally {
      await database.disconnect()
    }
  })
})
