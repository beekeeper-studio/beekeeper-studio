import { splitQueries, removeQueryQuotes, extractParams, isTextSelected, deparameterizeQuery, convertParamsForReplacement } from "../../../../src/lib/db/sql_tools";

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

describe("convertParamsForReplacement", () => {
  // Two calling conventions:
  //   - Record (preferred): TabQueryEditor passes queryParameterValues keyed by placeholder
  //   - Array (legacy): test helpers (db.ts) pass a parallel array of values

  it("should handle positional params", () => {
    const result = convertParamsForReplacement(['?', '?'], ["'Alice'", '25']);
    expect(result).toEqual(["'Alice'", '25']);
  });

  it("should build a named params object from a record, stripping the prefix", () => {
    const result = convertParamsForReplacement([':name', ':age'], { ':name': "'Alice'", ':age': '25' });
    expect(result).toEqual({ name: "'Alice'", age: '25' });
  });

  it("should handle a legacy parallel array for named params", () => {
    // db.ts passes placeholders and values as parallel arrays for named params
    const result = convertParamsForReplacement([':first', ':second', ':third'], ['5', "'Neo'", '0']);
    expect(result).toEqual({ first: '5', second: "'Neo'", third: '0' });
  });

  it("should produce correct params when the same placeholder appears multiple times (name,age,name,age,name)", () => {
    // Record-based: lookup is by key, duplicates in placeholders are ignored
    const placeholders = [':name', ':age', ':name', ':age', ':name'];
    const queryParamValues = { ':name': "'Alice'", ':age': '25' };
    const result = convertParamsForReplacement(placeholders, queryParamValues);
    expect(result).toEqual({ name: "'Alice'", age: '25' });
  });

  it("should not overwrite a named param when the same placeholder appears multiple times (legacy array)", () => {
    // Array-based: dedup ensures index i maps to the i-th unique placeholder
    const result = convertParamsForReplacement([':name', ':name', ':age'], ["'Alice'", '25']);
    expect(result).toEqual({ name: "'Alice'", age: '25' });
  });

  it("should substitute a repeated named parameter correctly end-to-end", () => {
    const query = "SELECT * FROM users WHERE first_name = :name OR last_name = :name";
    const paramTypes = { named: [':'], positional: false, numbered: [], quoted: [] };
    const params = convertParamsForReplacement([':name', ':name'], { ':name': "'Alice'" });
    const result = deparameterizeQuery(query, 'sqlite', params, paramTypes);
    expect(result).not.toContain(':name');
    expect(result).toContain("'Alice'");
  });
});

describe("SQL Formatter", () => {
  it("should correctly format Postgres earthdistance operator <@>", () => {
    const originalQuery = "SELECT point(0, 0)<@>point(0,0);";
    const formatted = deparameterizeQuery(originalQuery, "postgresql", [], {});

    expect(formatted).toContain("<@>");
    expect(() => splitQueries(formatted, "psql")).not.toThrow();
  });

  it("should preserve the functionality of earthdistance operator after formatting", () => {
    const testQueries = [
      "SELECT point(0, 0)<@>point(0,0);",
      "SELECT point(1, 1) <@> point(2, 2);",
      "SELECT earth_distance(ll_to_earth(0, 0), ll_to_earth(0, 0));",
    ];

    testQueries.forEach(query => {
      const formatted = deparameterizeQuery(query, "postgresql", [], {});

      const hasOperator = formatted.includes("<@>") || formatted.includes("earth_distance");
      expect(hasOperator).toBe(true);

      expect(() => splitQueries(formatted, "psql")).not.toThrow();
    });
  });
});
