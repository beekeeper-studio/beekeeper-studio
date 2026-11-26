import { describe, it, expect } from 'vitest'
import { SQLServerClient, sqlServerConnectHint, sqlServerConnectHints, sqlServerLoginMessage } from '@/lib/db/clients/sqlserver'
import { IDbConnectionDatabase, IDbConnectionServerConfig } from '@/lib/db/types'
import { IDbConnectionServer } from '@/lib/db/backendTypes'
import { FriendlyErrorHelper } from '@/frontend/utils/FriendlyErrorHelper'

// Pins the driver config configDatabase() hands to mssql, without needing a live server.
// The port/instanceName decision is the whole fix for named instances: mssql deletes the
// port whenever options.instanceName is set (lib/tedious/connection-pool.js), so exactly one
// of the two may be present or the user's static port is silently discarded.

const DATABASE: IDbConnectionDatabase = {
  database: 'master',
  connected: false,
  connecting: false,
  namespace: null,
}

function buildServer(config: Partial<IDbConnectionServerConfig>, sshTunnel: any = null): IDbConnectionServer {
  return {
    db: {},
    sshTunnel,
    config: {
      client: 'sqlserver',
      host: 'localhost',
      port: 1433,
      user: 'sa',
      password: 'Example*1',
      ...config,
    },
  } as IDbConnectionServer
}

async function buildConfig(config: Partial<IDbConnectionServerConfig>, sshTunnel: any = null) {
  const server = buildServer(config, sshTunnel)
  const client = new SQLServerClient(server, DATABASE)
  return await client.connector.configDatabase(server, DATABASE)
}

describe('configDatabase - host and instance', () => {
  it('sets options.instanceName and omits the port for an instance on the default port', async () => {
    const config = await buildConfig({ host: 'localhost\\SQL2019', port: 1433 })
    expect(config.server).toBe('localhost')
    expect(config.options.instanceName).toBe('SQL2019')
    // Present-but-undefined would still make mssql delete nothing, but tedious would try to
    // dial it -- the key must be gone entirely.
    expect('port' in config).toBe(false)
  })

  it('sets the port and omits options.instanceName for an instance on a static port', async () => {
    const config = await buildConfig({ host: 'localhost\\SQL2019', port: 14330 })
    expect(config.server).toBe('localhost')
    expect(config.port).toBe(14330)
    expect(config.options.instanceName).toBeUndefined()
  })

  it('sets the port and leaves options.instanceName undefined with no instance', async () => {
    const config = await buildConfig({ host: 'localhost', port: 14330 })
    expect(config.server).toBe('localhost')
    expect(config.port).toBe(14330)
    expect(config.options.instanceName).toBeUndefined()
  })

  it('never leaves a backslash in config.server, so mssql does not re-split it', async () => {
    const config = await buildConfig({ host: '  .\\SQL2019 ', port: 1433 })
    expect(config.server).toBe('localhost')
    expect(config.options.instanceName).toBe('SQL2019')
  })

  it('uses the tunnel host and port and drops the instance name for an SSH tunnel', async () => {
    // A tunnel forwards a single TCP port; a UDP 1434 browser lookup cannot follow it.
    const config = await buildConfig(
      { host: 'localhost\\SQL2019', port: 1433, localHost: '127.0.0.1', localPort: 15551 },
      { localHost: '127.0.0.1', localPort: 15551 }
    )
    expect(config.server).toBe('127.0.0.1')
    expect(config.port).toBe(15551)
    expect(config.options.instanceName).toBeUndefined()
  })

  it('keeps options.instanceName through the ssl branch, which reassigns options wholesale', async () => {
    const config = await buildConfig({ host: 'localhost\\SQL2019', port: 1433, ssl: true })
    expect(config.options.encrypt).toBe(true)
    expect(config.options.instanceName).toBe('SQL2019')
    expect('port' in config).toBe(false)
  })

  it('passes the instance through on the integrated-auth path', async () => {
    // msnodesqlv8 rebuilds Server=host\instance from server + options.instanceName, and the
    // ODBC driver runs its own browser lookup.
    const config = await buildConfig({ host: '(local)\\SQL2022', port: 1433, windowsAuthEnabled: true })
    expect(config.server).toBe('localhost')
    expect(config.options.trustedConnection).toBe(true)
    expect(config.options.instanceName).toBe('SQL2022')
  })
})

