import Vuex from 'vuex'
import Vue from 'vue'
import { PaidFeatureUsageModule, PAID_FEATURE_USAGE_SETTING } from '@/store/modules/PaidFeatureUsageModule'

Vue.use(Vuex)

function buildStore(options: { isUltimate: boolean; stored?: string }) {
  const saves: any[] = []
  const settings: Record<string, any> = {}
  if (options.stored !== undefined) {
    settings[PAID_FEATURE_USAGE_SETTING] = { key: PAID_FEATURE_USAGE_SETTING, value: options.stored }
  }
  const store = new Vuex.Store({
    modules: {
      licenses: {
        namespaced: true,
        getters: { isUltimate: () => options.isUltimate },
      },
      settings: {
        namespaced: true,
        state: { settings },
        getters: { settings: (state: any) => state.settings },
        actions: {
          save(context, payload) {
            saves.push(payload)
            // mimic the real module: the saved setting shows up in state
            Vue.set(context.state.settings, payload.key, { key: payload.key, value: payload.value })
          },
        },
      },
      paidFeatureUsage: PaidFeatureUsageModule,
    },
  })
  return { store, saves }
}

describe('PaidFeatureUsageModule', () => {
  it('records nothing for a community user', async () => {
    const { store, saves } = buildStore({ isUltimate: false })
    await store.dispatch('paidFeatureUsage/record', 'jsonViewer')
    expect(saves).toHaveLength(0)
    expect(store.getters['paidFeatureUsage/usedFeatures']).toEqual([])
  })

  it('persists the first use of a feature as JSON in the settings table', async () => {
    const { store, saves } = buildStore({ isUltimate: true })
    await store.dispatch('paidFeatureUsage/record', 'jsonViewer')

    expect(saves).toHaveLength(1)
    expect(saves[0].key).toBe(PAID_FEATURE_USAGE_SETTING)
    const stored = JSON.parse(saves[0].value)
    expect(Object.keys(stored)).toEqual(['jsonViewer'])
    expect(new Date(stored.jsonViewer.firstUsedAt).getTime()).not.toBeNaN()

    const used = store.getters['paidFeatureUsage/usedFeatures']
    expect(used.map((u: any) => u.id)).toEqual(['jsonViewer'])
    expect(store.getters['paidFeatureUsage/hasUsedFeatures']).toBe(true)
  })

  it('does not write again for a feature it already knows', async () => {
    const stored = JSON.stringify({ jsonViewer: { firstUsedAt: '2026-01-01T00:00:00.000Z' } })
    const { store, saves } = buildStore({ isUltimate: true, stored })
    await store.dispatch('paidFeatureUsage/record', 'jsonViewer')
    expect(saves).toHaveLength(0)
  })

  it('accumulates details, such as the databases connected to', async () => {
    const { store, saves } = buildStore({ isUltimate: true })
    await store.dispatch('paidFeatureUsage/record', { id: 'premiumDatabase', detail: 'Oracle' })
    await store.dispatch('paidFeatureUsage/record', { id: 'premiumDatabase', detail: 'MongoDB' })
    await store.dispatch('paidFeatureUsage/record', { id: 'premiumDatabase', detail: 'Oracle' })

    expect(saves).toHaveLength(2)
    const [used] = store.getters['paidFeatureUsage/usedFeatures']
    expect(used.details).toEqual(['Oracle', 'MongoDB'])
    expect(used.displayLabel).toBe('Oracle and MongoDB connections')
  })

  it('reads usage back after the license lapses', () => {
    const stored = JSON.stringify({
      editableQueryResults: { firstUsedAt: '2026-01-02T00:00:00.000Z' },
      importFromFile: { firstUsedAt: '2026-01-01T00:00:00.000Z' },
    })
    const { store } = buildStore({ isUltimate: false, stored })
    const used = store.getters['paidFeatureUsage/usedFeatures']
    expect(used.map((u: any) => u.id)).toEqual(['importFromFile', 'editableQueryResults'])
  })
})
