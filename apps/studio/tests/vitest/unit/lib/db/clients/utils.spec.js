import { describe, it, expect } from "vitest";
import { buildDatabaseFilter, buildSchemaFilter, buildSelectTopQuery, escapeString, groupForeignKeyRows, isAllowedReadOnlyQuery } from "@/lib/db/clients/utils";

describe('Escape String', () => {
  it("should escape single quotes", () => {
    const inputs = [
      ["foo'bar", "foo''bar"],
      ["foo'''bar", "foo''''''bar"],
      ["foo''bar", "foo''''bar"],
      [null, null],
      [undefined, null],
      ["", ""]
    ]

    inputs.forEach(([ input, expected]) => {
      expect(escapeString(input)).toStrictEqual(expected)
    })
  })
})

describe("buildSelectTopQuery", () => {
  it("should build correct top select query", () => {
    // table, offset, limit, orderBy, filters
    const testCases = [
      {
        params: ['table', 0, 10, [{ field: 'id', dir: 'asc' }], {}],
        result: {
          countQuery: 'select count(*) as total from `table`',
          query: 'select * from `table` order by `id` asc limit 10 offset 0',
          params: []
        }
      },
      {
        params: ['users', 10, 100, null, 'substr(name, 1, 4) = "john"'],
        result: {
          countQuery: 'select count(*) as total from `users` where substr(name, 1, 4) = "john"',
          query: 'select * from `users` where substr(name, 1, 4) = "john" limit 100 offset 10',
          params: []
        }
      },
      {
        params: ['info', 100, 10, null, [{ field: 'id', type: '>', value: '3'}]],
        result: {
          countQuery: 'select count(*) as total from `info` where `id` > ?',
          query: 'select * from `info` where `id` > ? limit 10 offset 100',
          params: ["3"]
        }
      },
      {
        params: ['info', 100, 10, null, [{ field: 'id', type: '>', value: '3'}, {field: 'id', type: '<', value: '9'}]],
        result: {
          countQuery: 'select count(*) as total from `info` where `id` > ? and `id` < ?',
          query: 'select * from `info` where `id` > ? and `id` < ? limit 10 offset 100',
          params: ["3", "9"]
        }
      },
      {
        params: ['info', 100, 10, null, [
          { field: 'id', type: '>', value: '3' },
          { op: 'AND', field: 'id', type: '<', value: '9' },
          { op: 'OR', field: 'name', type: 'like', value: 'john' },
        ]],
        result: {
          countQuery: 'select count(*) as total from `info` where `id` > ? and `id` < ? or `name` like ?',
          query: 'select * from `info` where `id` > ? and `id` < ? or `name` like ? limit 10 offset 100',
          params: ["3", "9", "john"]
        }
      },
    ]

    const trimQuery = query => {
      return query.trim().replace(/(\r\n|\n|\r)/g, "").replace(/ +/g,' ').toLowerCase()
    }

    testCases.forEach(testCase => {
      const expected = testCase.result
      const result = buildSelectTopQuery(...testCase.params)

      expect(result.params).toStrictEqual(expected.params)
      expect(trimQuery(result.countQuery)).toEqual(expected.countQuery)
      expect(trimQuery(result.query)).toEqual(expected.query)
    })
  })
})

