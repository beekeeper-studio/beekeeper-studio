import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import BksConfig from '@/common/bksConfig'
import { dbtimeout } from '../../../../lib/db'
import { TcpProxy, settleWithin } from '../../../../lib/tcpProxy'

// Covers the user report: "Each morning, when I start working and Beekeeper has been open
// over night, I lose connection to SQL-Server and it does not reestablish automatically. I
// often try to change an open request and get no answer at all, waiting for minutes...
// Now I just swap from external to local and back again to reenable connection."
//
// A TCP proxy sits between the SQLServerClient and the container, so a live connection can
// be broken the way a real network breaks it. Which way it breaks matters, because the
// driver handles the two cases completely differently:
//
//   destroyExisting()   - hard close (FIN/RST). tedious marks the connection closed, mssql's
//                         pool validator evicts it, and the next query transparently opens
//                         a new one. This case always worked.
//
//   blackholeExisting() - the flow is silently dropped: a stateful firewall / NAT / VPN
//                         expires the idle mapping, or the machine suspends and the peer is
//                         long gone by the time it wakes. No FIN, no RST, so both ends still
//                         believe the socket is open. This is the reported bug, and it used
//                         to hang without limit: `requestTimeout` was hardcoded to Infinity,
//                         so neither the query, nor the pool's liveness probe, nor
//                         pool.close() -- and therefore neither Disconnect nor Reconnect --
//                         ever came back.
//
// The timeouts now come from [db.sqlserver] in default.config.ini. The tests below turn
// them down so a wedge resolves in seconds rather than minutes; what they assert is that a
// dropped connection is reported as a ConnectionLostError (which is what raises the
// reconnect prompt), that disconnect finishes, and that reconnecting restores service.

const SA_PASSWORD = 'Example*1'

// Enough headroom that a busy CI runner is not mistaken for a wedged connection.
const SLACK_MS = 20000

const TEST_REQUEST_TIMEOUT = 3000
const TEST_ACQUIRE_TIMEOUT = 5000

// tedious's own cancelTimeout, which it spends trying to cancel a request that overran
// requestTimeout before it declares the connection unusable.
const TEDIOUS_CANCEL_TIMEOUT = 5000

function makeConfig(port: number): IDbConnectionServerConfig {
  return {
    client: 'sqlserver',
    host: '127.0.0.1',
    port,
    user: 'sa',
    password: SA_PASSWORD,
    trustServerCertificate: true,
    readOnlyMode: false,
  } as IDbConnectionServerConfig
}

