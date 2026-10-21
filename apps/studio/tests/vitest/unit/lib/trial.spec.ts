import { describe, it, expect, beforeEach } from 'vitest'
import {
  TRIAL_END_DECISION_KEY,
  LEGACY_TRIAL_END_CHECKED_KEY,
  adoptLegacyTrialEndDecision,
  formatTrialDate,
  hasDowngradedAfterTrial,
  recordTrialDowngrade,
  resetTrialFlow,
} from '@/lib/trial'
import { getPaidFeatureUsage, recordPaidFeatureUse } from '@/lib/paidFeatures'

// what App.vue sets once the one-shot expiry dialogs have been shown
const LEGACY_FLAG = 'expiredLicenseEventsEmitted'

describe('trial-ended decision', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('remembers a downgrade', () => {
    expect(hasDowngradedAfterTrial()).toBe(false)

    recordTrialDowngrade()

    expect(hasDowngradedAfterTrial()).toBe(true)
    expect(JSON.parse(localStorage.getItem(TRIAL_END_DECISION_KEY))).toBe('downgraded')
  })

  it('ignores anything else in storage: a license is not an answer that is kept', () => {
    localStorage.setItem(TRIAL_END_DECISION_KEY, JSON.stringify('licensed'))
    expect(hasDowngradedAfterTrial()).toBe(false)
  })

  it('resets the decision and keeps usage unless told otherwise', () => {
    recordTrialDowngrade()
    recordPaidFeatureUse('ai-shell')

    resetTrialFlow()
    expect(hasDowngradedAfterTrial()).toBe(false)
    expect(getPaidFeatureUsage()['ai-shell']).toBeDefined()

    resetTrialFlow({ keepUsage: false })
    expect(getPaidFeatureUsage()).toEqual({})
  })

  it('formats trial dates with the year spelled out', () => {
    expect(formatTrialDate(new Date(2026, 8, 4))).toContain('2026')
    expect(formatTrialDate('2026-09-04T12:00:00Z')).toContain('2026')
  })
})

describe('adoptLegacyTrialEndDecision', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('counts a trial end that an older version announced as a downgrade', () => {
    localStorage.setItem(LEGACY_FLAG, 'true')

    expect(adoptLegacyTrialEndDecision({ trialExpired: true, hasRealLicense: false })).toBe(true)
    expect(hasDowngradedAfterTrial()).toBe(true)
  })

  it('leaves a trial that lapsed unseen to the dialog', () => {
    expect(adoptLegacyTrialEndDecision({ trialExpired: true, hasRealLicense: false })).toBe(false)
    expect(hasDowngradedAfterTrial()).toBe(false)
  })

  it('does nothing while the trial is running or a paid license is registered', () => {
    localStorage.setItem(LEGACY_FLAG, 'true')

    expect(adoptLegacyTrialEndDecision({ trialExpired: false, hasRealLicense: false })).toBe(false)
    localStorage.removeItem(LEGACY_TRIAL_END_CHECKED_KEY)
    expect(adoptLegacyTrialEndDecision({ trialExpired: true, hasRealLicense: true })).toBe(false)
    expect(hasDowngradedAfterTrial()).toBe(false)
  })

  it('runs once: a flag set later, by a paid license expiring, is not a trial answer', () => {
    expect(adoptLegacyTrialEndDecision({ trialExpired: false, hasRealLicense: true })).toBe(false)
    expect(localStorage.getItem(LEGACY_TRIAL_END_CHECKED_KEY)).toBe('true')

    localStorage.setItem(LEGACY_FLAG, 'true')
    expect(adoptLegacyTrialEndDecision({ trialExpired: true, hasRealLicense: false })).toBe(false)
    expect(hasDowngradedAfterTrial()).toBe(false)
  })
})
