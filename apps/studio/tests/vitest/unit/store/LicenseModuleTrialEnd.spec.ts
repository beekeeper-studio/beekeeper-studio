import { describe, it, expect, vi, beforeEach } from 'vitest'
import Vue from 'vue'
import Vuex from 'vuex'
import { LicenseModule, LICENSES_CHANGED_KEY } from '@/store/modules/LicenseModule'
import { hasDowngradedAfterTrial, recordTrialDowngrade } from '@/lib/trial'

vi.mock('@/lib/cloud/CloudClient', () => ({
  CloudClient: {
    getLicense: vi.fn(async () => ({
      validUntil: '2999-01-01T00:00:00Z',
      supportUntil: '2999-01-01T00:00:00Z',
      maxAllowedAppRelease: null,
      licenseType: 'PersonalLicense',
    })),
  },
}))

Vue.use(Vuex)

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const TRIAL = { id: 1, licenseType: 'TrialLicense', key: 'fake', validUntil: new Date(2026, 8, 4) }
const PAID = { id: 2, licenseType: 'PersonalLicense', key: 'abc-123', validUntil: new Date(2999, 0, 1) }

/** What license/getStatus serialises in each state. */
const EXPIRED_TRIAL = {
  isTrial: true, isUltimate: false, isCommunity: true,
  isValidDateExpired: true, isSupportDateExpired: false, isLifetime: false,
}
const LICENSED = {
  isTrial: false, isUltimate: true, isCommunity: false,
  isValidDateExpired: false, isSupportDateExpired: false, isLifetime: false,
}
const LIFETIME_NOT_COVERED = {
  ...LICENSED, isUltimate: false, isCommunity: true, isSupportDateExpired: true, isLifetime: true,
}

// the utility process, reduced to the license channels the module uses
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

describe('LicenseModule: trial end, license dialogs and other windows', () => {
  let backend: { status: any; licenses: any[] }
  let util: ReturnType<typeof fakeUtil>

  beforeEach(() => {
    localStorage.clear()
    backend = { status: EXPIRED_TRIAL, licenses: [TRIAL] }
    util = fakeUtil(backend)
    Vue.prototype.$util = util
    Vue.prototype.$noty = { info: vi.fn(), error: vi.fn() }
    ;(window as any).platformInfo = { cloudUrl: 'https://app.example.test', isDevelopment: false }
  })

  const syncs = () => util.send.mock.calls.filter(([channel]) => channel === 'license/getStatus').length

  it('init adopts a trial end that an older version already announced', async () => {
    localStorage.setItem('expiredLicenseEventsEmitted', 'true')
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(store.state.licenses.initialized).toBe(true)
    expect(store.getters['licenses/isTrialExpired']).toBe(true)
    expect(hasDowngradedAfterTrial()).toBe(true)
  })

  it('init leaves a trial that lapsed unseen to the dialog', async () => {
    const store = buildStore()

    await store.dispatch('licenses/init')

    expect(store.getters['licenses/isTrialExpired']).toBe(true)
    expect(hasDowngradedAfterTrial()).toBe(false)
  })

  it('re-reads the licenses when another window of the app changes them', async () => {
    const store = buildStore()
    await store.dispatch('licenses/init')
    const before = syncs()

    backend.status = LICENSED
    backend.licenses = [TRIAL, PAID]
    window.dispatchEvent(new StorageEvent('storage', { key: LICENSES_CHANGED_KEY, newValue: String(Date.now()) }))
    await flush()

    expect(syncs()).toBe(before + 1)
    expect(store.getters['licenses/isUltimate']).toBe(true)
    expect(store.getters['licenses/realLicenses']).toEqual([PAID])

    // an unrelated key is ignored
    window.dispatchEvent(new StorageEvent('storage', { key: 'somethingElse', newValue: '1' }))
    await flush()
    expect(syncs()).toBe(before + 1)
  })

  it('add: a new license supersedes the downgrade and tells the other windows', async () => {
    recordTrialDowngrade()
    const store = buildStore()
    await store.dispatch('licenses/init')
    backend.status = LICENSED
    backend.licenses = [TRIAL, PAID]

    await store.dispatch('licenses/add', { email: 'someone@example.test', key: 'abc-123' })

    expect(util.send).toHaveBeenCalledWith('appdb/license/save', expect.anything())
    expect(hasDowngradedAfterTrial()).toBe(false)
    expect(localStorage.getItem(LICENSES_CHANGED_KEY)).not.toBeNull()
    expect(store.getters['licenses/isUltimate']).toBe(true)
  })

  it('remove: without a license the trial-end question is open again', async () => {
    backend.status = LICENSED
    backend.licenses = [TRIAL, PAID]
    const store = buildStore()
    await store.dispatch('licenses/init')
    recordTrialDowngrade()
    localStorage.removeItem(LICENSES_CHANGED_KEY)

    backend.status = EXPIRED_TRIAL
    backend.licenses = [TRIAL]
    await store.dispatch('licenses/remove', PAID)

    expect(util.send).toHaveBeenCalledWith('license/remove', { id: PAID.id })
    expect(hasDowngradedAfterTrial()).toBe(false)
    expect(localStorage.getItem(LICENSES_CHANGED_KEY)).not.toBeNull()
    expect(store.getters['licenses/isTrialExpired']).toBe(true)
  })

  it('isLifetimeVersionNotCovered: a lifetime license this version has outgrown', async () => {
    backend.status = LIFETIME_NOT_COVERED
    backend.licenses = [PAID]
    const store = buildStore()
    await store.dispatch('licenses/init')
    expect(store.getters['licenses/isLifetimeVersionNotCovered']).toBe(true)
    expect(store.getters['licenses/isTrialExpired']).toBe(false)

    // the same license on a version it covers
    store.commit('licenses/setStatus', { ...LIFETIME_NOT_COVERED, isUltimate: true, isCommunity: false })
    expect(store.getters['licenses/isLifetimeVersionNotCovered']).toBe(false)
  })

  it('tracks the dialog that is waiting for an answer', () => {
    const store = buildStore()
    expect(store.state.licenses.blockingDialog).toBeNull()
    store.commit('licenses/setBlockingDialog', 'trial-ended-modal')
    expect(store.state.licenses.blockingDialog).toBe('trial-ended-modal')
    store.commit('licenses/setBlockingDialog', null)
    expect(store.state.licenses.blockingDialog).toBeNull()
  })
})
