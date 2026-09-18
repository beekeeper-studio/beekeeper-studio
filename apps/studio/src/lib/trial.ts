import { SmartLocalStorage } from '@/common/LocalStorage'
import { clearPaidFeatureUsage } from '@/lib/paidFeatures'

/**
 * Local flags that drive the free-trial dialogs.
 *
 * - The welcome dialog shows once, right after a trial is auto-started on the
 *   first launch.
 * - The trial-ended dialog cannot be dismissed; it keeps coming back on every
 *   launch until the user either downgrades or registers a license.
 */

/** Set when a trial is auto-started; cleared once the welcome dialog is seen. */
export const TRIAL_WELCOME_PENDING_KEY = 'trialWelcomePending'
/** The answer to the trial-ended dialog: 'downgraded' or 'licensed'. */
export const TRIAL_END_DECISION_KEY = 'trialEndDecision'

export type TrialEndDecision = 'downgraded' | 'licensed'

export function markTrialWelcomePending(): void {
  SmartLocalStorage.setBool(TRIAL_WELCOME_PENDING_KEY, true)
}

export function isTrialWelcomePending(): boolean {
  return SmartLocalStorage.getBool(TRIAL_WELCOME_PENDING_KEY, false)
}

export function clearTrialWelcomePending(): void {
  SmartLocalStorage.removeItem(TRIAL_WELCOME_PENDING_KEY)
}

export function getTrialEndDecision(): TrialEndDecision | null {
  const value = SmartLocalStorage.getJSON(TRIAL_END_DECISION_KEY, null)
  return value === 'downgraded' || value === 'licensed' ? value : null
}

export function recordTrialEndDecision(decision: TrialEndDecision): void {
  SmartLocalStorage.addItem(TRIAL_END_DECISION_KEY, decision)
}

export function hasDecidedTrialEnd(): boolean {
  return getTrialEndDecision() !== null
}

/**
 * Forget the trial-flow answers so the dialogs run again. Used by the dev
 * "switch license state" menu. Feature usage is kept by default so a
 * switch to "trial expired" previews the dialog with real usage in it.
 */
export function resetTrialFlow({ keepUsage = true }: { keepUsage?: boolean } = {}): void {
  clearTrialWelcomePending()
  SmartLocalStorage.removeItem(TRIAL_END_DECISION_KEY)
  if (!keepUsage) clearPaidFeatureUsage()
}

/** "September 4, 2026" in the user's locale. */
export function formatTrialDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
