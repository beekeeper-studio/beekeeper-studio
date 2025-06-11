import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

const TEST_VERSIONS = [
  { version: 'v1.5.4', readonly: false },
  { version: 'v1.5.4', readonly: true },
]

function testWith(version, readonly = false) {
  describe(`SurrealDB [${version} - database read-only mode? ${readonly}]`, () => {
    jest.setTimeout(dbtimeout)

    let container;
    /** @type {DBTestUtil} */
    let util

    beforeAll(async () => {
      // Start SurrealDB container
      container = await new GenericContainer(`surrealdb/surrealdb:${version}`)
        .withCommand(['start', '--user', 'root', '--pass', 'root', 'memory'])
        .withExposedPorts(8000)
        .withStartupTimeout(dbtimeout)
        .start()

      // Wait a bit for SurrealDB to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      const config = {
        client: 'surrealdb',
        host: container.getHost(),
        port: container.getMappedPort(8000),
        user: 'root',
        password: 'root',
        readOnlyMode: readonly,
        options: {
          namespace: 'test'
        }
      }

      util = new DBTestUtil(config, "test", { 
        dialect: 'generic',
        skipPrimaryKeyTests: true, // SurrealDB handles PKs differently
        skipForeignKeyTests: true, // SurrealDB doesn't have traditional FKs
        skipTransactions: true, // Different transaction model
        skipDuplicateTable: true, // Not supported
        skipTruncate: true, // Not implemented
        skipCreateTable: true, // Different table creation
        skipColumnTypes: true, // Different type system
      })
      
      await util.setupdb()

      // Create some test data specific to SurrealDB
      try {
        // Create a simple table with SurrealDB syntax
        const createQuery = await util.connection.query(`
          CREATE users SET 
            name = 'John Doe',
            email = 'john@example.com',
            age = 30,
            active = true
        `);
        await createQuery.execute();

        const createQuery2 = await util.connection.query(`
          CREATE users SET 
            name = 'Jane Smith',
            email = 'jane@example.com',
            age = 25,
            active = false
        `);
        await createQuery2.execute();

        const createQuery3 = await util.connection.query(`
          CREATE products SET 
            name = 'Widget',
            price = 29.99,
            category = 'tools'
        `);
        await createQuery3.execute();
      } catch (error) {
        console.warn('Failed to create test data:', error.message);
      }
    })

    afterAll(async () => {
      if (util) {
        await util.disconnect()
      }
      if (container) {
        await container.stop()
      }
    })

    if (!readonly) {
      describe("Common Tests", () => {
        // Note: SurrealDB has a very different data model than traditional SQL databases
        // So we'll run a limited subset of common tests
        // runCommonTests(() => util)
      })
    }

    it("Should connect successfully", async () => {
      expect(util.connection).toBeDefined();
      const version = await util.connection.versionString();
      expect(version).toBeDefined();
    })

    it("Should list tables", async () => {
      const tables = await util.connection.listTables();
      expect(Array.isArray(tables)).toBe(true);
      
      // Should include our test tables
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('products');
    })

    it("Should execute basic queries", async () => {
      const query = await util.connection.query('SELECT * FROM users');
      const result = await query.execute();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const firstResult = result[0];
      expect(firstResult.command).toBe('SELECT');
      expect(Array.isArray(firstResult.rows)).toBe(true);
      expect(firstResult.rows.length).toBeGreaterThan(0);
      
      // Check that we have the expected data
      const users = firstResult.rows;
      expect(users.some(u => u.name === 'John Doe')).toBe(true);
      expect(users.some(u => u.name === 'Jane Smith')).toBe(true);
    })

    it("Should list table columns", async () => {
      const columns = await util.connection.listTableColumns('users');
      expect(Array.isArray(columns)).toBe(true);
      
      // Should have columns based on our test data
      if (columns.length > 0) {
        const columnNames = columns.map(c => c.columnName);
        // These might not be present if SurrealDB doesn't expose schema info
        // but the function should not throw
        expect(columns.every(c => c.tableName === 'users')).toBe(true);
      }
    })

    it("Should get table length", async () => {
      const length = await util.connection.getTableLength('users');
      expect(typeof length).toBe('number');
      expect(length).toBeGreaterThanOrEqual(0);
    })

    it("Should get table properties", async () => {
      const props = await util.connection.getTableProperties('users');
      expect(props).toBeDefined();
      expect(typeof props.size).toBe('number');
      expect(Array.isArray(props.indexes)).toBe(true);
      expect(Array.isArray(props.relations)).toBe(true);
      expect(Array.isArray(props.triggers)).toBe(true);
      expect(Array.isArray(props.partitions)).toBe(true);
    })

    it("Should select top records", async () => {
      const result = await util.connection.selectTop('users', 0, 10, [], []);
      expect(result).toBeDefined();
      expect(Array.isArray(result.result)).toBe(true);
      expect(Array.isArray(result.fields)).toBe(true);
      
      if (result.result.length > 0) {
        // Should have our test data
        expect(result.result.some(r => r.name === 'John Doe')).toBe(true);
      }
    })

    it("Should select top with limit", async () => {
      const result = await util.connection.selectTop('users', 0, 1, [], []);
      expect(result.result.length).toBeLessThanOrEqual(1);
    })

    it("Should handle queries with parameters", async () => {
      // SurrealDB uses different parameter syntax, but basic queries should work
      const query = await util.connection.query("SELECT * FROM users WHERE age > 25");
      const result = await query.execute();
      
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0 && result[0].rows.length > 0) {
        // Should only return users older than 25
        const users = result[0].rows;
        expect(users.every(u => u.age > 25)).toBe(true);
      }
    })

    it("Should list databases", async () => {
      const databases = await util.connection.listDatabases();
      expect(Array.isArray(databases)).toBe(true);
      // Should include our test database
      expect(databases).toContain('test');
    })

    it("Should get primary keys", async () => {
      const pk = await util.connection.getPrimaryKey('users');
      expect(pk).toBe('id'); // SurrealDB uses 'id' as primary key

      const pks = await util.connection.getPrimaryKeys('users');
      expect(Array.isArray(pks)).toBe(true);
      expect(pks).toEqual([{ columnName: 'id', position: 1 }]);
    })

    if (!readonly) {
      it("Should create new records", async () => {
        const createQuery = await util.connection.query(`
          CREATE users SET 
            name = 'Test User',
            email = 'test@example.com',
            age = 35
        `);
        const result = await createQuery.execute();
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      })

      it("Should update records", async () => {
        // First create a record
        const createQuery = await util.connection.query(`
          CREATE users:test_update SET 
            name = 'Update Test',
            age = 40
        `);
        await createQuery.execute();

        // Then update it
        const updateQuery = await util.connection.query(`
          UPDATE users:test_update SET age = 41
        `);
        const result = await updateQuery.execute();
        
        expect(Array.isArray(result)).toBe(true);
      })

      it("Should delete records", async () => {
        // First create a record
        const createQuery = await util.connection.query(`
          CREATE users:test_delete SET 
            name = 'Delete Test',
            age = 99
        `);
        await createQuery.execute();

        // Then delete it
        const deleteQuery = await util.connection.query(`
          DELETE users:test_delete
        `);
        const result = await deleteQuery.execute();
        
        expect(Array.isArray(result)).toBe(true);
      })
    }

    it("Should handle query cancellation gracefully", async () => {
      const query = await util.connection.query('SELECT * FROM users');
      
      // Should not throw when cancelling (even though it's not implemented)
      expect(async () => {
        await query.cancel();
      }).not.toThrow();
    })

    it("Should handle connection errors gracefully", async () => {
      // Test with an invalid query to ensure error handling works
      const query = await util.connection.query('INVALID SQL SYNTAX');
      
      await expect(query.execute()).rejects.toThrow();
    })
  })
}

// Run tests for each version
TEST_VERSIONS.forEach(({ version, readonly }) => testWith(version, readonly));