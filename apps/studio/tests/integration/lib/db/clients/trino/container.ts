import { dbtimeout, Options } from "@tests/lib/db";
import { GenericContainer, Wait, StartedTestContainer } from "testcontainers";

import path from 'path'
import os from 'os'
import fs from 'fs'
import { execSync } from 'child_process'
import { IDbConnectionServerConfig } from "@/lib/db/types";

export const TrinoBackingPostgresDriver = {
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

export const TrinoHttpDriver = {
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

function generateTrinoSslFiles(tempDir: string) {
  const certDir = path.join(tempDir, 'certs')
  fs.mkdirSync(certDir, { recursive: true })

  const keyFile = path.join(certDir, 'trino.key')
  const certFile = path.join(certDir, 'trino.crt')
  const p12File = path.join(certDir, 'trino.p12')
  const keystorePassword = 'trinopass'

  // Generate self-signed cert and private key
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout ${keyFile} -out ${certFile} ` +
    `-days 1 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
    { stdio: 'pipe' }
  )

  // Convert to PKCS12 keystore for Trino's Java TLS
  execSync(
    `openssl pkcs12 -export -in ${certFile} -inkey ${keyFile} ` +
    `-out ${p12File} -passout pass:${keystorePassword}`,
    { stdio: 'pipe' }
  )

  return { keyFile, certFile, p12File, keystorePassword, certDir }
}

export const TrinoHttpsDriver = {
  container: null as StartedTestContainer | null,
  config: null as IDbConnectionServerConfig | null,
  certFile: null as string | null,

  async start(dockerTag: string, readonly: boolean, network) {
    const startupTimeout = dbtimeout * 2
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trino-ssl-'))

    // Generate SSL certs and keystore
    const ssl = generateTrinoSslFiles(tempDir)
    this.certFile = ssl.certFile

    // Create catalog config for postgresql connector
    const catalogDir = path.join(tempDir, 'catalog')
    fs.mkdirSync(catalogDir)
    fs.writeFileSync(
      path.join(catalogDir, 'postgresql.properties'),
      `connector.name=postgresql
connection-url=jdbc:postgresql://postgres:5432/banana
connection-user=postgres
connection-password=example`
    )

    // Generate a shared secret for internal communication
    const sharedSecret = require('crypto').randomBytes(64).toString('base64')

    // Shell script to merge SSL settings into the existing config.properties,
    // then start Trino. This preserves default properties like catalog.management.
    const entrypointScript = path.join(tempDir, 'entrypoint.sh')
    fs.writeFileSync(entrypointScript, [
      '#!/bin/bash',
      'set -e',
      "sed -i '/^http-server.http.port=/d' /etc/trino/config.properties",
      "sed -i '/^discovery.uri=/d' /etc/trino/config.properties",
      `cat >> /etc/trino/config.properties << 'SSLEOF'`,
      'http-server.http.enabled=false',
      'http-server.https.enabled=true',
      'http-server.https.port=8443',
      `http-server.https.keystore.path=/etc/trino/certs/trino.p12`,
      `http-server.https.keystore.key=${ssl.keystorePassword}`,
      'discovery.uri=https://localhost:8443',
      'internal-communication.https.required=true',
      `internal-communication.shared-secret=${sharedSecret}`,
      'SSLEOF',
      'exec /usr/lib/trino/bin/run-trino',
    ].join('\n'))
    fs.chmodSync(entrypointScript, '755')

    this.container = await new GenericContainer(`trinodb/trino:${dockerTag}`)
      .withNetwork(network)
      .withExposedPorts(8443)
      .withBindMounts([
        { source: catalogDir, target: '/etc/trino/catalog', mode: 'ro' },
        { source: ssl.certDir, target: '/etc/trino/certs', mode: 'ro' },
        { source: entrypointScript, target: '/etc/trino/entrypoint.sh', mode: 'ro' },
      ])
      .withCommand(['/etc/trino/entrypoint.sh'])
      .withWaitStrategy(Wait.forLogMessage("SERVER STARTED"))
      .withStartupTimeout(startupTimeout)
      .start()

    this.config = {
      client: 'trino',
      host: this.container.getHost(),
      port: this.container.getMappedPort(8443),
      user: 'test',
      password: null,
      osUser: 'foo',
      ssh: null,
      sslCaFile: ssl.certFile,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: true,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: readonly,
    }
  },

  async stop() {
    await this.container?.stop()
  },
}
