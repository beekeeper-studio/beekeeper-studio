import Vuex from 'vuex'
import Vue from 'vue'
import { UtilConnectionModule } from '@/store/modules/data/connection/UtilityConnectionModule'

Vue.use(Vuex)

// Mock Vue.prototype.$util.send
const mockSend = jest.fn().mockImplementation(async (channel, { obj }) => {
  // Return the object as-is (simulating successful save)
  return obj
})

Vue.prototype.$util = {
  send: mockSend
}

describe('UtilConnectionModule reorder', () => {
  let store: any

  beforeEach(() => {
    mockSend.mockClear()

    store = new Vuex.Store({
      modules: {
        connections: {
          ...UtilConnectionModule,
          namespaced: true
        }
      }
    })
  })

  describe('position sorting bug fix', () => {
    it('correctly reorders when state items are not sorted by position', async () => {
      // This test reproduces the bug where moving from position 5 to position 2
      // caused the item at position 3 to jump to position 5 instead of position 4.
      //
      // The bug occurred because siblings were filtered from state without sorting,
      // and state order doesn't guarantee position order.

      // Set up items in state in a DIFFERENT order than their positions
      // State order: [id:3, id:1, id:5, id:2, id:4] (arbitrary)
      // Position order: id:1=1, id:2=2, id:3=3, id:4=4, id:5=5
      const items = [
        { id: 3, name: 'C3', position: 3, connectionFolderId: 1 },
        { id: 1, name: 'C1', position: 1, connectionFolderId: 1 },
        { id: 5, name: 'C5', position: 5, connectionFolderId: 1 },
        { id: 2, name: 'C2', position: 2, connectionFolderId: 1 },
        { id: 4, name: 'C4', position: 4, connectionFolderId: 1 },
      ]

      store.commit('connections/replace', items)

      // Move item at position 5 (id:5) to position 2 (before id:2)
      const itemToMove = items.find(i => i.id === 5)!
      await store.dispatch('connections/reorder', {
        item: itemToMove,
        position: { before: 2 }, // Insert before item with id:2
        connectionFolderId: 1
      })

      // Get the final state sorted by position
      const finalItems = [...store.state.connections.items].sort(
        (a, b) => a.position - b.position
      )

      // Expected order: C1(1), C5(2), C2(3), C3(4), C4(5)
      expect(finalItems.map(i => ({ id: i.id, position: i.position }))).toEqual([
        { id: 1, position: 1 },
        { id: 5, position: 2 },
        { id: 2, position: 3 },
        { id: 3, position: 4 },
        { id: 4, position: 5 },
      ])
    })

    it('correctly reorders to first position when state is unsorted', async () => {
      // Items in state in random order
      const items = [
        { id: 2, name: 'C2', position: 2, connectionFolderId: 1 },
        { id: 3, name: 'C3', position: 3, connectionFolderId: 1 },
        { id: 1, name: 'C1', position: 1, connectionFolderId: 1 },
      ]

      store.commit('connections/replace', items)

      // Move C3 to first position
      const itemToMove = items.find(i => i.id === 3)!
      await store.dispatch('connections/reorder', {
        item: itemToMove,
        position: { before: null }, // First position
        connectionFolderId: 1
      })

      const finalItems = [...store.state.connections.items].sort(
        (a, b) => a.position - b.position
      )

      // Expected: C3(1), C1(2), C2(3)
      expect(finalItems.map(i => ({ id: i.id, position: i.position }))).toEqual([
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 },
      ])
    })

    it('correctly reorders after an item when state is unsorted', async () => {
      // Items in state in random order
      const items = [
        { id: 3, name: 'C3', position: 3, connectionFolderId: 1 },
        { id: 1, name: 'C1', position: 1, connectionFolderId: 1 },
        { id: 2, name: 'C2', position: 2, connectionFolderId: 1 },
      ]

      store.commit('connections/replace', items)

      // Move C3 after C1 (should become position 2)
      const itemToMove = items.find(i => i.id === 3)!
      await store.dispatch('connections/reorder', {
        item: itemToMove,
        position: { after: 1 }, // After item with id:1
        connectionFolderId: 1
      })

      const finalItems = [...store.state.connections.items].sort(
        (a, b) => a.position - b.position
      )

      // Expected: C1(1), C3(2), C2(3)
      expect(finalItems.map(i => ({ id: i.id, position: i.position }))).toEqual([
        { id: 1, position: 1 },
        { id: 3, position: 2 },
        { id: 2, position: 3 },
      ])
    })

    it('maintains correct positions when moving within unsorted state', async () => {
      // Simulate real-world scenario: items loaded in arbitrary order
      const items = [
        { id: 4, name: 'D', position: 4, connectionFolderId: null },
        { id: 1, name: 'A', position: 1, connectionFolderId: null },
        { id: 3, name: 'C', position: 3, connectionFolderId: null },
        { id: 2, name: 'B', position: 2, connectionFolderId: null },
      ]

      store.commit('connections/replace', items)

      // Move D (position 4) to position 2
      await store.dispatch('connections/reorder', {
        item: { id: 4, name: 'D', position: 4, connectionFolderId: null },
        position: { before: 2 },
        connectionFolderId: null
      })

      const finalItems = [...store.state.connections.items]
        .filter(i => i.connectionFolderId === null)
        .sort((a, b) => a.position - b.position)

      // All items should have sequential positions with no gaps
      const positions = finalItems.map(i => i.position)
      expect(positions).toEqual([1, 2, 3, 4])

      // D should now be at position 2
      const itemD = finalItems.find(i => i.id === 4)
      expect(itemD?.position).toBe(2)

      // Items that were after the insertion point should shift down
      // A stays at 1, D is now 2, B shifts to 3, C shifts to 4
      expect(finalItems.map(i => i.id)).toEqual([1, 4, 2, 3])
    })
  })
})
