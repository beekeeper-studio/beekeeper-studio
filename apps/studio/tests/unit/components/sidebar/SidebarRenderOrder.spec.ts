import ConnectionSidebar from '@/components/sidebar/ConnectionSidebar.vue'
import FavoriteList from '@/components/sidebar/core/FavoriteList.vue'

/**
 * Drag and drop writes `position`, so `position` is what the sidebars must
 * render by. Ordering the rendered list by a sort field instead silently
 * outranks it: the drop saves, and the next render throws it away.
 */

function itemNode(id: number, position: number, ref: Record<string, unknown> = {}) {
  return {
    id: `item-${id}`,
    parentId: null,
    type: 'item',
    parentIdKey: 'connectionFolderId',
    ref: { id, position, ...ref },
  }
}

/** The computed reads only `itemNodes`, so it needs no mounted component. */
function renderOrder(component: any, itemNodes: unknown[]) {
  return component.computed.sortedItemNodes.call({ itemNodes })
}

describe('ConnectionSidebar render order', () => {
  it('orders by position, not alphabetically by name', () => {
    const nodes = [
      itemNode(1, 3, { name: 'alpha' }),
      itemNode(2, 1, { name: 'zulu' }),
      itemNode(3, 2, { name: 'mike' }),
    ]

    const names = renderOrder(ConnectionSidebar, nodes).map((n: any) => n.ref.name)

    expect(names).toEqual(['zulu', 'mike', 'alpha'])
  })

  it('keeps a dragged connection where it was dropped, whatever its color', () => {
    // A red connection dragged below a blue one must stay below it. Ranking by
    // label color here would pull red back above blue.
    const nodes = [
      itemNode(1, 1, { name: 'blue one', labelColor: 'blue' }),
      itemNode(2, 2, { name: 'red one', labelColor: 'red' }),
    ]

    const names = renderOrder(ConnectionSidebar, nodes).map((n: any) => n.ref.name)

    expect(names).toEqual(['blue one', 'red one'])
  })

  it('treats a missing position as first rather than dropping the item', () => {
    const nodes = [itemNode(1, 2, { name: 'second' }), itemNode(2, undefined, { name: 'unset' })]

    const names = renderOrder(ConnectionSidebar, nodes).map((n: any) => n.ref.name)

    expect(names).toEqual(['unset', 'second'])
  })

  it('preserves input order when positions tie', () => {
    const nodes = [
      itemNode(1, 1, { name: 'first' }),
      itemNode(2, 1, { name: 'second' }),
      itemNode(3, 1, { name: 'third' }),
    ]

    const names = renderOrder(ConnectionSidebar, nodes).map((n: any) => n.ref.name)

    expect(names).toEqual(['first', 'second', 'third'])
  })
})

describe('FavoriteList render order', () => {
  it('orders by position, not alphabetically by title', () => {
    const nodes = [
      itemNode(1, 3, { title: 'alpha' }),
      itemNode(2, 1, { title: 'zulu' }),
      itemNode(3, 2, { title: 'mike' }),
    ]

    const titles = renderOrder(FavoriteList, nodes).map((n: any) => n.ref.title)

    expect(titles).toEqual(['zulu', 'mike', 'alpha'])
  })
})
