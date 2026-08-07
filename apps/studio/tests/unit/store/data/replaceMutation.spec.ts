import { mutationsFor } from '@/store/modules/data/DataModuleBase'

type Conn = {
  id: number
  name: string
  connectionFolderId: number | null
}

const mutations = mutationsFor<Conn>({}, { field: 'name', direction: 'asc' })

function buildState(items: Conn[], pendingSaveIds: number[] = []) {
  return {
    items,
    loading: false,
    error: null,
    pollError: null,
    pendingSaveIds,
  }
}

const conn = (id: number, name: string, folderId: number | null): Conn => ({
  id,
  name,
  connectionFolderId: folderId,
})

const ids = (state: { items: Conn[] }) => state.items.map((i) => i.id)

describe('data store replace mutation', () => {
  describe('unscoped payload', () => {
    it('drops items missing from the payload', () => {
      const state = buildState([conn(1, 'a', null), conn(2, 'b', null)])

      mutations.replace(state, [conn(1, 'a', null)])

      expect(ids(state)).toEqual([1])
    })

    it('keeps items with a pending save', () => {
      const state = buildState([conn(1, 'a', null), conn(2, 'b', null)], [2])

      mutations.replace(state, [conn(1, 'a', null)])

      expect(ids(state)).toEqual([1, 2])
    })

    it('inserts and updates in one pass, sorted', () => {
      const state = buildState([conn(1, 'zulu', null)])

      mutations.replace(state, [conn(1, 'alpha', null), conn(2, 'bravo', null)])

      expect(state.items.map((i) => i.name)).toEqual(['alpha', 'bravo'])
    })
  })

  describe('scoped payload', () => {
    it('preserves items outside the scope', () => {
      const state = buildState([conn(1, 'a', 10), conn(2, 'b', 20)])

      mutations.replace(state, {
        items: [conn(1, 'a', 10)],
        scope: { connectionFolderId: 10 },
      })

      expect(ids(state)).toEqual([1, 2])
    })

    it('drops in-scope items missing from the payload', () => {
      const state = buildState([
        conn(1, 'a', 10),
        conn(2, 'b', 10),
        conn(3, 'c', 20),
      ])

      mutations.replace(state, {
        items: [conn(1, 'a', 10)],
        scope: { connectionFolderId: 10 },
      })

      expect(ids(state)).toEqual([1, 3])
    })

    it('keeps an in-scope item that has a pending save', () => {
      const state = buildState([conn(1, 'a', 10), conn(2, 'b', 10)], [2])

      mutations.replace(state, {
        items: [conn(1, 'a', 10)],
        scope: { connectionFolderId: 10 },
      })

      expect(ids(state)).toEqual([1, 2])
    })

    it('does not overwrite an item that has a pending save', () => {
      const state = buildState([conn(1, 'local edit', 10)], [1])

      mutations.replace(state, {
        items: [conn(1, 'server version', 10)],
        scope: { connectionFolderId: 10 },
      })

      expect(state.items[0].name).toBe('local edit')
    })

    it('inserts items arriving for the scope', () => {
      const state = buildState([conn(1, 'a', 20)])

      mutations.replace(state, {
        items: [conn(2, 'b', 10)],
        scope: { connectionFolderId: 10 },
      })

      expect(ids(state)).toEqual([1, 2])
    })

    it('matches a scope of several keys', () => {
      const state = buildState([
        { id: 1, name: 'a', connectionFolderId: 10 },
        { id: 2, name: 'b', connectionFolderId: 10 },
      ])

      mutations.replace(state, {
        items: [],
        scope: { connectionFolderId: 10, name: 'a' },
      })

      expect(ids(state)).toEqual([2])
    })

    it('empties the scope when the payload is empty', () => {
      const state = buildState([conn(1, 'a', 10), conn(2, 'b', 20)])

      mutations.replace(state, { items: [], scope: { connectionFolderId: 10 } })

      expect(ids(state)).toEqual([2])
    })

    it('sorts the merged result', () => {
      const state = buildState([conn(1, 'zulu', 20)])

      mutations.replace(state, {
        items: [conn(2, 'alpha', 10)],
        scope: { connectionFolderId: 10 },
      })

      expect(state.items.map((i) => i.name)).toEqual(['alpha', 'zulu'])
    })
  })
})
