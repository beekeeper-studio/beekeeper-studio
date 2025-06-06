import ImportClass from '@/lib/import/'

describe('Import Class', () => {
  let importInstance

  beforeEach(() => {
    const mockOptions = {
      trimWhitespaces: true,
      nullableValues: ['NULL', 'NONE', 'EMPTY']
    }
    const mockConnection = {}
    importInstance = new ImportClass('test.csv', mockOptions, mockConnection)
  })

  describe('checkDataType', () => {
    test('should return "null" for null or undefined values', () => {
      expect(importInstance.checkDataType(null)).toBe('null')
      expect(importInstance.checkDataType(undefined)).toBe('null')
    })

    test('should return "dateType" for Date objects', () => {
      expect(importInstance.checkDataType(new Date())).toBe('dateType')
    })

    test('should return "booleanType" for boolean values', () => {
      expect(importInstance.checkDataType(true)).toBe('booleanType')
      expect(importInstance.checkDataType(false)).toBe('booleanType')
    })

    test('should return "integerType" for integer numbers', () => {
      expect(importInstance.checkDataType(42)).toBe('integerType')
      expect(importInstance.checkDataType('42')).toBe('integerType')
    })

    test('should return "numberType" for floating-point numbers', () => {
      expect(importInstance.checkDataType(42.5)).toBe('numberType')
      expect(importInstance.checkDataType('42.5')).toBe('numberType')
    })

    test('should return "stringType" for non-numeric strings', () => {
      expect(importInstance.checkDataType('hello')).toBe('stringType')
      expect(importInstance.checkDataType('42px')).toBe('stringType')
    })
  })

  describe('generateColumnTypesFromFile', () => {
    test('should generate column types based on data preview', async () => {
      jest.spyOn(importInstance, 'getPreview').mockResolvedValue({
        data: [
          { id: '1', name: 'Alice', age: '25', active: 'true' },
          { id: '2', name: 'Bob', age: '30', active: 'false' },
          { id: '3', name: null, age: '30', active: 'false' },
        ],
        meta: {
          fields: ['id', 'name', 'age', 'active']
        }
      })

      const columnTypes = await importInstance.generateColumnTypesFromFile()

      expect(columnTypes).toEqual([
        { columnName: 'id', primary: true, dataTypes: new Set(['integerType']) },
        { columnName: 'name', primary: false, dataTypes: new Set(['null', 'stringType']) },
        { columnName: 'age', primary: false, dataTypes: new Set(['integerType']) },
        { columnName: 'active', primary: false, dataTypes: new Set(['stringType']) }
      ])
    })
  })
})
