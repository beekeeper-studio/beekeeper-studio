import os from 'os'
import { createServer } from '@commercial/backend/lib/db/server'
import { IDbConnectionServerConfig } from '@/lib/db/types'

// This spec exercises the SQL Server Windows Authentication path added in
// PR #3982 (windowsAuthEnabled + msnodesqlv8 + ODBC driver probe). It only
// runs on Windows -- the SSPI/ODBC stack is Windows-only by design -- and is
// skipped cleanly on Linux/macOS so the existing integration matrix can
// still discover the file via bin/get-db-files-as-json.sh.
//
// CI expectation: a live SQL Server instance (Express) listens on
// localhost:1433 and the GitHub Actions runner user (BUILTIN\Administrators)
// is a sysadmin. The companion workflow .github/workflows/windows-login-tests.yaml
// provisions that environment.
//
// Two host modes are exercised:
//   - 'localhost'   -- loopback, exercises NTLM over the shortest path and
//                      deliberately mismatches the self-signed cert CN so the
//                      TrustServerCertificate handling has to kick in.
//   - hostname      -- real DNS/NetBIOS resolution over TCP, closer to a
//                      "remote" connection than loopback; the cert CN matches
//                      the hostname so ODBC 18's default Encrypt=yes should
//                      succeed cleanly.

const describeWin = process.platform === 'win32' ? describe : describe.skip

const hostCases = [
  { label: 'localhost', host: 'localhost' },
  { label: 'hostname', host: os.hostname() },
]

hostCases.forEach(({ label, host }) => {
  describeWin(`SQLServerClient -- Windows Authentication (no password) via ${label} [${host}]`, () => {
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

    it('authenticates with SSPI (no credentials supplied)', async () => {
      const result = await connection.driverExecuteSingle('SELECT SUSER_SNAME() AS loginName')
      const loginName = result.data.recordset[0].loginName
      expect(loginName).toBeTruthy()
      expect(String(loginName).toLowerCase()).toMatch(/runner/)
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
