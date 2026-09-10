import { describe, it, expect, vi, beforeEach } from "vitest"
import { PostgresClient } from "@/lib/db/clients/postgresql"
import { errorMessages } from "@/lib/db/clients/utils"

// Reproductions for https://github.com/beekeeper-studio/beekeeper-studio/issues/4739
// root causes 4 and 5, at the client level with a fake pg pool. No database.
//
// `it.fails` = asserts the desired behaviour; green only while it is broken.

type Cb = (err: Error | null, result?: any) => void

// Mimics the one node-postgres behaviour these bugs hinge on: a Client runs one
// query at a time and queues the rest (Client#queryQueue / _pulseQueryQueue).
class FakePgClient {
  released = false
  executed: string[] = []
  private queue: Array<() => void> = []
  private busy = false

  constructor(
    public pid: number,
    private impl: (text: string) => Promise<any>,
    private onRelease: () => void = () => undefined,
  ) {}

  query(args: { text: string }, cb: Cb) {
    this.queue.push(() => this.run(args.text, cb))
    this.pump()
  }

  release() {
    this.released = true
    this.onRelease()
  }

  private pump() {
    if (this.busy || this.queue.length === 0) return
    this.queue.shift()()
  }

  private async run(text: string, cb: Cb) {
    this.busy = true
    this.executed.push(text)
    try {
      cb(null, await this.impl(text))
    } catch (err) {
      cb(err)
    } finally {
      this.busy = false
      this.pump()
    }
  }
}

// Like pg-pool, hands back the most recently released idle client before
// opening a new one, so consecutive single queries reuse one connection.
class FakePool {
  clients: FakePgClient[] = []
  private idle: FakePgClient[] = []
  private nextPid = 1000

  constructor(private impl: (text: string, client: FakePgClient) => Promise<any>) {}

  async connect() {
    const reused = this.idle.pop()
    if (reused) {
      reused.released = false
      return reused
    }
    const client: FakePgClient = new FakePgClient(
      this.nextPid++,
      (text) => this.impl(text, client),
      () => this.idle.push(client),
    )
    this.clients.push(client)
    return client
  }

  end = vi.fn()
  on() { return this }
}

function pgResult(rows: any[], command = "SELECT") {
  return { rows, fields: [], command, rowCount: rows.length }
}

// A minimal "server" that runs everything instantly except statements handed
// to `hang`, which block until the returned release function is called.
function fakeServer() {
  const hanging = new Map<string, () => void>()
  const canceled: number[] = []
  const impl = (text: string, client: FakePgClient) => {
    if (text.includes("pg_backend_pid")) return Promise.resolve(pgResult([{ pid: client.pid }]))
    const cancel = text.match(/pg_cancel_backend\((\d+)\)/)
    if (cancel) {
      canceled.push(Number(cancel[1]))
      return Promise.resolve(pgResult([{ pg_cancel_backend: true }]))
    }
    if (hanging.has(text)) {
      return new Promise((resolve) => hanging.set(text, () => resolve(pgResult([], "SELECT"))))
    }
    return Promise.resolve(pgResult([], text.trim().split(/\s+/)[0].toUpperCase()))
  }
  return {
    pool: new FakePool(impl),
    canceled,
    hang(text: string) { hanging.set(text, () => undefined) },
    release(text: string) { hanging.get(text)?.() },
  }
}

async function outcome(p: Promise<unknown>, ms = 100): Promise<"resolved" | "rejected" | "pending"> {
  const settled = p.then(() => "resolved" as const, () => "rejected" as const)
  const timer = new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), ms))
  return Promise.race([settled, timer])
}

function buildClient(pool: FakePool) {
  // server/database only need what the constructor and reserveConnection read
  const client = new PostgresClient({ config: { client: "postgresql" } } as any, { database: "db" } as any)
  client.conn = { pool } as any
  return client
}

const TAB = 7
const LONG_QUERY = "SELECT pg_sleep(60)"

