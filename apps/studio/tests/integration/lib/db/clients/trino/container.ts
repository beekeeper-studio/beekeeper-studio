import { dbtimeout, Options } from "@tests/lib/db";
import { GenericContainer, Wait, StartedTestContainer } from "testcontainers";

import path from 'path'
import os from 'os'
import fs from 'fs'
import { IDbConnectionServerConfig } from "@/lib/db/types";

export const PostgresTestDriver = {
  container: null,
  utilOptions: null,
  config: null,
  async start(dockerTag, socket, readonly, network) {

      const startupTimeout = dbtimeout * 2;
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'psql-'));
      this.container = await new GenericContainer(`postgres:${dockerTag}`)
        .withNetwork(network)
        .withNetworkAliases("postgres") // this is how Trino will refer to it
        .withEnvironment({
          "POSTGRES_PASSWORD": "example",
          "POSTGRES_DB": "banana"
        })
        .withHealthCheck({
          test: ["CMD-SHELL", "psql -h localhost -U postgres -c \"select 1\" -d banana > /dev/null"],
          interval: 2000,
          timeout: 3000,
          retries: 10,
          startPeriod: 5000,
        })
        .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
        // .withWaitStrategy(Wait.forHealthCheck())
        .withExposedPorts(5432)
        .withBindMounts([{
          source: path.join(temp, "postgresql"),
          target: "/var/run/postgresql",
          mode: "rw"
        }])
        .withStartupTimeout(startupTimeout)
        .start()
      const config: IDbConnectionServerConfig = {
        client: 'postgresql',
        host: this.container.getHost(),
        port: this.container.getMappedPort(5432),
        user: 'postgres',
        password: 'example',
        osUser: 'foo',
        ssh: null,
        sslCaFile: null,
        sslCertFile: null,
        sslKeyFile: null,
        sslRejectUnauthorized: false,
        ssl: false,
        domain: null,
        socketPath: null,
        socketPathEnabled: false,
        readOnlyMode: readonly
      }

      if (socket) {
        config.host = 'notarealhost'
        config.port = null
        config.socketPathEnabled = true
        config.socketPath = path.join(temp, "postgresql")
      }

      this.utilOptions = {
        dialect: 'postgresql',
        defaultSchema: 'public',
        knexConnectionOptions: {
          // When testing socket connection, knex need to use the host and
          // port because postgres only accepts one socket connection.
          host: this.container.getHost(),
          port: this.container.getMappedPort(5432),
        },
      }

      if (dockerTag !== 'latest') {
        // Generated columns was introduced in postgres 12
        this.utilOptions.skipGeneratedColumns = true
      }
      this.config = config

  },
  async stop() {
    await this.container?.stop()
  }
}

export const TrinoTestDriver = {
  container: null as StartedTestContainer | null,
  pgContainer: null as StartedTestContainer | null,
  utilOptions: null as Options | null,
  config: null as IDbConnectionServerConfig | null,
  async start(dockerTag: string, readonly: boolean, network) {
    const startupTimeout = dbtimeout * 2;
    
    // Create a temporary directory for catalog configuration
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trino-'));
    const catalogDir = path.join(tempDir, 'catalog');
    fs.mkdirSync(catalogDir);
    
    // Create postgresql.properties file in the catalog directory
    const postgresConfig = `connector.name=postgresql
connection-url=jdbc:postgresql://postgres:5432/banana
connection-user=postgres
connection-password=example`;

    const catalogFile = path.join(catalogDir, "postgresql.properties")
    fs.writeFileSync(catalogFile, postgresConfig)

    this.container = await new GenericContainer(`trinodb/trino:${dockerTag}`)
      .withNetwork(network)
      .withExposedPorts(8080)
      .withBindMounts([{
        source: catalogDir,
        target: '/etc/trino/catalog',
        mode: 'ro'
      }])
      .withWaitStrategy(Wait.forLogMessage("SERVER STARTED"))
      .withStartupTimeout(startupTimeout)
      .start()

    const config: IDbConnectionServerConfig = {
      client: 'trino',
      host: this.container.getHost(),
      port: this.container.getMappedPort(8080),
      user: 'test',
      password: null,
      osUser: 'foo',
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: false,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: readonly
    }

    this.config = config
  },
  async stop() {
    await this.container?.stop()
  }
}
