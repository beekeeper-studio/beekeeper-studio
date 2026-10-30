import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { GenericContainer, Wait } from 'testcontainers'
import { dbtimeout } from '@tests/lib/db'
import { createServer } from '@commercial/backend/lib/db/server'
import { runBksFieldTests } from "./bksFieldTests";

describe("ScyllaDB Tests", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container;
  let server;
  let connection;

  beforeAll(async () => {
    container = await new GenericContainer("scylladb/scylla:2025.1.4")
      .withName("scylladb_test")
      .withExposedPorts(9042)
      .withCommand(["--reactor-backend", "epoll", "--smp", "1", "--memory", "1G", "--overprovisioned", "1", "--developer-mode", "1", "--api-address", "0.0.0.0"])
      .withWaitStrategy(Wait.forLogMessage("Starting listening for CQL clients"))
      .withStartupTimeout(dbtimeout)
      .start()

    const config = {
      client: 'scylladb',
      host: container.getHost(),
      port: container.getMappedPort(9042),
      cassandraOptions: {
        localDataCenter: 'datacenter1',
      },
    }

    server = createServer(config)
    connection = server.createConnection(null)
    await connection.connect()
  })

  afterAll(async () => {
    if (connection) {
      await connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  it("Should connect to ScyllaDB", async () => {
    const version = await connection.versionString()
    expect(version).toBeTruthy()
  })

  it("Should list keyspaces", async () => {
    const databases = await connection.listDatabases()
    expect(databases).toContain('system')
  })

  runBksFieldTests({
    connection: () => connection,
    table: "bks_types",
    schema: "bks_type_ks",
    setup: `
      CREATE KEYSPACE IF NOT EXISTS bks_type_ks
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

      CREATE TABLE bks_type_ks.bks_types (
        -- BINARY
        blob_col blob,

        -- NUMBER
        tinyint_col tinyint, smallint_col smallint, int_col int PRIMARY KEY,
        bigint_col bigint, varint_col varint, float_col float,
        double_col double, decimal_col decimal,

        -- STRING
        ascii_col ascii, text_col text, varchar_col varchar, uuid_col uuid,
        timeuuid_col timeuuid, inet_col inet,

        -- DATETIME
        date_col date, time_col time, timestamp_col timestamp,
        duration_col duration,

        -- BOOLEAN
        boolean_col boolean
      );

      INSERT INTO bks_type_ks.bks_types (int_col) VALUES (1);
    `,
    // prettier-ignore
    expectedResults: {
      BINARY: ["blob_col"],
      STRING: ["ascii_col", "inet_col", "text_col", "timeuuid_col", "uuid_col",
        "varchar_col"],
      NUMBER: ["int_col", "bigint_col", "decimal_col", "double_col",
        "float_col", "smallint_col", "tinyint_col", "varint_col"],
      DATETIME: ["date_col", "duration_col", "time_col", "timestamp_col"],
      BOOLEAN: ["boolean_col"],
      OBJECTID: [],
      SURREALID: [],
      UNKNOWN: [],
    },
  });
})
