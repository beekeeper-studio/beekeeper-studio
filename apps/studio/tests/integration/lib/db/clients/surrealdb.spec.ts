import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { SurrealAuthType } from '../../../../../src/lib/db/types'
import { createServer } from '@commercial/backend/lib/db/server'
import { SurrealDBClient } from '../../../../../src-commercial/backend/lib/db/clients/surrealdb'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { TableOrView } from '@/lib/db/models'
import { DatabaseElement } from '@/lib/db/types'

describe('SurrealDB Integration Tests', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let connection: BasicDatabaseClient<any>
  let config: any

  beforeAll(async () => {
    // Start SurrealDB container
    container = await new GenericContainer('surrealdb/surrealdb:latest')
      .withCommand(['start', '--log', 'trace', '--user', 'root', '--pass', 'root'])
      .withExposedPorts(8000)
      .withStartupTimeout(dbtimeout)
      .withWaitStrategy(Wait.forLogMessage('Started web server on', 1))
      .start()

    const host = container.getHost()
    const port = container.getMappedPort(8000)

    config = {
      client: 'surrealdb',
      host,
      port,
      user: 'root',
      password: 'root',
      surrealDbOptions: {
        authType: SurrealAuthType.Root,
        namespace: 'test',
        protocol: 'ws'
      }
    }

    const server = createServer(config)
    connection = server.createConnection('test::test')
    await connection.connect()

    // Set up test data
    await setupTestData()
  })

  afterAll(async () => {
    if (connection) {
      await connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  const setupTestData = async () => {
    // Create test tables with schema
    await connection.executeQuery(`
      DEFINE TABLE person SCHEMAFULL;
      DEFINE FIELD id ON TABLE person TYPE record<person>;
      DEFINE FIELD name ON TABLE person TYPE string;
      DEFINE FIELD age ON TABLE person TYPE number;
      DEFINE FIELD email ON TABLE person TYPE string;
      DEFINE FIELD created_at ON TABLE person TYPE datetime DEFAULT time::now();
    `)

    await connection.executeQuery(`
      DEFINE TABLE product SCHEMAFULL;
      DEFINE FIELD id ON TABLE product TYPE record<product>;
      DEFINE FIELD name ON TABLE product TYPE string;
      DEFINE FIELD price ON TABLE product TYPE number;
      DEFINE FIELD category ON TABLE product TYPE string;
      DEFINE FIELD in_stock ON TABLE product TYPE bool DEFAULT true;
    `)

    await connection.executeQuery(`
      DEFINE TABLE orders SCHEMAFULL;
      DEFINE FIELD id ON TABLE orders TYPE record<orders>;
      DEFINE FIELD customer ON TABLE orders TYPE record<person>;
      DEFINE FIELD product ON TABLE orders TYPE record<product>;
      DEFINE FIELD quantity ON TABLE orders TYPE number;
      DEFINE FIELD total ON TABLE orders TYPE number;
    `)

    // Insert test data
    await connection.executeQuery(`
      CREATE person:alice SET name = 'Alice Smith', age = 25, email = 'alice@example.com';
      CREATE person:bob SET name = 'Bob Johnson', age = 30, email = 'bob@example.com';
      CREATE person:charlie SET name = 'Charlie Brown', age = 35, email = 'charlie@example.com';
      CREATE person:david SET name = 'David Wilson', age = 40, email = 'david@example.com';
      CREATE person:eve SET name = 'Eve Davis', age = 45, email = 'eve@example.com';
    `)

    await connection.executeQuery(`
      CREATE product:laptop SET name = 'Laptop', price = 999.99, category = 'Electronics';
      CREATE product:phone SET name = 'Phone', price = 599.99, category = 'Electronics';
      CREATE product:book SET name = 'Book', price = 19.99, category = 'Education';
      CREATE product:desk SET name = 'Desk', price = 299.99, category = 'Furniture';
      CREATE product:chair SET name = 'Chair', price = 149.99, category = 'Furniture';
    `)

    await connection.executeQuery(`
      CREATE orders:order1 SET customer = person:alice, product = product:laptop, quantity = 1, total = 999.99;
      CREATE orders:order2 SET customer = person:bob, product = product:phone, quantity = 2, total = 1199.98;
      CREATE orders:order3 SET customer = person:charlie, product = product:book, quantity = 3, total = 59.97;
    `)

    // Create some indexes
    await connection.executeQuery(`
      DEFINE INDEX idx_person_email ON TABLE person COLUMNS email UNIQUE;
      DEFINE INDEX idx_product_category ON TABLE product COLUMNS category;
      DEFINE INDEX idx_orders_customer ON TABLE orders COLUMNS customer;
    `)
  }

  describe('Basic Operations', () => {
    it('should connect to SurrealDB successfully', async () => {
      expect(connection).toBeDefined()
      expect(connection).toBeInstanceOf(SurrealDBClient)
    })

    it('should get version string', async () => {
      const version = await connection.versionString()
      expect(version).toBeTruthy()
      expect(typeof version).toBe('string')
    })

    it('should list tables', async () => {
      const tables: TableOrView[] = await connection.listTables()
      const tableNames = tables.map(t => t.name)

      expect(tables.length).toBeGreaterThanOrEqual(3)
      expect(tableNames).toContain('person')
      expect(tableNames).toContain('product')
      expect(tableNames).toContain('orders')
    })

    it('should list table columns', async () => {
      const columns = await connection.listTableColumns('person')
      const columnNames = columns.map(c => c.columnName)

      expect(columns.length).toBeGreaterThan(0)
      expect(columnNames).toContain('id')
      expect(columnNames).toContain('name')
      expect(columnNames).toContain('age')
      expect(columnNames).toContain('email')
    })

    it('should list table indexes', async () => {
      const indexes = await connection.listTableIndexes('person')
      const indexNames = indexes.map(i => i.name)

      expect(indexes.length).toBeGreaterThan(0)
      expect(indexNames).toContain('idx_person_email')

      const emailIndex = indexes.find(i => i.name === 'idx_person_email')
      expect(emailIndex.unique).toBe(true)
    })

    it('should get table keys (relationships)', async () => {
      const keys = await connection.getTableKeys('orders')

      expect(keys.length).toBeGreaterThan(0)

      const customerKey = keys.find(k => k.fromColumn === 'customer')
      const productKey = keys.find(k => k.fromColumn === 'product')

      expect(customerKey).toBeDefined()
      expect(customerKey.toTable).toBe('person')
      expect(productKey).toBeDefined()
      expect(productKey.toTable).toBe('product')
    })

    it('should get table keys for schemaless tables with record references', async () => {
      const testTable = `schemaless_orders_${Date.now()}`

      try {
        // Create a SCHEMALESS table (no DEFINE FIELD statements)
        await connection.executeQuery(`
          DEFINE TABLE ${testTable} SCHEMALESS;
        `)

        // Insert data with record references - this is how schemaless tables work
        await connection.executeQuery(`
          CREATE ${testTable}:order1 SET
            customer = person:alice,
            product = product:laptop,
            quantity = 1;
          CREATE ${testTable}:order2 SET
            customer = person:bob,
            product = product:phone,
            quantity = 2;
        `)

        // Get the keys - should detect the record references even without schema
        const keys = await connection.getTableKeys(testTable)

        expect(keys.length).toBeGreaterThan(0)

        const customerKey = keys.find(k => k.fromColumn === 'customer')
        const productKey = keys.find(k => k.fromColumn === 'product')

        expect(customerKey).toBeDefined()
        expect(customerKey.toTable).toBe('person')
        expect(customerKey.fromTable).toBe(testTable)

        expect(productKey).toBeDefined()
        expect(productKey.toTable).toBe('product')
        expect(productKey.fromTable).toBe(testTable)
      } finally {
        // Clean up
        try {
          await connection.executeQuery(`REMOVE TABLE ${testTable}`)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should get incoming keys for tables referenced by others', async () => {
      const keys = await connection.getIncomingKeys('person')

      expect(keys.length).toBeGreaterThan(0)

      // person table is referenced by orders table
      const incomingKey = keys.find(k => k.fromTable === 'orders' && k.fromColumn === 'customer')

      expect(incomingKey).toBeDefined()
      expect(incomingKey.toTable).toBe('person')
    })

    it('should get table properties', async () => {
      const properties = await connection.getTableProperties('person')

      expect(properties).toBeDefined()
      expect(properties.size).toBeGreaterThan(0)
      expect(properties.indexes).toBeDefined()
      expect(properties.relations).toBeDefined()
    })

    it('should get table create script', async () => {
      const script = await connection.getTableCreateScript('person')

      expect(script).toBeTruthy()
      expect(script).toContain('DEFINE')
      expect(script).toContain('person')
    })
  })

  describe('Data Retrieval', () => {
    it('should retrieve data from a table', async () => {
      const result = await connection.selectTop('person', 0, 10, [], [])

      expect(result.result).toBeDefined()
      expect(result.result.length).toBe(5)
      expect(result.fields).toBeDefined()
      expect(result.fields.length).toBeGreaterThan(0)
    })

    it('should handle record IDs properly', async () => {
      const result = await connection.selectTop('person', 0, 5, [], [])

      expect(result.result.length).toBeGreaterThan(0)

      const RECORD_ID_REGEX = /^(?:[a-zA-Z_][a-zA-Z0-9_\-]*|⟨[^⟩]+⟩):.+$/;
      result.result.forEach(row => {
        expect(row.id).toBeDefined()
        expect(typeof row.id).toBe('string') // we transcode the ids to strings
        expect(RECORD_ID_REGEX.test(row.id)).toBeTruthy();
      })
    })

    it('should handle sorting correctly', async () => {
      // Test ascending sort
      let result = await connection.selectTop('person', 0, 10, [{ field: 'age', dir: 'ASC' }], [])
      const agesAsc = result.result.map((r: any) => r.age)
      expect(agesAsc).toEqual([25, 30, 35, 40, 45])

      // Test descending sort
      result = await connection.selectTop('person', 0, 10, [{ field: 'age', dir: 'DESC' }], [])
      const agesDesc = result.result.map((r: any) => r.age)
      expect(agesDesc).toEqual([45, 40, 35, 30, 25])
    })

    it('should handle pagination correctly', async () => {
      // Page 1 (first 3 items)
      let result = await connection.selectTop('person', 0, 3, [{ field: 'age', dir: 'ASC' }], [])
      expect(result.result.length).toBe(3)

      // Page 2 (next 2 items)
      result = await connection.selectTop('person', 3, 2, [{ field: 'age', dir: 'ASC' }], [])
      expect(result.result.length).toBe(2)

      // Verify different pages return different ages
      const ages = result.result.map((r: any) => r.age)
      expect(ages).toEqual([40, 45])
    })

    it('should handle column filtering', async () => {
      // Get all columns
      let result = await connection.selectTop('person', 0, 5, [], [])
      const allColumns = Object.keys(result.result[0])
      expect(allColumns.length).toBeGreaterThan(2)

      // Get only specific columns
      result = await connection.selectTop('person', 0, 5, [], [], null, ['name', 'age'])
      const filteredColumns = Object.keys(result.result[0])
      expect(filteredColumns).toEqual(['age', 'name'])
    })

    it('should handle table filtering', async () => {
      // Filter by exact match
      let result = await connection.selectTop('person', 0, 10, [], [{ field: 'name', type: '=', value: 'Alice Smith' }])
      expect(result.result.length).toBe(1)
      expect(result.result[0].name).toBe('Alice Smith')

      // Filter by age
      result = await connection.selectTop('person', 0, 10, [], [{ field: 'age', type: '>', value: '30' }])
      expect(result.result.length).toBe(3) // Charlie (35), David (40), Eve (45)
    })

    it('should execute SurrealDB queries', async () => {
      const query = await connection.query('SELECT * FROM person WHERE age > 30')
      const result = await query.execute()

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].rows).toBeDefined()
      expect(result[0].rows.length).toBe(3) // Charlie, David, Eve
    })
  })

  describe('Data Modification', () => {
    const getTestTableName = (testName: string) => {
      return `test_${testName}_${Date.now()}`
    }

    it('should insert data', async () => {
      const testTable = getTestTableName('insert')

      try {
        // Create test table
        await connection.executeQuery(`
          DEFINE TABLE ${testTable} SCHEMAFULL;
          DEFINE FIELD id ON TABLE ${testTable} TYPE record<${testTable}>;
          DEFINE FIELD name ON TABLE ${testTable} TYPE string;
          DEFINE FIELD value ON TABLE ${testTable} TYPE number;
        `)

        const testData = [
          { name: 'Test 1', value: 100 },
          { name: 'Test 2', value: 200 },
          { name: 'Test 3', value: 300 }
        ]

        // Insert data
        await connection.executeApplyChanges({
          updates: [],
          deletes: [],
          inserts: [{
            table: testTable,
            data: testData
          }]
        })

        // Verify data was inserted
        const result = await connection.selectTop(testTable, 0, 10, [], [])
        expect(result.result.length).toBe(3)

        const names = result.result.map((r: any) => r.name)
        expect(names).toContain('Test 1')
        expect(names).toContain('Test 2')
        expect(names).toContain('Test 3')
      } finally {
        // Clean up
        try {
          await connection.executeQuery(`REMOVE TABLE ${testTable}`)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should update data', async () => {
      const testTable = getTestTableName('update')

      try {
        // Create test table and insert data
        await connection.executeQuery(`
          DEFINE TABLE ${testTable} SCHEMAFULL;
          DEFINE FIELD id ON TABLE ${testTable} TYPE record<${testTable}>;
          DEFINE FIELD name ON TABLE ${testTable} TYPE string;
          DEFINE FIELD status ON TABLE ${testTable} TYPE string;
        `)

        await connection.executeQuery(`
          CREATE ${testTable}:test1 SET name = 'Update Test', status = 'pending';
        `)

        // Update the record
        await connection.executeApplyChanges({
          inserts: [],
          deletes: [],
          updates: [{
            table: testTable,
            column: 'status',
            value: 'completed',
            primaryKeys: [{ column: 'id', value: `${testTable}:test1` }]
          }]
        })

        // Verify the update
        const result = await connection.selectTop(testTable, 0, 10, [], [])
        expect(result.result.length).toBe(1)
        expect(result.result[0].status).toBe('completed')
        expect(result.result[0].name).toBe('Update Test')
      } finally {
        // Clean up
        try {
          await connection.executeQuery(`REMOVE TABLE ${testTable}`)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should delete data', async () => {
      const testTable = getTestTableName('delete')

      try {
        // Create test table and insert data
        await connection.executeQuery(`
          DEFINE TABLE ${testTable} SCHEMAFULL;
          DEFINE FIELD id ON TABLE ${testTable} TYPE record<${testTable}>;
          DEFINE FIELD name ON TABLE ${testTable} TYPE string;
        `)

        await connection.executeQuery(`
          CREATE ${testTable}:test1 SET name = 'Delete Test 1';
          CREATE ${testTable}:test2 SET name = 'Delete Test 2';
        `)

        // Delete one record
        await connection.executeApplyChanges({
          updates: [],
          inserts: [],
          deletes: [{
            table: testTable,
            primaryKeys: [{ column: 'id', value: `${testTable}:test1` }]
          }]
        })

        // Verify deletion
        const result = await connection.selectTop(testTable, 0, 10, [], [])
        expect(result.result.length).toBe(1)
        expect(result.result[0].name).toBe('Delete Test 2')
      } finally {
        // Clean up
        try {
          await connection.executeQuery(`REMOVE TABLE ${testTable}`)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should handle mixed operations (insert, update, delete)', async () => {
      const testTable = getTestTableName('mixed')

      try {
        // Create test table
        await connection.executeQuery(`
          DEFINE TABLE ${testTable} SCHEMAFULL;
          DEFINE FIELD id ON TABLE ${testTable} TYPE record<${testTable}>;
          DEFINE FIELD name ON TABLE ${testTable} TYPE string;
          DEFINE FIELD value ON TABLE ${testTable} TYPE number;
        `)

        // Insert initial data
        await connection.executeQuery(`
          CREATE ${testTable}:existing SET name = 'Existing', value = 100;
          CREATE ${testTable}:toupdate SET name = 'To Update', value = 200;
          CREATE ${testTable}:todelete SET name = 'To Delete', value = 300;
        `)

        // Apply mixed changes
        await connection.executeApplyChanges({
          inserts: [{
            table: testTable,
            data: [{ name: 'New Record', value: 400 }]
          }],
          updates: [{
            table: testTable,
            column: 'value',
            value: 250,
            primaryKeys: [{ column: 'id', value: `${testTable}:toupdate` }]
          }],
          deletes: [{
            table: testTable,
            primaryKeys: [{ column: 'id', value: `${testTable}:todelete` }]
          }]
        })

        // Verify results
        const result = await connection.selectTop(testTable, 0, 10, [], [])
        expect(result.result.length).toBe(3) // existing + updated + new

        const names = result.result.map((r: any) => r.name)
        expect(names).toContain('Existing')
        expect(names).toContain('To Update')
        expect(names).toContain('New Record')
        expect(names).not.toContain('To Delete')

        // Check updated value
        const updatedRecord = result.result.find((r: any) => r.name === 'To Update')
        expect(updatedRecord.value).toBe(250)
      } finally {
        // Clean up
        try {
          await connection.executeQuery(`REMOVE TABLE ${testTable}`)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })
  })

  describe('Schema Operations', () => {
    it('should test change builder functionality', async () => {
      const builder = await connection.getBuilder('person')
      expect(builder).toBeDefined()

      // Test basic identifier wrapping
      expect(builder.wrapIdentifier('test')).toBe('`test`')
      expect(builder.wrapIdentifier('test[0]')).toBe('`test`[0]')

      // Test SurrealDB-specific operations
      const addFieldSQL = builder.addColumn({
        columnName: 'new_field',
        dataType: 'string',
        nullable: true
      })

      expect(addFieldSQL).toContain('DEFINE FIELD')
      expect(addFieldSQL).toContain('new_field')
      expect(addFieldSQL).toContain('string')

      const dropFieldSQL = builder.dropColumn('old_field')
      expect(dropFieldSQL).toContain('REMOVE FIELD')
      expect(dropFieldSQL).toContain('old_field')

      // Test index creation
      const createIndexSQL = builder.singleIndex({
        name: 'test_index',
        columns: [{ name: 'name', order: 'ASC' }],
        unique: false
      })

      expect(createIndexSQL).toContain('DEFINE INDEX')
      expect(createIndexSQL).toContain('test_index')
      expect(createIndexSQL).toContain('name')
    })

    it('should handle SurrealDB-specific data types', async () => {
      const testTable = `complex_data_${Date.now()}`

      try {
        await connection.executeQuery(`
          DEFINE TABLE ${testTable} SCHEMAFULL;
          DEFINE FIELD id ON TABLE ${testTable} TYPE record<${testTable}>;
          DEFINE FIELD metadata ON TABLE ${testTable} TYPE object;
          DEFINE FIELD tags ON TABLE ${testTable} TYPE array<string>;
          DEFINE FIELD coordinates ON TABLE ${testTable} TYPE geometry<point>;
        `)

        const columns = await connection.listTableColumns(testTable)
        const metadataCol = columns.find(c => c.columnName === 'metadata')
        const tagsCol = columns.find(c => c.columnName === 'tags')
        const coordinatesCol = columns.find(c => c.columnName === 'coordinates')

        expect(metadataCol).toBeDefined()
        expect(metadataCol.dataType).toBe('object')
        expect(tagsCol).toBeDefined()
        expect(tagsCol.dataType).toBe('array<string>')
        expect(coordinatesCol).toBeDefined()
        expect(coordinatesCol.dataType).toBe('geometry<point>')
      } finally {
        // Clean up
        try {
          await connection.executeQuery(`REMOVE TABLE ${testTable}`)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })
  })

  describe('Database Operations', () => {
    it('should create and list databases', async () => {
      const dbName = `test_db_${Date.now()}`

      try {
        await connection.createDatabase(dbName, '', '')

        const databases = await connection.listDatabases()
        expect(databases).toContain(dbName)
      } finally {
        // Clean up - SurrealDB doesn't have a direct way to drop databases
        // This would require connecting as root and using REMOVE DATABASE
      }
    })

    it('should handle namespace operations', async () => {
      // This test requires root access to list namespaces
      if (config.surrealDbOptions.authType === SurrealAuthType.Root) {
        const schemas = await connection.listSchemas()
        expect(schemas).toBeDefined()
        expect(schemas.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Advanced Features', () => {
    it('should handle streaming data', async () => {
      const stream = await connection.selectTopStream('person', [], [], 2)


      expect(stream.totalRows).toBeGreaterThan(0)
      expect(stream.columns).toBeDefined()
      expect(stream.cursor).toBeDefined()

      await stream.cursor.start()
      // Read first chunk
      const chunk1 = await stream.cursor.read()
      expect(chunk1.length).toBeLessThanOrEqual(2)

      // Read second chunk
      const chunk2 = await stream.cursor.read()
      expect(chunk2.length).toBeLessThanOrEqual(2)

      await stream.cursor.close()
    })

    it('should handle query streaming', async () => {
      const stream = await connection.queryStream('SELECT * FROM person WHERE age > 30', 1)

      expect(stream.columns).toBeDefined()
      expect(stream.cursor).toBeDefined()

      await stream.cursor.start()
      // Read chunks
      const chunk = await stream.cursor.read()
      expect(chunk.length).toBeLessThanOrEqual(1)

      await stream.cursor.close()
    })

    it('should handle complex SurrealDB queries', async () => {
      const query = await connection.query(`
        SELECT name, age,
               (SELECT name FROM product WHERE id = $parent.customer) as customer_name
        FROM orders
      `)

      const result = await query.execute()
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
