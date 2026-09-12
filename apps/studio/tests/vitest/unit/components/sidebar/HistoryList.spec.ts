import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import HistoryList from '@/components/sidebar/core/HistoryList.vue'
import { describe, expect, it } from 'vitest'

Vue.use(Vuex)
TimeAgo.addLocale(en)

function buildStore(items: any[], isCloud = false) {
  return new Vuex.Store({
    state: {
      usedConfig: { id: 1 }
    },
    getters: {
      isCloud: () => isCloud
    },
    modules: {
      data: {
        namespaced: true,
        modules: {
          usedQueries: {
            namespaced: true,
            state: {
              items,
              loading: false,
              error: null
            }
          }
        }
      }
    }
  })
}

function buildHistoryQuery(id: number, connectionId: number, origin?: string, pluginId?: string) {
  return {
    id,
    connectionId,
    origin,
    pluginId,
    excerpt: `select ${id}`,
    numberOfRecords: 1,
    updatedAt: new Date()
  }
}

describe('HistoryList.vue', () => {
  it('filters history by origin while keeping All as the default', async () => {
    const wrapper = shallowMount(HistoryList, {
      store: buildStore([
        buildHistoryQuery(1, 1, 'app'),
        buildHistoryQuery(2, 1, 'plugin', 'bks-ai-shell'),
        buildHistoryQuery(3, 1, 'plugin', 'bks-er-diagram'),
        buildHistoryQuery(4, 1, 'plugin', 'example-plugin'),
        buildHistoryQuery(5, 2, 'plugin', 'bks-ai-shell')
      ]),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1, 2, 3, 4])
    expect(wrapper.findAll('option').wrappers.map(option => option.text())).toEqual([
      'All',
      'App',
      'AI Shell',
      'ER Diagram',
      'Plugin'
    ])

    await wrapper.setData({ selectedOrigin: 'bks-ai-shell' })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2])

    await wrapper.setData({ selectedOrigin: 'bks-er-diagram' })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([3])

    await wrapper.setData({ selectedOrigin: 'plugin' })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([4])

    await wrapper.setData({ selectedOrigin: 'bks-ai-shell' })
    await wrapper.setData({ showAllHistory: true })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2, 5])
  })

  it('shows specific plugin icons and falls back for other plugins', () => {
    const wrapper = shallowMount(HistoryList, {
      store: buildStore([
        buildHistoryQuery(1, 1, 'app'),
        buildHistoryQuery(2, 1, 'plugin', 'bks-ai-shell'),
        buildHistoryQuery(3, 1, 'plugin', 'bks-er-diagram'),
        buildHistoryQuery(4, 1, 'plugin', 'example-plugin')
      ]),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    const icons = wrapper.findAll('.item-icon')
    expect(icons.at(0).text()).toBe('code')
    expect(icons.at(0).attributes('title')).toBe('App query')
    expect(icons.at(1).text()).toBe('auto_awesome')
    expect(icons.at(1).attributes('title')).toBe('AI Shell query')
    expect(icons.at(2).text()).toBe('account_tree')
    expect(icons.at(2).attributes('title')).toBe('ER Diagram query')
    expect(icons.at(3).text()).toBe('extension')
    expect(icons.at(3).attributes('title')).toBe('Plugin query')
  })

  it('uses the app icon for history without a known origin', () => {
    const wrapper = shallowMount(HistoryList, {
      store: buildStore([
        buildHistoryQuery(1, 1, undefined)
      ]),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    expect(wrapper.find('.item-icon').text()).toBe('code')
    expect(wrapper.find('.item-icon').attributes('title')).toBe('Unknown query')
  })

  it('hides the origin filter in a cloud workspace', () => {
    const wrapper = shallowMount(HistoryList, {
      store: buildStore([
        buildHistoryQuery(1, 1, undefined)
      ], true),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    expect(wrapper.find('#history-origin-filter').exists()).toBe(false)
  })

  it('does not apply a local origin selection to cloud history', async () => {
    const wrapper = shallowMount(HistoryList, {
      store: buildStore([
        buildHistoryQuery(1, 1, undefined)
      ], true),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    await wrapper.setData({ selectedOrigin: 'plugin' })

    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1])
  })
})
