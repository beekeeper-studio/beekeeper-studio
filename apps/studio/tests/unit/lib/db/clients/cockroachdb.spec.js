import { SavedConnection } from '../../../../../src/common/appdb/models/saved_connection'
import { CockroachClient } from '../../../../../src/lib/db/clients/cockroach'

describe("CockroachDB", () => {

  it("Should parse a cockroach cloud connection url", () => {
    const config = new SavedConnection()
    const url = "postgresql://matthew:password@free.1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dbks-tester-12345"
    config.parse(url)
    expect(config.options.cluster).toBe("bks-tester-12345")
    expect(config.connectionType).toBe('cockroachdb')
  })

  it("Should parse JWT auth from a cockroach cloud connection url", () => {
    const config = new SavedConnection()
    const url = "postgresql://matthew:password@free.1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dbks-tester-12345%20--crdb%3Ajwt_auth_enabled%3Dtrue"
    config.parse(url)
    expect(config.options.cluster).toBe("bks-tester-12345")
    expect(config.options.jwtAuthEnabled).toBe(true)
    expect(config.connectionType).toBe('cockroachdb')
  })

  it("Should enable Cockroach JWT startup options when configured", async () => {
    const server = {
      config: {
        client: 'cockroachdb',
        host: 'localhost',
        port: 26257,
        user: 'matthew',
        password: 'jwt-token',
        osUser: 'prest',
        socketPathEnabled: false,
        ssl: false,
        sslRejectUnauthorized: true,
        options: {
          cluster: 'bks-tester-12345',
          jwtAuthEnabled: true,
        }
      }
    }

    const database = { database: 'defaultdb', connected: false, connecting: false }
    const client = new CockroachClient(server, database)
    const config = await client.configDatabase(server, database)

    expect(config.options).toBe('--cluster=bks-tester-12345 --crdb:jwt_auth_enabled=true')
    expect(config.password).toBe('jwt-token')
    expect(config.user).toBe('matthew')
    expect(server.config.ssl).toBe(false)
  })

  it("Should strip whitespace from JWT tokens before connecting", async () => {
    const server = {
      config: {
        client: 'cockroachdb',
        host: 'localhost',
        port: 26257,
        user: 'matthew',
        password: ' header.payload.\nsignature ',
        osUser: 'prest',
        socketPathEnabled: false,
        ssl: false,
        sslRejectUnauthorized: true,
        options: {
          jwtAuthEnabled: true,
        }
      }
    }

    const database = { database: 'defaultdb', connected: false, connecting: false }
    const client = new CockroachClient(server, database)
    const config = await client.configDatabase(server, database)

    expect(config.password).toBe('header.payload.signature')
  })

})
