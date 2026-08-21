import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import BksConfig from '@/common/bksConfig'
import { dbtimeout } from '../../../../lib/db'
import { TcpProxy, settleWithin } from '../../../../lib/tcpProxy'

// The Firebird half of the dropped-connection work; see sqlserver-stale-connection.spec.ts
// for the same scenarios against SQL Server. This is also the coverage for
// underRequestDeadline(), the shared fallback used by the drivers that offer no timeout of
// their own -- Firebird, SQL Anywhere and Trino.
//
// A TCP proxy sits between the client and the container so a live connection can be broken
// the way a real network breaks it:
//
//   destroyExisting()   - hard close (FIN/RST). node-firebird sees the socket close.
//
//   blackholeExisting() - the flow is silently dropped: a stateful firewall / NAT / VPN
//                         expires the idle mapping, or the machine suspends and the peer is
//                         long gone by the time it wakes. No FIN, no RST, so both ends still
//                         believe the socket is open.
//
// node-firebird has no query timeout and its pool hands a connection straight back out on
// detach, so before this the query waited forever and the dead connection was reused by
// whatever ran next.

const FIREBIRD_PASSWORD = 'masterkey'

// Enough headroom that a busy CI runner is not mistaken for a wedged connection.
const SLACK_MS = 20000

const TEST_REQUEST_TIMEOUT = 3000

function makeConfig(port: number): IDbConnectionServerConfig {
  return {
    client: 'firebird',
    host: '127.0.0.1',
    port,
    user: 'sysdba',
    password: FIREBIRD_PASSWORD,
    osUser: null,
    ssh: null,
    sslCaFile: null,
    sslCertFile: null,
    sslKeyFile: null,
    sslRejectUnauthorized: false,
    ssl: false,
    domain: null,
    socketPath: null,
    socketPathEnabled: false,
    readOnlyMode: false,
  } as IDbConnectionServerConfig
}

describe('Firebird - recovering from a silently dropped connection', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let containerHost: string
  let containerPort: number
  let originalRequestTimeout: number

  beforeAll(async () => {
    container = await new GenericContainer('firebirdsql/firebird:4.0.1')
      .withEnvironment({
        ISC_PASSWORD: FIREBIRD_PASSWORD,
        FIREBIRD_DATABASE: 'defaultdb.fdb',
        FIREBIRD_USE_LEGACY_AUTH: 'true',
      })
      .withExposedPorts(3050)
      .withWaitStrategy(Wait.forHealthCheck())
      .withHealthCheck({
        /* eslint-disable-next-line */
        test: ['CMD-SHELL', `(echo "select 1 as a from rdb\$database;" | /opt/firebird/bin/isql -user sysdba -password ${FIREBIRD_PASSWORD}) || exit 1`],
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000,
      })
      .withStartupTimeout(dbtimeout)
      .start()
    containerHost = container.getHost()
    containerPort = container.getMappedPort(3050)
  })

  afterAll(async () => {
    if (container) await container.stop()
  })

  beforeEach(() => {
    // rawExecuteQuery() reads this per statement, so each test gets the shortened value
    // without touching the shipped default.
    originalRequestTimeout = BksConfig.db.firebird.requestTimeout
    BksConfig.db.firebird.requestTimeout = TEST_REQUEST_TIMEOUT
  })

  afterEach(() => {
    BksConfig.db.firebird.requestTimeout = originalRequestTimeout
  })

  async function connectThroughProxy() {
    const proxy = new TcpProxy(containerHost, containerPort)
    await proxy.listen()

    const server = createServer(makeConfig(proxy.port))
    const connection = server.createConnection('/var/lib/firebird/data/defaultdb.fdb')
    await connection.connect()

    const cleanup = async () => {
      await settleWithin(connection.disconnect(), SLACK_MS)
      await proxy.close()
    }

    return { proxy, connection, cleanup }
  }

  /** Issue a query nobody waits on, swallowing a late rejection. */
  function fireAndForget(promise: Promise<unknown>): Promise<unknown> {
    promise.catch(() => undefined)
    return promise
  }

  it('baseline: queries work through the proxy', async () => {
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const result = await connection.driverExecuteSingle('SELECT 1 AS OK FROM RDB$DATABASE')
      expect(result.rows.length).toBe(1)
      expect(proxy.liveConnections).toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })

  it('abandons an in-flight query when the network drops silently', async () => {
    // Nothing tells node-firebird the socket is gone, and it has no timeout of its own, so
    // the shared request deadline is the only thing that ends this. Without it the query
    // waited indefinitely -- the reporter's "no answer at all".
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle(
          'SELECT COUNT(*) FROM RDB$RELATION_FIELDS a, RDB$RELATION_FIELDS b, RDB$RELATION_FIELDS c'
        )
      )
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(inFlight, TEST_REQUEST_TIMEOUT + SLACK_MS)
      expect(outcome.state).toBe('rejected')
    } finally {
      await cleanup()
    }
  })

  it('drains the dropped connections instead of recycling them', async () => {
    // node-firebird's pool returns a detached connection straight back out and never checks
    // one before handing it over, so connections left waiting on a reply that will never
    // come would be recycled indefinitely -- every query after the drop inherits one.
    //
    // The pool holds more than the connection the wedged query is using, and the drop takes
    // all of them, so recovery is not the very next query: it is the pool draining as each
    // dead connection is used once and dropped rather than returned. Once it is empty, new
    // connections are opened, and the proxy leaves new ones alone.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle(
          'SELECT COUNT(*) FROM RDB$RELATION_FIELDS a, RDB$RELATION_FIELDS b, RDB$RELATION_FIELDS c'
        )
      )
      await settleWithin(inFlight, 1000)
      const dropped = proxy.blackholeExisting()
      expect(dropped).toBeGreaterThan(0)
      await settleWithin(inFlight, TEST_REQUEST_TIMEOUT + SLACK_MS)

      // At most one attempt per dropped connection, plus one that should reach a fresh one.
      let recovered = false
      for (let i = 0; i < dropped + 1 && !recovered; i++) {
        const attempt = await settleWithin(
          connection.driverExecuteSingle('SELECT 1 AS OK FROM RDB$DATABASE'),
          TEST_REQUEST_TIMEOUT + SLACK_MS
        )
        // Every attempt has to settle, one way or the other. That is what draining means:
        // a dead connection is used once and reported, not left hanging. Without a deadline
        // the pool still empties, but only because each attempt hangs forever and strands
        // the connection it was holding -- which is the bug, not the recovery.
        expect(attempt.state).not.toBe('pending')
        recovered = attempt.state === 'resolved'
      }
      expect(recovered).toBe(true)
    } finally {
      await cleanup()
    }
  })
})
