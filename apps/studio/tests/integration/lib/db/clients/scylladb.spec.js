import { GenericContainer, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { createServer } from '@commercial/backend/lib/db/server'
import { runBksTypeTests } from "./bksType";

describe("ScyllaDB Tests", () => {
  jest.setTimeout(dbtimeout)

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

  describe("BksField tests", () => {
    let bksConnection;

    beforeAll(async () => {
      await connection.executeQuery(
        "CREATE KEYSPACE IF NOT EXISTS bks_type_ks WITH replication = " +
          "{'class': 'SimpleStrategy', 'replication_factor': 1}"
      );
      await connection.executeQuery(`
        CREATE TABLE bks_type_ks.bks_types (
          tinyint_col tinyint,
          smallint_col smallint,
          int_col int PRIMARY KEY,
          bigint_col bigint,
          varint_col varint,
          float_col float,
          double_col double,
          decimal_col decimal,
          ascii_col ascii,
          text_col text,
          varchar_col varchar,
          uuid_col uuid,
          timeuuid_col timeuuid,
          inet_col inet,
          date_col date,
          time_col time,
          timestamp_col timestamp,
          duration_col duration,
          boolean_col boolean,
          blob_col blob
        )
      `);
      await connection.executeQuery(
        "INSERT INTO bks_type_ks.bks_types (int_col) VALUES (1)"
      );

      bksConnection = server.createConnection("bks_type_ks");
      await bksConnection.connect();
    });

    afterAll(async () => {
      await bksConnection.disconnect();
      await connection.executeQuery("DROP KEYSPACE IF EXISTS bks_type_ks");
    });

    runBksTypeTests({
      connection: () => bksConnection,
      table: "bks_types",
      expectedResults: {
        BINARY: ["blob_col"],
        STRING: [
          "ascii_col",
          "inet_col",
          "text_col",
          "timeuuid_col",
          "uuid_col",
          "varchar_col",
        ],
        NUMBER: [
          "int_col",
          "bigint_col",
          "decimal_col",
          "double_col",
          "float_col",
          "smallint_col",
          "tinyint_col",
          "varint_col",
        ],
        DATETIME: ["date_col", "duration_col", "time_col", "timestamp_col"],
        BOOLEAN: ["boolean_col"],
        OBJECTID: [],
        SURREALID: [],
        UNKNOWN: [],
      },
    });
  });
})
