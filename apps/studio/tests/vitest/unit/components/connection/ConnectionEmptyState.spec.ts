import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount, createLocalVue, Wrapper } from '@vue/test-utils'
import Vuex from 'vuex'
import ConnectionEmptyState from '@/components/connection/ConnectionEmptyState.vue'
import { UpdateModule } from '@/store/modules/UpdateModule'
import { WelcomeTips } from '@/common/welcomeTips'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.prototype.$bks = { timeAgo: () => 'in 11 days' }

type License = 'community' | 'trial' | 'licensed'

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function makeStore(license: License, trialDaysLeft = 11) {
  return new Vuex.Store({
    getters: { isUltimate: () => license !== 'community' },
    modules: {
      licenses: {
        namespaced: true,
        getters: {
          isTrial: () => license === 'trial',
          trialLicense: () =>
            license === 'trial' ? { validUntil: daysFromNow(trialDaysLeft) } : undefined,
        },
      },
      updates: UpdateModule,
    },
  })
}

function mountState(license: License = 'community', trialDaysLeft = 11) {
  const store = makeStore(license, trialDaysLeft)
  const wrapper = shallowMount(ConnectionEmptyState, {
    localVue,
    store,
    propsData: { config: {} },
  })
  return { wrapper, store }
}

function cardTitle(wrapper: Wrapper<any>) {
  return wrapper.find('.info-title').text()
}

describe('ConnectionEmptyState', () => {
  beforeEach(() => {
    localStorage.clear()
    window.main = { triggerDownload: vi.fn(), triggerInstall: vi.fn(), openExternally: vi.fn() } as any
  })

  it('asks for a connection', () => {
    const { wrapper } = mountState()
    expect(wrapper.find('h3').text()).toEqual('Welcome to Beekeeper Studio')
    wrapper.find('button.btn-primary').trigger('click')
    expect(wrapper.emitted('create')).toBeTruthy()
    wrapper.destroy()
  })

  describe('tips', () => {
    it('shows one of the tips', () => {
      const { wrapper } = mountState()
      expect(WelcomeTips.map((t) => t.title)).toContain(cardTitle(wrapper))
      wrapper.destroy()
    })

    it('walks the list with the arrows, wrapping at both ends', async () => {
      const { wrapper } = mountState()
      const start = (wrapper.vm as any).tipIndex

      wrapper.find('[title="Next tip"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(cardTitle(wrapper)).toEqual(WelcomeTips[(start + 1) % WelcomeTips.length].title)

      // a full lap backwards from here lands on the tip it opened with, which
      // only holds if the index never goes negative
      for (let i = 0; i < WelcomeTips.length + 1; i++) {
        wrapper.find('[title="Previous tip"]').trigger('click')
      }
      await wrapper.vm.$nextTick()
      expect(cardTitle(wrapper)).toEqual(WelcomeTips[start].title)
      wrapper.destroy()
    })

    it('stays hidden once hidden', async () => {
      const { wrapper } = mountState()
      wrapper.find('[title="Hide tips"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.info-card').exists()).toBe(false)
      wrapper.destroy()

      const second = mountState()
      expect(second.wrapper.find('.info-card').exists()).toBe(false)
      second.wrapper.destroy()
    })
  })

  describe('updates', () => {
    it('takes the tip card slot, and gives it back when dismissed', async () => {
      const { wrapper, store } = mountState()
      store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })
      await wrapper.vm.$nextTick()

      expect(cardTitle(wrapper)).toEqual('Version 6.2.0 is available')

      wrapper.find('[title="Dismiss"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(WelcomeTips.map((t) => t.title)).toContain(cardTitle(wrapper))
      wrapper.destroy()
    })

    it('names the version only when the updater gave one', async () => {
      const { wrapper, store } = mountState()
      store.dispatch('updates/found', { stage: 'available' })
      await wrapper.vm.$nextTick()

      expect(cardTitle(wrapper)).toEqual('A new version is available')
      wrapper.destroy()
    })

    it('downloads, then offers a restart once the download lands', async () => {
      const { wrapper, store } = mountState()
      store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })
      await wrapper.vm.$nextTick()

      wrapper.find('.info-actions .btn').trigger('click')
      expect(window.main.triggerDownload).toHaveBeenCalled()

      store.dispatch('updates/found', { stage: 'downloaded', version: '6.2.0' })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.info-actions .btn').text()).toEqual('Restart now')

      wrapper.find('.info-actions .btn').trigger('click')
      expect(window.main.triggerInstall).toHaveBeenCalled()
      wrapper.destroy()
    })

    it('offers no action while downloading', async () => {
      const { wrapper, store } = mountState()
      store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })
      store.dispatch('updates/download')
      await wrapper.vm.$nextTick()

      expect(cardTitle(wrapper)).toEqual('Version 6.2.0 is downloading')
      expect(wrapper.find('.info-actions .btn').exists()).toBe(false)
      wrapper.destroy()
    })

    it('sends a portable build to the download page', async () => {
      const { wrapper, store } = mountState()
      store.dispatch('updates/found', { stage: 'manual', version: '6.2.0' })
      await wrapper.vm.$nextTick()

      wrapper.find('.info-actions .btn').trigger('click')
      expect(window.main.openExternally).toHaveBeenCalledWith('https://beekeeperstudio.io/get')
      wrapper.destroy()
    })
  })

  describe('license footnote', () => {
    it('tells community users what funds the app', () => {
      const { wrapper } = mountState('community')
      expect(wrapper.find('.brand-fact').text()).toContain('Community Edition')
      expect(wrapper.find('.trial-warning').exists()).toBe(false)
      wrapper.destroy()
    })

    it('counts down a trial that has time left', () => {
      const { wrapper } = mountState('trial', 11)
      expect(wrapper.find('.brand-fact').text()).toContain('Trial ends in 11 days')
      expect(wrapper.find('.trial-warning').exists()).toBe(false)
      wrapper.destroy()
    })

    it('warns instead once the trial is nearly up', () => {
      const { wrapper } = mountState('trial', 3)
      expect(wrapper.find('.trial-warning').text()).toContain('Trial expires')
      expect(wrapper.find('.brand-fact').exists()).toBe(false)
      wrapper.destroy()
    })

    it('says nothing to paying customers', () => {
      const { wrapper } = mountState('licensed')
      expect(wrapper.find('.brand-fact').exists()).toBe(false)
      expect(wrapper.find('.trial-warning').exists()).toBe(false)
      wrapper.destroy()
    })
  })
})
