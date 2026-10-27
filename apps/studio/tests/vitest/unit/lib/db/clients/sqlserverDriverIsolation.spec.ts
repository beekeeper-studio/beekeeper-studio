import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import { EventEmitter } from 'events'
import { ConnectionPool } from 'mssql'
import { SQLServerClient } from '@/lib/db/clients/sqlserver'
import { IDbConnectionDatabase, IDbConnectionServerConfig } from '@/lib/db/types'
import { IDbConnectionServer } from '@/lib/db/backendTypes'

// Reproduces "connection.queryRaw is not a function" on a Username / Password SQL Server
// connection.
//
// mssql keeps the active driver in a module-level singleton (lib/shared.js), and requiring
// `mssql/msnodesqlv8` overwrites shared.driver.Request/Transaction/ConnectionPool with the
// ODBC implementations (lib/msnodesqlv8/index.js). The base ConnectionPool builds every
// request from that singleton (`new shared.driver.Request(this)`), so once integrated auth
// has been attempted -- even unsuccessfully -- every *tedious* pool in the process hands out
// msnodesqlv8 Requests, which call `connection.queryRaw()` on a tedious Connection.

const nodeRequire = createRequire(import.meta.url)

// Stand-in for the native msnodesqlv8 binding so `mssql/msnodesqlv8` loads on any host (CI has
// no ODBC driver). Every open fails, like an integrated-auth attempt that doesn't succeed.
const fakeNativeDriver = {
  open: (_cfg: any, cb: (err: Error) => void) => {
    setImmediate(() => cb(new Error('Login failed. The login is from an untrusted domain.')))
  },
}

function seedNativeDriverStub() {
  const resolved = nodeRequire.resolve('msnodesqlv8', { paths: [nodeRequire.resolve('mssql')] })
  if (!nodeRequire.cache[resolved]) {
    nodeRequire.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports: fakeNativeDriver,
    } as any
  }
}

// Just enough of a tedious Connection for one batch: no queryRaw, which is the point.
function fakeTediousConnection() {
  const conn: any = new EventEmitter()
  conn.execSqlBatch = vi.fn((req: any) => setImmediate(() => req.callback(null, 0)))
  conn.execSql = conn.execSqlBatch
  conn.cancel = vi.fn()
  conn.close = vi.fn()
  return conn
}

const database = (): IDbConnectionDatabase => ({
  database: 'mv10_amosw',
  connected: false,
  connecting: false,
  namespace: null,
})

function buildServer(config: Partial<IDbConnectionServerConfig>): IDbConnectionServer {
  return {
    db: {},
    sshTunnel: null,
    config: {
      client: 'sqlserver',
      host: 'SGP-ANTHONY-LT\\MSSQL2022',
      port: 1433,
      user: 'amos',
      password: 'secret',
      trustServerCertificate: true,
      ...config,
    },
  } as IDbConnectionServer
}

describe('SQLServerClient driver isolation', () => {
  beforeAll(() => {
    seedNativeDriverStub()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('username/password connects after a failed Windows auth attempt', async () => {
    // 1. User tries Windows (integrated) auth; it fails. This loads mssql/msnodesqlv8.
    const winAuth = new SQLServerClient(
      buildServer({ windowsAuthEnabled: true, user: null, password: null }),
      database()
    )
    await expect(winAuth.connect()).rejects.toThrow(/Login failed/)

    // 2. User switches the same form to Username / Password and connects. No live server:
    // the tedious pool hands back a fake tedious Connection.
    const tediousConn = fakeTediousConnection()
    vi.spyOn(ConnectionPool.prototype as any, '_poolCreate').mockResolvedValue(tediousConn)
    vi.spyOn(ConnectionPool.prototype as any, '_poolValidate').mockReturnValue(true)
    vi.spyOn(ConnectionPool.prototype as any, '_poolDestroy').mockResolvedValue(undefined)

    const passwordAuth = new SQLServerClient(buildServer({}), database())

    // Fails today with "connection.queryRaw is not a function" (from getVersion()).
    await expect(passwordAuth.connect()).resolves.toBeUndefined()
    expect(tediousConn.execSqlBatch).toHaveBeenCalledTimes(1)
    expect(tediousConn.execSqlBatch.mock.calls[0][0].sqlTextOrProcedure).toMatch(/@@VERSION/)

    await passwordAuth.disconnect()
  })
})
