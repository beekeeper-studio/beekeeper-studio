import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { dbtimeout } from '@tests/lib/db'
import { SurrealAuthType } from '@/lib/db/types'
import { createServer } from '@commercial/backend/lib/db/server'
import { SurrealDBClient } from '@commercial/backend/lib/db/clients/surrealdb'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { TableOrView } from '@/lib/db/models'
import { CsvExporter } from '@/lib/export/formats/csv'
import tmp from 'tmp'
import fs from 'fs'

const TEST_VERSIONS = [
  { version: 'v2', protocol: 'ws' },
  { version: 'v2', protocol: 'http' },
  { version: 'v3', protocol: 'ws' },
  { version: 'v3', protocol: 'http' },
  { version: 'v4', protocol: 'ws' },
  { version: 'v4', protocol: 'http' }
];


function testWith(tag, protocol) {
  describe(`SurrealDB ${tag} Integration Tests - Protocol: ${protocol}`, () => {
    vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

    let container: StartedTestContainer
    let connection: BasicDatabaseClient<any>
    let config: any

    beforeAll(async () => {
      // Start SurrealDB container
      container = await new GenericContainer(`surrealdb/surrealdb:${tag}`)
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
          protocol
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
      await connection.executeQuery(`
        DEFINE NAMESPACE IF NOT EXISTS test;
        DEFINE DATABASE IF NOT EXISTS test;
      `)

      // Create test tables with schema
      await connection.executeQuery(`
        DEFINE TABLE person SCHEMAFULL;
        DEFINE FIELD id ON TABLE person TYPE string;
        DEFINE FIELD name ON TABLE person TYPE string;
        DEFINE FIELD age ON TABLE person TYPE number;
        DEFINE FIELD email ON TABLE person TYPE string;
        DEFINE FIELD created_at ON TABLE person TYPE datetime DEFAULT time::now();
      `)

      await connection.executeQuery(`
        DEFINE TABLE product SCHEMAFULL;
        DEFINE FIELD id ON TABLE product TYPE string;
        DEFINE FIELD name ON TABLE product TYPE string;
        DEFINE FIELD price ON TABLE product TYPE number;
        DEFINE FIELD category ON TABLE product TYPE string;
        DEFINE FIELD in_stock ON TABLE product TYPE bool DEFAULT true;
      `)

      await connection.executeQuery(`
        DEFINE TABLE orders SCHEMAFULL;
        DEFINE FIELD id ON TABLE orders TYPE string;
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
            DEFINE FIELD id ON TABLE ${testTable} TYPE string;
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
            DEFINE FIELD id ON TABLE ${testTable} TYPE string;
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
            DEFINE FIELD id ON TABLE ${testTable} TYPE string;
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
            DEFINE FIELD id ON TABLE ${testTable} TYPE string;
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
            DEFINE FIELD id ON TABLE ${testTable} TYPE string;
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

        expect(stream.cursor).toBeDefined()

        await stream.cursor.start()
        // Read chunks
        const chunk = await stream.cursor.read()
        expect(chunk.length).toBeLessThanOrEqual(1)

        await stream.cursor.close()
      })

      // https://github.com/beekeeper-studio/beekeeper-studio/issues/4986
      it('should export record ids to CSV without extra quotes', async () => {
        const file = tmp.tmpNameSync({ postfix: '.csv' })
        const exporter = new CsvExporter(
          file,
          connection,
          { name: 'person', entityType: 'table' } as TableOrView,
          '',
          '',
          [],
          { chunkSize: 100, deleteOnAbort: false },
          { header: true, delimiter: ',' }
        )

        try {
          await exporter.exportToFile()
          expect(exporter.error).toBeNull()

          const csv = fs.readFileSync(file, 'utf-8')
          expect(csv).toMatch(/(^|,)person:alice(,|\n)/m)
          expect(csv).not.toContain('"')
        } finally {
          fs.rmSync(file, { force: true })
        }
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

    // FIXME: SurrealDB has two compounding bugs around queryStream:
    //
    // 1. apps/studio/src-commercial/backend/lib/db/clients/surrealdb.ts:660
    //    blindly appends `LIMIT 1` (case-sensitive .includes('LIMIT') check)
    //    for column inference, then executes that mutated query via
    //    driverExecuteSingle. CREATE/UPDATE/DELETE statements get a
    //    meaningless `LIMIT 1` glued on; ORDER BY semantics are dropped
    //    from aggregate queries; the sample runs to completion so any side
    //    effects fire twice when combined with the cursor.
    //
    // 2. apps/studio/src-commercial/backend/lib/db/clients/surrealdb/
    //    SurrealDBCursor.ts:81 strips existing LIMIT/START clauses from the
    //    user's query and reissues it on every chunk read with the cursor's
    //    own pagination. Even after fixing (1), this would still corrupt
    //    queries — the cursor needs to honour the user's query verbatim.
    //
    // The first test pins single-execution by running a side-effecting
    // CREATE through queryStream and asserting the table only contains one
    // record. The second test pins that the cursor surfaces every row in
    // the requested order — the LIMIT 1 sample must not poison the cursor's
    // view.
    describe("queryStream double execution", () => {
      it("should run a side-effecting CREATE only once across the full stream lifecycle", async () => {
        const tableName = `qs_counter_${Date.now()}`

        try {
          await connection.executeQuery(`
            DEFINE TABLE ${tableName} SCHEMAFULL;
            DEFINE FIELD note ON TABLE ${tableName} TYPE string;
            DEFINE FIELD value ON TABLE ${tableName} TYPE int;
            DEFINE FIELD flag ON TABLE ${tableName} TYPE bool;
          `)

          const stream = await connection.queryStream(
            `CREATE ${tableName} SET note = 'hello', value = 42, flag = true`,
            100
          )
          try {
            await stream.cursor.start()
            for (let i = 0; i < 10; i++) {
              const rows = await stream.cursor.read()
              if (!rows || rows.length === 0) break
            }
            await stream.cursor.close()
          } catch (_e) {
            // The cursor (or the LIMIT-1 sample) may reject CREATE. The
            // signal we care about is whether the resulting table has more
            // than one row.
          }

          const result = await connection.executeQuery(`SELECT * FROM ${tableName}`)
          const rows = result[0]?.rows ?? []
          expect(rows.length).toBe(1)
        } finally {
          try {
            await connection.executeQuery(`REMOVE TABLE ${tableName}`)
          } catch (_e) {
            // ignore
          }
        }
      })

      it("should stream all rows for a SELECT without an explicit LIMIT in user-requested order", async () => {
        // person has 5 rows seeded in setupTestData() with ages 25..45.
        const stream = await connection.queryStream(
          'SELECT name, age FROM person ORDER BY age DESC',
          100
        )

        const collected: any[][] = []
        try {
          await stream.cursor.start()
          for (let i = 0; i < 50; i++) {
            const rows = await stream.cursor.read()
            if (!rows || rows.length === 0) break
            collected.push(...rows)
          }
        } finally {
          await stream.cursor.close()
        }

        expect(collected.length).toBe(5)
        const ages = collected.map((row) => row.find((v) => typeof v === 'number'))
        expect(ages).toEqual([45, 40, 35, 30, 25])
      })
    })

    // Open issues from the 2026-11-02 release QA:
    // https://github.com/beekeeper-studio/beekeeper-studio/issues/4978
    describe('Release QA issues (#4978)', () => {
      const dropTable = async (table: string) => {
        try {
          await connection.executeQuery(`REMOVE TABLE ${table}`)
        } catch (_e) {
          // ignore
        }
      }

      // https://github.com/beekeeper-studio/beekeeper-studio/issues/4979
      // Query results are sent to the renderer over IPC (structured clone), so
      // RecordId / Geometry class instances arrive as `{}` / `{ point: [...] }`.
      describe('query editor results (#4979)', () => {
        const table = `qa_ids_${Date.now()}`
        const linkTable = `qa_links_${Date.now()}`

        beforeAll(async () => {
          await connection.executeQuery(`
            DEFINE TABLE ${table} SCHEMALESS;
            CREATE ${table}:1 SET name = 'alpha', n = 1;
            DEFINE TABLE ${linkTable} SCHEMALESS;
            CREATE ${linkTable}:1 SET ref = ${table}:1, coordinates = (53.38, -2.35);
          `)
        })

        afterAll(async () => {
          await dropTable(table)
          await dropTable(linkTable)
        })

        const runQuery = async (text: string) => {
          const query = await connection.query(text, 1, { dryRun: false })
          const results = await query.execute()
          // mimic the trip to the renderer
          return structuredClone(results)
        }

        it('returns record ids as strings', async () => {
          const [result] = await runQuery(`SELECT * FROM ${table}`)

          expect(result.rows).toHaveLength(1)
          expect(result.rows[0].id).toBe(`${table}:1`)
        })

        it('returns record links as strings', async () => {
          const [result] = await runQuery(`SELECT * FROM ${linkTable}`)

          expect(result.rows[0].id).toBe(`${linkTable}:1`)
          expect(result.rows[0].ref).toBe(`${table}:1`)
        })

        it('returns geometry values as GeoJSON', async () => {
          const [result] = await runQuery(`SELECT coordinates FROM ${linkTable}`)

          expect(result.rows[0].coordinates).toEqual({
            type: 'Point',
            coordinates: [53.38, -2.35]
          })
        })
      })

      // https://github.com/beekeeper-studio/beekeeper-studio/issues/4982
      // The query editor calls query() with `{ dryRun }`, never `multiple`, so
      // only the first statement's result comes back.
      describe('multi-statement queries (#4982)', () => {
        it('returns a result for every statement', async () => {
          const query = await connection.query(`
            SELECT name FROM person WHERE age = 25;
            SELECT name FROM product WHERE price < 100;
            SELECT count() FROM orders GROUP ALL;
          `, 1, { dryRun: false })
          const results = await query.execute()

          expect(results).toHaveLength(3)
          expect(results[0].rows).toEqual([{ name: 'Alice Smith' }])
          expect(results[1].rows).toEqual([{ name: 'Book' }])
          expect(results[2].rows).toEqual([{ count: 3 }])
        })

        it('runs DEFINE / CREATE statements and returns each of their results', async () => {
          const table = `qa_multi_${Date.now()}`
          try {
            const query = await connection.query(`
              DEFINE TABLE ${table} SCHEMALESS;
              CREATE ${table}:1 SET n = 1;
              CREATE ${table}:2 SET n = 2;
              SELECT * FROM ${table} ORDER BY n;
            `, 1, { dryRun: false })
            const results = await query.execute()

            expect(results).toHaveLength(4)
            expect(results[3].rows.map((r) => r.n)).toEqual([1, 2])
          } finally {
            await dropTable(table)
          }
        })
      })

      // https://github.com/beekeeper-studio/beekeeper-studio/issues/4984
      // SurrealDB adds `id` implicitly, so a SCHEMAFULL table usually has no
      // `DEFINE FIELD id`. INFO FOR TABLE then doesn't list it and the data tab
      // has no primary key column to edit with.
      describe('SCHEMAFULL table without an explicit id field (#4984)', () => {
        const table = `qa_full_${Date.now()}`

        beforeAll(async () => {
          await connection.executeQuery(`
            DEFINE TABLE ${table} SCHEMAFULL;
            DEFINE FIELD name ON ${table} TYPE string;
            DEFINE FIELD n ON ${table} TYPE int;
            CREATE ${table}:1 SET name = 'alpha', n = 1;
          `)
        })

        afterAll(async () => {
          await dropTable(table)
        })

        it('lists the implicit id column as a record id', async () => {
          const columns = await connection.listTableColumns(table)
          const id = columns.find((c) => c.columnName === 'id')

          expect(id).toBeDefined()
          expect(id.bksField.bksType).toBe('SURREALID')
        })
      })

      // https://github.com/beekeeper-studio/beekeeper-studio/issues/4985
      // The grid sends edited values as strings. In a schemaless table nothing
      // coerces them, so `4` typed into a `number` column is stored as '4'.
      describe('typed values in a schemaless table (#4985)', () => {
        const table = `qa_plain_${Date.now()}`

        beforeAll(async () => {
          await connection.executeQuery(`
            DEFINE TABLE ${table} SCHEMALESS;
            CREATE ${table}:1 SET name = 'alpha', n = 1;
          `)
        })

        afterAll(async () => {
          await dropTable(table)
        })

        it('stores a number typed into a new row as a number', async () => {
          const columns = await connection.listTableColumns(table)
          expect(columns.find((c) => c.columnName === 'n').dataType).toBe('number')

          await connection.applyChanges({
            updates: [],
            deletes: [],
            inserts: [{ table, data: [{ name: 'delta', n: '4' }] }]
          })

          const [result] = await connection.executeQuery(
            `SELECT name, n FROM ${table} WHERE name = 'delta'`
          )
          expect(result.rows).toHaveLength(1)
          expect(result.rows[0].n).toBe(4)
        })

        it('stores a number typed into an existing row as a number', async () => {
          await connection.applyChanges({
            inserts: [],
            deletes: [],
            updates: [{
              table,
              column: 'n',
              value: '5',
              primaryKeys: [{ column: 'id', value: `${table}:1` }]
            }]
          })

          const [result] = await connection.executeQuery(
            `SELECT n FROM ${table}:1`
          )
          expect(result.rows[0].n).toBe(5)
        })
      })
    })

    // Table edits go through applyChanges, which deserializes the grid's values by
    // column type (transcoders) and binds everything with surql
    describe('Table edits', () => {
      const withTable = async (
        prefix: string,
        setup: (table: string) => string,
        run: (table: string) => Promise<void>
      ) => {
        const table = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
        try {
          await connection.executeQuery(setup(table))
          await run(table)
        } finally {
          try {
            await connection.executeQuery(`REMOVE TABLE ${table}`)
          } catch (_e) {
            // ignore
          }
        }
      }

      const selectAll = async (table: string) => {
        const [result] = await connection.executeQuery(`SELECT * FROM ${table}`)
        return result.rows
      }

      describe('inserts', () => {
        it('stores an insert with a bare id under that table', async () => {
          await withTable('edit_bare_id', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ id: 'abc', name: 'alpha' }] }]
            })

            const [result] = await connection.executeQuery(`SELECT * FROM ${t}:abc`)
            expect(result.rows).toHaveLength(1)
            expect(result.rows[0].id).toBe(`${t}:abc`)
          })
        })

        it('stores an insert with a full record id without wrapping it again', async () => {
          await withTable('edit_full_id', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ id: `${t}:full`, name: 'alpha' }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].id).toBe(`${t}:full`)
          })
        })

        it('generates an id when none is given', async () => {
          await withTable('edit_gen_id', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ name: 'alpha' }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].id.startsWith(`${t}:`)).toBe(true)
          })
        })

        it('stores field names that need escaping', async () => {
          await withTable('edit_idents', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ 'first name': 'a', select: 'b', 'with-dash': 'c' }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0]['first name']).toBe('a')
            expect(rows[0].select).toBe('b')
            expect(rows[0]['with-dash']).toBe('c')
          })
        })

        it('stores values literally instead of running them as SurrealQL', async () => {
          await withTable('edit_literal', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            const name = `x'; REMOVE TABLE ${t}; --`
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ name }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].name).toBe(name)
          })
        })

        it('keeps text that looks like a record id as a string in a string column', async () => {
          await withTable('edit_text_id', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD name ON ${t} TYPE string;
          `, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ name: 'note:hello' }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].name).toBe('note:hello')
          })
        })

        it('stores a record link typed into a record column as a record id', async () => {
          await withTable('edit_link', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD owner ON ${t} TYPE record<person>;
          `, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ owner: 'person:alice' }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].owner).toBe('person:alice')
          })
        })
      })

      describe('type conversion', () => {
        const typedTable = (t: string) => `
          DEFINE TABLE ${t} SCHEMAFULL;
          DEFINE FIELD i ON ${t} TYPE int;
          DEFINE FIELD f ON ${t} TYPE float;
          DEFINE FIELD n ON ${t} TYPE number;
          DEFINE FIELD d ON ${t} TYPE decimal;
          DEFINE FIELD b ON ${t} TYPE bool;
          DEFINE FIELD dt ON ${t} TYPE datetime;
          DEFINE FIELD du ON ${t} TYPE duration;
          DEFINE FIELD u ON ${t} TYPE uuid;
          DEFINE FIELD o ON ${t} TYPE object;
          DEFINE FIELD o.a ON ${t} TYPE option<int>;
          DEFINE FIELD a ON ${t} TYPE array<int>;
          DEFINE FIELD g ON ${t} TYPE geometry<point>;
          DEFINE FIELD oi ON ${t} TYPE option<int>;
        `

        const uuid = '0190f3a2-7b8c-7d4e-9f00-112233445566'

        // The grid sends every edited value as a string. SCHEMAFULL tables reject
        // strings for typed fields, so a successful insert means each one was converted.
        it('converts typed strings for SCHEMAFULL fields on insert', async () => {
          await withTable('edit_types_insert', typedTable, async (t) => {
            await connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{
                table: t,
                data: [{
                  id: `${t}:1`,
                  i: '4',
                  f: '4.5',
                  n: '6',
                  d: '1.25',
                  b: 'false',
                  dt: '2026-01-02T03:04:05Z',
                  du: '1h30m',
                  u: uuid,
                  o: '{"a":1}',
                  a: '[1,2]',
                  g: '{"type":"Point","coordinates":[1,2]}',
                  oi: '3',
                }]
              }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            const row = rows[0]
            expect(row.i).toBe(4)
            expect(row.f).toBe(4.5)
            expect(row.n).toBe(6)
            expect(String(row.d)).toBe('1.25')
            expect(row.b).toBe(false)
            expect(String(row.dt)).toContain('2026-01-02T03:04:05')
            expect(String(row.du)).toBe('1h30m')
            expect(String(row.u)).toBe(uuid)
            expect(row.o).toEqual({ a: 1 })
            expect(row.a).toEqual([1, 2])
            expect(row.g).toEqual({ type: 'Point', coordinates: [1, 2] })
            expect(row.oi).toBe(3)
          })
        })

        it('converts typed strings for SCHEMAFULL fields on update', async () => {
          await withTable('edit_types_update', (t) => `
            ${typedTable(t)}
            CREATE ${t}:1 SET i = 1, f = 1.5, n = 1, d = 1.0dec, b = true,
              dt = d'2026-01-01T00:00:00Z', du = 1h, u = u'${uuid}', o = {}, a = [],
              g = (0, 0);
          `, async (t) => {
            const update = (column: string, value: string) => ({
              table: t,
              column,
              value,
              primaryKeys: [{ column: 'id', value: `${t}:1` }]
            })

            await connection.applyChanges({
              inserts: [],
              deletes: [],
              updates: [
                update('i', '7'),
                update('f', '2.25'),
                update('d', '2.5'),
                update('b', 'false'),
                update('du', '2h'),
                update('a', '[3]'),
              ]
            })

            const [result] = await connection.executeQuery(`SELECT * FROM ${t}:1`)
            const row = result.rows[0]
            expect(row.i).toBe(7)
            expect(row.f).toBe(2.25)
            expect(String(row.d)).toBe('2.5')
            expect(row.b).toBe(false)
            expect(String(row.du)).toBe('2h')
            expect(row.a).toEqual([3])
          })
        })

        // '0' and 'false' convert to falsy values, which must not fall back to the original string
        it('stores zero and false instead of the strings typed in', async () => {
          await withTable('edit_falsy', (t) => `
            DEFINE TABLE ${t} SCHEMALESS;
            CREATE ${t}:1 SET n = 1, flag = true;
          `, async (t) => {
            await connection.applyChanges({
              deletes: [],
              inserts: [{ table: t, data: [{ id: `${t}:2`, n: '0', flag: 'false' }] }],
              updates: [
                { table: t, column: 'n', value: '0', primaryKeys: [{ column: 'id', value: `${t}:1` }] },
                { table: t, column: 'flag', value: 'false', primaryKeys: [{ column: 'id', value: `${t}:1` }] },
              ]
            })

            const [inserted] = await connection.executeQuery(`SELECT * FROM ${t}:2`)
            expect(inserted.rows[0].n).toBe(0)
            expect(inserted.rows[0].flag).toBe(false)

            const [updated] = await connection.executeQuery(`SELECT * FROM ${t}:1`)
            expect(updated.rows[0].n).toBe(0)
            expect(updated.rows[0].flag).toBe(false)
          })
        })

        it('leaves values that do not parse for the database to reject', async () => {
          await withTable('edit_invalid', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD i ON ${t} TYPE int;
          `, async (t) => {
            await expect(connection.applyChanges({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ i: 'abc' }] }]
            })).rejects.toThrow()

            expect(await selectAll(t)).toHaveLength(0)
          })
        })
      })

      describe('updates and deletes', () => {
        it('updates a column whose name needs escaping', async () => {
          await withTable('edit_update_ident', (t) => `
            DEFINE TABLE ${t} SCHEMALESS;
            CREATE ${t}:1 SET \`first name\` = 'a';
          `, async (t) => {
            await connection.applyChanges({
              inserts: [],
              deletes: [],
              updates: [{
                table: t,
                column: 'first name',
                value: 'b',
                primaryKeys: [{ column: 'id', value: `${t}:1` }]
              }]
            })

            const [result] = await connection.executeQuery(`SELECT * FROM ${t}:1`)
            expect(result.rows[0]['first name']).toBe('b')
          })
        })

        it('deletes a record', async () => {
          await withTable('edit_delete', (t) => `
            DEFINE TABLE ${t} SCHEMALESS;
            CREATE ${t}:1 SET n = 1;
            CREATE ${t}:2 SET n = 2;
          `, async (t) => {
            await connection.applyChanges({
              inserts: [],
              updates: [],
              deletes: [{ table: t, primaryKeys: [{ column: 'id', value: `${t}:1` }] }]
            })

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].id).toBe(`${t}:2`)
          })
        })

        // Mimics the table view: rows from selectTop cross IPC, then an edited cell comes back
        it('edits a row using the values selectTop returned', async () => {
          await withTable('edit_round_trip', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD name ON ${t} TYPE string;
            DEFINE FIELD d ON ${t} TYPE decimal;
            CREATE ${t}:1 SET name = 'alpha', d = 1.5dec;
          `, async (t) => {
            const { result } = await connection.selectTop(t, 0, 10, [], [])
            const [row] = structuredClone(result)
            expect(row.id).toBe(`${t}:1`)

            await connection.applyChanges({
              inserts: [],
              deletes: [],
              updates: [{
                table: t,
                column: 'd',
                value: '2.75',
                primaryKeys: [{ column: 'id', value: row.id }]
              }]
            })

            const [after] = await connection.executeQuery(`SELECT * FROM ${t}:1`)
            expect(String(after.rows[0].d)).toBe('2.75')
            expect(after.rows[0].name).toBe('alpha')
          })
        })
      })

      describe('listTableColumns', () => {
        it('lists the implicit id column for an empty schemaless table', async () => {
          await withTable('cols_empty', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            const columns = await connection.listTableColumns(t)
            const id = columns.find((c) => c.columnName === 'id')

            expect(id).toBeDefined()
            expect(id.bksField.bksType).toBe('SURREALID')
          })
        })

        it('leaves out nested field definitions', async () => {
          await withTable('cols_nested', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD address ON ${t} TYPE option<object>;
            DEFINE FIELD address.city ON ${t} TYPE string;
            DEFINE FIELD tags ON ${t} TYPE array<string>;
          `, async (t) => {
            const names = (await connection.listTableColumns(t)).map((c) => c.columnName)

            expect(names).toEqual(expect.arrayContaining(['id', 'address', 'tags']))
            expect(names.some((n) => n.startsWith('address.'))).toBe(false)
            // A typed array defines its element field itself: tags[*] on v2, tags.* on v3+
            expect(names.some((n) => n.startsWith('tags[') || n.startsWith('tags.'))).toBe(false)
          })
        })

        it('assigns a bksType for each field kind', async () => {
          await withTable('cols_types', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD s ON ${t} TYPE string;
            DEFINE FIELD i ON ${t} TYPE int;
            DEFINE FIELD f ON ${t} TYPE float;
            DEFINE FIELD d ON ${t} TYPE decimal;
            DEFINE FIELD n ON ${t} TYPE number;
            DEFINE FIELD b ON ${t} TYPE bool;
            DEFINE FIELD dt ON ${t} TYPE datetime;
            DEFINE FIELD du ON ${t} TYPE duration;
            DEFINE FIELD u ON ${t} TYPE uuid;
            DEFINE FIELD o ON ${t} TYPE object;
            DEFINE FIELD a ON ${t} TYPE array<string>;
            DEFINE FIELD g ON ${t} TYPE geometry<point>;
            DEFINE FIELD r ON ${t} TYPE option<record<person>>;
            DEFINE FIELD x ON ${t} TYPE any;
          `, async (t) => {
            const columns = await connection.listTableColumns(t)
            const types = Object.fromEntries(columns.map((c) => [c.columnName, c.bksField.bksType]))

            expect(types).toMatchObject({
              id: 'SURREALID',
              s: 'STRING',
              i: 'INTEGER',
              f: 'FLOAT',
              d: 'DECIMAL',
              n: 'NUMBER',
              b: 'BOOLEAN',
              dt: 'DATETIME',
              du: 'DURATION',
              u: 'UUID',
              o: 'OBJECT',
              a: 'ARRAY',
              g: 'GEOMETRY',
              r: 'SURREALID',
              x: 'UNKNOWN',
            })
          })
        })
      })

      describe('selectTop serialization', () => {
        // Table view rows cross IPC (structured clone), so SDK values have to arrive as plain values
        it('returns SDK values in a form that survives the trip to the renderer', async () => {
          await withTable('serialize_values', (t) => `
            DEFINE TABLE ${t} SCHEMAFULL;
            DEFINE FIELD d ON ${t} TYPE decimal;
            DEFINE FIELD du ON ${t} TYPE duration;
            DEFINE FIELD u ON ${t} TYPE uuid;
            DEFINE FIELD dt ON ${t} TYPE datetime;
            DEFINE FIELD g ON ${t} TYPE geometry<point>;
            DEFINE FIELD r ON ${t} TYPE record<person>;
            CREATE ${t}:1 SET d = 1.25dec, du = 1h30m, u = u'0190f3a2-7b8c-7d4e-9f00-112233445566',
              dt = d'2026-01-02T03:04:05Z', g = (1, 2), r = person:alice;
          `, async (t) => {
            const { result, fields } = await connection.selectTop(t, 0, 10, [], [])
            const [row] = structuredClone(result)

            expect(row.id).toBe(`${t}:1`)
            expect(row.d).toBe('1.25')
            expect(row.du).toBe('1h30m')
            expect(row.u).toBe('0190f3a2-7b8c-7d4e-9f00-112233445566')
            expect(String(row.dt)).toContain('2026-01-02T03:04:05')
            expect(row.g).toEqual({ type: 'Point', coordinates: [1, 2] })
            expect(row.r).toBe('person:alice')

            const types = Object.fromEntries(fields.map((f) => [f.name, f.bksType]))
            expect(types).toMatchObject({
              id: 'SURREALID',
              d: 'DECIMAL',
              du: 'DURATION',
              u: 'UUID',
              dt: 'DATETIME',
              g: 'GEOMETRY',
              r: 'SURREALID',
            })
          })
        })
      })

      describe('applyChangesSql', () => {
        it('generates SurrealQL that runs and makes the same change', async () => {
          await withTable('edit_sql', (t) => `DEFINE TABLE ${t} SCHEMALESS;`, async (t) => {
            const sql = await connection.applyChangesSql({
              updates: [],
              deletes: [],
              inserts: [{ table: t, data: [{ name: 'alpha', note: "it's" }] }]
            })

            expect(sql).toContain('LET $')
            expect(sql).toContain('CREATE')

            await connection.executeQuery(sql)

            const rows = await selectAll(t)
            expect(rows).toHaveLength(1)
            expect(rows[0].name).toBe('alpha')
            expect(rows[0].note).toBe("it's")
          })
        })
      })
    })
  })
}

TEST_VERSIONS.forEach(({ version, protocol }) => testWith(version, protocol));
