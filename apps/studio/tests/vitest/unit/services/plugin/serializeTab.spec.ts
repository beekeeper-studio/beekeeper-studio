import { describe, it, expect } from 'vitest'
import PluginStoreService from '@/services/plugin/web/PluginStoreService'
import { setFilters, TransportOpenTab } from '@/common/transport/TransportOpenTab'

// Plugins opened from a tab header (`tab.table.header.context`) receive the
// serialized tab as their view context. For table tabs that includes the
// filters the user applied, so a plugin can work on the same filtered view.

const orders = { name: 'orders', schema: 'public', entityType: 'table' }

function service() {
  const store: any = {
    state: { tables: [orders] },
    subscribe: () => undefined,
  }
  const bus = { emit: () => undefined, on: () => undefined, off: () => undefined }
  return new PluginStoreService(store, bus)
}

function tableTab(): TransportOpenTab {
  return {
    id: 7,
    tabType: 'table',
    title: 'orders',
    tableName: 'orders',
    schemaName: 'public',
  } as TransportOpenTab
}

describe('PluginStoreService.serializeTab', () => {
  it('includes the filters applied to a table tab', () => {
    const tab = tableTab()
    const filters = [
      { field: 'status', type: '=', value: 'shipped' },
      { field: 'region', type: 'in', value: 'east, west', op: 'AND' as const },
    ]
    setFilters(tab, filters)

    const serialized: any = service().serializeTab(tab)

    expect(serialized).toMatchObject({ type: 'table', id: 7, title: 'orders' })
    expect(serialized.data.table).toEqual(orders)
    expect(serialized.data.filters).toEqual(filters)
  })

  it('uses an empty list when the tab has no filters', () => {
    const serialized: any = service().serializeTab(tableTab())
    expect(serialized.data.filters).toEqual([])
  })

  it('keeps query tabs unchanged', () => {
    const tab = { id: 1, tabType: 'query', title: 'Query #1', unsavedQueryText: 'select 1' } as TransportOpenTab
    expect(service().serializeTab(tab)).toEqual({
      type: 'query',
      id: 1,
      title: 'Query #1',
      data: { query: 'select 1', result: null },
    })
  })
})
