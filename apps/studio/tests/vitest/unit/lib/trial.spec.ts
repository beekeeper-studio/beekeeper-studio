import { describe, it, expect, beforeEach } from 'vitest'
import {
  TRIAL_END_DECISION_KEY,
  clearTrialWelcomePending,
  formatTrialDate,
  getTrialEndDecision,
  hasDecidedTrialEnd,
  isTrialWelcomePending,
  markTrialWelcomePending,
  recordTrialEndDecision,
  resetTrialFlow,
} from '@/lib/trial'
import { getPaidFeatureUsage, recordPaidFeatureUse } from '@/lib/paidFeatures'

describe('trial flow flags', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('tracks whether the welcome dialog is still owed', () => {
    expect(isTrialWelcomePending()).toBe(false)
    markTrialWelcomePending()
    expect(isTrialWelcomePending()).toBe(true)
    clearTrialWelcomePending()
    expect(isTrialWelcomePending()).toBe(false)
  })

  it('records the trial-ended decision', () => {
    expect(hasDecidedTrialEnd()).toBe(false)
    expect(getTrialEndDecision()).toBeNull()

    recordTrialEndDecision('downgraded')

    expect(getTrialEndDecision()).toBe('downgraded')
    expect(hasDecidedTrialEnd()).toBe(true)
  })

  it('ignores unknown decisions in storage', () => {
    localStorage.setItem(TRIAL_END_DECISION_KEY, JSON.stringify('maybe'))
    expect(getTrialEndDecision()).toBeNull()
    expect(hasDecidedTrialEnd()).toBe(false)
  })

  it('resets the flags and keeps usage unless told otherwise', () => {
    markTrialWelcomePending()
    recordTrialEndDecision('licensed')
    recordPaidFeatureUse('ai-shell')

    resetTrialFlow()
    expect(isTrialWelcomePending()).toBe(false)
    expect(hasDecidedTrialEnd()).toBe(false)
    expect(getPaidFeatureUsage()['ai-shell']).toBeDefined()

    resetTrialFlow({ keepUsage: false })
    expect(getPaidFeatureUsage()).toEqual({})
  })

  it('formats trial dates with the year spelled out', () => {
    expect(formatTrialDate(new Date(2026, 8, 4))).toContain('2026')
    expect(formatTrialDate('2026-09-04T12:00:00Z')).toContain('2026')
  })
})
