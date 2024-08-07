// "forked" from CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

import { Pos } from "codemirror";
import { testCompletions as test } from "./helpers";

const simpleTables = {
  users: ["name", "score", "birthDate"],
  xcountries: ["name", "population", "size"],
};

const schemaTables = {
  "schema.users": ["name", "score", "birthDate"],
  "schema.countries": ["name", "population", "size"],
};

const uppercaseSchemaTables = {
  "USERS": ["NAME", "SCORE", "BIRTHDATE"],
  "SCHEMA.USERS": ["NAME", "SCORE", "BIRTHDATE"],
  "SCHEMA.COUNTRIES": ["NAME", "POPULATION", "SIZE"],
};

const displayTextTables = [
  {
    text: "mytable",
    displayText: "mytable | The main table",
    columns: [
      { text: "id", displayText: "id | Unique ID" },
      { text: "name", displayText: "name | The name" },
    ],
  },
];

const displayTextTablesWithDefault = [
  {
    text: "Api__TokenAliases",
    columns: [
      {
        text: "token",
        displayText: "token | varchar(255) | Primary",
        columnName: "token",
        columnHint: "varchar(255) | Primary",
      },
      {
        text: "alias",
        displayText: "alias | varchar(255) | Primary",
        columnName: "alias",
        columnHint: "varchar(255) | Primary",
      },
    ],
  },
  {
    text: "mytable",
    columns: [
      { text: "id", displayText: "id | Unique ID" },
      { text: "name", displayText: "name | The name" },
    ],
  },
];

