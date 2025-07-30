// Fork from https://github.com/codemirror/lang-sql/blob/main/test/test-complete.ts
// Distributed under an MIT license: https://github.com/codemirror/lang-sql/blob/main/LICENSE

import {EditorState} from "@codemirror/state"
import {CompletionContext, CompletionResult, CompletionSource} from "@codemirror/autocomplete"
import {PostgreSQL, MySQL, SQLConfig, SQLDialect} from "@codemirror/lang-sql"
import ist from "ist"
import { extensions as sql } from "../../../lib/components/sql-text-editor/extensions"

function get(doc: string, conf: SQLConfig & {explicit?: boolean, keywords?: boolean} = {}) {
  let cur = doc.indexOf("|"), dialect = conf.dialect || PostgreSQL
  doc = doc.slice(0, cur) + doc.slice(cur + 1)
  let state = EditorState.create({
    doc,
    selection: {anchor: cur},
    extensions: [
      sql({
        disableKeywordCompletion: !conf.keywords,
        disableSchemaCompletion: conf.keywords,
        sqlConfig: { ...conf, dialect },
      }),
    ]
  })
  let result = state.languageDataAt<CompletionSource>("autocomplete", cur)[0](new CompletionContext(state, cur, !!conf.explicit))
  return result as CompletionResult | null
}

function str(result: CompletionResult | null) {
  return !result ? "" : result.options.slice()
    .sort((a, b) => (b.boost || 0) - (a.boost || 0) || (a.label < b.label ? -1 : 1))
    .map(o => o.apply || o.label)
    .join(", ")
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

  it("includes closing quote in completion", () => {
    let r = get('select "u|"', {schema: schema1})
    ist(r!.to, 10)
  })

  it("keeps extra table completion properties", () => {
    let r = get("select u|", {schema: {users: ["id"]}, tables: [{label: "users", type: "keyword"}]})
    ist(r!.options[0].type, "keyword")
  })

  it("keeps extra column completion properties", () => {
    let r = get("select users.|", {schema: {users: [{label: "id", type: "keyword"}]}})
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

  it("supports self fields to specify table/schema completions", () => {
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
    ist(get("select f|", s)!.options[0].type, "keyword")
    ist(get("select foo.|", s)!.options[0].type, "constant")
    ist(get("select foo.|", s)!.options.length, 1)
  })

  it("can complete keywords", () => {
    ist(get("s|", {keywords: true})!.options.some(c => c.label == "select"))
  })

  it("can complete upper-case keywords", () => {
    ist(get("s|", {keywords: true, upperCaseKeywords: true})!.options.some(c => c.label == "SELECT"))
  })

  it("can transform keyword completions", () => {
    ist(get("s|", {keywords: true, keywordCompletion: l => ({label: l, type: "x"})})!.options.every(c => c.type == "x"))
  })
})
