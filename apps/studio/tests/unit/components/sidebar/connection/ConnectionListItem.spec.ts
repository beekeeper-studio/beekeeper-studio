import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import ConnectionListItem from '@/components/sidebar/connection/ConnectionListItem.vue'

Vue.use(Vuex)
TimeAgo.addLocale(en)

function buildStore(savedConnections: any[] = []) {
  return new Vuex.Store({
    state: { workspaceId: -1 },
    getters: {
      isCloud: () => false,
      isUltimate: () => true,
    },
    modules: {
      'data/connections': {
        namespaced: true,
        state: { items: savedConnections },
      },
      'data/connectionFolders': {
        namespaced: true,
        state: { items: [] },
      },
    },
  })
}

function buildBksMock() {
  return {
    simpleConnectionString: (c: any) => `${c.host}:${c.port}/${c.defaultDatabase}`,
    buildConnectionString: (c: any) =>
      `${c.connectionType}://${c.username}@${c.host}:${c.port}/${c.defaultDatabase}`,
  }
}

function mountItem(opts: { config: any; isRecentList: boolean; saved?: any[] }) {
  return shallowMount(ConnectionListItem as any, {
    store: buildStore(opts.saved ?? []),
    propsData: {
      config: opts.config,
      isRecentList: opts.isRecentList,
      selectedConfig: null,
      showDuplicate: false,
      pinned: false,
      privacyMode: false,
    },
    mocks: { $bks: buildBksMock() },
  })
}

describe('ConnectionListItem displayConfig', () => {
  it('uses the linked saved connection for display when in the recent list', () => {
    // The used_connection has stale snapshot data
    const usedConfig = {
      id: 100,
      connectionId: 7,
      workspaceId: -1,
      connectionType: 'postgresql',
      host: 'old-host.example.com',
      port: 5432,
      username: 'olduser',
      defaultDatabase: 'mydb',
      sshHost: 'old-ssh.example.com',
      updatedAt: new Date(),
    }

    // The saved connection has fresh data
    const saved = {
      id: 7,
      workspaceId: -1,
      name: 'My DB',
      connectionType: 'postgresql',
      host: 'new-host.example.com',
      port: 6543,
      username: 'newuser',
      defaultDatabase: 'mydb',
      sshHost: 'new-ssh.example.com',
      labelColor: 'default',
    }

    const wrapper = mountItem({ config: usedConfig, isRecentList: true, saved: [saved] })

    expect(wrapper.vm['displayConfig']).toBe(saved)
    expect(wrapper.vm['title']).toContain('new-host.example.com')
    expect(wrapper.vm['title']).toContain('newuser')
    expect(wrapper.vm['title']).not.toContain('old-host.example.com')
    expect(wrapper.html()).toContain('new-ssh.example.com')
    expect(wrapper.html()).not.toContain('old-ssh.example.com')
  })

  it('falls back to the snapshot when the linked saved connection is missing', () => {
    // Orphan recent entry: connectionId points at a saved connection that no
    // longer exists. The display falls back to the snapshot.
    const usedConfig = {
      id: 100,
      connectionId: 999,
      workspaceId: -1,
      connectionType: 'postgresql',
      host: 'snapshot-host.example.com',
      port: 5432,
      username: 'snapshotuser',
      defaultDatabase: 'mydb',
      updatedAt: new Date(),
    }

    const wrapper = mountItem({ config: usedConfig, isRecentList: true, saved: [] })

    expect(wrapper.vm['displayConfig']).toBe(usedConfig)
    expect(wrapper.vm['title']).toContain('snapshot-host.example.com')
  })

  it('uses the row config directly when not a recent-list item', () => {
    // A saved-connection row in the sidebar - displayConfig is the config itself.
    const saved = {
      id: 7,
      workspaceId: -1,
      name: 'My DB',
      connectionType: 'postgresql',
      host: 'saved-host.example.com',
      port: 5432,
      username: 'user',
      defaultDatabase: 'mydb',
      labelColor: 'default',
    }

    const wrapper = mountItem({ config: saved, isRecentList: false, saved: [saved] })

    expect(wrapper.vm['displayConfig']).toBe(saved)
    expect(wrapper.vm['title']).toContain('saved-host.example.com')
  })
})
