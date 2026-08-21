/**
 * Expected per-database autocomplete insertion conventions.
 *
 * This spec encodes the ASSUMPTION MATRIX for how completions should rewrite
 * query text per database — identifier quoting and keyword/function casing.
 * It is written tests-first: cases that encode behavior changes are RED until
 * the engine/config phases land. `completions.spec.ts` (forked from upstream)
 * covers engine mechanics; this file is the convention contract.
 *
 * Conventions under test (dialects resolved via `langIdToDialect`, i.e. what
 * the editor actually wires per connection type):
 *
 * - PostgreSQL folds unquoted identifiers to lowercase, so MixedCase names
 *   MUST be quoted. Unchanged behavior.
 * - MySQL never case-folds identifiers, so MixedCase names must NOT be
 *   quoted; quoting is only for names with special characters (or reserved
 *   words, out of scope here). ClickHouse shares `text/x-mysql`.
 * - SQL Server does not fold and default collations are case-insensitive, so
 *   MixedCase names must NOT be bracketed. Brackets only for special chars.
 * - SQLite compares identifiers ASCII-case-insensitively, so MixedCase names
 *   must NOT be quoted — and when quoting IS needed, the standard quote is
 *   `"` (backticks are a MySQL-compat extra, not the convention).
 * - Names that require quoting and contain the quote character itself get the
 *   character doubled (`a"b` → `"a""b"`), matching every backend's
 *   wrapIdentifier.
 * - Leading-digit names (`2fa`) stay quoted everywhere. MySQL technically
 *   allows a bare leading digit, but quoting is conservative-correct.
 * - Keywords and built-in functions insert matching the case the user typed:
 *   a prefix containing a lowercase letter completes lowercase
 *   (`sel` → `select`), an all-uppercase prefix (`SEL`, `GROUP_C`) or no
 *   prefix at all (explicit completion, e.g. Ctrl+Space) completes
 *   uppercase. No per-dialect opinion is imposed.
 *
 * Configuration contract (ui-kit side of Phase 3 — `[ui.queryEditor.autocomplete]`):
 * - `keywordCasing`: "preserve" (default, match typed case) | "upper" | "lower"
 * - `quoteIdentifiers`: "auto" (default, per-database rules above) | "always"
 *   ("always" quotes every completed identifier, no exceptions)
 */

import { EditorState } from "@codemirror/state"
import { CompletionContext, CompletionSource } from "@codemirror/autocomplete"
import { extensions as sql, SQLExtensionsConfig } from "../../../lib/components/sql-text-editor/extensions"
import { langIdToDialect } from "../../../lib/components/sql-text-editor/customDialects"

const PG = langIdToDialect["text/x-pgsql"]
const MYSQL = langIdToDialect["text/x-mysql"]
const MSSQL = langIdToDialect["text/x-mssql"]
const SQLITE = langIdToDialect["text/x-sqlite"]

/**
 * `keywordCasing`, `quoteIdentifiers`, and `quoteCharacter` come from
 * SQLExtensionsConfig itself — the configuration contract under test.
 */
type ConventionsConfig = SQLExtensionsConfig & {
  explicit?: boolean
  keywords?: boolean
}

async function optionsFor(doc: string, conf: ConventionsConfig = {}): Promise<string[]> {
  const cur = doc.indexOf("|")
  const dialect = conf.dialect || PG
  doc = doc.slice(0, cur) + doc.slice(cur + 1)
  const state = EditorState.create({
    doc,
    selection: { anchor: cur },
    extensions: [
      sql({
        ...conf,
        disableKeywordCompletion: !conf.keywords,
        disableSchemaCompletion: conf.keywords,
        dialect,
      }),
    ],
  })
  const result = await state.languageDataAt<CompletionSource>("autocomplete", cur)[0](
    new CompletionContext(state, cur, !!conf.explicit)
  )
  if (!result) return []
  return result.options.map((o) => String(typeof o.apply === "string" ? o.apply : o.label))
}

// ---------------------------------------------------------------------------
// Identifier quoting: completing a table name inserts exactly this text.
// ---------------------------------------------------------------------------

const DIALECTS = {
  postgresql: PG,
  mysql: MYSQL,
  sqlserver: MSSQL,
  sqlite: SQLITE,
} as const

type DialectName = keyof typeof DIALECTS

