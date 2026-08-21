import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { createServer } from '@commercial/backend/lib/db/server'
import BksConfig from '@/common/bksConfig'
import { dbtimeout } from '../../../../lib/db'
import { TcpProxy, settleWithin } from '../../../../lib/tcpProxy'

// The MongoDB half of the dropped-connection work; see sqlserver-stale-connection.spec.ts
// for the same scenarios against SQL Server.
//
// A TCP proxy sits between the client and the container so a live connection can be broken
// the way a real network breaks it:
//
//   destroyExisting()   - hard close (FIN/RST). The driver sees the socket close.
//
//   blackholeExisting() - the flow is silently dropped: a stateful firewall / NAT / VPN
//                         expires the idle mapping, or the machine suspends and the peer is
//                         long gone by the time it wakes. No FIN, no RST, so both ends still
//                         believe the socket is open.
//
// Mongo differs from the SQL clients in one useful way: its topology monitor notices a
// server it can no longer reach and reconnects on its own, so recovery for the NEXT
// operation was never the problem. The gap was the operation already in flight --
// socketTimeoutMS is unset by default, so it waited forever on a socket nothing was
// listening to.

const MONGO_USER = 'beekeeper'
const MONGO_PASSWORD = 'test'

// Enough headroom that a busy CI runner is not mistaken for a wedged connection.
const SLACK_MS = 20000

const TEST_REQUEST_TIMEOUT = 3000

describe('MongoDB - recovering from a silently dropped connection', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let containerHost: string
  let containerPort: number
  let originalRequestTimeout: number

  beforeAll(async () => {
    container = await new GenericContainer('mongo:latest')
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: MONGO_USER,
        MONGO_INITDB_ROOT_PASSWORD: MONGO_PASSWORD,
        MONGO_INITDB_DATABASE: 'bee',
      })
      .withExposedPorts(27017)
      .withStartupTimeout(dbtimeout)
      .withHealthCheck({
        test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"],
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start()
    containerHost = container.getHost()
    containerPort = container.getMappedPort(27017)
  })

  afterAll(async () => {
    if (container) await container.stop()
  })

  beforeEach(() => {
    // connect() reads this when the client is built, so each test gets the shortened value
    // without touching the shipped default.
    originalRequestTimeout = BksConfig.db.mongodb.requestTimeout
    BksConfig.db.mongodb.requestTimeout = TEST_REQUEST_TIMEOUT
  })

  afterEach(() => {
    BksConfig.db.mongodb.requestTimeout = originalRequestTimeout
  })

  async function connectThroughProxy() {
    const proxy = new TcpProxy(containerHost, containerPort)
    await proxy.listen()

    const url = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@127.0.0.1:${proxy.port}/bee?authSource=admin&directConnection=true`
    const server = createServer({ client: 'mongodb', url } as any)
    const connection = server.createConnection('bee')
    await connection.connect()

    const cleanup = async () => {
      await settleWithin(connection.disconnect(), SLACK_MS)
      await proxy.close()
    }

    return { proxy, server, connection, cleanup }
  }

  /** Run a command the way the app's Mongo shell tab does. */
  async function runQuery(connection: any, text: string) {
    return await connection.executeCommand(text)
  }

  /** Issue a query nobody waits on, swallowing a late rejection. */
  function fireAndForget(promise: Promise<unknown>): Promise<unknown> {
    promise.catch(() => undefined)
    return promise
  }

  it('baseline: queries work through the proxy', async () => {
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await runQuery(connection, 'db.stale_test.insertOne({ n: 1 })')
      const result = await runQuery(connection, 'db.stale_test.find({})')
      expect(result.length).toBeGreaterThan(0)
      expect(proxy.liveConnections).toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })

  it('abandons an in-flight operation when the network drops silently', async () => {
    // Nothing tells the driver the socket is gone, so only socketTimeoutMS ends this.
    // Unset -- the driver's default -- it waited indefinitely.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        runQuery(connection, "db.stale_test.find({ $where: 'sleep(60000) || true' }).toArray()")
      )
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const outcome = await settleWithin(inFlight, TEST_REQUEST_TIMEOUT + SLACK_MS)
      expect(outcome.state).toBe('rejected')
    } finally {
      await cleanup()
    }
  })

  it('disconnects while an operation is wedged on a dropped connection', async () => {
    BksConfig.db.mongodb.requestTimeout = 0 // nothing can end the operation on its own

    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      const inFlight = fireAndForget(
        runQuery(connection, "db.stale_test.find({ $where: 'sleep(120000) || true' }).toArray()")
      )
      await settleWithin(inFlight, 1000)
      expect(proxy.blackholeExisting()).toBeGreaterThan(0)

      const disconnected = await settleWithin(connection.disconnect(), SLACK_MS)
      expect(disconnected.state).toBe('resolved')
    } finally {
      await cleanup()
    }
  })

  it('recovers on its own once the network comes back', async () => {
    // The topology monitor is what makes this work, so it should hold with or without the
    // deadline -- it is here to prove the deadline did not break it.
    const { proxy, connection, cleanup } = await connectThroughProxy()
    try {
      await runQuery(connection, 'db.stale_test.insertOne({ n: 2 })')
      expect(proxy.destroyExisting()).toBeGreaterThan(0)

      // The first attempt may fail while the monitor catches up; what matters is that it
      // recovers rather than staying broken.
      let recovered = false
      for (let i = 0; i < 5 && !recovered; i++) {
        const attempt = await settleWithin(runQuery(connection, 'db.stale_test.find({})'), SLACK_MS)
        recovered = attempt.state === 'resolved'
      }
      expect(recovered).toBe(true)
    } finally {
      await cleanup()
    }
  })
})
