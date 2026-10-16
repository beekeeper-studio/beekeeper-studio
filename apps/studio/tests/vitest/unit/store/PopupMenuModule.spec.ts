import { describe, it, expect, vi, afterEach } from 'vitest'
// Import the app store (not the module directly): PopupMenuModule -> BeekeeperPlugin -> store is circular
import store from '@/store'

const SLUG = 'map-plot-query'

const added: { menuId: string, slug: string }[] = []

function addItem(menuId: string, item: Record<string, any>) {
  store.commit('popupMenu/add', { menuId, item })
  added.push({ menuId, slug: item.slug })
}

function storeWith(handler: (...args: any[]) => void) {
  addItem('editor.query', {
    name: 'Plot Query on Map',
    slug: SLUG,
    leadingIcon: 'map',
    plugin: { id: 'map', name: 'Map Visualization' },
    handler,
  })
  return store
}

function labels(items: any[]) {
  return items.map((item) => item.type ?? item.label ?? item.name)
}

describe('PopupMenuModule getExtraPopupMenu', () => {
  afterEach(() => {
    added.splice(0).forEach((options) => store.commit('popupMenu/remove', options))
  })

  it('returns nothing when no plugin adds to the menu', () => {
    expect(store.getters['popupMenu/getExtraPopupMenu']('editor.query', { transform: 'ui-kit' })).toEqual([])
    expect(store.getters['popupMenu/getExtraPopupMenu']('results.cell', { transform: 'tabulator' })).toEqual([])
    expect(store.getters['popupMenu/getExtraPopupMenu']('entity.table')).toEqual([])
  })

  it('wraps plugin items in a labelled section ending with Manage Plugins', () => {
    storeWith(vi.fn())
    const items = store.getters['popupMenu/getExtraPopupMenu']('editor.query', { transform: 'ui-kit' })

    expect(items.map((item) => item.type ?? item.id)).toEqual([
      'divider',
      'label',
      SLUG,
      'divider',
      'manage-plugins',
    ])
    expect(items[1].label).toBe('Plugins')
    expect(items[2].leadingIcon).toBe('map')
    expect(items[4].leadingIcon).toBe('extension')
  })

  it('merges the payload into the handler argument for ui-kit menus', () => {
    const handler = vi.fn()
    const store = storeWith(handler)
    const items = store.getters['popupMenu/getExtraPopupMenu']('editor.query', {
      transform: 'ui-kit',
      payload: { text: 'select 1; select 2', selectedText: '', selectedQuery: 'select 2' },
    })

    items[2].handler(new MouseEvent('click'), items[2])

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
    items[2].handler(new MouseEvent('click'), items[2])

    expect(Object.keys(handler.mock.calls[0][0]).sort()).toEqual(['event', 'item', 'option'])
  })

  it('sorts plugins by name and keeps each plugin\'s items in order', () => {
    const plugin = (name: string) => ({ id: name.toLowerCase(), name })
    addItem('results.cell', { name: 'Pivot Selection', slug: 'pivot-a', plugin: plugin('Pivot Tables'), handler: vi.fn() })
    addItem('results.cell', { name: 'Explain Cell', slug: 'explain-a', plugin: plugin('explain Visualizer'), handler: vi.fn() })
    addItem('results.cell', { name: 'Pivot Column', slug: 'pivot-b', plugin: plugin('Pivot Tables'), handler: vi.fn() })
    addItem('results.cell', { name: 'Plot', slug: 'map-a', plugin: plugin('Map Visualization'), handler: vi.fn() })

    const items = store.getters['popupMenu/getPluginMenuItems']('results.cell')
    expect(items.map((item) => item.slug)).toEqual(['explain-a', 'map-a', 'pivot-a', 'pivot-b'])
  })

  it('builds the same section for tabulator menus', () => {
    const handler = vi.fn()
    storeWith(handler)
    const items = store.getters['popupMenu/getExtraPopupMenu']('editor.query', { transform: 'tabulator' })

    expect(items).toHaveLength(5)
    expect(items[0]).toEqual({ separator: true })
    expect(items[1]).toMatchObject({ disabled: true })
    expect(items[1].label).toContain('menu-section-label')
    expect(items[2].label).toContain('<i class="material-icons menu-leading-icon">map</i>')
    expect(items[2].label).toContain('Plot Query on Map')
    expect(items[3]).toEqual({ separator: true })
    expect(items[4].label).toContain('Manage Plugins')

    const component = {}
    items[2].action(new MouseEvent('click'), component)
    expect(handler.mock.calls[0][0].item).toBe(component)
  })

  it('opens the Plugin Manager from Manage Plugins', () => {
    const send = vi.fn()
    vi.stubGlobal('main', { ...(window as any).main, send })
    try {
      storeWith(vi.fn())
      const items = store.getters['popupMenu/getExtraPopupMenu']('editor.query')
      items[4].handler({})
      expect(send).toHaveBeenCalledWith('menu-click', 'managePlugins')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('disables items whose condition the menu reports as false', () => {
    addItem('results.statusbar', { name: 'Explain', slug: 'explain', enabledWhen: 'explainResult', handler: vi.fn() })
    addItem('results.statusbar', { name: 'Map', slug: 'map', handler: vi.fn() })

    const get = (conditions?: Record<string, boolean>) =>
      store.getters['popupMenu/getPluginMenuItems']('results.statusbar', { conditions })
        .map((item) => [item.slug, !!item.disabled])

    expect(get({ explainResult: false })).toEqual([['explain', true], ['map', false]])
    expect(get({ explainResult: true })).toEqual([['explain', false], ['map', false]])
    // Menus that report no conditions leave the item alone
    expect(get()).toEqual([['explain', false], ['map', false]])
  })

  it('leaves built-in labels out of the item list', () => {
    storeWith(vi.fn())
    expect(labels(store.getters['popupMenu/getPluginMenuItems']('editor.query'))).toEqual(['Plot Query on Map'])
  })
})
