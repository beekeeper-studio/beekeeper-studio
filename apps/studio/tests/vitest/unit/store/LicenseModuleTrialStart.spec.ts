import { describe, it, expect, vi, beforeEach } from 'vitest'
import Vue from 'vue'
import Vuex from 'vuex'
import { LicenseModule, LICENSES_CHANGED_KEY } from '@/store/modules/LicenseModule'

Vue.use(Vuex)

const TRIAL = { id: 1, licenseType: 'TrialLicense', key: 'fake', validUntil: new Date(2999, 0, 1) }
const OLD_TRIAL = { id: 1, licenseType: 'TrialLicense', key: 'fake', validUntil: new Date(2025, 0, 1) }
const PAID = { id: 2, licenseType: 'PersonalLicense', key: 'abc-123', validUntil: new Date(2999, 0, 1) }

/** What license/getStatus serialises in each state. */
const NO_LICENSE = {
  isTrial: false, isUltimate: false, isCommunity: true,
  isValidDateExpired: false, isSupportDateExpired: false, isLifetime: false,
}
const ON_TRIAL = { ...NO_LICENSE, isTrial: true, isUltimate: true, isCommunity: false }
const EXPIRED_TRIAL = { ...NO_LICENSE, isTrial: true, isValidDateExpired: true }
const LICENSED = { ...NO_LICENSE, isUltimate: true, isCommunity: false }

// the utility process, reduced to the license channels the module uses;
// createTrialLicense refuses when any license exists, like LicenseKey does
function fakeUtil(backend: { status: any; licenses: any[] }) {
  return {
    send: vi.fn(async (channel: string) => {
      switch (channel) {
        case 'license/getStatus':
          return backend.status
        case 'license/get':
          return backend.licenses
        case 'license/getInstallationId':
          return 'installation-1'
        case 'license/createTrialLicense':
          if (backend.licenses.length) throw new Error('Not allowed')
          backend.licenses = [TRIAL]
          backend.status = ON_TRIAL
          return undefined
        default:
          return undefined
      }
    }),
  }
}

function buildStore() {
  return new Vuex.Store({
    state: { workspaceId: -1 },
    mutations: {
      workspaceId(state: any, id: number) {
        state.workspaceId = id
      },
    },
    modules: { licenses: LicenseModule as any },
  })
}

describe('LicenseModule: the trial starts at launch for anyone who never had one', () => {
  let backend: { status: any; licenses: any[] }
  let util: ReturnType<typeof fakeUtil>

  beforeEach(() => {
    localStorage.clear()
    backend = { status: NO_LICENSE, licenses: [] }
    util = fakeUtil(backend)
    Vue.prototype.$util = util
    Vue.prototype.$noty = { info: vi.fn(), error: vi.fn() }
    ;(window as any).platformInfo = { cloudUrl: 'https://app.example.test', isDevelopment: false }
  })

  const trialsCreated = () =>
    util.send.mock.calls.filter(([channel]) => channel === 'license/createTrialLicense').length

  it('starts the trial without a license, new install or not', async () => {
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(trialsCreated()).toBe(1)
    expect(store.state.licenses.trialStartedOnLaunch).toBe(true)
    expect(store.getters['licenses/isTrial']).toBe(true)
    expect(store.getters['licenses/isUltimate']).toBe(true)
    expect(store.state.licenses.initialized).toBe(true)
    // App.vue announces it, not the "trial has started" toast
    expect(Vue.prototype.$noty.info).not.toHaveBeenCalled()
    // the app's other windows pick it up
    expect(localStorage.getItem(LICENSES_CHANGED_KEY)).not.toBeNull()
  })

  it('leaves a license alone', async () => {
    // eg an offline license file, which license/get lists
    backend.status = LICENSED
    backend.licenses = [PAID]
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(trialsCreated()).toBe(0)
    expect(store.state.licenses.trialStartedOnLaunch).toBe(false)
  })

  it('does not start a trial that ended, even long ago, by itself', async () => {
    backend.status = { ...EXPIRED_TRIAL, canStartTrial: true }
    backend.licenses = [OLD_TRIAL]
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(trialsCreated()).toBe(0)
    expect(store.state.licenses.trialStartedOnLaunch).toBe(false)
    // the "Start free trial" buttons can
    expect(store.getters['licenses/canStartTrial']).toBe(true)
  })

  it('carries on without a trial when it cannot be created', async () => {
    util.send.mockImplementation(async (channel: string) => {
      if (channel === 'license/createTrialLicense') throw new Error('Not allowed')
      if (channel === 'license/getStatus') return backend.status
      if (channel === 'license/get') return backend.licenses
      return undefined
    })
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(store.state.licenses.trialStartedOnLaunch).toBe(false)
    expect(store.getters['licenses/isCommunity']).toBe(true)
    expect(store.state.licenses.initialized).toBe(true)
  })

  it('trialLicense is the latest trial, which a renewal adds after the old one', () => {
    const store = buildStore()
    const renewed = { ...TRIAL, id: 3, key: 'fake-2' }
    store.commit('licenses/set', [OLD_TRIAL, renewed])
    expect(store.getters['licenses/trialLicense']).toEqual(renewed)
  })
})
