import { buildSchemaFilter, buildSelectTopQuery, buildInsertQuery, escapeString, isAllowedReadOnlyQuery } from "../../../../../src/lib/db/clients/utils";
import knexLib from 'knex';

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
  it("should escape single quotes in schema name to prevent SQL injection", () => {
    const malicious = "'; DROP TABLE users; --"
    const result = buildSchemaFilter({ schema: malicious })
    // The single quote must be doubled so the value stays inside the SQL string literal
    // Safe:   schema_name = '''; DROP TABLE users; --'  (the '' is an escaped quote inside the literal)
    // Unsafe: schema_name = ''; DROP TABLE users; --'   (the ' closes the literal, rest is executable)
    // Result: schema_name = '''; DROP TABLE users; --'
    // In SQL: opening ', then '' (escaped quote), then rest of string, closing '
    // The whole value is treated as one string literal — safe.
    expect(result).toBe("schema_name = '''; DROP TABLE users; --'")
  })

  it("should escape single quotes in 'only' filter values", () => {
    const result = buildSchemaFilter({ only: ["public", "'; DROP TABLE users; --"] })
    expect(result).toContain("'public'")
    expect(result).toContain("'''; DROP TABLE users; --'")
  })

  it("should escape single quotes in 'ignore' filter values", () => {
    const result = buildSchemaFilter({ ignore: ["'; DROP TABLE users; --"] })
    expect(result).toContain("'''; DROP TABLE users; --'")
  })
})

describe('buildInsertQuery', () => {
  const knex = knexLib({ client: 'better-sqlite3', connection: { filename: ':memory:' } });

  afterAll(() => knex.destroy());

  it('should not alter regular scalar values', () => {
    const insert = {
      table: 'test_table',
      schema: null,
      data: [{ id: 1, name: 'hello', score: 42 }],
    };
    const query = buildInsertQuery(knex, insert);
    expect(query).toContain("'hello'");
    expect(query).toContain('42');
  });

  it('should preserve null values as-is', () => {
    const insert = {
      table: 'test_table',
      schema: null,
      data: [{ id: 1, metadata: null }],
    };
    const query = buildInsertQuery(knex, insert);
    expect(query.toLowerCase()).toContain('null');
    expect(query).not.toContain("'null'");
  });

  it('should produce valid SQL when data is pre-stringified JSON', () => {
    // getInsertQuery stringifies JSON before calling buildInsertQuery,
    // so buildInsertQuery receives strings, not raw objects/arrays.
    const insert = {
      table: 'test_table',
      schema: null,
      data: [{ id: 1, metadata: '[1,2,3]', config: '{"key":"value"}' }],
    };
    const query = buildInsertQuery(knex, insert);
    expect(query).toContain("'[1,2,3]'");
    expect(query).toContain("'{\"key\":\"value\"}'");
    const valueMatches = query.match(/\bvalues\b/gi);
    expect(valueMatches).toHaveLength(1);
  });
});

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
