import { SmartLocalStorage } from '@/common/LocalStorage'
import { clearPaidFeatureUsage } from '@/lib/paidFeatures'

/**
 * Local state behind the trial-ended dialog.
 *
 * The dialog cannot be dismissed; it comes back on every launch until the
 * user either downgrades to the Community Edition or registers a license.
 * Only the downgrade is remembered here: whether the user is licensed is a
 * property of the license rows and is read from the store, so removing a key
 * later brings the question back instead of silently dropping to Community.
 */

/** The answer to the trial-ended dialog. Only a downgrade is ever stored. */
export const TRIAL_END_DECISION_KEY = 'trialEndDecision'

/**
 * Set on the first launch of a build that has the trial-ended dialog. A trial
 * that had already ended by then counts as answered, so users who were on the
 * Community Edition before the dialog existed are not asked.
 */
export const TRIAL_END_FLOW_SEEN_KEY = 'trialEndFlowSeen'

export type TrialEndDecision = 'downgraded'

export function getTrialEndDecision(): TrialEndDecision | null {
  const value = SmartLocalStorage.getJSON(TRIAL_END_DECISION_KEY, null)
  return value === 'downgraded' ? value : null
}

export function recordTrialEndDecision(decision: TrialEndDecision): void {
  SmartLocalStorage.addItem(TRIAL_END_DECISION_KEY, decision)
}

export function hasDecidedTrialEnd(): boolean {
  return getTrialEndDecision() !== null
}

/**
 * One-time migration, run once licenses are known and before the dialog
 * decides whether to open. Trials that end after this has run get the dialog;
 * a trial that had already ended is treated as downgraded without a prompt.
 */
export function settleLegacyTrialEnd(isTrialExpired: boolean): void {
  if (SmartLocalStorage.getBool(TRIAL_END_FLOW_SEEN_KEY)) return
  if (isTrialExpired && !hasDecidedTrialEnd()) recordTrialEndDecision('downgraded')
  SmartLocalStorage.setBool(TRIAL_END_FLOW_SEEN_KEY, true)
}

/**
 * Forget the trial-ended answer so the dialog runs again. Used by the dev
 * "switch license state" menu. The flow is marked as seen so the legacy
 * migration does not swallow the preview; feature usage is kept by default so
 * a switch to "trial expired" previews the dialog with real usage in it.
 */
export function resetTrialFlow({ keepUsage = true }: { keepUsage?: boolean } = {}): void {
  SmartLocalStorage.removeItem(TRIAL_END_DECISION_KEY)
  SmartLocalStorage.setBool(TRIAL_END_FLOW_SEEN_KEY, true)
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
