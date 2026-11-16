import { describe, it, expect, beforeEach } from 'vitest'
import {
  PAID_FEATURES,
  PAID_FEATURE_USAGE_KEY,
  clearPaidFeatureUsage,
  getPaidFeatureUsage,
  paidFeatureForPlugin,
  rankPaidFeaturesByUsage,
  recordConnectionFeatureUse,
  recordPaidFeatureUse,
  usesEnterpriseAuth,
} from '@/lib/paidFeatures'

describe('paid feature usage tracking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(getPaidFeatureUsage()).toEqual({})
  })

  it('records count, first and last use, and dedupes details', () => {
    const first = new Date('2026-09-01T10:00:00Z')
    const later = new Date('2026-09-03T10:00:00Z')

    recordPaidFeatureUse('premium-databases', 'Oracle', first)
    recordPaidFeatureUse('premium-databases', 'Oracle', later)
    recordPaidFeatureUse('premium-databases', 'MongoDB', later)

    const usage = getPaidFeatureUsage()['premium-databases']
    expect(usage.count).toBe(3)
    expect(usage.firstUsedAt).toBe(first.getTime())
    expect(usage.lastUsedAt).toBe(later.getTime())
    expect(usage.details).toEqual(['Oracle', 'MongoDB'])
  })

  it('caps the details list', () => {
    for (let i = 0; i < 12; i++) {
      recordPaidFeatureUse('premium-databases', `db-${i}`)
    }
    expect(getPaidFeatureUsage()['premium-databases'].details).toHaveLength(8)
  })

  it('treats corrupt storage as nothing used', () => {
    localStorage.setItem(PAID_FEATURE_USAGE_KEY, '[not json')
    expect(getPaidFeatureUsage()).toEqual({})
    expect(recordPaidFeatureUse('ai-shell')).toMatchObject({ count: 1 })
    expect(getPaidFeatureUsage()['ai-shell'].count).toBe(1)
  })

  it('clears everything', () => {
    recordPaidFeatureUse('ai-shell')
    clearPaidFeatureUsage()
    expect(getPaidFeatureUsage()).toEqual({})
  })
})

describe('rankPaidFeaturesByUsage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('puts used features first (most used, then most recent) and keeps catalogue order for the rest', () => {
    const earlier = new Date('2026-09-01T00:00:00Z')
    const later = new Date('2026-09-02T00:00:00Z')
    recordPaidFeatureUse('query-to-file', undefined, earlier)
    recordPaidFeatureUse('json-row-view', undefined, later)
    recordPaidFeatureUse('json-row-view', undefined, later)
    recordPaidFeatureUse('er-diagram', undefined, later)

    const ranked = rankPaidFeaturesByUsage()
    const usedIds = ['json-row-view', 'er-diagram', 'query-to-file']

    expect(ranked.slice(0, 3).map((f) => f.id)).toEqual(usedIds)
    expect(ranked.slice(0, 3).every((f) => f.usage !== null)).toBe(true)

    const rest = ranked.slice(3)
    expect(rest.every((f) => f.usage === null)).toBe(true)
    expect(rest.map((f) => f.id)).toEqual(
      PAID_FEATURES.map((f) => f.id).filter((id) => !usedIds.includes(id))
    )
  })

  it('returns the catalogue untouched when nothing was used', () => {
    expect(rankPaidFeaturesByUsage({}).map((f) => f.id)).toEqual(PAID_FEATURES.map((f) => f.id))
  })
})

describe('connection feature detection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('detects the paid auth schemes', () => {
    expect(usesEnterpriseAuth(null)).toBe(false)
    expect(usesEnterpriseAuth({ connectionType: 'postgresql' } as any)).toBe(false)
    expect(usesEnterpriseAuth({ iamAuthOptions: { iamAuthenticationEnabled: true } } as any)).toBe(true)
    expect(usesEnterpriseAuth({ azureAuthOptions: { azureAuthEnabled: true } } as any)).toBe(true)
    expect(usesEnterpriseAuth({ windowsAuthEnabled: true } as any)).toBe(true)
  })

  it('records a premium engine under its display name', () => {
    recordConnectionFeatureUse({ connectionType: 'mongodb' } as any)

    expect(getPaidFeatureUsage()['premium-databases']).toMatchObject({ count: 1, details: ['MongoDB'] })
    expect(getPaidFeatureUsage()['enterprise-auth']).toBeUndefined()
  })

  it('records enterprise auth on a free engine, and nothing for a plain connection', () => {
    recordConnectionFeatureUse({
      connectionType: 'postgresql',
      iamAuthOptions: { iamAuthenticationEnabled: true },
    } as any)
    expect(getPaidFeatureUsage()['enterprise-auth']).toMatchObject({ details: ['AWS IAM'] })
    expect(getPaidFeatureUsage()['premium-databases']).toBeUndefined()

    clearPaidFeatureUsage()
    recordConnectionFeatureUse({ connectionType: 'sqlite' } as any)
    expect(getPaidFeatureUsage()).toEqual({})
  })

  it('maps first-party plugin tabs to features', () => {
    expect(paidFeatureForPlugin('bks-ai-shell')).toBe('ai-shell')
    expect(paidFeatureForPlugin('bks-er-diagram')).toBe('er-diagram')
    expect(paidFeatureForPlugin('some-third-party')).toBeNull()
    expect(paidFeatureForPlugin(undefined)).toBeNull()
  })
})
