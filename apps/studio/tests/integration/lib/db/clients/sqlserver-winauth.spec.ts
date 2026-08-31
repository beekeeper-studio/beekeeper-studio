import os from 'os'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'

// Exercises the SQL Server integrated-authentication path (windowsAuthEnabled +
// msnodesqlv8 + ODBC driver probe). It only runs on Windows -- the SSPI/ODBC stack
// is available there without extra host setup -- and self-skips on Linux/macOS so
// the integration matrix can still discover the file.
//
// IMPORTANT: the CI runner is NOT domain-joined and connects to a LOCAL SQL Server
// over localhost/hostname, so SSPI here negotiates NTLM, not Kerberos. This proves
// the msnodesqlv8 plumbing and the "no credentials" behaviour; it is the same code
// path that negotiates Kerberos in a domain environment. Real Kerberos must be
// validated manually against an AD/KDC (confirm auth_scheme = KERBEROS).
//
// CI expectation: a live SQL Server (Express) listens on localhost:1433 and the
// runner user is a sysadmin. The companion workflow
// .github/workflows/windows-login-tests.yaml provisions that environment.

const describeWin = process.platform === 'win32' ? describe : describe.skip

const hostCases = [
  { label: 'localhost', host: 'localhost' },
  { label: 'hostname', host: os.hostname() },
]

hostCases.forEach(({ label, host }) => {
  describeWin(`SQLServerClient -- Integrated Authentication (no password) via ${label} [${host}]`, () => {
    let server: ReturnType<typeof createServer>
    let connection: any

    beforeAll(async () => {
      const config = {
        client: 'sqlserver',
        host,
        port: 1433,
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

    it('authenticates via SSPI with no credentials supplied', async () => {
      const result = await connection.driverExecuteSingle('SELECT SUSER_SNAME() AS loginName')
      const loginName = result.data.recordset[0].loginName
      expect(loginName).toBeTruthy()
    })

    it('negotiates NTLM (not Kerberos, and not plain SQL auth)', async () => {
      // The runner is not domain-joined and connects over localhost/hostname, so SSPI
      // falls back to NTLM. Asserting the scheme catches a regression that silently
      // degrades integrated auth into SQL authentication (which would report SQL).
      const result = await connection.driverExecuteSingle(
        'SELECT auth_scheme FROM sys.dm_exec_connections WHERE session_id = @@SPID'
      )
      expect(result.data.recordset[0].auth_scheme).toBe('NTLM')
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
})