describe('configDatabase - certificate trust', () => {
  it('passes trustServerCertificate straight through to the driver', async () => {
    const trusted = await buildConfig({ trustServerCertificate: true })
    expect(trusted.options.trustServerCertificate).toBe(true)

    const untrusted = await buildConfig({ trustServerCertificate: false })
    expect(untrusted.options.trustServerCertificate).toBe(false)
  })
})

describe('sqlServerConnectHint', () => {
  it('names the certificate checkbox for a self-signed certificate failure', () => {
    const hint = sqlServerConnectHint(new Error('Failed to connect to localhost:1433 - self-signed certificate'), {})
    expect(hint).toBe(sqlServerConnectHints.selfSignedCertificate)
  })

  it('matches the other certificate-validation wordings and the error code', () => {
    expect(sqlServerConnectHint(new Error('unable to verify the first certificate'), {}))
      .toBe(sqlServerConnectHints.selfSignedCertificate)
    // Older node/openssl wording, plus the code-only shape mssql wraps.
    expect(sqlServerConnectHint(new Error('self signed certificate in certificate chain'), {}))
      .toBe(sqlServerConnectHints.selfSignedCertificate)
    const wrapped: any = new Error('Failed to connect')
    wrapped.originalError = { code: 'SELF_SIGNED_CERT_IN_CHAIN' }
    expect(sqlServerConnectHint(wrapped, {})).toBe(sqlServerConnectHints.selfSignedCertificate)
  })

  it('names SQL Browser and the Port field when the connection depends on a browser lookup', () => {
    // The driver's own text is unreliable here -- a stopped browser surfaces as a bare
    // timeout -- so the hint keys off the config that required the lookup.
    const hint = sqlServerConnectHint(new Error('Failed to connect to localhost\\SQL2019 in 15000ms'), {
      server: 'localhost',
      options: { instanceName: 'SQL2019' },
    })
    expect(hint).toBe(sqlServerConnectHints.browserUnreachable('localhost', 'SQL2019'))
    expect(hint).toContain('UDP 1434')
    expect(hint).toContain('Port field')
  })

  it('never blames SQL Browser when the named instance answered and rejected the login', () => {
    // A login rejection comes from the instance itself, so the browser lookup succeeded.
    const config = { server: '192.168.0.170', options: { instanceName: 'CLIENTSQLSERVER' } }
    const expected = sqlServerConnectHints.loginRejected('192.168.0.170', 'CLIENTSQLSERVER')

    const tedious: any = new Error("Login failed for user 'sa'.")
    tedious.code = 'ELOGIN'
    expect(sqlServerConnectHint(tedious, config)).toBe(expected)
    // The ODBC driver (integrated auth) reports SQL Server's error number as a numeric code,
    // so the wording -- which follows the server's language -- does not matter.
    const odbc: any = new Error('[Microsoft][ODBC Driver 18 for SQL Server][SQL Server]Fehler bei der Anmeldung.')
    odbc.code = 18456
    expect(sqlServerConnectHint(odbc, config)).toBe(expected)
    // Text is the last resort when an error arrives with no code at all.
    expect(sqlServerConnectHint(new Error("Login failed for user 'CORP\\me'."), config)).toBe(expected)

    expect(expected).not.toMatch(/browser|1434/i)
    expect(expected).toContain('Default Database')
    // Must not pick up the frontend's SQL Browser docs link either.
    const help = FriendlyErrorHelper.getHelpText('sqlserver', new Error(`Login failed for user 'sa'. ${expected}`))
    expect(help?.link ?? '').not.toContain('sql-server-browser')
  })

  it('names the Default Database field when the server cannot open the requested database', () => {
    const login: any = new Error("Login failed for user 'sa'.")
    login.code = 'ELOGIN'
    const expected = sqlServerConnectHints.databaseUnavailable('nope')
    expect(expected).toContain('Default Database')

    // Error 4060 is exact, whatever language the server words its message in.
    const localized = [{ number: 4060, message: 'Die von der Anmeldung angeforderte Datenbank "nope" kann nicht geoeffnet werden.' }]
    expect(sqlServerConnectHint(login, { server: 'localhost', database: 'nope', options: {} }, localized))
      .toBe(expected)
    // More specific than the generic instance rejection.
    expect(sqlServerConnectHint(login, {
      server: '192.168.0.170', database: 'nope', options: { instanceName: 'CLIENTSQLSERVER' },
    }, localized)).toBe(expected)
    // The ODBC driver (integrated auth) puts the number on the error itself, which mssql
    // re-wraps -- shape captured from ODBC Driver 18 against a real server.
    const odbc: any = new Error('[Microsoft][ODBC Driver 18 for SQL Server][SQL Server]Die Datenbank kann nicht geoeffnet werden.')
    odbc.code = 4060
    expect(sqlServerConnectHint(odbc, { server: 'localhost', database: 'nope', options: { trustedConnection: true } }))
      .toBe(expected)
    // Text is the last resort when an error arrives with no number at all.
    expect(sqlServerConnectHint(
      new Error('Cannot open database "nope" requested by the login. The login failed.'),
      { server: 'localhost', database: 'nope', options: {} }
    )).toBe(expected)

    // A plain bad password (18456) is not a database problem.
    expect(sqlServerConnectHint(login, { server: 'localhost', database: 'nope', options: {} }, [
      { number: 18456, message: "Login failed for user 'sa'." },
    ])).toBeNull()
  })

  it("asks for a Default Database when the login's own default cannot be opened", () => {
    const expected = sqlServerConnectHints.defaultDatabaseUnavailable
    expect(expected).toContain('Default Database')
    const blank = { server: 'localhost', options: {} }

    // tedious: the number arrives on the collected login ERROR tokens.
    const login: any = new Error("Login failed for user 'app'.")
    login.code = 'ELOGIN'
    expect(sqlServerConnectHint(login, blank, [
      { number: 4064, message: 'Standarddatenbank des Benutzers kann nicht geoeffnet werden.' },
      { number: 18456, message: "Login failed for user 'app'." },
    ])).toBe(expected)
    // ODBC: the number is the error's numeric code.
    const odbc: any = new Error('[Microsoft][ODBC Driver 18 for SQL Server][SQL Server]Standarddatenbank kann nicht geoeffnet werden.')
    odbc.code = 4064
    expect(sqlServerConnectHint(odbc, blank)).toBe(expected)
    // Text is the last resort.
    expect(sqlServerConnectHint(new Error('Cannot open user default database. Login failed.'), blank)).toBe(expected)
    // More specific than the generic instance rejection.
    expect(sqlServerConnectHint(odbc, { server: 'db1', options: { instanceName: 'SQL2019' } })).toBe(expected)
  })

  it('leaves the frontend helper adding a docs link and no second copy of the advice', () => {
    // Only one layer states the remedy. These failures are classified here because the
    // frontend only ever sees a flat message (UtilityConnection rebuilds errors as
    // `new Error(message)`), so help text there would render right after this one in
    // ErrorAlert. The helper still contributes the link, keyed on the wording below.
    const cert = new Error(`Failed to connect to localhost:1433 - self signed certificate. ${sqlServerConnectHints.selfSignedCertificate}`)
    const certHelp = FriendlyErrorHelper.getHelpText('sqlserver', cert)
    expect(certHelp?.help).toBeUndefined()
    expect(certHelp?.link).toContain('#certificates')

    const browser = new Error(`Failed to connect to localhost\\SQL2019 in 15000ms. ${sqlServerConnectHints.browserUnreachable('localhost', 'SQL2019')}`)
    const browserHelp = FriendlyErrorHelper.getHelpText('sqlserver', browser)
    expect(browserHelp?.help).toBeUndefined()
    expect(browserHelp?.link).toContain('#named-instances-and-the-sql-server-browser')
  })

  it('stays quiet when neither failure mode applies', () => {
    expect(sqlServerConnectHint(new Error('Login failed for user \'sa\''), { server: 'localhost', options: {} }))
      .toBeNull()
    // An instance with a static port never touches the browser, so the browser hint is wrong.
    expect(sqlServerConnectHint(new Error('Failed to connect to localhost:14330 in 15000ms'), {
      server: 'localhost',
      port: 14330,
      options: {},
    })).toBeNull()
  })
})

describe('sqlServerLoginMessage', () => {
  it("puts the server's earlier login errors in front of the generic one", () => {
    expect(sqlServerLoginMessage("Login failed for user 'sa'.", [
      'Cannot open database "nope" requested by the login. The login failed.',
      "Login failed for user 'sa'.",
    ])).toBe('Cannot open database "nope" requested by the login. The login failed. Login failed for user \'sa\'.')
  })

  it('leaves the message alone when the server sent nothing more', () => {
    expect(sqlServerLoginMessage("Login failed for user 'sa'.", [])).toBe("Login failed for user 'sa'.")
    expect(sqlServerLoginMessage("Login failed for user 'sa'.", ["Login failed for user 'sa'."]))
      .toBe("Login failed for user 'sa'.")
    expect(sqlServerLoginMessage("Login failed for user 'sa'.")).toBe("Login failed for user 'sa'.")
  })
})
