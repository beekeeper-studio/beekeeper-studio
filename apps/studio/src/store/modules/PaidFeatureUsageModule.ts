import { Module } from 'vuex'
import rawLog from '@bksLogger'
import { State as RootState } from '../index'
import {
  PaidFeatureId,
  PaidFeatureUsage,
  UsedPaidFeature,
  listUsedPaidFeatures,
  parsePaidFeatureUsage,
  recordPaidFeatureUsage,
} from '@/lib/paidFeatures'

const log = rawLog.scope('PaidFeatureUsageModule')

/** User setting the usage map is persisted under, as a JSON string. */
export const PAID_FEATURE_USAGE_SETTING = 'paidFeatureUsage'

interface State {
  /** Keeps `record` from writing the same entry twice while a save is in flight. */
  pending: PaidFeatureUsage | null
}

export type RecordPayload = PaidFeatureId | { id: PaidFeatureId; detail?: string }

/**
 * Local, never-transmitted record of which paid features this install has
 * used while it had a license (trial or paid). Read back after the trial to
 * describe the user's own experience rather than a generic feature list.
 */
export const PaidFeatureUsageModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pending: null,
  }),
  getters: {
    usage(state, _getters, _rootState, rootGetters): PaidFeatureUsage {
      if (state.pending) return state.pending
      const setting = rootGetters['settings/settings']?.[PAID_FEATURE_USAGE_SETTING]
      return parsePaidFeatureUsage(setting?.value)
    },
    usedFeatures(_state, getters): UsedPaidFeature[] {
      return listUsedPaidFeatures(getters.usage)
    },
    hasUsedFeatures(_state, getters): boolean {
      return getters.usedFeatures.length > 0
    },
  },
  mutations: {
    setPending(state, usage: PaidFeatureUsage | null) {
      state.pending = usage
    },
  },
  actions: {
    /**
     * Note that a paid feature was just used. No-op unless the current
     * license actually allows the feature, so gated call sites can record
     * unconditionally after their own license check.
     */
    async record(context, payload: RecordPayload) {
      if (!context.rootGetters['licenses/isUltimate']) return

      const { id, detail } = typeof payload === 'string' ? { id: payload, detail: undefined } : payload
      const { usage, changed } = recordPaidFeatureUsage(context.getters.usage, id, detail)
      if (!changed) return

      context.commit('setPending', usage)
      try {
        await context.dispatch(
          'settings/save',
          { key: PAID_FEATURE_USAGE_SETTING, value: JSON.stringify(usage) },
          { root: true }
        )
      } catch (error) {
        log.error('Unable to save paid feature usage', error)
      } finally {
        context.commit('setPending', null)
      }
    },
  },
}
