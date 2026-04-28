import Vue from 'vue'
import Vuex from 'vuex'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { UtilUsedConnectionModule } from '@/store/modules/data/used_connection/UtilityUsedConnectionModule'

Vue.use(Vuex)

const WORKSPACE_ID = -1

function buildSavedConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'postgresql'
  c.name = 'My Saved Conn'
  c.host = 'old-host.example.com'
  c.port = 5432
  c.username = 'olduser'
  c.defaultDatabase = 'mydb'
  Object.assign(c, overrides)
  return c
}

// Build a plain object that mirrors the saved connection. We can't just spread
// `saved` because `connectionType` is implemented as a getter/setter backed by
// `_connectionType`, which a spread would copy as `_connectionType` only.
function asConfig(saved: SavedConnection, workspaceId: number) {
  return {
    ...saved,
    connectionType: saved.connectionType,
    workspaceId,
  }
}

function buildStore() {
  return new Vuex.Store({
    state: { workspaceId: WORKSPACE_ID },
    modules: {
      'data/usedconnections': UtilUsedConnectionModule,
    }
  })
}

describe('UtilUsedConnectionModule.recordUsed', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(async () => {
    await TestOrmConnection.connect()

    // Wire the Vuex action's $util.send to call the real AppDbHandlers
    Vue.prototype.$util = {
      send: async (channel: string, args: any) => {
        const handler = (AppDbHandlers as any)[channel]
        if (!handler) throw new Error(`No handler for ${channel}`)
        return await handler(args)
      }
    }

    store = buildStore()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('creates a new used_connection on first use', async () => {
    const saved = buildSavedConnection()
    await saved.save()

    await store.dispatch('data/usedconnections/recordUsed',
      asConfig(saved, WORKSPACE_ID))

    const all = await UsedConnection.find()
    expect(all).toHaveLength(1)
    expect(all[0].connectionId).toBe(saved.id)
    expect(all[0].host).toBe('old-host.example.com')
  })

  it('updates the used_connection details when the saved_connection has been edited', async () => {
    // First, save and "use" a saved connection
    const saved = buildSavedConnection()
    await saved.save()

    await store.dispatch('data/usedconnections/recordUsed',
      asConfig(saved, WORKSPACE_ID))

    // Reload the store's items so the second recordUsed call sees the
    // existing used_connection (mirrors what `data/usedconnections/load`
    // does on app startup).
    await store.dispatch('data/usedconnections/load')

    // Now imagine the user edits the saved connection's host/port/etc.
    saved.host = 'new-host.example.com'
    saved.port = 6543
    saved.username = 'newuser'
    await saved.save()

    // Connect again with the updated config
    await store.dispatch('data/usedconnections/recordUsed',
      asConfig(saved, WORKSPACE_ID))

    // There should still be exactly one used_connection, and it should
    // reflect the *new* connection details.
    const all = await UsedConnection.find()
    expect(all).toHaveLength(1)
    expect(all[0].connectionId).toBe(saved.id)
    expect(all[0].host).toBe('new-host.example.com')
    expect(all[0].port).toBe(6543)
    expect(all[0].username).toBe('newuser')
  })
})
