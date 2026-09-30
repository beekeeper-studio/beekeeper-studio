import { buildCopyText } from "@/lib/menu/tableMenu";
import { PostgresData } from "@/shared/lib/dialects/postgresql";
import { MysqlData } from "@/shared/lib/dialects/mysql";
import { SqlServerData } from "@/shared/lib/dialects/sqlserver";
import { SqliteData } from "@/shared/lib/dialects/sqlite";
import Vue from "vue";

// Mock the ElectronPlugin clipboard
jest.mock("@/lib/NativeWrapper", () => ({
  ElectronPlugin: {
    clipboard: {
      writeText: jest.fn(),
    },
  },
}));

// Mock Vue.prototype.$util.send
const mockSend = jest.fn();
Object.defineProperty(Vue.prototype, "$util", {
  value: {
    send: mockSend,
  },
  writable: true,
  configurable: true,
});

describe("buildCopyText - asIn type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for conn/listTableColumns - varchar column
    mockSend.mockImplementation((event: string) => {
      if (event === "conn/listTableColumns") {
        return Promise.resolve([{ columnName: "name", dataType: "varchar" }]);
      }
      return Promise.resolve(null);
    });
  });

  describe("string escaping with different dialects", () => {
    it.each([
      ['PostgreSQL', PostgresData.escapeString],
      ['MySQL', MysqlData.escapeString],
      ['SQL Server', SqlServerData.escapeString],
      ['SQLite', SqliteData.escapeString],
      ['defaultEscapeString (fallback)', undefined],
    ])('should escape strings using %s', async (_name, escapeString) => {
      const rangeData = [{ name: "test's value" }];

      const text = await buildCopyText(rangeData, {
        type: "asIn",
        table: "users",
        schema: "public",
        escapeString,
      });

      // All dialects use the same quote-doubling approach
      const escapedValue = "test''s value";
      expect(text).toEqual(`(\n'${escapedValue}'\n)`);
    });
  });

  describe("dataType handling", () => {
    it("should not quote numeric types", async () => {
      mockSend.mockResolvedValue([{ columnName: "id", dataType: "integer" }]);

      const rangeData = [{ id: 123 }];

      const text = await buildCopyText(rangeData, {
        type: "asIn",
        table: "users",
        schema: "public",
        escapeString: PostgresData.escapeString,
      });

      expect(text).toEqual(`(\n123\n)`);
    });

    it("should quote strings and handle undefined/missing dataType gracefully", async () => {
      // Case 1: Column exists but dataType is undefined
      mockSend.mockResolvedValue([{ columnName: "name", dataType: undefined }]);
      await testCopy([{ name: "test1" }], "'test1'");

      // Case 2: Column not found in metadata (simulates query results)
      mockSend.mockResolvedValue([{ columnName: "other", dataType: "varchar" }]);
      await testCopy([{ name: "test2" }], "'test2'");

      // Case 3: Normal string type
      mockSend.mockResolvedValue([{ columnName: "name", dataType: "varchar" }]);
      await testCopy([{ name: "test3" }], "'test3'");

      async function testCopy(data: any[], expectedValue: string) {
        const text = await buildCopyText(data, {
          type: "asIn",
          table: "users",
          schema: "public",
          escapeString: PostgresData.escapeString,
        });
        expect(text).toEqual(`(\n${expectedValue}\n)`);
      }
    });
  });

  describe("multiple values and edge cases", () => {
    it("should handle multiple values", async () => {
      const rangeData = [{ name: "Alice" }, { name: "Bob's" }, { name: "Charlie" }];

      const text = await buildCopyText(rangeData, {
        type: "asIn",
        table: "users",
        schema: "public",
        escapeString: PostgresData.escapeString,
      });

      const expected = `(
'Alice',
'Bob''s',
'Charlie'
)`;
      expect(text).toEqual(expected);
    });

    it("should handle various special characters in strings", async () => {
      const testCases = [
        { input: "O'Reilly", expected: "O''Reilly" },
        { input: "It''s", expected: "It''''s" },
        { input: "value'with'multiple'quotes", expected: "value''with''multiple''quotes" },
        { input: "no quotes here", expected: "no quotes here" },
      ];

      for (const { input, expected } of testCases) {
        const rangeData = [{ name: input }];

        const text = await buildCopyText(rangeData, {
          type: "asIn",
          table: "users",
          schema: "public",
          escapeString: PostgresData.escapeString,
        });

        expect(text).toEqual(`(
'${expected}'
)`);
      }
    });

    it("should handle null values", async () => {
      const rangeData = [{ name: null }];

      const text = await buildCopyText(rangeData, {
        type: "asIn",
        table: "users",
        schema: "public",
        escapeString: PostgresData.escapeString,
      });

      // null should be converted to string "null" and escaped
      expect(text).toContain("null");
    });
  });
});
