import { describe, it, expect, beforeEach, vi } from 'vitest'
import Vue from 'vue'
import Vuex from 'vuex'
import { LicenseModule } from '@/store/modules/LicenseModule'
import { isTrialWelcomePending } from '@/lib/trial'

Vue.use(Vuex)

const noLicenseStatus = {
  edition: 'community',
  condition: ['No license found'],
  isTrial: false,
  isUltimate: false,
  isCommunity: true,
  isValidDateExpired: false,
  isSupportDateExpired: false,
  isLifetime: false,
}

const activeTrialStatus = {
  edition: 'ultimate',
  condition: ['No app version restriction'],
  isTrial: true,
  isUltimate: true,
  isCommunity: false,
  isValidDateExpired: false,
  isSupportDateExpired: false,
  isLifetime: false,
  license: { licenseType: 'TrialLicense' },
}

const expiredTrialStatus = {
  ...activeTrialStatus,
  edition: 'community',
  condition: ['Expired valid date'],
  isUltimate: false,
  isCommunity: true,
  isValidDateExpired: true,
}

const paidStatus = {
  ...activeTrialStatus,
  isTrial: false,
  license: { licenseType: 'PersonalLicense' },
}

function buildStore() {
  return new Vuex.Store({
    state: { workspaceId: -1 },
    mutations: {
      workspaceId(state: any, id: number) {
        state.workspaceId = id
      },
    },
    modules: { licenses: LicenseModule },
  })
}

function calls(send: ReturnType<typeof vi.fn>, channel: string) {
  return send.mock.calls.filter(([c]) => c === channel)
}

describe('licenses/init on launch', () => {
  let send: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    send = vi.fn()
    Vue.prototype.$util = { send }
  })

  it('auto-starts the free trial when no license of any kind exists', async () => {
    let licenses: any[] = []
    send.mockImplementation(async (channel: string) => {
      switch (channel) {
        case 'license/get':
          return licenses
        case 'license/getStatus':
          return licenses.length ? activeTrialStatus : noLicenseStatus
        case 'license/createTrialLicense':
          licenses = [{ licenseType: 'TrialLicense', validUntil: new Date() }]
          return
        case 'license/getInstallationId':
          return 'install-1'
        default:
          return null
      }
    })
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(calls(send, 'license/createTrialLicense')).toHaveLength(1)
    expect(store.getters['licenses/isTrialActive']).toBe(true)
    expect(store.getters['licenses/isTrialExpired']).toBe(false)
    expect(store.getters['licenses/isUltimate']).toBe(true)
    // the welcome dialog is owed, and the expiry events may fire again later
    expect(isTrialWelcomePending()).toBe(true)
    expect(localStorage.getItem('expiredLicenseEventsEmitted')).toBe('false')
    expect(store.state.licenses.initialized).toBe(true)
  })

  it('leaves an expired trial alone so the trial-ended dialog can take over', async () => {
    send.mockImplementation(async (channel: string) => {
      switch (channel) {
        case 'license/get':
          return [{ licenseType: 'TrialLicense' }]
        case 'license/getStatus':
          return expiredTrialStatus
        case 'license/getInstallationId':
          return 'install-1'
        default:
          return null
      }
    })
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(calls(send, 'license/createTrialLicense')).toHaveLength(0)
    expect(store.getters['licenses/isTrialExpired']).toBe(true)
    expect(store.getters['licenses/isTrialActive']).toBe(false)
    expect(isTrialWelcomePending()).toBe(false)
  })

  it('does not touch a paid license', async () => {
    send.mockImplementation(async (channel: string) => {
      switch (channel) {
        case 'license/get':
          return [{ licenseType: 'PersonalLicense' }]
        case 'license/getStatus':
          return paidStatus
        case 'license/getInstallationId':
          return 'install-1'
        default:
          return null
      }
    })
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(calls(send, 'license/createTrialLicense')).toHaveLength(0)
    expect(store.getters['licenses/isTrialActive']).toBe(false)
    expect(store.getters['licenses/isTrialExpired']).toBe(false)
    expect(isTrialWelcomePending()).toBe(false)
  })

  it('still initializes when the trial cannot be created', async () => {
    send.mockImplementation(async (channel: string) => {
      switch (channel) {
        case 'license/get':
          return []
        case 'license/getStatus':
          return noLicenseStatus
        case 'license/createTrialLicense':
          throw new Error('Not allowed')
        case 'license/getInstallationId':
          return 'install-1'
        default:
          return null
      }
    })
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(store.state.licenses.initialized).toBe(true)
    expect(store.getters['licenses/isCommunity']).toBe(true)
    expect(isTrialWelcomePending()).toBe(false)
  })

  it('runs once', async () => {
    send.mockImplementation(async (channel: string) => {
      switch (channel) {
        case 'license/get':
          return [{ licenseType: 'PersonalLicense' }]
        case 'license/getStatus':
          return paidStatus
        default:
          return 'install-1'
      }
    })
    const store = buildStore()

    await store.dispatch('licenses/init')
    await store.dispatch('licenses/init')

    expect(calls(send, 'license/getInstallationId')).toHaveLength(1)
  })
})