const TABLE_QUOTING: Array<{ name: string; expected: Record<DialectName, string> }> = [
  {
    name: "MixedCase",
    expected: { postgresql: '"MixedCase"', mysql: "MixedCase", sqlserver: "MixedCase", sqlite: "MixedCase" },
  },
  {
    name: "lower_case",
    expected: { postgresql: "lower_case", mysql: "lower_case", sqlserver: "lower_case", sqlite: "lower_case" },
  },
  {
    name: "my table",
    expected: { postgresql: '"my table"', mysql: "`my table`", sqlserver: "[my table]", sqlite: '"my table"' },
  },
  {
    name: "b-c",
    expected: { postgresql: '"b-c"', mysql: "`b-c`", sqlserver: "[b-c]", sqlite: '"b-c"' },
  },
  {
    name: "2fa",
    expected: { postgresql: '"2fa"', mysql: "`2fa`", sqlserver: "[2fa]", sqlite: '"2fa"' },
  },
  {
    name: 'a"b',
    expected: { postgresql: '"a""b"', mysql: '`a"b`', sqlserver: '[a"b]', sqlite: '"a""b"' },
  },
  {
    name: "a`b",
    expected: { postgresql: '"a`b"', mysql: "`a``b`", sqlserver: "[a`b]", sqlite: '"a`b"' },
  },
  {
    name: "a]b",
    expected: { postgresql: '"a]b"', mysql: "`a]b`", sqlserver: "[a]]b]", sqlite: '"a]b"' },
  },
]

describe("identifier quoting conventions", () => {
  for (const { name, expected } of TABLE_QUOTING) {
    for (const dialectName of Object.keys(DIALECTS) as DialectName[]) {
      it(`${dialectName}: table \`${name}\` completes as ${expected[dialectName]}`, async () => {
        const opts = await optionsFor("select |", {
          schema: { [name]: ["id"] },
          dialect: DIALECTS[dialectName],
          explicit: true,
        })
        expect(opts).toEqual([expected[dialectName]])
      })
    }
  }

  for (const dialectName of Object.keys(DIALECTS) as DialectName[]) {
    it(`${dialectName}: column quoting follows the same rules`, async () => {
      const opts = await optionsFor("select people.|", {
        schema: { people: ["FirstName", "last_name", "full name"] },
        dialect: DIALECTS[dialectName],
      })
      const quote = { postgresql: '"', mysql: "`", sqlserver: "[", sqlite: '"' }[dialectName]
      const close = quote === "[" ? "]" : quote
      const mixedExpected = dialectName === "postgresql" ? '"FirstName"' : "FirstName"
      expect(opts).toContain(mixedExpected)
      expect(opts).toContain("last_name")
      expect(opts).toContain(`${quote}full name${close}`)
    })
  }

  it("postgresql: schema-qualified MixedCase segments stay quoted", async () => {
    const top = await optionsFor("select |", {
      schema: { "MySchema.MyTable": ["Id"] },
      dialect: PG,
      explicit: true,
    })
    expect(top).toContain('"MySchema"')
    const children = await optionsFor('select "MySchema".|', {
      schema: { "MySchema.MyTable": ["Id"] },
      dialect: PG,
    })
    expect(children).toContain('"MyTable"')
  })

  for (const dialectName of ["mysql", "sqlserver", "sqlite"] as DialectName[]) {
    it(`${dialectName}: schema-qualified MixedCase segments complete unquoted`, async () => {
      const top = await optionsFor("select |", {
        schema: { "MySchema.MyTable": ["Id"] },
        dialect: DIALECTS[dialectName],
        explicit: true,
      })
      expect(top).toContain("MySchema")
      const children = await optionsFor("select MySchema.|", {
        schema: { "MySchema.MyTable": ["Id"] },
        dialect: DIALECTS[dialectName],
      })
      expect(children).toContain("MyTable")
    })
  }
})

// ---------------------------------------------------------------------------
// Keyword & built-in function casing: completions match the typed prefix.
// ---------------------------------------------------------------------------

describe("keyword and function casing conventions", () => {
  for (const dialectName of Object.keys(DIALECTS) as DialectName[]) {
    it(`${dialectName}: uppercase prefix completes uppercase keywords`, async () => {
      const opts = await optionsFor("SEL|", { keywords: true, dialect: DIALECTS[dialectName] })
      expect(opts).toContain("SELECT")
      expect(opts).not.toContain("select")
    })

    it(`${dialectName}: lowercase prefix completes lowercase keywords`, async () => {
      const opts = await optionsFor("sel|", { keywords: true, dialect: DIALECTS[dialectName] })
      expect(opts).toContain("select")
      expect(opts).not.toContain("SELECT")
    })

    it(`${dialectName}: mixed-case prefix falls back to the stored form`, async () => {
      const opts = await optionsFor("Sel|", { keywords: true, dialect: DIALECTS[dialectName] })
      expect(opts).toContain("select")
      expect(opts).not.toContain("SELECT")
    })

    it(`${dialectName}: no prefix (explicit, e.g. Ctrl+Space) completes uppercase`, async () => {
      const opts = await optionsFor("|", { keywords: true, dialect: DIALECTS[dialectName], explicit: true })
      expect(opts).toContain("SELECT")
      expect(opts).not.toContain("select")
    })
  }

  it("mysql: built-in function names follow typed case (GROUP_C → GROUP_CONCAT)", async () => {
    const upper = await optionsFor("select GROUP_C|", { keywords: true, dialect: MYSQL })
    expect(upper).toContain("GROUP_CONCAT")
    const lower = await optionsFor("select group_c|", { keywords: true, dialect: MYSQL })
    expect(lower).toContain("group_concat")
  })

  it("sqlserver: T-SQL built-ins are available for completion (getdate)", async () => {
    // Red while the SQLServer dialect spreads `...MSSQL` instead of
    // `...MSSQL.spec`, which drops every T-SQL word list.
    const opts = await optionsFor("select get|", { keywords: true, dialect: MSSQL })
    expect(opts).toContain("getdate")
  })

  it("sqlserver: T-SQL built-ins follow typed case (GETD → GETDATE)", async () => {
    const opts = await optionsFor("select GETD|", { keywords: true, dialect: MSSQL })
    expect(opts).toContain("GETDATE")
  })
})

