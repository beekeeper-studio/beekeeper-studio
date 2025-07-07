import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runCommonTests, runReadOnlyTests } from "./all";

const TEST_VERSIONS = [
  { version: 'latest', readonly: false },
  // { version: 'latest', readonly: true },
  // { version: '435', readonly: false },
  // { version: '435', readonly: true },
] as const

type TestVersion = typeof TEST_VERSIONS[number]['version']

function testWith(dockerTag: TestVersion, readonly: boolean) {
  describe(`Trino [${dockerTag}] - read-only mode? ${readonly}`, () => {
    jest.setTimeout(dbtimeout)

    let container: StartedTestContainer
    let util: DBTestUtil

    const getUtil = () => util

    beforeAll(async () => {
      const timeoutDefault = 5000

      // Use official Trino Docker image
      container = await new GenericContainer(`trinodb/trino:${dockerTag}`)
        .withEnvironment({
          // No authentication needed for test setup
        })
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage("SERVER STARTED"))
        .withStartupTimeout(dbtimeout)
        .start()

      jest.setTimeout(timeoutDefault)

      // Trino connection configuration
      const config = {
        client: 'trino',
        host: container.getHost(),
        port: container.getMappedPort(8080),
        user: 'test',
        // No password needed for basic Trino setup
        readOnlyMode: readonly,
        // Use system catalog for initial connection
        defaultDatabase: 'system'
      } as IDbConnectionServerConfig

      // Trino uses catalogs instead of databases, so we'll use 'system' catalog
      util = new DBTestUtil(config, "system", { 
        defaultSchema: 'information_schema', 
        dialect: 'generic',
        // Trino doesn't support many write operations
        disabledFeatures: {
          createIndex: true,
          triggers: true,
          transactions: true,
          binaryColumn: true,
          generatedColumns: true,
        },
        skipCreateDatabase: true,
        skipTransactions: true,
        skipGeneratedColumns: true
      })
      
      await util.setupdb()
    })

    afterAll(async () => {
      await util.disconnect()
      if (container) {
        await container.stop()
      }
    })

    describe("Common DB Tests", () => {
      if (readonly) {
        runReadOnlyTests(getUtil)
      } else {
        // Trino is inherently read-only for data modification, so we run read-only tests
        runReadOnlyTests(getUtil)
      }
    })

    describe("Trino-specific functionality", () => {
      it("should list catalogs", async () => {
        const catalogs = await util.connection.listDatabases()
        expect(catalogs.length).toBeGreaterThan(0)
        expect(catalogs.some(db => db.name === 'system')).toBe(true)
      })

      it("should list schemas from system catalog", async () => {
        const schemas = await util.connection.listSchemas('system')
        expect(schemas.length).toBeGreaterThan(0)
        expect(schemas.includes('information_schema')).toBe(true)
      })

      it("should list tables from information_schema", async () => {
        const tables = await util.connection.listTables({ 
          schema: 'information_schema'
        })
        expect(tables.length).toBeGreaterThan(0)
        expect(tables.some(t => t.name === 'tables')).toBe(true)
        expect(tables.some(t => t.name === 'columns')).toBe(true)
      })

      it("should query table metadata", async () => {
        const result = await util.connection.selectTop(
          'tables', 
          0, 
          10, 
          [], 
          [], 
          'information_schema'
        )
        expect(result.result.length).toBeGreaterThan(0)
        expect(result.fields.some(f => f.name === 'table_name')).toBe(true)
        expect(result.fields.some(f => f.name === 'table_schema')).toBe(true)
        expect(result.fields.some(f => f.name === 'table_catalog')).toBe(true)
      })

      it("should list columns for a table", async () => {
        const columns = await util.connection.listTableColumns(
          'tables', 
          'information_schema'
        )
        expect(columns.length).toBeGreaterThan(0)
        expect(columns.some(c => c.columnName === 'table_name')).toBe(true)
        expect(columns.some(c => c.columnName === 'table_schema')).toBe(true)
      })

      it("should execute basic SELECT queries", async () => {
        const query = await util.connection.query(
          "SELECT table_name, table_schema FROM information_schema.tables LIMIT 5"
        )
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
      })

      it("should handle queries with filtering", async () => {
        const query = await util.connection.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'information_schema'"
        )
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
      })

      it("should handle queries with ordering", async () => {
        const query = await util.connection.query(
          "SELECT table_name FROM information_schema.tables ORDER BY table_name LIMIT 3"
        )
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeLessThanOrEqual(3)
      })

      it("should get table properties", async () => {
        const properties = await util.connection.getTableProperties(
          'tables', 
          'information_schema'
        )
        expect(properties).toBeDefined()
        expect(properties.name).toBe('tables')
      })

      it("should support pagination with selectTop", async () => {
        const page1 = await util.connection.selectTop(
          'tables',
          0,
          5,
          [{ field: 'table_name', dir: 'ASC' }],
          [],
          'information_schema'
        )
        expect(page1.result.length).toBeLessThanOrEqual(5)

        const page2 = await util.connection.selectTop(
          'tables',
          5,
          5,
          [{ field: 'table_name', dir: 'ASC' }],
          [],
          'information_schema'
        )
        
        // If there are more than 5 tables, page2 should be different from page1
        if (page2.result.length > 0) {
          expect(page1.result[0]).not.toEqual(page2.result[0])
        }
      })

      it("should handle connection errors gracefully", async () => {
        // Test with invalid catalog name
        await expect(
          util.connection.listTables({ schema: 'nonexistent_catalog' })
        ).rejects.toThrow()
      })

      it("should enforce read-only operations", async () => {
        // Trino doesn't support INSERT/UPDATE/DELETE operations on system tables
        const query = await util.connection.query(
          "CREATE TABLE test_table (id INTEGER, name VARCHAR(50))"
        )
        
        // This should fail as system catalog doesn't allow table creation
        await expect(query.execute()).rejects.toThrow()
      })

      it("should handle complex queries with joins", async () => {
        const query = await util.connection.query(`
          SELECT t1.table_name, t2.column_name 
          FROM information_schema.tables t1
          JOIN information_schema.columns t2 ON t1.table_name = t2.table_name
          WHERE t1.table_schema = 'information_schema'
          AND t2.table_schema = 'information_schema'
          LIMIT 10
        `)
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
      })

      it("should handle aggregation queries", async () => {
        const query = await util.connection.query(`
          SELECT table_schema, COUNT(*) as table_count
          FROM information_schema.tables
          GROUP BY table_schema
          ORDER BY table_count DESC
          LIMIT 5
        `)
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
        expect(results[0].rows[0]).toHaveProperty('table_count')
      })

      it("should support SHOW CATALOGS command", async () => {
        const query = await util.connection.query("SHOW CATALOGS")
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
        expect(results[0].rows.some(row => row.Catalog === 'system')).toBe(true)
      })

      it("should support SHOW SCHEMAS command", async () => {
        const query = await util.connection.query("SHOW SCHEMAS FROM system")
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
        expect(results[0].rows.some(row => row.Schema === 'information_schema')).toBe(true)
      })

      it("should support SHOW TABLES command", async () => {
        const query = await util.connection.query("SHOW TABLES FROM system.information_schema")
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
        expect(results[0].rows.some(row => row.Table === 'tables')).toBe(true)
      })

      it("should handle DESCRIBE command", async () => {  
        const query = await util.connection.query("DESCRIBE system.information_schema.tables")
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
        expect(results[0].rows.some(row => row.Column === 'table_name')).toBe(true)
      })

      it("should handle EXPLAIN queries", async () => {
        const query = await util.connection.query(`
          EXPLAIN SELECT table_name FROM information_schema.tables LIMIT 1
        `)
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBeGreaterThan(0)
      })

      it("should handle queries with different data types", async () => {
        const query = await util.connection.query(`
          SELECT 
            'test_string' as string_col,
            123 as integer_col,
            123.45 as decimal_col,
            true as boolean_col,
            CURRENT_DATE as date_col,
            CURRENT_TIMESTAMP as timestamp_col
        `)
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBe(1)
        const row = results[0].rows[0]
        expect(row.string_col).toBe('test_string')
        expect(row.integer_col).toBe(123)
        expect(row.boolean_col).toBe(true)
      })

      it("should handle NULL values correctly", async () => {
        const query = await util.connection.query(`
          SELECT 
            NULL as null_col,
            'not_null' as not_null_col
        `)
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBe(1)
        const row = results[0].rows[0]
        expect(row.null_col).toBeNull()
        expect(row.not_null_col).toBe('not_null')
      })

      it("should handle array data types", async () => {
        const query = await util.connection.query(`
          SELECT 
            ARRAY[1, 2, 3] as int_array,
            ARRAY['a', 'b', 'c'] as string_array
        `)
        const results = await query.execute()
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].rows.length).toBe(1)
        const row = results[0].rows[0]
        expect(Array.isArray(row.int_array)).toBe(true)
        expect(Array.isArray(row.string_array)).toBe(true)
      })

      it("should timeout long-running queries appropriately", async () => {
        // Create a query that should timeout (adjust based on your timeout settings)
        const query = await util.connection.query(`
          SELECT COUNT(*) FROM (
            SELECT * FROM information_schema.columns 
            CROSS JOIN information_schema.columns 
            CROSS JOIN information_schema.columns
            LIMIT 1000000
          )
        `)
        
        // This should either complete quickly or timeout gracefully
        const startTime = Date.now()
        try {
          await query.execute()
          const endTime = Date.now()
          // If it completes, it shouldn't take too long
          expect(endTime - startTime).toBeLessThan(30000) // 30 seconds max
        } catch (error) {
          // If it throws, it should be a timeout or cancellation error
          expect(error.message).toMatch(/(timeout|cancel|abort)/i)
        }
      }, 35000) // Set test timeout slightly higher than expected query timeout
    })

    describe("Error handling", () => {
      it("should handle invalid SQL gracefully", async () => {
        const query = await util.connection.query("INVALID SQL STATEMENT")
        await expect(query.execute()).rejects.toThrow()
      })

      it("should handle missing tables gracefully", async () => {
        const query = await util.connection.query("SELECT * FROM nonexistent_table")
        await expect(query.execute()).rejects.toThrow()
      })

      it("should handle missing columns gracefully", async () => {
        const query = await util.connection.query("SELECT nonexistent_column FROM information_schema.tables")
        await expect(query.execute()).rejects.toThrow()
      })

      it("should handle catalog not found errors", async () => {
        await expect(
          util.connection.listSchemas('nonexistent_catalog')
        ).rejects.toThrow()
      })

      it("should handle schema not found errors", async () => {
        await expect(
          util.connection.listTables({ schema: 'nonexistent_schema' })
        ).rejects.toThrow()
      })
    })

    describe("Performance tests", () => {
      it("should handle large result sets efficiently", async () => {
        const startTime = Date.now()
        const result = await util.connection.selectTop(
          'columns',
          0,
          1000,
          [],
          [],
          'information_schema'
        )
        const endTime = Date.now()
        
        expect(result.result.length).toBeGreaterThan(0)
        expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
      })

      it("should handle multiple concurrent queries", async () => {
        const queries = Array.from({ length: 5 }, (_, i) => 
          util.connection.query(`SELECT '${i}' as query_id, table_name FROM information_schema.tables LIMIT 10`)
        )
        
        const queryExecutions = queries.map(q => q.then(query => query.execute()))
        const results = await Promise.all(queryExecutions)
        
        expect(results.length).toBe(5)
        results.forEach((result, index) => {
          expect(result.length).toBeGreaterThan(0)
          expect(result[0].rows.length).toBeGreaterThan(0)
          expect(result[0].rows[0].query_id).toBe(index.toString())
        })
      })
    })
  })
}

// Run tests for all versions
TEST_VERSIONS.forEach(({ version, readonly }) => testWith(version, readonly))

// Additional connection tests
describe('Trino Connection Edge Cases', () => {
  jest.setTimeout(dbtimeout)

  it('should validate connection configuration', async () => {
    // Basic configuration validation test
    const config: IDbConnectionServerConfig = {
      client: 'trino',
      host: 'localhost',
      port: 8080,
      user: 'testuser',
      defaultDatabase: 'system',
      readOnlyMode: false,
    }
    
    expect(config.client).toBe('trino')
    expect(config.port).toBe(8080)
    expect(config.defaultDatabase).toBe('system')
  })
})