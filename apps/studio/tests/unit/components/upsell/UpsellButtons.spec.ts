import { createLocalVue, mount } from '@vue/test-utils'
import Vuex from 'vuex'
import UpsellButtons from '@/components/upsell/common/UpsellButtons.vue'
import { AppEvent } from '@/common/AppEvent'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.directive('tooltip', {})

function buildStore(options: { licenses: any[] }) {
  return new Vuex.Store({
    modules: {
      licenses: {
        namespaced: true,
        state: { status: { isSupportDateExpired: false }, licenses: options.licenses },
        getters: {
          trialLicense: (state: any) => state.licenses.find((l: any) => l.licenseType === 'TrialLicense'),
          noLicensesFound: (state: any) => state.licenses.length === 0,
        },
        actions: { add: jest.fn() },
      },
    },
  })
}

// App-wide events go through $root.$emit; spy on the mounted tree's root.
function mountButtons(licenses: any[]) {
  const openLink = jest.fn()
  const wrapper = mount(UpsellButtons, {
    localVue,
    store: buildStore({ licenses }),
    mocks: {
      $native: { openLink },
    },
  })
  const rootEmit = jest.spyOn(wrapper.vm.$root, '$emit')
  return { wrapper, openLink, rootEmit }
}

describe('UpsellButtons', () => {
  it('offers the trial first when no license has ever existed', () => {
    const { wrapper } = mountButtons([])
    expect(wrapper.text()).toContain('Start free trial')
    expect(wrapper.text()).toContain('14-day free trial')
    expect(wrapper.find('.request-link').exists()).toBe(false)
  })

  it('starts the trial from the button', async () => {
    const { wrapper } = mountButtons([])
    const dispatch = jest.spyOn(wrapper.vm.$store, 'dispatch')
    await wrapper.find('.btn-flat').trigger('click')
    expect(dispatch).toHaveBeenCalledWith('licenses/add', { trial: true })
    expect(wrapper.emitted('started-trial')).toHaveLength(1)
  })

  it('after the trial, states when it ended and offers a purchase request', async () => {
    const ended = new Date('2026-02-01T00:00:00.000Z')
    const { wrapper, rootEmit } = mountButtons([{ licenseType: 'TrialLicense', validUntil: ended }])

    expect(wrapper.text()).toContain(`Trial ended ${ended.toLocaleDateString()}`)
    expect(wrapper.text()).not.toContain('Start free trial')

    const link = wrapper.find('.request-link')
    expect(link.text()).toContain('Copy a purchase request')
    await link.trigger('click')
    expect(rootEmit).toHaveBeenCalledWith(AppEvent.purchaseRequest)
    expect(wrapper.emitted('request-license')).toHaveLength(1)
  })

  it('opens the pricing page and the license modal on buy', async () => {
    const { wrapper, openLink, rootEmit } = mountButtons([])
    await wrapper.find('.btn-primary').trigger('click')
    expect(openLink).toHaveBeenCalledWith('https://www.beekeeperstudio.io/pricing')
    expect(rootEmit).toHaveBeenCalledWith(AppEvent.enterLicense)
  })
})
