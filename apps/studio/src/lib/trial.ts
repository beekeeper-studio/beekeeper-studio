import { SmartLocalStorage } from '@/common/LocalStorage'
import { clearPaidFeatureUsage } from '@/lib/paidFeatures'

/**
 * Local state behind the trial-ended dialog.
 *
 * The dialog cannot be dismissed; it comes back on every launch until the
 * user either downgrades to the Community Edition or registers a license.
 * Only the downgrade needs remembering: a registered license shows in the
 * license status, which is then no longer an expired trial, and removing
 * the license brings the dialog back.
 */

/** Holds 'downgraded' once the user has chosen the Community Edition. */
export const TRIAL_END_DECISION_KEY = 'trialEndDecision'

/**
 * Set by App.vue once the one-shot expiry dialogs have been shown. Versions
 * before the trial-ended dialog set it for an expired trial as well, which is
 * what adoptLegacyTrialEndDecision reads.
 */
const EXPIRY_EVENTS_EMITTED_KEY = 'expiredLicenseEventsEmitted'

/** Set once adoptLegacyTrialEndDecision has run, so it runs only once. */
export const LEGACY_TRIAL_END_CHECKED_KEY = 'trialEndLegacyChecked'

export function hasDowngradedAfterTrial(): boolean {
  return SmartLocalStorage.getJSON(TRIAL_END_DECISION_KEY, null) === 'downgraded'
}

export function recordTrialDowngrade(): void {
  SmartLocalStorage.addItem(TRIAL_END_DECISION_KEY, 'downgraded')
}

/**
 * Forget the trial-ended answer so the dialog runs again: when a license is
 * registered or removed, and from the dev "switch license state" menu.
 * Feature usage is kept by default so a switch to "trial expired" previews
 * the dialog with real usage in it.
 */
export function resetTrialFlow({ keepUsage = true }: { keepUsage?: boolean } = {}): void {
  SmartLocalStorage.removeItem(TRIAL_END_DECISION_KEY)
  if (!keepUsage) clearPaidFeatureUsage()
}

/**
 * Before the trial-ended dialog existed, the end of a trial was announced by
 * a dialog that could simply be closed, and `expiredLicenseEventsEmitted` was
 * set so it would not come back. Anyone upgrading with that flag set, an
 * expired trial and no paid license has therefore been using the Community
 * Edition knowingly since then: record the downgrade for them instead of
 * asking again.
 *
 * Runs once per install, on the first launch with the new dialog, so a flag
 * set later (App.vue still sets it when a paid license expires) is never
 * read as an answer to the trial. Returns true when a downgrade was recorded.
 */
export function adoptLegacyTrialEndDecision({
  trialExpired,
  hasRealLicense,
}: {
  trialExpired: boolean
  hasRealLicense: boolean
}): boolean {
  if (SmartLocalStorage.getBool(LEGACY_TRIAL_END_CHECKED_KEY, false)) return false
  SmartLocalStorage.setBool(LEGACY_TRIAL_END_CHECKED_KEY, true)
  if (!trialExpired || hasRealLicense || hasDowngradedAfterTrial()) return false
  if (!SmartLocalStorage.getBool(EXPIRY_EVENTS_EMITTED_KEY, false)) return false
  recordTrialDowngrade()
  return true
}

/** "September 4, 2026" in the user's locale. */
export function formatTrialDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
