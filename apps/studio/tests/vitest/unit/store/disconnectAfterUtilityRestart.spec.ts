import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { MessageChannel, MessagePort } from "worker_threads"
import Vue from "vue"

// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// here: the driver is a stub placed straight into the handler state.
vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { UtilityConnection } from "@/lib/utility/UtilityConnection"
import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { errorMessages, newState, removeState, state } from "@/handlers/handlerState"
import store from "@/store"

// End-to-end reproduction of the "Utility Process Crashed -> Disconnect" flow
// from https://github.com/beekeeper-studio/beekeeper-studio/issues/4739, using
// the real renderer pieces (Vuex store, ElectronUtilityConnectionClient,
// UtilityConnection) wired over a real MessageChannel to the real backend
// handlers (connHandlers + handlerState). Only the Electron process plumbing is
// stood in for:
//
//   main.ts     -> FakeUtilityProcess.attach(): MessageChannel, one port to each side
//   utility.ts  -> FakeUtilityProcess.run(): runHandler's reply/error protocol
//   crash       -> stop answering, close the utility-side ports
//   restart     -> a new FakeUtilityProcess + a fresh port/sId for the window
//                  (createAndSendPorts(false, true))
//
// `it.fails` = asserts the desired behaviour; green only while it is broken.

type Handler = (args: any) => Promise<any>

class FakeUtilityProcess {
  private alive = true
  private ports: MessagePort[] = []

  constructor(private handlers: Record<string, Handler>) {}

  attach(sId: string): MessagePort {
    const { port1, port2 } = new MessageChannel()
    newState(sId)
    state(sId).port = port1 as any
    port1.on("message", ({ id, name, args }) => this.run(port1, id, name, args))
    this.ports.push(port1, port2)
    return port2
  }

  private async run(port: MessagePort, id: string, name: string, args: any) {
    if (!this.alive) return
    const reply: any = { id, type: "reply" }
    try {
      const handler = this.handlers[name] ?? this.fallback(name)
      reply.data = await handler(args)
    } catch (e) {
      reply.type = "error"
      reply.error = e?.message ?? e
      reply.errorName = e?.name
      reply.stack = e?.stack
    }
    if (this.alive) port.postMessage(reply)
  }

  // The store's disconnect action refreshes the connection sidebar afterwards;
  // answer those appdb lookups with nothing rather than pulling in the ORM.
  private fallback(name: string): Handler {
    if (name.startsWith("appdb/")) return async () => (name.endsWith("/find") ? [] : null)
    return async () => { throw new Error(`Invalid handler name: ${name}`) }
  }

  crash() {
    this.alive = false
    this.close()
  }

  close() {
    this.ports.forEach((p) => p.close())
    this.ports = []
  }
}

async function outcome(p: Promise<unknown>, ms = 200): Promise<"resolved" | "rejected" | "pending"> {
  const settled = p.then(() => "resolved" as const, () => "rejected" as const)
  const timer = new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), ms))
  return Promise.race([settled, timer])
}

const SID = "window-1"
const SID_AFTER_RESTART = "window-1-restarted"
const TAB = 3
const CONFIG = { id: 1, name: "prod", connectionType: "postgresql", workspaceId: -1 } as any

function stubDriver() {
  return {
    connectionType: "postgresql",
    disconnect: vi.fn(async () => undefined),
    listTables: vi.fn(() => new Promise(() => undefined)), // a query still running when the crash hits
    rollbackTransaction: vi.fn(async () => undefined),
  }
}

describe("disconnecting after the utility process crashes", () => {
  let utility: FakeUtilityProcess
  let $util: UtilityConnection
  let driver: ReturnType<typeof stubDriver>

  beforeEach(() => {
    // window.main is the preload bridge; nothing here needs real behaviour
    const bridge = new Proxy({}, { get: (cache: any, key) => (cache[key] ??= vi.fn()) })
    Object.assign(window, { main: bridge })

    utility = new FakeUtilityProcess({ ...(ConnHandlers as any) })
    $util = new UtilityConnection()
    Vue.prototype.$util = $util
    $util.setPort(utility.attach(SID) as any, SID)

    driver = stubDriver()
    state(SID).connection = driver as any

    // what the connect action leaves behind
    store.commit("connected", true)
    store.commit("newConnection", CONFIG)
  })

  afterEach(async () => {
    utility.close()
    await removeState(SID)
    await removeState(SID_AFTER_RESTART)
    store.commit("clearConnection")
  })

  // main.ts forks a new utility and pushes a fresh port + sId to the window. The
  // new process starts with State.connection = null for that sId.
  function restartUtility() {
    utility.crash()
    utility = new FakeUtilityProcess({ ...(ConnHandlers as any) })
    $util.setPort(utility.attach(SID_AFTER_RESTART) as any, SID_AFTER_RESTART)
  }

  it("disconnects cleanly while the utility is alive (control)", async () => {
    await store.dispatch("disconnect")

    expect(driver.disconnect).toHaveBeenCalledTimes(1)
    expect(store.state.connected).toBe(false)
    expect(store.state.usedConfig).toBeNull()
  })

  // Root cause 1: the request that was in flight when the process died is
  // parked in UtilityConnection.replyHandlers and never settled, so whatever
  // `finally` block was waiting on it never runs.
  it.fails("settles a request that was in flight when the utility died", async () => {
    const inFlight = store.state.connection.listTables()
    await new Promise((r) => setTimeout(r, 20))
    expect(driver.listTables).toHaveBeenCalledTimes(1)

    restartUtility()

    expect(await outcome(inFlight)).not.toBe("pending")
  })

  // Root causes 2 + 3: conn/disconnect goes through getDriverHandler, which
  // null-derefs on the fresh state; the store awaits that before
  // clearConnection, so the window keeps believing it is connected. This is the
  // Disconnect button on UtilDiedModal, ConnectionButton.selectConnection,
  // QuickSearch and CoreSidebar.disconnect.
  it.fails("can disconnect from a connection the restarted utility no longer has", async () => {
    restartUtility()

    const err = await store.dispatch("disconnect").then(() => null, (e) => e)

    expect(err).toBeNull()
    expect(store.state.connected).toBe(false)
    expect(store.state.usedConfig).toBeNull()
  })

  it("leaves the store connected to nothing after a failed disconnect (characterization)", async () => {
    restartUtility()

    await expect(store.dispatch("disconnect")).rejects.toThrow(/Cannot read properties of null \(reading 'disconnect'\)/)

    expect(store.state.connected).toBe(true)
    expect(store.state.usedConfig).toEqual(CONFIG)
    expect((window as any).main.disableConnectionMenuItems).not.toHaveBeenCalled()
  })

  // Root cause 4, restart flavour. The tab still shows an active transaction
  // and its Rollback button is enabled, but the new utility has no reservation
  // for it. The issue quotes peekConnection's "Could not retrieve reserved
  // connection" message here; through the handler the user actually gets
  // checkConnection's error, because the fresh state has no connection at all.
  it("rejects a rollback for a tab that still believes it has a transaction (characterization)", async () => {
    restartUtility()

    await expect(store.state.connection.rollbackTransaction(TAB)).rejects.toThrow(errorMessages.noDatabase)
  })
})
