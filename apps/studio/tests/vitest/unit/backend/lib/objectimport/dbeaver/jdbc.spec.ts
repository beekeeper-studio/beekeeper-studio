import { describe, it, expect } from 'vitest'
import { parseJdbcUrl, parseOracleConnectTarget } from '@/backend/lib/objectimport/dbeaver/jdbc'

describe('parseJdbcUrl', () => {
  it('parses hierarchical URLs with query parameters', () => {
    expect(parseJdbcUrl('jdbc:postgresql://url-host.example.com:5433/urldb?sslmode=require&ApplicationName=bks')).toEqual({
      protocol: 'postgresql',
      host: 'url-host.example.com',
      port: 5433,
      database: 'urldb',
      path: 'urldb',
      params: { sslmode: 'require', applicationname: 'bks' },
    })
    expect(parseJdbcUrl('jdbc:mysql://mysql-url.example.com:3310/urldb?useSSL=true')).toMatchObject({
      protocol: 'mysql', host: 'mysql-url.example.com', port: 3310, database: 'urldb', params: { usessl: 'true' },
    })
    expect(parseJdbcUrl('jdbc:redshift://c.abc.us-east-1.redshift.amazonaws.com:5439/dev')).toMatchObject({
      protocol: 'redshift', host: 'c.abc.us-east-1.redshift.amazonaws.com', port: 5439, database: 'dev',
    })
  })

  it('parses SQL Server ;key=value properties', () => {
    expect(parseJdbcUrl('jdbc:sqlserver://sqlurl.example.com:1444;databaseName=UrlDb;encrypt=true;trustServerCertificate=true')).toEqual({
      protocol: 'sqlserver',
      host: 'sqlurl.example.com',
      port: 1444,
      params: { databasename: 'UrlDb', encrypt: 'true', trustservercertificate: 'true' },
    })
    expect(parseJdbcUrl('jdbc:sqlserver://winsql\\SQLEXPRESS;integratedSecurity=true')).toMatchObject({
      host: 'winsql\\SQLEXPRESS', params: { integratedsecurity: 'true' },
    })
    expect(parseJdbcUrl('jdbc:jtds:sqlserver://legacy.local:1433/Sales;domain=CORP')).toMatchObject({
      protocol: 'jtds:sqlserver', host: 'legacy.local', port: 1433, database: 'Sales', params: { domain: 'CORP' },
    })
  })

  it('keeps the first host of multi-host URLs', () => {
    expect(parseJdbcUrl('jdbc:postgresql://pg1:5432,pg2:5433/app')).toMatchObject({
      host: 'pg1', port: 5432, database: 'app', multipleHosts: true,
    })
  })

  it('handles IPv6 hosts, user info and nested schemes', () => {
    expect(parseJdbcUrl('jdbc:postgresql://[::1]:5432/app')).toMatchObject({ host: '::1', port: 5432 })
    expect(parseJdbcUrl('jdbc:mysql://me:p%40ss@db.local/shop')).toMatchObject({
      host: 'db.local', user: 'me', password: 'p@ss', database: 'shop',
    })
    expect(parseJdbcUrl('jdbc:clickhouse:https://ch.example.com:8443/events')).toMatchObject({
      protocol: 'clickhouse:https', host: 'ch.example.com', port: 8443, database: 'events',
    })
  })

  it('parses catalog/schema paths and Snowflake parameters', () => {
    expect(parseJdbcUrl('jdbc:trino://trino.local:8443/hive/default?SSL=true')).toMatchObject({
      host: 'trino.local', port: 8443, database: 'hive', path: 'hive/default', params: { ssl: 'true' },
    })
    expect(parseJdbcUrl('jdbc:snowflake://acme-xy12345.snowflakecomputing.com/?db=ANALYTICS&warehouse=WH')).toMatchObject({
      host: 'acme-xy12345.snowflakecomputing.com', params: { db: 'ANALYTICS', warehouse: 'WH' },
    })
    expect(parseJdbcUrl('jdbc:snowflake://acme-xy12345.snowflakecomputing.com/?db=ANALYTICS').database).toBeUndefined()
  })

  it('reads BigQuery properties after the nested endpoint URL', () => {
    expect(parseJdbcUrl('jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;ProjectId=my-project;OAuthType=0;OAuthPvtKeyPath=/keys/bq.json')).toEqual({
      protocol: 'bigquery',
      params: { projectid: 'my-project', oauthtype: '0', oauthpvtkeypath: '/keys/bq.json' },
    })
  })

  it('parses file based and opaque URLs', () => {
    expect(parseJdbcUrl('jdbc:sqlite:/data/from-url.db')).toMatchObject({ protocol: 'sqlite', path: '/data/from-url.db' })
    expect(parseJdbcUrl('jdbc:sqlite:file:/data/ro.db?mode=ro')).toMatchObject({ path: '/data/ro.db', params: { mode: 'ro' } })
    expect(parseJdbcUrl('jdbc:duckdb:')).toMatchObject({ protocol: 'duckdb', path: '' })
    expect(parseJdbcUrl('jdbc:dbeaver:libsql:libsql://my-db.turso.io')).toMatchObject({
      protocol: 'dbeaver:libsql', opaque: 'libsql://my-db.turso.io',
    })
  })

  it('parses Firebird database paths', () => {
    expect(parseJdbcUrl('jdbc:firebirdsql://fb.local:3050//var/lib/firebird/data/employee.fdb')).toMatchObject({
      host: 'fb.local', port: 3050, path: '/var/lib/firebird/data/employee.fdb',
    })
    expect(parseJdbcUrl('jdbc:firebirdsql://fb.local/C:/db/employee.fdb')).toMatchObject({ path: 'C:/db/employee.fdb' })
    expect(parseJdbcUrl('jdbc:firebirdsql:fb.local/3051:/data/employee.fdb')).toMatchObject({
      host: 'fb.local', port: 3051, path: '/data/employee.fdb',
    })
  })

  it('parses Oracle thin URLs', () => {
    expect(parseJdbcUrl('jdbc:oracle:thin:@//ora-url.example.com:1522/URLPDB')).toMatchObject({
      protocol: 'oracle:thin', host: 'ora-url.example.com', port: 1522, database: 'URLPDB', opaque: '//ora-url.example.com:1522/URLPDB',
    })
    expect(parseJdbcUrl('jdbc:oracle:thin:scott/tiger@ora.local:1521:XE')).toMatchObject({
      user: 'scott', password: 'tiger', host: 'ora.local', port: 1521, database: 'XE',
    })
  })

  it('returns null for unusable input', () => {
    expect(parseJdbcUrl('')).toBeNull()
    expect(parseJdbcUrl('jdbc:oracle:thin:no-target')).toBeNull()
    expect(parseJdbcUrl('nonsense')).toBeNull()
  })
})

describe('parseOracleConnectTarget', () => {
  it('recognizes service names, SIDs, descriptors and aliases', () => {
    expect(parseOracleConnectTarget('//ora.local:1521/ORCLPDB1')).toEqual({ kind: 'service', host: 'ora.local', port: 1521, name: 'ORCLPDB1', ssl: false })
    expect(parseOracleConnectTarget('ora.local/ORCLPDB1')).toEqual({ kind: 'service', host: 'ora.local', port: undefined, name: 'ORCLPDB1', ssl: false })
    expect(parseOracleConnectTarget('tcps://ora.local:2484/SECURE')).toMatchObject({ kind: 'service', name: 'SECURE', ssl: true })
    expect(parseOracleConnectTarget('ora.local:1521:XE')).toEqual({ kind: 'sid', host: 'ora.local', port: 1521, name: 'XE', ssl: false })
    expect(parseOracleConnectTarget('PRODDB')).toEqual({ kind: 'alias', name: 'PRODDB', ssl: false })

    const descriptor = '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(HOST=h)(PORT=2484))(CONNECT_DATA=(SERVICE_NAME=s)))'
    expect(parseOracleConnectTarget(descriptor)).toEqual({ kind: 'descriptor', descriptor, ssl: true })
  })
})
