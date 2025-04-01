import { TrinoCursor } from '@/lib/db/clients/trino/TrinoCursor';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import fetch from 'node-fetch';
import { dbtimeout } from '../../../../../lib/db';
import { Stream } from 'stream';

// Tag for the Trino Docker image to use
const TRINO_TAG = 'latest';

describe('TrinoCursor', () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let host: string;
  let port: number;
  
  const connectionConfig = {
    host: '',
    port: 0,
    user: 'test',
    catalog: 'tpch',
    schema: 'sf1',
    ssl: false
  };

  beforeAll(async () => {
    const timeoutDefault = 300000; // 5 minutes for Trino container start
    
    // Start a Trino container
    container = await new GenericContainer(`trinodb/trino:${TRINO_TAG}`)
      .withName(`trino-cursor-test-container`)
      .withExposedPorts(8080)
      .withHealthCheck({
        test: ['CMD', 'curl', '-f', 'http://localhost:8080/v1/info'],
        interval: 2000,
        timeout: 3000,
        retries: 20,
        startPeriod: 10000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();
      
    jest.setTimeout(timeoutDefault);

    port = container.getMappedPort(8080);
    host = container.getHost();
    const url = `http://${host}:${port}`;

    // Update connection config with container info
    connectionConfig.host = host;
    connectionConfig.port = port;
    
    // Test the connection is working and wait for server to be ready
    let ready = false;
    let retries = 0;
    const maxRetries = 30;
    
    while (!ready && retries < maxRetries) {
      try {
        const response = await fetch(`${url}/v1/info`);
        if (response.ok) {
          // Test a simple query to make sure server is fully ready
          const testCursor = new TrinoCursor({
            connectionConfig,
            query: 'SELECT 1 as test',
            chunkSize: 10
          });
          
          try {
            await testCursor.start();
            const result = await testCursor.read();
            if (result.length > 0) {
              ready = true;
              console.log('Trino server is ready');
            }
            await testCursor.cancel();
          } catch (err) {
            console.log(`Waiting for Trino to initialize (${retries}/${maxRetries})...`);
          }
        }
      } catch (err) {
        console.log(`Waiting for Trino server (${retries}/${maxRetries})...`);
      }
      
      if (!ready) {
        retries++;
        // Wait 2 seconds before trying again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!ready) {
      throw new Error('Trino server failed to initialize');
    }
  });

  afterAll(async () => {
    await container.stop();
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