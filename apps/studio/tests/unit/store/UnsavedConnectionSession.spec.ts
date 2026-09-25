import Vue from 'vue'
import store from '@/store'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { OpenTab } from '@/common/appdb/models/OpenTab'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers'
import { UtilConnectionModule } from '@/store/modules/data/connection/UtilityConnectionModule'

const Handlers = { ...AppDbHandlers, ...TabHistoryHandlers }
const LOCAL_WORKSPACE = -1
const CLOUD_WORKSPACE = 5

// Everything CoreTabs does is keyed on `tab.id`: which header is selected,
// which pane is shown, v-for keys, per-tab modals. A connection that was never
// saved used to have no id, so its tabs never got one either - every tab
// matched the active one, and clicking another tab did nothing. Its session
// now runs on an anonymous saved connection instead.

// What the connection form hands to `connect` when the user fills in a new
// connection and hits Connect without saving.
async function unsavedRedshiftConfig() {
  const fresh = await AppDbHandlers['appdb/saved/new']({ init: null })
  return {
    ...fresh,
    id: null,
    connectionType: 'redshift',
    name: null,
    host: 'example.redshift.amazonaws.com',
    port: 5439,
    username: 'analyst',
    password: 'hunter2',
    defaultDatabase: 'dev',
  }
}

async function openTab(title: string) {
  const item = { tabType: 'query', title, unsavedChanges: false }
  return await store.dispatch('tabs/add', { item, endOfPosition: true })
}

// DataManager registers these in the app, under their literal slashed names.
const DATA_MODULES = ['data/connections', 'data/connectionFolders', 'data/usedconnections']

beforeEach(async () => {
  await TestOrmConnection.connect()
  Vue.prototype.$util = {
    send: async (channel: string, args: any) => {
      if (channel === 'conn/getServerConfig') return {}
      if (channel.startsWith('conn/')) return undefined
      const handler = (Handlers as any)[channel]
      if (!handler) throw new Error(`No handler for ${channel}`)
      return await handler(args)
    }
  }
  Vue.prototype.$noty = { warning: jest.fn() }
  ;(window as any).main = {
    enableConnectionMenuItems: jest.fn(),
    disableConnectionMenuItems: jest.fn(),
    setWindowTitle: jest.fn(),
  }
  // the connection client talks to the utility process - stub what connect
  // and disconnect ask of it
  Object.assign(store.state.connection, {
    defaultSchema: async () => 'public',
    supportedFeatures: async () => ({ backups: false }),
    versionString: async () => '1.0.0',
    listDatabases: async () => ['dev'],
    listSchemas: async () => [],
    listTables: async () => [],
    listViews: async () => [],
    listMaterializedViews: async () => [],
    listRoutines: async () => [],
    disconnect: async () => undefined,
  })
  store.commit('setUsername', 'tester')
  store.commit('workspaceId', LOCAL_WORKSPACE)
  store.registerModule('data/connections', UtilConnectionModule)
  store.registerModule('data/connectionFolders', { namespaced: true, actions: { refresh: async () => undefined } } as any)
  store.registerModule('data/usedconnections', { namespaced: true, state: { items: [] }, actions: { load: async () => undefined } } as any)
})

afterEach(async () => {
  store.commit('clearConnection')
  store.commit('newConnection', null)
  store.commit('tabs/set', [])
  store.commit('workspaceId', LOCAL_WORKSPACE)
  DATA_MODULES.forEach((path) => store.unregisterModule(path))
  await TestOrmConnection.disconnect()
})

