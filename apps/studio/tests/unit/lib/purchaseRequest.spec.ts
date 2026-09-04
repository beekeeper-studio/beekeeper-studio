import {
  PLANS,
  PRICING_URL,
  QUOTE_URL,
  buildPurchaseRequest,
  planById,
  recommendedPlan,
  requestSubject,
} from '@/lib/purchaseRequest'

const professional = planById('professional')

describe('purchaseRequest', () => {
  describe('planById', () => {
    it('falls back to the professional plan', () => {
      expect(planById('nope').id).toBe('professional')
      expect(planById(null).id).toBe('professional')
      expect(planById('indie').id).toBe('indie')
    })
  })

  describe('recommendedPlan', () => {
    it('recommends professional for a typical team', () => {
      expect(recommendedPlan(1).id).toBe('professional')
      expect(recommendedPlan(10).id).toBe('professional')
    })

    it('moves up to business once the seat cap is exceeded', () => {
      expect(recommendedPlan(11).id).toBe('business')
      expect(recommendedPlan(500).id).toBe('business')
    })
  })

  describe('requestSubject', () => {
    it('pluralises seats', () => {
      expect(requestSubject(professional, 1)).toBe('Software license request: Beekeeper Studio (Professional, 1 seat)')
      expect(requestSubject(professional, 4)).toBe('Software license request: Beekeeper Studio (Professional, 4 seats)')
    })
  })

  describe('buildPurchaseRequest', () => {
    it('states the yearly price, the total, and links to live pricing and quotes', () => {
      const text = buildPurchaseRequest({ plan: professional, seats: 5 })
      expect(text).toContain('Subject: Software license request: Beekeeper Studio (Professional, 5 seats)')
      expect(text).toContain('$14 per user per month billed yearly ($168 per user per year)')
      expect(text).toContain('$28 per user per month billed monthly')
      expect(text).toContain('5 seats: $840 per year.')
      expect(text).toContain(PRICING_URL)
      expect(text).toContain(QUOTE_URL)
      expect(text).toContain('lifetime license')
    })

    it('lists the features used during the trial when known', () => {
      const text = buildPurchaseRequest({
        plan: professional,
        seats: 1,
        usedFeatures: ['JSON row viewer', 'Editable query results', 'Import from file'],
      })
      expect(text).toContain('The features I relied on: JSON row viewer, Editable query results, and Import from file.')
      expect(text).not.toContain('The free version covers basic querying')
    })

    it('mentions the trial without a feature list when nothing was recorded', () => {
      const text = buildPurchaseRequest({ plan: professional, seats: 1, trialed: true })
      expect(text).toContain('I trialed the paid version for 14 days and want to keep using it.')
    })

    it('describes the paid features generically when there was no trial', () => {
      const text = buildPurchaseRequest({ plan: professional, seats: 1 })
      expect(text).toContain('The free version covers basic querying.')
    })

    it('treats bad seat counts as one seat', () => {
      expect(buildPurchaseRequest({ plan: professional, seats: 0 })).toContain('1 seat: $168 per year.')
      expect(buildPurchaseRequest({ plan: professional, seats: NaN })).toContain('1 seat: $168 per year.')
      expect(buildPurchaseRequest({ plan: professional, seats: 2.7 })).toContain('2 seats: $336 per year.')
    })

    it('has no marketing voice', () => {
      for (const plan of PLANS) {
        const text = buildPurchaseRequest({ plan, seats: 3 })
        expect(text).not.toMatch(/\bwe'll\b|\bwe found\b|amazing|awesome|!/i)
      }
    })
  })
})
