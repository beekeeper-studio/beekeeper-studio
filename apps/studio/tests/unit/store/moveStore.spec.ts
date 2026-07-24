import Vuex from 'vuex'
import Vue from 'vue'
import { folderMoveActions, itemMoveActions } from '@/store/modules/data/move/moveStore'

Vue.use(Vuex)

const reorder = jest.fn()
const save = jest.fn()

const FOLDERS = [
  { id: 1, name: 'Work', parentId: null },
  { id: 2, name: 'Staging', parentId: 1 },
  { id: 3, name: 'Archive', parentId: null },
]

const CONNECTIONS = [
  { id: 10, name: 'Local', connectionFolderId: null, position: 1 },
  { id: 11, name: 'Prod', connectionFolderId: 2, position: 1 },
]

function buildStore() {
  return new Vuex.Store({
    modules: {
      connections: {
        namespaced: true,
        state: { items: CONNECTIONS.map((c) => ({ ...c })) },
        actions: { ...itemMoveActions('connectionFolderId'), reorder },
      },
      folders: {
        namespaced: true,
        state: { items: FOLDERS.map((f) => ({ ...f })) },
        actions: { ...folderMoveActions(), save },
      },
    },
  })
}

const payloadOf = (mock: jest.Mock) => mock.mock.calls[0][1]

describe('itemMoveActions', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(() => {
    reorder.mockReset()
    store = buildStore()
  })

  it('treats the target as a folder when dropping inside one', async () => {
    await store.dispatch('connections/move', {
      sourceId: 10,
      targetId: 2,
      position: 'inside',
    })

    expect(payloadOf(reorder)).toMatchObject({
      item: { id: 10 },
      connectionFolderId: 2,
      position: { before: null },
    })
  })

  it('moves to the top level when dropping inside no folder', async () => {
    await store.dispatch('connections/move', {
      sourceId: 11,
      targetId: null,
      position: 'inside',
    })

    expect(payloadOf(reorder)).toMatchObject({ connectionFolderId: null })
  })

  it('inherits the folder of the sibling it lands next to', async () => {
    await store.dispatch('connections/move', {
      sourceId: 10,
      targetId: 11,
      position: 'after',
    })

    expect(payloadOf(reorder)).toMatchObject({
      item: { id: 10 },
      connectionFolderId: 2,
      position: { after: 11 },
    })
  })

  it('ignores a source that is not in the store', async () => {
    await store.dispatch('connections/move', {
      sourceId: 999,
      targetId: 2,
      position: 'inside',
    })

    expect(reorder).not.toHaveBeenCalled()
  })
})

describe('folderMoveActions', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(() => {
    save.mockReset()
    store = buildStore()
  })

  it('reparents the folder when dropping inside another', async () => {
    await store.dispatch('folders/move', {
      sourceId: 2,
      targetId: null,
      position: 'inside',
    })

    expect(payloadOf(save)).toMatchObject({ id: 2, parentId: null })
  })

  it('becomes a sibling of the target when dropping before or after it', async () => {
    await store.dispatch('folders/move', {
      sourceId: 3,
      targetId: 2,
      position: 'before',
    })

    expect(payloadOf(save)).toMatchObject({ id: 3, parentId: 1 })
  })

  it('does nothing when the folder already lives there', async () => {
    await store.dispatch('folders/move', {
      sourceId: 2,
      targetId: 1,
      position: 'inside',
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('refuses to put a folder inside itself', async () => {
    await store.dispatch('folders/move', {
      sourceId: 2,
      targetId: 2,
      position: 'inside',
    })

    expect(save).not.toHaveBeenCalled()
  })
})
