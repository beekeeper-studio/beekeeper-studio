import { checkEmptyFilters, isBlank, removeUnsortableColumnsFromSortBy } from "@/common/utils"
import { PostgresData } from '@/shared/lib/dialects/postgresql'
import { MysqlData } from '@/shared/lib/dialects/mysql'
import { SqliteData } from '@/shared/lib/dialects/sqlite'
import { SqlServerData } from '@/shared/lib/dialects/sqlserver'


describe("isBlank", () => {
  it("should be truthy for obviously blank things", () => {
    const list = ['', null, undefined, {}, new Set(), NaN]

    list.forEach((i) => expect(isBlank(i)).toBe(true))
  })

  it("should be falsy for numbers and such", () => {
    const list = [0, ' ', '123', { a: 1}, new Set([1, 2, 3])]
    list.forEach((i) => expect(isBlank(i)).toBe(false))
  })
})

describe("checkEmptyFilters", () => {

  const truthyCases = [
    [[{ type: '>', value: '' }], true],
    [[{ type: '>', value: '' }, { type: '>', value: '' }], true],
    [[{ type: '>', value: null }], true],
    [[{ type: '>', value: undefined }], true],
    [[], true],
  ]

  const falsyCases = [
    [[{ type: '>', value: ' ' }], false],
    [[{ type: '>', value: 'foo' }, { type: '>', value: '' }], false],
    [[{ type: '>', value: '' }, { type: '>', value: 'foo' }], false],
    [[{ type: '>', value: 0 }], false],
    [[{ type: '>', value: '1,2,3' }], false],
    [[], true],
  ]

  const allCases = [...truthyCases, ...falsyCases]

  allCases.forEach(([input, expected]) => {
    it(`${JSON.stringify(input)} should produce: ${expected}`, () => {
      expect(checkEmptyFilters(input)).toBe(expected)
    })
  })




})

describe("removeUnsortableColumnsFromSortBy", () => {
  const columns = [
    { columnName: 'id', dataType: 'integer' },
    { columnName: 'name', dataType: 'varchar' },
    { columnName: 'description', dataType: 'text' },
    { columnName: 'data', dataType: 'json' },
    { columnName: 'binary_data', dataType: 'blob' },
    { columnName: 'geo', dataType: 'geometry' },
    { columnName: 'xml_data', dataType: 'xml' },
    { columnName: 'binary_var', dataType: 'varbinary' }
  ]

  it('should remove JSON columns when sorting in MySQL', () => {
    const sortParams = [
      { field: 'id', dir: 'asc' },
      { field: 'data', dir: 'desc' },
      { field: 'binary_var', dir: 'asc' }
    ]
    
    const result = removeUnsortableColumnsFromSortBy(sortParams, columns, MysqlData.disallowedSortColumns)
    
    expect(result).toEqual([
      { field: 'id', dir: 'asc' }
    ])
  })

  it('should remove blob columns when sorting in SQLite', () => {
    const sortParams = [
      { field: 'name', dir: 'asc' },
      { field: 'binary_data', dir: 'desc' },
      { field: 'description', dir: 'asc' }
    ]
    
    const result = removeUnsortableColumnsFromSortBy(sortParams, columns, SqliteData.disallowedSortColumns)
    
    expect(result).toEqual([
      { field: 'name', dir: 'asc' },
      { field: 'description', dir: 'asc' }
    ])
  })

    it('should remove multiple unsortable columns in PostgreSQL', () => {
      const sortParams = [
        { field: 'id', dir: 'asc' },
        { field: 'data', dir: 'desc' },
        { field: 'geo', dir: 'asc' },
        { field: 'xml_data', dir: 'desc' },
        { field: 'name', dir: 'asc' }
      ]
      
      const result = removeUnsortableColumnsFromSortBy(sortParams, columns, PostgresData.disallowedSortColumns)
      
      expect(result).toEqual([
        { field: 'id', dir: 'asc' },
        { field: 'name', dir: 'asc' }
      ])
    })

    it('should remove geometry and XML columns when sorting in SQL Server', () => {
      const sortParams = [
        { field: 'id', dir: 'asc' },
        { field: 'geo', dir: 'desc' },
        { field: 'xml_data', dir: 'asc' },
        { field: 'name', dir: 'desc' }
      ]
      
      const result = removeUnsortableColumnsFromSortBy(sortParams, columns, SqlServerData.disallowedSortColumns)
      
      expect(result).toEqual([
        { field: 'id', dir: 'asc' },
        { field: 'name', dir: 'desc' }
      ])
    })

    it('should return all columns when no disallowed columns are specified', () => {
      const sortParams = [
        { field: 'id', dir: 'asc' },
        { field: 'data', dir: 'desc' }
      ]
      
      const result = removeUnsortableColumnsFromSortBy(sortParams, columns, [])
      
      expect(result).toEqual(sortParams)
    })

    it('should handle case insensitivity in column type comparison', () => {
      const columns = [
        { columnName: 'data', dataType: 'JSON' },
        { columnName: 'id', dataType: 'INTEGER' }
      ]
      
      const sortParams = [
        { field: 'data', dir: 'asc' },
        { field: 'id', dir: 'asc' }
      ]
      
      const result = removeUnsortableColumnsFromSortBy(sortParams, columns, MysqlData.disallowedSortColumns)
      
      expect(result).toEqual([
        { field: 'id', dir: 'asc' }
      ])
    })

    it('should handle column not found in table schema', () => {
      const sortParams = [
        { field: 'unknown_column', dir: 'asc' },
        { field: 'id', dir: 'desc' }
      ]
      
      const result = removeUnsortableColumnsFromSortBy(sortParams, columns, MysqlData.disallowedSortColumns)
      
      expect(result).toEqual([
        { field: 'id', dir: 'desc' }
      ])
    })

    it('should handle undefined disallowedSortColumns', () => {
      const sortParams = [
        { field: 'id', dir: 'asc' },
        { field: 'data', dir: 'desc' }
      ]
      
      const result = removeUnsortableColumnsFromSortBy(sortParams, columns, undefined)
      
      expect(result).toEqual(sortParams)
    })

})