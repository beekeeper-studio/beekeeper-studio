import { splitQueries, extractParams } from "../../../../src/lib/db/sql_tools";

const testCases = {
  "select* from foo; select * from bar": 2,
  "select *; bananas": 2,
  "select * from foo;\n select * from bar": 2,
  "select ';;;;' as yes from [grapes]": 1,
  "select foo, bar, from table where bar like '%;';\n INSERT INTO table(foo, bar) VALUES(a,'b;')": 2,
  "select; select; select;": 3,
  "a;b;c;d;e;f;g": 7,
  "INSERT INTO\n table_name\n VALUES\n (value1,'value which contains semicolon ;;;;', value3); select * from foo": 2,
  "select * from wp_usermeta where meta_key='test' and meta_value <> ''; show processlist; select count(*) from wp_usermeta; show processlist;": 4
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
    const expected = "select * from bar"
    const result = splitQueries(Object.keys(testCases)[0])
    expect(result[1].text).toBe(expected)
  })
})


