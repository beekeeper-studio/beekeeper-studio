import { testOnly } from '../../../../../src/lib/db/clients/mysql'
import { parseIndexColumn } from '../../../../../src/common/utils'
import { MySqlChangeBuilder } from "@shared/lib/sql/change_builder/MysqlChangeBuilder"


describe("MySQL UNIT tests (no connection required)", () => {
  it("should pass a canary test", () => {
    expect(1).toBe(1)
  })

  it("should parse empty fields", () => {
    const expected = []
    const result = testOnly.parseFields(undefined, false)
    expect(result).toMatchObject(expected)
    expect(testOnly.parseFields(undefined, true)).toMatchObject(expected)
  })

  it("should parse object fields", () => {
    const expected = [{ id: 'name', name: 'name'}]
    const result = testOnly.parseFields([{name: 'name'}])
    expect(result).toMatchObject(expected)
  })

  it("should parse index column for alter index", () => {
    const samples = {
      "title": { name: 'title', order: 'ASC', prefix: null },
      "title DESC": { name: 'title', order: 'DESC', prefix: null },
      "title(10) DESC": { name: 'title', order: 'DESC', prefix: 10 },
      "title (10) DESC": { name: 'title', order: 'DESC', prefix: 10 },
      // "desc(5)": { name: 'desc(5)', order: 'ASC', prefix: null },
      // "desc(5)(5)": { name: 'desc(5)', order: 'ASC', prefix: '5' },
      // "desc(5) (5)": { name: 'desc(5)', order: 'ASC', prefix: '5' },
    }
    for (const [input, output] of Object.entries(samples)) {
      expect(parseIndexColumn(input)).toMatchObject(output)
    }
  })

  // BUG: parseIndexColumn checks `str.endsWith('DESC')` to detect descending
  // order, but with no preceding-whitespace requirement any column name that
  // happens to end in the literal characters 'DESC' (e.g. 'FOODESC',
  // 'PRODDESC', or just 'DESC' as a column name) gets the order silently
  // flipped to DESC even when the user picked the plain ASC option.
  it("should not flip ASC to DESC for column names that end in 'DESC'", () => {
    expect(parseIndexColumn('FOODESC')).toMatchObject({
      name: 'FOODESC', order: 'ASC', prefix: null,
    })
    expect(parseIndexColumn('DESC')).toMatchObject({
      name: 'DESC', order: 'ASC', prefix: null,
    })
  })
})

