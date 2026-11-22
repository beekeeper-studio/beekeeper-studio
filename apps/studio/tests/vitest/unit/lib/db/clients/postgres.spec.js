import { describe, it, expect, vi, beforeAll } from "vitest";
import { PostgresClient } from '@/lib/db/clients/postgresql'

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
      command: 'SELECT',
      text: 'SELECT foo FROM bar'
    }

    const command = {
      type: 'SELECT',
      text: 'SELECT foo FROM bar'
    }
    expect(client.parseRowQueryResult(data, command, true)).toStrictEqual(expected)
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
      command: 'SELECT',
      text: 'SELECT foo FROM bar'
    }

    const command = {
      type: 'SELECT',
      text: 'SELECT foo FROM bar'
    }
    expect(client.parseRowQueryResult(data, command, false)).toStrictEqual(expected)
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
    client.wrapTable = vi.fn().mockReturnValue('"public"."test_table"');

    // Mock methods that may fail with permission errors
    client.driverExecuteSingle = vi.fn().mockRejectedValue(new Error('permission denied for function pg_relation_size'));
    client.listTableIndexes = vi.fn().mockRejectedValue(new Error('permission denied'));
    client.listTableTriggers = vi.fn().mockRejectedValue(new Error('permission denied'));
    client.listTablePartitions = vi.fn().mockRejectedValue(new Error('permission denied'));
    client.getTableOwner = vi.fn().mockRejectedValue(new Error('permission denied'));

    // Mock getTableKeys to return relations successfully (this should work with read-only)
    client.getTableKeys = vi.fn().mockResolvedValue(mockRelations);

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

  it("Should fetch the create script for the specific routine overload", async () => {
    client.driverExecuteSingle = vi.fn().mockResolvedValue({
      rows: [{ pg_get_functiondef: 'CREATE OR REPLACE FUNCTION public.foo(a integer) ...' }]
    });

    const result = await client.getRoutineCreateScript('foo', 'function', 'public', '16385');

    expect(client.driverExecuteSingle).toHaveBeenCalledWith(
      expect.stringContaining('AND p.oid = $3::oid'),
      { params: ['foo', 'public', '16385'] }
    );
    expect(result).toEqual(['CREATE OR REPLACE FUNCTION public.foo(a integer) ...']);
  })

  describe("parseForeignKeys (default BasicDatabaseClient mapping)", () => {
    it("reads the shared column names and normalizes catalog values", () => {
      const keys = client.parseForeignKeys([
        {
          constraint_name: 0,
          from_schema: null,
          from_table: "orders",
          from_column: "customer_id",
          to_table: "customers",
          to_column: "id",
          ordinal_position: "1",
          on_update: null,
          on_delete: "CASCADE",
        },
      ])

      expect(keys).toEqual([
        {
          constraintName: "0",
          fromSchema: "",
          fromTable: "orders",
          fromColumn: "customer_id",
          toSchema: "",
          toTable: "customers",
          toColumn: "id",
          onUpdate: undefined,
          onDelete: "CASCADE",
          isComposite: false,
        },
      ])
    })

    it("pairs the columns of a composite key by ordinal_position", () => {
      const base = { constraint_name: "child_fk", from_schema: "public", from_table: "child", to_schema: "public", to_table: "parent" }
      const keys = client.parseForeignKeys([
        { ...base, from_column: "ref_id2", to_column: "parent_id2", ordinal_position: 2 },
        { ...base, from_column: "ref_id1", to_column: "parent_id1", ordinal_position: 1 },
      ])

      expect(keys).toHaveLength(1)
      expect(keys[0]).toMatchObject({
        isComposite: true,
        fromColumn: ["ref_id1", "ref_id2"],
        toColumn: ["parent_id1", "parent_id2"],
      })
    })
  })

  describe("buildSelectTopQueries selects", () => {
    const build = (selects) => client.buildSelectTopQueries({
      table: 'users', schema: 'public', selects, filters: [], orderBy: [],
      limit: 100, offset: 0, version: { number: 160000 }, inlineParams: true,
    }).query.replace(/\s+/g, ' ').trim()

    it("keeps * unquoted", () => {
      expect(build(['*'])).toBe('SELECT * FROM "public"."users" LIMIT 100 OFFSET 0')
    })

    it("quotes column names so mixed case and reserved words work", () => {
      expect(build(['id', 'UserName', 'order']))
        .toBe('SELECT "id", "UserName", "order" FROM "public"."users" LIMIT 100 OFFSET 0')
    })
  })

  // Reproduced in the running app against postgres:18beta1: partitions were
  // listed as plain tables, the Partitions tab was missing and the triggers
  // query failed with `column "condition_timing" does not exist`.
  describe("getVersion", () => {
    const versionOf = async (version) => {
      const c = new PostgresClient(null, null);
      c.driverExecuteSingle = vi.fn().mockResolvedValue({ rows: [{ version }] });
      return await c.getVersion();
    }

    it("parses release versions", async () => {
      const v = await versionOf("PostgreSQL 16.16 (Debian 16.16-1.pgdg13+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit");
      expect(v.number).toBe(161600);
      expect(v.hasPartitions).toBe(true);
    })

    it("parses the other documented version strings", async () => {
      expect((await versionOf("PostgreSQL 9.4.26 on x86_64-pc-linux-gnu (Debian 9.4.26-1.pgdg90+1), compiled by gcc (Debian 6.3.0-18+deb9u1) 6.3.0 20170516, 64-bit")).number).toBe(90426);
      expect((await versionOf("PostgreSQL 12.3 (Debian 12.3-1.pgdg100+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 8.3.0-6) 8.3.0, 64-bit")).number).toBe(120300);
      expect((await versionOf("PostgreSQL 15.4, compiled by Visual C++ build 1914, 64-bit")).number).toBe(150400);
      expect((await versionOf("PostgreSQL 9.6beta1 on x86_64-pc-linux-gnu, compiled by gcc (Debian 4.9.2-10) 4.9.2, 64-bit")).number).toBe(90600);
      const cockroach = await versionOf("CockroachDB CCL v20.1.1 (x86_64-unknown-linux-gnu, built 2020/05/19 14:46:06, go1.13.9)");
      expect(cockroach.number).toBe(200101);
      expect(cockroach.hasPartitions).toBe(false);
    })

    it("does not read a four part version as a newer server", async () => {
      const v = await versionOf("EnterpriseDB 9.6.2.7 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 4.1.2 20080704 (Red Hat 4.1.2-55), 64-bit");
      expect(v.number).toBe(90602);
      expect(v.hasPartitions).toBe(false);
    })

    const preReleases = {
      "PostgreSQL 18beta1 (Debian 18~beta1-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit": 180000,
      "PostgreSQL 17rc1 (Debian 17~rc1-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit": 170000,
      "PostgreSQL 19devel on x86_64-pc-linux-gnu, compiled by gcc (GCC) 14.2.0, 64-bit": 190000,
    }

    Object.entries(preReleases).forEach(([version, expected]) => {
      it(`treats pre-release '${version.split(" (")[0].split(" on ")[0]}' as its major version`, async () => {
        const v = await versionOf(version);
        expect(v.number).toBe(expected);
        expect(v.hasPartitions).toBe(true);
      })
    })
  })
})
