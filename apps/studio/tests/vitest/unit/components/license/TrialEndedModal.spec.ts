import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import TrialEndedModal from '@/components/license/TrialEndedModal.vue'
import { AppEvent, AppEventMixin } from '@/common/AppEvent'
import { recordPaidFeatureUse, TRIAL_HIGHLIGHTS } from '@/lib/paidFeatures'
import { getTrialEndDecision, recordTrialEndDecision } from '@/lib/trial'

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

const MODAL_NAME = 'trial-ended-modal'
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function buildStore(statusOverrides: Record<string, any> = {}) {
  const status = { isTrial: true, isUltimate: false, isValidDateExpired: true, ...statusOverrides }
  return new Vuex.Store({
    modules: {
      licenses: {
        namespaced: true,
        state: {
          initialized: true,
          status,
          licenses: [{ licenseType: 'TrialLicense', validUntil: new Date(2026, 8, 4) }],
        },
        getters: {
          trialLicense: (state: any) => state.licenses.find((l: any) => l.licenseType === 'TrialLicense'),
          isTrial: (state: any) => state.status.isTrial,
          isUltimate: (state: any) => state.status.isUltimate,
          isTrialExpired: (state: any) => state.status.isTrial && state.status.isValidDateExpired,
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

function mountModal(store = buildStore()) {
  const localVue = createLocalVue()
  localVue.use(Vuex)
  localVue.mixin(AppEventMixin)
  localVue.directive('kbd-trap', {})
  // record the bound value so the specs can assert tooltip copy
  const recordTooltip = (el: Element, binding: { value: unknown }) =>
    el.setAttribute('data-tooltip', String(binding.value))
  localVue.directive('tooltip', { bind: recordTooltip, update: recordTooltip })
  const mocks = {
    $modal: { show: vi.fn(), hide: vi.fn() },
    $native: { openLink: vi.fn() },
    $noty: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    $bks: { timeAgo: vi.fn(() => '2 days ago') },
  }
  const wrapper = mount(TrialEndedModal, {
    localVue,
    store,
    stubs: { modal: ModalStub, portal: PortalStub },
    mocks,
  })
  return { wrapper, mocks, store }
}

describe('TrialEndedModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('opens on launch when the trial has expired and nothing was decided, with no way to close it', async () => {
    const { wrapper, mocks } = mountModal()
    await flush()

    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)
    expect(wrapper.find('.base-modal-close').exists()).toBe(false)
    expect(wrapper.find('.modal-stub').attributes('data-click-to-close')).toBe('false')
    expect(wrapper.text()).toContain('Your free trial has ended')
    expect(wrapper.text()).toContain('2026')
    wrapper.destroy()
  })

  it('stays closed once a decision was recorded', async () => {
    recordTrialEndDecision('downgraded')
    const { wrapper, mocks } = mountModal()
    await flush()

    expect(mocks.$modal.show).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('stays closed while the trial is still running', async () => {
    const { wrapper, mocks } = mountModal(buildStore({ isUltimate: true, isValidDateExpired: false }))
    await flush()

    expect(mocks.$modal.show).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('offers one list of six, used features first, then the tail link', async () => {
    recordPaidFeatureUse('query-to-file')
    recordPaidFeatureUse('json-row-view')
    recordPaidFeatureUse('json-row-view')
    recordPaidFeatureUse('premium-databases', 'MongoDB')
    const { wrapper } = mountModal()
    await flush()

    const rows = wrapper.findAll('.trial-feature-list--offer li:not(.trial-feature-more)')
    expect(rows).toHaveLength(6)
    const labels = rows.wrappers.map((w) => w.find('.trial-feature-label').text())
    // used first, in usage order, then the catalogue fills the rest
    expect(labels.slice(0, 3)).toEqual(['JSON sidebar', '12 more databases', 'Query to file'])
    expect(labels[3]).toBe('SQL AI shell')

    // exactly one list, no section headings
    expect(wrapper.findAll('.trial-feature-list')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Used during the trial')
    expect(wrapper.text()).not.toContain('Also locked')

    // the badge marks the used ones and explains itself on hover
    const badges = wrapper.findAll('.trial-feature-badge')
    expect(badges).toHaveLength(3)
    expect(badges.at(0).text()).toBe('Used')
    expect(badges.at(0).attributes('data-tooltip')).toBe('You used this feature recently')

    expect(wrapper.find('.trial-feature-more .trial-feature-label').text().replace(/\s+/g, ' ')).toBe(
      'and all other paid features'
    )
    wrapper.destroy()
  })

  it('says only that a feature was used: no timestamp, no specifics', async () => {
    recordPaidFeatureUse('premium-databases', 'MongoDB')
    const { wrapper, mocks } = mountModal()
    await flush()

    const used = wrapper.findAll('.trial-feature--used')
    expect(used).toHaveLength(1)
    // the row is the icon, the label and the badge, nothing more
    const row = used.at(0)
    expect(row.find('.trial-feature-label').text()).toBe('12 more databases')
    expect(row.find('.trial-feature-badge').text()).toBe('Used')
    expect(row.findAll('span')).toHaveLength(2)
    expect(wrapper.find('.trial-feature-note').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('MongoDB')
    expect(wrapper.text()).not.toMatch(/ago|Last used/)
    expect(mocks.$bks.timeAgo).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('names the top three plus the rest when the confirmation has no usage to show', async () => {
    const { wrapper, mocks } = mountModal()
    await flush()
    await wrapper.find('.trial-ended-downgrade').trigger('click')

    const rows = wrapper.findAll('.trial-feature-list--confirm li:not(.trial-feature-more)')
    expect(rows.wrappers.map((w) => w.find('.trial-feature-label').text())).toEqual(
      TRIAL_HIGHLIGHTS.slice(0, 3).map((f) => f.label)
    )
    expect(wrapper.findAll('.trial-feature-badge')).toHaveLength(0)
    expect(wrapper.find('.trial-feature-more .trial-feature-label').text().replace(/\s+/g, ' ')).toBe(
      'and all other paid features'
    )

    // the link goes to pricing without opening the license dialog
    await wrapper.find('.trial-feature-more-link').trigger('click')
    expect(mocks.$native.openLink).toHaveBeenCalledWith('https://www.beekeeperstudio.io/pricing')
    expect(getTrialEndDecision()).toBeNull()
    expect(mocks.$modal.hide).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('offers the first six with no badges when nothing was used', async () => {
    const { wrapper } = mountModal()
    await flush()

    expect(wrapper.findAll('.trial-feature--used')).toHaveLength(0)
    expect(wrapper.findAll('.trial-feature-badge')).toHaveLength(0)
    expect(wrapper.findAll('.trial-feature-list--offer li:not(.trial-feature-more)')).toHaveLength(6)
    expect(wrapper.find('.trial-feature-more').exists()).toBe(true)
    wrapper.destroy()
  })

  it('downgrading switches the same modal to an acknowledgement step, used features on top', async () => {
    recordPaidFeatureUse('backup-restore', 'Backup')
    const { wrapper, mocks } = mountModal()
    await flush()

    await wrapper.find('.trial-ended-downgrade').trigger('click')

    expect(mocks.$modal.show).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Downgrade to the Community Edition?')
    expect(wrapper.text()).not.toContain('Your free trial has ended')
    expect(wrapper.find('.trial-downgrade-acknowledgement').text()).toMatch(
      /^I understand that by downgrading I will lose access to the features below/
    )

    // only what was used, then a link covering the rest: this step must not
    // be taller than the offer it follows
    const rows = wrapper.findAll('.trial-feature-list--confirm li:not(.trial-feature-more)')
    expect(rows).toHaveLength(1)
    expect(rows.at(0).classes()).toContain('trial-feature--used')
    expect(rows.at(0).find('.trial-feature-label').text()).toBe('Backup & restore')
    expect(rows.at(0).find('.trial-feature-badge').text()).toBe('Used')
    expect(wrapper.find('.trial-feature-more .trial-feature-label').text().replace(/\s+/g, ' ')).toBe(
      'and all other paid features'
    )

    // still locked down, nothing decided yet
    expect(wrapper.find('.base-modal-close').exists()).toBe(false)
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBe('disabled')
    expect(getTrialEndDecision()).toBeNull()
    expect(mocks.$modal.hide).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('the downgrade step cannot be submitted unacknowledged, and "Go back" returns to the offer', async () => {
    const { wrapper, mocks } = mountModal()
    await flush()
    await wrapper.find('.trial-ended-downgrade').trigger('click')

    await wrapper.find('form').trigger('submit')
    expect(getTrialEndDecision()).toBeNull()
    expect(mocks.$modal.hide).not.toHaveBeenCalled()

    // ticking the box, then backing out, forgets the tick
    await wrapper.find('.trial-downgrade-acknowledge').setChecked(true)
    await wrapper.find('.trial-ended-back').trigger('click')
    expect(wrapper.text()).toContain('Your free trial has ended')
    expect(wrapper.find('.trial-downgrade-acknowledge').exists()).toBe(false)

    await wrapper.find('.trial-ended-downgrade').trigger('click')
    expect((wrapper.find('.trial-downgrade-acknowledge').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBe('disabled')
    wrapper.destroy()
  })

  it('an acknowledged downgrade records the decision and releases the modal', async () => {
    const { wrapper, mocks } = mountModal()
    await flush()
    await wrapper.find('.trial-ended-downgrade').trigger('click')

    await wrapper.find('.trial-downgrade-acknowledge').setChecked(true)
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeUndefined()
    await wrapper.find('form').trigger('submit')

    expect(getTrialEndDecision()).toBe('downgraded')
    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    expect(mocks.$noty.info).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('buying opens the pricing page and the license key dialog, and keeps the modal up', async () => {
    const { wrapper, mocks } = mountModal()
    const enterLicense = vi.fn()
    wrapper.vm.$root.$on(AppEvent.enterLicense, enterLicense)
    await flush()

    await wrapper.find('form').trigger('submit')

    expect(mocks.$native.openLink).toHaveBeenCalledWith('https://www.beekeeperstudio.io/pricing')
    expect(enterLicense).toHaveBeenCalledTimes(1)
    expect(mocks.$modal.hide).not.toHaveBeenCalled()
    expect(getTrialEndDecision()).toBeNull()

    const enterButton = wrapper.findAll('button').wrappers.find((w) => w.text() === 'Enter license key')
    await enterButton.trigger('click')
    expect(enterLicense).toHaveBeenCalledTimes(2)
    expect(mocks.$modal.hide).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('a registered license releases the modal on its own', async () => {
    const { wrapper, mocks, store } = mountModal()
    await flush()
    expect(mocks.$modal.show).toHaveBeenCalledWith(MODAL_NAME)

    store.commit('licenses/setStatus', { isTrial: false, isUltimate: true, isValidDateExpired: false })
    await flush()

    expect(getTrialEndDecision()).toBe('licensed')
    expect(mocks.$modal.hide).toHaveBeenCalledWith(MODAL_NAME)
    wrapper.destroy()
  })
})
