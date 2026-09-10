import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import net from "net"
import type { EventEmitter } from "events"
import rawLog from "@bksLogger"
import { createServer } from "@commercial/backend/lib/db/server"
import { dbtimeout } from "@tests/lib/db"
import { PostgresTestDriver } from "@tests/integration/lib/db/clients/postgres/container"
import type { IDbConnectionServerConfig } from "@/lib/db/types"

rawLog.transports.console.level = "error"

// Reproductions for https://github.com/beekeeper-studio/beekeeper-studio/issues/4739
// root causes 4 and 5 against a real Postgres. Complements
// tests/vitest/unit/lib/db/clients/postgresReservedConnection.spec.ts, which
// covers the same logic with a fake pool.
//
// `it.fails` = asserts the desired behaviour; green only while it is broken.

// TCP proxy in front of the container. Flipping `silent` on emulates the
// connection-loss case #3958 describes (network change, NAT/firewall drop):
// the socket stays open at both ends but nothing gets through, so there is no
// error for the driver to react to.
class SilentProxy {
  silent = false
  port: number
  private server: net.Server
  private sockets = new Set<net.Socket>()

  constructor(private targetHost: string, private targetPort: number) {}

  async start() {
    this.server = net.createServer((client) => {
      const upstream = net.connect(this.targetPort, this.targetHost)
      this.sockets.add(client)
      this.sockets.add(upstream)
      client.on("data", (chunk) => { if (!this.silent) upstream.write(chunk) })
      upstream.on("data", (chunk) => { if (!this.silent) client.write(chunk) })
      client.on("close", () => upstream.destroy())
      upstream.on("close", () => { if (!this.silent) client.destroy() })
      client.on("error", () => undefined)
      upstream.on("error", () => undefined)
    })
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", () => resolve()))
    this.port = (this.server.address() as net.AddressInfo).port
  }

  async stop() {
    this.sockets.forEach((s) => s.destroy())
    await new Promise<void>((resolve) => this.server.close(() => resolve()))
  }
}

async function outcome(p: Promise<unknown>, ms: number): Promise<"resolved" | "rejected" | "pending"> {
  const settled = p.then(() => "resolved" as const, () => "rejected" as const)
  const timer = new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), ms))
  return Promise.race([settled, timer])
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const TAB = 11

// A reserved PoolClient is checked out of pg-pool, which strips its idle error
// listener, and PostgresClient.reserveConnection attaches none of its own. When
// the socket behind an open manual transaction dies, node-postgres therefore
// emits an unhandled 'error' on it. In the utility process that only surfaces
// as the catch-all process.on('uncaughtException') log line in utility.ts;
// here it would fail the run, so stand in for that catch-all and record it.
function catchReservedConnectionErrors(client: any, tabId: number): Error[] {
  const reserved: EventEmitter = client.reservedConnections.get(tabId)
  expect(reserved.listenerCount("error")).toBe(0)
  const errors: Error[] = []
  reserved.on("error", (err) => errors.push(err))
  return errors
}

describe("Postgres connection loss", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let config: IDbConnectionServerConfig

  beforeAll(async () => {
    await PostgresTestDriver.start("16.4", false, false)
    config = PostgresTestDriver.config
  })

  afterAll(async () => {
    await PostgresTestDriver.stop()
  })

  async function connect(overrides: Partial<IDbConnectionServerConfig> = {}) {
    const server = createServer({ ...config, ...overrides })
    const client = server.createConnection("banana")
    await client.connect()
    return client
  }

  it("cancels a long query that is not pinned to a reserved connection (control)", async () => {
    const client = await connect()
    try {
      const query = await client.query("SELECT pg_sleep(30)", TAB)
      const running = query.execute()
      await sleep(300)

      expect(await outcome(query.cancel(), 2000)).toBe("resolved")
      await expect(running).rejects.toThrow()

      // and the connection is still usable
      const check = await client.query("SELECT 1 AS ok", TAB)
      const [result] = await check.execute()
      expect(result.rows).toHaveLength(1)
    } finally {
      await client.disconnect()
    }
  })

  // Root cause 5. With a reserved connection, cancel() sends pg_cancel_backend
  // over that same connection, where node-postgres queues it behind the
  // statement it is supposed to cancel. It only runs once pg_sleep returns on
  // its own.
  it.fails("cancels a long query running inside a manual transaction", async () => {
    const client = await connect()
    const query = await client.query("SELECT pg_sleep(4)", TAB)
    let running: Promise<unknown>
    let cancel: Promise<unknown>
    try {
      await client.reserveConnection(TAB)
      await client.startTransaction(TAB)
      running = query.execute()
      await sleep(300)

      cancel = query.cancel()
      expect(await outcome(cancel, 2000)).toBe("resolved")
      await expect(running).rejects.toThrow()
    } finally {
      // the sleep finishes on its own after 4s, then the queued cancel runs
      await running?.catch(() => undefined)
      await cancel?.catch(() => undefined)
      await client.releaseConnection(TAB)
      await client.disconnect()
    }
  })

  // Root cause 4 (socket dead, process alive). ROLLBACK is written to the
  // reserved connection with no query_timeout/statement_timeout and no
  // keepalive, so when the network goes silent it never settles and the tab's
  // Rollback button never comes back.
  it.fails("fails a rollback over a silently dead connection within a bounded time", async () => {
    const proxy = new SilentProxy(config.host, config.port)
    await proxy.start()
    const client = await connect({ host: "127.0.0.1", port: proxy.port })
    let rollback: Promise<unknown>
    let socketErrors: Error[] = []
    try {
      await client.reserveConnection(TAB)
      socketErrors = catchReservedConnectionErrors(client, TAB)
      await client.startTransaction(TAB)

      proxy.silent = true
      rollback = client.rollbackTransaction(TAB)

      expect(await outcome(rollback, 3000)).not.toBe("pending")
    } finally {
      await proxy.stop() // closes the socket for real; the driver then errors the pending ROLLBACK
      await rollback?.catch(() => undefined)
      await client.releaseConnection(TAB)
      await client.disconnect()
      expect(socketErrors.map((e) => e.message)).toEqual(["Connection terminated unexpectedly"])
    }
  })

  // The issue lists knex.destroy()/pool teardown as a way for disconnect() to
  // hang. For Postgres it does not: pool.end() is fire-and-forget in
  // PostgresClient.disconnect, so disconnect resolves even while a reserved
  // connection is wedged. (The pool itself never finishes ending.)
  it("disconnect() resolves while a reserved connection is wedged (characterization)", async () => {
    const proxy = new SilentProxy(config.host, config.port)
    await proxy.start()
    const client = await connect({ host: "127.0.0.1", port: proxy.port })
    let rollback: Promise<unknown>
    try {
      await client.reserveConnection(TAB)
      catchReservedConnectionErrors(client, TAB)
      await client.startTransaction(TAB)
      proxy.silent = true
      rollback = client.rollbackTransaction(TAB)
      await sleep(200)

      expect(await outcome(client.disconnect(), 3000)).toBe("resolved")
    } finally {
      await proxy.stop()
      await rollback?.catch(() => undefined)
    }
  })
})
