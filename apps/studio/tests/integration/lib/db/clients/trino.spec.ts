import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import knex from "knex";
import { TrinoKnexClient } from "@shared/lib/knex-trino";
import fs from 'fs';
import path from 'path';
import { identify } from 'sql-query-identifier';

// Tag for the Trino Docker image to use
const TRINO_TAG = 'latest';

describe(`Trino Client [${TRINO_TAG}]`, () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let util: DBTestUtil;

  beforeAll(async () => {
    const timeoutDefault = 180000; // 3 minutes for Trino container start
    
    // Start a Trino container
    container = await new GenericContainer(`trinodb/trino:${TRINO_TAG}`)
      .withName(`trino-test-container`)
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

    const port = container.getMappedPort(8080);
    const url = `http://${container.getHost()}:${port}`;

    const config = {
      client: "trino",
      host: container.getHost(),
      port,
      user: "test",
      // No password by default
      catalog: "tpch",
      database: "sf1", // Trino's tpch connector has schema sf1 by default
      readOnlyMode: false,
    } as IDbConnectionServerConfig;

    util = new DBTestUtil(config, "sf1", {
      dialect: "trino",
      knex: knex({
        client: TrinoKnexClient,
        connection: {
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          catalog: config.catalog,
          database: config.database,
        },
      }),
      // We don't create any tables as tpch comes with built-in tables
      skipSetup: true,
    });

    // Connect to test the connection
    await util.connection.connect();
  });

  afterAll(async () => {
    await util.disconnect();
    await container.stop();
  });

  // Basic test to verify connection works
  it("should connect to Trino", async () => {
    const result = await util.connection.executeQuery("SELECT 1 as test");
    expect(result).toBeDefined();
    expect(result[0].rows.length).toBe(1);
    expect(result[0].rows[0].c0).toBe(1);
  });

  // Test retrieving tables from the tpch catalog
  it("should list tables from tpch catalog", async () => {
    const tables = await util.connection.listTables();
    expect(tables.length).toBeGreaterThan(0);
    
    // tpch should have these standard tables
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('customer');
    expect(tableNames).toContain('nation');
    expect(tableNames).toContain('region');
  });

  // Test running a more complex query
  it("should execute a complex query", async () => {
    const query = `
      SELECT 
        r.name as region_name,
        n.name as nation_name,
        COUNT(c.custkey) as customer_count
      FROM
        customer c
      JOIN nation n ON c.nationkey = n.nationkey
      JOIN region r ON n.regionkey = r.regionkey
      GROUP BY r.name, n.name
      ORDER BY customer_count DESC
      LIMIT 5
    `;

    const result = await util.connection.executeQuery(query);
    expect(result).toBeDefined();
    expect(result[0].rows.length).toBe(5);
    
    // Verify structure of results
    const firstRow = result[0].rows[0];
    expect(firstRow).toHaveProperty('c0'); // region_name
    expect(firstRow).toHaveProperty('c1'); // nation_name
    expect(firstRow).toHaveProperty('c2'); // customer_count
  });

  // Test getting version string
  it("should return the Trino version", async () => {
    const version = await util.connection.versionString();
    expect(version).toContain("Trino");
  });

  // Basic tests that should work with Trino
  describe("Basic Tests", () => {
    it("should run basic queries", async () => {
      const result = await util.connection.executeQuery("SELECT 1 as test");
      expect(result).toBeDefined();
      expect(result[0].rows.length).toBe(1);
    });
  });

  // Test streaming functionality
  describe("Streaming Tests", () => {
    it("should stream query results correctly", async () => {
      const query = "SELECT * FROM nation";
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
        
        // Validate first chunk's structure
        if (chunks === 1) {
          expect(rows[0]).toHaveProperty('c0'); // nationkey
          expect(rows[0]).toHaveProperty('c1'); // name
        }
      }
      
      // Nation table has 25 rows
      expect(totalRows).toBe(25);
      
      // With chunk size 5, we should have 5 chunks
      expect(chunks).toBe(5);
      
      await stream.cursor.cancel();
    });
    
    it("should stream table data correctly with selectTopStream", async () => {
      const table = "nation";
      const chunkSize = 10;
      
      const stream = await util.connection.selectTopStream(table, [], "", chunkSize);
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
      
      // Nation table has 25 rows
      expect(totalRows).toBe(25);
      
      // With chunk size 10, we should have 3 chunks (10, 10, 5)
      expect(chunks).toBe(3);
      
      await stream.cursor.cancel();
    });
    
    it("should cancel streaming queries properly", async () => {
      const query = "SELECT * FROM lineitem CROSS JOIN orders LIMIT 1000";
      const chunkSize = 50;
      
      const stream = await util.connection.queryStream(query, chunkSize);
      
      // Read one chunk to ensure query is running
      const firstChunk = await stream.cursor.read();
      expect(firstChunk.length).toBeGreaterThan(0);
      
      // Cancel the query
      await stream.cursor.cancel();
      
      // Attempt to read after cancellation should return empty result
      const postCancelChunk = await stream.cursor.read();
      expect(postCancelChunk.length).toBe(0);
    });
  });
});