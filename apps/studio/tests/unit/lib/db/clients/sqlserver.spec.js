import { SqlServerChangeBuilder } from '@shared/lib/sql/change_builder/SqlServerChangeBuilder';

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
    const expected = 'ALTER TABLE [public].[foo] ADD COLUMN [a] int NOT NULL;'
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
    const expected = "sp_rename 'dbo.foo.a', 'b', 'COLUMN';"
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