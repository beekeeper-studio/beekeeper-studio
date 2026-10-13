import { SmartLocalStorage } from '@/common/LocalStorage'
import { clearPaidFeatureUsage } from '@/lib/paidFeatures'

/**
 * Local state behind the trial-ended dialog.
 *
 * The dialog cannot be dismissed; it comes back on every launch until the
 * user either downgrades to the Community Edition or registers a license.
 * This is where that answer is remembered.
 */

/** The answer to the trial-ended dialog: 'downgraded' or 'licensed'. */
export const TRIAL_END_DECISION_KEY = 'trialEndDecision'

export type TrialEndDecision = 'downgraded' | 'licensed'

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
 * Forget the trial-ended answer so the dialog runs again. Used by the dev
 * "switch license state" menu. Feature usage is kept by default so a switch
 * to "trial expired" previews the dialog with real usage in it.
 */
export function resetTrialFlow({ keepUsage = true }: { keepUsage?: boolean } = {}): void {
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
