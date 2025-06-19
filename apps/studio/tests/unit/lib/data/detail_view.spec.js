import fs from "fs";
import path from "path";
import {
  deepFilterObjectProps,
  findKeyPosition,
  findValueInfo,
  eachPaths,
  parseRowDataForJsonViewer
} from "../../../../src/lib/data/jsonViewer";

const jsonStr = fs.readFileSync(
  path.resolve(__dirname, "./sample.json"),
  "utf8"
);

describe("Detail View", () => {
  it("should locate a key property in a JSON text", () => {
    expect(findKeyPosition(jsonStr, ["customer_id"])).toBe(56);
    expect(findKeyPosition(jsonStr, ["inventory_id", "film_id", "original_language_id"])).toBe(15);
    expect(findKeyPosition(jsonStr, ["inventory_id", "store_id", "manager_staff_id", "address_id"])).toBe(33);
    expect(findKeyPosition(jsonStr, ["inventory_id", "store_id", "manager_staff_id", "store_id"])).toBe(35);
    expect(findKeyPosition(jsonStr, ["inventory_id", "store_id", "address_id", "city_id"])).toBe(47);
    expect(findKeyPosition(jsonStr, ["staff_id", "address_id"])).toBe(62);
    expect(findKeyPosition(jsonStr, ["staff_id", "store_id"])).toBe(64);
  });

  it("should find a value info in a line of JSON text", () => {
    const lines = jsonStr.split("\n");
    expect(findValueInfo(lines[15])).toStrictEqual({
      from: 30,
      to: 34,
      value: "null",
    })
  })

  it("should filter a JSON object", () => {
    const obj = JSON.parse(jsonStr);
    const filtered = deepFilterObjectProps(obj, "address");
    expect(filtered).toStrictEqual({
      inventory_id: {
        store_id: {
          address_id: {
            address: "47 MySakila Drive",
            address2: null,
            address_id: 1,
            city_id: 300,
            district: " ",
            last_update: "2006-02-15 04:45:30",
            phone: " ",
            postal_code: null,
          },
          manager_staff_id: {
            address_id: 3,
          },
        },
      },
      staff_id: {
        address_id: 3,
      },
    })
  })

  it("should recursively iterate through a JSON object", () => {
    const obj = {
      a: 0,
      b: {
        c: 1,
        d: { e: 2 },
      },
    }
    const expected = [
      "a",
      "b.c",
      "b.d.e",
    ]
    const result = []
    eachPaths(obj, (path,val) => {
      result.push(path)
    })
    expect(result).toStrictEqual(expected)
  })

  describe('parseRowDataForJsonViewer', () => {
    it('should parse JSON string fields when dataType is JSON', () => {
      const rowData = {
        id: 1,
        jsonField: '{"name": "test", "value": 123}',
        nonJsonField: 'regular text'
      }
      
      const tableColumns = [
        { field: 'id', dataType: 'integer' },
        { field: 'jsonField', dataType: 'JSON' },
        { field: 'nonJsonField', dataType: 'text' }
      ]
      
      const result = parseRowDataForJsonViewer(rowData, tableColumns)
      
      expect(result.id).toBe(1)
      expect(result.jsonField).toEqual({ name: 'test', value: 123 })
      expect(result.nonJsonField).toBe('regular text')
    })
    
    it('should parse JSON string fields when dataType is JSONB', () => {
      const rowData = {
        id: 2,
        jsonbField: '["apple", "banana", "cherry"]',
        otherField: 'text value'
      }
      
      const tableColumns = [
        { field: 'id', dataType: 'integer' },
        { field: 'jsonbField', dataType: 'JSONB' },
        { field: 'otherField', dataType: 'varchar' }
      ]
      
      const result = parseRowDataForJsonViewer(rowData, tableColumns)
      
      expect(result.id).toBe(2)
      expect(result.jsonbField).toEqual(['apple', 'banana', 'cherry'])
      expect(result.otherField).toBe('text value')
    })
    
    it('should detect and parse JSON object strings even when dataType is not JSON', () => {
      const rowData = {
        id: 3,
        jsonLikeField: '{"key": "value", "nested": {"prop": true}}',
        textField: 'normal text'
      }
      
      const tableColumns = [
        { field: 'id', dataType: 'integer' },
        { field: 'jsonLikeField', dataType: 'text' },
        { field: 'textField', dataType: 'varchar' }
      ]
      
      const result = parseRowDataForJsonViewer(rowData, tableColumns)
      
      expect(result.id).toBe(3)
      expect(result.jsonLikeField).toEqual({ key: 'value', nested: { prop: true } })
      expect(result.textField).toBe('normal text')
    })
    
    it('should detect and parse JSON array strings even when dataType is not JSON', () => {
      const rowData = {
        id: 4,
        arrayLikeField: '[1, 2, 3, 4]',
        someField: 'text'
      }
      
      const tableColumns = [
        { field: 'id', dataType: 'integer' },
        { field: 'arrayLikeField', dataType: 'text' },
        { field: 'someField', dataType: 'varchar' }
      ]
      
      const result = parseRowDataForJsonViewer(rowData, tableColumns)
      
      expect(result.id).toBe(4)
      expect(result.arrayLikeField).toEqual([1, 2, 3, 4])
      expect(result.someField).toBe('text')
    })
    
    it('should handle JSON parsing errors gracefully', () => {
      const rowData = {
        id: 5,
        invalidJson: '{name: "missing quotes", broken: json}',
        validField: 'text'
      }
      
      const tableColumns = [
        { field: 'id', dataType: 'integer' },
        { field: 'invalidJson', dataType: 'JSON' },
        { field: 'validField', dataType: 'varchar' }
      ]
      
      // Spy on console.warn to verify it's called
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const result = parseRowDataForJsonViewer(rowData, tableColumns)
      
      expect(result.id).toBe(5)
      expect(result.invalidJson).toBe('{name: "missing quotes", broken: json}') // Should remain unchanged
      expect(result.validField).toBe('text')
      expect(consoleWarnSpy).toHaveBeenCalled()
      
      // Restore the spy
      consoleWarnSpy.mockRestore()
    })

    it('should not parse empty strings or non-string values', () => {
      const rowData = {
        id: 6,
        emptyField: '',
        nullField: null,
        numberField: 123
      }
      
      const tableColumns = [
        { field: 'id', dataType: 'integer' },
        { field: 'emptyField', dataType: 'text' },
        { field: 'nullField', dataType: 'text' },
        { field: 'numberField', dataType: 'integer' }
      ]
      
      const result = parseRowDataForJsonViewer(rowData, tableColumns)
      
      expect(result.id).toBe(6)
      expect(result.emptyField).toBe('')
      expect(result.nullField).toBeNull()
      expect(result.numberField).toBe(123)
    })
  })
});
