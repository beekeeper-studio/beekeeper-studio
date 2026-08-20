import Vue from 'vue'
import Vuex from 'vuex'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { OpenTab } from '@/common/appdb/models/OpenTab'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers'
import { UtilUsedConnectionModule } from '@/store/modules/data/used_connection/UtilityUsedConnectionModule'
import { TabModule } from '@/store/modules/TabModule'

Vue.use(Vuex)

const WORKSPACE_ID = -1

const Handlers = { ...AppDbHandlers, ...TabHistoryHandlers }

// Regression tests for the "phantom tabs" bug: connecting to a connection
// that was never saved surfaced (and then corrupted) the open tabs of an
// unrelated *saved* connection.
//
// Root cause: for an unsaved config, `recordUsed` returned the new
// used_connection row, so `usedConfig.id` was a used_connection PK. Tabs,
// pins, hidden entities, and tab history are all persisted keyed on
// `usedConfig.id` in a column that holds saved_connection PKs. The two
// tables have independent id sequences, so whenever a used_connection id
// happened to equal some saved_connection id, the unsaved session read and
// wrote that saved connection's tabs. Sessions on a never-saved connection
// must have `usedConfig.id` null, which disables per-connection persistence
// instead of borrowing another connection's key.

function buildSavedConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'clickhouse'
  c.name = 'ClickHouse Prod'
  c.host = 'clickhouse.example.com'
  c.port = 8123
  c.username = 'user'
  c.defaultDatabase = 'analytics'
  Object.assign(c, overrides)
  return c
}

// What the connection form hands to `connect` when the user fills in a brand
// new connection and hits Connect without saving: a fresh config (built the
// same way the connection screen builds one, via appdb/saved/new) with no id.
async function unsavedSnowflakeConfig() {
  const fresh = await AppDbHandlers['appdb/saved/new']({ init: null })
  return {
    ...fresh,
    id: null,
    workspaceId: WORKSPACE_ID,
    connectionType: 'snowflake',
    name: null,
    host: 'account.snowflakecomputing.com',
    port: 443,
    username: 'app',
    defaultDatabase: 'ANALYTICS',
  }
}

async function openTabFor(connectionId: number, title: string): Promise<OpenTab> {
  const tab = new OpenTab()
  tab.tabType = 'query'
  tab.title = title
  tab.connectionId = connectionId
  tab.workspaceId = WORKSPACE_ID
  tab.position = 1
  tab.active = false
  tab.unsavedQueryText = 'select 1'
  await tab.save()
  return tab
}

// Mirror of production: saved connections reach the renderer as plain objects
// via transformConn (see UtilUsedConnectionModule.spec.ts for why we can't
// just spread the entity).
async function asConfig(saved: SavedConnection) {
  const fetched = await AppDbHandlers['appdb/saved/findOneBy']({
    options: { id: saved.id }
  })
  return { ...fetched, workspaceId: WORKSPACE_ID }
}

function buildStore() {
  return new Vuex.Store({
    state: { workspaceId: WORKSPACE_ID, usedConfig: null } as any,
    mutations: {
      // same shape as the root `newConnection` mutation in store/index.ts
      newConnection(state: any, config: any) {
        state.usedConfig = config
      }
    },
    modules: {
      'data/usedconnections': UtilUsedConnectionModule,
      tabs: TabModule,
    }
  })
}

