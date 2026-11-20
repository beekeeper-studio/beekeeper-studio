import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import Item from '@/components/sidebar/core/table_list/StatelessTableListItem.vue'
import VirtualItem from '@/components/sidebar/core/table_list/Item.vue'
import TableList from '@/components/sidebar/core/TableList.vue'

Vue.use(Vuex)

describe('sidebar column search display', () => {
  it.each([
    ['postgresql', 'postgresql', true],
    ['mysql', 'mysql', true],
    ['mariadb', 'mysql', true],
    ['cockroachdb', 'postgresql', false],
    ['tidb', 'mysql', false],
    ['sqlite', 'sqlite', false],
  ])('shows the checkbox for %s only when supported', (connectionType, dialect, expected) => {
    expect((TableList as any).computed.supportsColumnSearch.call({ connectionType, dialect })).toBe(expected)
  })
  it('refreshes matching column metadata when entities are refreshed', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const commit = vi.fn()
    const context: any = {
      $store: { dispatch, commit }, filterQuery: 'email', dialect: 'postgresql',
      refreshExpandedColumns: vi.fn(), refreshPinnedColumns: vi.fn(), $noty: { error: vi.fn() },
    }
    await (TableList as any).methods.refreshTables.call(context)
    expect(commit).toHaveBeenCalledWith('columnSearch/reset', '')
    expect(dispatch).toHaveBeenCalledWith('columnSearch/search', { query: 'email', dialect: 'postgresql' })
  })
  it('shows only matched columns when the search supplies them', () => {
    const store = new Vuex.Store({ state: { activeTab: null }, getters: { selectedSidebarItem: () => null } })
    const wrapper = shallowMount(Item as any, {
      store,
      propsData: {
        id: 'users', expanded: true, table: { name: 'users', columns: [{ columnName: 'email', dataType: 'text' }, { columnName: 'id', dataType: 'integer' }] },
        matchingColumns: [{ columnName: 'email', dataType: 'text' }],
      },
    })
    expect(wrapper.text()).toContain('email')
    expect(wrapper.text()).not.toContain('integer')
  })

  it('passes matched columns to the existing table item', () => {
    const columns = [{ columnName: 'email', dataType: 'text' }]
    const wrapper = shallowMount(VirtualItem as any, {
      propsData: { source: { type: 'table', key: 'users', entity: { name: 'users' }, matchingColumns: columns }, onExpand: () => {}, onPin: () => {} },
    })
    expect(wrapper.findComponent(Item as any).props('matchingColumns')).toEqual(columns)
  })
})
