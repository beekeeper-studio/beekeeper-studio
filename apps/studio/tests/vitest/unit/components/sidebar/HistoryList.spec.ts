import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import HistoryList from '@/components/sidebar/core/HistoryList.vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

Vue.use(Vuex)
TimeAgo.addLocale(en)

function buildStore(items: any[], isCloud = false) {
  return new Vuex.Store({
    state: {
      usedConfig: { id: 1 },
      workspaceId: -1
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
            actions: {
              load: vi.fn(),
              remove: vi.fn()
            },
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
  it('filters history by multiple origins and connection scope', async () => {
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
    expect(wrapper.findAll('.history-filter-menu label').wrappers.map(label => label.text())).toEqual([
      'All connections',
      'App',
      'AI Shell',
      'ER Diagram',
      'Plugin'
    ])

    expect(wrapper.find('.history-filter').classes()).not.toContain('active')
    await wrapper.find('.history-filter-menu input').setChecked(true)
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1, 2, 3, 4, 5])
    expect(wrapper.find('.history-filter').classes()).not.toContain('active')
    await wrapper.find('.history-filter-menu input').setChecked(false)

    await wrapper.find('input[value="app"]').setChecked(false)
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2, 3, 4])
    expect(wrapper.find('.history-filter').classes()).toContain('active')

    await wrapper.setData({ selectedOrigins: ['bks-ai-shell'] })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2])

    await wrapper.setData({ selectedOrigins: ['bks-er-diagram'] })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([3])

    await wrapper.setData({ selectedOrigins: ['plugin'] })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([4])

    await wrapper.setData({ selectedOrigins: ['bks-ai-shell', 'bks-er-diagram'] })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2, 3])

    await wrapper.find('.history-filter-menu input').setChecked(true)
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([2, 3, 5])

    await wrapper.setData({ selectedOrigins: [] })
    expect(wrapper.vm.currentHistory).toEqual([])
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

    expect(wrapper.findAll('.history-filter-menu label').wrappers.map(label => label.text()))
      .toEqual(['All connections'])
    expect(wrapper.find('.filter-input').exists()).toBe(false)
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

    await wrapper.setData({ selectedOrigins: ['plugin'] })

    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1])
    expect(wrapper.find('.history-filter').classes()).not.toContain('active')
  })
})


describe('HistoryList search', () => {
  let wrapper: any

  beforeEach(() => vi.useFakeTimers())

  afterEach(() => {
    wrapper?.destroy()
    vi.useRealTimers()
  })

  function mountSearch(send: any, items = [buildHistoryQuery(1, 1, 'app')]) {
    wrapper = shallowMount(HistoryList, {
      store: buildStore(items),
      mocks: { $util: { send } },
      stubs: { ErrorAlert: true, SidebarLoading: true }
    })
    return wrapper
  }

  it('debounces database search, sorts newest first, and combines the filters', async () => {
    const older = { ...buildHistoryQuery(2, 1, 'plugin', 'bks-ai-shell'), updatedAt: new Date(2020, 0, 1) }
    const newer = { ...buildHistoryQuery(3, 1, 'app'), updatedAt: new Date(2021, 0, 1) }
    const otherConnection = { ...buildHistoryQuery(4, 2, 'plugin', 'bks-ai-shell'), updatedAt: new Date(2022, 0, 1) }
    const send = vi.fn().mockResolvedValue([older, newer, otherConnection])
    mountSearch(send)

    await wrapper.find('.filter-input').setValue('cust')
    await wrapper.find('.filter-input').setValue(' customer ')
    expect(send).not.toHaveBeenCalled()
    expect(wrapper.vm.searchLoading).toBe(true)
    await vi.advanceTimersByTimeAsync(300)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('appdb/usedQuery/search', { searchText: 'customer' })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([3, 2])
    expect(wrapper.vm.history.map((item: any) => item.id)).toEqual([1])

    await wrapper.setData({ selectedOrigins: ['bks-ai-shell'], showAllHistory: true })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([4, 2])

    await wrapper.find('[title="Clear search"]').trigger('click')
    expect(wrapper.vm.searchActive).toBe(false)
    expect(wrapper.vm.searchResults).toEqual([])
    await wrapper.setData({ selectedOrigins: ['app'], showAllHistory: false })
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1])
  })

  it('ignores outdated responses and responses arriving after clearing search', async () => {
    let resolveFirst: any
    let resolveSecond: any
    const send = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve }))
    mountSearch(send)

    await wrapper.find('.filter-input').setValue('first')
    await vi.advanceTimersByTimeAsync(300)
    await wrapper.find('.filter-input').setValue('second')
    await vi.advanceTimersByTimeAsync(300)
    resolveFirst([buildHistoryQuery(2, 1, 'app')])
    await vi.advanceTimersByTimeAsync(0)
    expect(wrapper.vm.searchResults).toEqual([])
    expect(wrapper.vm.searchLoading).toBe(true)

    await wrapper.find('[title="Clear search"]').trigger('click')
    resolveSecond([buildHistoryQuery(3, 1, 'app')])
    await vi.advanceTimersByTimeAsync(0)
    expect(wrapper.vm.currentHistory.map((item: any) => item.id)).toEqual([1])
    expect(wrapper.vm.searchLoading).toBe(false)
  })

  it('shows search errors and recovers on refresh', async () => {
    const error = new Error('Search failed')
    const send = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce([])
    mountSearch(send)
    await wrapper.find('.filter-input').setValue('customer')
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.findComponent({ name: 'ErrorAlert' }).props('error')).toBe(error)

    await wrapper.vm.refresh()
    await Vue.nextTick()
    expect(send).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.searchError).toBeNull()
    expect(wrapper.find('.empty').text()).toBe('No matching queries')
  })

  it('removes a search result and clears search when the workspace changes', async () => {
    const result = buildHistoryQuery(2, 1, 'app')
    mountSearch(vi.fn().mockResolvedValue([result]))
    await wrapper.find('.filter-input').setValue('customer')
    await vi.advanceTimersByTimeAsync(300)
    await wrapper.vm.remove(result)
    expect(wrapper.vm.currentHistory).toEqual([])

    wrapper.vm.$store.state.workspaceId = 2
    await Vue.nextTick()
    expect(wrapper.vm.filterQuery).toBe('')
    expect(wrapper.vm.searchActive).toBe(false)
    expect(wrapper.vm.searchResults).toEqual([])
  })
})
