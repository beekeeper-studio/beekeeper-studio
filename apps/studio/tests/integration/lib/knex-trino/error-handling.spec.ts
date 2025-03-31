import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import knex, { Knex } from 'knex';
import { TrinoKnexClient } from '@shared/lib/knex-trino';
import { dbtimeout } from '../../../lib/db';

describe('Knex Trino Error Handling and Edge Cases', () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let trinoKnex: Knex;
  
  // Trino container configuration
  const TRINO_PORT = 8080;
  const TRINO_USER = 'test';
  const TRINO_CATALOG = 'memory'; // Use the in-memory connector for tests
  const TRINO_SCHEMA = 'default';
  
  beforeAll(async () => {
    // Start Trino container
    container = await new GenericContainer('trinodb/trino:latest')
      .withName('knex-trino-error-test-container')
      .withExposedPorts(TRINO_PORT)
      .withHealthCheck({
        test: ['CMD', 'curl', '-f', 'http://localhost:8080/v1/info'],
        interval: 2000,
        timeout: 3000,
        retries: 20,
        startPeriod: 10000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();
    
    // Configure knex with our Trino driver
    trinoKnex = knex({
      client: TrinoKnexClient,
      connection: {
        host: container.getHost(),
        port: container.getMappedPort(TRINO_PORT),
        user: TRINO_USER,
        catalog: TRINO_CATALOG,
        schema: TRINO_SCHEMA,
      },
    });
    
    // Create a new schema in memory connector for testing
    await trinoKnex.raw(`CREATE SCHEMA IF NOT EXISTS ${TRINO_CATALOG}.${TRINO_SCHEMA}`);
  });
  
  afterAll(async () => {
    // Cleanup resources
    if (trinoKnex) {
      await trinoKnex.destroy();
    }
    
    if (container) {
      await container.stop();
    }
  });
  
  describe('Error Handling', () => {
    it('should properly handle syntax errors in queries', async () => {
      const invalidSql = 'SELEC * FROM non_existent_table'; // Intentional typo
      
      try {
        await trinoKnex.raw(invalidSql);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
        expect(error.message).toContain('line 1:1'); // Error should show line and position
        expect(error.message).toContain('mismatched input'); // Error should explain the syntax error
      }
    });
    
    it('should handle queries on non-existent tables', async () => {
      try {
        await trinoKnex.select('*').from('non_existent_table');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
        expect(error.message).toContain('does not exist'); // Error should explain table doesn't exist
      }
    });
    
    it('should handle queries with non-existent columns', async () => {
      // Create a test table
      const TEST_TABLE = 'error_test_table';
      await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR
        )
      `);
      
      try {
        await trinoKnex(TEST_TABLE).select('non_existent_column');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
        expect(error.message).toContain('Column'); // Error should mention column
        expect(error.message).toContain('cannot be resolved'); // Error should explain column doesn't exist
      } finally {
        // Clean up
        await trinoKnex.schema.dropTableIfExists(TEST_TABLE);
      }
    });
    
    it('should handle errors when inserting invalid data types', async () => {
      // Create a test table with INT column
      const TEST_TABLE = 'type_error_test_table';
      await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          int_column INTEGER  -- This expects an integer
        )
      `);
      
      try {
        // Try to insert a string into an integer column
        await trinoKnex(TEST_TABLE).insert({
          id: 1,
          int_column: 'not_an_integer' // This should cause a type error
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
        // The exact error message might vary, but should indicate type mismatch
        expect(error.message).toBeTruthy();
      } finally {
        // Clean up
        await trinoKnex.schema.dropTableIfExists(TEST_TABLE);
      }
    });
  });
  
  describe('Edge Cases', () => {
    const TEST_TABLE = 'edge_case_test_table';
    
    beforeEach(async () => {
      // Create fresh test table before each test
      await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR(255),
          value INTEGER
        )
      `);
    });
    
    afterEach(async () => {
      // Clean up test table after each test
      await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    });
    
    it('should handle empty result sets', async () => {
      const result = await trinoKnex(TEST_TABLE).select('*').where('id', 9999); // No such ID
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0); // Empty array for no results
    });
    
    it('should handle inserting and retrieving Unicode/special characters', async () => {
      const specialString = 'Trino Test: 你好, سلام, שלום, привет, γεια, こんにちは';
      
      await trinoKnex.raw(`
        INSERT INTO ${TEST_TABLE} (id, name, value)
        VALUES (1, '${specialString}', 42)
      `);
      
      const result = await trinoKnex(TEST_TABLE).select('*').where('id', 1);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe(specialString);
    });
    
    it('should handle very long queries', async () => {
      // Create a very long query with many conditions
      let query = trinoKnex(TEST_TABLE).select('*').where('id', '>', 0);
      
      // Add many AND conditions to make the query very long
      for (let i = 1; i <= 100; i++) {
        query = query.andWhere('id', '!=', i * 1000);
      }
      
      // This should generate a very long SQL query
      const result = await query;
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('should handle queries with many placeholders', async () => {
      // Insert test data with raw SQL
      await trinoKnex.raw(`
        INSERT INTO ${TEST_TABLE} (id, name, value)
        VALUES 
          (1, 'Item 1', 10),
          (2, 'Item 2', 20),
          (3, 'Item 3', 30),
          (4, 'Item 4', 40),
          (5, 'Item 5', 50)
      `);
      
      // Create a query with many placeholders (IN clause with many values)
      const values = Array.from({ length: 50 }, (_, i) => i + 1); // [1,2,3,...,50]
      
      const result = await trinoKnex(TEST_TABLE)
        .select('*')
        .whereIn('id', values)
        .orderBy('id');
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5); // Only IDs 1-5 exist in the table
    });
    
    it('should handle large result sets', async () => {
      // Insert a larger number of rows using multiple inserts
      // We'll do batches of 50 to avoid too large SQL statements
      for (let batch = 0; batch < 4; batch++) {
        let batchValues = [];
        for (let i = 1; i <= 50; i++) {
          const id = batch * 50 + i;
          batchValues.push(`(${id}, 'Item ${id}', ${id * 10})`);
        }
        
        await trinoKnex.raw(`
          INSERT INTO ${TEST_TABLE} (id, name, value)
          VALUES ${batchValues.join(', ')}
        `);
      }
      
      // Query all rows
      const result = await trinoKnex(TEST_TABLE).select('*').orderBy('id');
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(200);
      
      // Check first and last rows
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('Item 1');
      expect(result[199].id).toBe(200);
      expect(result[199].name).toBe('Item 200');
    });
  });
  
  describe('Connection Handling', () => {
    it('should handle reconnection after connection issues', async () => {
      // First query to verify connection works
      const result1 = await trinoKnex.raw('SELECT 1 as test');
      expect(result1).toBeTruthy();
      
      // Destroy the connection
      await trinoKnex.destroy();
      
      // Create a new connection
      const newTrinoKnex = knex({
        client: TrinoKnexClient,
        connection: {
          host: container.getHost(),
          port: container.getMappedPort(TRINO_PORT),
          user: TRINO_USER,
          catalog: TRINO_CATALOG,
          schema: TRINO_SCHEMA,
        },
      });
      
      // Try another query with the new connection
      const result2 = await newTrinoKnex.raw('SELECT 2 as test');
      expect(result2).toBeTruthy();
      expect(result2[0][0].test).toBe(2);
      
      // Cleanup
      await newTrinoKnex.destroy();
    });
  });
});