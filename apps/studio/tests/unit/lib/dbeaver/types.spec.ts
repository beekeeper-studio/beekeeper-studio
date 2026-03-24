import { mapDBeaverDriverToBKS } from '@/lib/dbeaver/types'

describe('DBeaver driver mapping', () => {
  it('maps standard DBeaver providers to BKS types', () => {
    expect(mapDBeaverDriverToBKS('postgresql')).toBe('postgresql')
    expect(mapDBeaverDriverToBKS('mysql')).toBe('mysql')
    expect(mapDBeaverDriverToBKS('mariadb')).toBe('mariadb')
    expect(mapDBeaverDriverToBKS('oracle_thin')).toBe('oracle')
    expect(mapDBeaverDriverToBKS('oracle')).toBe('oracle')
    expect(mapDBeaverDriverToBKS('sqlserver')).toBe('sqlserver')
    expect(mapDBeaverDriverToBKS('mssql')).toBe('sqlserver')
    expect(mapDBeaverDriverToBKS('sqlite')).toBe('sqlite')
    expect(mapDBeaverDriverToBKS('clickhouse')).toBe('clickhouse')
    expect(mapDBeaverDriverToBKS('mongodb')).toBe('mongodb')
    expect(mapDBeaverDriverToBKS('firebird')).toBe('firebird')
    expect(mapDBeaverDriverToBKS('cockroachdb')).toBe('cockroachdb')
    expect(mapDBeaverDriverToBKS('redshift')).toBe('redshift')
    expect(mapDBeaverDriverToBKS('cassandra')).toBe('cassandra')
    expect(mapDBeaverDriverToBKS('duckdb')).toBe('duckdb')
    expect(mapDBeaverDriverToBKS('bigquery')).toBe('bigquery')
    expect(mapDBeaverDriverToBKS('trino')).toBe('trino')
    expect(mapDBeaverDriverToBKS('presto')).toBe('trino')
    expect(mapDBeaverDriverToBKS('sqlanywhere')).toBe('sqlanywhere')
  })

  it('returns null for unsupported drivers', () => {
    expect(mapDBeaverDriverToBKS('db2')).toBeNull()
    expect(mapDBeaverDriverToBKS('snowflake')).toBeNull()
    expect(mapDBeaverDriverToBKS('')).toBeNull()
  })
})
