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
})

