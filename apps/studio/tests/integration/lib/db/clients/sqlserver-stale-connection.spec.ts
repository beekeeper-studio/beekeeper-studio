import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import { dbtimeout } from '../../../../lib/db'
import { TcpProxy, settleWithin } from '../../../../lib/tcpProxy'

// Reproduction for the user report: "Each morning, when I start working and Beekeeper has
// been open over night, I lose connection to SQL-Server and it does not reestablish
// automatically. I often try to change an open request and get no answer at all, waiting
// for minutes... Now I just swap from external to local and back again to reenable
// connection. Would be a nice fix to have auto reconnect."
//
// A TCP proxy sits between the SQLServerClient and the container, so a live connection can
// be broken the way a real network breaks it. Which way it breaks matters, because the
// driver handles the two cases completely differently:
//
//   destroyExisting()   - hard close (FIN/RST). tedious marks the connection closed, mssql's
//                         pool validator evicts it, and the next query transparently opens
//                         a new one. This case already self-heals; the control test below
//                         pins that down.
//
//   blackholeExisting() - the flow is silently dropped: a stateful firewall / NAT / VPN
//                         expires the idle mapping, or the machine suspends and the peer is
//                         long gone by the time it wakes. No FIN, no RST, so both ends still
//                         believe the socket is open. This is the reported bug.
//
// Two distinct failures come out of the blackhole case:
//
//   1. A query that is already in flight never settles. SQLServerClient.configDatabase()
//      sets `requestTimeout: Infinity`, so there is no deadline at all -- measured at over
//      three minutes with no result and no error. Worse, pool.close() does not complete
//      either, so disconnect() and reconnect hang too and only restarting the app clears it.
//
//   2. The next query on the wedged pooled connection stalls, then fails uselessly. mssql
//      validates a pooled connection by running `SELECT 1` on it (config.validateConnection
//      defaults to true); on a wedged socket that probe never answers, and tarn only aborts
//      it after acquireTimeoutMillis (30s). The query then rejects with "operation timed out
//      for an unknown reason" -- no code, not a ConnectionError -- so nothing in the app can
//      tell a lost connection from any other failure, and nothing reconnects.
//
// The `it.failing` tests describe the behaviour we want. They are expected failures today;
// once auto-reconnect (or any deadline on a wedged request) lands, jest reports "Failing
// test passed" and the `.failing` markers should be removed.

const SA_PASSWORD = 'Example*1'

// Long enough that a slow-but-alive result is not mistaken for a wedge, short enough to
// keep the suite quick. The real-world symptom is unbounded: the query never comes back.
const OBSERVE_MS = 15000

// Comfortably past tarn's 30s acquire timeout, so a test using this window can tell "hung
// forever" apart from "the pool eventually gave up".
const PAST_ACQUIRE_TIMEOUT_MS = 45000

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

