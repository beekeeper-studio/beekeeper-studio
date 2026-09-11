import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import type { EventEmitter } from "events"
import rawLog from "@bksLogger"
import { createServer } from "@commercial/backend/lib/db/server"
import { dbtimeout } from "@tests/lib/db"
import { PostgresTestDriver } from "@tests/integration/lib/db/clients/postgres/container"
import { SilentProxy } from "@tests/vitest/lib/SilentProxy"
import { eventually, outcome, sleep } from "@tests/vitest/lib/promises"
import type { IDbConnectionServerConfig } from "@/lib/db/types"

rawLog.transports.console.level = "error"

// Reproductions against a real Postgres for
// https://github.com/beekeeper-studio/beekeeper-studio/issues/4739 root causes
// 4 and 5, plus the client-level symptoms behind the issues it links to (#389,
// #2370, #2705, #2845). Complements
// tests/vitest/unit/lib/db/clients/postgresReservedConnection.spec.ts, which
// covers the transaction logic with a fake pool.
//
// Tests not marked (control) assert the desired behaviour and are red until it
// is implemented.

const TAB = 11

// pg emits 'error' on a client whose socket died. A checked-out client (reserved
// or inside runWithConnection) has no listener for it, so in the utility
// process that only surfaces as the process.on('uncaughtException') log line
// in utility.ts; here it would fail the run. Stand in for that catch-all.
function catchClientErrors(client: any): Error[] {
  const errors: Error[] = []
  for (const pooled of client.conn.pool._clients as EventEmitter[]) {
    pooled.on("error", (err) => errors.push(err))
  }
  return errors
}

// Cleanup for tests that leave a connection wedged: closing the sockets is the
// only way to make the driver settle whatever is still pending on them.
function destroySockets(client: any) {
  for (const pooled of client.conn.pool._clients) {
    pooled.connection?.stream?.destroy()
  }
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

  async function idleInTransactionBackends(observer: any): Promise<number> {
    const query = await observer.query(
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = 'banana' AND state = 'idle in transaction'",
      TAB,
    )
    const [result] = await query.execute()
    // execute() runs in array mode and parseRowQueryResult keys the columns c0, c1, ...
    return Number(Object.values(result.rows[0])[0])
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
  it("cancels a long query running inside a manual transaction", async () => {
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
  it("fails a rollback over a silently dead connection within a bounded time", async () => {
    const proxy = new SilentProxy(config.host, config.port)
    await proxy.start()
    const client = await connect({ host: "127.0.0.1", port: proxy.port })
    let rollback: Promise<unknown>
    try {
      await client.reserveConnection(TAB)
      catchClientErrors(client)
      await client.startTransaction(TAB)

      proxy.silent = true
      rollback = client.rollbackTransaction(TAB)

      expect(await outcome(rollback, 3000)).not.toBe("pending")
    } finally {
      await proxy.stop() // closes the socket for real; the driver then errors the pending ROLLBACK
      await rollback?.catch(() => undefined)
      await client.releaseConnection(TAB)
      await client.disconnect()
    }
  })

  // #389 / #2370. The connection sat idle while its network path died (laptop
  // changed networks, NAT or firewall dropped the flow, SSH tunnel gone). The
  // next query is written into a socket that will never answer and nothing in
  // the client bounds the wait, so it hangs until the OS abandons TCP
  // retransmission, which takes minutes. Failing or reconnecting would both
  // do. query() already runs a trivial `SELECT pg_backend_pid()` before the
  // user's statement; a bounded timeout there would notice a dead connection
  // without limiting long-running queries.
  it("fails or recovers within a bounded time when the connection is silently dead", async () => {
    const proxy = new SilentProxy(config.host, config.port)
    await proxy.start()
    const client = await connect({ host: "127.0.0.1", port: proxy.port })
    catchClientErrors(client)
    let running: Promise<unknown>
    try {
      proxy.silent = true
      const query = await client.query("SELECT 1 AS ok", TAB)
      running = query.execute()

      expect(await outcome(running, 10000)).not.toBe("pending")
    } finally {
      await proxy.stop()
      await running?.catch(() => undefined)
      await client.disconnect()
    }
  })

  // #2705. disconnect() fires pool.end() without awaiting it and cancels
  // nothing, so statements that were running keep running on the server and in
  // the utility process after the user has disconnected.
  it("stops in-flight queries when disconnecting", async () => {
    const client = await connect()
    catchClientErrors(client)
    const query = await client.query("SELECT pg_sleep(10), 1 AS ok", TAB)
    const running = query.execute()
    await sleep(300)
    try {
      await client.disconnect()

      expect(await outcome(running, 2000)).not.toBe("pending")
    } finally {
      destroySockets(client)
      await running.catch(() => undefined)
    }
  })

  // New finding while reproducing root cause 4: disconnect() never releases or
  // destroys reserved connections, so a manual transaction that was open when
  // the user disconnected (or switched connections) stays open on the server,
  // holding its locks, for as long as the utility process lives.
  it("ends an open manual transaction on the server when disconnecting", async () => {
    const observer = await connect()
    const client = await connect()
    catchClientErrors(client)
    try {
      expect(await eventually(async () => (await idleInTransactionBackends(observer)) === 0, 3000)).toBe(true)

      await client.reserveConnection(TAB)
      await client.startTransaction(TAB)
      expect(await idleInTransactionBackends(observer)).toBe(1)

      await client.disconnect()

      expect(
        await eventually(async () => (await idleInTransactionBackends(observer)) === 0, 3000),
        "the transaction's backend is still idle in transaction after disconnect()",
      ).toBe(true)
    } finally {
      destroySockets(client)
      await observer.disconnect()
    }
  })

  // #2845. A BEGIN ... COMMIT block whose middle statement fails leaves its
  // pooled connection inside an aborted transaction: COMMIT never ran, and
  // runWithConnection releases the client as-is. pg-pool hands the same client
  // back for the next statement, which then fails with "current transaction is
  // aborted, commands ignored until end of transaction block" (25P02) no
  // matter how the user has corrected the query.
  it("runs a fresh query after a failed BEGIN...COMMIT block", async () => {
    const client = await connect()
    try {
      const broken = await client.query("BEGIN; SELECT 1/0 AS boom; COMMIT;", TAB)
      await expect(broken.execute()).rejects.toThrow(/division by zero/)

      const fixed = await client.query("SELECT 1 AS ok", TAB)
      const [result] = (await fixed.execute()) as any[]
      expect(result.rows).toHaveLength(1)
    } finally {
      await client.disconnect()
    }
  })
})