// ---------------------------------------------------------------------------
// Configuration contract (Phase 3): user overrides via
// [ui.queryEditor.autocomplete] flow into the editor as these options.
// ---------------------------------------------------------------------------

describe("quote character overrides", () => {
  it("sqlserver: quoteCharacter '\"' switches bracket quoting to ANSI quotes", async () => {
    const opts = await optionsFor("select |", {
      schema: { "my table": ["id"], 'a"b': ["id"] },
      dialect: MSSQL,
      explicit: true,
      quoteCharacter: '"',
    })
    expect(opts).toContain('"my table"')
    // Escaping follows the chosen quote, not the dialect default.
    expect(opts).toContain('"a""b"')
  })

  it("sqlite: quoteCharacter '`' switches to MySQL-compat backticks", async () => {
    const opts = await optionsFor("select |", {
      schema: { "my table": ["id"] },
      dialect: SQLITE,
      explicit: true,
      quoteCharacter: "`",
    })
    expect(opts).toEqual(["`my table`"])
  })

  it("postgresql: an unrecognized quoteCharacter falls back to the dialect default", async () => {
    // Backticks aren't valid identifier quotes in PostgreSQL; inserting them
    // would produce SQL the database rejects.
    const opts = await optionsFor("select |", {
      schema: { "my table": ["id"] },
      dialect: PG,
      explicit: true,
      quoteCharacter: "`",
    })
    expect(opts).toEqual(['"my table"'])
  })

  it("mysql: '\"' is a string quote, not an identifier quote — falls back to backticks", async () => {
    const opts = await optionsFor("select |", {
      schema: { "my table": ["id"] },
      dialect: MYSQL,
      explicit: true,
      quoteCharacter: '"',
    })
    expect(opts).toEqual(["`my table`"])
  })

  it("does not affect names that need no quoting", async () => {
    const opts = await optionsFor("select |", {
      schema: { plain_name: ["id"] },
      dialect: MSSQL,
      explicit: true,
      quoteCharacter: '"',
    })
    expect(opts).toEqual(["plain_name"])
  })
})

describe("autocomplete configuration overrides", () => {
  it("keywordCasing=upper forces uppercase regardless of typed case", async () => {
    const opts = await optionsFor("sel|", { keywords: true, dialect: MYSQL, keywordCasing: "upper" })
    expect(opts).toContain("SELECT")
    expect(opts).not.toContain("select")
  })

  it("keywordCasing=lower forces lowercase regardless of typed case", async () => {
    const opts = await optionsFor("SEL|", { keywords: true, dialect: MYSQL, keywordCasing: "lower" })
    expect(opts).toContain("select")
    expect(opts).not.toContain("SELECT")
  })

  it("quoteIdentifiers=always restores unconditional MixedCase quoting", async () => {
    const opts = await optionsFor("select |", {
      schema: { MixedCase: ["Id"] },
      dialect: MYSQL,
      explicit: true,
      quoteIdentifiers: "always",
    })
    expect(opts).toEqual(["`MixedCase`"])
  })

  it("quoteIdentifiers=always quotes every name, even all-lowercase ones", async () => {
    const opts = await optionsFor("select |", {
      schema: { lower_case: ["id"] },
      dialect: MYSQL,
      explicit: true,
      quoteIdentifiers: "always",
    })
    expect(opts).toEqual(["`lower_case`"])
  })

  it("quoteIdentifiers=always quotes columns too", async () => {
    const opts = await optionsFor("select people.|", {
      schema: { people: ["first_name", "FirstName"] },
      dialect: PG,
      quoteIdentifiers: "always",
    })
    expect(opts).toContain('"first_name"')
    expect(opts).toContain('"FirstName"')
  })

  it("quoteIdentifiers=auto is the default per-database behavior", async () => {
    const opts = await optionsFor("select |", {
      schema: { MixedCase: ["Id"] },
      dialect: MYSQL,
      explicit: true,
      quoteIdentifiers: "auto",
    })
    expect(opts).toEqual(["MixedCase"])
  })
})
