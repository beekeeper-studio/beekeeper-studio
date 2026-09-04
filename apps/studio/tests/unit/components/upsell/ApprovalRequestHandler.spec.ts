import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import ApprovalRequestHandler from '@/components/upsell/ApprovalRequestHandler.vue'
import { AppEvent } from '@/common/AppEvent'
import { listUsedPaidFeatures } from '@/lib/paidFeatures'

const localVue = createLocalVue()
localVue.use(Vuex)

function mountHandler(options: { usage?: any; trialEnd?: Date | null }) {
  const openLink = jest.fn()
  let bindings: any[] = []
  const store = new Vuex.Store({
    modules: {
      paidFeatureUsage: {
        namespaced: true,
        getters: { usedFeatures: () => listUsedPaidFeatures(options.usage ?? {}) },
      },
      licenses: {
        namespaced: true,
        getters: {
          trialLicense: () => (options.trialEnd ? { licenseType: 'TrialLicense', validUntil: options.trialEnd } : null),
        },
      },
    },
  })
  shallowMount(ApprovalRequestHandler, {
    localVue,
    store,
    mocks: {
      $native: { openLink },
      registerHandlers: (b: any[]) => { bindings = b },
      unregisterHandlers: jest.fn(),
    },
  })
  const fire = (event: string) => bindings.filter((b) => b.event === event).forEach((b) => b.handler())
  return { openLink, fire }
}

describe('ApprovalRequestHandler', () => {
  it('opens the website page with the trial date and features used', () => {
    const { openLink, fire } = mountHandler({
      usage: {
        jsonViewer: { firstUsedAt: '2026-01-01T00:00:00.000Z' },
        premiumDatabase: { firstUsedAt: '2026-01-02T00:00:00.000Z', details: ['Oracle'] },
      },
      trialEnd: new Date(2026, 8, 3, 12),
    })
    fire(AppEvent.purchaseRequest)

    expect(openLink).toHaveBeenCalledTimes(1)
    const url = new URL(openLink.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://www.beekeeperstudio.io/approval-request/')
    expect(url.searchParams.get('features')).toBe('JSON row viewer|Oracle connection')
    expect(url.searchParams.get('trial_end')).toBe('2026-09-03')
  })

  it('opens the bare page when nothing is known yet', () => {
    const { openLink, fire } = mountHandler({})
    fire(AppEvent.purchaseRequest)
    const url = new URL(openLink.mock.calls[0][0])
    expect(url.searchParams.has('features')).toBe(false)
    expect(url.searchParams.has('trial_end')).toBe(false)
  })
})
