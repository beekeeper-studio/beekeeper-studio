import { PostgresClient } from '../../../../../src/lib/db/clients/postgresql'

describe("Postgres UNIT tests (no connection required)", () => {
  let client;

  beforeAll(async () => {
    client = new PostgresClient(null, null);
  })

  it("should pass a canary test", () => {
    expect(1).toBe(1)
  })

  it("Should parseRowQueryResult when array", () => {
    const data = {
      command: 'SELECT',
      columns: [{name: 'foo'}],
      rows: [['bananas'], ['apples']]
    }

    const expected = {
      rows: [{c0: 'bananas'}, {c0: 'apples'}],
      fields: [{id: 'c0', name: 'foo', dataType: 'user-defined'}],
      rowCount: 2,
      affectedRows: undefined,
      command: 'SELECT'
    }
    expect(client.parseRowQueryResult(data, undefined, true)).toStrictEqual(expected)
  })

  it("should parseRowQueryResult when object", () => {
    const data = {
      command: 'SELECT',
      columns: [{name: 'foo'}],
      rows: [{foo: 'bananas'}, {foo: 'apples'}]
    }

    const expected = {
      rows: [{foo: 'bananas'}, {foo: 'apples'}],
      fields: [{id: 'foo', name: 'foo', dataType: 'user-defined'}],
      rowCount: 2,
      affectedRows: undefined,
      command: 'SELECT'
    }
    expect(client.parseRowQueryResult(data, undefined, false)).toStrictEqual(expected)
  })

  it("Should generate correct alter table rename statement", async () => {
    const input = {
      table: 'foo',
      schema: 'public',
      alterations: [
        {
          changeType: 'columnName',
          columnName: 'bar',
          newValue: 'baz'
        }
      ],
    }
    const result = await client.alterTableSql(input)
    const expected = 'ALTER TABLE "public"."foo" RENAME COLUMN "bar" TO "baz";'
    expect(result).toBe(expected)
  })

  it("Should generate correct alter table type change statement", async () => {
    const input = {
      table: 'foo',
      schema: 'public',
      alterations: [
        {
          changeType: 'dataType',
          columnName: 'bar',
          newValue: 'varchar(255)'
        }
      ]
    }
    const result = await client.alterTableSql(input);
    const expected = 'ALTER TABLE "public"."foo" ALTER COLUMN "bar" TYPE varchar(255);'
    expect(result).toBe(expected)
  })

  it("Should add a new column properly", async () => {
    const input = {
      table: 'foo',
      schema: 'public',
      adds: [
        {
          columnName: 'bar',
          dataType: 'varchar(255)',
          nullable: true,
          defaultValue: "'Hello Fella'"
        }
      ]
    }

    const result = await client.alterTableSql(input);
    const expected = 'ALTER TABLE "public"."foo" ADD COLUMN "bar" varchar(255) DEFAULT \'Hello Fella\' NULL;'
    expect(result).toBe(expected)
  })

  it("Should do everything at once", async () => {
    const input = {
      table: 'foo',
      schema: 'public',
      adds: [
        { columnName: 'a', dataType: 'int'}
      ],
      alterations: [
        { columnName:'b', changeType: 'dataType', newValue: 'char'},
        { columnName: 'd', changeType: 'comment', newValue: 'comment!'}
      ],
      drops: ['c']
    }
    const result = await client.alterTableSql(input)
    const expected = 'ALTER TABLE "public"."foo" ADD COLUMN "a" int NOT NULL, DROP COLUMN "c", ALTER COLUMN "b" TYPE char;COMMENT ON COLUMN "public"."foo"."d" IS \'comment!\';'
    expect(result).toBe(expected);
  })

  it("Should handle read-only permission errors gracefully and still return relations", async () => {
    // Mock the methods that might fail due to permission issues
    const mockRelations = [
      {
        constraintName: 'fk_test',
        fromTable: 'table1',
        fromSchema: 'public',
        fromColumn: 'id',
        toTable: 'table2',
        toSchema: 'public',
        toColumn: 'ref_id',
        onUpdate: 'NO ACTION',
        onDelete: 'CASCADE',
        isComposite: false
      }
    ];

    // Set up the client properly for testing
    client._defaultSchema = 'public';
    client.version = { number: 100000 }; // Mock a modern PostgreSQL version
    client.wrapTable = jest.fn().mockReturnValue('"public"."test_table"');

    // Mock methods that may fail with permission errors
    client.driverExecuteSingle = jest.fn().mockRejectedValue(new Error('permission denied for function pg_relation_size'));
    client.listTableIndexes = jest.fn().mockRejectedValue(new Error('permission denied'));
    client.listTableTriggers = jest.fn().mockRejectedValue(new Error('permission denied'));
    client.listTablePartitions = jest.fn().mockRejectedValue(new Error('permission denied'));
    client.getTableOwner = jest.fn().mockRejectedValue(new Error('permission denied'));

    // Mock getTableKeys to return relations successfully (this should work with read-only)
    client.getTableKeys = jest.fn().mockResolvedValue(mockRelations);

    const result = await client.getTableProperties('test_table', 'public');

    // Verify that relations are returned even when other properties fail
    expect(result.relations).toEqual(mockRelations);
    expect(result.indexes).toEqual([]);
    expect(result.triggers).toEqual([]);
    expect(result.partitions).toEqual([]);
    expect(result.owner).toBeNull();
    expect(result.indexSize).toBe(0);
    expect(result.size).toBe(0);
    expect(result.description).toBeNull();
    
    // Verify that permission warnings are included
    expect(result.permissionWarnings).toBeDefined();
    expect(result.permissionWarnings).toContain('Unable to retrieve table size and description due to insufficient permissions');
    expect(result.permissionWarnings).toContain('Unable to retrieve table indexes due to insufficient permissions');
    expect(result.permissionWarnings).toContain('Unable to retrieve table triggers due to insufficient permissions');
    expect(result.permissionWarnings).toContain('Unable to retrieve table partitions due to insufficient permissions');
    expect(result.permissionWarnings).toContain('Unable to retrieve table owner due to insufficient permissions');
    // Relations should succeed, so it should not have a warning for relations
    expect(result.permissionWarnings).not.toContain('Unable to retrieve table relations due to insufficient permissions');

    // Verify that all methods were called despite some failing
    expect(client.getTableKeys).toHaveBeenCalledWith('test_table', 'public');
    expect(client.listTableIndexes).toHaveBeenCalledWith('test_table', 'public');
    expect(client.listTableTriggers).toHaveBeenCalledWith('test_table', 'public');
    expect(client.listTablePartitions).toHaveBeenCalledWith('test_table', 'public');
    expect(client.getTableOwner).toHaveBeenCalledWith('test_table', 'public');
  })

})
