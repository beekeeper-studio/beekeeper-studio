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

  describe('treeItems getter', () => {
    const getTreeItems = (connections: any[]) =>
      store.getters['data/connectionFolders/treeItems'](connections)

    it('returns an empty array when there are no folders or connections', () => {
      expect(getTreeItems([])).toEqual([])
    })

    it('groups connections under their folder and keeps lonely connections at the root', () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      store.commit('data/connectionFolders/upsert', folder)

      const connections = [
        { id: 10, name: 'DB1', connectionFolderId: 1 },
        { id: 11, name: 'DB2', connectionFolderId: null },
      ]

      const result = (store.getters as any)['data/connectionFolders/treeItems'](connections)
      expect(result).toHaveLength(2)

      const lonely = result.filter((n: any) => n.type === 'item')
      expect(lonely).toHaveLength(1)
      expect(lonely[0].config.id).toBe(11)

      const folderNode = result.find((n: any) => n.type === 'folder')
      expect(folderNode.folder).toEqual(folder)
      expect(folderNode.count).toBe(1)
      expect(folderNode.expanded).toBe(true)
      expect(folderNode.children).toHaveLength(1)
      expect(folderNode.children[0].type).toBe('item')
      expect(folderNode.children[0].config.id).toBe(10)
    })

    it('nests subfolders inside their parent folder', () => {
      const parent = { id: 1, name: 'Parent', parentId: null }
      const child = { id: 2, name: 'Child', parentId: 1 }
      store.commit('data/connectionFolders/upsert', parent)
      store.commit('data/connectionFolders/upsert', child)

      const connections = [
        { id: 10, name: 'DB1', connectionFolderId: 1 },
        { id: 11, name: 'DB2', connectionFolderId: 2 },
      ]

      const result = (store.getters as any)['data/connectionFolders/treeItems'](connections)

      expect(result).toHaveLength(1)
      const parentNode = result[0]
      expect(parentNode.children.filter((n: any) => n.type === 'item')).toHaveLength(1)
      expect(parentNode.children.find((n: any) => n.type === 'item').config.id).toBe(10)

      const subfolderNode = parentNode.children.find((n: any) => n.type === 'folder')
      expect(subfolderNode.folder).toEqual(child)
      expect(subfolderNode.children).toHaveLength(1)
      expect(subfolderNode.children[0].config.id).toBe(11)
    })

    it('orders connections within a folder by position', () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      store.commit('data/connectionFolders/upsert', folder)

      const connections = [
        { id: 20, name: 'ZZZ', connectionFolderId: 1, position: 2 },
        { id: 21, name: 'AAA', connectionFolderId: 1, position: 1 },
      ]

      const result = (store.getters as any)['data/connectionFolders/treeItems'](connections)
      const items = result[0].children.filter((n: any) => n.type === 'item')
      expect(items).toHaveLength(2)
      expect(items[0].config.id).toBe(21)
      expect(items[1].config.id).toBe(20)
    })

    it('reflects collapsed state from setFolderExpanded', () => {
      const folder = { id: 1, name: 'Work', parentId: null }
      store.commit('data/connectionFolders/upsert', folder)
      store.commit('data/connectionFolders/setFolderExpanded', { folderId: 1, expanded: false })

      const result = getTreeItems([{ id: 10, name: 'DB1', connectionFolderId: 1 }])

      expect(result[0].expanded).toBe(false)
    })
  })
})
