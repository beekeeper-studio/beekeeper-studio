// "forked" from https://github.com/codemirror/lang-sql/blob/main/test/test-complete.ts
// Distributed under an MIT license: https://github.com/codemirror/lang-sql/blob/main/LICENSE

import {EditorState} from "@codemirror/state"
import {CompletionContext, CompletionSource} from "@codemirror/autocomplete"
import {PostgreSQL, MySQL, SQLConfig, SQLDialect} from "@codemirror/lang-sql"
import theIst from "ist"
import { extensions as sql, SQLExtensionsConfig } from "../../../lib/components/sql-text-editor/extensions"

function get(doc: string, conf: SQLExtensionsConfig & {explicit?: boolean, keywords?: boolean} = {}) {
  let cur = doc.indexOf("|"), dialect = conf.dialect || PostgreSQL
  doc = doc.slice(0, cur) + doc.slice(cur + 1)
  let state = EditorState.create({
    doc,
    selection: {anchor: cur},
    extensions: [
      sql({
        ...conf,
        disableKeywordCompletion: !conf.keywords,
        disableSchemaCompletion: conf.keywords,
        dialect,
      }),
    ]
  })
  let result = state.languageDataAt<CompletionSource>("autocomplete", cur)[0](new CompletionContext(state, cur, !!conf.explicit))
  return result
}

async function str(result: ReturnType<typeof get>) {
  result = await result
  return !result ? "" : result.options.slice()
    .sort((a, b) => (b.boost || 0) - (a.boost || 0) || (a.label < b.label ? -1 : 1))
    .map(o => o.apply || o.label)
    .join(", ")
}

function ist(...args) {
  const err = {};
  Error.captureStackTrace(err, ist); // exclude ist() from the stack trace

  if (args[0]?.then) {
    args[0]
      .then((x) => {
        try {
          theIst(x, ...args.slice(1));
        } catch (e) {
          e.stack += '\nAsync call captured at:\n' + err.stack;
          throw e;
        }
      })
      .catch((e) => {
        e.stack += '\nAsync call captured at:\n' + err.stack;
        throw e;
      });
  } else {
    try {
      theIst(...args);
    } catch (e) {
      e.stack += '\nCall captured at:\n' + err.stack;
      throw e;
    }
  }
}
let schema1 = {
  users: ["name", "id", "address"],
  products: ["name", "cost", "description"]
}

let schema2 = {
  "public.users": ["email", "id"],
  "other.users": ["name", "id"]
}

