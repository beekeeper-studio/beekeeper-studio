import { MysqlClient, testOnly } from '../../../../../src/lib/db/clients/mysql'
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

  describe("parseEnumValues", () => {
    it("parses a simple enum definition", () => {
      expect(testOnly.parseEnumValues("enum('a','b','c')")).toEqual(['a', 'b', 'c'])
    })

    it("is case-insensitive on the ENUM keyword", () => {
      expect(testOnly.parseEnumValues("ENUM('x','y')")).toEqual(['x', 'y'])
    })

    it("keeps commas that appear inside values", () => {
      expect(testOnly.parseEnumValues("enum('a,b','c')")).toEqual(['a,b', 'c'])
    })

    it("unescapes doubled single quotes", () => {
      expect(testOnly.parseEnumValues("enum('o''clock','noon')")).toEqual(["o'clock", 'noon'])
    })

    it("handles a single value", () => {
      expect(testOnly.parseEnumValues("enum('only')")).toEqual(['only'])
    })

    it("returns undefined for non-enum types", () => {
      expect(testOnly.parseEnumValues("varchar(20)")).toBeUndefined()
      expect(testOnly.parseEnumValues("int")).toBeUndefined()
      expect(testOnly.parseEnumValues("set('x','y')")).toBeUndefined()
      expect(testOnly.parseEnumValues(undefined)).toBeUndefined()
      expect(testOnly.parseEnumValues(null)).toBeUndefined()
    })
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

  describe("Multi-statement query error annotation (issue #4698)", () => {
    let client;
    beforeEach(() => {
      client = new MysqlClient(null, null);
    });

    it("should preserve single-query behavior when commands.length <= 1", async () => {
      const mockResult = { rows: [{ id: 1 }], columns: [{ name: 'id' }] };
      client.driverExecuteSingle = jest.fn().mockResolvedValue(mockResult);

      const results = await client.executeQuery('SELECT 1;');

      expect(client.driverExecuteSingle).toHaveBeenCalledWith('SELECT 1;', {
        params: {},
        rowsAsArray: undefined,
        connection: undefined,
      });
      expect(results).toHaveLength(1);
      expect(results[0].rows).toEqual([{ id: 1 }]);
    });

    it("should annotate first statement failure as (@ query #1) and not execute subsequent queries", async () => {
      client.identifyCommands = jest.fn().mockReturnValue([
        { text: 'FAIL 1;', type: 'UNKNOWN', executionType: 'UNKNOWN' },
        { text: 'SELECT 2;', type: 'SELECT', executionType: 'LISTING' },
        { text: 'SELECT 3;', type: 'SELECT', executionType: 'LISTING' },
      ]);
      client.driverExecuteSingle = jest.fn().mockImplementation((sql) => {
        if (sql === 'FAIL 1;') {
          return Promise.reject(new Error('Syntax error near FAIL'));
        }
        return Promise.resolve({ rows: [{ val: 2 }], columns: [] });
      });

      await expect(client.executeQuery('FAIL 1; SELECT 2; SELECT 3;'))
        .rejects.toThrow('Syntax error near FAIL (@ query #1)');

      expect(client.driverExecuteSingle).toHaveBeenCalledTimes(1);
      expect(client.driverExecuteSingle).toHaveBeenCalledWith('FAIL 1;', expect.anything());
    });

    it("should annotate middle statement failure as (@ query #2) and execute preceding queries only once", async () => {
      client.identifyCommands = jest.fn().mockReturnValue([
        { text: 'SELECT 1;', type: 'SELECT', executionType: 'LISTING' },
        { text: 'FAIL 2;', type: 'UNKNOWN', executionType: 'UNKNOWN' },
        { text: 'SELECT 3;', type: 'SELECT', executionType: 'LISTING' },
      ]);
      client.driverExecuteSingle = jest.fn().mockImplementation((sql) => {
        if (sql === 'FAIL 2;') {
          return Promise.reject(new Error('Table does not exist'));
        }
        return Promise.resolve({ rows: [{ val: 1 }], columns: [] });
      });

      await expect(client.executeQuery('SELECT 1; FAIL 2; SELECT 3;'))
        .rejects.toThrow('Table does not exist (@ query #2)');

      expect(client.driverExecuteSingle).toHaveBeenCalledTimes(2);
      expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(1, 'SELECT 1;', expect.anything());
      expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(2, 'FAIL 2;', expect.anything());
    });

    it("should annotate last statement failure as (@ query #3) and execute preceding queries only once", async () => {
      client.identifyCommands = jest.fn().mockReturnValue([
        { text: 'SELECT 1;', type: 'SELECT', executionType: 'LISTING' },
        { text: 'SELECT 2;', type: 'SELECT', executionType: 'LISTING' },
        { text: 'FAIL 3;', type: 'UNKNOWN', executionType: 'UNKNOWN' },
      ]);
      client.driverExecuteSingle = jest.fn().mockImplementation((sql) => {
        if (sql === 'FAIL 3;') {
          return Promise.reject(new Error('Division by zero'));
        }
        return Promise.resolve({ rows: [{ val: 1 }], columns: [] });
      });

      await expect(client.executeQuery('SELECT 1; SELECT 2; FAIL 3;'))
        .rejects.toThrow('Division by zero (@ query #3)');

      expect(client.driverExecuteSingle).toHaveBeenCalledTimes(3);
      expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(1, 'SELECT 1;', expect.anything());
      expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(2, 'SELECT 2;', expect.anything());
      expect(client.driverExecuteSingle).toHaveBeenNthCalledWith(3, 'FAIL 3;', expect.anything());
    });
  })
})

