import {
  PAID_FEATURES,
  listUsedPaidFeatures,
  paidFeatureIdForName,
  parsePaidFeatureUsage,
  recordPaidFeatureUsage,
} from '@/lib/paidFeatures'

describe('paidFeatures', () => {
  describe('parsePaidFeatureUsage', () => {
    it('returns an empty map for nothing, blanks, and garbage', () => {
      expect(parsePaidFeatureUsage(undefined)).toEqual({})
      expect(parsePaidFeatureUsage(null)).toEqual({})
      expect(parsePaidFeatureUsage('')).toEqual({})
      expect(parsePaidFeatureUsage('   ')).toEqual({})
      expect(parsePaidFeatureUsage('not json')).toEqual({})
      expect(parsePaidFeatureUsage('[1,2]')).toEqual({})
      expect(parsePaidFeatureUsage(42)).toEqual({})
    })

    it('accepts a JSON string or an object', () => {
      const usage = { jsonViewer: { firstUsedAt: '2026-01-02T00:00:00.000Z' } }
      expect(parsePaidFeatureUsage(JSON.stringify(usage))).toEqual(usage)
      expect(parsePaidFeatureUsage(usage)).toEqual(usage)
    })

    it('drops unknown ids, malformed entries, and junk details', () => {
      const parsed = parsePaidFeatureUsage({
        jsonViewer: { firstUsedAt: '2026-01-02T00:00:00.000Z', details: ['', 3, ' Oracle '] },
        notAFeature: { firstUsedAt: '2026-01-02T00:00:00.000Z' },
        folders: { firstUsedAt: 'yesterday-ish' },
        aiShell: 'true',
      })
      expect(parsed).toEqual({
        jsonViewer: { firstUsedAt: '2026-01-02T00:00:00.000Z', details: [' Oracle '] },
      })
    })
  })

  describe('recordPaidFeatureUsage', () => {
    const now = new Date('2026-03-04T05:06:07.000Z')

    it('adds a first-use entry and reports a change', () => {
      const { usage, changed } = recordPaidFeatureUsage({}, 'importFromFile', undefined, now)
      expect(changed).toBe(true)
      expect(usage).toEqual({ importFromFile: { firstUsedAt: now.toISOString() } })
    })

    it('is a no-op for a feature already recorded', () => {
      const existing = { importFromFile: { firstUsedAt: '2026-01-01T00:00:00.000Z' } }
      const { usage, changed } = recordPaidFeatureUsage(existing, 'importFromFile', undefined, now)
      expect(changed).toBe(false)
      expect(usage).toBe(existing)
    })

    it('keeps the original first-use time when a new detail arrives', () => {
      const existing = { premiumDatabase: { firstUsedAt: '2026-01-01T00:00:00.000Z', details: ['Oracle'] } }
      const { usage, changed } = recordPaidFeatureUsage(existing, 'premiumDatabase', 'MongoDB', now)
      expect(changed).toBe(true)
      expect(usage.premiumDatabase).toEqual({
        firstUsedAt: '2026-01-01T00:00:00.000Z',
        details: ['Oracle', 'MongoDB'],
      })
      // the input is not mutated
      expect(existing.premiumDatabase.details).toEqual(['Oracle'])
    })

    it('ignores a detail it already knows about', () => {
      const existing = { premiumDatabase: { firstUsedAt: '2026-01-01T00:00:00.000Z', details: ['Oracle'] } }
      const { changed } = recordPaidFeatureUsage(existing, 'premiumDatabase', ' Oracle ', now)
      expect(changed).toBe(false)
    })
  })

  describe('listUsedPaidFeatures', () => {
    it('orders by first use and folds database names into the label', () => {
      const used = listUsedPaidFeatures({
        editableQueryResults: { firstUsedAt: '2026-01-03T00:00:00.000Z' },
        premiumDatabase: { firstUsedAt: '2026-01-01T00:00:00.000Z', details: ['Oracle', 'MongoDB', 'ClickHouse'] },
        jsonViewer: { firstUsedAt: '2026-01-02T00:00:00.000Z' },
      })
      expect(used.map((u) => u.id)).toEqual(['premiumDatabase', 'jsonViewer', 'editableQueryResults'])
      expect(used[0].displayLabel).toBe('Oracle, MongoDB, and ClickHouse connections')
      expect(used[1].displayLabel).toBe(PAID_FEATURES.jsonViewer.label)
    })

    it('uses singular wording for a single database', () => {
      const [used] = listUsedPaidFeatures({
        premiumDatabase: { firstUsedAt: '2026-01-01T00:00:00.000Z', details: ['DuckDB'] },
      })
      expect(used.displayLabel).toBe('DuckDB connection')
    })
  })

  describe('paidFeatureIdForName', () => {
    it('resolves the names the upgrade modal is opened with', () => {
      expect(paidFeatureIdForName('Import From File')).toBe('importFromFile')
      expect(paidFeatureIdForName('Editable Query Results')).toBe('editableQueryResults')
      expect(paidFeatureIdForName('Multi-table Export')).toBe('multiTableExport')
      expect(paidFeatureIdForName('Multi-Table Export')).toBe('multiTableExport')
      expect(paidFeatureIdForName('Advanced Filters')).toBe('advancedFilters')
      expect(paidFeatureIdForName('Cloud Workspaces')).toBe('cloudWorkspaces')
      expect(paidFeatureIdForName('Database Restore')).toBe('backupRestore')
      expect(paidFeatureIdForName('folders')).toBe('folders')
    })

    it('returns null for unknown or empty names', () => {
      expect(paidFeatureIdForName('Oracle')).toBeNull()
      expect(paidFeatureIdForName('')).toBeNull()
      expect(paidFeatureIdForName(null)).toBeNull()
    })
  })
})