describe('SQL Server - recovering from a silently dropped connection', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let containerHost: string
  let containerPort: number
  let originalTimeouts: { requestTimeout: number, acquireTimeout: number }

  beforeAll(async () => {
    container = await new GenericContainer('mcr.microsoft.com/mssql/server:2022-latest')
      .withEnvironment({
        MSSQL_PID: 'Express',
        SA_PASSWORD,
        MSSQL_SA_PASSWORD: SA_PASSWORD,
        ACCEPT_EULA: 'Y',
      })
      .withExposedPorts(1433)
      .withWaitStrategy(Wait.forLogMessage('SQL Server is now ready for client connections.'))
      .withStartupTimeout(dbtimeout)
      .start()
    containerHost = container.getHost()
    containerPort = container.getMappedPort(1433)
  })

  afterAll(async () => {
    if (container) await container.stop()
  })

  beforeEach(() => {
    // configDatabase() reads these when a connection is opened, so each test gets the
    // shortened values without touching the shipped defaults.
    originalTimeouts = {
      requestTimeout: BksConfig.db.sqlserver.requestTimeout,
      acquireTimeout: BksConfig.db.sqlserver.acquireTimeout,
    }
    BksConfig.db.sqlserver.requestTimeout = TEST_REQUEST_TIMEOUT
    BksConfig.db.sqlserver.acquireTimeout = TEST_ACQUIRE_TIMEOUT
  })

  afterEach(() => {
    BksConfig.db.sqlserver.requestTimeout = originalTimeouts.requestTimeout
    BksConfig.db.sqlserver.acquireTimeout = originalTimeouts.acquireTimeout
  })

  /** Open a real SQLServerClient whose traffic runs through a proxy we control. */
  async function connectThroughProxy() {
    const proxy = new TcpProxy(containerHost, containerPort)
    await proxy.listen()

    const server = createServer(makeConfig(proxy.port))
    const connection = server.createConnection('master')
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
      expect(result.data.recordset[0].ok).toBe(1)
      expect(proxy.liveConnections).toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })

  it('self-heals when the connection is hard-closed (FIN/RST)', async () => {
    // The control case, and the reason the bug looked intermittent: a clean close is
    // visible to tedious, so the pool evicts the dead connection and opens a new one
    // without anyone noticing.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(proxy.destroyExisting()).toBeGreaterThan(0)

      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), SLACK_MS)
      expect(after.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('reports a lost connection when the network drops under an in-flight query', async () => {
    // The reporter's "no answer at all, waiting for minutes". The query now gives up after
    // requestTimeout; the cancel that follows goes unanswered too, which is what marks the
    // connection as gone rather than the query as slow.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle("WAITFOR DELAY '00:01:00'; SELECT 1 AS ok")
      )
      // Let the request reach the server, then kill the flow under it.
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(inFlight, TEST_REQUEST_TIMEOUT + SLACK_MS)
      expect(outcome.state).toBe('rejected')
      if (outcome.state !== 'rejected') return
      expectConnectionLost(outcome.error)
    } finally {
      await cleanup()
    }
  })

  it('reports a lost connection when the pool cannot revive a wedged connection', async () => {
    // The morning-after case: nothing was running when the network died, but the pool still
    // holds the dead socket. Its liveness probe goes unanswered, and when the pool gives up
    // trying to hand out a connection the query fails with something the app can act on --
    // it used to be tarn's "operation timed out for an unknown reason", with no code at all.
    BksConfig.db.sqlserver.requestTimeout = 0 // no limit, so the probe cannot rescue itself

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(
        connection.driverExecuteSingle('SELECT 1 AS ok'),
        TEST_ACQUIRE_TIMEOUT + SLACK_MS
      )
      expect(outcome.state).toBe('rejected')
      if (outcome.state !== 'rejected') return
      expectConnectionLost(outcome.error)
    } finally {
      await cleanup()
    }
  })

  it('retires a wedged connection and runs the query on a new one', async () => {
    // The liveness probe costs requestTimeout plus tedious's 5s cancel window before it
    // reports failure. Give the pool longer than that to hand out a connection and it
    // retires the dead socket and opens a new one, so the query the user was trying to run
    // simply succeeds -- no prompt at all.
    BksConfig.db.sqlserver.acquireTimeout = TEST_REQUEST_TIMEOUT + TEDIOUS_CANCEL_TIMEOUT + 10000

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(
        connection.driverExecuteSingle('SELECT 1 AS ok'),
        BksConfig.db.sqlserver.acquireTimeout + SLACK_MS
      )
      expect(outcome.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('disconnects while a query is wedged on a dropped connection', async () => {
    // Disconnect used to hang here along with the query, because closing the pool waits for
    // the in-flight request to be handed back. That is what left restarting the app as the
    // only way out.
    BksConfig.db.sqlserver.requestTimeout = 0 // nothing can end the query on its own

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle("WAITFOR DELAY '00:01:00'; SELECT 1 AS ok")
      )
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const disconnected = await settleWithin(connection.disconnect(), SLACK_MS)
      expect(disconnected.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('reconnects while a query is wedged on a dropped connection', async () => {
    // The reporter's workaround -- swap connections until it works -- is what the Reconnect
    // button should have done all along. Reconnecting has to retire the wedged pool first,
    // or it inherits the state it is meant to escape.
    BksConfig.db.sqlserver.requestTimeout = 0

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle("WAITFOR DELAY '00:01:00'; SELECT 1 AS ok")
      )
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const reconnected = await settleWithin(connection.connect(), SLACK_MS)
      expect(reconnected.state).toBe('resolved')

      // Retiring the old pool is what releases the stuck query. Skip it and the wedged
      // connection lives on beside the new one, still holding its socket and still owing
      // an answer nobody will ever get.
      const released = await settleWithin(inFlight, SLACK_MS)
      expect(released.state).toBe('rejected')

      // New connections through the same proxy are not blackholed, so a working connection
      // is exactly what the user gets back.
      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), SLACK_MS)
      expect(after.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })
})
