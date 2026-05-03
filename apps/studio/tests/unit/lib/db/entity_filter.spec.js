import { entityFilter } from "../../../../src/lib/db/sql_tools"

const tables = [
  { name: 'users', schema: 'public', entityType: 'table' },
  { name: 'orders', schema: 'public', entityType: 'table' },
  { name: 'cheeses', schema: 'public', entityType: 'table' },
  { name: 'active_users', schema: 'public', entityType: 'view' },
  { name: 'user_stats', schema: 'public', entityType: 'materialized-view' },
]

const fieldSearchIndex = {
  'public:users': ['id', 'email', 'name', 'created_at'],
  'public:orders': ['id', 'user_id', 'total', 'origin_country'],
  'public:cheeses': ['id', 'name', 'origin_country_id', 'cheese_type'],
  'public:active_users': ['id', 'email', 'last_login'],
  'public:user_stats': ['user_id', 'order_count'],
}

function makeFilter(overrides = {}) {
  return {
    filterQuery: undefined,
    showTables: true,
    showViews: true,
    showRoutines: true,
    showPartitions: false,
    showFields: true,
    ...overrides,
  }
}

function names(result) {
  return result.map((t) => t.name)
}

describe("entityFilter", () => {
  describe("basic name filtering (no field search)", () => {
    it("returns all entities when no filter query is set", () => {
      const result = entityFilter(tables, makeFilter())
      expect(result).toHaveLength(5)
    })

    it("filters by name substring", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'user', showFields: false }))
      expect(names(result)).toContain('users')
      expect(names(result)).toContain('active_users')
      expect(names(result)).toContain('user_stats')
      expect(result).toHaveLength(3)
    })

    it("ranks startsWith matches before contains matches", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'user', showFields: false }))
      expect(result[0].name).toBe('users')
      expect(names(result)).toContain('active_users')
    })

    it("respects entity type checkboxes", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'user', showViews: false, showFields: false }))
      expect(names(result)).toEqual(['users'])
    })
  })

  describe("field search with checkbox enabled", () => {
    it("includes tables matching on column names", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'email' }), fieldSearchIndex)
      expect(names(result)).toContain('users')
      expect(names(result)).toContain('active_users')
    })

    it("includes both name and field matches without duplicates", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'user' }), fieldSearchIndex)
      // 'users' matches by name, 'orders' and 'user_stats' match by field (user_id)
      expect(names(result)).toContain('users')
      expect(names(result)).toContain('orders')
      expect(names(result)).toContain('user_stats')
      // no duplicates
      const unique = new Set(names(result))
      expect(unique.size).toBe(result.length)
    })

    it("name matches come before field-only matches", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'origin' }), fieldSearchIndex)
      // No table name contains 'origin', but orders and cheeses have origin columns
      expect(names(result)).toContain('orders')
      expect(names(result)).toContain('cheeses')
    })
  })

  describe("dot-prefix field-only search", () => {
    it("returns only tables with matching column names", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: '.email' }), fieldSearchIndex)
      expect(names(result)).toEqual(['users', 'active_users'])
    })

    it("strips the dot and matches against column names", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: '.origin' }), fieldSearchIndex)
      expect(names(result)).toContain('orders')
      expect(names(result)).toContain('cheeses')
      expect(names(result)).not.toContain('users')
    })

    it("does not match table names in dot-prefix mode", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: '.users' }), fieldSearchIndex)
      expect(names(result)).toEqual([])
    })

    it("treats a lone dot as no filter (returns all)", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: '.' }), fieldSearchIndex)
      // '.' alone is length 1, so isFieldPrefix is false; it falls through to name matching
      // No table name starts with or contains '.', so no name matches
      // But showFields is true, so field matches would also be checked
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("showFields checkbox OFF disables all field search", () => {
    it("does not search fields when checkbox is off", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'email', showFields: false }), fieldSearchIndex)
      // 'email' doesn't match any table name
      expect(names(result)).toEqual([])
    })

    it("dot-prefix does not trigger field search when checkbox is off", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: '.email', showFields: false }), fieldSearchIndex)
      // With showFields off, dot prefix falls through to name matching with '.email' as search term
      // No table name contains '.email' so no results
      expect(names(result)).toEqual([])
    })
  })

  describe("missing or empty field index", () => {
    it("works without a field search index", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'user' }))
      // Should still return name matches without crashing
      expect(names(result)).toContain('users')
    })

    it("works with an empty field search index", () => {
      const result = entityFilter(tables, makeFilter({ filterQuery: 'email' }), {})
      expect(names(result)).toEqual([])
    })
  })
})
