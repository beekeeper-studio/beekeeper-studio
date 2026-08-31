import { SqlServerChangeBuilder } from '@shared/lib/sql/change_builder/SqlServerChangeBuilder';
import { SQLServerClient } from '@/lib/db/clients/sqlserver';
import { DatabaseElement } from '@/lib/db/types';

describe("SQL Server alter table codegen", () => {


  it("Should generate basic changes", () => {
    const input = {
      table: 'foo', schema: 'public',
      adds: [
        { columnName: 'a', dataType: 'int'}
      ]
    }

    const builder = new SqlServerChangeBuilder('foo', 'public', [], [])

    const result = builder.alterTable(input)
    const expected = 'ALTER TABLE [public].[foo] ADD [a] int NOT NULL;'
    expect(result).toBe(expected)
  })

  it("Should alter a column name", () => {
    const input = {
      table: 'foo', schema: 'dbo',
      alterations: [
        {
          columnName: 'a', changeType: 'columnName', newValue: 'b'
        }
      ]
    }

    const builder = new SqlServerChangeBuilder('foo', 'dbo', [{columnName: 'a', dataType: 'int'}], [])
    const result = builder.alterTable(input)
    const expected = "EXEC sp_rename '[dbo].[foo].[a]', 'b', 'COLUMN';"
    expect(result).toBe(expected)

  })

  it("Should replace a default", () => {
    const input = {
      table: 'foo',
      schema: 'dbo',
      alterations: [
        {
          'columnName': 'a',
          changeType: 'defaultValue',
          newValue: "'something'"
        }
      ]
    }
    const defaultConstraints = [
      {
        name: "DF_foo",
        column: "a",
        schema: "dbo",
        table: 'foo'
      }
    ]
    const builder = new SqlServerChangeBuilder('foo', 'dbo', [], defaultConstraints)
    const result = builder.alterTable(input)
    const expected = 'ALTER TABLE [dbo].[foo] DROP CONSTRAINT [DF_foo], ADD DEFAULT \'something\' FOR [a];'
  })

  it("Should add a default constraint", () => {
    const input = {
      table: 'foo',
      schema: 'dbo',
      alterations: [
        {
          'columnName': 'a',
          changeType: 'defaultValue',
          newValue: null
        }
      ]
    }
    const defaultConstraints = []
    const builder = new SqlServerChangeBuilder('foo', 'dbo', [], defaultConstraints)
    const result = builder.alterTable(input)
    const expected = 'ALTER TABLE [dbo].[foo] ADD DEFAULT \'something\' FOR [a];'
  })

  it("Should drop a default constraint", () => {
    const input = {
      table: 'foo',
      schema: 'dbo',
      alterations: [
        {
          'columnName': 'a',
          changeType: 'defaultValue',
          newValue: null
        }
      ]
    }
    const defaultConstraints = [
      {
        name: "DF_foo",
        column: "a",
        schema: "dbo",
        table: 'foo'
      }
    ]
    const builder = new SqlServerChangeBuilder('foo', 'dbo', [], defaultConstraints)
    const result = builder.alterTable(input)
    const expected = 'ALTER TABLE [dbo].[foo] DROP CONSTRAINT [DF_foo];'
  })
})

describe("SQL Server qualified-name handling for dotted table names (#3722)", () => {
  function makeClient() {
    const server = { config: { readOnlyMode: false } }
    const database = { database: 'test' }
    const client = new SQLServerClient(server, database)
    // Swallow the real driver path entirely.
    client.driverExecuteSingle = jest.fn().mockResolvedValue({ data: { recordset: [] } })
    return client
  }

  it("listTableTriggers wraps schema and table in brackets before quoting", async () => {
    const client = makeClient()
    await client.listTableTriggers('Common.Companies', 'dbo')
    const sql = client.driverExecuteSingle.mock.calls[0][0]
    expect(sql).toBe("EXEC sp_helptrigger '[dbo].[Common.Companies]'")
  })

  it("getTableProperties sizeQuery wraps schema and table in brackets before quoting", async () => {
    const client = makeClient()
    client.listTableTriggers = jest.fn().mockResolvedValue([])
    client.listTableIndexes = jest.fn().mockResolvedValue([])
    client.getTableKeys = jest.fn().mockResolvedValue([])
    // getTableDescription is private; it still calls driverExecuteSingle, which is mocked.
    await client.getTableProperties('Common.Companies', 'dbo')
    const sqls = client.driverExecuteSingle.mock.calls.map((c) => c[0])
    const sizeQuery = sqls.find((s) => s.includes('sp_spaceused'))
    expect(sizeQuery).toBe("EXEC sp_spaceused N'[dbo].[Common.Companies]'; ")
  })

  it("setElementNameSql wraps a dotted element name correctly", async () => {
    const client = makeClient()
    const sql = await client.setElementNameSql(
      'Common.Companies', 'NewName', DatabaseElement.TABLE, 'dbo'
    )
    expect(sql).toBe("EXEC sp_rename '[dbo].[Common.Companies]', 'NewName';")
  })

  it("setElementNameSql still emits canonical bracketed form for simple names", async () => {
    const client = makeClient()
    const sql = await client.setElementNameSql(
      'foo', 'bar', DatabaseElement.TABLE, 'dbo'
    )
    expect(sql).toBe("EXEC sp_rename '[dbo].[foo]', 'bar';")
  })

  it("setElementNameSql doubles embedded closing brackets", async () => {
    const client = makeClient()
    const sql = await client.setElementNameSql(
      'weird]name', 'new', DatabaseElement.TABLE, 'dbo'
    )
    expect(sql).toBe("EXEC sp_rename '[dbo].[weird]]name]', 'new';")
  })
})