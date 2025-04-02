import { Knex } from 'knex';
import { dbtimeout } from '../../../lib/db';
import { getTrinoTestContainer, stopTrinoTestContainer } from '../../lib/testcontainers/TrinoTestContainer';

describe('Knex Trino Query Integration Tests', () => {
  jest.setTimeout(dbtimeout);

  let trinoKnex: Knex;

  // Trino container configuration
  const TRINO_CATALOG = 'memory'; // Use the in-memory connector for query tests
  const TRINO_SCHEMA = 'default';

  beforeAll(async () => {
    // Start Trino container
    const trinoContainer = getTrinoTestContainer();
    await trinoContainer.start({
      containerName: 'knex-trino-query-test-container',
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

  describe('Query Builder', () => {
    const TEST_TABLE = 'query_test_table';

    // Setup test table with data for query tests
    beforeAll(async () => {
      // Drop table if it exists
      try {
        await trinoKnex.raw(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
      } catch (error) {
        // Ignore errors if table doesn't exist
      }

      // Create test table with direct SQL for compatibility
      await trinoKnex.raw(`
        CREATE TABLE ${TEST_TABLE} (
          id INTEGER,
          name VARCHAR(255),
          age INTEGER,
          city VARCHAR(255),
          active BOOLEAN
        )
      `);

      // Insert test data with direct SQL for compatibility
      await trinoKnex.raw(`
        INSERT INTO ${TEST_TABLE} (id, name, age, city, active)
        VALUES
          (1, 'Alice', 30, 'New York', true),
          (2, 'Bob', 25, 'Los Angeles', true),
          (3, 'Charlie', 35, 'Chicago', false),
          (4, 'David', 40, 'New York', true),
          (5, 'Eve', 28, 'Chicago', false)
      `);
    });

    afterAll(async () => {
      // Cleanup test table
      try {
        await trinoKnex.schema.dropTableIfExists(TEST_TABLE);
      } catch (error) {
        // Ignore errors
      }
    });

    it('should generate and execute basic SELECT query', async () => {
      const query = trinoKnex(TEST_TABLE).select('id', 'name').toString();
      expect(query).toContain('SELECT');
      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain(TEST_TABLE);

      const result = await trinoKnex(TEST_TABLE).select('id', 'name').orderBy('id');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('Alice');
    });

    it('should generate and execute WHERE clause', async () => {
      const query = trinoKnex(TEST_TABLE)
        .select('*')
        .where('city', '=', 'New York')
        .toString();

      expect(query).toContain('WHERE');
      expect(query).toContain('city');
      expect(query).toContain('New York');

      const result = await trinoKnex(TEST_TABLE)
        .select('*')
        .where('city', '=', 'New York')
        .orderBy('id');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Alice and David
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('David');
    });

    it('should generate and execute complex WHERE clauses', async () => {
      const query = trinoKnex(TEST_TABLE)
        .select('*')
        .where('age', '>', 25)
        .andWhere('active', true)
        .toString();

      expect(query).toContain('WHERE');
      expect(query).toContain('age');
      expect(query).toContain('>');
      expect(query).toContain('25');
      expect(query).toContain('AND');
      expect(query).toContain('active');

      const result = await trinoKnex(TEST_TABLE)
        .select('*')
        .where('age', '>', 25)
        .andWhere('active', true)
        .orderBy('id');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Alice and David
      expect(result.map(r => r.name).sort()).toEqual(['Alice', 'David'].sort());
    });

    it('should generate and execute ORDER BY clause', async () => {
      const query = trinoKnex(TEST_TABLE)
        .select('*')
        .orderBy('age', 'desc')
        .toString();

      expect(query).toContain('ORDER BY');
      expect(query).toContain('age');
      expect(query).toContain('desc');

      const result = await trinoKnex(TEST_TABLE)
        .select('*')
        .orderBy('age', 'desc');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
      expect(result[0].age).toBe(40); // David (oldest)
      expect(result[1].age).toBe(35); // Charlie
      expect(result[2].age).toBe(30); // Alice
    });

    it('should generate and execute GROUP BY clause with aggregation', async () => {
      const query = trinoKnex(TEST_TABLE)
        .select('city')
        .count('id as count')
        .groupBy('city')
        .toString();

      expect(query).toContain('GROUP BY');
      expect(query).toContain('city');
      expect(query).toContain('COUNT');

      const result = await trinoKnex(TEST_TABLE)
        .select('city')
        .count('id as count')
        .groupBy('city')
        .orderBy('city');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // Chicago, Los Angeles, New York

      const cityMap = {};
      result.forEach(row => {
        cityMap[row.city] = row.count;
      });

      // Convert count to number since Trino might return it as string
      expect(Number(cityMap['Chicago'])).toBe(2);
      expect(Number(cityMap['Los Angeles'])).toBe(1);
      expect(Number(cityMap['New York'])).toBe(2);
    });

    it('should generate and execute LIMIT and OFFSET clauses', async () => {
      const query = trinoKnex(TEST_TABLE)
        .select('*')
        .orderBy('id')
        .limit(2)
        .offset(1)
        .toString();

      expect(query).toContain('LIMIT');
      expect(query).toContain('2');
      expect(query).toContain('OFFSET');
      expect(query).toContain('1');

      const result = await trinoKnex(TEST_TABLE)
        .select('*')
        .orderBy('id')
        .limit(2)
        .offset(1);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(2); // Bob (skipped Alice due to offset)
      expect(result[1].id).toBe(3); // Charlie
    });
  });

  describe('Data Type Handling', () => {
    const TEST_TABLE = 'datatype_test_table';

    beforeAll(async () => {
      // Drop table if it exists
      try {
        await trinoKnex.schema.dropTableIfExists(TEST_TABLE);
      } catch (error) {
        // Ignore errors if table doesn't exist
      }

      // Create test table with various data types
      await trinoKnex.schema.createTable(TEST_TABLE, (table) => {
        table.increments('id');
        table.string('varchar_col', 255);
        table.text('text_col');
        table.integer('integer_col');
        table.float('float_col');
        table.boolean('boolean_col');
        table.date('date_col');
        table.timestamp('timestamp_col', { useTz: true });
        table.json('json_col');
      });
    });

    afterAll(async () => {
      // Cleanup test table
      try {
        await trinoKnex.schema.dropTableIfExists(TEST_TABLE);
      } catch (error) {
        // Ignore errors
      }
    });

    it('should correctly insert and retrieve various data types', async () => {
      const now = new Date();
      const testJson = { key: 'value', number: 123, nested: { foo: 'bar' } };

      // Insert data with various types
      await trinoKnex(TEST_TABLE).insert({
        id: 1,
        varchar_col: 'varchar string',
        text_col: 'longer text string',
        integer_col: 42,
        float_col: 3.14159,
        boolean_col: true,
        date_col: now,
        timestamp_col: now,
        json_col: JSON.stringify(testJson)
      });

      // Retrieve and check the data
      const result = await trinoKnex(TEST_TABLE).select('*').where('id', 1);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);

      const row = result[0];
      expect(row.id).toBe(1);
      expect(row.varchar_col).toBe('varchar string');
      expect(row.text_col).toBe('longer text string');
      expect(row.integer_col).toBe(42);
      expect(row.float_col).toBeCloseTo(3.14159, 5);
      expect(row.boolean_col).toBe(true);

      // Depending on how date/timestamp handling is implemented,
      // these might be Date objects or formatted strings
      expect(row.date_col).toBeTruthy();
      expect(row.timestamp_col).toBeTruthy();

      // For JSON data, should be correctly parsed
      if (typeof row.json_col === 'string') {
        const parsedJson = JSON.parse(row.json_col);
        expect(parsedJson.key).toBe('value');
        expect(parsedJson.number).toBe(123);
        expect(parsedJson.nested.foo).toBe('bar');
      } else {
        // If already parsed to object
        expect(row.json_col.key).toBe('value');
        expect(row.json_col.number).toBe(123);
        expect(row.json_col.nested.foo).toBe('bar');
      }
    });

    it('should handle NULL values properly', async () => {
      // Insert a row with NULL values
      await trinoKnex(TEST_TABLE).insert({
        id: 2,
        varchar_col: null,
        text_col: null,
        integer_col: null,
        float_col: null,
        boolean_col: null,
        date_col: null,
        timestamp_col: null,
        json_col: null
      });

      // Retrieve and check
      const result = await trinoKnex(TEST_TABLE).select('*').where('id', 2);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);

      const row = result[0];
      expect(row.id).toBe(2);
      expect(row.varchar_col).toBeNull();
      expect(row.text_col).toBeNull();
      expect(row.integer_col).toBeNull();
      expect(row.float_col).toBeNull();
      expect(row.boolean_col).toBeNull();
      expect(row.date_col).toBeNull();
      expect(row.timestamp_col).toBeNull();
      expect(row.json_col).toBeNull();
    });
  });
});