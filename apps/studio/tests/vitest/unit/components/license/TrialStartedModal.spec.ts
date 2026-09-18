import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TrialStartedModal from '@/components/license/TrialStartedModal.vue'
import { AppEvent, AppEventMixin } from '@/common/AppEvent'
import { PAID_FEATURES } from '@/lib/paidFeatures'
import { isTrialWelcomePending, markTrialWelcomePending } from '@/lib/trial'

// vuex asserts the global install before a store can be built
Vue.use(Vuex)

const ModalStub = {
  props: ['name', 'clickToClose'],
  render(h) {
    return h('div', { class: 'modal-stub' }, this.$slots.default)
  },
}
const PortalStub = {
  render(h) {
    return h('div', this.$slots.default)
  },
}

const MODAL_NAME = 'trial-started-modal'
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function buildStore({ active = true } = {}) {
  return new Vuex.Store({
    modules: {
      licenses: {
        namespaced: true,
        state: {
          initialized: true,
          licenses: [{ licenseType: 'TrialLicense', validUntil: new Date(2026, 9, 2) }],
        },
        getters: {
          trialLicense: (state: any) => state.licenses[0],
          isTrialActive: () => active,
        },
      },
    },
  })
}

function mountModal(store = buildStore()) {
  const localVue = createLocalVue()
  localVue.use(Vuex)
  localVue.mixin(AppEventMixin)
  localVue.directive('kbd-trap', {})
  localVue.directive('tooltip', {})
  const mocks = { $modal: { show: vi.fn(), hide: vi.fn() } }
  const wrapper = mount(TrialStartedModal, {
    localVue,
    store,
    stubs: { modal: ModalStub, portal: PortalStub },
    mocks,
  })
  return { wrapper, mocks }
}

describe('TrialStartedModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('welcomes the user once the auto-started trial is active', async () => {
    markTrialWelcomePending()
    const { wrapper, mocks } = mountModal()
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.text()).toContain('Every paid feature is unlocked')
    expect(wrapper.text()).toContain('14-day free trial')
    expect(wrapper.text()).toContain('2026')
    expect(wrapper.findAll('.trial-feature-list li')).toHaveLength(PAID_FEATURES.length)
    expect(wrapper.find('.base-modal-close').exists()).toBe(true)
    wrapper.destroy()
  })

  it('stays quiet when no welcome is owed', async () => {
    const { wrapper, mocks } = mountModal()
    await flush()

    expect(mocks.$modal.show).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('stays quiet when the trial is not active', async () => {
    markTrialWelcomePending()
    const { wrapper, mocks } = mountModal(buildStore({ active: false }))
    await flush()

    expect(mocks.$modal.show).not.toHaveBeenCalled()
    expect(isTrialWelcomePending()).toBe(true)
    wrapper.destroy()
  })

  it('"Start exploring" closes the dialog and settles the flag', async () => {
    markTrialWelcomePending()
    const { wrapper, mocks } = mountModal()
    await flush()

    await wrapper.find('form').trigger('submit')

    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(isTrialWelcomePending()).toBe(false)
    wrapper.destroy()
  })

  it('"Enter a license key" closes the dialog and opens the license dialog', async () => {
    markTrialWelcomePending()
    const { wrapper, mocks } = mountModal()
    const enterLicense = vi.fn()
    wrapper.vm.$root.$on(AppEvent.enterLicense, enterLicense)
    await flush()

    await wrapper.find('button[type=button]').trigger('click')

    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(enterLicense).toHaveBeenCalledTimes(1)
    expect(isTrialWelcomePending()).toBe(false)
    wrapper.destroy()
  })
})
