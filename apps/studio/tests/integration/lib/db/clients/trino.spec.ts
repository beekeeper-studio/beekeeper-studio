import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runBasicTests } from "./all";
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

  // Run a subset of the common tests that should work with Trino
  describe("Basic Tests", () => {
    runBasicTests(() => util);
  });
});