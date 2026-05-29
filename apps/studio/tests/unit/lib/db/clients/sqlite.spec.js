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

  it("Should build a table overview for an existing SQLite table", async () => {
    const client = new SqliteClient(null, null);
    client.driverExecuteSingle = jest.fn()
      .mockResolvedValueOnce({ rows: [{ name: 'users' }] })
      .mockResolvedValueOnce({ rows: [{ count: '42' }] })
      .mockResolvedValueOnce({ rows: [{ size: '2048' }] })
      .mockResolvedValueOnce({ rows: [{ size: '512' }] });

    const result = await client.getTableOverview('users');

    expect(result).toEqual({
      schemaName: 'main',
      tableName: 'users',
      rowCount: 42,
      tableSize: 2048,
      indexSize: 512,
      totalSize: 2560,
      freeSpace: null,
      fragmentation: null,
      canOptimize: false,
      optimizationNote: null,
    });
    expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE type = \'table\' AND name = ?'),
      { params: ['users'] }
    );
    expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SELECT COUNT(*) as count FROM `users`')
    );
  })

  it("Should return null when a SQLite table overview is requested for a missing table", async () => {
    const client = new SqliteClient(null, null);
    client.driverExecuteSingle = jest.fn().mockResolvedValue({ rows: [] });

    const result = await client.getTableOverview('missing');

    expect(result).toBeNull();
  })

  it("Should build a SQLite database overview and detect database-wide optimization", async () => {
    const client = new SqliteClient(null, null);
    const userOverview = {
      schemaName: 'main',
      tableName: 'users',
      rowCount: 42,
      tableSize: 2048,
      indexSize: 512,
      totalSize: 2560,
      freeSpace: null,
      fragmentation: null,
      canOptimize: false,
      optimizationNote: null,
    };
    client.driverExecuteSingle = jest.fn()
      .mockResolvedValueOnce({ rows: [{ name: 'users' }, { name: 'orders' }] })
      .mockResolvedValueOnce({ rows: [{ freelist_count: 300 }] })
      .mockResolvedValueOnce({ rows: [{ page_size: 4096 }] });
    client.getTableOverview = jest.fn()
      .mockResolvedValueOnce(userOverview)
      .mockResolvedValueOnce(null);

    const result = await client.getTablesOverview();

    expect(result).toEqual({
      tables: [userOverview],
      freeSpace: 1228800,
      canOptimize: true,
      optimizationNote: 'SQLite optimization is database-wide (VACUUM). It cannot be applied per table.',
    });
    expect(client.getTableOverview).toHaveBeenCalledWith('users');
    expect(client.getTableOverview).toHaveBeenCalledWith('orders');
  })

  it("Should run VACUUM when optimizing SQLite", async () => {
    const client = new SqliteClient(null, null);
    client.driverExecuteSingle = jest.fn().mockResolvedValue({ rows: [] });

    await client.optimizeTable('ignored');

    expect(client.driverExecuteSingle).toHaveBeenCalledWith('VACUUM');
  })
})
