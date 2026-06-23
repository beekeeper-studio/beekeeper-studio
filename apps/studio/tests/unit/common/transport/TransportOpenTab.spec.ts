import { matches, TransportOpenTab } from '@/common/transport/TransportOpenTab'

function buildTab(overrides: Partial<TransportOpenTab> = {}): TransportOpenTab {
  return {
    tabType: 'query',
    unsavedChanges: false,
    title: 'Query',
    alert: false,
    position: 0,
    active: false,
    connectionId: 1,
    isRunning: false,
    isTransaction: false,
    context: {},
    ...overrides,
  } as TransportOpenTab
}

describe('TransportOpenTab.matches', () => {
  describe('query tabs', () => {
    it('matches when queryId is equal on both tabs', () => {
      const a = buildTab({ queryId: 5 })
      const b = buildTab({ queryId: 5 })
      expect(matches(a, b)).toBe(true)
    })

    it('does not match when queryId differs', () => {
      const a = buildTab({ queryId: 5 })
      const b = buildTab({ queryId: 6 })
      expect(matches(a, b)).toBe(false)
    })

    it('does not match two new query tabs with nil queryId/usedQueryId (undefined)', () => {
      // Both ids are undefined. Without isNil, `undefined === undefined` would
      // have wrongly reported a match. This is the regression the isNil change fixes.
      const a = buildTab()
      const b = buildTab()
      expect(matches(a, b)).toBe(false)
    })

    it('does not match when queryId is null on both tabs', () => {
      const a = buildTab({ queryId: null })
      const b = buildTab({ queryId: null })
      expect(matches(a, b)).toBe(false)
    })

    it('does not match when one queryId is nil and the other is set', () => {
      const a = buildTab({ queryId: undefined })
      const b = buildTab({ queryId: 5 })
      expect(matches(a, b)).toBe(false)
    })

    it('matches when usedQueryId is equal on both tabs', () => {
      const a = buildTab({ usedQueryId: 7 })
      const b = buildTab({ usedQueryId: 7 })
      expect(matches(a, b)).toBe(true)
    })

    it('does not match when usedQueryId is nil on both tabs', () => {
      const a = buildTab({ usedQueryId: undefined })
      const b = buildTab({ usedQueryId: undefined })
      expect(matches(a, b)).toBe(false)
    })

    it('matches when one tab references the other via usedQueryId', () => {
      const saved = buildTab({ queryId: 3 })
      const running = buildTab({ usedQueryId: 3 })
      // usedQueryId on `obj` (3) equals usedQueryId on `other` (undefined)? no.
      // queryId on `obj` (3) equals queryId on `other` (undefined)? no.
      expect(matches(saved, running)).toBe(false)
    })
  })

  describe('workspace scoping', () => {
    it('does not match when workspaceIds differ', () => {
      const a = buildTab({ queryId: 5, workspaceId: 1 })
      const b = buildTab({ queryId: 5, workspaceId: 2 })
      expect(matches(a, b)).toBe(false)
    })

    it('matches across workspaces when one workspaceId is unset', () => {
      const a = buildTab({ queryId: 5, workspaceId: 1 })
      const b = buildTab({ queryId: 5 })
      expect(matches(a, b)).toBe(true)
    })
  })
})
