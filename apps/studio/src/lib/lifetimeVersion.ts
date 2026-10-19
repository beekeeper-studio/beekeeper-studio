import { SmartLocalStorage } from '@/common/LocalStorage'

/**
 * Local state behind the lifetime-version dialog, shown when a paid license
 * on lifetime terms stops short of the running app version. The license is
 * still valid, just not for this build, which the app runs as the Community
 * Edition.
 */

/** Holds the id (see lifetimeVersionNoticeId) of the notice the user acknowledged. */
export const LIFETIME_VERSION_NOTICE_KEY = 'lifetimeVersionNoticeAcknowledged'

export const RELEASES_URL = 'https://github.com/beekeeper-studio/beekeeper-studio/releases'

interface LicenseLike {
  key?: string | null
  maxAllowedAppRelease?: { tagName?: string | null } | null
}

/**
 * One notice per license key and coverage boundary. A new key is a new
 * notice, and so is a moved boundary (a newer maxAllowedAppRelease) on the
 * same key, while app updates inside the same boundary are not.
 */
export function lifetimeVersionNoticeId(license: LicenseLike | null | undefined): string | null {
  if (!license) return null
  return `${license.key ?? ''}@${license.maxAllowedAppRelease?.tagName ?? ''}`
}

export function getAcknowledgedLifetimeVersionNotice(): string | null {
  const value = SmartLocalStorage.getJSON(LIFETIME_VERSION_NOTICE_KEY, null)
  return typeof value === 'string' ? value : null
}

export function acknowledgeLifetimeVersionNotice(id: string): void {
  SmartLocalStorage.addItem(LIFETIME_VERSION_NOTICE_KEY, id)
}

/** Forget the acknowledgement so the dialog runs again (dev "switch license state" menu). */
export function clearLifetimeVersionNotice(): void {
  SmartLocalStorage.removeItem(LIFETIME_VERSION_NOTICE_KEY)
}

/** The download page of the last release the license covers, eg v5.2.3. */
export function coveredReleaseUrl(tagName: string | null | undefined): string {
  return tagName ? `${RELEASES_URL}/tag/${encodeURIComponent(tagName)}` : RELEASES_URL
}
