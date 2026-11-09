import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// to exercise the transaction timeout bookkeeping.
vi.mock('@commercial/backend/lib/connection-provider', () => ({ default: {} }))

import { ConnHandlers } from '@commercial/backend/handlers/connHandlers'
import { newState, removeState, state } from '@/handlers/handlerState'

const SID = 'transaction-timeout-test'
const TAB_ID = 42

// A manual transaction arms a timer that eventually rolls the transaction back
// on the tab's reserved connection. Releasing that connection has to disarm the
// timer - otherwise it fires against a connection the tab no longer holds.

function buildConnection() {
  return {
    connectionType: 'postgresql',
    reserveConnection: vi.fn(async () => undefined),
    releaseConnection: vi.fn(async () => undefined),
    startTransaction: vi.fn(async () => undefined),
    rollbackTransaction: vi.fn(async () => undefined),
  }
}

describe('conn/releaseConnection', () => {
  let connection: ReturnType<typeof buildConnection>

  beforeEach(() => {
    vi.useFakeTimers()
    newState(SID)
    connection = buildConnection()
    state(SID).connection = connection as any
    state(SID).port = { postMessage: vi.fn() } as any
  })

  afterEach(async () => {
    vi.useRealTimers()
    await removeState(SID)
  })

  it('disarms the transaction timeout', async () => {
    await ConnHandlers['conn/startTransaction']({ tabId: TAB_ID, sId: SID })
    expect(state(SID).transactionTimeouts.has(TAB_ID)).toBe(true)

    await ConnHandlers['conn/releaseConnection']({ tabId: TAB_ID, sId: SID })

    expect(state(SID).transactionTimeouts.has(TAB_ID)).toBe(false)
  })

  it('does not roll back against a released connection', async () => {
    await ConnHandlers['conn/startTransaction']({ tabId: TAB_ID, sId: SID })
    await ConnHandlers['conn/releaseConnection']({ tabId: TAB_ID, sId: SID })

    vi.advanceTimersByTime(1000 * 60 * 60)
    await Promise.resolve()

    expect(connection.rollbackTransaction).not.toHaveBeenCalled()
    expect(state(SID).port.postMessage).not.toHaveBeenCalled()
  })
})
