import Vuex from 'vuex'
import Vue from 'vue'
import { LocalConnectionFolderModule } from '@/store/modules/data/connection_folder/LocalConnectionFolderModule'
import { UtilConnectionModule } from '@/store/modules/data/connection/UtilityConnectionModule'

Vue.use(Vuex)

const mockSend = jest.fn()
Vue.prototype.$util = { send: mockSend }

function buildStore() {
  return new Vuex.Store({
    state: { workspaceId: -1 },
    modules: {
      'data/connectionFolders': LocalConnectionFolderModule,
      'data/connections': UtilConnectionModule,
    }
  })
}

describe('LocalConnectionFolderModule', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(() => {
    mockSend.mockReset()
    store = buildStore()
  })

  describe('moveToFolder action', () => {
    it('updates connectionFolderId in the connections store', async () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      const connection = { id: 42, name: 'My DB', connectionFolderId: null }

      store.commit('data/connections/upsert', connection)

      mockSend.mockResolvedValue({ ...connection, connectionFolderId: folder.id })

      await store.dispatch('data/connectionFolders/moveToFolder', { connection, folder })

      const connections = (store.state as any)['data/connections'].items
      const updated = connections.find((c: any) => c.id === connection.id)
      expect(updated).toBeDefined()
      expect(updated.connectionFolderId).toBe(folder.id)
    })

    it('does not include connectionFolder in the save payload', async () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      // Real connections loaded from the backend will not have connectionFolder
      // as an own property (the model no longer initializes it to null).
      const connection = { id: 42, name: 'My DB', connectionFolderId: null }

      store.commit('data/connections/upsert', connection)
      mockSend.mockResolvedValue({ id: 42, name: 'My DB', connectionFolderId: folder.id })

      await store.dispatch('data/connectionFolders/moveToFolder', { connection, folder })

      const [, payload] = mockSend.mock.calls[0]
      expect(payload.obj).not.toHaveProperty('connectionFolder')
    })

    it('preserves the connection id in the store after move', async () => {
      const folder = { id: 5, name: 'Staging', parentId: null }
      const connection = { id: 99, name: 'Staging DB', connectionFolderId: null }

      store.commit('data/connections/upsert', connection)
      mockSend.mockResolvedValue({ ...connection, connectionFolderId: folder.id })

      await store.dispatch('data/connectionFolders/moveToFolder', { connection, folder })

      const connections = (store.state as any)['data/connections'].items
      expect(connections.find((c: any) => c.id === 99)).toBeDefined()
    })
  })

  describe('foldersWithConnections getter', () => {
    it('returns an empty array when there are no folders', () => {
      const result = (store.getters as any)['data/connectionFolders/foldersWithConnections']([])
      expect(result).toEqual([])
    })

    it('groups connections under their folder', () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      store.commit('data/connectionFolders/upsert', folder)

      const connections = [
        { id: 10, name: 'DB1', connectionFolderId: 1 },
        { id: 11, name: 'DB2', connectionFolderId: null },
      ]

      const result = (store.getters as any)['data/connectionFolders/foldersWithConnections'](connections)

      expect(result).toHaveLength(1)
      expect(result[0].folder).toEqual(folder)
      expect(result[0].connections).toHaveLength(1)
      expect(result[0].connections[0].id).toBe(10)
    })

    it('groups connections under subfolders', () => {
      const parent = { id: 1, name: 'Parent', parentId: null }
      const child = { id: 2, name: 'Child', parentId: 1 }
      store.commit('data/connectionFolders/upsert', parent)
      store.commit('data/connectionFolders/upsert', child)

      const connections = [
        { id: 10, name: 'DB1', connectionFolderId: 1 },
        { id: 11, name: 'DB2', connectionFolderId: 2 },
      ]

      const result = (store.getters as any)['data/connectionFolders/foldersWithConnections'](connections)

      expect(result).toHaveLength(1)
      expect(result[0].connections).toHaveLength(1)
      expect(result[0].connections[0].id).toBe(10)
      expect(result[0].subfolders).toHaveLength(1)
      expect(result[0].subfolders[0].folder).toEqual(child)
      expect(result[0].subfolders[0].connections).toHaveLength(1)
      expect(result[0].subfolders[0].connections[0].id).toBe(11)
    })

    it('uses the connections passed as argument, not store state', () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      store.commit('data/connectionFolders/upsert', folder)

      const sortedConnections = [
        { id: 20, name: 'ZZZ', connectionFolderId: 1 },
        { id: 21, name: 'AAA', connectionFolderId: 1 },
      ]

      const result = (store.getters as any)['data/connectionFolders/foldersWithConnections'](sortedConnections)

      expect(result[0].connections).toHaveLength(2)
      expect(result[0].connections[0].id).toBe(20)
      expect(result[0].connections[1].id).toBe(21)
    })
  })
})
