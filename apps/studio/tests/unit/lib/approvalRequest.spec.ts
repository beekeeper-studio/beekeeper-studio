import { APPROVAL_REQUEST_URL, approvalRequestUrl } from '@/lib/approvalRequest'

function params(url: string) {
  return new URL(url).searchParams
}

describe('approvalRequestUrl', () => {
  it('points at the website page and tags the referrer', () => {
    const url = approvalRequestUrl()
    expect(url.startsWith(APPROVAL_REQUEST_URL)).toBe(true)
    expect(params(url).get('ref')).toBe('bks-app')
    expect(params(url).has('features')).toBe(false)
    expect(params(url).has('trial_end')).toBe(false)
  })

  it('carries the feature labels pipe-separated, so the page needs no registry', () => {
    const url = approvalRequestUrl({
      usedFeatures: ['JSON row viewer', 'Editable query results', 'Oracle and MongoDB connections'],
    })
    expect(params(url).get('features')).toBe('JSON row viewer|Editable query results|Oracle and MongoDB connections')
  })

  it('drops blank labels, labels containing the separator, and caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Feature ${i}`)
    const url = approvalRequestUrl({ usedFeatures: ['  ', 'a|b', ...many] })
    expect(params(url).get('features').split('|')).toHaveLength(12)
    expect(params(url).get('features')).not.toContain('a|b')
  })

  it('sends the trial end as a local calendar date', () => {
    const url = approvalRequestUrl({ trialEndsAt: new Date(2026, 8, 3, 23, 30) })
    expect(params(url).get('trial_end')).toBe('2026-09-03')
  })

  it('ignores a missing or invalid trial date', () => {
    expect(params(approvalRequestUrl({ trialEndsAt: null })).has('trial_end')).toBe(false)
    expect(params(approvalRequestUrl({ trialEndsAt: new Date('nope') })).has('trial_end')).toBe(false)
  })

  it('never carries a price', () => {
    const url = approvalRequestUrl({ usedFeatures: ['JSON row viewer'], trialEndsAt: new Date() })
    expect(url).not.toMatch(/\$|price|plan=|seats=/)
  })
})
