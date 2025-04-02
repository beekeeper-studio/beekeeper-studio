import { Knex } from 'knex';
import { dbtimeout } from '../../../lib/db';
import { getTrinoTestContainer, stopTrinoTestContainer } from '../../lib/testcontainers/TrinoTestContainer';

describe('Knex Trino Schema Integration Tests', () => {
  jest.setTimeout(dbtimeout);

  let trinoKnex: Knex;

  // Trino container configuration
  const TRINO_CATALOG = 'memory'; // Use the in-memory connector for schema tests
  const TRINO_SCHEMA = 'default';

  beforeAll(async () => {
    // Start Trino container
    const trinoContainer = getTrinoTestContainer();
    await trinoContainer.start({
      containerName: 'knex-trino-schema-test-container',
      withMemoryCatalog: true
    });

    // Initialize schema in memory catalog
    await trinoContainer.initializeMemorySchema(TRINO_SCHEMA);

    // Configure knex with our Trino driver
    trinoKnex = trinoContainer.getKnexInstance({
      catalog: TRINO_CATALOG,
      schema: TRINO_SCHEMA
    });
  });

  afterAll(async () => {
    await stopTrinoTestContainer();
  });

  describe('Table Operations', () => {
    const TEST_TABLE = 'test_table';

    afterEach(async () => {
      // Clean up test table after each test
      try {
        await trinoKnex.schema.dropTableIfExists(TEST_TABLE);
      } catch (error) {
        // Ignore errors if table doesn't exist
      }
    });

    it('should create a table with various column types', async () => {
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR(255),
          description VARCHAR,
          count INTEGER,
          price REAL,
          active BOOLEAN,
          created_date DATE,
          updated_at TIMESTAMP
        )
      `);

      // Verify the table was created by querying its structure
      const result = await trinoKnex.raw(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${TEST_TABLE}'
        AND table_schema = '${TRINO_SCHEMA}'
      `);

      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);

      // Convert result to a map for easier assertions
      const columns = {};
      result[0].forEach(col => {
        columns[col.column_name] = col.data_type.toLowerCase();
      });

      // Check that our columns exist with correct types
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('description');
      expect(columns).toHaveProperty('count');
      expect(columns).toHaveProperty('price');
      expect(columns).toHaveProperty('active');
      expect(columns).toHaveProperty('created_date');
      expect(columns).toHaveProperty('updated_at');

      // Check some specific types
      expect(columns.name).toContain('varchar');
      expect(columns.count).toContain('integer');
      expect(columns.active).toContain('boolean');
    });

    it('should drop a table if it exists', async () => {
      // First create the table
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR
        )
      `);

      // Now drop it
      await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);

      // Verify the table no longer exists
      const result = await trinoKnex.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = '${TEST_TABLE}'
        AND table_schema = '${TRINO_SCHEMA}'
      `);

      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBe(0); // Table should not exist
    });

    it('should check if a table exists', async () => {
      // First make sure the table doesn't exist
      await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);

      // Check existence manually - should be false
      const resultBefore = await trinoKnex.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = '${TEST_TABLE}'
        AND table_schema = '${TRINO_SCHEMA}'
      `);
      const existsBefore = resultBefore[0].length > 0;
      expect(existsBefore).toBe(false);

      // Create the table
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER
        )
      `);

      // Check existence again - should be true
      const existsAfter = await trinoKnex.schema.hasTable(TEST_TABLE);
      expect(existsAfter).toBe(true);
    });

    it('should insert data into a table', async () => {
      // Create a table
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR,
          value INTEGER
        )
      `);

      // Insert data with raw SQL
      await trinoKnex.raw(`
        INSERT INTO ${TEST_TABLE} (id, name, value)
        VALUES
          (1, 'Item 1', 100),
          (2, 'Item 2', 200),
          (3, 'Item 3', 300)
      `);

      // Verify the data was inserted
      const result = await trinoKnex.select().from(TEST_TABLE).orderBy('value');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);

      expect(result[0].name).toBe('Item 1');
      expect(result[0].value).toBe(100);
      expect(result[1].name).toBe('Item 2');
      expect(result[1].value).toBe(200);
      expect(result[2].name).toBe('Item 3');
      expect(result[2].value).toBe(300);
    });
  });

  describe('Column Operations', () => {
    const TEST_TABLE = 'column_test_table';

    beforeEach(async () => {
      // Create a fresh test table before each test
      try {
        await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
      } catch (error) {
        // Ignore errors if table doesn't exist
      }

      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR
        )
      `);
    });

    afterEach(async () => {
      // Clean up test table after each test
      try {
        await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
      } catch (error) {
        // Ignore errors if table doesn't exist
      }
    });

    it('should add a column to an existing table', async () => {
      // Add a new column
      await trinoKnex.raw(`
        ALTER TABLE ${TEST_TABLE} ADD COLUMN count INTEGER
      `);

      // Verify the column was added
      const result = await trinoKnex.raw(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${TEST_TABLE}'
        AND table_schema = '${TRINO_SCHEMA}'
        AND column_name = 'count'
      `);

      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBe(1);
      expect(result[0][0].column_name).toBe('count');
    });

    it('should drop a column from an existing table', async () => {
      // First add a column we'll drop
      await trinoKnex.raw(`
        ALTER TABLE ${TEST_TABLE} ADD COLUMN temp_column INTEGER
      `);

      // Verify the column was added
      const addResult = await trinoKnex.raw(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${TEST_TABLE}'
        AND table_schema = '${TRINO_SCHEMA}'
        AND column_name = 'temp_column'
      `);
      expect(addResult[0].length).toBe(1);

      // Drop the column
      await trinoKnex.raw(`
        ALTER TABLE ${TEST_TABLE} DROP COLUMN temp_column
      `);

      // Verify the column was dropped
      const result = await trinoKnex.raw(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${TEST_TABLE}'
        AND table_schema = '${TRINO_SCHEMA}'
        AND column_name = 'temp_column'
      `);

      expect(result).toBeTruthy();
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBe(0); // Column should not exist
    });
  });
});