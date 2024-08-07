import { SqliteClient } from "../../../../../src/lib/db/clients/sqlite"

describe("SQLite UNIT test (no connection)", () => {
  it("Should build alter table statements", async () => {
    const input = {
      table: 'foo',
      alterations: [
        {
          columnName: 'a',
          changeType: 'columnName',
          newValue: 'b'
        },
        {
          columnName: 'c',
          changeType: 'columnName',
          newValue: 'd'
        }
      ]
    }

    const client = new SqliteClient(null, null);
    const result = await client.alterTableSql(input)
    const expected = 'ALTER TABLE "foo" RENAME COLUMN "a" TO "b";ALTER TABLE "foo" RENAME COLUMN "c" TO "d";'
    expect(result).toBe(expected);
    await client.disconnect()
  })
})
