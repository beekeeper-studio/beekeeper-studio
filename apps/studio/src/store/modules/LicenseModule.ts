import _ from 'lodash'
import { Module } from "vuex";

import { State as RootState } from '../index'
import { upsert } from './data/StoreHelpers';
import { CloudError } from '@/lib/cloud/ClientHelpers';
import { CloudClient } from '@/lib/cloud/CloudClient';
import { TransportLicenseKey } from '@/common/transport';
import Vue from "vue"
import { getLicenseStatus } from '@/lib/license';
import { SmartLocalStorage } from '@/common/LocalStorage';

interface State {
  initialized: boolean
  licenses: TransportLicenseKey[],
  loading: boolean
  error: CloudError | Error | null
  now: Date
}

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

export const LicenseModule: Module<State, RootState>  = {
  namespaced: true,
  state: () => ({
    initialized: false,
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
    status(state) {
      return getLicenseStatus({
        licenses: state.licenses,
        currentDate: state.now,
        currentVersion: window.platformInfo.parsedAppVersion,
      })
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
    noLicensesFound(state) {
      return state.licenses.length === 0
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
    setInitialized(state, b: boolean) {
      state.initialized = b
    },
    setNow(state, date: Date) {
      state.now = date
    },
  },
  actions: {
    async init(context) {
      await Vue.prototype.$util.addListener('licenseStatusSwitched', () => {})
      const licenses = await Vue.prototype.$util.send('appdb/license/find');
      context.commit('set', licenses)
      await context.dispatch('updateAll')
      context.commit('setInitialized', true)
    },

    async add(context, { email, key }) {

      const result = await CloudClient.getLicense(window.platformInfo.cloudUrl, email, key)
      // if we got here, license is good.
      let license = {} as TransportLicenseKey
      license.key = key
      license.email = email
      license.validUntil = new Date(result.validUntil)
      license.supportUntil = new Date(result.supportUntil)
      license.maxAllowedAppRelease = result.maxAllowedAppRelease
      license.licenseType = result.licenseType
      const others = context.getters.realLicenses
      license = await Vue.prototype.$util.send('appdb/license/save', { obj: license });
      await Vue.prototype.$util.send('appdb/license/remove', { obj: others });
      // allow showing expired license modal next time
      SmartLocalStorage.setBool('showExpiredLicenseModal', true)
      context.commit('add', license)
      context.commit('remove', others)
    },

    async update(_context, license: TransportLicenseKey) {
      try {
        const data = await CloudClient.getLicense(window.platformInfo.cloudUrl, license.email, license.key)
        license.validUntil = new Date(data.validUntil)
        license.supportUntil = new Date(data.supportUntil)
        license.maxAllowedAppRelease = data.maxAllowedAppRelease
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
