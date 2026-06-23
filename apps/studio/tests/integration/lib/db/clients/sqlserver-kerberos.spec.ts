import { execFileSync } from 'child_process'
import dns from 'dns'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'

// Exercises the SQL Server integrated-authentication path (windowsAuthEnabled +
// msnodesqlv8 + ODBC driver probe) against a REAL Kerberos setup, complementing
// sqlserver-winauth.spec.ts (which only proves NTLM on a non-domain-joined Windows
// runner). The companion workflow .github/workflows/sqlserver-kerberos-tests.yaml stands
// up a Samba AD domain controller (KDC + LDAP) and a domain-joined SQL Server in Docker
// and runs this from a containerized client that holds a Kerberos ticket (kinit).
//
// It self-skips unless SQLSERVER_KERBEROS_TEST=1 so the normal integration matrix (which
// auto-discovers every *spec.* under tests/integration/lib/db) can discover the file
// without the Kerberos host environment. The dockerized runner sets that env var AND
// hard-guards against a silent skip (it asserts a non-zero number of these tests actually
// executed -- see dev/docker_sqlserver_kerberos/tests/entrypoint.sh), because a skipped
// suite is otherwise indistinguishable from a passing one.
//
// The positive case asserts KERBEROS; the negative controls (connect by IP, and connect
// after kdestroy) prove that result is genuinely caused by the Kerberos ticket and SPN
// match -- not an environment that reports KERBEROS for unrelated reasons.

const describeKrb = process.env.SQLSERVER_KERBEROS_TEST === '1' ? describe : describe.skip

const KRB_HOST = process.env.SQLSERVER_KERBEROS_HOST || 'mssql.bks.test'
const KRB_PORT = Number(process.env.SQLSERVER_KERBEROS_PORT || 1433)
const KRB_REALM = process.env.KRB_REALM || 'BKS.TEST'
const KRB_USER = process.env.KRB_TEST_USER || 'testuser'
const KRB_PASS = process.env.KRB_TEST_PASS || ''

const EXPECTED_LOGIN = 'BKS\\testuser'
// The service ticket the client must obtain for SQL Server (bare or :1433 form).
const EXPECTED_SPN = `MSSQLSvc/${KRB_HOST}`

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

function makeConfig(host: string, port = KRB_PORT): IDbConnectionServerConfig {
  return {
    client: 'sqlserver',
    host,
    port,
    user: null,
    password: null,
    windowsAuthEnabled: true,
    trustServerCertificate: true,
    readOnlyMode: false,
  } as IDbConnectionServerConfig
}

async function openConnection(host: string, port = KRB_PORT) {
  const server = createServer(makeConfig(host, port))
  const connection = server.createConnection('master')
  await connection.connect()
  return { server, connection }
}

describeKrb(`SQLServerClient -- real Kerberos via ${KRB_HOST}`, () => {
  let server: ReturnType<typeof createServer>
  let connection: any

  beforeAll(async () => {
    kinit()
    ;({ server, connection } = await openConnection(KRB_HOST))
  })

  afterAll(async () => {
    if (server) await server.disconnect()
  })

  it('negotiates KERBEROS over a TCP connection', async () => {
    const result = await connection.driverExecuteSingle(
      `SELECT auth_scheme, net_transport, encrypt_option
       FROM sys.dm_exec_connections WHERE session_id = @@SPID`
    )
    const row = result.data.recordset[0]
    expect(row.auth_scheme).toBe('KERBEROS')
    expect(row.net_transport).toBe('TCP')
    // Documents the current TLS posture of the integrated-auth path: connectWindowsAuth()
    // does not request channel encryption, so the TDS stream is unencrypted ('FALSE').
    // Kerberos still protects the login handshake itself. Locking this value catches a
    // regression in either direction (e.g. if encryption is later enabled by default).
    expect(row.encrypt_option).toBe('FALSE')
  })

  it('authenticates as exactly BKS\\testuser with no credentials supplied', async () => {
    const result = await connection.driverExecuteSingle('SELECT SUSER_SNAME() AS loginName')
    expect(result.data.recordset[0].loginName).toBe(EXPECTED_LOGIN)
  })

  it('obtained a Kerberos service ticket for the SQL Server SPN', () => {
    // Proves the app got the MSSQLSvc service ticket specifically, not merely that some
    // Kerberos occurred. The ODBC/GSSAPI layer caches it in the same ccache kinit used.
    const tickets = klist()
    expect(tickets).toMatch(new RegExp(EXPECTED_SPN.replace(/\./g, '\\.')))
  })

  it('can execute a trivial query against master', async () => {
    const result = await connection.driverExecuteSingle('SELECT @@VERSION AS v')
    expect(String(result.data.recordset[0].v)).toMatch(/SQL Server/i)
  })

  it('lists databases', async () => {
    const dbs = await connection.listDatabases()
    expect(dbs).toEqual(expect.arrayContaining(['master']))
  })
})

describeKrb('SQLServerClient -- Kerberos negative controls', () => {
  // These run after the positive suite (file order, --runInBand). The kdestroy control
  // tears down the shared ticket, so afterAll restores one defensively.
  afterAll(() => {
    try {
      kinit()
    } catch {
      /* best effort */
    }
  })

  it('does NOT negotiate KERBEROS when connecting by IP (no SPN match)', async () => {
    // Connecting by IP can't form MSSQLSvc/<fqdn>; with rdns disabled in krb5.conf there is
    // no SPN to request, so this must fall back (NTLM) or fail cleanly -- never KERBEROS.
    const { address } = await dns.promises.lookup(KRB_HOST)
    let server: ReturnType<typeof createServer> | undefined
    let scheme: string | null = null
    let threw = false
    try {
      const opened = await openConnection(address)
      server = opened.server
      const result = await opened.connection.driverExecuteSingle(
        'SELECT auth_scheme FROM sys.dm_exec_connections WHERE session_id = @@SPID'
      )
      scheme = result.data.recordset[0].auth_scheme
    } catch {
      threw = true
    } finally {
      if (server) await server.disconnect()
    }
    // A clean failure is an acceptable outcome; negotiating KERBEROS is not.
    expect(threw || scheme !== 'KERBEROS').toBe(true)
    if (!threw) expect(scheme).not.toBe('KERBEROS')
  })

  it('fails to connect after kdestroy (the login depends on the ticket)', async () => {
    kdestroy()
    expect(klist()).not.toMatch(/krbtgt/)
    await expect(openConnection(KRB_HOST)).rejects.toBeTruthy()
  })
})
