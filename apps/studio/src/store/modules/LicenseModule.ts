
import _ from 'lodash'
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { Module } from "vuex";

import { State as RootState } from '../index'
import { upsert } from './data/StoreHelpers';
import { CloudError } from '@/lib/cloud/ClientHelpers';
import { CloudClient } from '@/lib/cloud/CloudClient';
import platformInfo from '@/common/platform_info';

interface State {
  licenses: LicenseKey[],
  loading: boolean
  error: CloudError | Error | null
}



export const LicenseModule: Module<State, RootState>  = {
  namespaced: true,
  state: () => ({
    licenses: [],
    loading: false,
    error: null
  }),
  getters: {
    newestLicense(state) {
      return _.orderBy(state.licenses, ['validUntil'], ['desc'])[0] || new LicenseKey()
    },
    realLicenses(state) {
      return state.licenses.filter((l) => l.licenseType !== 'TrialLicense')
    }
  },

  mutations: {
    set(state, licenses: LicenseKey[]) {
      state.licenses = licenses
    },
    add(state, license: LicenseKey) {
      upsert(state.licenses, license, (a, b) => a.key === b.key && a.email === b.email)
    },

    remove(state, licenses: LicenseKey[]) {
      state.licenses = _.without(state.licenses, ...licenses)
    }
  },
  actions: {
    async init(context) {
      const licenses = await LicenseKey.find()
      context.commit('set', licenses)
      context.dispatch('updateAll')
    },

    async add(context, { email, key }) {

      const result = await CloudClient.getLicense(platformInfo.cloudUrl, email, key)
      // if we got here, license is good.
      const license = new LicenseKey()
      license.key = key
      license.email = email
      license.validUntil = new Date(result.validUntil)
      license.supportUntil = new Date(result.supportUntil)
      license.licenseType = result.licenseType
      const others = context.getters.realLicenses
      await license.save()
      await LicenseKey.remove(others)
      context.commit('add', license)
      context.commit('remove', others)
    },

    async update(_context, license: LicenseKey) {
      try {
        const data = await CloudClient.getLicense(platformInfo.cloudUrl, license.email, license.key)
        license.validUntil = new Date(data.validUntil)
        license.supportUntil = new Date(data.supportUntil)
        await license.save()
      } catch (error) {
        if (error instanceof CloudError) {
          // eg 403, 404, license not valid
          license.validUntil = new Date()
          license.save()
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
    }
  }
}
