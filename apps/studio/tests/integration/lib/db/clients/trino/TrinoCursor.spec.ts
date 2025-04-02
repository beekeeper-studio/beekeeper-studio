import { TrinoCursor } from '@/lib/db/clients/trino/TrinoCursor';
import { dbtimeout } from '../../../../../lib/db';
import { getTrinoTestContainer, stopTrinoTestContainer } from '../../../../lib/testcontainers/TrinoTestContainer';

describe('TrinoCursor', () => {
  jest.setTimeout(dbtimeout);

  const connectionConfig = {
    host: '',
    port: 0,
    user: 'test',
    catalog: 'tpch',
    schema: 'sf1',
    ssl: false
  };

  beforeAll(async () => {
    // Start a Trino container
    const trinoContainer = getTrinoTestContainer();
    await trinoContainer.start({
      containerName: 'trino-cursor-test-container'
    });

    // Get connection details
    const config = trinoContainer.getConnectionConfig({
      catalog: 'tpch',
      schema: 'sf1'
    });
    
    // Update connection config with container info
    connectionConfig.host = config.host;
    connectionConfig.port = config.port;
  });

  afterAll(async () => {
    await stopTrinoTestContainer();
  });

  describe('Basic Cursor Functionality', () => {
    it('should initialize and execute a simple query', async () => {
      // Simple query that returns a single row
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT 1 as value',
        chunkSize: 10
      });

      await cursor.start();
      const results = await cursor.read();

      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].value).toBe(1);

      await cursor.cancel();
    });

    it('should handle query errors gracefully', async () => {
      // Intentionally malformed query
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT * FROM non_existent_table',
        chunkSize: 10
      });

      await cursor.start();

      try {
        await cursor.read();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }

      await cursor.cancel();
    });

    it('should respect chunk size', async () => {
      // Use the nation table from tpch which has 25 rows
      const chunkSize = 10;
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT * FROM nation',
        chunkSize
      });

      await cursor.start();

      // First chunk should have 10 rows
      const firstChunk = await cursor.read();
      expect(firstChunk.length).toBe(chunkSize);

      // Second chunk should have 10 rows
      const secondChunk = await cursor.read();
      expect(secondChunk.length).toBe(chunkSize);

      // Third chunk should have 5 rows
      const thirdChunk = await cursor.read();
      expect(thirdChunk.length).toBe(5);

      // Fourth chunk should be empty
      const fourthChunk = await cursor.read();
      expect(fourthChunk.length).toBe(0);

      await cursor.cancel();
    });

    it('should handle empty result sets', async () => {
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT * FROM nation WHERE nationkey < 0',
        chunkSize: 10
      });

      await cursor.start();
      const results = await cursor.read();

      expect(results).toBeDefined();
      expect(results.length).toBe(0);

      await cursor.cancel();
    });
  });

  describe('Advanced Cursor Functionality', () => {
    it('should handle large result sets efficiently', async () => {
      // Use a larger table: lineitem has many rows
      const chunkSize = 100;
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT * FROM lineitem LIMIT 500',
        chunkSize
      });

      await cursor.start();

      let totalRows = 0;
      let chunks = 0;

      // Read all chunks
      while (true) {
        const chunk = await cursor.read();
        if (chunk.length === 0) break;

        totalRows += chunk.length;
        chunks++;

        // Verify chunk size
        if (chunks < 5) {
          expect(chunk.length).toBe(chunkSize);
        }
      }

      expect(totalRows).toBe(500);
      expect(chunks).toBe(5);

      await cursor.cancel();
    });

    it('should handle query cancellation properly', async () => {
      // Create a long-running query
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT * FROM lineitem CROSS JOIN orders LIMIT 10000',
        chunkSize: 100
      });

      await cursor.start();

      // Read one chunk to ensure query is running
      const firstChunk = await cursor.read();
      expect(firstChunk.length).toBeGreaterThan(0);

      // Cancel the query
      await cursor.cancel();

      // Attempt to read after cancellation should return empty result
      const postCancelChunk = await cursor.read();
      expect(postCancelChunk.length).toBe(0);
    });

    it('should properly handle complex queries with joins', async () => {
      // Complex query with joins
      const cursor = new TrinoCursor({
        connectionConfig,
        query: `
          SELECT
            c.name as customer,
            n.name as nation,
            r.name as region
          FROM
            customer c
            JOIN nation n ON c.nationkey = n.nationkey
            JOIN region r ON n.regionkey = r.regionkey
          LIMIT 50
        `,
        chunkSize: 20
      });

      await cursor.start();

      // Read first chunk
      const firstChunk = await cursor.read();
      expect(firstChunk.length).toBe(20);

      // Validate structure
      expect(firstChunk[0]).toHaveProperty('customer');
      expect(firstChunk[0]).toHaveProperty('nation');
      expect(firstChunk[0]).toHaveProperty('region');

      // Read remaining chunks
      const secondChunk = await cursor.read();
      expect(secondChunk.length).toBe(20);

      const thirdChunk = await cursor.read();
      expect(thirdChunk.length).toBe(10);

      await cursor.cancel();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Use invalid connection config
      const badConfig = {
        ...connectionConfig,
        port: 12345 // Invalid port
      };

      const cursor = new TrinoCursor({
        connectionConfig: badConfig,
        query: 'SELECT 1',
        chunkSize: 10
      });

      try {
        await cursor.start();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle syntax errors in queries', async () => {
      // Query with syntax error
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELEC 1', // Intentional typo
        chunkSize: 10
      });

      await cursor.start();

      try {
        await cursor.read();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }

      await cursor.cancel();
    });

    it('should handle server-side errors', async () => {
      // Query that would cause a server-side error
      const cursor = new TrinoCursor({
        connectionConfig,
        query: 'SELECT * FROM nation WHERE regionkey / 0 = 1', // Division by zero
        chunkSize: 10
      });

      await cursor.start();

      try {
        await cursor.read();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }

      await cursor.cancel();
    });
  });
});