describe('buildSchemaFilter SQL injection', () => {
  const identity = (s) => s

  it("should escape single quotes in schema name to prevent SQL injection", () => {
    const malicious = "'; DROP TABLE users; --"
    const result = buildSchemaFilter({ schema: malicious }, 'schema_name', identity)
    // The single quote must be doubled so the value stays inside the SQL string literal
    expect(result).toBe("schema_name = '''; DROP TABLE users; --'")
  })

  it("should escape single quotes in 'only' filter values", () => {
    const result = buildSchemaFilter({ only: ["public", "'; DROP TABLE users; --"] }, 'schema_name', identity)
    expect(result).toContain("'public'")
    expect(result).toContain("'''; DROP TABLE users; --'")
  })

  it("should escape single quotes in 'ignore' filter values", () => {
    const result = buildSchemaFilter({ ignore: ["'; DROP TABLE users; --"] }, 'schema_name', identity)
    expect(result).toContain("'''; DROP TABLE users; --'")
  })

  it("should wrap the schemaField identifier via the provided wrapIdentifier", () => {
    const wrap = (s) => `[${s}]`
    expect(buildSchemaFilter({ schema: 'dbo' }, 'table_schema', wrap)).toBe("[table_schema] = 'dbo'")
    expect(buildSchemaFilter({ only: ['a'] }, 'table_schema', wrap)).toBe("[table_schema] IN ('a')")
    expect(buildSchemaFilter({ ignore: ['a'] }, 'table_schema', wrap)).toBe("[table_schema] NOT IN ('a')")
  })

  it("should wrap each segment of a qualified (dotted) schemaField", () => {
    const wrap = (s) => `"${s}"`
    expect(buildSchemaFilter({ schema: 'public' }, 'r.routine_schema', wrap))
      .toBe(`"r"."routine_schema" = 'public'`)
  })

  it("should wrap a malicious schemaField segment safely via wrapIdentifier", () => {
    // Simulates SQL Server-style bracket quoting
    const wrap = (s) => `[${s.replace(/\]/g, ']]')}]`
    const result = buildSchemaFilter({ schema: 'dbo' }, "schema]; DROP TABLE x; --", wrap)
    expect(result).toBe("[schema]]; DROP TABLE x; --] = 'dbo'")
  })

  it("should default to ANSI SQL identifier quoting when wrapIdentifier is omitted", () => {
    // Ensures callers that forget to pass a dialect wrapper still emit a
    // quoted identifier instead of crashing. Every dialect currently calling
    // this helper (PG, SQL Server, Trino, DuckDB, SQL Anywhere) accepts
    // ANSI double-quoted identifiers.
    expect(buildSchemaFilter({ schema: 'public' }, 'table_schema'))
      .toBe(`"table_schema" = 'public'`)
    expect(buildSchemaFilter({ schema: 'public' }, 'r.routine_schema'))
      .toBe(`"r"."routine_schema" = 'public'`)
  })
})

describe('buildDatabaseFilter SQL injection', () => {
  const identity = (s) => s

  it("should escape single quotes in 'database' value to prevent SQL injection", () => {
    const malicious = "'; DROP TABLE users; --"
    const result = buildDatabaseFilter({ database: malicious }, 'datname', identity)
    // The single quote must be doubled so the value stays inside the SQL string literal
    expect(result).toBe("datname = '''; DROP TABLE users; --'")
  })

  it("should escape single quotes in 'only' filter values", () => {
    const result = buildDatabaseFilter({ only: ["public", "'; DROP TABLE users; --"] }, 'datname', identity)
    expect(result).toContain("'public'")
    expect(result).toContain("'''; DROP TABLE users; --'")
  })

  it("should escape single quotes in 'ignore' filter values", () => {
    const result = buildDatabaseFilter({ ignore: ["'; DROP TABLE users; --"] }, 'datname', identity)
    expect(result).toContain("'''; DROP TABLE users; --'")
  })

  it("should wrap the databaseField identifier via the provided wrapIdentifier", () => {
    const wrap = (s) => `[${s}]`
    expect(buildDatabaseFilter({ database: 'foo' }, 'name', wrap)).toBe("[name] = 'foo'")
    expect(buildDatabaseFilter({ only: ['a', 'b'] }, 'name', wrap)).toBe("[name] IN ('a','b')")
    expect(buildDatabaseFilter({ ignore: ['a'] }, 'name', wrap)).toBe("[name] NOT IN ('a')")
  })

  it("should wrap a malicious databaseField safely via wrapIdentifier", () => {
    // Simulates SQL Server-style bracket quoting
    const wrap = (s) => `[${s.replace(/\]/g, ']]')}]`
    const result = buildDatabaseFilter({ database: 'foo' }, "name]; DROP TABLE x; --", wrap)
    expect(result).toBe("[name]]; DROP TABLE x; --] = 'foo'")
  })

  it("should default to ANSI SQL identifier quoting when wrapIdentifier is omitted", () => {
    expect(buildDatabaseFilter({ database: 'db1' }, 'datname'))
      .toBe(`"datname" = 'db1'`)
  })
})

