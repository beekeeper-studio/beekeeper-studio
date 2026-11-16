import { dbtimeout, Options } from "@tests/lib/db";
import { GenericContainer, Wait, StartedTestContainer, Network } from "testcontainers";

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

    // Create a temporary directory for catalog and config
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

    // Create config.properties with process-forwarded enabled for load balancer support
    const configDir = path.join(tempDir, 'config');
    fs.mkdirSync(configDir);
    const configFile = path.join(configDir, 'config.properties');
    fs.writeFileSync(configFile, [
      '#single node install config',
      'coordinator=true',
      'node-scheduler.include-coordinator=true',
      'http-server.http.port=8080',
      'http-server.process-forwarded=true',
      'discovery.uri=http://localhost:8080',
      'catalog.management=${ENV:CATALOG_MANAGEMENT}',
    ].join('\n'));

    this.container = await new GenericContainer(`trinodb/trino:${dockerTag}`)
      .withNetwork(network)
      .withNetworkAliases("trino")
      .withExposedPorts(8080)
      .withBindMounts([
        {
          source: catalogDir,
          target: '/etc/trino/catalog',
          mode: 'ro'
        },
        {
          source: configFile,
          target: '/etc/trino/config.properties',
          mode: 'ro'
        }
      ])
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

/**
 * Nginx reverse proxy in front of Trino, following Trino docs best practice
 * of using a load balancer to terminate TLS.
 *
 * Exposes two ports:
 *  - 8080: HTTP passthrough to Trino
 *  - 8443: HTTPS termination, proxied to Trino over HTTP
 */
export const TrinoNginxProxy = {
  container: null as StartedTestContainer | null,
  certFile: null as string | null,
  httpConfig: null as IDbConnectionServerConfig | null,
  httpsConfig: null as IDbConnectionServerConfig | null,

  async start(network) {
    const startupTimeout = dbtimeout

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trino-nginx-'))
    const certDir = path.join(tempDir, 'certs')
    fs.mkdirSync(certDir)

    // Generate self-signed cert for nginx
    const keyFile = path.join(certDir, 'server.key')
    const certFile = path.join(certDir, 'server.crt')
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout ${keyFile} -out ${certFile} ` +
      `-days 1 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
      { stdio: 'pipe' }
    )
    this.certFile = certFile

    // Nginx config: HTTP on 8080, HTTPS on 8443, both proxy to trino:8080
    const nginxConf = path.join(tempDir, 'nginx.conf')
    fs.writeFileSync(nginxConf, String.raw`
events { worker_connections 64; }
http {
  server {
    listen 8080;
    location / {
      proxy_pass http://trino:8080;
      proxy_http_version 1.1;
      proxy_buffering off;
      proxy_set_header Host $http_host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
  server {
    listen 8443 ssl;
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    location / {
      proxy_pass http://trino:8080;
      proxy_http_version 1.1;
      proxy_buffering off;
      proxy_set_header Host $http_host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto https;
    }
  }
}
`)

    this.container = await new GenericContainer('nginx:alpine')
      .withNetwork(network)
      .withExposedPorts(8080, 8443)
      .withBindMounts([
        { source: nginxConf, target: '/etc/nginx/nginx.conf', mode: 'ro' },
        { source: certDir, target: '/etc/nginx/certs', mode: 'ro' },
      ])
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(startupTimeout)
      .start()

    const baseConfig = {
      client: 'trino' as const,
      user: 'test',
      password: null,
      osUser: 'foo',
      ssh: null,
      sslCertFile: null,
      sslKeyFile: null,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: false,
    }

    this.httpConfig = {
      ...baseConfig,
      host: this.container.getHost(),
      port: this.container.getMappedPort(8080),
      ssl: false,
      sslCaFile: null,
      sslRejectUnauthorized: false,
    }

    this.httpsConfig = {
      ...baseConfig,
      host: this.container.getHost(),
      port: this.container.getMappedPort(8443),
      ssl: true,
      sslCaFile: certFile,
      sslRejectUnauthorized: false,
    }
  },

  async stop() {
    await this.container?.stop()
  },
}
