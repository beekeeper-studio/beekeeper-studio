import { describe, it, expect } from 'vitest'
import { parseSqlServerHost, sqlServerHostFieldSplit } from '@/lib/db/clients/sqlserverHost'

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

  it('reads an SSMS-style port after a comma', () => {
    expect(parseSqlServerHost('db.example.com,1444')).toEqual({ host: 'db.example.com', port: 1444 })
    expect(parseSqlServerHost('db.example.com, 1444 ')).toEqual({ host: 'db.example.com', port: 1444 })
    expect(parseSqlServerHost('.\\SQL2019,1444')).toEqual({
      host: 'localhost',
      instanceName: 'SQL2019',
      port: 1444,
    })
  })

  it('leaves a comma that is not followed by a valid port in place', () => {
    expect(parseSqlServerHost('db.example.com,abc')).toEqual({ host: 'db.example.com,abc' })
    expect(parseSqlServerHost('db.example.com,99999')).toEqual({ host: 'db.example.com,99999' })
    expect(parseSqlServerHost('db.example.com').port).toBeUndefined()
  })

  it('drops the tcp: protocol prefix', () => {
    expect(parseSqlServerHost('tcp:db.example.com,1444')).toEqual({ host: 'db.example.com', port: 1444 })
    expect(parseSqlServerHost('TCP:db.example.com')).toEqual({ host: 'db.example.com' })
  })

  it('flags LocalDB instead of treating it as this machine', () => {
    expect(parseSqlServerHost('(localdb)\\MSSQLLocalDB')).toEqual({
      host: '(localdb)',
      instanceName: 'MSSQLLocalDB',
      localDb: true,
    })
    expect(parseSqlServerHost('(LocalDB)\\v11.0').localDb).toBe(true)
    expect(parseSqlServerHost('(local)\\SQL2019').localDb).toBeUndefined()
  })

  it('handles an empty or missing value without throwing', () => {
    expect(parseSqlServerHost('')).toEqual({ host: '', instanceName: undefined })
    expect(parseSqlServerHost(undefined as unknown as string)).toEqual({ host: '', instanceName: undefined })
  })
})

describe('sqlServerHostFieldSplit', () => {
  it('moves a port out of the host, keeping the instance name', () => {
    expect(sqlServerHostFieldSplit('db.example.com,1444')).toEqual({ host: 'db.example.com', port: 1444 })
    expect(sqlServerHostFieldSplit(' tcp:db.example.com\\SQL2019, 1444 ')).toEqual({
      host: 'db.example.com\\SQL2019',
      port: 1444,
    })
    expect(sqlServerHostFieldSplit('db.example.com,1433')).toEqual({ host: 'db.example.com', port: 1433 })
  })

  it('returns null when there is no port to move', () => {
    expect(sqlServerHostFieldSplit('db.example.com')).toBeNull()
    expect(sqlServerHostFieldSplit('db.example.com,abc')).toBeNull()
    expect(sqlServerHostFieldSplit('')).toBeNull()
  })

  it('leaves an instance on port 1433 as typed, since the Port field reads 1433 as unspecified', () => {
    expect(sqlServerHostFieldSplit('db.example.com\\SQL2019,1433')).toBeNull()
  })
})
