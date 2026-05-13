import { GenericContainer } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { createServer } from '@commercial/backend/lib/db/server'
import { TestOrmConnection } from '../../../../lib/TestOrmConnection'
import { LicenseKey } from '@/common/appdb/models/LicenseKey'

// Regression test for the symptom: "I can sign in to my MySQL 8 server with
// MySQL Workbench / the mysql CLI, but Beekeeper Studio fails to connect."
//
// Reproduction:
//   - MySQL 8 server, user authenticated with caching_sha2_password
//   - FLUSH PRIVILEGES so the fast-auth cache is empty (same state as after
//     a server restart, before any successful login)
//   - Non-TLS TCP connection
//
// In that state the server requires the RSA public-key dance to negotiate
// caching_sha2_password. Workbench and the mysql CLI do this transparently.
// This test asks Beekeeper's MySQL client (used directly, not via knex) to
// do the same.

describe("MySQL 8 caching_sha2_password (uncached user, non-TLS)", () => {
  jest.setTimeout(dbtimeout)

  let container
  let server

  beforeAll(async () => {
    await TestOrmConnection.connect()
    await LicenseKey.createTrialLicense()

    container = await new GenericContainer('mysql:8')
      .withName("testmysql-sha2-auth")
      .withEnvironment({
        "MYSQL_ROOT_PASSWORD": "rootpass",
        "MYSQL_DATABASE": "test",
      })
      .withExposedPorts(3306)
      .withStartupTimeout(dbtimeout)
      .start()

    await container.exec([
      'mysql', '-u', 'root', '-prootpass', '-e',
      `
        CREATE USER 'sha2user'@'%' IDENTIFIED WITH caching_sha2_password BY 'pw';
        GRANT ALL PRIVILEGES ON test.* TO 'sha2user'@'%';
        FLUSH PRIVILEGES;
      `,
    ])
  })

  afterAll(async () => {
    if (server) await server.disconnect()
    if (container) await container.stop()
    await TestOrmConnection.disconnect()
  })

  it("connects without TLS when the user is not yet in the fast-auth cache", async () => {
    const config = {
      client: 'mysql',
      host: container.getHost(),
      port: container.getMappedPort(3306),
      user: 'sha2user',
      password: 'pw',
      ssl: false,
    }
    server = createServer(config)
    const connection = server.createConnection('test')
    await expect(connection.connect()).resolves.not.toThrow()
  })
})
