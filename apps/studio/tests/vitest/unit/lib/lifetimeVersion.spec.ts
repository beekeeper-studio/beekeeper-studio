import { describe, it, expect, beforeEach } from 'vitest'
import {
  LIFETIME_VERSION_NOTICE_KEY,
  RELEASES_URL,
  acknowledgeLifetimeVersionNotice,
  clearLifetimeVersionNotice,
  coveredReleaseUrl,
  getAcknowledgedLifetimeVersionNotice,
  lifetimeVersionNoticeId,
} from '@/lib/lifetimeVersion'

describe('lifetime-version notice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('identifies a notice by license key and coverage boundary', () => {
    expect(lifetimeVersionNoticeId({ key: 'abc', maxAllowedAppRelease: { tagName: 'v5.2.3' } })).toBe('abc@v5.2.3')
    // a moved boundary on the same key is a new notice
    expect(lifetimeVersionNoticeId({ key: 'abc', maxAllowedAppRelease: { tagName: 'v6.0.0' } })).toBe('abc@v6.0.0')
    expect(lifetimeVersionNoticeId({ key: 'abc', maxAllowedAppRelease: null })).toBe('abc@')
    expect(lifetimeVersionNoticeId(null)).toBeNull()
    expect(lifetimeVersionNoticeId(undefined)).toBeNull()
  })

  it('remembers one acknowledgement at a time', () => {
    expect(getAcknowledgedLifetimeVersionNotice()).toBeNull()

    acknowledgeLifetimeVersionNotice('abc@v5.2.3')
    expect(getAcknowledgedLifetimeVersionNotice()).toBe('abc@v5.2.3')
    expect(JSON.parse(localStorage.getItem(LIFETIME_VERSION_NOTICE_KEY))).toBe('abc@v5.2.3')

    clearLifetimeVersionNotice()
    expect(getAcknowledgedLifetimeVersionNotice()).toBeNull()
  })

  it('ignores a non-string value in storage', () => {
    localStorage.setItem(LIFETIME_VERSION_NOTICE_KEY, JSON.stringify({ nope: true }))
    expect(getAcknowledgedLifetimeVersionNotice()).toBeNull()
  })

  it('links to the covered release, or the releases page without a tag', () => {
    expect(coveredReleaseUrl('v5.2.3')).toBe(`${RELEASES_URL}/tag/v5.2.3`)
    expect(coveredReleaseUrl(null)).toBe(RELEASES_URL)
    expect(coveredReleaseUrl('')).toBe(RELEASES_URL)
  })
})
