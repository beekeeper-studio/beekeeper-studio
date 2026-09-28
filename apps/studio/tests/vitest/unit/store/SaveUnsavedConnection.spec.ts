import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Vue from 'vue'
import store from '@/store'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { PinnedEntity } from '@/common/appdb/models/PinnedEntity'
import { HiddenEntity } from '@/common/appdb/models/HiddenEntity'
import { HiddenSchema } from '@/common/appdb/models/HiddenSchema'
import { OpenTab } from '@/common/appdb/models/OpenTab'
import { UtilConnectionModule } from '@/store/modules/data/connection/UtilityConnectionModule'

const WORKSPACE_ID = -1

// Saving the connection a session is on, from the sidebar's Save Connection
// (ConnectionButton.save): saveConnection, then the session's pins and hidden
// entities. For a connection that was never saved, nothing in the session had
// a connection id: the pins and hidden entities failed validation, the
// session kept looking unsaved, and saving again inserted a duplicate.

async function saveFromSidebar() {
  await store.dispatch('saveConnection', store.state.usedConfig)
  await store.dispatch('pins/maybeSavePins')
  await store.dispatch('hideEntities/maybeSave')
}

const users = { name: 'users', schema: 'public', entityType: 'table' }
const audit = { name: 'audit', schema: 'public', entityType: 'table' }

function openTab(title: string) {
  return store.dispatch('tabs/add', { item: { tabType: 'query', title, unsavedChanges: false }, endOfPosition: true })
}

beforeEach(async () => {
  await TestOrmConnection.connect()
  Vue.prototype.$util = {
    send: async (channel: string, args: any) => {
      const handler = (AppDbHandlers as any)[channel]
      if (!handler) throw new Error(`No handler for ${channel}`)
      return await handler(args)
    },
  }
  ;(window as any).main = { setWindowTitle: vi.fn() }
  // registered under its literal slashed name, the way DataManager does it
  store.registerModule('data/connections', UtilConnectionModule)
  store.commit('workspaceId', WORKSPACE_ID)
  // what connect commits for a connection the user connected without saving
  const fresh = await AppDbHandlers['appdb/saved/new']({ init: null })
  store.commit('newConnection', {
    ...fresh,
    id: null,
    name: 'Scratch',
    connectionType: 'postgresql',
    host: 'db.example.com',
    defaultDatabase: 'app',
    workspaceId: WORKSPACE_ID,
  })
})

afterEach(async () => {
  store.commit('tabs/set', [])
  store.commit('pins/set', [])
  store.commit('hideEntities/set', { entities: [], schemas: [] })
  store.commit('clearConnection')
  store.commit('newConnection', null)
  store.unregisterModule('data/connections')
  await TestOrmConnection.disconnect()
})

describe('saving the connection a session is on', () => {
  it('keys the session on the saved connection', async () => {
    await saveFromSidebar()

    const saved = await SavedConnection.find()
    expect(saved.map((c) => c.name)).toEqual(['Scratch'])
    expect(store.state.usedConfig.id).toBe(saved[0].id)

    // saving again updates it instead of inserting another one
    store.state.usedConfig.name = 'Scratch, renamed'
    await saveFromSidebar()

    expect((await SavedConnection.find()).map((c) => c.name)).toEqual(['Scratch, renamed'])
  })

  it('persists the pins and hidden entities from before the save', async () => {
    await store.dispatch('pins/add', users)
    await store.dispatch('hideEntities/addEntity', audit)
    await store.dispatch('hideEntities/addSchema', 'internal')

    await saveFromSidebar()

    const connectionId = store.state.usedConfig.id
    expect((await PinnedEntity.findBy({ connectionId })).map((p) => p.entityName)).toEqual(['users'])
    expect((await HiddenEntity.findBy({ connectionId })).map((e) => e.entityName)).toEqual(['audit'])
    expect((await HiddenSchema.findBy({ connectionId })).map((s) => s.name)).toEqual(['internal'])

    // the session now holds the saved rows, so unpinning removes the row
    await store.dispatch('pins/remove', users)
    await store.dispatch('hideEntities/removeEntity', audit)
    await store.dispatch('hideEntities/removeSchema', 'internal')
    expect(await PinnedEntity.count()).toBe(0)
    expect(await HiddenEntity.count()).toBe(0)
    expect(await HiddenSchema.count()).toBe(0)
  })

  it('keeps the tabs from before the save in memory, and persists the ones opened after', async () => {
    const before = await openTab('Query #1')

    await saveFromSidebar()

    // the pre-save tab was never in the database, and nothing puts it there
    await store.dispatch('tabs/setActive', before)
    await store.dispatch('tabs/reorder', [before])
    await store.dispatch('tabs/save', before)
    expect(await OpenTab.count()).toBe(0)

    const after = await openTab('Query #2')
    await store.dispatch('tabs/setActive', after)
    expect((await OpenTab.find()).map((t) => [t.title, t.connectionId])).toEqual([['Query #2', store.state.usedConfig.id]])

    await store.dispatch('tabs/remove', before)
    expect((store.state as any).tabs.tabs.map((t) => t.title)).toEqual(['Query #2'])
    expect(await OpenTab.count()).toBe(1)
  })
})

describe('the pins and hidden entities of a session on an unsaved connection', () => {
  it('have nothing to be saved yet', async () => {
    await store.dispatch('pins/add', users)
    await store.dispatch('hideEntities/addEntity', audit)

    await expect(store.dispatch('pins/maybeSavePins')).resolves.toBeUndefined()
    await expect(store.dispatch('hideEntities/maybeSave')).resolves.toBeUndefined()

    expect(await PinnedEntity.count()).toBe(0)
    expect(await HiddenEntity.count()).toBe(0)
    // still there for the session
    expect((store.state as any).pins.pins).toHaveLength(1)
    expect((store.state as any).hideEntities.entities).toHaveLength(1)
  })
})
