import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// to exercise the connection-lost listener wiring.
vi.mock('@commercial/backend/lib/connection-provider', () => ({ default: {} }))

import { ConnHandlers } from '@commercial/backend/handlers/connHandlers'
import { newState, removeState, state } from '@/handlers/handlerState'

const SID = 'connection-lost-listener-test'

// The connector is what emits 'connection-lost'. The client has no
// `connection` emitter, so listeners have to be attached to (and removed from)
// `connection.connector`.

function buildConnection() {
  return {
    connectionType: 'postgresql',
    connector: new EventEmitter(),
    connect: vi.fn(async () => undefined),
  }
}

describe('connection-lost listener', () => {
  let connection: ReturnType<typeof buildConnection>
  let postMessage: ReturnType<typeof vi.fn>

  beforeEach(() => {
    newState(SID)
    connection = buildConnection()
    postMessage = vi.fn()
    state(SID).port = { postMessage } as any
    state(SID).server = {
      db: vi.fn(() => undefined),
      createConnection: vi.fn(() => connection),
      destroyConnection: vi.fn(),
    } as any
  })

  afterEach(async () => {
    await removeState(SID)
  })

  describe('conn/changeDatabase', () => {
    it('forwards connection-lost from the new connection\'s connector', async () => {
      await ConnHandlers['conn/changeDatabase']({ newDatabase: 'other', sId: SID })

      expect(state(SID).server.destroyConnection).not.toHaveBeenCalled()
      expect(state(SID).connection).toBe(connection)

      connection.connector.emit('connection-lost')

      expect(postMessage).toHaveBeenCalledWith({ type: 'conn/connection-lost' })
    })
  })

  describe('conn/clearConnection', () => {
    it('removes listeners from the connector', async () => {
      await ConnHandlers['conn/changeDatabase']({ newDatabase: 'other', sId: SID })
      expect(connection.connector.listenerCount('connection-lost')).toBe(1)

      await ConnHandlers['conn/clearConnection']({ sId: SID })

      expect(connection.connector.listenerCount('connection-lost')).toBe(0)
      connection.connector.emit('connection-lost')
      expect(postMessage).not.toHaveBeenCalled()
      expect(state(SID).connection).toBeNull()
    })
  })
})
