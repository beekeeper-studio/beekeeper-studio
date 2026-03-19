import fs from 'fs'
import path from 'path'
import { DockerComposeEnvironment, Wait } from 'testcontainers'
import { DBTestUtil } from '@tests/lib/db'
import { runCommonTests } from './all'

const greengageTimeout = 600_000
const composeDir = path.resolve(__dirname, '../../../../docker')

describe('Greengage client (PostgreSQL-compatible)', () => {
  jest.setTimeout(greengageTimeout)

  let environment: Awaited<ReturnType<DockerComposeEnvironment['up']>>
  let util: DBTestUtil

  beforeAll(async () => {
    const composeFile = path.join(composeDir, 'greengage7.yml')
    if (!fs.existsSync(composeFile)) {
      throw new Error(`Greengage compose not found at ${composeFile} (resolved from __dirname: ${__dirname})`)
    }
    // Wait for gpstop -u (reload after pg_hba) last step before cluster is ready.
    // Init (install, make_cluster) takes 5–10 min; default wait timeout is 60s.
    environment = await new DockerComposeEnvironment(composeDir, 'greengage7.yml')
      .withWaitStrategy(
        'test_greengage7',
        Wait.forLogMessage(/Signalling all postmaster processes to reload/, 1)
      )
      .withStartupTimeout(greengageTimeout)
      .up()

    const container = environment.getContainer('test_greengage7')
    const host = container.getHost()
    const port = container.getMappedPort(7000)

    // Config shaped like PostgresTestDriver for compatibility with createServer/knex
    const config = {
      client: 'greengage' as const,
      host,
      port,
      user: 'gpadmin',
      password: '', // gpdemo uses trust auth
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
      readOnlyMode: false,
    }

    util = new DBTestUtil(config, 'postgres', {
      dialect: 'greengage',
      defaultSchema: 'public',
      knexConnectionOptions: { host, port },
    })
    await util.setupdb()
  })

  afterAll(async () => {
    await util.disconnect()
    if (environment) {
      await environment.stop()
    }
  })

  describe('Common tests (postgres syntax)', () => {
    runCommonTests(() => util)
  })
})
