import { describe, it, expect } from 'vitest'
import { parseSqlServerHost, sqlServerTunnelTarget } from '@/lib/db/clients/sqlserverHost'

// Verifies how the SQL Server Host field is normalised before it reaches the driver, without
// needing a live server. The integration suite (sqlserver.spec.ts) proves the end-to-end
// behaviour; this pins the host/instance split so a regression in driver inputs is caught in
// the fast unit run.

describe('parseSqlServerHost', () => {
  it('splits host from instance on the backslash', () => {
    expect(parseSqlServerHost('localhost\\SQL2019')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019',
    })
  })

  it("maps the SSMS local-machine shorthands '.' and '(local)' to localhost", () => {
    expect(parseSqlServerHost('.\\SQL2019')).toEqual({ host: 'localhost', instanceName: 'SQL2019' })
    expect(parseSqlServerHost('(local)\\SQL2019')).toEqual({ host: 'localhost', instanceName: 'SQL2019' })
    expect(parseSqlServerHost('(localdb)\\SQL2019')).toEqual({ host: 'localhost', instanceName: 'SQL2019' })
  })

  it('matches the local-machine shorthands case-insensitively', () => {
    expect(parseSqlServerHost('(LOCAL)\\SQL2019')).toEqual({ host: 'localhost', instanceName: 'SQL2019' })
    expect(parseSqlServerHost('.\\sql2019')).toEqual({ host: 'localhost', instanceName: 'sql2019' })
  })

  it('leaves every other host untouched', () => {
    expect(parseSqlServerHost('db.example.com')).toEqual({ host: 'db.example.com', instanceName: undefined })
    expect(parseSqlServerHost('10.0.0.4\\SQL2022')).toEqual({ host: '10.0.0.4', instanceName: 'SQL2022' })
    // Only the exact shorthands map -- a real host that merely starts with one does not.
    expect(parseSqlServerHost('localdb.example.com').host).toBe('localdb.example.com')
  })

  it('trims whitespace around the whole value and around each part', () => {
    expect(parseSqlServerHost('  localhost\\SQL2019  ')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019',
    })
    // A copy-pasted trailing space otherwise lands inside the instance name and the lookup
    // fails with "Port for SQL2019  not found".
    expect(parseSqlServerHost('localhost\\SQL2019 ')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019',
    })
    expect(parseSqlServerHost(' localhost \\ SQL2019 ')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019',
    })
  })

  it('yields no instance name when there is no backslash', () => {
    expect(parseSqlServerHost('localhost').instanceName).toBeUndefined()
    expect(parseSqlServerHost('localhost').host).toBe('localhost')
  })

  it('yields no instance name for an empty instance segment', () => {
    expect(parseSqlServerHost('localhost\\')).toEqual({ host: 'localhost', instanceName: undefined })
    expect(parseSqlServerHost('localhost\\   ')).toEqual({ host: 'localhost', instanceName: undefined })
  })

  it('splits on the first backslash only', () => {
    expect(parseSqlServerHost('localhost\\SQL2019\\extra')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019\\extra',
    })
  })

  it('handles an empty or missing value without throwing', () => {
    expect(parseSqlServerHost('')).toEqual({ host: '', instanceName: undefined })
    expect(parseSqlServerHost(undefined as unknown as string)).toEqual({ host: '', instanceName: undefined })
  })

  // SSMS, sqlcmd and the Azure portal all hand out `host,port` and `tcp:host,port`. Passed
  // through as-is they die at DNS resolution (getaddrinfo ENOTFOUND localhost,1433).
  it('splits a trailing ,port off the host', () => {
    expect(parseSqlServerHost('localhost,14330')).toEqual({ host: 'localhost', instanceName: undefined, port: 14330 })
    expect(parseSqlServerHost(' db.example.com , 1433 ')).toEqual({ host: 'db.example.com', instanceName: undefined, port: 1433 })
  })

  it('strips the tcp: protocol prefix', () => {
    expect(parseSqlServerHost('tcp:db.example.com')).toEqual({ host: 'db.example.com', instanceName: undefined })
    expect(parseSqlServerHost('TCP:myserver.database.windows.net,1433')).toEqual({
      host: 'myserver.database.windows.net',
      instanceName: undefined,
      port: 1433,
    })
  })

  it('reads the port after an instance name', () => {
    expect(parseSqlServerHost('localhost\\SQL2019,14330')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019',
      port: 14330,
    })
    expect(parseSqlServerHost('tcp:.\\SQL2019,14330')).toEqual({ host: 'localhost', instanceName: 'SQL2019', port: 14330 })
  })

  it('leaves a comma that is not followed by a port number alone', () => {
    expect(parseSqlServerHost('localhost,abc').host).toBe('localhost,abc')
    expect(parseSqlServerHost('localhost,abc').port).toBeUndefined()
  })

  it('only treats a valid TCP port as a port', () => {
    for (const bad of ['localhost,0', 'localhost,99999', 'localhost,123456789012345678901234567890']) {
      expect(parseSqlServerHost(bad).port).toBeUndefined()
      expect(parseSqlServerHost(bad).host).toBe(bad)
    }
    expect(parseSqlServerHost('localhost,65535').port).toBe(65535)
  })
})

// The SSH tunnel is opened before the driver config is built, from the raw Host field.
describe('sqlServerTunnelTarget', () => {
  it('forwards to the parsed host and the port typed into the Host field', () => {
    expect(sqlServerTunnelTarget('tcp:db.internal,14330', 1433)).toEqual({ host: 'db.internal', port: 14330 })
    expect(sqlServerTunnelTarget('db.internal\\SQL2019,14330', 1433)).toEqual({ host: 'db.internal', port: 14330 })
  })

  it('falls back to the Port field', () => {
    expect(sqlServerTunnelTarget('tcp:db.internal', 14331)).toEqual({ host: 'db.internal', port: 14331 })
    expect(sqlServerTunnelTarget('db.internal\\SQL2019', 14331)).toEqual({ host: 'db.internal', port: 14331 })
  })
})
