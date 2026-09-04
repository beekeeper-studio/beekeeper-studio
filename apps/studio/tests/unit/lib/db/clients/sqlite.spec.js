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

  it("Should annotate error message with query index when multi-query execution fails", async () => {
    const client = new SqliteClient(null, null);
    client.identifyCommands = () => [
      { text: 'SELECT 1;', type: 'SELECT', executionType: 'LISTING' },
      { text: 'INVALID SQL;', type: 'UNKNOWN', executionType: 'UNKNOWN' },
      { text: 'SELECT 2;', type: 'SELECT', executionType: 'LISTING' },
    ];
    client.checkReader = () => true;
    client._rawConnection = {
      prepare: (sql) => {
        if (sql === 'INVALID SQL;') {
          throw new Error('near "INVALID": syntax error');
        }
        return {
          all: () => [{ 1: 1 }],
          columns: () => [],
        };
      },
    };

    await expect(client.rawExecuteQuery('SELECT 1; INVALID SQL; SELECT 2;', { multiple: true }))
      .rejects.toThrow('near "INVALID": syntax error (@ query #2)');
  });
})
