import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import App from '@/App.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const FLAG = 'expiredLicenseEventsEmitted'

// Enough store for App.vue to mount: the license module's status and
// initialized flag drive the expiry check, everything else is inert.
function buildStore(options: { initialized: boolean; expired: boolean }) {
  return new Vuex.Store({
    state: { storeInitialized: false, connected: false, database: null } as any,
    getters: {
      isTrial: () => false,
      isUltimate: () => false,
    },
    actions: { updateWindowTitle: jest.fn() },
    modules: {
      licenses: {
        namespaced: true,
        state: {
          initialized: options.initialized,
          status: {
            edition: 'community',
            condition: options.expired ? ['Expired valid date'] : ['No license found'],
            isTrial: options.expired,
            isValidDateExpired: options.expired,
            isSupportDateExpired: false,
            fromFile: false,
          },
        },
        mutations: {
          setInitialized(state: any, b: boolean) { state.initialized = b },
        },
        actions: { updateAll: jest.fn() },
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
      $util: { send: jest.fn() },
      $noty: { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() },
      $bks: { unlock: jest.fn() },
    },
    stubs: ['portal-target'],
  })
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('App license expiry check', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(window as any).main = { isReady: jest.fn(), setWindowTitle: jest.fn() }
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('runs the expiry check on mount when the store loaded licenses first', async () => {
    // The real boot order: initRootStates() finishes (licenses initialized,
    // status final) before App.vue is created, so its watchers never fire.
    const wrapper = mountApp(buildStore({ initialized: true, expired: true }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(localStorage.getItem(FLAG)).toBe('true')
    wrapper.destroy()
  })

  it('does not report an expiry that has not happened', async () => {
    const wrapper = mountApp(buildStore({ initialized: true, expired: false }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(localStorage.getItem(FLAG)).toBeNull()
    wrapper.destroy()
  })

  it('still reacts when licenses finish loading after mount', async () => {
    const store = buildStore({ initialized: false, expired: true })
    const wrapper = mountApp(store)
    await wrapper.vm.$nextTick()
    expect(localStorage.getItem(FLAG)).toBeNull()

    store.commit('licenses/setInitialized', true)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(localStorage.getItem(FLAG)).toBe('true')
    wrapper.destroy()
  })

  it('reports once: a second mount with the flag set stays quiet', async () => {
    localStorage.setItem(FLAG, 'true')
    const store = buildStore({ initialized: true, expired: true })
    const emitted: string[] = []
    const wrapper = mountApp(store)
    wrapper.vm.$root.$on('licenseValidDateExpired', () => emitted.push('licenseValidDateExpired'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(emitted).toEqual([])
    wrapper.destroy()
  })
})
