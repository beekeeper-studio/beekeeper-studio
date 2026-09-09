import { describe, it, expect } from 'vitest'
import { SQLServerClient, sqlServerConnectHint, sqlServerConnectHints } from '@/lib/db/clients/sqlserver'
import { IDbConnectionDatabase, IDbConnectionServerConfig } from '@/lib/db/types'
import { IDbConnectionServer } from '@/lib/db/backendTypes'

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
  return await client.configDatabase(server, DATABASE)
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
