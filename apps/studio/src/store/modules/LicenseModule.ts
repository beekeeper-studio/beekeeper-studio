import _ from 'lodash'
import { install, Module } from "vuex";
import rawLog from '@bksLogger'
import { State as RootState } from '../index'
import { CloudError } from '@/lib/cloud/ClientHelpers';
import { TransportLicenseKey } from '@/common/transport';
import Vue from "vue"
import { LicenseStatus } from '@/lib/license';
import { SmartLocalStorage } from '@/common/LocalStorage';
import { CloudClient } from '@/lib/cloud/CloudClient';

interface State {
  initialized: boolean
  licenses: TransportLicenseKey[]
  error: CloudError | Error | null
  now: Date
  status: LicenseStatus,
  installationId: string | null
}

const log = rawLog.scope('LicenseModule')

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

// Coalesce overlapping dispatches so a tight loop (or a duplicate mount) can't
// hammer the license server with identical in-flight requests.
let inflightUpdateAll: Promise<void> | null = null
const inflightUpdates = new Map<string, Promise<void>>()

const defaultStatus = new LicenseStatus()
Object.assign(defaultStatus, {
  edition: "community",
  condition: "initial",
})

export const LicenseModule: Module<State, RootState>  = {
  namespaced: true,
  state: () => ({
    initialized: false,
    licenses: [],
    error: null,
    now: new Date(),
    status: defaultStatus,
    installationId: null
  }),
  getters: {
    trialLicense(state) {
      return state.licenses.find((l) => l.licenseType === 'TrialLicense')
    },
    realLicenses(state) {
      return state.licenses.filter((l) => l.licenseType !== 'TrialLicense')
    },
    licenseDaysLeft(state) {
      const validUntil = state.status.license.validUntil.getTime()
      const now = state.now.getTime()
      return Math.round((validUntil - now) / oneDay);
    },
    noLicensesFound(state) {
      return state.licenses.length === 0
    },
    isUltimate(state) {
      if (!state) return false
      return state.status.isUltimate
    },
    isCommunity(state) {
      if (!state) return true
      return state.status.isCommunity
    },
    isTrial(state) {
      if (!state) return true
      return state.status.isTrial
    },
    isValidStateExpired(state) {
      // this means a license with lifetime perms, but is no longer valid for software updates
      // so the user has to use an older version of the app.
      return state.status.isValidDateExpired
    }
  },
  mutations: {
    set(state, licenses: TransportLicenseKey[]) {
      state.licenses = licenses
    },
    setInitialized(state, b: boolean) {
      state.initialized = b
    },
    installationId(state, id: string) {
      state.installationId = id
    },
    setNow(state, date: Date) {
      state.now = date
    },
    setStatus(state, status: LicenseStatus) {
      state.status = status
    },
  },
  actions: {
    async init(context) {
      if (context.state.initialized) {
        log.warn('Already initialized')
        return
      }
      await context.dispatch('sync')
      const installationId = await Vue.prototype.$util.send('license/getInstallationId');
      context.commit('installationId', installationId)
      context.commit('setInitialized', true)
    },
    async add(context, { email, key, trial }) {
      if (trial) {
        try {
          await Vue.prototype.$util.send('license/createTrialLicense')
          await Vue.prototype.$noty.info("Your 14 day free trial has started, enjoy!")
        } catch (error) {
          log.error("Failed to create trial license", error)
          await Vue.prototype.$noty.error("Unable to start trial: a license already exists")
          return
        }
      } else {
        // Get the installation ID from the backend
        const installationId = context.state.installationId

        const result = await CloudClient.getLicense(
          window.platformInfo.cloudUrl,
          email,
          key,
          installationId,
          window.platformInfo
        );

        // if we got here, license is good.
        const license = {} as TransportLicenseKey;
        license.key = key;
        license.email = email;
        license.validUntil = new Date(result.validUntil);
        license.supportUntil = new Date(result.supportUntil);
        license.maxAllowedAppRelease = result.maxAllowedAppRelease;
        license.licenseType = result.licenseType;
        await Vue.prototype.$util.send('appdb/license/save', { obj: license });
      }
      // allow emitting expired license events next time
      SmartLocalStorage.setBool('expiredLicenseEventsEmitted', false)
      await context.dispatch('sync')
    },
    async update(_context, license: TransportLicenseKey) {
      if (license.id == null) {
        // Saving a license without an id would INSERT a new row. The only
        // legitimate no-id path is add(); update() should only ever see
        // persisted rows. Offline/file-based licenses also land here with
        // null ids, and they shouldn't be synced to the server.
        log.warn('Skipping license update: no id on license', license.key)
        return
      }

      const existing = inflightUpdates.get(license.key)
      if (existing) return existing

      const work = (async () => {
        // This is to allow for dev switching
        const isDevUpdate = window.platformInfo.isDevelopment && license.email == "fake_email";
        try {
          const installationId = _context.state.installationId

          const data = isDevUpdate ? license : await CloudClient.getLicense(
            window.platformInfo.cloudUrl,
            license.email,
            license.key,
            installationId,
            window.platformInfo
          );

          license.validUntil = new Date(data.validUntil)
          license.supportUntil = new Date(data.supportUntil)
          license.maxAllowedAppRelease = data.maxAllowedAppRelease
          // A successful fetch clears any prior "server said this key is invalid"
          // marker, so a key that support restores naturally re-activates.
          license.invalidatedAt = null
          await Vue.prototype.$util.send('appdb/license/save', { obj: license });
        } catch (error) {
          if (error instanceof CloudError) {
            log.error("Cloud error on license fetch: ", error.message)
            license.validUntil = new Date()
            // 404 means the server no longer recognizes this key (eg support
            // revoked it). Stamp it so the UI can surface that state; other
            // CloudError statuses (403, etc) are auth/entitlement issues and
            // should not set the flag.
            if (error.status === 404) {
              license.invalidatedAt = new Date()
            }
            await Vue.prototype.$util.send('appdb/license/save', { obj: license });
          } else {
            log.error("Problems getting license", error)
            // eg 500 errors
            // do nothing
          }
        }
      })()

      inflightUpdates.set(license.key, work)
      try {
        await work
      } finally {
        inflightUpdates.delete(license.key)
      }
    },
    async updateAll(context) {
      if (inflightUpdateAll) return inflightUpdateAll

      const work = (async () => {
        for (let index = 0; index < context.getters.realLicenses.length; index++) {
          const license = context.getters.realLicenses[index];
          await context.dispatch('update', license);
        }
        await context.dispatch('sync');
      })()

      inflightUpdateAll = work
      try {
        await work
      } finally {
        inflightUpdateAll = null
      }
    },
    async remove(context, license) {
      await Vue.prototype.$util.send('license/remove', { id: license.id })
      await context.dispatch('sync')
    },
    async sync(context) {
      const status = await Vue.prototype.$util.send('license/getStatus')
      const licenses = await Vue.prototype.$util.send('license/get')
      context.commit('set', licenses)
      context.commit('setStatus', status)
      context.commit('setNow', new Date())
    },
  }
}
