import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

// Every Noty App.vue builds, with the options it was built with.
const { notys } = vi.hoisted(() => ({ notys: [] as any[] }))

vi.mock('noty', () => {
  class FakeNoty {
    static closeAll = vi.fn()
    static button = vi.fn((text: string, classes: string, cb: () => void) => ({ text, classes, cb }))
    options: any
    show = vi.fn()
    close = vi.fn()
    constructor(options: any) {
      this.options = options
      notys.push(this)
    }
  }
  return { default: FakeNoty }
})

import App from '@/App.vue'

// as renderer.ts does: the expiry reminder says "in 14 days"
TimeAgo.addLocale(en)

const localVue = createLocalVue()
localVue.use(Vuex)

function buildStore(options: { trialStartedOnLaunch: boolean }) {
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  return new Vuex.Store({
    state: { storeInitialized: false, connected: false, database: null } as any,
    getters: {
      isTrial: () => true,
      isUltimate: () => true,
    },
    actions: { updateWindowTitle: vi.fn() },
    modules: {
      licenses: {
        namespaced: true,
        state: {
          initialized: true,
          trialStartedOnLaunch: options.trialStartedOnLaunch,
          status: {
            edition: 'ultimate',
            condition: ['No app version restriction'],
            isTrial: true,
            isValidDateExpired: false,
            isSupportDateExpired: false,
            fromFile: false,
            license: { validUntil },
          },
        },
        actions: { updateAll: vi.fn() },
      },
      settings: {
        namespaced: true,
        state: { settings: {} },
        getters: { themeValue: () => null },
      },
    },
  })
}

function mountApp(store: any) {
  return shallowMount(App, {
    localVue,
    store,
    mocks: {
      $config: { isDevelopment: false, isMac: false },
      $util: { send: vi.fn() },
      $noty: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
      $bks: { unlock: vi.fn() },
    },
    stubs: ['portal-target'],
  })
}

const button = (noty: any, text: string) => noty.options.buttons.find((b: any) => b.text === text)

describe('App: the trial started at launch', () => {
  beforeEach(() => {
    notys.length = 0
    ;(window as any).main = { isReady: vi.fn(), setWindowTitle: vi.fn() }
    vi.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('says the trial started instead of when it ends', async () => {
    const wrapper = mountApp(buildStore({ trialStartedOnLaunch: true }))
    await wrapper.vm.$nextTick()

    expect(notys).toHaveLength(1)
    const [noty] = notys
    expect(noty.options.text).toContain('14 day free trial')
    expect(noty.options.text).toContain('All paid features have been unlocked. Enjoy!')
    // a link: the window opens it in the browser, with ref=bks-app
    expect(noty.options.text).toContain('<a class="link" href="https://www.beekeeperstudio.io/pricing/?compare=true">Learn more</a>')
    expect(noty.options.timeout).toBe(false)
    expect(noty.show).toHaveBeenCalled()

    button(noty, 'Sounds good').cb()
    expect(noty.close).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('reminds a trial user when the trial ends on any other launch', async () => {
    const wrapper = mountApp(buildStore({ trialStartedOnLaunch: false }))
    await wrapper.vm.$nextTick()

    expect(notys).toHaveLength(1)
    expect(notys[0].options.text).toContain('Your free trial expires')
    wrapper.destroy()
  })
})
