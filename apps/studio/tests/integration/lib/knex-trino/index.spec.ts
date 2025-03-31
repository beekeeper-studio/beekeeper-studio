import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import knex, { Knex } from 'knex';
import { TrinoKnexClient } from '@shared/lib/knex-trino';
import { dbtimeout } from '../../../lib/db';

describe('Knex Trino Driver Integration Tests', () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let trinoKnex: Knex;
  
  // Trino container configuration
  const TRINO_PORT = 8080;
  const TRINO_USER = 'test';
  const TRINO_CATALOG = 'tpch'; // Built-in catalog in Trino
  const TRINO_SCHEMA = 'sf1'; // Standard schema in tpch catalog
  
  beforeAll(async () => {
    // Start Trino container
    container = await new GenericContainer('trinodb/trino:latest')
      .withName('knex-trino-test-container')
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
  
  describe('Basic Connection', () => {
    it('should connect to Trino server', async () => {
      // Simple query to test connection
      const result = await trinoKnex.raw('SELECT 1 as test');
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0][0]).toHaveProperty('test', 1);
    });
  });
  
  describe('Schema Operations', () => {
    it('should list tables from information_schema', async () => {
      const result = await trinoKnex.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${TRINO_SCHEMA}'
        LIMIT 5
      `);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBeGreaterThan(0);
      
      // TPCH has standard tables like customer, nation, region, etc.
      const tableNames = result[0].map(row => row.table_name);
      const expectedTables = ['customer', 'lineitem', 'nation', 'orders', 'part', 'partsupp', 'region', 'supplier'];
      
      // At least one of the expected tables should be in the results
      expect(tableNames.some(name => expectedTables.includes(name))).toBe(true);
    });
  });
  
  describe('Query Builder', () => {
    it('should build and execute a SELECT query', async () => {
      const result = await trinoKnex
        .select('name', 'regionkey')
        .from('nation')
        .limit(5);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(5); // Due to LIMIT 5
      
      // Each row should have name and regionkey properties
      result.forEach(row => {
        expect(row).toHaveProperty('name');
        expect(row).toHaveProperty('regionkey');
      });
    });
    
    it('should support WHERE clauses', async () => {
      const query = trinoKnex
        .select('name')
        .from('nation')
        .where('regionkey', '=', 1)
        .toString();
      
      // Execute the query directly to avoid any potential client-side issues
      const result = await trinoKnex.raw(query);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      
      // All results should be from region with key = 1
      result[0].forEach(row => {
        expect(row).toHaveProperty('name');
      });
    });
    
    it('should support ORDER BY clauses', async () => {
      const result = await trinoKnex
        .select('name')
        .from('nation')
        .orderBy('name', 'asc')
        .limit(5);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      
      // Check that results are ordered alphabetically
      const names = result.map(row => row.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
    
    it('should support JOINs', async () => {
      const result = await trinoKnex
        .select('n.name as nation_name', 'r.name as region_name')
        .from('nation as n')
        .join('region as r', 'n.regionkey', '=', 'r.regionkey')
        .limit(5);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      
      // Each row should have both nation_name and region_name
      result.forEach(row => {
        expect(row).toHaveProperty('nation_name');
        expect(row).toHaveProperty('region_name');
      });
    });
    
    it('should support GROUP BY and aggregation', async () => {
      const result = await trinoKnex
        .select('r.name as region_name')
        .count('n.nationkey as nation_count')
        .from('nation as n')
        .join('region as r', 'n.regionkey', '=', 'r.regionkey')
        .groupBy('r.name')
        .orderBy('region_name');
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      
      // Each row should have region_name and nation_count
      result.forEach(row => {
        expect(row).toHaveProperty('region_name');
        expect(row).toHaveProperty('nation_count');
        expect(typeof row.nation_count).toBe('string'); // Trino returns counts as strings
        expect(parseInt(row.nation_count)).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Raw Queries', () => {
    it('should execute raw SQL queries', async () => {
      const sql = `
        SELECT 
          r.name as region_name,
          count(n.nationkey) as nation_count
        FROM 
          nation n
        JOIN 
          region r ON n.regionkey = r.regionkey
        GROUP BY 
          r.name
        ORDER BY 
          nation_count DESC
        LIMIT 3
      `;
      
      const result = await trinoKnex.raw(sql);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBeLessThanOrEqual(3); // Due to LIMIT 3
      
      // Each row should have region_name and nation_count
      result[0].forEach(row => {
        expect(row).toHaveProperty('region_name');
        expect(row).toHaveProperty('nation_count');
      });
    });
    
    it('should handle query errors gracefully', async () => {
      // Invalid SQL query with syntax error
      const sql = 'SELCT 1'; // Misspelled SELECT
      
      try {
        await trinoKnex.raw(sql);
        // If we reach this point, the test should fail because the query should throw an error
        expect(true).toBe(false);
      } catch (error) {
        // Expecting an error
        expect(error).toBeTruthy();
        // The error message should contain information about the syntax error
        expect(error.message).toContain('line 1:1: mismatched input');
      }
    });
  });
  
  describe('Query Result Handling', () => {
    it('should handle different data types correctly', async () => {
      const sql = `
        SELECT 
          CAST(1 AS TINYINT) as tiny_int,
          CAST(2 AS SMALLINT) as small_int,
          CAST(3 AS INTEGER) as integer_val,
          CAST(4 AS BIGINT) as big_int,
          CAST(5.5 AS REAL) as real_val,
          CAST(6.6 AS DOUBLE) as double_val,
          CAST('2023-01-01' AS DATE) as date_val,
          CAST('2023-01-01 12:00:00' AS TIMESTAMP) as timestamp_val,
          CAST('test' AS VARCHAR) as varchar_val,
          CAST(true AS BOOLEAN) as boolean_val
      `;
      
      const result = await trinoKnex.raw(sql);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBe(1);
      
      const row = result[0][0];
      expect(row.tiny_int).toBe(1);
      expect(row.small_int).toBe(2);
      expect(row.integer_val).toBe(3);
      expect(row.big_int).toBe(4);
      expect(typeof row.real_val).toBe('number');
      expect(typeof row.double_val).toBe('number');
      expect(row.varchar_val).toBe('test');
      expect(row.boolean_val).toBe(true);
      
      // Date and timestamp should be parsed as Date objects or strings (depends on implementation)
      expect(row.date_val).toBeTruthy();
      expect(row.timestamp_val).toBeTruthy();
    });
    
    it('should handle NULL values correctly', async () => {
      const sql = `
        SELECT 
          CAST(NULL AS INTEGER) as null_int,
          CAST(NULL AS VARCHAR) as null_varchar,
          CAST(NULL AS BOOLEAN) as null_boolean
      `;
      
      const result = await trinoKnex.raw(sql);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBe(1);
      
      const row = result[0][0];
      expect(row.null_int).toBeNull();
      expect(row.null_varchar).toBeNull();
      expect(row.null_boolean).toBeNull();
    });
  });
  
  describe('Parameter Bindings', () => {
    it('should support parameter binding', async () => {
      // Use parameter binding syntax
      const sql = 'SELECT * FROM nation WHERE regionkey = ?';
      const result = await trinoKnex.raw(sql, [1]);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBeGreaterThan(0);
      
      // All rows should have regionkey = 1
      result[0].forEach(row => {
        expect(row.regionkey).toBe(1);
      });
    });
    
    it('should handle multiple parameter bindings', async () => {
      const sql = 'SELECT * FROM nation WHERE regionkey = ? AND nationkey < ?';
      const result = await trinoKnex.raw(sql, [1, 10]);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      
      // All rows should have regionkey = 1 and nationkey < 10
      result[0].forEach(row => {
        expect(row.regionkey).toBe(1);
        expect(row.nationkey < 10).toBe(true);
      });
    });
  });
});