describe('SQL Server - a silently dropped connection is never re-established', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let containerHost: string
  let containerPort: number

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

  /**
   * Open a real SQLServerClient whose traffic runs through a proxy we control.
   *
   * `cleanup` hard-closes the proxy sockets before disconnecting, because a wedged pool
   * cannot be closed on its own -- that is one of the things being reproduced here.
   */
  async function connectThroughProxy(existing?: TcpProxy) {
    const proxy = existing ?? new TcpProxy(containerHost, containerPort)
    if (!existing) await proxy.listen()

    const server = createServer(makeConfig(proxy.port))
    const connection = server.createConnection('master')
    await connection.connect()

    const cleanup = async () => {
      proxy.destroyExisting()
      await settleWithin(connection.disconnect(), 10000)
      if (!existing) await proxy.close()
    }

    return { proxy, server, connection, cleanup }
  }

  /** Issue a query nobody waits on, swallowing a late rejection. */
  function fireAndForget(promise: Promise<unknown>): Promise<unknown> {
    promise.catch(() => undefined)
    return promise
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
    // The control case. A clean close is visible to tedious, so mssql evicts the dead
    // connection and opens a new one. This is why the bug only shows up after the kind of
    // silent drop a firewall or a suspended machine produces, and why it looks intermittent.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(proxy.destroyExisting()).toBeGreaterThan(0)

      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), OBSERVE_MS)
      expect(after.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('the server stays reachable through the same route, so reconnecting would fix it', async () => {
    // Proves the user is not looking at a genuinely-down server. A brand new connection
    // through the very same proxy succeeds while the pooled one is wedged; only the old
    // socket is dead. That is exactly the reporter's workaround of swapping connections
    // back and forth, and it is what an automatic reconnect would do for them.
    const first = await connectThroughProxy()
    let second: Awaited<ReturnType<typeof connectThroughProxy>>
    try {
      await first.connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(first.proxy.blackholeExisting()).toBeGreaterThan(0)

      second = await connectThroughProxy(first.proxy)
      const result = await settleWithin(second.connection.driverExecuteSingle('SELECT 2 AS ok'), OBSERVE_MS)
      expect(result.state).toBe('resolved')
    } finally {
      if (second) await second.cleanup()
      await first.cleanup()
    }
  })

  it.failing('an in-flight query should not hang forever when the network drops under it', async () => {
    // The reporter's "no answer at all, waiting for minutes". With requestTimeout set to
    // Infinity there is no deadline on the request and no keepalive check the client acts
    // on, so the query simply never comes back.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle("WAITFOR DELAY '00:00:05'; SELECT 1 AS ok")
      )
      // Let the request reach the server, then kill the flow under it.
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(inFlight, PAST_ACQUIRE_TIMEOUT_MS)
      expect(outcome.state).not.toBe('pending')
    } finally {
      await cleanup()
    }
  })

  it.failing('disconnect() should not hang while a query is wedged on a dead connection', async () => {
    // This is why the session cannot be rescued from the UI, and why the reporter ends up
    // restarting the app. SQLServerClient.disconnect() awaits pool.close(), and a pool with
    // an in-flight request on a wedged connection never finishes closing -- so Disconnect
    // and Reconnect, which is exactly what a user reaches for here, hang as well.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        connection.driverExecuteSingle("WAITFOR DELAY '00:00:05'; SELECT 1 AS ok")
      )
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const disconnected = await settleWithin(connection.disconnect(), OBSERVE_MS)
      expect(disconnected.state).not.toBe('pending')
    } finally {
      await cleanup()
    }
  })

  it.failing('a query on a silently-wedged pooled connection should settle promptly', async () => {
    // The morning-after case: nothing was running when the network died, but the pool still
    // holds the dead socket. mssql's `SELECT 1` validation probe wedges on it, and tarn only
    // aborts that after its 30s acquire timeout, so every affected query costs 30s before it
    // fails. Several pooled connections means several stalls in a row -- "waiting for minutes".
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), OBSERVE_MS)
      expect(after.state).not.toBe('pending')
    } finally {
      await cleanup()
    }
  })

  it.failing('a lost connection should be reported as a recognisable connection error', async () => {
    // Even once the pool does give up, the rejection is tarn's generic "operation timed out
    // for an unknown reason": no error code, not a ConnectionError. Nothing downstream can
    // tell this apart from an ordinary query failure, so the app cannot warn the user that
    // the connection is gone, let alone reconnect. (Note also that nothing ever commits
    // `setConnError`, so the "Lost Connection" modal in LostConnectionModal.vue is currently
    // unreachable.)
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await connection.driverExecuteSingle('SELECT 1 AS ok')
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const after = await settleWithin(connection.driverExecuteSingle('SELECT 1 AS ok'), PAST_ACQUIRE_TIMEOUT_MS)
      expect(after.state).toBe('rejected')
      if (after.state !== 'rejected') return
      expect((after.error as NodeJS.ErrnoException).code).toBeTruthy()
    } finally {
      await cleanup()
    }
  })
})
