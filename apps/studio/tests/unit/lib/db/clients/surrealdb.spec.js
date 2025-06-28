import { SurrealDBClient } from "../../../../../src/lib/db/clients/surrealdb"

describe("SurrealDB UNIT test (no connection)", () => {
  let client;

  beforeEach(() => {
    const mockServer = {
      config: {
        host: 'localhost',
        port: 8000,
        user: 'root',
        password: 'root',
        ssl: false,
        readOnlyMode: false,
        options: {
          namespace: 'test'
        }
      }
    };
    
    const mockDatabase = {
      database: 'test'
    };

    client = new SurrealDBClient(mockServer, mockDatabase);
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it("Should initialize with correct configuration", () => {
    expect(client.dialect).toBe('surrealdb');
    expect(client.readOnlyMode).toBe(false);
  });

  it("Should return correct version string fallback", async () => {
    // Mock the db.version method to reject (simulating no connection)
    client.db = {
      version: jest.fn().mockRejectedValue(new Error('No connection'))
    };

    const version = await client.versionString();
    expect(version).toBe('Unknown');
  });

  it("Should return supported features correctly", async () => {
    const features = await client.supportedFeatures();
    expect(features).toEqual({
      customRoutines: false,
      comments: false,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
    });
  });

  it("Should generate correct select top SQL", async () => {
    const sql = await client.selectTopSql('users', 10, 20, [], [], null, ['id', 'name']);
    expect(sql).toBe('SELECT id, name FROM users LIMIT 20 START 10');
  });

  it("Should generate select top SQL with filters", async () => {
    const filters = [
      { field: 'age', type: '>', value: 18 },
      { field: 'status', type: '=', value: 'active' }
    ];
    const sql = await client.selectTopSql('users', 0, 10, [], filters);
    expect(sql).toBe('SELECT * FROM users WHERE age > 18 AND status == "active" LIMIT 10');
  });

  it("Should generate select top SQL with ordering", async () => {
    const orderBy = [
      { field: 'name', dir: 'ASC' },
      { field: 'created_at', dir: 'DESC' }
    ];
    const sql = await client.selectTopSql('users', 0, 10, orderBy, []);
    expect(sql).toBe('SELECT * FROM users ORDER BY name ASC, created_at DESC LIMIT 10');
  });

  it("Should get query for select top", async () => {
    const query = await client.getQuerySelectTop('users', 5);
    expect(query).toBe('SELECT * FROM users LIMIT 5');
  });

  it("Should get primary key correctly", async () => {
    const pk = await client.getPrimaryKey('users');
    expect(pk).toBe('id');
  });

  it("Should get primary keys correctly", async () => {
    const pks = await client.getPrimaryKeys('users');
    expect(pks).toEqual([{
      columnName: 'id',
      position: 1
    }]);
  });

  it("Should return correct default charset", async () => {
    const charset = await client.getDefaultCharset();
    expect(charset).toBe('UTF-8');
  });

  it("Should return empty arrays for unsupported features", async () => {
    expect(await client.listSchemas()).toEqual([]);
    expect(await client.listCharsets()).toEqual([]);
    expect(await client.listCollations('utf8')).toEqual([]);
    expect(await client.listMaterializedViews()).toEqual([]);
    expect(await client.listRoutines()).toEqual([]);
    expect(await client.getTableReferences('users')).toEqual([]);
    expect(await client.getTableKeys('users')).toEqual([]);
    expect(await client.listTableTriggers('users')).toEqual([]);
    expect(await client.listTableIndexes('users')).toEqual([]);
    expect(await client.listMaterializedViewColumns('users')).toEqual([]);
  });

  it("Should wrap identifiers correctly", () => {
    expect(client.wrapIdentifier('column_name')).toBe('`column_name`');
    expect(client.wrapIdentifier('*')).toBe('*');
    expect(client.wrapIdentifier('table`with`backticks')).toBe('`table``with``backticks`');
  });

  it("Should parse table columns correctly", () => {
    const stringColumn = client.parseTableColumn({ name: 'name', type: 'string' });
    expect(stringColumn).toEqual({ name: 'name', bksType: 'STRING' });

    const numberColumn = client.parseTableColumn({ name: 'age', type: 'number' });
    expect(numberColumn).toEqual({ name: 'age', bksType: 'NUMBER' });

    const boolColumn = client.parseTableColumn({ name: 'active', type: 'boolean' });
    expect(boolColumn).toEqual({ name: 'active', bksType: 'BOOLEAN' });

    const dateColumn = client.parseTableColumn({ name: 'created', type: 'datetime' });
    expect(dateColumn).toEqual({ name: 'created', bksType: 'DATE' });

    const objectColumn = client.parseTableColumn({ name: 'metadata', type: 'object' });
    expect(objectColumn).toEqual({ name: 'metadata', bksType: 'JSON' });

    const arrayColumn = client.parseTableColumn({ name: 'tags', type: 'array' });
    expect(arrayColumn).toEqual({ name: 'tags', bksType: 'ARRAY' });

    const unknownColumn = client.parseTableColumn({ name: 'unknown', type: 'someweirdtype' });
    expect(unknownColumn).toEqual({ name: 'unknown', bksType: 'UNKNOWN' });
  });

  it("Should throw errors for unsupported operations", async () => {
    await expect(client.executeApplyChanges({})).rejects.toThrow('Apply changes not implemented');
    await expect(client.setTableDescription('users', 'desc')).rejects.toThrow('Table descriptions not supported');
    await expect(client.setElementNameSql('users', 'people', 'TABLE')).rejects.toThrow('Renaming elements not supported');
    await expect(client.dropElement('users', 'TABLE')).rejects.toThrow('Dropping elements not implemented');
    await expect(client.truncateElementSql('users', 'TABLE')).rejects.toThrow('Truncating elements not implemented');
    await expect(client.duplicateTable('users', 'users_copy')).rejects.toThrow('Duplicating tables not supported');
    await expect(client.duplicateTableSql('users', 'users_copy')).rejects.toThrow('Duplicating tables not supported');
    await expect(client.createDatabase('newdb', 'utf8', 'utf8_general_ci')).rejects.toThrow('Creating databases not implemented');
    await expect(client.createDatabaseSQL()).rejects.toThrow('Creating databases not implemented');
    await expect(client.getTableCreateScript('users')).rejects.toThrow('Table create scripts not available');
    await expect(client.truncateAllTables()).rejects.toThrow('Truncating all tables not implemented');
    await expect(client.selectTopStream('users', [], [], 100)).rejects.toThrow('Stream results not implemented');
    await expect(client.queryStream('SELECT * FROM users', 100)).rejects.toThrow('Stream results not implemented');
  });
});