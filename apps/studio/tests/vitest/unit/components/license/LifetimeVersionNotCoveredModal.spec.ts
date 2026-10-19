import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import LifetimeVersionNotCoveredModal from '@/components/license/LifetimeVersionNotCoveredModal.vue'
import { AppEvent, AppEventMixin } from '@/common/AppEvent'
import {
  LIFETIME_VERSION_NOTICE_KEY,
  acknowledgeLifetimeVersionNotice,
  getAcknowledgedLifetimeVersionNotice,
} from '@/lib/lifetimeVersion'

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

const MODAL_NAME = 'lifetime-version-not-covered-modal'
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const LICENSE = {
  licenseType: 'PersonalLicense',
  key: 'abc-123',
  validUntil: new Date(2999, 0, 1),
  supportUntil: new Date(2026, 0, 1),
  maxAllowedAppRelease: { tagName: 'v5.2.3' },
}
/** What license/getStatus serialises for a lifetime license this version has outgrown. */
const NOT_COVERED = {
  isTrial: false,
  isUltimate: false,
  isCommunity: true,
  isValidDateExpired: false,
  isSupportDateExpired: true,
  isLifetime: true,
  license: LICENSE,
  maxAllowedVersion: { major: 5, minor: 2, patch: 3 },
}
/** The same license on a version it covers. */
const COVERED = { ...NOT_COVERED, isUltimate: true, isCommunity: false }

function buildStore(status: Record<string, any> = NOT_COVERED) {
  return new Vuex.Store({
    modules: {
      licenses: {
        namespaced: true,
        state: { initialized: true, status, licenses: [LICENSE], blockingDialog: null },
        getters: {
          isLifetimeVersionNotCovered: (state: any) => !!state.status.isLifetime && !!state.status.isCommunity,
        },
        mutations: {
          setStatus(state: any, next: any) {
            state.status = next
          },
          setBlockingDialog(state: any, name: string | null) {
            state.blockingDialog = name
          },
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
  const mocks = {
    $modal: { show: vi.fn(), hide: vi.fn() },
    $native: { openLink: vi.fn() },
    $config: { appVersion: '6.2.0' },
  }
  const wrapper = mount(LifetimeVersionNotCoveredModal, {
    localVue,
    store,
    stubs: { modal: ModalStub, portal: PortalStub },
    mocks,
  })
  return { wrapper, mocks, store }
}

describe('LifetimeVersionNotCoveredModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('opens on launch for a lifetime license this version has outgrown, with no way to close it', async () => {
    const { wrapper, mocks, store } = mountModal()
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.find('.base-modal-close').exists()).toBe(false)
    expect(wrapper.find('.modal-stub').attributes('data-click-to-close')).toBe('false')
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain("This version isn't covered by your license")
    expect(text).toContain('lifetime access to paid features in version 5.2.3 and earlier')
    expect(text).toContain('This is version 6.2.0')
    // it is not the trial dialog: nothing to downgrade from
    expect(text).not.toMatch(/Downgrade/)
    // a lapsed subscription cannot be reactivated, so the way back is a new license
    expect(text).toContain('Buy a new license')
    expect(text).not.toMatch(/renew/i)
    expect(store.state.licenses.blockingDialog).toBe(MODAL_NAME)
    wrapper.destroy()
  })

  it('stays closed while the license covers this version, and for an active subscription', async () => {
    const covered = mountModal(buildStore(COVERED))
    const active = mountModal(buildStore({ ...NOT_COVERED, isSupportDateExpired: false, isLifetime: false }))
    await flush()

    expect(covered.mocks.$modal.show).not.toHaveBeenCalled()
    expect(active.mocks.$modal.show).not.toHaveBeenCalled()
    covered.wrapper.destroy()
    active.wrapper.destroy()
  })

  it('stays closed once acknowledged for this license and boundary, and comes back for a new boundary', async () => {
    acknowledgeLifetimeVersionNotice('abc-123@v5.2.3')
    const { wrapper, mocks, store } = mountModal()
    await flush()
    expect(mocks.$modal.show).not.toHaveBeenCalled()

    // the boundary moved: the same key now stops at a later release
    store.commit('licenses/setStatus', {
      ...NOT_COVERED,
      license: { ...LICENSE, maxAllowedAppRelease: { tagName: 'v6.0.0' } },
      maxAllowedVersion: { major: 6, minor: 0, patch: 0 },
    })
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.text()).toContain('6.0.0')
    wrapper.destroy()
  })

  it('"Use Community Edition" acknowledges the notice and releases the modal', async () => {
    const { wrapper, mocks, store } = mountModal()
    await flush()

    await wrapper.find('.lifetime-version-continue').trigger('click')

    expect(getAcknowledgedLifetimeVersionNotice()).toBe('abc-123@v5.2.3')
    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(store.state.licenses.blockingDialog).toBeNull()
    wrapper.destroy()
  })

  it('offers the covered release, the pricing page and the license key dialog, keeping the modal up', async () => {
    const { wrapper, mocks } = mountModal()
    const enterLicense = vi.fn()
    wrapper.vm.$root.$on(AppEvent.enterLicense, enterLicense)
    await flush()

    await wrapper.find('.lifetime-version-download').trigger('click')
    expect(mocks.$native.openLink).toHaveBeenCalledWith(
      'https://github.com/beekeeper-studio/beekeeper-studio/releases/tag/v5.2.3'
    )

    await wrapper.find('form').trigger('submit')
    expect(mocks.$native.openLink).toHaveBeenCalledWith('https://www.beekeeperstudio.io/pricing')

    const enterButton = wrapper.findAll('button').wrappers.find((w) => w.text() === 'Enter license key')
    await enterButton.trigger('click')
    expect(enterLicense).toHaveBeenCalledTimes(1)

    expect(mocks.$modal.hide).not.toHaveBeenCalled()
    expect(getAcknowledgedLifetimeVersionNotice()).toBeNull()
    wrapper.destroy()
  })

  it('closes on its own once the license covers the running version again', async () => {
    const { wrapper, mocks, store } = mountModal()
    await flush()
    expect(mocks.$modal.show).toHaveBeenCalledTimes(1)

    store.commit('licenses/setStatus', COVERED)
    await flush()

    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(store.state.licenses.blockingDialog).toBeNull()
    expect(getAcknowledgedLifetimeVersionNotice()).toBeNull()
    wrapper.destroy()
  })

  it('an acknowledgement in another window of the app closes this one too', async () => {
    const { wrapper, mocks, store } = mountModal()
    await flush()

    const value = JSON.stringify('abc-123@v5.2.3')
    localStorage.setItem(LIFETIME_VERSION_NOTICE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', { key: LIFETIME_VERSION_NOTICE_KEY, newValue: value }))
    await flush()

    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(store.state.licenses.blockingDialog).toBeNull()
    wrapper.destroy()
  })
})
