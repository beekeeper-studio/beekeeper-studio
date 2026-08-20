import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import BksConfig from '@/common/bksConfig'
import { dbtimeout } from '../../../../lib/db'
import { TcpProxy, settleWithin } from '../../../../lib/tcpProxy'

// The Postgres half of the dropped-connection work; see
// sqlserver-stale-connection.spec.ts for the same scenarios against SQL Server. Covers
// PostgresClient, and with it cockroach, redshift and greengage, which all take their pool
// settings from configurePool().
//
// A TCP proxy sits between the client and the container so a live connection can be broken
// the way a real network breaks it:
//
//   destroyExisting()   - hard close (FIN/RST). pg sees the socket close and reports it,
//                         so this is the case that surfaces as a lost connection.
//
//   blackholeExisting() - the flow is silently dropped: a stateful firewall / NAT / VPN
//                         expires the idle mapping, or the machine suspends and the peer is
//                         long gone by the time it wakes. No FIN, no RST, so both ends still
//                         believe the socket is open.
//
// pg is more exposed to the second case than mssql was: query_timeout and statement_timeout
// are both off by default, TCP keepalive is off, and pg-pool never checks a client before
// handing it out. So the query waited forever, the dead client stayed in the pool for the
// next query to inherit, and pool.end() could not finish either.

const PG_PASSWORD = 'example'

// Enough headroom that a busy CI runner is not mistaken for a wedged connection.
const SLACK_MS = 20000

const TEST_REQUEST_TIMEOUT = 3000

function makeConfig(port: number): IDbConnectionServerConfig {
  return {
    client: 'postgresql',
    host: '127.0.0.1',
    port,
    user: 'postgres',
    password: PG_PASSWORD,
    osUser: 'postgres',
    readOnlyMode: false,
  } as IDbConnectionServerConfig
}

describe('Postgres - recovering from a silently dropped connection', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let containerHost: string
  let containerPort: number
  let originalRequestTimeout: number

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_PASSWORD: PG_PASSWORD })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .withStartupTimeout(dbtimeout)
      .start()
    containerHost = container.getHost()
    containerPort = container.getMappedPort(5432)
  })

  afterAll(async () => {
    if (container) await container.stop()
  })

  beforeEach(() => {
    // configurePool() reads this when a connection is opened, so each test gets the
    // shortened value without touching the shipped default.
    originalRequestTimeout = BksConfig.db.postgres.requestTimeout
    BksConfig.db.postgres.requestTimeout = TEST_REQUEST_TIMEOUT
  })

  afterEach(() => {
    BksConfig.db.postgres.requestTimeout = originalRequestTimeout
  })

  async function connectThroughProxy() {
    const proxy = new TcpProxy(containerHost, containerPort)
    await proxy.listen()

    const server = createServer(makeConfig(proxy.port))
    const connection = server.createConnection('postgres')
    await connection.connect()

    const cleanup = async () => {
      await settleWithin(connection.disconnect(), SLACK_MS)
      await proxy.close()
    }

    return { proxy, server, connection, cleanup }
  }

  /** Issue a query nobody waits on, swallowing a late rejection. */
  function fireAndForget(promise: Promise<unknown>): Promise<unknown> {
    promise.catch(() => undefined)
    return promise
  }

  function expectConnectionLost(error: unknown) {
    const err = error as Error & { code?: string }
    expect(err.name).toBe('ConnectionLostError')
    expect(err.code).toBe('CONNECTION_LOST')
  }

  it('baseline: queries work through the proxy', async () => {
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const result = await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(result.rows[0].ok).toBe(1)
      expect(proxy.liveConnections).toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })

  it('reports a lost connection when an in-flight query is cut off', async () => {
    // A close pg can see. The query fails with something the app can act on rather than a
    // bare socket error, which is what raises the reconnect prompt.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(connection.driverExecuteSingle('SELECT pg_sleep(60)'))
      await settleWithin(inFlight, 1000)
      expect(proxy.destroyExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(inFlight, SLACK_MS)
      expect(outcome.state).toBe('rejected')
      if (outcome.state !== 'rejected') return
      expectConnectionLost(outcome.error)
    } finally {
      await cleanup()
    }
  })

  it('abandons an in-flight query when the network drops silently', async () => {
    // Nothing tells pg the socket is gone, so only the deadline ends this. Without
    // query_timeout it waited indefinitely -- the reporter's "no answer at all".
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(connection.driverExecuteSingle('SELECT pg_sleep(60)'))
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(inFlight, TEST_REQUEST_TIMEOUT + SLACK_MS)
      expect(outcome.state).toBe('rejected')
    } finally {
      await cleanup()
    }
  })

  it('does not hand the dropped connection to the next query', async () => {
    // pg-pool does not check a client before handing it out, so a client left waiting on a
    // reply that will never come would wedge every query after it. The next query has to
    // get a new connection instead -- the proxy leaves new ones alone, so it succeeds.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(connection.driverExecuteSingle('SELECT pg_sleep(60)'))
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)
      await settleWithin(inFlight, TEST_REQUEST_TIMEOUT + SLACK_MS)

      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), SLACK_MS)
      expect(after.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('disconnects while a query is wedged on a dropped connection', async () => {
    // Disconnect used to wait on the wedged query along with everything else, because
    // closing the pool waits for every client to be handed back.
    BksConfig.db.postgres.requestTimeout = 0 // nothing can end the query on its own

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(connection.driverExecuteSingle('SELECT pg_sleep(120)'))
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const disconnected = await settleWithin(connection.disconnect(), SLACK_MS)
      expect(disconnected.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('reconnects while a query is wedged on a dropped connection', async () => {
    BksConfig.db.postgres.requestTimeout = 0

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(connection.driverExecuteSingle('SELECT pg_sleep(120)'))
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const reconnected = await settleWithin(connection.connect(), SLACK_MS)
      expect(reconnected.state).toBe('resolved')

      // Retiring the old pool is what releases the stuck query. Skip it and the wedged
      // client lives on beside the new pool, still holding its socket.
      const released = await settleWithin(inFlight, SLACK_MS)
      expect(released.state).toBe('rejected')

      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), SLACK_MS)
      expect(after.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })
})
