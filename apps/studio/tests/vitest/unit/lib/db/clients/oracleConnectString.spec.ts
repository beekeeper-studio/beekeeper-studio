import { describe, it, expect } from 'vitest'
import { buildOracleConnectString } from '@commercial/backend/lib/db/clients/oracle/connectString'

describe('buildOracleConnectString', () => {
  it('builds an Easy Connect string for a service name', () => {
    expect(buildOracleConnectString({ host: 'db.example.com', port: 1521, identifier: 'XEPDB1' }))
      .toBe('db.example.com:1521/XEPDB1')
  })

  it('treats a missing identifier type as a service name', () => {
    expect(buildOracleConnectString({ host: 'h', port: 1521, identifier: 'ORCL', identifierType: null }))
      .toBe('h:1521/ORCL')
  })

  it('uses tcps for a service name over SSL', () => {
    expect(buildOracleConnectString({ host: 'h', port: 2484, ssl: true, identifier: 'ORCL' }))
      .toBe('tcps://h:2484/ORCL')
  })

  it('builds a descriptor for a SID', () => {
    expect(buildOracleConnectString({ host: 'h', port: 1521, identifier: 'XE', identifierType: 'sid' }))
      .toBe('(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=h)(PORT=1521))(CONNECT_DATA=(SID=XE)))')
  })

  it('uses TCPS for a SID over SSL', () => {
    expect(buildOracleConnectString({ host: 'h', port: 2484, ssl: true, identifier: 'XE', identifierType: 'sid' }))
      .toBe('(DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(HOST=h)(PORT=2484))(CONNECT_DATA=(SID=XE)))')
  })

  it('trims the identifier', () => {
    expect(buildOracleConnectString({ host: 'h', port: 1521, identifier: ' ORCL ' })).toBe('h:1521/ORCL')
  })

  it('rejects a blank service name or SID', () => {
    expect(() => buildOracleConnectString({ host: 'h', port: 1521, identifier: null }))
      .toThrow('Service Name is required')
    expect(() => buildOracleConnectString({ host: 'h', port: 1521, identifier: '  ' }))
      .toThrow('Service Name is required')
    expect(() => buildOracleConnectString({ host: 'h', port: 1521, identifier: '', identifierType: 'sid' }))
      .toThrow('SID is required')
  })
})
