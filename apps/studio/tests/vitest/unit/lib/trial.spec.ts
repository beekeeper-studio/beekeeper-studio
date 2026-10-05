import { describe, it, expect, beforeEach } from 'vitest'
import {
  TRIAL_END_DECISION_KEY,
  TRIAL_END_FLOW_SEEN_KEY,
  formatTrialDate,
  settleLegacyTrialEnd,
  getTrialEndDecision,
  hasDecidedTrialEnd,
  recordTrialEndDecision,
  resetTrialFlow,
} from '@/lib/trial'
import { getPaidFeatureUsage, recordPaidFeatureUse } from '@/lib/paidFeatures'

describe('trial-ended decision', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('records the trial-ended decision', () => {
    expect(hasDecidedTrialEnd()).toBe(false)
    expect(getTrialEndDecision()).toBeNull()

    recordTrialEndDecision('downgraded')

    expect(getTrialEndDecision()).toBe('downgraded')
    expect(hasDecidedTrialEnd()).toBe(true)
  })

  it('ignores unknown decisions in storage, including the old "licensed" answer', () => {
    localStorage.setItem(TRIAL_END_DECISION_KEY, JSON.stringify('maybe'))
    expect(getTrialEndDecision()).toBeNull()
    expect(hasDecidedTrialEnd()).toBe(false)

    // whether the user is licensed is read from the license rows, never stored
    localStorage.setItem(TRIAL_END_DECISION_KEY, JSON.stringify('licensed'))
    expect(getTrialEndDecision()).toBeNull()
  })

  describe('legacy migration', () => {
    it('treats a trial that had already ended as downgraded, once', () => {
      settleLegacyTrialEnd(true)
      expect(getTrialEndDecision()).toBe('downgraded')
      expect(localStorage.getItem(TRIAL_END_FLOW_SEEN_KEY)).toBe('true')
    })

    it('leaves a running trial alone so the dialog shows when it ends', () => {
      settleLegacyTrialEnd(false)
      expect(getTrialEndDecision()).toBeNull()
      expect(localStorage.getItem(TRIAL_END_FLOW_SEEN_KEY)).toBe('true')

      // the next launch, after the trial lapsed: no longer a legacy user
      settleLegacyTrialEnd(true)
      expect(getTrialEndDecision()).toBeNull()
    })

    it('never overrides an answer the user already gave', () => {
      recordTrialEndDecision('downgraded')
      settleLegacyTrialEnd(false)
      expect(getTrialEndDecision()).toBe('downgraded')
    })
  })

  it('resets the decision and keeps usage unless told otherwise', () => {
    recordTrialEndDecision('downgraded')
    recordPaidFeatureUse('ai-shell')

    resetTrialFlow()
    expect(hasDecidedTrialEnd()).toBe(false)
    // the dev preview must not be swallowed by the legacy migration
    expect(localStorage.getItem(TRIAL_END_FLOW_SEEN_KEY)).toBe('true')
    expect(getPaidFeatureUsage()['ai-shell']).toBeDefined()

    resetTrialFlow({ keepUsage: false })
    expect(getPaidFeatureUsage()).toEqual({})
  })

  it('formats trial dates with the year spelled out', () => {
    expect(formatTrialDate(new Date(2026, 8, 4))).toContain('2026')
    expect(formatTrialDate('2026-09-04T12:00:00Z')).toContain('2026')
  })
})
