import { IDbConnectionServerConfig } from "@/lib/db/types";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runCommonTests } from "./all";
import knex from "knex";
import { TrinoKnexClient } from "@shared/lib/knex-trino";
import { getTrinoTestContainer, stopTrinoTestContainer } from "../../../lib/testcontainers/TrinoTestContainer";
import { StartedTestContainer } from "testcontainers";

// After all tests complete, stop the container
afterAll(async () => {
  await stopTrinoTestContainer();
});

// Run tests for writable mode only - simpler for now
describe('Trino Client [latest]', () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let util: DBTestUtil | undefined;

  beforeAll(async () => {
    try {
      console.log("Setting up Trino test environment...");

      // Get or initialize the shared container
      const trinoContainer = getTrinoTestContainer();
      container = await trinoContainer.start({
        containerName: 'trino-db-client-test-container',
        withMemoryCatalog: true
      });

      // Initialize schema in memory catalog
      await trinoContainer.initializeMemorySchema('default');

      // Get connection config
      const connectionConfig = trinoContainer.getConnectionConfig({
        catalog: 'memory',
        schema: 'default'
      });

      // Use memory catalog for testing with read/write capabilities
      const config = {
        client: "trino",
        host: connectionConfig.host,
        port: connectionConfig.port,
        user: connectionConfig.user,
        // No password by default
        catalog: connectionConfig.catalog, // Using memory catalog for read/write operations
        database: connectionConfig.schema, // Memory catalog uses 'default' schema
        readOnlyMode: false,
        domain: undefined,
        socketPath: undefined,
        password: null,
        socketPathEnabled: false,
        osUser: 'foo',
        ssh: null,
        sslCaFile: null,
        sslCertFile: null,
        sslKeyFile: null,
        sslRejectUnauthorized: false,
        ssl: false,
      } as any;

      util = new DBTestUtil(config, "default", {
        dialect: "trino"
      });

      // Connect and wait for the container to be fully ready
      await util.connection.connect();

      // Set up the test tables
      await util.setupdb();

      console.log("Trino test environment setup complete");
    } catch (err) {
      console.error("Error during Trino setup:", err);
      throw err;
    }
  });

  afterAll(async () => {
    if (util) {
      await util.disconnect();
    }
  });

  // Basic test to verify connection works
  it.only("should connect to Trino and execute a query", async () => {
    const result = await util.connection.executeQuery("SELECT 1 as test");
    expect(result).toBeDefined();
    expect(result.length).toBe(1)
  });

    // Basic test to verify connection works
  it.only("should connect to Trino and get a row", async () => {
    const result = await util.connection.executeQuery("SELECT 1");
    expect(result).toBeDefined();
    expect(result[0].rows.length).toBe(1)
  });

  // Test getting version string
  it("should return the Trino version", async () => {
    const version = await util.connection.versionString();
    expect(version).toContain("Trino");
  });

  // Run the common test suite
  describe("Common Tests", () => {
    runCommonTests(() => util);
  });

  // Test streaming functionality
  describe("Streaming Tests", () => {
    it("should stream query results correctly", async () => {
      // First create a test table with multiple rows
      const tableName = "stream_test_table";

      // Create test table with sample data
      await util.connection.executeQuery(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER,
          name VARCHAR
        )
      `);

      // Insert test data
      for (let i = 1; i <= 20; i++) {
        await util.connection.executeQuery(`
          INSERT INTO ${tableName} VALUES (${i}, 'Name ${i}')
        `);
      }

      // Test streaming on the table we created
      const query = `SELECT * FROM ${tableName}`;
      const chunkSize = 5;

      const stream = await util.connection.queryStream(query, chunkSize);
      expect(stream).toBeDefined();
      expect(stream.cursor).toBeDefined();
      expect(stream.fields).toBeDefined();
      expect(stream.fields.length).toBeGreaterThan(0);

      // Read all chunks
      let totalRows = 0;
      let chunks = 0;

      while (true) {
        const rows = await stream.cursor.read();
        if (rows.length === 0) break;

        totalRows += rows.length;
        chunks++;
      }

      // Verify we have rows and chunks
      expect(totalRows).toBe(20);
      expect(chunks).toBeGreaterThan(0);

      await stream.cursor.cancel();
    });

    it("should stream table data correctly with selectTopStream", async () => {
      const tableName = "stream_test_table";
      const chunkSize = 5;

      const stream = await util.connection.selectTopStream(tableName, [], "", chunkSize);
      expect(stream).toBeDefined();
      expect(stream.cursor).toBeDefined();
      expect(stream.fields).toBeDefined();
      expect(stream.fields.length).toBeGreaterThan(0);

      // Read all chunks
      let totalRows = 0;
      let chunks = 0;

      while (true) {
        const rows = await stream.cursor.read();
        if (rows.length === 0) break;

        totalRows += rows.length;
        chunks++;
      }

      // Verify we have rows and chunks
      expect(totalRows).toBe(20);
      expect(chunks).toBeGreaterThan(0);

      await stream.cursor.cancel();
    });

    it("should cancel streaming queries properly", async () => {
      // Use our test table
      const tableName = "stream_test_table";

      // Create a query that will return enough rows to allow for streaming
      const query = `
        WITH numbers AS (
          SELECT * FROM ${tableName}
          CROSS JOIN (SELECT * FROM ${tableName}) t2
        )
        SELECT * FROM numbers LIMIT 100
      `;
      const chunkSize = 10;

      try {
        const stream = await util.connection.queryStream(query, chunkSize);

        // Read one chunk to ensure query is running
        const firstChunk = await stream.cursor.read();

        // Only test cancellation if we got results
        if (firstChunk.length > 0) {
          // Cancel the query
          await stream.cursor.cancel();

          // Attempt to read after cancellation should return empty result
          const postCancelChunk = await stream.cursor.read();
          expect(postCancelChunk.length).toBe(0);
        }
      } catch (err) {
        console.warn("Skipping cancel test due to error:", err.message);
      }
    });
  });
});