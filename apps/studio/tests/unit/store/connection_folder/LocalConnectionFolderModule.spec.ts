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
})
