import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Mock } from "vitest"
import { UtilityConnection } from "@/lib/utility/UtilityConnection"
import { outcome } from "@tests/vitest/lib/promises"

// Reproductions for https://github.com/beekeeper-studio/beekeeper-studio/issues/4739
// root cause 1: the renderer <-> utility RPC layer never settles a request once
// its transport is gone.
//
// Every test that is not marked (control) asserts the behaviour the issue asks
// for and stays red until it is implemented. The controls prove that the fake
// port drives the real class the way a healthy utility process does.

type Posted = { id?: string; name: string; args?: any }

// Stand-in for the renderer-side MessagePort that UtilityConnection talks to.
// `autoReply` answers every request with a reply message, the way a healthy
// utility process does.
class FakePort {
  posted: Posted[] = []
  onmessage: ((ev: { data: any }) => void) | null = null
  onclose: ((ev?: any) => void) | null = null
  private listeners: Record<string, Array<(ev?: any) => void>> = {}

  constructor(private autoReply = false) {}

  postMessage(msg: Posted) {
    this.posted.push(msg)
    if (this.autoReply) {
      queueMicrotask(() => this.reply(msg.id, `reply to ${msg.name}`))
    }
  }

  start() { /* MessagePort#start */ }

  addEventListener(type: string, fn: (ev?: any) => void) {
    (this.listeners[type] ??= []).push(fn)
  }

  reply(id: string | undefined, data: any) {
    this.onmessage?.({ data: { type: "reply", id, data } })
  }

  error(id: string, error: string) {
    this.onmessage?.({ data: { type: "error", id, error } })
  }

  // What the port does when its peer (the utility process) goes away: the
  // MessagePort `close` event (Chromium 131+, so available in Electron 39).
  close() {
    this.onclose?.({})
    this.listeners.close?.forEach((fn) => fn({}))
  }
}

describe("UtilityConnection", () => {
  let requestPorts: Mock

  beforeEach(() => {
    requestPorts = vi.fn()
    Object.assign(window, { main: { requestPorts } })
  })

  it("settles requests from reply and error messages (control)", async () => {
    const port = new FakePort()
    const conn = new UtilityConnection()
    conn.setPort(port as any, "sid-1")

    const ok = conn.send("conn/listTables", { filter: {} })
    const bad = conn.send("conn/listViews")

    expect(port.posted.map((m) => m.name)).toEqual(["conn/listTables", "conn/listViews"])
    expect(port.posted[0].args).toEqual({ sId: "sid-1", filter: {} })

    port.reply(port.posted[0].id, ["t1"])
    port.error(port.posted[1].id, "boom")

    await expect(ok).resolves.toEqual(["t1"])
    await expect(bad).rejects.toThrow("boom")
  })

  it("queues requests until a port arrives and asks main for one (control)", async () => {
    const conn = new UtilityConnection()
    const queued = conn.send("license/getStatus")
    expect(requestPorts).toHaveBeenCalledTimes(1)

    const port = new FakePort(true)
    conn.setPort(port as any, "sid-1")

    await expect(queued).resolves.toBe("reply to license/getStatus")
    expect(port.posted[0].args).toEqual({ sId: "sid-1" })
  })

  // main.ts reacts to a utility crash by forking a new utility process and
  // handing every window a fresh port + sId (createAndSendPorts(false, true)).
  // Requests that were in flight on the old port are orphaned in replyHandlers:
  // never rejected, never re-sent. Every `finally`-guarded UI flag behind such a
  // request (ConnectionInterface.connecting, TabQueryEditor.running, ...) stays
  // set for the life of the window.
  it("settles in-flight requests when a replacement port arrives after a utility restart", async () => {
    const conn = new UtilityConnection()
    const dead = new FakePort()
    conn.setPort(dead as any, "sid-1")

    const inFlight = conn.send("query/execute", { queryId: "q1" })

    const fresh = new FakePort(true)
    conn.setPort(fresh as any, "sid-2")

    // Either rejecting or re-sending on the new port would do.
    expect(await outcome(inFlight, 100)).not.toBe("pending")
  })

  it("rejects in-flight requests when the port closes", async () => {
    const conn = new UtilityConnection()
    const port = new FakePort()
    conn.setPort(port as any, "sid-1")

    const inFlight = conn.send("conn/listTables")
    port.close()

    expect(await outcome(inFlight, 100)).toBe("rejected")
  })

  // `this.port` is never cleared and `portsRequested` is latched true after the
  // first request, so once the transport is gone new requests are written into
  // the dead port instead of being queued for the replacement one.
  it("queues requests and re-requests ports after the port closes", async () => {
    const conn = new UtilityConnection()
    conn.send("license/getStatus")
    expect(requestPorts).toHaveBeenCalledTimes(1)

    const port = new FakePort(true)
    conn.setPort(port as any, "sid-1")
    port.close()

    conn.send("conn/listTables")

    expect(port.posted.map((m) => m.name)).not.toContain("conn/listTables")
    expect(requestPorts).toHaveBeenCalledTimes(2)
  })
})
