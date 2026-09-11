import { describe, it, expect, vi, beforeEach } from "vitest"
import { EventEmitter } from "events"
import { PostgresClient } from "@/lib/db/clients/postgresql"
import { outcome, sleep } from "@tests/vitest/lib/promises"

// Reproductions for https://github.com/beekeeper-studio/beekeeper-studio/issues/4739
// root causes 4 and 5, at the client level with a fake pg pool. No database.
//
// Tests not marked (control) assert the desired behaviour and are red until it
// is implemented.

type Cb = (err: Error | null, result?: any) => void

// Mimics the two node-postgres behaviours these bugs hinge on: a Client runs one
// query at a time and queues the rest (Client#queryQueue / _pulseQueryQueue),
// and it is an EventEmitter that emits 'error' when its socket dies.
class FakePgClient extends EventEmitter {
  released = false
  executed: string[] = []
  private queue: Array<() => void> = []
  private busy = false

  constructor(
    public pid: number,
    private impl: (text: string) => Promise<any>,
    private onRelease: () => void = () => undefined,
  ) {
    super()
  }

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
// to `hang`, which block until `release` is called for them.
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

// A server whose sockets are dead: BEGIN went through earlier, everything
// after that fails the way node-postgres reports a lost connection.
function deadServer() {
  return new FakePool(async (text) => {
    if (text === "BEGIN") return pgResult([], "BEGIN")
    throw new Error("Connection terminated unexpectedly")
  })
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
    await sleep(10)

    try {
      expect(await outcome(query.cancel(), 100)).toBe("resolved")
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
  it("cancels a query running inside a manual transaction", async () => {
    await client.reserveConnection(TAB)
    await client.startTransaction(TAB)
    server.hang(LONG_QUERY)

    const query = await client.query(LONG_QUERY, TAB)
    const running = query.execute()
    await sleep(10)

    try {
      expect(await outcome(query.cancel(), 100)).toBe("resolved")
      expect(server.canceled).toEqual([server.pool.clients[0].pid])
      // the cancel must travel over a connection other than the busy one
      expect(server.pool.clients.length).toBeGreaterThanOrEqual(2)
    } finally {
      server.release(LONG_QUERY)
      await running.catch(() => undefined)
    }
  })

  // Root cause 4. The rollback is pinned to the reserved connection and fails
  // with whatever that connection's socket does. Today the dead connection
  // stays reserved; TabQueryEditor.manualRollback has no try/finally either, so
  // nothing ever releases it. With maxReservedConnections = 2
  // (default.config.ini) two such tabs block every further manual transaction
  // in the window.
  it("frees the tab's reserved slot when ROLLBACK fails on a dead connection", async () => {
    client = buildClient(deadServer())

    for (const tab of [1, 2]) {
      await client.reserveConnection(tab)
      await client.startTransaction(tab)
      await expect(client.rollbackTransaction(tab)).rejects.toThrow("Connection terminated unexpectedly")
      expect(client.reservedConnections.has(tab), `tab ${tab} still holds its dead connection`).toBe(false)
    }

    await expect(client.reserveConnection(3)).resolves.toBeUndefined()
  })

  // A reserved PoolClient is checked out of pg-pool, which strips the pool's
  // idle error listener, and reserveConnection attaches none of its own. When
  // the socket behind an open manual transaction dies, node-postgres emits
  // 'error' on the client with nobody listening. In the utility process that
  // surfaces only as the process.on('uncaughtException') log line in utility.ts;
  // the renderer never hears about it and the tab keeps its transaction state.
  it("listens for errors on a reserved connection", async () => {
    await client.reserveConnection(TAB)

    const reserved = client.reservedConnections.get(TAB) as unknown as EventEmitter
    expect(reserved.listenerCount("error")).toBeGreaterThan(0)
  })
})
