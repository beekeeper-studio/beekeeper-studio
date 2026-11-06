import { removeQueryQuotes, splitRedisCommands } from "../../lib/utils/sql";

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

describe("splitRedisCommands", () => {
  it("returns one command per line, skipping blank and comment lines", () => {
    const text = "# users\r\n\r\n  GET user:1:name  \r\nGET user:2:name\n\n";

    const commands = splitRedisCommands(text);

    expect(commands.map((c) => c.text)).toEqual([
      "GET user:1:name",
      "GET user:2:name",
    ]);
    for (const command of commands) {
      expect(text.slice(command.start, command.end + 1)).toBe(command.text);
    }
  })

  it("returns nothing for an empty script", () => {
    expect(splitRedisCommands("  \n# only a comment\n")).toEqual([]);
  })
})

