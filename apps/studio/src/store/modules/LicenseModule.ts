import _ from 'lodash'
import { Module } from "vuex";
import rawLog from 'electron-log'
import { State as RootState } from '../index'
import { CloudError } from '@/lib/cloud/ClientHelpers';
import { TransportLicenseKey } from '@/common/transport';
import Vue from "vue"
import { LicenseStatus } from '@/lib/license';
import { SmartLocalStorage } from '@/common/LocalStorage';
import globals from '@/common/globals';

interface State {
  initialized: boolean
  licenses: TransportLicenseKey[]
  error: CloudError | Error | null
  now: Date
  status: LicenseStatus
}

const log = rawLog.scope('LicenseModule')

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

export const LicenseModule: Module<State, RootState>  = {
  namespaced: true,
  state: () => ({
    initialized: false,
    licenses: [],
    error: null,
    now: new Date(),
    status: {
      edition: "community",
      condition: "initial",
      isUltimate: false,
      isCommunity: true,
      isTrial: false,
    },
  }),
  getters: {
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
  },
  mutations: {
    set(state, licenses: TransportLicenseKey[]) {
      state.licenses = licenses
    },
    setInitialized(state, b: boolean) {
      state.initialized = b
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
      setInterval(() => context.dispatch('sync'), globals.licenseCheckInterval)
      context.commit('setInitialized', true)
    },
    async add(context, { email, key, trial }) {
      if (trial) {
        await Vue.prototype.$util.send('license/createTrialLicense')
      } else {
        await Vue.prototype.$util.send('license/add', { email, key })
      }
      // allow emitting expired license events next time
      SmartLocalStorage.setBool('expiredLicenseEventsEmitted', false)
      await context.dispatch('sync')
    },
    async update() {
      await Vue.prototype.$util.send('license/update')
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