describe('a session on a connection that was never saved', () => {
  it('runs on an anonymous connection of its own', async () => {
    const config = await unsavedRedshiftConfig()

    await store.dispatch('connect', { config })

    const usedConfig = store.state.usedConfig
    expect(usedConfig.anon).toBe(true)
    expect(usedConfig.id).toEqual(expect.any(Number))
    // the session connects with everything the user typed in...
    expect(usedConfig.password).toBe('hunter2')
    // ...but the connection form's own config stays unsaved
    expect(config.id).toBeNull()

    const anon = await SavedConnection.findOneBy({ id: usedConfig.id })
    expect(anon.anon).toBe(true)
    expect(anon.password).toBeNull()
    const listed = await AppDbHandlers['appdb/saved/find']({})
    expect(listed.map((c) => c.id)).not.toContain(usedConfig.id)
  })

  it('gives every tab its own id, so tabs can be switched', async () => {
    await store.dispatch('connect', { config: await unsavedRedshiftConfig() })
    const first = await openTab('Query #1')
    const second = await openTab('Query #2')
    expect(first.id).toEqual(expect.any(Number))
    expect(second.id).not.toEqual(first.id)
    await store.dispatch('tabs/setActive', first)

    await store.dispatch('tabs/setActive', second)

    const { tabs, active } = (store.state as any).tabs
    // how CoreTabs decides which header is selected and which pane is shown
    const shown = tabs.filter((t) => active?.id === t.id)
    expect(shown.map((t) => t.title)).toEqual(['Query #2'])
  })

  it('removes the anonymous connection on disconnect', async () => {
    await store.dispatch('connect', { config: await unsavedRedshiftConfig() })
    expect(await SavedConnection.countBy({ anon: true })).toBe(1)

    await store.dispatch('disconnect')

    expect(await SavedConnection.countBy({ anon: true })).toBe(0)
  })

  it('keeps it, and its tabs, once saved from the core interface', async () => {
    await store.dispatch('connect', { config: await unsavedRedshiftConfig() })
    await openTab('Query #1')
    const usedConfig = store.state.usedConfig
    // what the save form edits
    usedConfig.name = 'Redshift'

    await store.dispatch('saveConnection', usedConfig)
    await store.dispatch('disconnect')

    const saved = await SavedConnection.findOneBy({ id: usedConfig.id })
    expect(saved.anon).toBe(false)
    expect(saved.name).toBe('Redshift')
    expect(saved.password).toBe('hunter2')
    expect(await OpenTab.countBy({ connectionId: usedConfig.id })).toBe(1)
  })

  describe('in a cloud workspace', () => {
    let savedToCloud: jest.Mock

    beforeEach(() => {
      savedToCloud = jest.fn(async () => 99)
      store.unregisterModule('data/connections')
      store.registerModule('data/connections', {
        namespaced: true,
        state: { items: [] },
        actions: {
          save: (_context, item) => savedToCloud(item),
          refresh: async () => undefined,
        },
      } as any)
      store.commit('workspaceId', CLOUD_WORKSPACE)
    })

    it('saves it as an untitled cloud connection instead', async () => {
      await store.dispatch('connect', { config: await unsavedRedshiftConfig() })

      // without the password - the user didn't choose to save it
      expect(savedToCloud).toHaveBeenCalledWith(expect.objectContaining({
        id: null,
        name: 'Untitled Connection',
        rememberPassword: false,
      }))
      const usedConfig = store.state.usedConfig
      expect(usedConfig).toMatchObject({ id: 99, name: 'Untitled Connection', workspaceId: CLOUD_WORKSPACE })
      expect(usedConfig.anon).toBeFalsy()
      expect(usedConfig.password).toBe('hunter2')
      // nothing local
      expect(await SavedConnection.count()).toBe(0)
    })

    it('keeps the name the connection was given', async () => {
      const config = { ...(await unsavedRedshiftConfig()), name: 'Warehouse' }

      await store.dispatch('connect', { config })

      expect(savedToCloud).toHaveBeenCalledWith(expect.objectContaining({ name: 'Warehouse' }))
    })

    it('keeps the cloud connection on disconnect', async () => {
      await store.dispatch('connect', { config: await unsavedRedshiftConfig() })
      const send = jest.spyOn(Vue.prototype.$util, 'send')

      await store.dispatch('disconnect')

      expect(send).not.toHaveBeenCalledWith('appdb/saved/remove', expect.anything())
    })
  })
})

describe('a session on a saved connection', () => {
  it('runs on the saved connection, which disconnect keeps', async () => {
    const saved = await AppDbHandlers['appdb/saved/save']({
      obj: { ...(await unsavedRedshiftConfig()), name: 'Redshift' },
      options: {},
    })

    await store.dispatch('connect', { config: saved })
    expect(store.state.usedConfig.id).toBe(saved.id)
    expect(store.state.usedConfig.anon).toBeFalsy()
    await store.dispatch('disconnect')

    expect(await SavedConnection.count()).toBe(1)
    expect(await SavedConnection.findOneBy({ id: saved.id })).toBeTruthy()
  })
})
