import { buildSelectTopQuery, escapeString } from "../../../../../src/lib/db/clients/utils.js";

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
      }
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