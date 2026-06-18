import { PostgresData } from "@/shared/lib/dialects/postgresql"

describe("PostgreSQL Dialect data", () => {
  describe("editableRoutineDefinition", () => {
    test("returns the definition unchanged (pg_get_functiondef is re-runnable)", () => {
      const def = "CREATE OR REPLACE FUNCTION public.foo() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql"
      expect(PostgresData.editableRoutineDefinition(def, {})).toEqual(def)
    })
  })

  describe("routineExecuteStatement", () => {
    test("builds a CALL for procedures", () => {
      const routine = {
        name: "do_thing",
        schema: "public",
        type: "procedure",
        routineParams: [{ name: "id", type: "integer" }],
      }
      expect(PostgresData.routineExecuteStatement(routine))
        .toEqual('CALL "public"."do_thing"(/* id: integer */ NULL);')
    })

    test("builds a SELECT for functions with no params", () => {
      expect(PostgresData.routineExecuteStatement({ name: "now_ish", schema: "public", type: "function" }))
        .toEqual('SELECT "public"."now_ish"();')
    })
  })
})
