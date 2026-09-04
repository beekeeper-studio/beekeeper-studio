/**
 * "Draft manager approval request": most Beekeeper users at a company can't
 * put a card down without sign-off, so the app hands them a ready-to-send
 * request instead of a pricing page.
 *
 * The request itself is generated on the website, which reads prices from
 * the site's pricing data. The app only describes the user's situation in
 * the URL (features used, when the trial ended) and never carries a price.
 */

export const WEBSITE_URL = 'https://www.beekeeperstudio.io'
export const PRICING_URL = `${WEBSITE_URL}/pricing`
export const APPROVAL_REQUEST_URL = `${WEBSITE_URL}/approval-request/`
export const LIFETIME_DOCS_URL = 'https://docs.beekeeperstudio.io/purchasing/purchasing-a-license/#lifetime-access'

/** Longest list of feature labels worth putting in a URL. */
const MAX_FEATURES = 12

export interface ApprovalRequestOptions {
  /** Display labels of the paid features used while licensed, oldest first. */
  usedFeatures?: string[]
  /** When the trial ends or ended, if one was started. */
  trialEndsAt?: Date | null
}

/** `YYYY-MM-DD` in local time, the day the user would say the trial ended. */
function localDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The website page pre-filled with this install's situation. Labels travel
 * as-is (pipe separated) so the page needs no copy of the feature registry.
 */
export function approvalRequestUrl(options: ApprovalRequestOptions = {}): string {
  const url = new URL(APPROVAL_REQUEST_URL)
  const features = (options.usedFeatures ?? [])
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && !f.includes('|'))
    .slice(0, MAX_FEATURES)
  if (features.length) {
    url.searchParams.set('features', features.join('|'))
  }
  const trialEnd = options.trialEndsAt
  if (trialEnd instanceof Date && !Number.isNaN(trialEnd.getTime())) {
    url.searchParams.set('trial_end', localDateParam(trialEnd))
  }
  url.searchParams.set('ref', 'bks-app')
  return url.toString()
}
