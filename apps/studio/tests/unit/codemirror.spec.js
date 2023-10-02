// "forked" from CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

import CodeMirror from "codemirror";
import "@/vendor/sql-hint/index";

const simpleTables = {
  users: ["name", "score", "birthDate"],
  xcountries: ["name", "population", "size"],
};

const schemaTables = {
  "schema.users": ["name", "score", "birthDate"],
  "schema.countries": ["name", "population", "size"],
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

const Pos = CodeMirror.Pos;

function _testCompletions(it, name, spec) {
  it(name, async () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    const cm = CodeMirror.fromTextArea(textarea, {
      mode: spec.mode || "text/x-mysql",
      value: spec.value,
    });
    cm.setValue(spec.value);
    cm.setCursor(spec.cursor);
    const completions = await CodeMirror.hint.sql(cm, {
      tables: spec.tables,
      defaultTable: spec.defaultTable,
      disableKeywords: spec.disableKeywords,
    });
    expect(spec.list.sort()).toEqual(completions.list.sort());
    expect(spec.from).toEqual(completions.from);
    expect(spec.to).toEqual(completions.to);
    document.body.removeChild(textarea);
  });
}

/** @type jest.It */
const testCompletions = _testCompletions.bind(null, test);
testCompletions.only = _testCompletions.bind(null, test.only);
testCompletions.skip = _testCompletions.bind(null, test.skip);

describe("codemirror", () => {
  testCompletions("keywords", {
    value: "SEL",
    cursor: Pos(0, 3),
    list: [{ text: "SELECT", className: "CodeMirror-hint-keyword" }],
    from: Pos(0, 0),
    to: Pos(0, 3),
  });

  testCompletions("keywords_disabled", {
    value: "SEL",
    cursor: Pos(0, 3),
    disableKeywords: true,
    list: [],
    from: Pos(0, 0),
    to: Pos(0, 3),
  });

  testCompletions("from", {
    value: "SELECT * fr",
    cursor: Pos(0, 11),
    list: [{ text: "FROM", className: "CodeMirror-hint-keyword" }],
    from: Pos(0, 9),
    to: Pos(0, 11),
  });

  testCompletions("table", {
    value: "SELECT xc",
    cursor: Pos(0, 9),
    tables: simpleTables,
    list: [{ text: "xcountries", className: "CodeMirror-hint-table" }],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  testCompletions("columns", {
    value: "SELECT users.",
    cursor: Pos(0, 13),
    tables: simpleTables,
    list: ["users.name", "users.score", "users.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 13),
  });

  testCompletions("singlecolumn", {
    value: "SELECT users.na",
    cursor: Pos(0, 15),
    tables: simpleTables,
    list: ["users.name"],
    from: Pos(0, 7),
    to: Pos(0, 15),
  });

  testCompletions("quoted", {
    value: "SELECT `users`.`na",
    cursor: Pos(0, 18),
    tables: simpleTables,
    list: ["`users`.`name`"],
    from: Pos(0, 7),
    to: Pos(0, 18),
  });

  testCompletions("doublequoted", {
    value: 'SELECT "users"."na',
    cursor: Pos(0, 18),
    tables: simpleTables,
    list: ['"users"."name"'],
    from: Pos(0, 7),
    to: Pos(0, 18),
    mode: "text/x-sqlite",
  });

  testCompletions("quotedcolumn", {
    value: "SELECT users.`na",
    cursor: Pos(0, 16),
    tables: simpleTables,
    list: ["`users`.`name`"],
    from: Pos(0, 7),
    to: Pos(0, 16),
  });

  testCompletions("doublequotedcolumn", {
    value: 'SELECT users."na',
    cursor: Pos(0, 16),
    tables: simpleTables,
    list: ['"users"."name"'],
    from: Pos(0, 7),
    to: Pos(0, 16),
    mode: "text/x-sqlite",
  });

  testCompletions("schema", {
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

  testCompletions("schemaquoted", {
    value: "SELECT `sch",
    cursor: Pos(0, 11),
    tables: schemaTables,
    list: ["`schema`.`users`", "`schema`.`countries`"],
    from: Pos(0, 7),
    to: Pos(0, 11),
  });

  testCompletions("schemadoublequoted", {
    value: 'SELECT "sch',
    cursor: Pos(0, 11),
    tables: schemaTables,
    list: ['"schema"."users"', '"schema"."countries"'],
    from: Pos(0, 7),
    to: Pos(0, 11),
    mode: "text/x-sqlite",
  });

  testCompletions("schemacolumn", {
    value: "SELECT schema.users.",
    cursor: Pos(0, 20),
    tables: schemaTables,
    list: ["schema.users.name", "schema.users.score", "schema.users.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 20),
  });

  testCompletions("schemacolumnquoted", {
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

  testCompletions("schemacolumndoublequoted", {
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
    mode: "text/x-sqlite",
  });

  testCompletions("displayText_default_table", {
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

  testCompletions("displayText_table", {
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

  testCompletions("displayText_column", {
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

  testCompletions("alias_complete", {
    value: "SELECT t. FROM users t",
    cursor: Pos(0, 9),
    tables: simpleTables,
    list: ["t.name", "t.score", "t.birthDate"],
    from: Pos(0, 7),
    to: Pos(0, 9),
  });

  testCompletions("alias_complete_with_displayText", {
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
});
