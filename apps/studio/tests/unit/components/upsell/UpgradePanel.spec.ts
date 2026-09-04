import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import UpgradePanel from '@/components/upsell/UpgradePanel.vue'
import { listUsedPaidFeatures } from '@/lib/paidFeatures'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.directive('tooltip', {})

function buildStore(options: { isCommunity: boolean; usage?: any }) {
  return new Vuex.Store({
    getters: {
      isCommunity: () => options.isCommunity,
    },
    modules: {
      paidFeatureUsage: {
        namespaced: true,
        getters: {
          usedFeatures: () => listUsedPaidFeatures(options.usage ?? {}),
        },
      },
    },
  })
}

function mountPanel(storeOptions: { isCommunity: boolean; usage?: any }, propsData: Record<string, any> = {}) {
  return shallowMount(UpgradePanel, {
    localVue,
    store: buildStore(storeOptions),
    propsData,
    mocks: { $native: { openLink: jest.fn() } },
    stubs: { UpsellButtons: true },
  })
}

describe('UpgradePanel', () => {
  it('lists the generic paid features when nothing has been tried', () => {
    const wrapper = mountPanel({ isCommunity: true }, { featureName: 'Import From File' })
    expect(wrapper.find('.dialog-c-title').text()).toBe('Import From File needs a paid license')
    expect(wrapper.text()).toContain('A paid license also includes:')
    expect(wrapper.text()).toContain('Lifetime access')
    expect(wrapper.findAll('.upgrade-feature-list li .material-icons').at(0).text()).toBe('check')
  })

  it("after a trial, lists the user's own usage and marks the feature they just tried", () => {
    const usage = {
      jsonViewer: { firstUsedAt: '2026-01-01T00:00:00.000Z' },
      importFromFile: { firstUsedAt: '2026-01-02T00:00:00.000Z' },
    }
    const wrapper = mountPanel({ isCommunity: true, usage }, { featureName: 'Import From File' })

    expect(wrapper.text()).toContain('Paid features used during your trial:')
    const items = wrapper.findAll('.upgrade-feature-list li')
    expect(items.length).toBe(2)
    expect(items.at(0).text()).toContain('JSON row viewer')
    expect(items.at(0).classes()).not.toContain('current')
    expect(items.at(1).text()).toContain('Import from file')
    expect(items.at(1).classes()).toContain('current')
    expect(items.at(1).find('.material-icons').text()).toBe('lock')
  })

  it('ignores usage for a licensed user (the panel is not shown to them, but stay generic)', () => {
    const usage = { jsonViewer: { firstUsedAt: '2026-01-01T00:00:00.000Z' } }
    const wrapper = mountPanel({ isCommunity: false, usage })
    expect(wrapper.text()).toContain('A paid license includes:')
  })
})
