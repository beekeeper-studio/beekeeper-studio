import { SqlServerData } from "@/shared/lib/dialects/sqlserver"


describe("SQL Server Dialect data", () => {
  test("should wrapIdentifiers with proper escaping", () => {
    const testCases = [
      ["my[socks]", "[my[socks]]]"],
      ["[foobar]", "[[foobar]]]"]
    ]
    testCases.forEach(([i, exp]) => {
      expect(SqlServerData.wrapIdentifier(i)).toEqual(exp)
    })
  })

  describe("editableRoutineDefinition", () => {
    const fn = (def) => SqlServerData.editableRoutineDefinition(def, {})

    test("rewrites a leading CREATE PROCEDURE to CREATE OR ALTER", () => {
      expect(fn("CREATE PROCEDURE dbo.foo AS SELECT 1"))
        .toEqual("CREATE OR ALTER PROCEDURE dbo.foo AS SELECT 1")
    })

    test("handles PROC abbreviation and odd whitespace, case-insensitively", () => {
      expect(fn("  create   proc dbo.foo AS SELECT 1"))
        .toEqual("  CREATE OR ALTER   proc dbo.foo AS SELECT 1")
    })

    test("rewrites CREATE FUNCTION", () => {
      expect(fn("CREATE FUNCTION dbo.fn() RETURNS int AS BEGIN RETURN 1 END"))
        .toEqual("CREATE OR ALTER FUNCTION dbo.fn() RETURNS int AS BEGIN RETURN 1 END")
    })

    test("does not touch a non-leading CREATE", () => {
      expect(fn("-- comment\nSELECT 1; CREATE PROCEDURE x")).toEqual("-- comment\nSELECT 1; CREATE PROCEDURE x")
    })
  })

  describe("routineExecuteStatement", () => {
    test("builds an EXEC with @-prefixed params", () => {
      const routine = {
        name: "GetUser",
        schema: "dbo",
        type: "procedure",
        routineParams: [
          { name: "@id", type: "int" },
          { name: "name", type: "varchar" },
        ],
      }
      expect(SqlServerData.routineExecuteStatement(routine))
        .toEqual("EXEC [dbo].[GetUser] @id = /* int */ NULL, @name = /* varchar */ NULL;")
    })

    test("handles a routine with no params", () => {
      expect(SqlServerData.routineExecuteStatement({ name: "Ping", schema: "dbo", type: "procedure" }))
        .toEqual("EXEC [dbo].[Ping];")
    })
  })
})
