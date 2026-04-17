import { GenericContainer, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { createServer } from '@commercial/backend/lib/db/server'

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
})
