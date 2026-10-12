import { checkEmptyFilters, isBlank, removeUnsortableColumnsFromSortBy, isNumericDataType, isDateDataType, typedArrayToString, encodedStringLength } from "@/common/utils"
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

describe("isNumericDataType", () => {
  it("should all be numeric types", () => {
    expect(isNumericDataType('int2(16,0)')).toBe(true)
    expect(isNumericDataType('numeric(4,2)')).toBe(true)
    expect(isNumericDataType('int4(16,0)')).toBe(true)
    expect(isNumericDataType('decimal(2,12)')).toBe(true)
    expect(isNumericDataType('smallint')).toBe(true)
  })

  it("should not be numeric types", () => {
    expect(isNumericDataType('blerns')).toBe(false)
    expect(isNumericDataType('varchar(255)')).toBe(false)
    expect(isNumericDataType('date')).toBe(false)
    expect(isNumericDataType('text')).toBe(false)
  })

  // BUG: 'interval' (a Postgres date/time type) starts with 'int' and is
  // incorrectly classified as numeric. It's also picked up by
  // isDateDataType, so the same value is simultaneously "numeric" and
  // "date" — which affects how IN-clause copy quotes the values
  // (tableMenu.ts skips quoting for numeric types).
  it("should not classify interval as numeric", () => {
    expect(isNumericDataType('interval')).toBe(false)
    expect(isNumericDataType('INTERVAL')).toBe(false)
    expect(isNumericDataType('interval year to month')).toBe(false)
  })
})

describe("isDateDataType", () => {
  it("should all be date types", () => {
    expect(isDateDataType('timestamp with time zone')).toBe(true)
    expect(isDateDataType('date')).toBe(true)
    expect(isDateDataType('interval year to month')).toBe(true)
    expect(isDateDataType('DATETIME')).toBe(true)
    expect(isDateDataType('TIMESTAMP')).toBe(true)
    expect(isDateDataType('TIMESTAMP WITH LOCAL TIME ZONE')).toBe(true)
    expect(isDateDataType('DATETIMEOFFSET')).toBe(true)
    expect(isDateDataType('INTERVAL')).toBe(true)
    expect(isDateDataType('TIMETZ')).toBe(true)
  })

  it("should not be date types", () => {
    expect(isDateDataType('int2(16,0)')).toBe(false)
    expect(isDateDataType('varchar(255)')).toBe(false)
    expect(isDateDataType('text')).toBe(false)
  })
})

describe("typedArrayToString", () => {
  const bytes = Uint8Array.from({ length: 1000 }, (_, i) => i % 256)

  it('converts the whole array when maxChars is not provided', () => {
    expect(typedArrayToString(bytes, 'hex')).toHaveLength(2000)
    expect(typedArrayToString(new Uint8Array([104, 105]), 'base64')).toBe('aGk=')
  })

  it('only converts enough leading bytes for maxChars in hex', () => {
    const result = typedArrayToString(bytes, 'hex', 256)
    // hex needs ceil(maxChars / 2) bytes
    expect(result).toHaveLength(256)
    expect(result).toBe(typedArrayToString(bytes.subarray(0, 128), 'hex'))
  })

  it('only converts enough leading bytes for maxChars in base64', () => {
    const result = typedArrayToString(bytes, 'base64', 256)
    // base64 needs floor(maxChars / 4) * 3 bytes
    expect(result).toHaveLength(256)
    expect(result).toBe(typedArrayToString(bytes.subarray(0, 192), 'base64'))
  })

  it('leaves arrays shorter than the budget untouched', () => {
    expect(typedArrayToString(new Uint8Array([1, 2, 3]), 'hex', 256)).toBe('010203')
  })

  it('handles empty arrays with a maxChars budget', () => {
    expect(typedArrayToString(new Uint8Array(0), 'hex', 256)).toBe('')
  })

  it('works on non-Uint8Array views', () => {
    const buffer = new ArrayBuffer(1000)
    new Uint8Array(buffer).set([1, 2, 3])
    const view = new DataView(buffer)
    const result = typedArrayToString(view, 'hex', 256)
    expect(result).toHaveLength(256)
    expect(result.startsWith('010203')).toBe(true)
  })
})

describe("encodedStringLength", () => {
  it('matches what typedArrayToString actually produces', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 17, 100]) {
      const bytes = Uint8Array.from({ length }, (_, i) => i % 256)
      expect(encodedStringLength(length, 'hex')).toBe(typedArrayToString(bytes, 'hex').length)
      expect(encodedStringLength(length, 'base64')).toBe(typedArrayToString(bytes, 'base64').length)
    }
  })

  it('does not need the buffer to compute the length', () => {
    // The whole point: decide whether to truncate without paying to encode.
    expect(encodedStringLength(1_000_000, 'hex')).toBe(2_000_000)
    expect(encodedStringLength(1_000_000, 'base64')).toBe(1_333_336)
  })
})
