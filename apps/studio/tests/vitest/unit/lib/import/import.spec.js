import { describe, test, expect, vi, beforeEach } from "vitest";
import ImportClass, { betterColumnName } from '@/lib/import/'

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
      vi.spyOn(importInstance, 'getPreview').mockResolvedValue({
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

    test('should not throw when data rows have extra keys absent from meta.fields', async () => {
      // Reproduces the bug where columns.indexOf(key) returns -1 for an extra key,
      // arrInd == null was false (-1 != null), so dataAnalysis[-1].add() threw TypeError.
      vi.spyOn(importInstance, 'getPreview').mockResolvedValue({
        data: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob', extra: 'value' },  // 'extra' is not in meta.fields
        ],
        meta: {
          fields: ['id', 'name']
        }
      })

      const columnTypes = await importInstance.generateColumnTypesFromFile()

      expect(columnTypes).toEqual([
        { columnName: 'id', primary: true, dataTypes: new Set(['integerType']) },
        { columnName: 'name', primary: false, dataTypes: new Set(['stringType']) },
      ])
    })
  })

  describe('betterColumnName', () => {
    test('should replace periods with underscores', () => {
      expect(betterColumnName('first.name')).toBe('first_name')
      expect(betterColumnName('amount.usd')).toBe('amount_usd')
      expect(betterColumnName('order.item.id')).toBe('order_item_id')
    })

    test('should replace whitespace with underscores', () => {
      expect(betterColumnName('first name')).toBe('first_name')
      expect(betterColumnName('Amount USD')).toBe('amount_usd')
    })

    test('should handle combinations of spaces and periods', () => {
      expect(betterColumnName('user . name')).toBe('user_name')
      expect(betterColumnName('data..set...name')).toBe('data_set_name')
    })

    test('should trim leading and trailing periods or underscores', () => {
      expect(betterColumnName('.hidden.')).toBe('hidden')
      expect(betterColumnName('_user_id_')).toBe('user_id')
      expect(betterColumnName('..field..')).toBe('field')
    })

    test('should convert to lowercase', () => {
      expect(betterColumnName('FIRST.NAME')).toBe('first_name')
      expect(betterColumnName('User.EmailAddress')).toBe('user_emailaddress')
    })

    test('should handle empty or falsy strings', () => {
      expect(betterColumnName('')).toBe('')
      expect(betterColumnName(null)).toBe('')
      expect(betterColumnName(undefined)).toBe('')
    })
  })
})
