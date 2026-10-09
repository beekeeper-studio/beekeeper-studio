import { describe, it, expect } from 'vitest'
import { parseSqlServerHost } from '@/lib/db/clients/sqlserverHost'

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
})
