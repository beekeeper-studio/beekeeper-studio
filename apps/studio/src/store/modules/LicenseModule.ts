import _ from 'lodash'
import { Module } from "vuex";

import { State as RootState } from '../index'
import { upsert } from './data/StoreHelpers';
import { CloudError } from '@/lib/cloud/ClientHelpers';
import { CloudClient } from '@/lib/cloud/CloudClient';
import { TransportLicenseKey } from '@/common/transport';
import Vue from "vue"

interface State {
  licenses: TransportLicenseKey[],
  loading: boolean
  error: CloudError | Error | null
  now: Date
}

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

function parseTagVersion(version: string) {
  const VERSION_TAG = /^v(\d+)\.(\d+)\.(\d+)$/
  const match = VERSION_TAG.exec(version)
  const major = match ? parseInt(match[1]) : 0
  const minor = match ? parseInt(match[2]) : 0
  const patch = match ? parseInt(match[3]) : 0
  return { major, minor, patch }
}

function isAppVersionLessThanOrEqual(target: { major: number, minor: number, patch: number }) {
  const app = window.platformInfo.parsedAppVersion
  if (app.major > target.major) return false
  if (app.minor > target.minor) return false
  if (app.patch > target.patch) return false
  return true
}

export const LicenseModule: Module<State, RootState>  = {
  namespaced: true,
  state: () => ({
    licenses: [],
    loading: false,
    error: null,
    now: new Date(),
  }),
  getters: {
    newestLicense(state) {
      return _.orderBy(state.licenses, ['validUntil'], ['desc'])[0] || {} as TransportLicenseKey
    },
    realLicenses(state) {
      return state.licenses.filter((l) => l.licenseType !== 'TrialLicense')
    },
    status(state, getters) {
      // Do they have a license at all?
      if (state.licenses.length === 0) {
        return {
          edition: 'community',
          condition: 'No license found',
        }
      }

      const license = getters.newestLicense

      // Is the license not valid?
      if (state.now > license.valid_until) {
        return {
          license,
          edition: 'community',
          condition: 'License expired',
        }
      }

      // From here, we know that the license is still valid.
      // Is maxAllowedAppVersion nullish?
      if (_.isNil(license.maxAllowedAppVersion)) {
        return {
          license,
          edition: 'ultimate',
          condition: 'No app version restriction',
        }
      }

      // Does the license allow the current app version?
      if (isAppVersionLessThanOrEqual(license.maxAllowedAppVersion)) {
        return {
          license,
          edition: 'ultimate',
          condition: 'App version allowed',
        }
      }

      return {
        license,
        edition: 'community',
        condition: 'App version not allowed',
      }
    },
    isUltimate(_state, getters) {
      return getters.status.edition === 'ultimate'
    },
    isCommunity(_state, getters) {
      return getters.status.edition === 'community'
    },
    licenseDaysLeft(state, getters) {
      const validUntil = getters.status.license.validUntil.getTime()
      const now = state.now.getTime()
      return Math.round((validUntil - now) / oneDay);
    },
  },

  mutations: {
    set(state, licenses: TransportLicenseKey[]) {
      state.licenses = licenses
    },
    add(state, license: TransportLicenseKey) {
      upsert(state.licenses, license, (a, b) => a.key === b.key && a.email === b.email)
    },
    remove(state, licenses: TransportLicenseKey[]) {
      state.licenses = _.without(state.licenses, ...licenses)
    },
    setNow(state, date: Date) {
      state.now = date
    },
  },
  actions: {
    async init(context) {
      const licenses = await Vue.prototype.$util.send('appdb/license/find');
      licenses.find((l) => l.licenseType === 'TrialLicense').validUntil = new Date(new Date().getTime() + (10 * 1000));
      licenses.find((l) => l.licenseType === 'TrialLicense').supportUntil = new Date(new Date().getTime() + (10 * 1000));
      context.commit('set', licenses)
      context.dispatch('updateAll')
    },

    async add(context, { email, key }) {

      const result = await CloudClient.getLicense(window.platformInfo.cloudUrl, email, key)
      const tagName = result.maxAllowedAppRelease.tagName
      // if we got here, license is good.
      let license = {} as TransportLicenseKey
      license.key = key
      license.email = email
      license.validUntil = new Date(result.validUntil)
      license.supportUntil = new Date(result.supportUntil)
      license.maxAllowedAppVersion = tagName ? parseTagVersion(result.maxAllowedAppRelease.tagName) : null
      license.licenseType = result.licenseType
      const others = context.getters.realLicenses
      license = await Vue.prototype.$util.send('appdb/license/save', { obj: license });
      await Vue.prototype.$util.send('appdb/license/remove', { obj: others });
      context.commit('add', license)
      context.commit('remove', others)
    },

    async update(_context, license: TransportLicenseKey) {
      try {
        const data = await CloudClient.getLicense(window.platformInfo.cloudUrl, license.email, license.key)
        const tagName = data.maxAllowedAppRelease.tagName
        license.validUntil = new Date(data.validUntil)
        license.supportUntil = new Date(data.supportUntil)
        license.maxAllowedAppVersion = tagName ? parseTagVersion(data.maxAllowedAppRelease.tagName) : null
        license = await Vue.prototype.$util.send('appdb/license/save', { obj: license });
      } catch (error) {
        if (error instanceof CloudError) {
          // eg 403, 404, license not valid
          license.validUntil = new Date()
          license = await Vue.prototype.$util.send('appdb/license/save', { obj: license });
        } else {
          // eg 500 errors
          // do nothing
        }

      }

    },

    async updateAll(context) {
      for (let index = 0; index < context.getters.realLicenses.length; index++) {
        const license = context.getters.realLicenses[index];
        await context.dispatch('update', license)
      }
    },

    updateDate(context) {
      context.commit('setNow', new Date())
    },
  }
}