describe("MysqlChangeBuilder", () => {
  let builder
  beforeEach(() => {
    builder = new MySqlChangeBuilder('beans', [])
  })

  it("test", (() => {
    const initArr = [
      {columnName: 'a', dataType: 'something'},
      {columnName: 'b', dataType: 'something'},
      {columnName: 'c', dataType: 'something'},
      {columnName: 'd', dataType: 'something'},
      {columnName: 'e', dataType: 'something'},
      {columnName: 'f', dataType: 'something'},
      {columnName: 'g', dataType: 'something'},
      {columnName: 'h', dataType: 'something'},
      {columnName: 'i', dataType: 'something'}
    ]

    const updatedArr = [
      {columnName: 'd', dataType: 'something'},
      {columnName: 'b', dataType: 'something'},
      {columnName: 'c', dataType: 'something'},
      {columnName: 'a', dataType: 'something'},
      {columnName: 'f', dataType: 'something'},
      {columnName: 'e', dataType: 'something'},
      {columnName: 'h', dataType: 'something'},
      {columnName: 'g', dataType: 'something'},
      {columnName: 'i', dataType: 'something'}
    ]

    const updatedArrStuff = [
      'MODIFY `d` something FIRST',
      'MODIFY `a` something AFTER `c`',
      'MODIFY `f` something AFTER `a`',
      'MODIFY `e` something AFTER `f`',
      'MODIFY `h` something AFTER `e`',
      'MODIFY `g` something AFTER `h`'
    ]

    expect(builder.reorderColumns(initArr, updatedArr)).toEqual(`ALTER TABLE \`beans\` ${updatedArrStuff.join(',')};`)
  }))

  describe("ddl() CHARACTER SET / COLLATE handling (issue #4082)", () => {
    const existingVarchar = {
      columnName: 'my_field',
      dataType: 'varchar(4)',
      nullable: true,
      characterSet: 'utf8mb4',
      collation: 'utf8mb4_general_ci',
    }

    it("does not emit CHARACTER SET or COLLATE when changing varchar to INT", () => {
      const updated = { ...existingVarchar, dataType: 'INT UNSIGNED' }
      const result = builder.ddl(existingVarchar, updated)
      expect(result).toContain('MODIFY `my_field` INT UNSIGNED')
      expect(result).not.toContain('CHARACTER SET')
      expect(result).not.toContain('COLLATE')
    })

    it("retains CHARACTER SET and COLLATE when changing varchar(4) to varchar(100)", () => {
      const updated = { ...existingVarchar, dataType: 'varchar(100)' }
      const result = builder.ddl(existingVarchar, updated)
      expect(result).toContain('CHARACTER SET utf8mb4')
      expect(result).toContain('COLLATE utf8mb4_general_ci')
    })

    it.each([
      ['DATETIME'],
      ['DECIMAL(10,2)'],
      ['JSON'],
      ['BLOB'],
      ['BIGINT'],
      ['DATE'],
      ['VARBINARY(255)'],
    ])("does not emit CHARACTER SET or COLLATE when changing varchar to %s", (dataType) => {
      const updated = { ...existingVarchar, dataType }
      const result = builder.ddl(existingVarchar, updated)
      expect(result).not.toContain('CHARACTER SET')
      expect(result).not.toContain('COLLATE')
    })

    it.each([
      ['TEXT'],
      ['MEDIUMTEXT'],
      ['LONGTEXT'],
      ['TINYTEXT'],
      ["ENUM('a','b')"],
      ["SET('a','b')"],
      ['CHAR(10)'],
    ])("retains CHARACTER SET and COLLATE when changing varchar to %s", (dataType) => {
      const updated = { ...existingVarchar, dataType }
      const result = builder.ddl(existingVarchar, updated)
      expect(result).toContain('CHARACTER SET utf8mb4')
      expect(result).toContain('COLLATE utf8mb4_general_ci')
    })

    it("emits no charset clauses when the existing column has none, regardless of new type", () => {
      const existing = {
        columnName: 'my_field',
        dataType: 'varchar(4)',
        nullable: true,
      }
      const updated = { ...existing, dataType: 'varchar(100)' }
      const result = builder.ddl(existing, updated)
      expect(result).not.toContain('CHARACTER SET')
      expect(result).not.toContain('COLLATE')
    })
  })

  describe("AUTO_INCREMENT (table-level)", () => {
    it("endSql returns null when no autoIncrement is requested", () => {
      expect(builder.endSql({ table: 'beans' })).toBeNull()
    })

    it("endSql emits an ALTER TABLE ... AUTO_INCREMENT statement", () => {
      expect(builder.endSql({ table: 'beans', autoIncrement: 1042 }))
        .toBe('ALTER TABLE `beans` AUTO_INCREMENT = 1042')
    })

    it("endSql truncates and rejects non-positive / invalid values", () => {
      expect(builder.endSql({ table: 'beans', autoIncrement: 1042.9 }))
        .toBe('ALTER TABLE `beans` AUTO_INCREMENT = 1042')
      expect(builder.endSql({ table: 'beans', autoIncrement: 0 })).toBeNull()
      expect(builder.endSql({ table: 'beans', autoIncrement: -5 })).toBeNull()
      expect(builder.endSql({ table: 'beans', autoIncrement: NaN })).toBeNull()
    })

    it("alterTable produces only the AUTO_INCREMENT statement when nothing else changed", () => {
      expect(builder.alterTable({ table: 'beans', autoIncrement: 1042 }))
        .toBe('ALTER TABLE `beans` AUTO_INCREMENT = 1042;')
    })

    it("alterTable appends AUTO_INCREMENT after a column rename", () => {
      const renameBuilder = new MySqlChangeBuilder('beans', [
        { columnName: 'a', dataType: 'int', nullable: true },
      ])
      const sql = renameBuilder.alterTable({
        table: 'beans',
        alterations: [{ changeType: 'columnName', columnName: 'a', newValue: 'b' }],
        autoIncrement: 50,
      })
      expect(sql).toContain('CHANGE `a` `b`')
      expect(sql).toContain('ALTER TABLE `beans` AUTO_INCREMENT = 50')
    })
  })
})