describe("PostgresClient manual transactions", () => {
  let server: ReturnType<typeof fakeServer>
  let client: PostgresClient

  beforeEach(() => {
    server = fakeServer()
    client = buildClient(server.pool)
  })

  it("routes a tab's queries over its reserved connection (control)", async () => {
    await client.reserveConnection(TAB)
    await client.startTransaction(TAB)
    const query = await client.query("SELECT 1", TAB)
    await query.execute()

    expect(server.pool.clients).toHaveLength(1)
    expect(server.pool.clients[0].executed).toEqual(["BEGIN", "SELECT pg_backend_pid() AS pid", "SELECT 1"])
  })

  it("cancels a query that is not pinned to a reserved connection (control)", async () => {
    server.hang(LONG_QUERY)
    const query = await client.query(LONG_QUERY, TAB)
    const running = query.execute()
    await new Promise((r) => setTimeout(r, 10))

    try {
      expect(await outcome(query.cancel())).toBe("resolved")
      // pg_cancel_backend went out on a second pool connection
      expect(server.pool.clients).toHaveLength(2)
      expect(server.canceled).toEqual([server.pool.clients[0].pid])
    } finally {
      server.release(LONG_QUERY)
      await running.catch(() => undefined)
    }
  })

  // Root cause 5. cancel() runs `SELECT pg_cancel_backend(pid)` with { tabId },
  // and rawExecuteQuery routes anything carrying a reserved tabId onto that
  // tab's reserved connection - the one that is busy running the query being
  // cancelled. node-postgres queues it behind the running statement, so the
  // cancel can only execute once the query it is meant to kill has finished.
  it.fails("cancels a query running inside a manual transaction", async () => {
    await client.reserveConnection(TAB)
    await client.startTransaction(TAB)
    server.hang(LONG_QUERY)

    const query = await client.query(LONG_QUERY, TAB)
    const running = query.execute()
    await new Promise((r) => setTimeout(r, 10))

    try {
      expect(await outcome(query.cancel())).toBe("resolved")
      expect(server.canceled).toEqual([server.pool.clients[0].pid])
    } finally {
      server.release(LONG_QUERY)
      await running.catch(() => undefined)
    }
  })

  it("queues the cancel behind the running statement on the same connection (characterization)", async () => {
    await client.reserveConnection(TAB)
    server.hang(LONG_QUERY)

    const query = await client.query(LONG_QUERY, TAB)
    const running = query.execute()
    await new Promise((r) => setTimeout(r, 10))
    const cancel = query.cancel()

    try {
      expect(await outcome(cancel)).toBe("pending")
      expect(server.pool.clients).toHaveLength(1)
      expect(server.canceled).toEqual([])
    } finally {
      // Only once the long query completes does the queued cancel run - too late.
      server.release(LONG_QUERY)
      await running.catch(() => undefined)
      await cancel.catch(() => undefined)
    }
    expect(server.pool.clients[0].executed.at(-1)).toContain("pg_cancel_backend")
  })

  // Root cause 4. The rollback is pinned to the reserved connection, so it fails
  // with whatever that connection's socket does. TabQueryEditor.manualRollback
  // has no try/finally, so releaseConnection never runs and the tab keeps its
  // reserved slot; with maxReservedConnections = 2 (default.config.ini) two
  // such tabs block every further manual transaction in the window.
  it("keeps a dead connection reserved after ROLLBACK fails, until the limit is hit (characterization)", async () => {
    const deadSocket = fakeServer()
    deadSocket.pool = new FakePool(async (text, c) => {
      if (text === "BEGIN") return pgResult([], "BEGIN")
      throw new Error("Connection terminated unexpectedly")
    })
    client = buildClient(deadSocket.pool)

    for (const tab of [1, 2]) {
      await client.reserveConnection(tab)
      await client.startTransaction(tab)
      await expect(client.rollbackTransaction(tab)).rejects.toThrow("Connection terminated unexpectedly")
      // what the UI does today: bail before releaseConnection
    }

    expect(client.reservedConnections.size).toBe(2)
    await expect(client.reserveConnection(3)).rejects.toThrow(errorMessages.maxReservedConnections)

    // releaseConnection is the only way out, and nothing on the failure path calls it
    await client.releaseConnection(1)
    await expect(client.reserveConnection(3)).resolves.toBeUndefined()
  })

  // Root cause 4, utility-restart flavour: the renderer still has
  // hasActiveTransaction = true for the tab, but the new utility process has no
  // reservation for it. Note the message: the issue quotes peekConnection's
  // "Could not retrieve reserved connection" text, and that is what the client
  // throws, but conn/rollbackTransaction runs checkConnection first, so through
  // the handler the user actually sees errorMessages.noDatabase (see the store
  // spec). Either way there is no path that clears the tab's transaction state.
  it("rejects a rollback for a tab with no reservation with a 'report this' error (characterization)", async () => {
    await expect(client.rollbackTransaction(TAB)).rejects.toThrow(
      "Could not retrieve reserved connection, please report this issue on our GitHub."
    )
  })
})