describe('isAllowedReadOnly', () => {
  it('Should return as a read only query', () => {
    const queries = [
      { executionType: 'LISTING' },
      { executionType: 'INFORMATION' },
      { executionType: 'LISTING' },
      { executionType: 'LISTING' }
    ]

    expect(isAllowedReadOnlyQuery(queries, true).toBeTrue)
    expect(isAllowedReadOnlyQuery(queries, false).toBeTrue)
    expect(isAllowedReadOnlyQuery(queries, false).toBeTrue)
  })

  it('Should not return as a read only query', () => {
    const queries = [
      { executionType: 'LISTING' },
      { executionType: 'LISTING' },
      { executionType: 'NOT A LISTING' }
    ]

    expect(isAllowedReadOnlyQuery(queries, true).toBeFalse)
  })
})

describe("groupForeignKeyRows", () => {
  function row(overrides = {}) {
    return {
      constraintName: "orders_customer_fk",
      fromSchema: "public",
      fromTable: "orders",
      fromColumn: "customer_id",
      toSchema: "public",
      toTable: "customers",
      toColumn: "id",
      ordinalPosition: 1,
      onUpdate: "NO ACTION",
      onDelete: "CASCADE",
      ...overrides,
    }
  }

  it("returns an empty list for no rows", () => {
    expect(groupForeignKeyRows([])).toEqual([])
  })

  it("maps a single-column key to string columns", () => {
    expect(groupForeignKeyRows([row()])).toEqual([
      {
        constraintName: "orders_customer_fk",
        fromSchema: "public",
        fromTable: "orders",
        fromColumn: "customer_id",
        toSchema: "public",
        toTable: "customers",
        toColumn: "id",
        onUpdate: "NO ACTION",
        onDelete: "CASCADE",
        isComposite: false,
      },
    ])
  })

  it("collapses the columns of one constraint into a composite key, paired by position", () => {
    const keys = groupForeignKeyRows([
      row({ constraintName: "child_fk", fromColumn: "ref_id2", toColumn: "parent_id2", ordinalPosition: 2 }),
      row({ constraintName: "child_fk", fromColumn: "ref_id1", toColumn: "parent_id1", ordinalPosition: 1 }),
    ])

    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatchObject({
      constraintName: "child_fk",
      isComposite: true,
      fromColumn: ["ref_id1", "ref_id2"],
      toColumn: ["parent_id1", "parent_id2"],
    })
  })

  it("keeps input order when rows carry no position", () => {
    const keys = groupForeignKeyRows([
      row({ fromColumn: "b", toColumn: "y", ordinalPosition: undefined }),
      row({ fromColumn: "a", toColumn: "x", ordinalPosition: undefined }),
    ])

    expect(keys[0]).toMatchObject({
      isComposite: true,
      fromColumn: ["b", "a"],
      toColumn: ["y", "x"],
    })
  })

  it("does not merge same-named constraints on different tables", () => {
    // PostgreSQL constraint names are only unique per table, and SQLite's
    // pragma ids restart at 0 for every table. Incoming keys from two tables
    // can therefore share a name and must stay separate.
    const keys = groupForeignKeyRows([
      row({ constraintName: "0", fromTable: "orders", fromColumn: "customer_id" }),
      row({ constraintName: "0", fromTable: "invoices", fromColumn: "billed_to" }),
    ])

    expect(keys).toHaveLength(2)
    expect(keys.map((k) => [k.fromTable, k.fromColumn, k.constraintName])).toEqual([
      ["orders", "customer_id", "0"],
      ["invoices", "billed_to", "0"],
    ])
    expect(keys.every((k) => !k.isComposite)).toBe(true)
  })

  it("does not merge one column that links to several tables", () => {
    const keys = groupForeignKeyRows([
      row({ constraintName: "orders_owner_fkey", fromColumn: "owner", toTable: "person", ordinalPosition: undefined }),
      row({ constraintName: "orders_owner_fkey", fromColumn: "owner", toTable: "company", ordinalPosition: undefined }),
    ])

    expect(keys.map((k) => k.toTable)).toEqual(["person", "company"])
    expect(keys.every((k) => k.toColumn === "id")).toBe(true)
    expect(keys.every((k) => k.isComposite === false)).toBe(true)
  })

  it("keeps constraints in order of first appearance", () => {
    const keys = groupForeignKeyRows([
      row({ constraintName: "zeta_fk", fromColumn: "z" }),
      row({ constraintName: "alpha_fk", fromColumn: "a" }),
    ])

    expect(keys.map((k) => k.constraintName)).toEqual(["zeta_fk", "alpha_fk"])
  })
})
