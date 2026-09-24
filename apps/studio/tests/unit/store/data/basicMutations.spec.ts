import { mutationsFor } from '@/store/modules/data/DataModuleBase'

type Item = {
  id: number
  parentId: number
  name: string
}

const mutations = mutationsFor<Item>({}, { field: 'name', direction: 'asc' })

const item = (id: number, parentId: number, name = ''): Item => ({
  id,
  parentId,
  name,
})

function buildState(items: Item[]) {
  return {
    items,
    loading: false,
    error: null,
    pollError: null,
    pendingSaveIds: [],
  }
}

describe('basic replace mutation', () => {
  it('inserts items arriving in the payload', () => {
    const state = buildState([item(1, 10)])

    mutations.replace(state, {
      items: [item(1, 10), item(2, 10)],
      replaceIf: (i) => i.parentId === 10,
    })

    expect(state.items).toStrictEqual([item(1, 10), item(2, 10)])
  })

  it('updates an existing item', () => {
    const state = buildState([item(1, 10, 'old')])

    mutations.replace(state, {
      items: [item(1, 10, 'new')],
      replaceIf: (i) => i.parentId === 10,
    })

    expect(state.items).toStrictEqual([item(1, 10, 'new')])
  })

  it('removes in-scope items missing from the payload', () => {
    const state = buildState([item(1, 10), item(2, 10)])

    mutations.replace(state, {
      items: [item(1, 10)],
      replaceIf: (i) => i.parentId === 10,
    })

    expect(state.items).toStrictEqual([item(1, 10)])
  })
})
