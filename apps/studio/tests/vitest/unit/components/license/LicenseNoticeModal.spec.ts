import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import LicenseNoticeModal, { LICENSE_NOTICE_SEEN_KEY } from '@/components/license/LicenseNoticeModal.vue'
import { AppEvent, AppEventMixin } from '@/common/AppEvent'

Vue.use(Vuex)

const ModalStub = {
  props: ['name'],
  render(h) {
    return h('div', { class: 'modal-stub' }, this.$slots.default)
  },
}
const PortalStub = {
  render(h) {
    return h('div', this.$slots.default)
  },
}

const MODAL_NAME = 'license-notice-modal'
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const OLD_LIFETIME = {
  isTrial: false,
  isUltimate: false,
  isCommunity: true,
  isValidDateExpired: false,
  license: { key: 'abc', email: 'me@example.com', validUntil: new Date(2030, 0, 1), maxAllowedAppRelease: { tagName: 'v5.0.0' } },
}
const EXPIRED = {
  isTrial: false,
  isUltimate: false,
  isCommunity: true,
  isValidDateExpired: true,
  license: { key: 'abc', email: 'me@example.com', validUntil: new Date(2026, 8, 4), maxAllowedAppRelease: null },
}
const ACTIVE = { isTrial: false, isUltimate: true, isCommunity: false, isValidDateExpired: false, license: { key: 'abc', email: 'me@example.com' } }

function buildStore(status: Record<string, any>) {
  return new Vuex.Store({
    modules: {
      licenses: {
        namespaced: true,
        state: { initialized: true, status },
        getters: {
          paidButCommunity: (state: any) => !!state.status.license && !state.status.isTrial && state.status.isCommunity,
        },
        mutations: {
          setStatus(state: any, next: any) {
            state.status = next
          },
        },
      },
    },
  })
}

function mountModal(status: Record<string, any>, appVersion = '6.1.4') {
  const localVue = createLocalVue()
  localVue.use(Vuex)
  localVue.mixin(AppEventMixin)
  localVue.directive('kbd-trap', {})
  const mocks = {
    $modal: { show: vi.fn(), hide: vi.fn() },
    $native: { openLink: vi.fn() },
    $config: { appVersion },
  }
  const store = buildStore(status)
  const wrapper = mount(LicenseNoticeModal, { localVue, store, stubs: { modal: ModalStub, portal: PortalStub }, mocks })
  return { wrapper, mocks, store }
}

describe('LicenseNoticeModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('explains a lifetime key sold for an earlier version, with a download for that version', async () => {
    const { wrapper, mocks } = mountModal(OLD_LIFETIME)
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.text()).toContain('Your license covers an earlier version')
    expect(wrapper.text()).toContain('up to v5.0.0')
    expect(wrapper.text()).toContain('This is 6.1.4')
    expect(wrapper.text()).not.toContain('Key registered')

    await wrapper.find('.license-notice-download').trigger('click')
    expect(mocks.$native.openLink).toHaveBeenCalledWith('https://github.com/beekeeper-studio/beekeeper-studio/releases/tag/v5.0.0')
    await wrapper.find('.license-notice-buy').trigger('click')
    expect(mocks.$native.openLink).toHaveBeenCalledWith('https://www.beekeeperstudio.io/pricing')
    wrapper.destroy()
  })

  it('explains an expired subscription without offering a download', async () => {
    const { wrapper, mocks } = mountModal(EXPIRED)
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.text()).toContain('Your license has expired')
    expect(wrapper.text()).toContain('2026')
    expect(wrapper.text()).toContain('cannot be reactivated')
    expect(wrapper.find('.license-notice-download').exists()).toBe(false)
    wrapper.destroy()
  })

  it('stays closed while the key unlocks the app', async () => {
    const { wrapper, mocks } = mountModal(ACTIVE)
    await flush()
    expect(mocks.$modal.show).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('is shown once per key and app version', async () => {
    const { wrapper, mocks } = mountModal(OLD_LIFETIME)
    await flush()
    expect(mocks.$modal.show).toHaveBeenCalledTimes(1)

    // "Continue" closes it and remembers key + version
    wrapper.vm.handleClosed()
    expect(localStorage.getItem(LICENSE_NOTICE_SEEN_KEY)).toBe(JSON.stringify('abc:6.1.4'))
    wrapper.destroy()

    const again = mountModal(OLD_LIFETIME)
    await flush()
    expect(again.mocks.$modal.show).not.toHaveBeenCalled()
    again.wrapper.destroy()

    // a different app version is a new situation
    const upgraded = mountModal(OLD_LIFETIME, '6.2.0')
    await flush()
    expect(upgraded.mocks.$modal.show).toHaveBeenCalledTimes(1)
    upgraded.wrapper.destroy()
  })

  it('opens right after such a key is registered, even if it was dismissed before', async () => {
    localStorage.setItem(LICENSE_NOTICE_SEEN_KEY, JSON.stringify('abc:6.1.4'))
    const { wrapper, mocks } = mountModal(OLD_LIFETIME)
    await flush()
    expect(mocks.$modal.show).not.toHaveBeenCalled()

    wrapper.vm.$root.$emit(AppEvent.licenseRegistered)
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.text()).toContain('Key registered for me@example.com')
    wrapper.destroy()
  })

  it('releases itself when the rows change underneath it', async () => {
    const { wrapper, mocks, store } = mountModal(OLD_LIFETIME)
    await flush()
    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)

    store.commit('licenses/setStatus', ACTIVE)
    await flush()

    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    wrapper.destroy()
  })
})
