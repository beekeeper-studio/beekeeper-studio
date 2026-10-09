import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// to exercise the handler plumbing.
vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { newState, removeState, state } from "@/handlers/handlerState"
import { DangerousQueryError } from "@/lib/errors"

const SID = "dangerous-query-window"

describe("conn/query with unscoped UPDATE and DELETE queries", () => {
  let query: ReturnType<typeof vi.fn>

  beforeEach(() => {
    newState(SID)
    query = vi.fn(async () => ({ execute: vi.fn(), cancel: vi.fn() }))
    state(SID).connection = { dialect: "psql", query } as any
  })
  afterEach(async () => removeState(SID))

  const run = (queryText: string, options?: any) =>
    ConnHandlers["conn/query"]({ queryText, options, tabId: 1, hasActiveTransaction: false, sId: SID })

  it("refuses an unscoped DELETE without approval", async () => {
    const err = await run("DELETE FROM users").then(() => null, (e) => e)
    expect(err).toBeInstanceOf(DangerousQueryError)
    expect(err.message).toBe("You did not scope this query. This will delete every record on this table.")
    expect(query).not.toHaveBeenCalled()
  })

  it("refuses an unscoped UPDATE hidden among other statements", async () => {
    await expect(run("select 1; update users set a = 1", { dryRun: false }))
      .rejects.toThrow("This will update every record on this table.")
    expect(query).not.toHaveBeenCalled()
  })

  it("runs an unscoped DELETE once approved", async () => {
    const options = { dangerousQueryApproved: true }
    await expect(run("DELETE FROM users", options)).resolves.toEqual(expect.any(String))
    expect(query).toHaveBeenCalledWith("DELETE FROM users", 1, options)
  })

  it("runs scoped and read-only queries without approval", async () => {
    await run("DELETE FROM users WHERE id = 1")
    await run("SELECT * FROM users")
    expect(query).toHaveBeenCalledTimes(2)
  })
})

describe("conn/findDangerousQueries", () => {
  beforeEach(() => {
    newState(SID)
    state(SID).connection = { dialect: "mysql" } as any
  })
  afterEach(async () => removeState(SID))

  it("uses the connection's dialect", async () => {
    const result = await ConnHandlers["conn/findDangerousQueries"]({
      queryText: "UPDATE t SET a = 1 # where id = 1",
      sId: SID,
    })
    expect(result).toEqual([{ type: "UPDATE", text: "UPDATE t SET a = 1 # where id = 1" }])
  })
})
