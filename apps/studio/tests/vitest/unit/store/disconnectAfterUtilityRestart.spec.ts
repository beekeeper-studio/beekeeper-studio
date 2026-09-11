import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Vue from "vue"
import { mount } from "@vue/test-utils"

// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// here: the driver is a stub placed straight into the handler state.
vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { UtilityConnection } from "@/lib/utility/UtilityConnection"
import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { removeState, state } from "@/handlers/handlerState"
import store from "@/store"
import UtilDiedModal from "@/components/UtilDiedModal.vue"
import LostConnectionModal from "@/components/LostConnectionModal.vue"
import { FakeUtilityProcess } from "@tests/vitest/lib/FakeUtilityProcess"
import { outcome, sleep } from "@tests/vitest/lib/promises"

// End-to-end reproduction of the "Utility Process Crashed -> Disconnect" flow
// from https://github.com/beekeeper-studio/beekeeper-studio/issues/4739, using
// the real renderer pieces (Vuex store, ElectronUtilityConnectionClient,
// UtilityConnection, the two modals) wired over a real MessageChannel to the
// real backend handlers (connHandlers + handlerState). Only the Electron
// process plumbing is stood in for; see FakeUtilityProcess.
//
// Tests not marked (control) assert the desired behaviour and are red until it
// is implemented.

const SID = "window-1"
const SID_AFTER_RESTART = "window-1-restarted"
const CONFIG = { id: 1, name: "prod", connectionType: "postgresql", workspaceId: -1 } as any

function stubDriver() {
  return {
    connectionType: "postgresql",
    disconnect: vi.fn(async () => undefined),
    listTables: vi.fn(() => new Promise(() => undefined)), // a query still running when the crash hits
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
  it("settles a request that was in flight when the utility died", async () => {
    const inFlight = store.state.connection.listTables()
    await sleep(20)
    expect(driver.listTables).toHaveBeenCalledTimes(1)

    restartUtility()

    expect(await outcome(inFlight, 200)).not.toBe("pending")
  })

  // Root causes 2 + 3: conn/disconnect goes through getDriverHandler, which
  // null-derefs on the fresh state; the store awaits that before
  // clearConnection, so the window keeps believing it is connected. This is the
  // Disconnect button on UtilDiedModal, ConnectionButton.selectConnection,
  // QuickSearch and CoreSidebar.disconnect.
  it("can disconnect from a connection the restarted utility no longer has", async () => {
    restartUtility()

    const err = await store.dispatch("disconnect").then(() => null, (e) => e)

    expect(err).toBeNull()
    expect(store.state.connected).toBe(false)
    expect(store.state.usedConfig).toBeNull()
  })

  // conn/clearConnection exists for exactly this but nothing in the renderer
  // calls it, so after a disconnect the utility keeps the disconnected client,
  // server and config around and checkConnection keeps passing for them.
  it("clears the utility-side connection state when disconnecting", async () => {
    await store.dispatch("disconnect")

    expect(state(SID).connection).toBeNull()
    expect(state(SID).server).toBeNull()
  })

  // Both modals dispatch 'disconnect' without awaiting or catching it and hide
  // themselves right away. When the dispatch rejects (root causes 2 + 3) the
  // modal is gone, the store still says connected, and the rejection is
  // unhandled. Either recovering the store or telling the user would do.
  describe.each([
    ["UtilDiedModal", UtilDiedModal],
    ["LostConnectionModal", LostConnectionModal],
  ])("%s Disconnect button", (_name, component) => {
    it("recovers the store or reports the failure when disconnecting fails", async () => {
      restartUtility()
      const $noty = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }
      const $modal = { show: vi.fn(), hide: vi.fn() }
      // Same store, but rejections the component drops are marked handled so
      // they show up here as the assertion below instead of as a stray
      // unhandled rejection.
      const $store = {
        state: store.state,
        getters: store.getters,
        commit: store.commit.bind(store),
        dispatch: (...args: any[]) => {
          const p = (store.dispatch as any)(...args)
          p.catch(() => undefined)
          return p
        },
      }
      const wrapper = mount(component as any, {
        mocks: { $store, $modal, $noty },
        // <modal> (vue-js-modal) and <portal> (portal-vue) are globally
        // registered in the app but not in the test environment.
        stubs: { modal: true, portal: true },
      })

      try {
        wrapper.vm.disconnect()
        await sleep(200)

        const recovered = store.state.connected === false
        const reported = $noty.error.mock.calls.length > 0
        expect(
          recovered || reported,
          "modal hidden, store still connected, nothing reported to the user",
        ).toBe(true)
      } finally {
        wrapper.destroy()
      }
    })
  })
})
