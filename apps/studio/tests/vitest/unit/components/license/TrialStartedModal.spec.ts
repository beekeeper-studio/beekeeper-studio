import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TrialStartedModal from '@/components/license/TrialStartedModal.vue'
import { AppEvent, AppEventMixin } from '@/common/AppEvent'
import { TRIAL_HIGHLIGHTS } from '@/lib/paidFeatures'
import { isTrialWelcomePending, markTrialWelcomePending } from '@/lib/trial'

// vuex asserts the global install before a store can be built
Vue.use(Vuex)

const ModalStub = {
  props: ['name', 'clickToClose'],
  render(h) {
    return h(
      'div',
      { class: 'modal-stub', attrs: { 'data-click-to-close': String(this.clickToClose) } },
      this.$slots.default
    )
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
  const mocks = {
    $modal: { show: vi.fn(), hide: vi.fn() },
    $native: { openLink: vi.fn() },
  }
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
    expect(wrapper.text()).toContain('14 day free trial activated')
    expect(wrapper.find('.trial-modal-lead').text().replace(/\s+/g, ' ')).toBe(
      'All paid app features are unlocked as part of the trial. Here are our 6 favorite:'
    )
    expect(wrapper.text()).toContain('2026')
    wrapper.destroy()
  })

  it('lists exactly the six highlights, not the whole catalogue', async () => {
    markTrialWelcomePending()
    const { wrapper } = mountModal()
    await flush()

    const labels = wrapper.findAll('.trial-feature-label').wrappers.map((w) => w.text())
    expect(labels).toHaveLength(6)
    expect(labels).toEqual(TRIAL_HIGHLIGHTS.map((f) => f.label))
    expect(labels[0]).toBe('JSON sidebar')
    wrapper.destroy()
  })

  it('cannot be dismissed except by a button', async () => {
    markTrialWelcomePending()
    const { wrapper } = mountModal()
    await flush()

    // no close button, and Escape / overlay clicks are refused
    expect(wrapper.find('.base-modal-close').exists()).toBe(false)
    expect(wrapper.find('.modal-stub').attributes('data-click-to-close')).toBe('false')
    const stop = vi.fn()
    wrapper.findComponent(ModalStub).vm.$emit('before-close', { stop })
    expect(stop).toHaveBeenCalledTimes(1)
    expect(isTrialWelcomePending()).toBe(true)
    wrapper.destroy()
  })

  it('"Learn more" opens the upgrade page and leaves the dialog up', async () => {
    markTrialWelcomePending()
    const { wrapper, mocks } = mountModal()
    await flush()

    await wrapper.find('.trial-started-learn-more').trigger('click')

    expect(mocks.$native.openLink).toHaveBeenCalledWith('https://www.beekeeperstudio.io/upgrade')
    expect(mocks.$modal.hide).not.toHaveBeenCalled()
    expect(isTrialWelcomePending()).toBe(true)
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

    const enterButton = wrapper.findAll('button').wrappers.find((w) => w.text() === 'Enter a license key')
    await enterButton.trigger('click')

    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(enterLicense).toHaveBeenCalledTimes(1)
    expect(isTrialWelcomePending()).toBe(false)
    wrapper.destroy()
  })
})
