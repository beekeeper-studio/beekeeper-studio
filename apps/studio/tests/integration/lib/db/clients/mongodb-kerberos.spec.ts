import { execFileSync } from 'child_process'
import dns from 'dns'
import { createServer } from '@commercial/backend/lib/db/server'

// Exercises the MongoDB GSSAPI (Kerberos) authentication path against a REAL Kerberos
// setup. MongoDB GSSAPI auth is a MongoDB Enterprise Server feature, so the companion
// workflow .github/workflows/mongodb-kerberos-tests.yaml stands up a Samba AD domain
// controller (KDC + LDAP), a domain-keytab'd MongoDB Enterprise server, and runs this from
// a containerized client that holds a Kerberos ticket (kinit). See
// dev/docker_mongodb_kerberos/ for the orchestration.
//
// It self-skips unless MONGODB_KERBEROS_TEST=1 so the normal integration matrix (which
// auto-discovers every *spec.* under tests/integration/lib/db) can discover the file
// without the Kerberos host environment. The dockerized runner sets that env var AND
// hard-guards against a silent skip (it asserts a non-zero number of these tests actually
// executed -- see dev/docker_mongodb_kerberos/tests/entrypoint.sh), because a skipped
// suite is otherwise indistinguishable from a passing one.
//
// The positive case proves the authenticated principal came in over GSSAPI/$external; the
// negative controls (connect by IP, and connect after kdestroy) prove that result is
// genuinely caused by the Kerberos ticket and SPN match -- not an environment that happens
// to let the user in for unrelated reasons.

const describeKrb = process.env.MONGODB_KERBEROS_TEST === '1' ? describe : describe.skip

const KRB_HOST = process.env.MONGODB_KERBEROS_HOST || 'mongodb.bks.test'
const KRB_PORT = Number(process.env.MONGODB_KERBEROS_PORT || 27017)
const KRB_REALM = process.env.KRB_REALM || 'BKS.TEST'
const KRB_USER = process.env.KRB_TEST_USER || 'testuser'
const KRB_PASS = process.env.KRB_TEST_PASS || ''
const SERVICE_NAME = process.env.MONGODB_KERBEROS_SERVICE || 'mongodb'

// The Kerberos principal MongoDB maps to a user in the $external database.
const EXPECTED_USER = `${KRB_USER}@${KRB_REALM}`
// The service ticket the client must obtain for MongoDB.
const EXPECTED_SPN = `${SERVICE_NAME}/${KRB_HOST}`

function kinit(): void {
  execFileSync('kinit', [`${KRB_USER}@${KRB_REALM}`], { input: `${KRB_PASS}\n` })
}
function kdestroy(): void {
  execFileSync('kdestroy', [])
}
function klist(): string {
  try {
    return execFileSync('klist', [], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

// Build a GSSAPI connection URL. The principal goes in the userinfo part with the realm's
// @ URL-encoded as %40; authSource=$external and authMechanism=GSSAPI select Kerberos.
function gssapiUrl(host: string, port = KRB_PORT): string {
  const principal = encodeURIComponent(`${KRB_USER}@${KRB_REALM}`)
  const props = `SERVICE_NAME:${SERVICE_NAME}`
  return `mongodb://${principal}@${host}:${port}/?authMechanism=GSSAPI&authMechanismProperties=${props}&authSource=$external`
}

async function openConnection(host: string, port = KRB_PORT) {
  const server = createServer({ client: 'mongodb', url: gssapiUrl(host, port) } as any)
  const connection = server.createConnection('test')
  await connection.connect()
  return { server, connection }
}

describeKrb(`MongoDBClient -- real Kerberos via ${KRB_HOST}`, () => {
  let server: ReturnType<typeof createServer>
  let connection: any

  beforeAll(async () => {
    kinit()
    ;({ server, connection } = await openConnection(KRB_HOST))
  })

  afterAll(async () => {
    if (server) await server.disconnect()
  })

  it('authenticates the Kerberos principal against the $external database', async () => {
    // connectionStatus reports who the connection authenticated as. For GSSAPI the user is
    // the Kerberos principal in the $external auth database -- proof the login came in over
    // Kerberos, not SCRAM.
    const result = await connection.executeCommand('db.runCommand({ connectionStatus: 1 })')
    const blob = JSON.stringify(result)
    expect(blob).toContain(EXPECTED_USER)
    expect(blob).toContain('$external')
  })

  it('obtained a Kerberos service ticket for the MongoDB SPN', () => {
    // Proves the app got the mongodb/<host> service ticket specifically, not merely that
    // some Kerberos occurred. The GSSAPI layer caches it in the same ccache kinit used.
    const tickets = klist()
    expect(tickets).toContain(EXPECTED_SPN)
  })

  it('can run an authenticated query', async () => {
    const version = await connection.versionString()
    expect(version).toBeDefined()
  })

  it('lists databases', async () => {
    const dbs = await connection.listDatabases()
    expect(Array.isArray(dbs)).toBe(true)
    expect(dbs.length).toBeGreaterThan(0)
  })
})

describeKrb('MongoDBClient -- Kerberos negative controls', () => {
  // These run after the positive suite (file order, --runInBand). The kdestroy control
  // tears down the shared ticket, so afterAll restores one defensively.
  afterAll(() => {
    try {
      kinit()
    } catch {
      /* best effort */
    }
  })

  it('fails to authenticate when connecting by IP (no SPN match)', async () => {
    // Connecting by IP can't form mongodb/<fqdn>; with rdns disabled in krb5.conf there is
    // no matching SPN, so the GSSAPI handshake must fail rather than succeed.
    const { address } = await dns.promises.lookup(KRB_HOST)
    let server: ReturnType<typeof createServer> | undefined
    let threw = false
    try {
      const opened = await openConnection(address)
      server = opened.server
    } catch {
      threw = true
    } finally {
      if (server) await server.disconnect()
    }
    expect(threw).toBe(true)
  })

  it('fails to connect after kdestroy (the login depends on the ticket)', async () => {
    kdestroy()
    expect(klist()).not.toMatch(/krbtgt/)
    await expect(openConnection(KRB_HOST)).rejects.toBeTruthy()
  })
})
