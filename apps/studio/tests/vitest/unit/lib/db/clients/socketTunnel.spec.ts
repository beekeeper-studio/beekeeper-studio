import { describe, it, expect } from 'vitest'
import { PsqlConnector } from '@/lib/db/clients/postgresql/PsqlConnector'
import { MySqlConnector } from '@/lib/db/clients/mysql/MySqlConnector'
import { IDbConnectionDatabase, IDbConnectionServerConfig } from '@/lib/db/types'
import { IDbConnectionServer } from '@/lib/db/backendTypes'

// With an SSH tunnel the socket is on the far side and connectTunnel forwards it
// to localHost:localPort, so the driver must dial the tunnel even in socket
// mode. Without a tunnel, socket mode means a socket on this machine.

const DATABASE: IDbConnectionDatabase = {
  database: 'postgres',
  connected: false,
  connecting: false,
  namespace: null,
}

const TUNNEL = { localHost: '127.0.0.1', localPort: 15432 }

function buildServer(
  config: Partial<IDbConnectionServerConfig> = {},
  sshTunnel: any = null
): IDbConnectionServer {
  return {
    db: {},
    sshTunnel,
    config: {
      client: 'postgresql',
      host: 'db.example.com',
      port: 5432,
      user: 'user',
      osUser: 'user',
      password: null,
      socketPath: '/var/run/postgresql',
      socketPathEnabled: false,
      ssl: false,
      ...config,
    },
  } as IDbConnectionServer
}

function pgConfig(
  config: Partial<IDbConnectionServerConfig> = {},
  sshTunnel: any = null
): Promise<any> {
  const server = buildServer(config, sshTunnel)
  const connector = new PsqlConnector({ server, database: DATABASE })
  // configDatabase is protected; the driver config it returns is what matters.
  return (connector as any).configDatabase(server, DATABASE)
}

function mysqlConfig(
  config: Partial<IDbConnectionServerConfig> = {},
  sshTunnel: any = null
): Promise<any> {
  const server = buildServer({ client: 'mysql', port: 3306, ...config }, sshTunnel)
  const connector = new MySqlConnector({ server, database: DATABASE })
  return (connector as any).configDatabase(server, DATABASE)
}

describe('postgres driver config - socket mode and SSH tunnel', () => {
  it('uses the socket path when socket mode is on and there is no tunnel', async () => {
    const config = await pgConfig({ socketPathEnabled: true })
    expect(config.host).toBe('/var/run/postgresql')
    expect(config.port).toBe(5432)
  })

  it('dials the forwarded socket through the tunnel when both are set', async () => {
    const config = await pgConfig(
      {
        socketPathEnabled: true,
        localHost: TUNNEL.localHost,
        localPort: TUNNEL.localPort,
      },
      TUNNEL
    )
    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(15432)
  })

  it('dials the tunnel when socket mode is off', async () => {
    const config = await pgConfig(
      { localHost: TUNNEL.localHost, localPort: TUNNEL.localPort },
      TUNNEL
    )
    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(15432)
  })

  it('keeps the host and port with neither a tunnel nor socket mode', async () => {
    const config = await pgConfig({ host: 'db.example.com', port: 6543 })
    expect(config.host).toBe('db.example.com')
    expect(config.port).toBe(6543)
  })
})

describe('mysql driver config - socket mode and SSH tunnel', () => {
  it('uses the socket path when socket mode is on and there is no tunnel', async () => {
    const config = await mysqlConfig({ socketPathEnabled: true })
    expect(config.socketPath).toBe('/var/run/postgresql')
    expect(config.host).toBeNull()
    expect(config.port).toBeNull()
  })

  it('dials the forwarded socket through the tunnel when both are set', async () => {
    const config = await mysqlConfig(
      {
        socketPathEnabled: true,
        localHost: TUNNEL.localHost,
        localPort: TUNNEL.localPort,
      },
      TUNNEL
    )
    expect(config.socketPath).toBeUndefined()
    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(15432)
  })
})