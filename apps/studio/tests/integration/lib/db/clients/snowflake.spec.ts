import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests, runReadOnlyTests } from './all'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '../../../../../src/lib/db/types'

const isSkipSnowflakeTests = process.env.SNOWFLAKE_SKIP_TESTS === 'true'

describe('Snowflake Integration Tests', () => {
  jest.setTimeout(dbtimeout * 2) // Snowflake connections can be slower

  let util: DBTestUtil
  let config: IDbConnectionServerConfig

  const requiredEnvVars = [
    'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_USER', 
    'SNOWFLAKE_PASSWORD',
    'SNOWFLAKE_DATABASE'
  ]

  beforeAll(async () => {
    if (isSkipSnowflakeTests) {
      console.log('Skipping Snowflake tests (SNOWFLAKE_SKIP_TESTS=true)')
      return
    }

    // Check if all required environment variables are set
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.warn(`Skipping Snowflake tests due to missing environment variables: ${missingVars.join(', ')}`)
      console.warn('To run Snowflake tests, set the following environment variables:')
      console.warn('- SNOWFLAKE_ACCOUNT: Your Snowflake account identifier (e.g., myorg-myaccount)')
      console.warn('- SNOWFLAKE_USER: Your Snowflake username')
      console.warn('- SNOWFLAKE_PASSWORD: Your Snowflake password')
      console.warn('- SNOWFLAKE_DATABASE: Test database name')
      console.warn('- SNOWFLAKE_SCHEMA: Schema name (optional, defaults to PUBLIC)')
      console.warn('- SNOWFLAKE_WAREHOUSE: Warehouse name (optional)')
      console.warn('- SNOWFLAKE_ROLE: Role name (optional)')
      return
    }

    // Create Snowflake configuration from environment variables
    config = {
      client: 'snowflake',
      host: `${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`,
      port: 443,
      user: process.env.SNOWFLAKE_USER!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      database: process.env.SNOWFLAKE_DATABASE!,
      osUser: 'snowflake-test',
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: true, // Snowflake always uses SSL
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: false,
      snowflakeOptions: {
        account: process.env.SNOWFLAKE_ACCOUNT!,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE || null,
        role: process.env.SNOWFLAKE_ROLE || null,
      }
    }

    const schema = process.env.SNOWFLAKE_SCHEMA || 'PUBLIC'
    util = new DBTestUtil(config, process.env.SNOWFLAKE_DATABASE!, { schema })
    
    try {
      await util.setupdb()
      
      // Create test tables and data
      await setupSnowflakeTestData()
    } catch (error) {
      console.error('Failed to setup Snowflake test database:', error)
      throw error
    }
  })

  afterAll(async () => {
    if (util && !isSkipSnowflakeTests) {
      try {
        await cleanupSnowflakeTestData()
        await util.disconnect()
      } catch (error) {
        console.warn('Error cleaning up Snowflake test data:', error)
      }
    }
  })

  async function setupSnowflakeTestData() {
    // Create test schema if needed
    const testSchema = process.env.SNOWFLAKE_SCHEMA || 'PUBLIC'
    if (testSchema !== 'PUBLIC') {
      await util.connection.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${testSchema}`)
    }

    // Create test tables with various data types
    await util.connection.executeQuery(`
      CREATE OR REPLACE TABLE bks_test_table (
        id INTEGER NOT NULL,
        name VARCHAR(100),
        amount DECIMAL(10,2),
        created_at TIMESTAMP,
        is_active BOOLEAN,
        data VARIANT,
        PRIMARY KEY (id)
      )
    `)

    // Insert test data
    await util.connection.executeQuery(`
      INSERT INTO bks_test_table VALUES 
      (1, 'Test Record 1', 100.50, CURRENT_TIMESTAMP(), true, PARSE_JSON('{"key": "value1"}')),
      (2, 'Test Record 2', 200.75, CURRENT_TIMESTAMP(), false, PARSE_JSON('{"key": "value2"}')),
      (3, 'Test Record 3', 300.00, CURRENT_TIMESTAMP(), true, PARSE_JSON('{"key": "value3"}'))
    `)

    // Create a table with complex types for testing
    await util.connection.executeQuery(`
      CREATE OR REPLACE TABLE bks_complex_types (
        id INTEGER PRIMARY KEY,
        text_data STRING,
        number_data NUMBER(15,2),
        float_data FLOAT,
        binary_data BINARY,
        date_data DATE,
        timestamp_data TIMESTAMP_TZ,
        variant_data VARIANT,
        array_data ARRAY,
        object_data OBJECT
      )
    `)

    // Create a view for testing
    await util.connection.executeQuery(`
      CREATE OR REPLACE VIEW bks_test_view AS 
      SELECT id, name, amount FROM bks_test_table WHERE is_active = true
    `)

    // Create test tables in different schemas if applicable
    if (process.env.SNOWFLAKE_SCHEMA && process.env.SNOWFLAKE_SCHEMA !== 'PUBLIC') {
      await util.connection.executeQuery(`
        CREATE OR REPLACE TABLE ${process.env.SNOWFLAKE_SCHEMA}.bks_schema_test (
          id INTEGER PRIMARY KEY,
          schema_name VARCHAR(100) DEFAULT '${process.env.SNOWFLAKE_SCHEMA}'
        )
      `)
    }
  }

  async function cleanupSnowflakeTestData() {
    try {
      // Clean up test tables
      await util.connection.executeQuery('DROP TABLE IF EXISTS bks_test_table')
      await util.connection.executeQuery('DROP TABLE IF EXISTS bks_complex_types')
      await util.connection.executeQuery('DROP VIEW IF EXISTS bks_test_view')
      
      if (process.env.SNOWFLAKE_SCHEMA && process.env.SNOWFLAKE_SCHEMA !== 'PUBLIC') {
        await util.connection.executeQuery(`DROP TABLE IF EXISTS ${process.env.SNOWFLAKE_SCHEMA}.bks_schema_test`)
      }
    } catch (error) {
      console.warn('Error during cleanup:', error)
    }
  }

  // Helper function to skip tests if Snowflake is not configured
  const skipIfNoSnowflake = () => {
    if (isSkipSnowflakeTests || !process.env.SNOWFLAKE_ACCOUNT) {
      return true
    }
    return false
  }

  describe('Snowflake Connection Tests', () => {
    it('should connect to Snowflake successfully', async () => {
      if (skipIfNoSnowflake()) return

      const server = createServer(config)
      const connection = server.createConnection(process.env.SNOWFLAKE_DATABASE!)
      
      await expect(connection.connect()).resolves.not.toThrow()
      await connection.disconnect()
    })

    it('should handle connection with invalid credentials gracefully', async () => {
      if (skipIfNoSnowflake()) return

      const badConfig = { 
        ...config, 
        password: 'invalid_password',
        user: 'invalid_user'
      }
      const server = createServer(badConfig)
      const connection = server.createConnection(process.env.SNOWFLAKE_DATABASE!)
      
      await expect(connection.connect()).rejects.toThrow()
    })
  })

  describe('Snowflake Metadata Tests', () => {
    it('should list databases', async () => {
      if (skipIfNoSnowflake()) return

      const databases = await util.connection.listDatabases()
      expect(databases).toContain(process.env.SNOWFLAKE_DATABASE!)
      expect(databases.length).toBeGreaterThan(0)
    })

    it('should list schemas', async () => {
      if (skipIfNoSnowflake()) return

      const schemas = await util.connection.listSchemas()
      expect(schemas).toContain('PUBLIC')
      expect(schemas.length).toBeGreaterThan(0)
    })

    it('should list tables', async () => {
      if (skipIfNoSnowflake()) return

      const tables = await util.connection.listTables()
      const testTable = tables.find(t => t.name === 'BKS_TEST_TABLE')
      expect(testTable).toBeDefined()
      expect(testTable?.entityType).toBe('table')
    })

    it('should list views', async () => {
      if (skipIfNoSnowflake()) return

      const views = await util.connection.listViews()
      const testView = views.find(v => v.name === 'BKS_TEST_VIEW')
      expect(testView).toBeDefined()
      expect(testView?.entityType).toBe('view')
    })

    it('should list table columns with correct data types', async () => {
      if (skipIfNoSnowflake()) return

      const columns = await util.connection.listTableColumns('BKS_TEST_TABLE')
      expect(columns.length).toBeGreaterThan(0)
      
      const idColumn = columns.find(c => c.columnName === 'ID')
      expect(idColumn).toBeDefined()
      expect(idColumn?.nullable).toBe(false)
      
      const nameColumn = columns.find(c => c.columnName === 'NAME')
      expect(nameColumn).toBeDefined()
      expect(nameColumn?.dataType).toContain('VARCHAR')
    })

    it('should get primary keys', async () => {
      if (skipIfNoSnowflake()) return

      const primaryKeys = await util.connection.getPrimaryKeys('BKS_TEST_TABLE')
      expect(primaryKeys.length).toBe(1)
      expect(primaryKeys[0].columnName).toBe('ID')
    })

    it('should get primary key (singular)', async () => {
      if (skipIfNoSnowflake()) return

      const primaryKey = await util.connection.getPrimaryKey('BKS_TEST_TABLE')
      expect(primaryKey).toBe('ID')
    })

    it('should get table length', async () => {
      if (skipIfNoSnowflake()) return

      const length = await util.connection.getTableLength('BKS_TEST_TABLE')
      expect(length).toBe(3) // We inserted 3 records
    })
  })

  describe('Snowflake Query Tests', () => {
    it('should execute simple SELECT query', async () => {
      if (skipIfNoSnowflake()) return

      const results = await util.connection.executeQuery('SELECT COUNT(*) as row_count FROM BKS_TEST_TABLE')
      expect(results).toBeDefined()
      expect(results[0].rows).toHaveLength(1)
      expect(results[0].rows[0].ROW_COUNT).toBe(3)
    })

    it('should execute query with parameters', async () => {
      if (skipIfNoSnowflake()) return

      const results = await util.connection.executeQuery("SELECT * FROM BKS_TEST_TABLE WHERE id = 1")
      expect(results[0].rows).toHaveLength(1)
      expect(results[0].rows[0].ID).toBe(1)
      expect(results[0].rows[0].NAME).toBe('Test Record 1')
    })

    it('should handle complex data types', async () => {
      if (skipIfNoSnowflake()) return

      const results = await util.connection.executeQuery('SELECT data FROM BKS_TEST_TABLE WHERE id = 1')
      expect(results[0].rows).toHaveLength(1)
      expect(results[0].rows[0].DATA).toBeDefined()
    })

    it('should select top with limit and offset', async () => {
      if (skipIfNoSnowflake()) return

      const result = await util.connection.selectTop('BKS_TEST_TABLE', 1, 2, [], [], undefined, ['ID', 'NAME'])
      expect(result.result).toHaveLength(2)
      expect(result.fields).toHaveLength(2)
    })
  })

  describe('Snowflake Schema Tests', () => {
    it('should work with qualified table names', async () => {
      if (skipIfNoSnowflake() || !process.env.SNOWFLAKE_SCHEMA || process.env.SNOWFLAKE_SCHEMA === 'PUBLIC') return

      const schema = process.env.SNOWFLAKE_SCHEMA
      const tables = await util.connection.listTables({ schema })
      const schemaTable = tables.find(t => t.name === 'BKS_SCHEMA_TEST')
      expect(schemaTable).toBeDefined()
      expect(schemaTable?.schema).toBe(schema.toUpperCase())
    })
  })

  describe('Snowflake Error Handling', () => {
    it('should handle invalid SQL gracefully', async () => {
      if (skipIfNoSnowflake()) return

      await expect(util.connection.executeQuery('INVALID SQL STATEMENT')).rejects.toThrow()
    })

    it('should handle non-existent table gracefully', async () => {
      if (skipIfNoSnowflake()) return

      const tables = await util.connection.listTables()
      const nonExistentTable = tables.find(t => t.name === 'NON_EXISTENT_TABLE')
      expect(nonExistentTable).toBeUndefined()
    })
  })

  // Run common database tests if Snowflake is configured
  describe('Common Database Tests', () => {
    if (!isSkipSnowflakeTests && process.env.SNOWFLAKE_ACCOUNT) {
      // Note: Some common tests might fail due to Snowflake-specific behavior
      // We can run them selectively or with modifications
      runCommonTests(() => util, { 
        dbReadOnlyMode: false,
        skipTransactionTests: true, // Snowflake doesn't support transactions in the same way
        skipBinaryTests: true, // Binary handling might be different
      })
    }
  })
})