describe("SQL completion", () => {
  it("completes table names", () => {
    ist(str(get("select u|", {schema: schema1})), "products, users")
  })

  it("completes quoted table names", () => {
    ist(str(get('select "u|', {schema: schema1})), '"products", "users"')
  })

  it("completes table names under schema", () => {
    ist(str(get("select public.u|", {schema: schema2})), "users")
  })

  it("completes quoted table names under schema", () => {
    ist(str(get('select public."u|', {schema: schema2})), '"users"')
  })

  it("completes quoted table names under quoted schema", () => {
    ist(str(get('select "public"."u|', {schema: schema2})), '"users"')
  })

  it("completes column names", () => {
    ist(str(get("select users.|", {schema: schema1})), "address, id, name")
  })

  it("completes column names (dynamically)", () => {
    ist(str(get("select users.|", {schema: schema1, columnsGetter: () => ["apple", "banana"]})), "apple, banana, address, id, name")
  })

  it("completes column names when table is specified after from", async () => {
    const list = get("select | from users", {schema: schema1, explicit: true, columnsGetter: (entity) => entity.name === "users" ? ["apple", "banana"] : []})
    ist(await str(list), "apple, banana, products, users")
  })

  it("completes quoted column names", () => {
    ist(str(get('select users."|', {schema: schema1})), '"address", "id", "name"')
  })

  it("completes column names in quoted tables", () => {
    ist(str(get('select "users".|', {schema: schema1})), "address, id, name")
  })

  it("completes column names in tables for a specific schema", () => {
    ist(str(get("select public.users.|", {schema: schema2})), "email, id")
    ist(str(get("select other.users.|", {schema: schema2})), "id, name")
  })

  it("completes quoted column names in tables for a specific schema", () => {
    ist(str(get('select public.users."|', {schema: schema2})), '"email", "id"')
    ist(str(get('select other.users."|', {schema: schema2})), '"id", "name"')
  })

  it("completes column names in quoted tables for a specific schema", () => {
    ist(str(get('select public."users".|', {schema: schema2})), "email, id")
    ist(str(get('select other."users".|', {schema: schema2})), "id, name")
  })

  it("completes column names in quoted tables for a specific quoted schema", () => {
    ist(str(get('select "public"."users".|', {schema: schema2})), "email, id")
    ist(str(get('select "other"."users".|', {schema: schema2})), "id, name")
  })

  it("completes quoted column names in quoted tables for a specific quoted schema", () => {
    ist(str(get('select "public"."users"."|', {schema: schema2})), '"email", "id"')
    ist(str(get('select "other"."users"."|', {schema: schema2})), '"id", "name"')
  })

  it("completes column names of aliased tables", () => {
    ist(str(get("select u.| from users u", {schema: schema1})), "address, id, name")
    ist(str(get("select u.| from users as u", {schema: schema1})), "address, id, name")
    ist(str(get("select u.| from (SELECT * FROM something u) join users u", {schema: schema1})), "address, id, name")
    ist(str(get("select * from users u where u.|", {schema: schema1})), "address, id, name")
    ist(str(get("select * from users as u where u.|", {schema: schema1})), "address, id, name")
    ist(str(get("select * from (SELECT * FROM something u) join users u where u.|", {schema: schema1})), "address, id, name")
  })

  it("completes column names of aliased quoted tables", () => {
    ist(str(get('select u.| from "users" u', {schema: schema1})), "address, id, name")
    ist(str(get('select u.| from "users" as u', {schema: schema1})), "address, id, name")
    ist(str(get('select * from "users" u where u.|', {schema: schema1})), "address, id, name")
    ist(str(get('select * from "users" as u where u.|', {schema: schema1})), "address, id, name")
  })

  it("completes column names of aliased tables for a specific schema", () => {
    ist(str(get("select u.| from public.users u", {schema: schema2})), "email, id")
  })

  it("completes column names in aliased quoted tables for a specific schema", () => {
    ist(str(get('select u.| from public."users" u', {schema: schema2})), "email, id")
  })

  it("completes column names in aliased quoted tables for a specific quoted schema", () => {
    ist(str(get('select u.| from "public"."users" u', {schema: schema2})), "email, id")
  })

  it("completes aliased table names", () => {
    ist(str(get('select a| from a.b as ab join auto au', {schema: schema2})), "ab, au, other, public")
  })

  it("includes closing quote in completion", async () => {
    let r = await get('select "u|"', {schema: schema1})
    ist(r!.to, 10)
  })

  it("keeps extra table completion properties", async () => {
    let r = await get("select u|", {schema: {users: ["id"]}, tables: [{label: "users", type: "keyword"}]})
    ist(r!.options[0].type, "keyword")
  })

  it("keeps extra column completion properties", async () => {
    let r = await get("select users.|", {schema: {users: [{label: "id", type: "keyword"}]}})
    ist(r!.options[0].type, "keyword")
  })

  it("supports a default table", () => {
    ist(str(get("select i|", {schema: schema1, defaultTable: "users"})), "address, id, name, products, users")
  })

  it("supports alternate quoting styles", () => {
    ist(str(get("select `u|", {dialect: MySQL, schema: schema1})), "`products`, `users`")
  })

  it("doesn't complete without identifier", () => {
    ist(str(get("select |", {schema: schema1})), "")
  })

  it("does complete explicitly without identifier", () => {
    ist(str(get("select |", {schema: schema1, explicit: true})), "products, users")
  })

  it("adds identifiers for non-word completions", () => {
    ist(str(get("foo.b|", {schema: {foo: ["b c", "b-c", "bup"]}, dialect: PostgreSQL})),
        '"b c", "b-c", bup')
    ist(str(get("foo.b|", {schema: {foo: ["b c", "b-c", "bup"]}, dialect: MySQL})),
        '`b c`, `b-c`, bup')
  })

  it("adds identifiers for upper case completions", () => {
    ist(str(get("foo.c|", {schema: {foo: ["Column", "cell"]}, dialect: PostgreSQL})),
        '"Column", cell')

    const customDialect = SQLDialect.define({...PostgreSQL.spec, caseInsensitiveIdentifiers: true})
    ist(str(get("foo.c|", {schema: {foo: ["Column", "cell"]}, dialect: customDialect})),
        'Column, cell')
  })

  it("supports nesting more than two deep", () => {
    let s = {schema: {"one.two.three": ["four"]}}
    ist(str(get("o|", s)), "one")
    ist(str(get("one.|", s)), "two")
    ist(str(get("one.two.|", s)), "three")
    ist(str(get("one.two.three.|", s)), "four")
  })

  it("supports escaped dots in table names", () => {
    let s = {schema: {"db\\.conf": ["abc"]}}
    ist(str(get("db|", s)), '"db.conf"')
    ist(str(get('"db.conf".|', s)), "abc")
  })

  it("supports nested schema declarations", () => {
    let s = {schema: {
      public: {users: ["email", "id"]},
      other: {users: ["name", "id"]},
      plain: ["one", "two"]
    }}
    ist(str(get("pl|", s)), "other, plain, public")
    ist(str(get("plain.|", s)), "one, two")
    ist(str(get("public.u|", s)), "users")
    ist(str(get("public.users.e|", s)), "email, id")
  })

  it("supports self fields to specify table/schema completions", async () => {
    let s: SQLConfig = {schema: {
      foo: {
        self: {label: "foo", type: "keyword"},
        children: {
          bar: {
            self: {label: "bar", type: "constant"},
            children: ["a", "b"]
          }
        }
      }
    }}
    ist((await get("select f|", s))!.options[0].type, "keyword")
    ist((await get("select foo.|", s))!.options[0].type, "constant")
    ist((await get("select foo.|", s))!.options.length, 1)
  })

  it("can complete keywords", async () => {
    ist((await get("s|", {keywords: true}))!.options.some(c => c.label == "select"))
  })

  it("can complete upper-case keywords", async () => {
    ist((await get("s|", {keywords: true, upperCaseKeywords: true}))!.options.some(c => c.label == "SELECT"))
  })

  it("can transform keyword completions", async () => {
    ist((await get("s|", {keywords: true, keywordCompletion: l => ({label: l, type: "x"})}))!.options.every(c => c.type == "x"))
  })

  // ---------------------------------------------------------------------------
  // Regression tests for issue #3567:
  // "The autocomplete does not suggest columns if the table is quoted"
  // and related context-based completion bugs (JOIN extraction,
  // schema-qualified parents).
  // ---------------------------------------------------------------------------

  it("completes column names when double-quoted table is specified after from (#3567)", async () => {
    const list = get('select | from "users"', {
      schema: schema1,
      explicit: true,
      columnsGetter: (entity) => entity.name === "users" ? ["apple", "banana"] : [],
    })
    ist(await str(list), "apple, banana, products, users")
  })

  it("completes column names when backtick-quoted table is specified after from", async () => {
    const list = get('select | from `users`', {
      schema: schema1,
      dialect: MySQL,
      explicit: true,
      columnsGetter: (entity) => entity.name === "users" ? ["apple", "banana"] : [],
    })
    // Tables/columns are simple lowercase words, so MySQL doesn't add backticks
    // (see nameCompletion -- only quotes labels with non-word chars).
    ist(await str(list), "apple, banana, products, users")
  })

  it("completes column names when bracket-quoted table is specified after from", async () => {
    const list = get('select | from [users]', {
      schema: schema1,
      explicit: true,
      columnsGetter: (entity) => entity.name === "users" ? ["apple", "banana"] : [],
    })
    const result = await str(list)
    ist(result.includes("apple"))
    ist(result.includes("banana"))
  })

  it("completes column names from joined tables (unaliased)", async () => {
    const list = get(
      "select | from users join orders on users.id = orders.user_id",
      {
        schema: schema1,
        explicit: true,
        columnsGetter: (entity) => {
          if (entity.name === "users") return ["user_apple"]
          if (entity.name === "orders") return ["order_x"]
          return []
        },
      }
    )
    const result = await str(list)
    ist(result.includes("user_apple"))
    ist(result.includes("order_x"))
  })

  it("completes column names from joined quoted tables (unaliased)", async () => {
    const list = get(
      'select | from "users" join "orders" on "users".id = "orders".user_id',
      {
        schema: schema1,
        explicit: true,
        columnsGetter: (entity) => {
          if (entity.name === "users") return ["user_apple"]
          if (entity.name === "orders") return ["order_x"]
          return []
        },
      }
    )
    const result = await str(list)
    ist(result.includes("user_apple"))
    ist(result.includes("order_x"))
  })

  it("completes column names with case-insensitive FROM keyword and quoted table", async () => {
    const list = get('select | FROM "users"', {
      schema: schema1,
      explicit: true,
      columnsGetter: (entity) => entity.name === "users" ? ["cherry"] : [],
    })
    ist((await str(list)).includes("cherry"))
  })

  it("preserves schema in entity passed to columnsGetter for schema-qualified table without alias", async () => {
    const seenEntities: Array<{schema?: string, name: string}> = []
    const list = get('select public.users.|', {
      schema: schema2,
      columnsGetter: (entity) => {
        seenEntities.push({ schema: entity.schema, name: entity.name })
        return entity.schema === "public" && entity.name === "users"
          ? ["dynamic_a", "dynamic_b"]
          : []
      },
    })
    ist(await str(list), "dynamic_a, dynamic_b, email, id")
    ist(seenEntities.some((e) => e.schema === "public" && e.name === "users"))
  })

  it("preserves schema in entity passed to columnsGetter for schema-qualified quoted table", async () => {
    const list = get('select "public"."users".|', {
      schema: schema2,
      columnsGetter: (entity) => {
        return entity.schema === "public" && entity.name === "users"
          ? ["dynamic_a", "dynamic_b"]
          : []
      },
    })
    ist(await str(list), "dynamic_a, dynamic_b, email, id")
  })

  it("uses alias resolution for aliased schema-qualified table", async () => {
    const list = get("select u.| from public.users u", {
      schema: schema2,
      columnsGetter: (entity) =>
        entity.schema === "public" && entity.name === "users"
          ? ["dynamic_a"]
          : [],
    })
    ist((await str(list)).includes("dynamic_a"))
  })

  it("does not break existing aliased quoted table completion", async () => {
    // Regression: ensure the FROM-regex change didn't disturb the alias path.
    const list = get('select u.| from "users" u', {
      schema: schema1,
      columnsGetter: (entity) =>
        entity.name === "users" ? ["dynamic_x"] : [],
    })
    const result = await str(list)
    ist(result.includes("dynamic_x"))
    ist(result.includes("address"))
  })

  it("returns no extra columns when cursor is not at a column completion position", async () => {
    let calls = 0
    const list = get('select * from "us|"', {
      schema: schema1,
      explicit: true,
      columnsGetter: () => {
        calls++
        return ["should_not_appear"]
      },
    })
    const result = await str(list)
    // We're typing a table name (after FROM), not a column position.
    // The columnsGetter may still be invoked by the completion machinery
    // with the table-name lookup, but the dynamic-context path
    // (loadColumnsFromQueryContext) must not inject column completions.
    ist(!result.includes("should_not_appear"))
  })

  it("extracts multiple distinct tables across FROM and JOIN", async () => {
    const list = get(
      'select | from "a" join b join `c` on true',
      {
        schema: schema1,
        explicit: true,
        dialect: MySQL,
        columnsGetter: (entity) => {
          if (entity.name === "a") return ["col_a"]
          if (entity.name === "b") return ["col_b"]
          if (entity.name === "c") return ["col_c"]
          return []
        },
      }
    )
    const result = await str(list)
    ist(result.includes("col_a"))
    ist(result.includes("col_b"))
    ist(result.includes("col_c"))
  })
})
