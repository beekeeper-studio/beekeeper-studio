import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import ConnectionInterface from '@/components/ConnectionInterface.vue'

Vue.use(Vuex)

// split.js needs real DOM geometry, and only drives the sidebar gutter.
jest.mock('split.js', () => jest.fn(() => ({
  destroy: jest.fn(),
  getSizes: () => [25, 75],
})))

const WORKSPACE_ID = -1

// The recent-connections list is the only place a used_connection row can
// enter this screen: it hands one over whenever the connection it came from
// was never saved (or has since been deleted). used_connection ids come from
// their own sequence, while everything the core interface persists
// per-connection (tabs, pins, hidden entities, tab history) is keyed on a
// saved_connection id - so a used_connection must never leave this screen.

function buildStore(connectCalls: any[]) {
  return new Vuex.Store({
    state: {
      workspaceId: WORKSPACE_ID,
      connection: null,
      sshConfigWarnings: [],
      username: 'testuser',
    } as any,
    getters: {
      isUltimate: () => true,
      isCloud: () => false,
      workspace: () => ({ id: WORKSPACE_ID }),
    },
    actions: {
      connect(_context, payload) {
        connectCalls.push(payload)
      },
    },
    modules: {
      'data/connections': {
        namespaced: true,
        state: { items: [] },
        actions: { remove: jest.fn() },
      },
      'data/connectionFolders': { namespaced: true, state: { items: [] } },
      licenses: {
        namespaced: true,
        getters: { isTrial: () => false, trialLicense: () => null },
      },
      settings: { namespaced: true, getters: { privacyMode: () => false } },
      pinnedConnections: {
        namespaced: true,
        actions: { loadPins: jest.fn(), reorder: jest.fn(), remove: jest.fn() },
      },
      credentials: { namespaced: true, actions: { load: jest.fn() } },
    },
  })
}

// A recent-connections row for a connection that was never saved, built the
// way recordUsed builds one.
async function buildRecentRow(overrides: any = {}) {
  const fresh = await AppDbHandlers['appdb/saved/new']({
    init: {
      connectionType: 'postgresql',
      host: 'orphan.example.com',
      port: 5432,
      username: 'app',
      defaultDatabase: 'analytics',
      ...overrides,
    }
  })

  const used = new UsedConnection()
  used.withProps({ ...fresh, id: null, connectionId: null, workspaceId: WORKSPACE_ID } as any)
  await used.save()

  const rows = await AppDbHandlers['appdb/used/find']({ options: {} })
  return rows[rows.length - 1]
}

describe('ConnectionInterface', () => {
  let wrapper: any
  let connectCalls: any[]

  beforeEach(async () => {
    await TestOrmConnection.connect()
    connectCalls = []

    wrapper = shallowMount(ConnectionInterface as any, {
      store: buildStore(connectCalls),
      mocks: {
        $config: { appVersion: '0.0.0', defaults: { connectionTypes: [] } },
        $util: {
          send: async (channel: string, args: any) => {
            const handler = (AppDbHandlers as any)[channel]
            if (!handler) throw new Error(`No handler for ${channel}`)
            return await handler(args ?? {})
          },
        },
        $bks: { unlock: async () => ({ auth: null, cancelled: false }) },
        $confirm: async () => true,
        $noty: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
        registerHandlers: jest.fn(),
        unregisterHandlers: jest.fn(),
      },
    })
  })

  afterEach(async () => {
    wrapper.destroy()
    await TestOrmConnection.disconnect()
  })

  it('connects with a brand new unsaved connection, never the used_connection row', async () => {
    const recent = await buildRecentRow()
    expect(recent.id).toBeTruthy()

    await wrapper.vm.handleConnect(recent)

    expect(connectCalls).toHaveLength(1)
    const { config } = connectCalls[0]

    // No id to collide with an unrelated saved connection, and nothing
    // used_connection-shaped left on it...
    expect(config.id).toBeNull()
    expect(Object.prototype.hasOwnProperty.call(config, 'connectionId')).toBe(false)

    // ...but filled out with everything needed to connect.
    expect(config.connectionType).toBe('postgresql')
    expect(config.host).toBe('orphan.example.com')
    expect(config.port).toBe(5432)
    expect(config.username).toBe('app')
    expect(config.defaultDatabase).toBe('analytics')
  })

  it('loads a used_connection into the form as a brand new unsaved connection', async () => {
    const recent = await buildRecentRow({ host: 'edit-me.example.com' })

    await wrapper.vm.edit(recent)

    expect(wrapper.vm.config.id).toBeNull()
    expect(Object.prototype.hasOwnProperty.call(wrapper.vm.config, 'connectionId')).toBe(false)
    expect(wrapper.vm.config.host).toBe('edit-me.example.com')
  })

  it('connects with a saved connection unchanged', async () => {
    const saved = await AppDbHandlers['appdb/saved/save']({
      obj: {
        connectionType: 'postgresql',
        name: 'My Saved Conn',
        host: 'saved.example.com',
        port: 5432,
        workspaceId: WORKSPACE_ID,
      },
      options: {},
    } as any)

    await wrapper.vm.handleConnect({ ...saved, workspaceId: WORKSPACE_ID })

    const { config } = connectCalls[0]
    expect(config.id).toBe(saved.id)
    expect(config.host).toBe('saved.example.com')
  })

  it('clears the form when the connection being edited is deleted', async () => {
    const saved = await AppDbHandlers['appdb/saved/save']({
      obj: {
        connectionType: 'postgresql',
        name: 'Doomed',
        host: 'doomed.example.com',
        workspaceId: WORKSPACE_ID,
      },
      options: {},
    } as any)

    // The screen edits a copy, so `remove` can't compare by identity.
    await wrapper.vm.edit({ ...saved, workspaceId: WORKSPACE_ID })
    expect(wrapper.vm.config.id).toBe(saved.id)

    await wrapper.vm.remove({ ...saved, workspaceId: WORKSPACE_ID })

    expect(wrapper.vm.config.id).toBeNull()
  })
})
