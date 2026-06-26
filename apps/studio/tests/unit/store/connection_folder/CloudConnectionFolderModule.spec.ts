import Vuex from 'vuex'
import Vue from 'vue'
import _ from 'lodash'
import { CloudConnectionFolderModule } from '@/store/modules/data/connection_folder/CloudConnectionFolderModule'
import { camelCaseObjectKeys } from '@/common/utils'
import { res } from '@/lib/cloud/ClientHelpers'

Vue.use(Vuex)

// camelCaseObjectKeys relies on a deepMapKeys lodash mixin that the app
// registers at bootstrap (renderer.ts). Register it here for the test.
_.mixin({
  deepMapKeys(obj: any, fn: any) {
    const x: any = {}
    _.forOwn(obj, function (rawV, k) {
      let v = rawV
      if (_.isPlainObject(v)) {
        v = (_ as any).deepMapKeys(v, fn)
      } else if (_.isArray(v)) {
        v = v.map((item: any) => (_ as any).deepMapKeys(item, fn))
      }
      x[fn(v, k)] = v
    })
    return x
  },
})

// The exact body returned by GET /api/connection_folders, in snake_case as the
// server sends it. The cloud axios layer camel-cases it before the controller
// reads it, so the fixture below reproduces that pipeline faithfully.
const RAW_RESPONSE = {
  connection_folders: [
    {
      id: 2,
      name: 'Team',
      created_at: '2026-06-17T10:11:59.354Z',
      updated_at: '2026-06-17T10:11:59.354Z',
      personal: false,
      parent_id: null,
      default: true,
      team_read: true,
      team_write: true,
      access_grant: null,
      can_read: true,
      can_write: true,
      can_manage: false,
      user_id: null,
      user: null,
      workspace_id: 1,
      connections: 0,
    },
    {
      id: 3,
      name: 'Personal',
      created_at: '2026-06-17T10:11:59.366Z',
      updated_at: '2026-06-17T10:11:59.366Z',
      personal: true,
      parent_id: null,
      default: true,
      team_read: true,
      team_write: false,
      access_grant: null,
      can_read: true,
      can_write: true,
      can_manage: true,
      user_id: 2,
      user: { id: 2, name: 'Other Test' },
      workspace_id: 1,
      connections: 0,
    },
    {
      id: 4,
      name: 'Shared Connections',
      created_at: '2026-06-17T10:11:59.380Z',
      updated_at: '2026-06-17T10:11:59.380Z',
      personal: false,
      parent_id: 2,
      default: false,
      team_read: true,
      team_write: true,
      access_grant: null,
      can_read: true,
      can_write: true,
      can_manage: false,
      user_id: null,
      user: null,
      workspace_id: 1,
      connections: 3,
    },
  ],
  success: true,
  errors: [],
  status: 200,
}

// Run the raw body through the same transform + extraction the controller uses,
// so list() returns exactly what ConnectionFoldersController.list() would.
function parsedFolders() {
  const transformed = camelCaseObjectKeys(RAW_RESPONSE)
  return res({ status: 200, data: transformed } as any, 'connectionFolders')
}

function buildStore(workspaceId = 1, listResult: any[] = parsedFolders()) {
  const list = jest.fn().mockResolvedValue(listResult)
  const cloudClient = { connectionFolders: { list } }
  const store = new Vuex.Store({
    state: { workspaceId } as any,
    getters: {
      cloudClient: () => cloudClient,
    },
    modules: {
      // Fresh state per store: the module's state is a shared object literal,
      // so reusing it leaks items between tests.
      'data/connectionFolders': {
        ...CloudConnectionFolderModule,
        state: { items: [], loading: false, error: null, pollError: null },
      },
    },
  })
  return { store, list }
}

const items = (store: any) => store.state['data/connectionFolders'].items

describe('CloudConnectionFolderModule', () => {
  describe('load action', () => {
    it('camel-cases the API response into the store', async () => {
      const { store, list } = buildStore()

      await store.dispatch('data/connectionFolders/load')

      expect(list).toHaveBeenCalled()
      expect(items(store)).toHaveLength(3)

      const team = items(store).find((f: any) => f.id === 2)
      expect(team.parentId).toBeNull()
      expect(team.workspaceId).toBe(1)
      // snake_case keys must not survive the transform
      expect(team).not.toHaveProperty('parent_id')
      expect(team).not.toHaveProperty('workspace_id')

      const shared = items(store).find((f: any) => f.id === 4)
      expect(shared.parentId).toBe(2)
      expect(shared.connections).toBe(3)
    })

    it('sorts loaded folders by name ascending', async () => {
      const { store } = buildStore()

      await store.dispatch('data/connectionFolders/load')

      expect(items(store).map((f: any) => f.name)).toEqual([
        'Personal',
        'Shared Connections',
        'Team',
      ])
    })

    it('ignores folders that belong to a different workspace', async () => {
      // All fixture folders are workspace 1; the store is on a different one.
      const { store } = buildStore(999)

      await store.dispatch('data/connectionFolders/load')

      expect(items(store)).toHaveLength(0)
    })

    it('records an error when the client fails', async () => {
      const { store } = buildStore()
      const failing = jest.fn().mockRejectedValue(new Error('boom'))
      ;(store.getters.cloudClient.connectionFolders as any).list = failing

      await store.dispatch('data/connectionFolders/load')

      expect(store.state['data/connectionFolders'].error).toBeInstanceOf(Error)
      expect(store.state['data/connectionFolders'].loading).toBe(false)
    })
  })

  describe('foldersWithConnections getter', () => {
    it('nests the subfolder under its parent', async () => {
      const { store } = buildStore()
      await store.dispatch('data/connectionFolders/load')

      const connections = [
        { id: 10, connectionFolderId: 2, position: 0 },
        { id: 11, connectionFolderId: 4, position: 0 },
      ]
      const result = store.getters['data/connectionFolders/foldersWithConnections'](connections)

      // Roots are Team (2) and Personal (3); Shared Connections (4) is a subfolder of Team.
      expect(result).toHaveLength(2)
      const team = result.find((r: any) => r.folder.id === 2)
      expect(team.items.map((c: any) => c.id)).toEqual([10])
      expect(team.subfolders).toHaveLength(1)
      expect(team.subfolders[0].folder.id).toBe(4)
      expect(team.subfolders[0].items.map((c: any) => c.id)).toEqual([11])
    })
  })
})
