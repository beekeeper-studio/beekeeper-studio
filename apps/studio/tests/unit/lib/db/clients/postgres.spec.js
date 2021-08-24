import { testOnly } from '../../../../../src/lib/db/clients/postgresql'


describe("Postgres UNIT tests (no connection required)", () => {
  it("should pass a canary test", () => {
    expect(1).toBe(1)
  })

  it("Should parseRowQueryResult when array", () => {
    const f = testOnly.parseRowQueryResult
    const data = {
      command: 'SELECT',
      fields: [{name: 'foo'}],
      rows: [['bananas'], ['apples']]
    }

    const expected = {
      rows: [{c0: 'bananas'}, {c0: 'apples'}],
      fields: [{id: 'c0', name: 'foo', dataType: 'user-defined'}],
      rowCount: 2,
      affectedRows: undefined,
      command: 'SELECT'
    }
    expect(f(data, undefined, true)).toStrictEqual(expected)


  })

  it("should parseRowQueryResult when object", () => {
    const f = testOnly.parseRowQueryResult
    const data = {
      command: 'SELECT',
      fields: [{name: 'foo'}],
      rows: [{foo: 'bananas'}, {foo: 'apples'}]
    }

    const expected = {
      rows: [{foo: 'bananas'}, {foo: 'apples'}],
      fields: [{id: 'foo', name: 'foo', dataType: 'user-defined'}],
      rowCount: 2,
      affectedRows: undefined,
      command: 'SELECT'
    }
    expect(f(data, undefined, false)).toStrictEqual(expected)
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
    const result = await testOnly.alterTableSql(null, input)
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
    const result = await testOnly.alterTableSql(null, input);
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

    const result = await testOnly.alterTableSql(null, input);
    const expected = 'ALTER TABLE "public"."foo" ADD COLUMN "bar" varchar(255) NULL DEFAULT \'Hello Fella\';'
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
    const result = await testOnly.alterTableSql(null, input)
    const expected = 'ALTER TABLE "public"."foo" ADD COLUMN "a" int NOT NULL, DROP COLUMN "c", ALTER COLUMN "b" TYPE char;COMMENT ON COLUMN "public"."foo"."d" IS \'comment!\';'
    expect(result).toBe(expected);
  })

})