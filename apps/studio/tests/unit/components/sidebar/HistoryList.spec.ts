import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import HistoryList from '@/components/sidebar/core/HistoryList.vue'

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

function buildHistoryQuery(id: number, connectionId: number, origin?: string) {
  return {
    id,
    connectionId,
    origin,
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
        buildHistoryQuery(2, 1, 'plugin'),
        buildHistoryQuery(3, 2, 'plugin')
      ]),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1, 2])
    expect(wrapper.findAll('option').wrappers.map(option => option.text())).toEqual([
      'All',
      'App',
      'Plugin'
    ])

    await wrapper.setData({ selectedOrigin: 'plugin' })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2])

    await wrapper.setData({ showAllHistory: true })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2, 3])
  })

  it('shows distinct icons and labels for app and plugin queries', () => {
    const wrapper = shallowMount(HistoryList, {
      store: buildStore([
        buildHistoryQuery(1, 1, 'app'),
        buildHistoryQuery(2, 1, 'plugin')
      ]),
      stubs: {
        ErrorAlert: true,
        SidebarLoading: true
      }
    })

    const icons = wrapper.findAll('.item-icon')
    expect(icons.at(0).text()).toBe('code')
    expect(icons.at(0).attributes('title')).toBe('App query')
    expect(icons.at(1).text()).toBe('extension')
    expect(icons.at(1).attributes('title')).toBe('Plugin query')
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
