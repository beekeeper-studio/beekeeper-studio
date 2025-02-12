import { splitQueries, removeQueryQuotes, extractParams, isTextSelected } from "../../../../src/lib/db/sql_tools";

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

const unquoteTestCases = {
  "SELECT * FROM foo;": `SELECT * FROM foo;`,
  "\"SELECT * FROM foo;\"": `SELECT * FROM foo;`,
  "\"this is not a query\"": `"this is not a query"`,
  "'this is not a query'": `'this is not a query'`,
  "`this is not a query`": '`this is not a query`',
  "\"select foo, bar from baz where bar like '%;';\"": `select foo, bar from baz where bar like '%;';`,
  "'select foo, bar from baz where bar like '%;';'": `select foo, bar from baz where bar like '%;';`,
  "`select foo, bar from baz where bar like '%;';`": `select foo, bar from baz where bar like '%;';`,
  "\n\n\"SELECT * FROM foo;\"": `SELECT * FROM foo;`,
  "\n\n'SELECT * FROM foo;'": `SELECT * FROM foo;`,
  "\n\n`SELECT * FROM foo;`": `SELECT * FROM foo;`,
  "\"SELECT * FROM foo;\"\n\n\n     ": `SELECT * FROM foo;`,
  "'SELECT * FROM foo;'\n\n\n     ": `SELECT * FROM foo;`,
  "`SELECT * FROM foo;`\n\n\n     ": `SELECT * FROM foo;`,
  "\n\n\n\n\"SELECT * FROM bar;\"\n\n\n\n    ": `SELECT * FROM bar;`,
  "\n\n\n\n'SELECT * FROM bar;'\n\n\n\n    ": `SELECT * FROM bar;`,
  "\n\n\n\n`SELECT * FROM bar;`\n\n\n\n    ": `SELECT * FROM bar;`,
}

describe("Query Unquoter", () => {
  it("should unquote queries that are quoted, and leave the others", () => {
    Object.keys(unquoteTestCases).forEach(possibleQuery => {
      const expected = unquoteTestCases[possibleQuery];
      const result = removeQueryQuotes(possibleQuery, "generic");
      expect(result).toBe(expected);
    })
  })
})

describe("Text Selection", () => {
  function check({query, cursor}) {
    const [queryStart, queryEnd] = query;
    const [cursorStart, cursorEnd] = cursor;
    return expect(isTextSelected(queryStart, queryEnd, cursorStart, cursorEnd))
  }

  it("should check if text is selected", () => {
    check({
      query: [0, 120],
      cursor: [0, 120],
    }).toBe(true);

    check({
      query: [0, 120],
      cursor: [120, 0],
    }).toBe(true);

    check({
      query: [10, 120],
      cursor: [0, 120],
    }).toBe(true);

    check({
      query: [10, 120],
      cursor: [120, 0],
    }).toBe(true);

    check({
      query: [10, 110],
      cursor: [0, 120],
    }).toBe(true);

    check({
      query: [-10, 110],
      cursor: [0, 120],
    }).toBe(true);

    check({
      query: [-10, 110],
      cursor: [120, 0],
    }).toBe(true);

    check({
      query: [-10, 130],
      cursor: [0, 120],
    }).toBe(true);

    check({
      query: [10, 130],
      cursor: [0, 120],
    }).toBe(true);

    check({
      query: [130, 200],
      cursor: [0, 120],
    }).toBe(false);

    check({
      query: [0, 120],
      cursor: [130, 200],
    }).toBe(false);

    check({
      query: [10, 120],
      cursor: [0, 10],
    }).toBe(false);
  });
});