describe('connecting without saving (phantom tabs)', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(async () => {
    await TestOrmConnection.connect()

    Vue.prototype.$util = {
      send: async (channel: string, args: any) => {
        const handler = (Handlers as any)[channel]
        if (!handler) throw new Error(`No handler for ${channel}`)
        return await handler(args)
      }
    }

    store = buildStore()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  // Simulates the exact flow of the root `connect` action: recordUsed, then
  // the newConnection mutation, then pruning old deleted tabs (guarded on
  // usedConfig.id, as in store/index.ts).
  async function connectWith(config: any) {
    const usedConfig = await store.dispatch(
      'data/usedconnections/recordUsed', config)
    store.commit('newConnection', usedConfig)
    if (usedConfig.id) {
      await Handlers['appdb/tabhistory/clearDeletedTabs']({
        workspaceId: WORKSPACE_ID,
        connectionId: usedConfig.id
      })
    }
    await store.dispatch('tabs/load')
    return usedConfig
  }

  async function connectUnsaved() {
    return await connectWith(await unsavedSnowflakeConfig())
  }

  it('does not surface a saved connection\'s tabs in an unsaved-connection session', async () => {
    // The user's saved ClickHouse connection, with open tabs.
    const saved = buildSavedConnection()
    await saved.save()
    await openTabFor(saved.id, 'clickhouse query 1')
    await openTabFor(saved.id, 'clickhouse query 2')

    // New Snowflake connection, connected without saving. Its used_connection
    // row is the first one, so its PK equals the ClickHouse saved_connection
    // id - the collision that used to leak the tabs.
    const usedConfig = await connectUnsaved()

    // An unsaved session has no saved_connection id, so no persistence key.
    expect(usedConfig.id).toBeNull()
    expect((store.state as any).tabs.tabs).toHaveLength(0)

    // It is still recorded for the recent-connections list, unlinked from
    // any saved connection.
    const used = await UsedConnection.find()
    expect(used).toHaveLength(1)
    expect(used[0].connectionId).toBeNull()
  })

  it('does not write unsaved-session tabs into a saved connection\'s tab set', async () => {
    const saved = buildSavedConnection()
    await saved.save()

    await connectUnsaved()

    // User opens a tab while connected to the unsaved Snowflake connection.
    await store.dispatch('tabs/add', {
      item: { tabType: 'query', title: 'snowflake scratch', position: 1 }
    })

    // Later: connect to the saved ClickHouse connection.
    const config = await connectWith(await asConfig(saved))
    expect(config.id).toBe(saved.id)

    // The Snowflake tab does not leak into this session.
    const titles = (store.state as any).tabs.tabs.map((t: any) => t.title)
    expect(titles).not.toContain('snowflake scratch')
  })

  it('does not purge a saved connection\'s closed-tab history on unsaved connect', async () => {
    const saved = buildSavedConnection()
    await saved.save()

    // A ClickHouse tab closed 30 days ago (still restorable via
    // "reopen last closed tab" until clearOldDeletedTabs runs for that
    // connection).
    const tab = await openTabFor(saved.id, 'closed clickhouse tab')
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    await OpenTab.getRepository()
      .createQueryBuilder()
      .update()
      .set({ deletedAt: thirtyDaysAgo })
      .where('id = :id', { id: tab.id })
      .execute()

    await connectUnsaved()

    const history = await OpenTab.getClosedHistory({
      connectionId: saved.id,
      workspaceId: WORKSPACE_ID
    })
    expect(history).toBeTruthy()
  })

  it('reconnecting from the recent list to a never-saved connection stays unkeyed', async () => {
    const saved = buildSavedConnection()
    await saved.save()
    await openTabFor(saved.id, 'clickhouse query')

    await connectUnsaved()
    await store.dispatch('data/usedconnections/load')

    // The recent-connections list passes the used_connection row itself to
    // `connect` when there is no saved connection to resolve it to
    // (ConnectionListItem.savedConnection).
    const recent = (store.state as any)['data/usedconnections'].items[0]
    expect(recent.connectionId).toBeNull()

    const usedConfig = await connectWith({ ...recent })

    // Its used_connection PK (which equals the ClickHouse saved id here)
    // must not become the session's persistence key...
    expect(usedConfig.id).toBeNull()
    expect((store.state as any).tabs.tabs).toHaveLength(0)

    // ...and the row is updated in place: not duplicated, and not stamped
    // with its own PK as a saved_connection reference.
    const used = await UsedConnection.find()
    expect(used).toHaveLength(1)
    expect(used[0].connectionId).toBeNull()
  })

  it('first connect of a saved connection does not hijack an unrelated used_connection row', async () => {
    // An unsaved session creates used_connection row 1.
    await connectUnsaved()

    const saved = buildSavedConnection()
    await saved.save()
    expect(saved.id).toBe(1) // same small-int id space as the used row

    await store.dispatch('data/usedconnections/load')
    await connectWith(await asConfig(saved))

    // The saved connection gets its own used_connection row; the Snowflake
    // row is not overwritten with ClickHouse details or linked to the saved
    // connection just because the ids coincide.
    const used = await UsedConnection.find({ order: { id: 'ASC' } })
    expect(used).toHaveLength(2)
    expect(used[0].connectionId).toBeNull()
    expect(used[0].connectionType).toBe('snowflake')
    expect(used[1].connectionId).toBe(saved.id)
    expect(used[1].connectionType).toBe('clickhouse')
  })
})
