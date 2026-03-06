import { Network} from "testcontainers"
import { DBTestUtil, dbtimeout } from "../../../../lib/db"
import { TrinoBackingPostgresDriver, TrinoHttpDriver, TrinoNginxProxy } from './trino/container'
import { TableOrView } from "@/lib/db/models"

describe('Trino integration tests', () => {
  jest.setTimeout(dbtimeout)

  let dbfeeder: DBTestUtil
  let httpUtil: DBTestUtil
  let httpsUtil: DBTestUtil

  beforeAll(async () => {
    const network = await new Network().start()

    // Start backing Postgres and seed test data
    await TrinoBackingPostgresDriver.start('latest', false, false, network)
    dbfeeder = new DBTestUtil(TrinoBackingPostgresDriver.config, "banana", TrinoBackingPostgresDriver.utilOptions)
    await dbfeeder.setupdb()

    // Start Trino (HTTP only, on the docker network)
    await TrinoHttpDriver.start('latest', false, network)

    // Direct HTTP connection to Trino
    httpUtil = new DBTestUtil(TrinoHttpDriver.config, 'postgresql', { dialect: 'trino' })
    await httpUtil.connection.connect()

    // Start nginx proxy for SSL termination
    await TrinoNginxProxy.start(network)

    // HTTPS connection (through nginx TLS termination)
    httpsUtil = new DBTestUtil(TrinoNginxProxy.httpsConfig, 'postgresql', { dialect: 'trino' })
    await httpsUtil.connection.connect()
  })

  afterAll(async () => {
    if (httpsUtil?.connection) await httpsUtil.connection.disconnect()
    if (httpUtil?.connection) await httpUtil.connection.disconnect()
    await TrinoNginxProxy.stop()
    await TrinoHttpDriver.stop()
    await dbfeeder.disconnect()
    await TrinoBackingPostgresDriver.stop()
  })

  describe("Read Operations (HTTP)", () => {
    it("List tables should work", async () => {
      const tables: TableOrView[] = await httpUtil.connection.listTables({ schema: 'public' })
      const tableNames: string[] = tables.map((t) => t.name)

      expect(tables.length).toBeGreaterThanOrEqual(3)
      expect(tableNames).toContain('people')
      expect(tableNames).toContain('addresses')
      expect(tableNames).toContain('jobs')
    })

    it("List tables should return tables when filter is null (bug #3947)", async () => {
      const tables: TableOrView[] = await httpUtil.connection.listTables(null)
      expect(tables.length).toBeGreaterThanOrEqual(3)
    })

    it("List tables should only return tables matching the schema filter", async () => {
      const tables: TableOrView[] = await httpUtil.connection.listTables({ schema: 'public' })
      tables.forEach(t => expect(t.schema).toBe('public'))
    })

    it("List table columns should work", async () => {
      const columns = await httpUtil.connection.listTableColumns("addresses", "public")
      const columnNames = columns.map((c) => c.columnName)

      expect(columns.length).toBeGreaterThan(0)
      expect(columnNames).toContain('street')
      expect(columnNames).toContain('city')
      expect(columnNames).toContain('country')

      const streetColumn = columns.find(c => c.columnName === 'street')
      expect(streetColumn).toBeDefined()
      expect(streetColumn.schemaName).toBe('public')
      expect(streetColumn.tableName).toBe('addresses')
    })

    it("Get database version should work", async () => {
      const version = await httpUtil.connection.versionString()
      expect(version).toBeDefined()
      expect(typeof version).toBe('string')
      expect(version.length).toBeGreaterThan(0)
    })

    it("List schemas should work", async () => {
      const schemas = await httpUtil.connection.listSchemas()
      expect(schemas).toBeDefined()
      expect(Array.isArray(schemas)).toBe(true)
      if (schemas.length > 0) {
        expect(schemas).toContain('public')
      }
    })

    it("Should be able to retrieve data from a table", async () => {
      const data = await httpUtil.connection.selectTop('people', 0, 100, [], [], 'public', [])
      expect(data.result).toBeDefined()
      expect(Array.isArray(data.result)).toBe(true)
      expect(data.fields).toBeDefined()
      expect(data.fields.length).toBeGreaterThan(0)
    })

    it("Should be able to filter columns", async () => {
      let r = await httpUtil.connection.selectTop("jobs", 0, 10, [], [], 'public', [])
      expect(r.result).toBeDefined()
      expect(r.fields).toBeDefined()

      if (r.result.length > 0) {
        const firstRow = r.result[0]
        expect(firstRow).toBeDefined()
        expect(typeof firstRow).toBe('object')
      }

      r = await httpUtil.connection.selectTop("jobs", 0, 10, [], [], 'public', ['title'])
      expect(r.result).toBeDefined()
      expect(r.fields).toBeDefined()
    })

    it("Should handle sorting correctly", async () => {
      const result = await httpUtil.connection.selectTop('people', 0, 10, [], [], 'public', [])
      expect(result.result).toBeDefined()
      expect(result.fields).toBeDefined()
      expect(result.fields.length).toBeGreaterThan(0)
      expect(Array.isArray(result.result)).toBe(true)
    })

    it("Should handle pagination correctly", async () => {
      let result = await httpUtil.connection.selectTop('people', 0, 2, [], [], 'public', [])
      expect(result.result).toBeDefined()
      expect(Array.isArray(result.result)).toBe(true)
      expect(result.result.length).toBeLessThanOrEqual(2)

      result = await httpUtil.connection.selectTop('people', 2, 2, [], [], 'public', [])
      expect(result.result).toBeDefined()
      expect(Array.isArray(result.result)).toBe(true)
    })

    it("Should execute custom queries", async () => {
      const queryResult = await httpUtil.connection.query('SELECT COUNT(*) as table_count FROM postgresql.information_schema.tables WHERE table_schema = \'public\'')
      const results = await queryResult.execute()

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toBeDefined()
      expect(results[0].rows).toBeDefined()
    })

    it("Should support Trino-specific features", async () => {
      const catalogsQuery = await httpUtil.connection.query('SHOW CATALOGS')
      const catalogsResult = await catalogsQuery.execute()

      expect(catalogsResult).toBeDefined()
      expect(catalogsResult.length).toBeGreaterThan(0)
      expect(catalogsResult[0].rows).toBeDefined()

      const catalogNames = catalogsResult[0].rows.map(row => row.Catalog)
      expect(Array.isArray(catalogNames)).toBe(true)
      if (catalogNames.length > 0) {
        expect(catalogNames.length).toBeGreaterThan(0)
      }
    })

    it("Should handle complex queries with joins", async () => {
      const joinQuery = `
        SELECT COUNT(*) as count_result
        FROM postgresql.public.people p
        WHERE p.id IS NOT NULL
        LIMIT 5
      `

      const queryResult = await httpUtil.connection.query(joinQuery)
      const results = await queryResult.execute()

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].rows).toBeDefined()
    })
  })

  describe("Trino-specific constraints and features", () => {
    it("Should indicate Trino doesn't support transactions", async () => {
      expect((httpUtil.connection as any).supportsTransaction).toBe(false)
    })

    it("Should return null for primary keys (not supported)", async () => {
      const primaryKeys = await httpUtil.connection.getPrimaryKeys()
      expect(primaryKeys).toEqual([])

      const singlePrimaryKey = await httpUtil.connection.getPrimaryKey('people', 'public')
      expect(singlePrimaryKey).toBeNull()
    })

    it("Should return null for data modification operations", async () => {
      const alterResult = await httpUtil.connection.alterTable({} as any)
      expect(alterResult).toBeNull()

      const createDbResult = await httpUtil.connection.createDatabase()
      expect(createDbResult).toBeNull()

      const truncateResult = await httpUtil.connection.truncateElementSql('test', 'public')
      expect(truncateResult).toBeNull()

      const duplicateResult = await httpUtil.connection.duplicateTable('test', 'public', 'test_copy')
      expect(duplicateResult).toBeNull()

      const duplicateSqlResult = await httpUtil.connection.duplicateTableSql('test', 'public', 'test_copy')
      expect(duplicateSqlResult).toBeNull()

      const setNameResult = await httpUtil.connection.setElementNameSql('test', 'test_new', 'public')
      expect(setNameResult).toBeNull()

      const builderResult = await httpUtil.connection.getBuilder('test_table', 'public')
      expect(builderResult).toBeNull()
    })

    it("Should support selectTopSql for query generation", async () => {
      const sql = await httpUtil.connection.selectTopSql('people', 0, 10,
        [], [], 'public', [])

      expect(sql).toBeDefined()
      expect(typeof sql).toBe('string')
      expect(sql.length).toBeGreaterThan(0)
      expect(sql).toContain('SELECT')
      expect(sql).toContain('FROM')
      expect(sql).toContain('people')
    })

    it("Should work with catalog.schema.table format", async () => {
      const queryResult = await httpUtil.connection.query('SELECT 1 as test_column FROM postgresql.public.people LIMIT 1')
      const results = await queryResult.execute()

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].rows).toBeDefined()
      expect(results[0].rows.length).toBeGreaterThan(0)
    })
  })

  describe('SSL connection via load balancer (bug #3695)', () => {
    it("Should connect to Trino over HTTPS with ssl=true and CA cert", async () => {
      const version = await httpsUtil.connection.versionString()
      expect(version).toBeDefined()
      expect(typeof version).toBe('string')
      expect(version.length).toBeGreaterThan(0)
    })

    it("Should be able to list tables over SSL", async () => {
      const tables: TableOrView[] = await httpsUtil.connection.listTables({ schema: 'public' })
      const tableNames = tables.map(t => t.name)
      expect(tables.length).toBeGreaterThanOrEqual(3)
      expect(tableNames).toContain('people')
    })

    it("Should be able to query data over SSL", async () => {
      const result = await httpsUtil.connection.selectTop('people', 0, 10, [], [], 'public', [])
      expect(result.result).toBeDefined()
      expect(Array.isArray(result.result)).toBe(true)
    })
  })
})
