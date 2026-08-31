import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import { Client as PgClient } from 'pg'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import { dbtimeout } from '@tests/lib/db'

const ISSUER = 'bks-tests'
const AUDIENCE = 'cockroach-bks-tests'
const KID = 'bks-test-key'
const ADMIN_USER = 'bks_admin'
const ADMIN_PASSWORD = 'bks_admin_password'
const JWT_USER = 'jwt_user'
const DATABASE = 'defaultdb'

// Generate certs, then exec cockroach so it runs as PID 1 and honours signals
// from testcontainers' stop/kill.
const ENTRYPOINT_SCRIPT = `
set -e
mkdir -p /certs
cockroach cert create-ca --certs-dir=/certs --ca-key=/certs/ca.key
cockroach cert create-node --certs-dir=/certs --ca-key=/certs/ca.key localhost 127.0.0.1
cockroach cert create-client root --certs-dir=/certs --ca-key=/certs/ca.key
exec cockroach start-single-node --certs-dir=/certs --listen-addr=0.0.0.0:26257 --http-addr=0.0.0.0:8080
`

// Cockroach refuses SET CLUSTER SETTING inside a multi-statement transaction,
// so each statement ships as its own -e flag.
const INIT_STATEMENTS = [
  'SET CLUSTER SETTING server.jwt_authentication.enabled = true',
  `SET CLUSTER SETTING server.jwt_authentication.issuers = '${ISSUER}'`,
  `SET CLUSTER SETTING server.jwt_authentication.audience = '${AUDIENCE}'`,
  `CREATE USER ${ADMIN_USER} WITH PASSWORD '${ADMIN_PASSWORD}'`,
  `GRANT admin TO ${ADMIN_USER}`,
  `CREATE USER ${JWT_USER}`,
  `GRANT ALL ON DATABASE ${DATABASE} TO ${JWT_USER}`,
]

describe('CockroachDB JWT auth', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let host: string
  let port: number
  let privateKey: CryptoKey

  const baseConfig = (): IDbConnectionServerConfig => ({
    client: 'cockroachdb',
    host,
    port,
    user: JWT_USER,
    password: '',
    osUser: 'foo',
    ssh: null,
    sslCaFile: null,
    sslCertFile: null,
    sslKeyFile: null,
    sslRejectUnauthorized: false,
    ssl: true,
    domain: null,
    socketPath: null,
    socketPathEnabled: false,
    readOnlyMode: false,
  })

  beforeAll(async () => {
    container = await new GenericContainer('cockroachdb/cockroach:v24.3.0')
      .withEntrypoint(['bash', '-c'])
      .withCommand([ENTRYPOINT_SCRIPT])
      .withExposedPorts(26257)
      // "CockroachDB node starting" is logged *after* the node is ready to
      // accept SQL — the phrasing is misleading.
      .withWaitStrategy(Wait.forLogMessage(/CockroachDB node starting/))
      .withStartupTimeout(dbtimeout)
      .start()

    host = container.getHost()
    port = container.getMappedPort(26257)

    const execArgs = [
      'cockroach', 'sql',
      '--certs-dir=/certs',
      '--host=localhost:26257',
    ]
    for (const stmt of INIT_STATEMENTS) {
      execArgs.push('-e', stmt)
    }
    const exec = await container.exec(execArgs)
    if (exec.exitCode !== 0) {
      throw new Error(`init SQL failed (exit ${exec.exitCode}):\n${exec.output}`)
    }

    const keys = await generateKeyPair('RS256')
    privateKey = keys.privateKey
    const jwk = { ...(await exportJWK(keys.publicKey)), alg: 'RS256', kid: KID, use: 'sig' }
    const jwks = JSON.stringify({ keys: [jwk] })

    const admin = new PgClient({
      host, port, database: DATABASE,
      user: ADMIN_USER, password: ADMIN_PASSWORD,
      ssl: { rejectUnauthorized: false },
    })
    await admin.connect()
    await admin.query('SET CLUSTER SETTING server.jwt_authentication.jwks = $1', [jwks])
    await admin.end()
  })

  afterAll(async () => {
    if (container) await container.stop()
  })

  const signJwt = (over: Partial<{ sub: string; exp: number }> = {}) =>
    new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuer(ISSUER).setAudience(AUDIENCE)
      .setSubject(over.sub ?? JWT_USER).setIssuedAt()
      .setExpirationTime(over.exp ?? Math.floor(Date.now() / 1000) + 300)
      .sign(privateKey)

  const buildConnection = (password: string, jwtAuthEnabled: boolean) => {
    const config = baseConfig()
    config.password = password
    config.options = { jwtAuthEnabled }
    const server = createServer(config)
    return server.createConnection(DATABASE)
  }

  it('connects with a valid JWT when jwtAuthEnabled is true', async () => {
    const token = await signJwt()
    const connection = buildConnection(token, true)
    await connection.connect()
    try {
      const results = await connection.executeQuery('SELECT 1 AS n')
      expect(Number(results[0].rows[0].n)).toBe(1)
    } finally {
      await connection.disconnect()
    }
  })

  it('fails when jwtAuthEnabled flag is omitted (proves the flag reaches the wire)', async () => {
    const token = await signJwt()
    const connection = buildConnection(token, false)
    await expect(connection.connect()).rejects.toThrow(/authentication failed|password/i)
  })

  it('strips whitespace from pasted JWTs before sending', async () => {
    const token = await signJwt()
    const mangled = ` ${token.slice(0, 20)}\n${token.slice(20)} `
    const connection = buildConnection(mangled, true)
    await connection.connect()
    await connection.disconnect()
  })

  it('rejects expired tokens', async () => {
    const token = await signJwt({ exp: Math.floor(Date.now() / 1000) - 60 })
    const connection = buildConnection(token, true)
    await expect(connection.connect()).rejects.toThrow()
  })
})
