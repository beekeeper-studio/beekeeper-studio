import { removeQueryQuotes } from "../../lib/utils/sql";

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

