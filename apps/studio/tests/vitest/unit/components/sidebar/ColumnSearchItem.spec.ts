import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import Item from '@/components/sidebar/core/table_list/StatelessTableListItem.vue'
import VirtualItem from '@/components/sidebar/core/table_list/Item.vue'

Vue.use(Vuex)

describe('sidebar column search display', () => {
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
