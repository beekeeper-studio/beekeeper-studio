import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// to exercise the handler plumbing.
vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { errorMessages, getDriverHandler, newState, removeState, state } from "@/handlers/handlerState"

// Reproduction for https://github.com/beekeeper-studio/beekeeper-studio/issues/4739
// root cause 3: getDriverHandler dereferences state(sId).connection without a
// null check and skips checkConnection. A freshly (re)started utility process
// has connection = null for every window, so the handlers registered through it
// fail with a raw TypeError. conn/disconnect is one of them, which is what the
// Disconnect button on the "Utility Process Crashed" modal ends up calling.
//
// `it.fails` = asserts the desired behaviour; green only while it is broken.

const SID = "window-after-utility-restart"

// Handlers registered via getDriverHandler in connHandlers.ts.
const DRIVER_HANDLERS = [
  "supportedFeatures",
  "versionString",
  "defaultSchema",
  "listCharsets",
  "getDefaultCharset",
  "connect",
  "disconnect",
]

describe("driver handlers on a state without a connection", () => {
  beforeEach(() => newState(SID))
  afterEach(async () => removeState(SID))

  it("forwards to the driver when a connection exists (control)", async () => {
    const disconnect = vi.fn(async () => undefined)
    state(SID).connection = { disconnect } as any

    await expect(ConnHandlers["conn/disconnect"]({ sId: SID })).resolves.toBeUndefined()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it("handlers guarded by checkConnection fail with the 'no database connection' error (control)", async () => {
    await expect(ConnHandlers["conn/listTables"]({ sId: SID })).rejects.toThrow(errorMessages.noDatabase)
  })

  it.fails("conn/disconnect does not fail with a TypeError when there is nothing to disconnect", async () => {
    const err = await ConnHandlers["conn/disconnect"]({ sId: SID }).then(() => null, (e) => e)
    // Resolving (nothing to do) or a clean errorMessages.noDatabase rejection
    // would both let the store's disconnect action reach clearConnection.
    expect(err).not.toBeInstanceOf(TypeError)
  })

  it.fails("no getDriverHandler handler null-derefs the missing connection", async () => {
    const errors = await Promise.all(
      DRIVER_HANDLERS.map((name) => getDriverHandler(name)({ sId: SID }).then(() => null, (e) => e))
    )
    for (const err of errors) {
      expect(err).not.toBeInstanceOf(TypeError)
    }
  })

  it("the TypeError is what the renderer sees today (characterization)", async () => {
    await expect(ConnHandlers["conn/disconnect"]({ sId: SID })).rejects.toThrow(TypeError)
  })
})
