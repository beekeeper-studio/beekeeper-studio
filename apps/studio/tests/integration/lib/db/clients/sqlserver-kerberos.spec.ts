import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'

// Exercises the SQL Server integrated-authentication path (windowsAuthEnabled +
// msnodesqlv8 + ODBC driver probe) against a REAL Kerberos setup, complementing
// sqlserver-winauth.spec.ts (which only proves NTLM on a non-domain-joined Windows
// runner). Here the companion workflow .github/workflows/sqlserver-kerberos-tests.yaml
// stands up a Samba AD domain controller (KDC + LDAP) and a domain-joined SQL Server in
// Docker, installs unixODBC + the Microsoft ODBC Driver 18 + a Kerberos client on the
// runner, and runs `kinit` for the test principal before invoking Jest. This file then
// connects with no credentials and asserts the login actually negotiated KERBEROS.
//
// It self-skips unless SQLSERVER_KERBEROS_TEST=1 so the normal integration matrix (which
// auto-discovers every *spec.* under tests/integration/lib/db) can discover the file
// without the Kerberos host environment. The dedicated workflow sets that env var.
//
// The host and realm must line up with the docker assets in dev/docker_sqlserver_kerberos:
// FQDN mssql.bks.test (mapped to 127.0.0.1 in the runner's hosts file), realm BKS.TEST,
// SPN MSSQLSvc/mssql.bks.test:1433, and the Kerberos-mapped login [BKS\testuser].
// Connecting by FQDN (never localhost/IP) is what lets the ODBC layer request a Kerberos
// service ticket instead of falling back to NTLM.

const describeKrb = process.env.SQLSERVER_KERBEROS_TEST === '1' ? describe : describe.skip

const KRB_HOST = process.env.SQLSERVER_KERBEROS_HOST || 'mssql.bks.test'
const KRB_PORT = Number(process.env.SQLSERVER_KERBEROS_PORT || 1433)

describeKrb(`SQLServerClient -- real Kerberos via ${KRB_HOST}`, () => {
  let server: ReturnType<typeof createServer>
  let connection: any

  beforeAll(async () => {
    const config = {
      client: 'sqlserver',
      host: KRB_HOST,
      port: KRB_PORT,
      user: null,
      password: null,
      windowsAuthEnabled: true,
      trustServerCertificate: true,
      readOnlyMode: false,
    } as IDbConnectionServerConfig

    server = createServer(config)
    connection = server.createConnection('master')
    await connection.connect()
  })

  afterAll(async () => {
    if (server) await server.disconnect()
  })

  it('negotiates KERBEROS (not NTLM)', async () => {
    const result = await connection.driverExecuteSingle(
      'SELECT auth_scheme FROM sys.dm_exec_connections WHERE session_id = @@SPID'
    )
    expect(result.data.recordset[0].auth_scheme).toBe('KERBEROS')
  })

  it('authenticates as the kinit principal with no password', async () => {
    const result = await connection.driverExecuteSingle('SELECT SUSER_SNAME() AS loginName')
    // Samba maps the Kerberos principal to the NetBIOS-qualified login BKS\testuser.
    expect(String(result.data.recordset[0].loginName)).toMatch(/testuser/i)
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
