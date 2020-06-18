import { splitQueries, extractParams, parseConnectionUrl } from "../../../../src/lib/db/sql_tools";

const testCases = {
  "select* from foo; select * from bar": 2,
  "select *; bananas": 2,
  "select * from foo;\n select * from bar": 2,
  "select ';;;;' as yes from [grapes]": 1,
  "select foo, bar, from table where bar like '%;';\n INSERT INTO table(foo, bar) VALUES(a,'b;')": 2,
  "select; select; select;": 3,
  "a;b;c;d;e;f;g": 7,
  "INSERT INTO\n table_name\n VALUES\n (value1,'value which contains semicolon ;;;;', value3); select * from foo": 2
}

describe("Query Splitter", () => {
  it("should split SQL into the correct number of parts", () => {
    Object.keys(testCases).forEach(query => {
      const expected = testCases[query]
      const result = splitQueries(query)
      expect(result.length).toBe(expected)
    });
  })

  it("should not add a semi-colon to the end of the last query", () => {
    const expected = " select * from bar"
    const result = splitQueries(Object.keys(testCases)[0])
    expect(result[1]).toBe(expected)
  })
})

describe("extractParams", () => {
  it("should extract params", () => {
    const testCases = {
      ":foo": [":foo"],
      "$1, $2": ["$1", "$2"],
      "select * from :bar": [":bar"],
      "select * from :bananas where :bananas": [":bananas"]
    }

    Object.keys(testCases).forEach(query => {
      const expected = testCases[query]
      expect(extractParams(query)).toStrictEqual(expected)
    })
  })
})

describe('parseConnectionUrl', () => {
  it("should parse a url", () => {
    const url = "postgres://a:b@foo:123/bar"
    const result = parseConnectionUrl(url)
    const expected = {
      connectionType: 'postgresql',
      host: 'foo',
      port: 123,
      defaultDatabase: 'bar',
      username: 'a',
      password: 'b',
      ssl: false
    }
    expect(result).toStrictEqual(expected)
  })

  it('should parse another valid URL', () => {
    const url = 'postgres://user:password@server:123/default'
    const expected = {
      connectionType: 'postgresql',
      host: 'server',
      port: 123,
      defaultDatabase: 'default',
      username: 'user',
      password: 'password',
      ssl: false
    }
    const result = parseConnectionUrl(url)
    console.log(result)
    expect(result).toStrictEqual(expected)
  })
})