describe("CodeMirror completions", () => {
  test("keywords", {
    value: "SEL",
    cursor: Pos(0, 3),
    list: [{ text: "SELECT", className: "CodeMirror-hint-keyword" }],
    from: Pos(0, 0),
    to: Pos(0, 3),
  });

  test("keywords_disabled", {
    value: "SEL",
    cursor: Pos(0, 3),
    disableKeywords: true,
    list: [],
    from: Pos(0, 0),
    to: Pos(0, 3),
  });

  test("from", {
    value: "SELECT * fr",
    cursor: Pos(0, 11),
    list: [{ text: "FROM", className: "CodeMirror-hint-keyword" }],
    from: Pos(0, 9),
    to: Pos(0, 11),
  });

  test("table", {
    value: "SELECT xc",
    cursor: Pos(0, 9),
    tables: simpleTables,
    list: [{ text: "xcountries", className: "CodeMirror-hint-table" }],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  test("columns", {
    value: "SELECT users.",
    cursor: Pos(0, 13),
    tables: simpleTables,
    list: ["users.name", "users.score", "users.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 13),
  });

  test("dynamic columns", {
    value: "SELECT users.",
    cursor: Pos(0, 13),
    tables: { users: [] },
    getColumns: () => ["name", "score", "birthDate"],
    list: ["users.name", "users.score", "users.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 13),
  });

  test("singlecolumn", {
    value: "SELECT users.na",
    cursor: Pos(0, 15),
    tables: simpleTables,
    list: ["users.name"],
    from: Pos(0, 7),
    to: Pos(0, 15),
  });

  test("quoted", {
    value: "SELECT `users`.`na",
    cursor: Pos(0, 18),
    tables: simpleTables,
    list: ["`users`.`name`"],
    from: Pos(0, 7),
    to: Pos(0, 18),
  });

  test("doublequoted", {
    value: 'SELECT "users"."na',
    cursor: Pos(0, 18),
    tables: simpleTables,
    list: ['"users"."name"'],
    from: Pos(0, 7),
    to: Pos(0, 18),
    mode: "text/x-sqlite",
  });

  test("quotedcolumn", {
    value: "SELECT users.`na",
    cursor: Pos(0, 16),
    tables: simpleTables,
    list: ["`users`.`name`"],
    from: Pos(0, 7),
    to: Pos(0, 16),
  });

  test("doublequotedcolumn", {
    value: 'SELECT users."na',
    cursor: Pos(0, 16),
    tables: simpleTables,
    list: ['"users"."name"'],
    from: Pos(0, 7),
    to: Pos(0, 16),
    mode: "text/x-sqlite",
  });

  test("schema", {
    value: "SELECT schem",
    cursor: Pos(0, 12),
    tables: schemaTables,
    list: [
      { text: "schema.users", className: "CodeMirror-hint-table" },
      { text: "schema.countries", className: "CodeMirror-hint-table" },
      { text: "SCHEMA", className: "CodeMirror-hint-keyword" },
      { text: "SCHEMA_NAME", className: "CodeMirror-hint-keyword" },
      { text: "SCHEMAS", className: "CodeMirror-hint-keyword" },
    ],
    from: Pos(0, 7),
    to: Pos(0, 12),
  });

  test("schemaquoted", {
    value: "SELECT `sch",
    cursor: Pos(0, 11),
    tables: schemaTables,
    list: ["`schema`.`users`", "`schema`.`countries`"],
    from: Pos(0, 7),
    to: Pos(0, 11),
  });

  test("schemadoublequoted", {
    value: 'SELECT "sch',
    cursor: Pos(0, 11),
    tables: schemaTables,
    list: ['"schema"."users"', '"schema"."countries"'],
    from: Pos(0, 7),
    to: Pos(0, 11),
    mode: "text/x-sqlite",
  });

  test("schemacolumn", {
    value: "SELECT schema.users.",
    cursor: Pos(0, 20),
    tables: schemaTables,
    list: ["schema.users.name", "schema.users.score", "schema.users.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 20),
  });

  test("schemacolumnquoted", {
    value: "SELECT `schema`.`users`.",
    cursor: Pos(0, 24),
    tables: schemaTables,
    list: [
      "`schema`.`users`.`name`",
      "`schema`.`users`.`score`",
      "`schema`.`users`.`birthDate`",
    ],
    from: Pos(0, 7),
    to: Pos(0, 24),
  });

  test("schemacolumndoublequoted", {
    value: 'SELECT "schema"."users".',
    cursor: Pos(0, 24),
    tables: schemaTables,
    list: [
      '"schema"."users"."name"',
      '"schema"."users"."score"',
      '"schema"."users"."birthDate"',
    ],
    from: Pos(0, 7),
    to: Pos(0, 24),
    mode: "text/x-pgsql",
  });

  test("lowercase to uppercase schema", {
    value: "SELECT sch",
    cursor: Pos(0, 12),
    tables: uppercaseSchemaTables,
    list: [
      { text: "SCHEMA.USERS", className: "CodeMirror-hint-table" },
      { text: "SCHEMA.COUNTRIES", className: "CodeMirror-hint-table" },
      { text: "SCHEMA", className: "CodeMirror-hint-keyword" },
      { text: "SCHEMA_NAME", className: "CodeMirror-hint-keyword" },
      { text: "SCHEMAS", className: "CodeMirror-hint-keyword" },
      { text: "SCHEDULE", className: "CodeMirror-hint-keyword" },
    ],
    from: Pos(0, 7),
    to: Pos(0, 10),
  });

  test("lowercase to uppercase table", {
    value: "SELECT user",
    cursor: Pos(0, 12),
    tables: uppercaseSchemaTables,
    list: [
      { text: "USERS", className: "CodeMirror-hint-table" },
      { text: "USER", className: "CodeMirror-hint-keyword" },
      { text: "USER_RESOURCES", className: "CodeMirror-hint-keyword" },
      { text: "USER_STATISTICS", className: "CodeMirror-hint-keyword" },

    ],
    from: Pos(0, 7),
    to: Pos(0, 11),
  });

  test("displayText_default_table", {
    value: "SELECT a",
    cursor: Pos(0, 8),
    disableKeywords: true,
    defaultTable: "Api__TokenAliases",
    tables: displayTextTablesWithDefault,
    list: [
      {
        text: "alias",
        displayText: "alias | varchar(255) | Primary",
        columnName: "alias",
        columnHint: "varchar(255) | Primary",
        className: "CodeMirror-hint-table CodeMirror-hint-default-table",
      },
      { text: "Api__TokenAliases", className: "CodeMirror-hint-table" },
    ],
    from: Pos(0, 7),
    to: Pos(0, 8),
  });

  test("displayText_table", {
    value: "SELECT myt",
    cursor: Pos(0, 10),
    tables: displayTextTables,
    list: [
      {
        text: "mytable",
        displayText: "mytable | The main table",
        className: "CodeMirror-hint-table",
      },
    ],
    from: Pos(0, 7),
    to: Pos(0, 10),
  });

  test("displayText_column", {
    value: "SELECT mytable.",
    cursor: Pos(0, 15),
    tables: displayTextTables,
    list: [
      { text: "mytable.id", displayText: "id | Unique ID" },
      { text: "mytable.name", displayText: "name | The name" },
    ],
    from: Pos(0, 7),
    to: Pos(0, 15),
  });

  test("alias_complete", {
    value: "SELECT t. FROM users t",
    cursor: Pos(0, 9),
    tables: simpleTables,
    list: ["t.name", "t.score", "t.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  test("alias_complete_with_displayText", {
    value: "SELECT t. FROM mytable t",
    cursor: Pos(0, 9),
    tables: displayTextTables,
    list: [
      { text: "t.id", displayText: "id | Unique ID" },
      { text: "t.name", displayText: "name | The name" },
    ],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  test("complete alias from quoted tables (backtick)", {
    value: "SELECT t. FROM `users` t",
    cursor: Pos(0, 9),
    tables: simpleTables,
    list: ["t.name", "t.score", "t.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  test("complete alias from quoted tables (doublequoted)", {
    value: 'SELECT t. FROM "users" t',
    cursor: Pos(0, 9),
    tables: simpleTables,
    list: ["t.name", "t.score", "t.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  test("long query", {
    value: `
SELECT
  mt.*,
FROM
  (
    SELECT
      *
    FROM
      main_products
    ORDER BY
      id DESC
  ) AS mt
  LEFT JOIN alternate_products AS alt ON alt.product_id = mt.product_id
  LEFT JOIN product_data as pd ON pd.product_id = mt.product_id
  LEFT JOIN product_grouping AS pg ON pg.id = pd.group
  LEFT JOIN product_prices AS opp ON pp.product_id = mt.product_id
  AND (
    (
      pd.group = 0
      AND pp.reason != 5
    )
    OR (
      pd.group != 0
      AND 1 = 1
    )
  )
  AND NOT EXISTS (
    SELECT
      1
    FROM
      product_prices AS opp2
    WHERE
      opp2.product_id = pp.product_id
      AND opp2.id > pp.id
      AND (
        (
          pd.group = 0
          AND opp2.reason != 5
        )
        OR (
          pd.group != 0
          AND 1 = 1
        )
      )
  )
  LEFT JOIN product_inventory AS oi ON prin.product_id = mt.product_id
  AND prin.type IN (3, 5)
  LEFT JOIN product_prices AS ppTwo ON ppTwo. = mt.product_id
  AND ppTwo.reason = 5
  AND NOT EXISTS (
    SELECT
      1
    FROM
      product_prices AS ppTwoInner
    WHERE
      ppTwoInner.id > ppTwo.id
      AND ppTwoInner.product_id = ppTwo.product_id
      AND ppTwoInner.reason = 5
  )
WHERE
  mt.id IN (
    (
      SELECT
        MAX(id)
      FROM
        main_products
      WHERE
        product_id = mt.product_id
    )
  )
  AND alt.product_id IS NULL
  AND (
    pp.id IS NULL
    OR (
      pp.id IS NOT NULL
      AND mt.cost > 0
      AND mt.retail > 0
    )
  )
GROUP BY
  mt.product_id
`.trim(),
    cursor: Pos(46, 45),
    disableKeywords: true,
    tables: {
      product_prices: ["product_id", "price"],
    },
    list: ["ppTwo.product_id", "ppTwo.price"],
    from: Pos(46, 39),
    to: Pos(46, 45),
  });
});
