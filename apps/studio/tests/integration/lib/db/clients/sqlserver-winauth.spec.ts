import net from 'net'
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

// Regression test for the original manual-testing symptom: Windows Auth
// against a server where the TCP handshake completes but the SSPI handshake
// never responds would hang indefinitely with no error. The probe and the
// main pool now both carry explicit timeouts with diagnostic messages.
//
// We reproduce the stall deterministically by spinning up a TCP server on
// loopback that accept()s incoming connections but never writes a single
// byte back. That matches exactly what a stuck Kerberos/NTLM negotiation
// looks like to the ODBC driver: TCP is up, the login reply never comes.
const BLACKHOLE_PORT = 14330

describeWin('SQLServerClient -- Windows Auth must not hang forever on SSPI stall', () => {
  // Per-test generous budget: probe (10s) + main connect (15s if reached) + overhead.
  jest.setTimeout(60_000)

  let blackhole: net.Server
  const acceptedSockets: net.Socket[] = []

  beforeAll((done) => {
    blackhole = net.createServer((socket) => {
      // Accept the connection and hold it open without writing anything.
      // This is what the stuck SSPI negotiation path looked like to msnodesqlv8.
      acceptedSockets.push(socket)
      socket.on('error', () => { /* ignore -- we're killing these in afterAll */ })
    })
    blackhole.listen(BLACKHOLE_PORT, '127.0.0.1', done)
  })

  afterAll((done) => {
    for (const s of acceptedSockets) { try { s.destroy() } catch { /* noop */ } }
    blackhole.close(() => done())
  })

  it('rejects with a timeout error naming the host/port instead of hanging', async () => {
    const config = {
      client: 'sqlserver',
      host: 'localhost',
      port: BLACKHOLE_PORT,
      user: null,
      password: null,
      windowsAuthEnabled: true,
      trustServerCertificate: true,
      readOnlyMode: false,
    } as IDbConnectionServerConfig

    const server = createServer(config)
    const connection = server.createConnection('master')

    const start = Date.now()
    let caught: Error | undefined
    try {
      await connection.connect()
    } catch (e) {
      caught = e as Error
    } finally {
      try { await server.disconnect() } catch { /* cleanup best-effort */ }
    }
    const elapsed = Date.now() - start

    expect(caught).toBeDefined()
    // Total budget: probe outer timer is 10s and ODBC's Connection Timeout
    // is 30s, so we expect the outer timer to win; 25s gives generous
    // headroom for slow startup without masking a real hang regression.
    expect(elapsed).toBeLessThan(25_000)

    const msg = String(caught?.message || '')
    // Our outer-timer diagnostic is supposed to win the race (it's set
    // lower than ODBC's Connection Timeout). The message must name what
    // timed out and where so the user can diagnose without a debugger.
    // We accept ODBC's "Login timeout expired" too as a defensive fallback
    // in case msnodesqlv8 ignores our outer timer for some reason.
    expect(msg).toMatch(/timed? ?out|timeout expired/i)
    expect(msg).toMatch(new RegExp(
      `localhost[,:]?${BLACKHOLE_PORT}|Windows Authentication probe`, 'i'))
  })
})
