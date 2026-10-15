import { describe, it, expect, vi, afterEach } from 'vitest'
// Import the app store (not the module directly): PopupMenuModule -> BeekeeperPlugin -> store is circular
import store from '@/store'

const SLUG = 'map-plot-query'

function storeWith(handler: (...args: any[]) => void) {
  store.commit('popupMenu/add', {
    menuId: 'editor.query',
    item: { name: 'Plot Query on Map', slug: SLUG, handler },
  })
  return store
}

describe('PopupMenuModule getExtraPopupMenu', () => {
  afterEach(() => {
    store.commit('popupMenu/remove', { menuId: 'editor.query', slug: SLUG })
  })

  it('merges the payload into the handler argument for ui-kit menus', () => {
    const handler = vi.fn()
    const store = storeWith(handler)
    const items = store.getters['popupMenu/getExtraPopupMenu']('editor.query', {
      transform: 'ui-kit',
      payload: { text: 'select 1; select 2', selectedText: '', selectedQuery: 'select 2' },
    })

    // first entry is the divider
    expect(items).toHaveLength(2)
    items[1].handler(new MouseEvent('click'), items[1])

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toMatchObject({
      text: 'select 1; select 2',
      selectedText: '',
      selectedQuery: 'select 2',
    })
    expect(handler.mock.calls[0][0].event).toBeInstanceOf(MouseEvent)
  })

  it('keeps the plain { item, option, event } argument without a payload', () => {
    const handler = vi.fn()
    const store = storeWith(handler)
    const items = store.getters['popupMenu/getExtraPopupMenu']('editor.query', { transform: 'ui-kit' })
    items[1].handler(new MouseEvent('click'), items[1])

    expect(Object.keys(handler.mock.calls[0][0]).sort()).toEqual(['event', 'item', 'option'])
  })
})
