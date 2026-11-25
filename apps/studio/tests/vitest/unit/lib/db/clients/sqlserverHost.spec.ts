import { describe, it, expect } from 'vitest'
import { parseSqlServerHost, splitSqlServerHostPort, applySqlServerHostPaste, sqlServerHostPortHint } from '@/lib/db/clients/sqlserverHost'

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

  it('strips the tcp: protocol prefix', () => {
    expect(parseSqlServerHost('tcp:db.example.com')).toEqual({ host: 'db.example.com', instanceName: undefined })
    expect(parseSqlServerHost('TCP:.\\SQL2019')).toEqual({ host: 'localhost', instanceName: 'SQL2019' })
  })

  // The port belongs in the Port field. It is not read out of the Host field when connecting.
  it('does not read a port out of the host', () => {
    expect(parseSqlServerHost('localhost,14330')).toEqual({ host: 'localhost,14330', instanceName: undefined })
    expect(parseSqlServerHost('localhost\\SQL2019,14330')).toEqual({ host: 'localhost', instanceName: 'SQL2019,14330' })
  })
})

describe('splitSqlServerHostPort', () => {
  it('separates a trailing ,port', () => {
    expect(splitSqlServerHostPort('localhost,14330')).toEqual({ host: 'localhost', port: 14330 })
    expect(splitSqlServerHostPort(' db.example.com , 1433 ')).toEqual({ host: 'db.example.com', port: 1433 })
  })

  it('drops the tcp: prefix and keeps the instance', () => {
    expect(splitSqlServerHostPort('TCP:myserver.database.windows.net,1433')).toEqual({ host: 'myserver.database.windows.net', port: 1433 })
    expect(splitSqlServerHostPort('db\\SQL2019,14330')).toEqual({ host: 'db\\SQL2019', port: 14330 })
  })

  it('returns no port when there is none or it is not a valid TCP port', () => {
    expect(splitSqlServerHostPort('db.example.com')).toEqual({ host: 'db.example.com' })
    expect(splitSqlServerHostPort('tcp:db.example.com')).toEqual({ host: 'db.example.com' })
    for (const bad of ['localhost,abc', 'localhost,0', 'localhost,99999', 'localhost,123456789012345678901234567890']) {
      expect(splitSqlServerHostPort(bad)).toEqual({ host: bad })
    }
    expect(splitSqlServerHostPort(undefined as unknown as string)).toEqual({ host: '' })
  })
})

describe('applySqlServerHostPaste', () => {
  it('splits a value pasted into an empty field', () => {
    expect(applySqlServerHostPaste('', 0, 0, 'tcp:myserver.database.windows.net,1433')).toEqual({
      host: 'myserver.database.windows.net', port: 1433,
    })
  })

  it('splits a value pasted over the whole existing host', () => {
    expect(applySqlServerHostPaste('localhost', 0, 9, 'db.example.com,14330')).toEqual({ host: 'db.example.com', port: 14330 })
  })

  it('works on the value the paste would produce, not the clipboard alone', () => {
    // caret at the end of "db.example.com", pasting just the port part
    expect(applySqlServerHostPaste('db.example.com', 14, 14, ',14330')).toEqual({ host: 'db.example.com', port: 14330 })
    // replacing only "old" in "old.example.com"
    expect(applySqlServerHostPaste('old.example.com', 0, 3, 'new')).toBeNull()
  })

  it('leaves a paste without a port alone', () => {
    expect(applySqlServerHostPaste('', 0, 0, 'db.example.com')).toBeNull()
    expect(applySqlServerHostPaste('', 0, 0, 'db\\SQL2019')).toBeNull()
  })
})

describe('sqlServerHostPortHint', () => {
  it('names the host and port to enter', () => {
    expect(sqlServerHostPortHint(' tcp:db.example.com,14330 ')).toBe(
      'The Host field contains a port ("tcp:db.example.com,14330"). Enter db.example.com as the Host and 14330 in the Port field.'
    )
    expect(sqlServerHostPortHint('db\\SQL2019,14330')).toContain('Enter db\\SQL2019 as the Host and 14330 in the Port field.')
  })

  it('is null when the host holds no port', () => {
    expect(sqlServerHostPortHint('db.example.com')).toBeNull()
    expect(sqlServerHostPortHint('db\\SQL2019')).toBeNull()
    expect(sqlServerHostPortHint('')).toBeNull()
  })
})
