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
})
