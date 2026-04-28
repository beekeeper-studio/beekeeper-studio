import Vuex from 'vuex'
import Vue from 'vue'
import { LicenseModule } from '@/store/modules/LicenseModule'
import { CloudClient } from '@/lib/cloud/CloudClient'
import { CloudError } from '@/lib/cloud/ClientHelpers'
import { TransportLicenseKey } from '@/common/transport'

Vue.use(Vuex)

jest.mock('@/lib/cloud/CloudClient')

const mockSend = jest.fn()
Vue.prototype.$util = { send: mockSend }

function buildStore() {
  return new Vuex.Store({
    modules: { licenses: LicenseModule },
  })
}

function personalLicense(overrides: Partial<TransportLicenseKey> = {}): TransportLicenseKey {
  return {
    id: 1,
    email: 'user@example.com',
    key: 'AAAA-BBBB-CCCC',
    validUntil: new Date('2099-01-01'),
    supportUntil: new Date('2099-01-01'),
    licenseType: 'PersonalLicense',
    active: true,
    maxAllowedAppRelease: null,
    invalidatedAt: null,
    ...overrides,
  } as TransportLicenseKey
}

describe('LicenseModule', () => {
  let store: ReturnType<typeof buildStore>
  const originalPlatformInfo = (window as any).platformInfo

  beforeEach(() => {
    jest.clearAllMocks()
    mockSend.mockReset()
    ;(window as any).platformInfo = {
      cloudUrl: 'https://example.test',
      isDevelopment: false,
      platform: 'linux',
      isArm: false,
    }
    store = buildStore()
  })

  afterEach(() => {
    (window as any).platformInfo = originalPlatformInfo
  })

  describe('update action', () => {
    it('stamps invalidatedAt when the server returns a 404', async () => {
      const license = personalLicense()
      ;(CloudClient.getLicense as jest.Mock).mockRejectedValue(new CloudError(404, 'Not Found'))
      mockSend.mockImplementation(async (channel: string) => {
        if (channel === 'appdb/license/save') return license
        return null
      })

      await store.dispatch('licenses/update', license)

      const saveCalls = mockSend.mock.calls.filter(([ch]) => ch === 'appdb/license/save')
      expect(saveCalls).toHaveLength(1)
      const saved = saveCalls[0][1].obj as TransportLicenseKey
      expect(saved.invalidatedAt).toBeInstanceOf(Date)
      expect(saved.validUntil).toBeInstanceOf(Date)
      // validUntil should have been rewound to "now" (within the last few seconds)
      expect(Date.now() - saved.validUntil.getTime()).toBeLessThan(5000)
    })

    it('clears invalidatedAt on a successful refresh', async () => {
      const previouslyInvalidated = personalLicense({
        invalidatedAt: new Date('2024-01-01'),
      })
      ;(CloudClient.getLicense as jest.Mock).mockResolvedValue({
        validUntil: '2099-12-31',
        supportUntil: '2099-12-31',
        maxAllowedAppRelease: null,
        licenseType: 'PersonalLicense',
      })
      mockSend.mockImplementation(async (channel: string) => {
        if (channel === 'appdb/license/save') return previouslyInvalidated
        return null
      })

      await store.dispatch('licenses/update', previouslyInvalidated)

      const saveCalls = mockSend.mock.calls.filter(([ch]) => ch === 'appdb/license/save')
      expect(saveCalls).toHaveLength(1)
      const saved = saveCalls[0][1].obj as TransportLicenseKey
      expect(saved.invalidatedAt).toBeNull()
    })

    it('does not stamp invalidatedAt for non-404 CloudErrors (eg 403)', async () => {
      const license = personalLicense()
      ;(CloudClient.getLicense as jest.Mock).mockRejectedValue(new CloudError(403, 'Forbidden'))
      mockSend.mockImplementation(async (channel: string) => {
        if (channel === 'appdb/license/save') return license
        return null
      })

      await store.dispatch('licenses/update', license)

      const saveCalls = mockSend.mock.calls.filter(([ch]) => ch === 'appdb/license/save')
      expect(saveCalls).toHaveLength(1)
      const saved = saveCalls[0][1].obj as TransportLicenseKey
      expect(saved.invalidatedAt).toBeNull()
    })

    it('skips entirely when license.id is null (eg an offline/file-based license)', async () => {
      // A license loaded from disk via OfflineLicense has no DB id. Passing it
      // to save would INSERT a new row — that was the bug that produced 9000+
      // duplicate license_keys rows.
      const license = personalLicense({ id: null })
      mockSend.mockResolvedValue(null)

      await store.dispatch('licenses/update', license)

      expect((CloudClient.getLicense as jest.Mock)).not.toHaveBeenCalled()
      const saveCalls = mockSend.mock.calls.filter(([ch]) => ch === 'appdb/license/save')
      expect(saveCalls).toHaveLength(0)
    })
  })

  describe('updateAll dedup', () => {
    it('coalesces overlapping updateAll dispatches so each license only fires one request', async () => {
      const license = personalLicense()
      // Seed state so realLicenses getter returns our license.
      store.commit('licenses/set', [license])

      let resolveGetLicense: (value: unknown) => void
      ;(CloudClient.getLicense as jest.Mock).mockImplementation(
        () => new Promise((resolve) => { resolveGetLicense = resolve })
      )
      mockSend.mockImplementation(async (channel: string) => {
        if (channel === 'appdb/license/save') return license
        if (channel === 'license/getStatus') return { edition: 'community', condition: [] }
        if (channel === 'license/get') return [license]
        return null
      })

      // Fire several in-flight dispatches without awaiting.
      const a = store.dispatch('licenses/updateAll')
      const b = store.dispatch('licenses/updateAll')
      const c = store.dispatch('licenses/updateAll')

      // Let any microtasks settle so all three have entered the action.
      await Promise.resolve()
      await Promise.resolve()

      expect((CloudClient.getLicense as jest.Mock)).toHaveBeenCalledTimes(1)

      // Release the in-flight request and let everything drain.
      resolveGetLicense({
        validUntil: '2099-12-31',
        supportUntil: '2099-12-31',
        maxAllowedAppRelease: null,
        licenseType: 'PersonalLicense',
      })
      await Promise.all([a, b, c])

      // Still exactly one server request despite three dispatches.
      expect((CloudClient.getLicense as jest.Mock)).toHaveBeenCalledTimes(1)
    })
  })
})
