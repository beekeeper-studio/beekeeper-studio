/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest'
import { mapDBeaverConnection, MappedConnection, resolveConnectionType, rgbToLabelColor, stripSecrets } from '@/backend/lib/objectimport/dbeaver/mapping'
import { readDBeaverSource } from '@/backend/lib/objectimport/dbeaver/source'
import { DBeaverStorage } from '@/backend/lib/objectimport/dbeaver/types'
import { AzureAuthType } from '@/lib/db/types'
import { DBEAVER_WORKSPACE, FIXTURE_CONNECTION_COUNT, UNSUPPORTED_FIXTURE_CONNECTIONS } from '@tests/vitest/lib/dbeaverFixtures'

let mapped: Map<string, MappedConnection>

function conn(name: string) {
  const m = mapped.get(name)
  if (!m) throw new Error(`no fixture connection named ${name}`)
  return m
}

function emptyStorage(connections = {}, credentials = {}): DBeaverStorage {
  return { fileName: 'data-sources.json', dataSources: { connections }, credentials }
}

describe('mapDBeaverConnection', () => {
  beforeAll(async () => {
    const source = await readDBeaverSource(DBEAVER_WORKSPACE)
    const [project] = source.projects
    mapped = new Map()
    for (const storage of project.storages) {
      for (const [id, c] of Object.entries(storage.dataSources.connections)) {
        const m = mapDBeaverConnection(id, c, { storage, defaultStorage: project.storages[0] })
        mapped.set(m.name, m)
      }
    }
  })

  it('maps every fixture connection except the unsupported drivers', () => {
    expect(mapped.size).toBe(FIXTURE_CONNECTION_COUNT)
    const skipped = [...mapped.values()].filter((m) => !m.connection)
    expect(skipped.map((m) => m.name).sort()).toEqual(UNSUPPORTED_FIXTURE_CONNECTIONS)
    expect(conn('DB2 Legacy')).toMatchObject({ connectionType: null, driver: 'db2/db2', skipReason: 'DBeaver driver db2/db2 has no Beekeeper Studio equivalent' })
    expect(conn('H2 Embedded').driver).toBe('h2/h2_embedded_v3')
  })

  it('maps a plain Postgres connection', () => {
    const m = conn('Local Postgres')
    expect(m).toMatchObject({ folder: 'Development', driver: 'postgresql/postgres-jdbc', connectionType: 'postgresql', hasPassword: true, warnings: [] })
    expect(m.connection).toEqual({
      name: 'Local Postgres',
      connectionType: 'postgresql',
      readOnlyMode: false,
      labelColor: 'default',
      host: 'localhost',
      port: 5432,
      defaultDatabase: 'app_dev',
      username: 'postgres',
      password: 'pg-secret',
    })
  })

  it('maps SSH password tunnels, read-only and the production connection type', () => {
    const m = conn('Prod Postgres (SSH password)')
    expect(m.folder).toBe('Production')
    expect(m.connection).toMatchObject({
      host: 'db.internal', port: 5432, defaultDatabase: 'app', username: 'app', password: 'app-secret',
      readOnlyMode: true,
      labelColor: 'red',
      sshEnabled: true, sshHost: 'bastion.example.com', sshPort: 22, sshMode: 'userpass', sshUsername: 'deploy', sshPassword: 'ssh-secret',
    })
    expect(m.warnings).toEqual(['Bootstrap queries that DBeaver runs on connect are not imported'])
  })

  it('maps SSH key tunnels and verified SSL with certificates', () => {
    const m = conn('EU Postgres (SSH key + SSL)')
    expect(m.folder).toBe('Production/EU')
    expect(m.connection).toMatchObject({
      host: 'eu-db.internal', port: 6543, defaultDatabase: 'eu_app', username: 'eu_app', password: 'eu-secret', labelColor: 'red',
      sshEnabled: true, sshHost: 'eu-bastion.example.com', sshPort: 2222, sshMode: 'keyfile', sshUsername: 'ubuntu',
      sshKeyfile: '/home/me/.ssh/id_ed25519', sshKeyfilePassword: 'key-passphrase', sshKeepaliveInterval: 30,
      ssl: true, sslCaFile: '/certs/eu/ca.pem', sslCertFile: '/certs/eu/client.crt', sslKeyFile: '/certs/eu/client.key', sslRejectUnauthorized: true,
    })
    expect(m.connection).not.toHaveProperty('sshPassword')
    expect(m.warnings).toEqual([])
  })

  it('maps SSL require without verification and the test connection type', () => {
    expect(conn('Postgres SSL require').connection).toMatchObject({ ssl: true, sslRejectUnauthorized: false, labelColor: 'green' })
  })

  it('keeps the username when DBeaver reads the password from pgpass', () => {
    const m = conn('Postgres pgpass')
    expect(m.connection).toMatchObject({ host: 'pgpass.local', username: 'pgpass_user' })
    expect(m.connection).not.toHaveProperty('password')
    expect(m.hasPassword).toBe(false)
    expect(m.warnings).toEqual(['DBeaver reads this password from a pgpass file, so no password is imported'])
  })

  it('maps the Postgres family drivers', () => {
    expect(conn('Redshift Warehouse').connection).toMatchObject({
      connectionType: 'redshift', host: 'my-cluster.abc123.us-east-1.redshift.amazonaws.com', port: 5439, defaultDatabase: 'dev',
      username: 'awsuser', password: 'redshift-secret', labelColor: 'purple',
    })
    expect(conn('CockroachDB').connection).toMatchObject({ connectionType: 'cockroachdb', host: 'crdb.local', port: 26257, defaultDatabase: 'defaultdb' })
    expect(conn('Greengage').connection).toMatchObject({ connectionType: 'greengage', host: 'gg.local', username: 'gpadmin' })
    expect(conn('TimescaleDB').connection).toMatchObject({ connectionType: 'postgresql', host: 'tsdb.local', defaultDatabase: 'metrics' })
    expect(conn('Team Shared Postgres')).toMatchObject({ folder: 'Team', connection: { host: 'team-db.example.com', username: 'team', password: 'team-secret' } })
  })

  it('maps the MySQL family, SSL and SSH agent tunnels', () => {
    expect(conn('MySQL Shop').connection).toMatchObject({
      connectionType: 'mysql', host: 'mysql.local', port: 3306, defaultDatabase: 'shop', username: 'root', password: 'mysql-secret',
      ssl: true, sslCaFile: '/certs/mysql/ca.pem', sslRejectUnauthorized: false,
    })
    expect(conn('MariaDB Blog (SSH agent)').connection).toMatchObject({
      connectionType: 'mariadb', port: 3307, sshEnabled: true, sshHost: 'jump.example.com', sshPort: 22, sshMode: 'agent', sshUsername: 'tunnel',
    })
    expect(conn('Local MariaDB').connection).toMatchObject({ connectionType: 'mariadb', password: 'local-maria-secret' })
    expect(conn('TiDB').connection).toMatchObject({ connectionType: 'tidb', port: 4000 })
    expect(conn('StarRocks').connection).toMatchObject({ connectionType: 'starrocks', port: 9030, defaultDatabase: 'sr_db' })
  })

  it('imports connections whose password is not saved, with a custom connection type color', () => {
    const m = conn('Staging MySQL (password not saved)')
    expect(m.connection).toMatchObject({ username: 'stage', labelColor: 'yellow' })
    expect(m.connection).not.toHaveProperty('password')
    expect(m.hasPassword).toBe(false)
  })

  it('maps SQL Server authentication modes', () => {
    const sql = conn('SQL Server')
    expect(sql.connection).toMatchObject({ connectionType: 'sqlserver', host: 'mssql.local', port: 1433, defaultDatabase: 'master', username: 'sa', password: 'Mssql-Secret1' })
    // DBeaver doesn't encrypt without the SSL tab or an encrypt property
    expect(sql.connection).not.toHaveProperty('ssl')

    const windows = conn('SQL Server (Windows auth)')
    expect(windows.connection).toMatchObject({ windowsAuthEnabled: true, host: 'winsql.corp.local', defaultDatabase: 'Sales' })
    expect(windows.connection).not.toHaveProperty('username')

    expect(conn('SQL Server (NTLM)').connection).toMatchObject({ username: 'jdoe', domain: 'CORP', password: 'ntlm-secret' })

    const azure = conn('Azure SQL (AD password)')
    expect(azure.connection).toMatchObject({
      host: 'myserver.database.windows.net', username: 'admin@contoso.com',
      azureAuthOptions: { azureAuthEnabled: true, azureAuthType: AzureAuthType.AccessToken },
    })
    expect(azure.warnings).toEqual(['Active Directory password authentication is imported as Entra ID single sign-on'])
  })

  it('maps Oracle service names, SIDs and TNS aliases', () => {
    expect(conn('Oracle Service Name').connection).toMatchObject({
      connectionType: 'oracle', host: 'ora.local', port: 1521, serviceName: 'ORCLPDB1', options: { connectionMethod: 'manual' },
      username: 'scott', password: 'tiger',
    })
    expect(conn('Oracle SID').connection).toMatchObject({
      options: {
        connectionMethod: 'connectionString',
        connectionString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=ora-sid.local)(PORT=1521))(CONNECT_DATA=(SID=XE)))',
      },
      username: 'system', password: 'oracle-secret',
    })
    const tns = conn('Oracle TNS')
    expect(tns.connection).toMatchObject({ options: { connectionMethod: 'connectionString', connectionString: 'PRODDB' }, username: 'app_ro' })
    expect(tns.warnings).toEqual(['DBeaver reads the TNS alias from /opt/oracle/network/admin; set the Oracle TNS_ADMIN override to the same directory'])
    expect(conn('Oracle Service Name').connection).not.toHaveProperty('defaultDatabase')
  })

  it('maps file based and token connections', () => {
    expect(conn('SQLite App DB').connection).toMatchObject({ connectionType: 'sqlite', defaultDatabase: '/data/app.sqlite3' })
    expect(conn('DuckDB Analytics')).toMatchObject({ folder: 'Analytics', connection: { connectionType: 'duckdb', defaultDatabase: '/data/analytics.duckdb' } })
    const libsql = conn('Turso LibSQL')
    expect(libsql.connection).toMatchObject({
      connectionType: 'libsql', defaultDatabase: 'libsql://my-db-acme.turso.io', libsqlOptions: { mode: 'url', authToken: 'libsql-token' },
    })
    expect(libsql.hasPassword).toBe(true)
    expect(conn('Firebird Employee').connection).toMatchObject({
      connectionType: 'firebird', host: 'fb.local', port: 3050, defaultDatabase: '/var/lib/firebird/data/employee.fdb', username: 'SYSDBA', password: 'masterkey',
    })
  })

  it('maps warehouse and analytics connections', () => {
    expect(conn('ClickHouse Events').connection).toMatchObject({ connectionType: 'clickhouse', host: 'ch.local', port: 8123, defaultDatabase: 'events', password: 'ch-secret' })
    const snowflake = conn('Snowflake')
    expect(snowflake.connection).toMatchObject({
      connectionType: 'snowflake', readOnlyMode: true, defaultDatabase: 'ANALYTICS', username: 'SNOWUSER', password: 'snow-secret',
      snowflakeOptions: { accountId: 'acme-xy12345', defaultWarehouse: 'COMPUTE_WH' },
    })
    expect(snowflake.connection).not.toHaveProperty('host')
    expect(conn('BigQuery').connection).toMatchObject({
      connectionType: 'bigquery', bigQueryOptions: { projectId: 'my-gcp-project', keyFilename: '/keys/bigquery.json' },
    })
    expect(conn('Trino').connection).toMatchObject({ connectionType: 'trino', host: 'trino.local', port: 8080, defaultDatabase: 'hive', username: 'analyst' })
  })

  it('maps connections configured with a JDBC URL', () => {
    expect(conn('Postgres via URL').connection).toMatchObject({
      host: 'url-host.example.com', port: 5433, defaultDatabase: 'urldb', username: 'url_user', password: 'url-secret', ssl: true, sslRejectUnauthorized: false,
    })
    expect(conn('MySQL via URL').connection).toMatchObject({ host: 'mysql-url.example.com', port: 3310, defaultDatabase: 'urldb', ssl: true })
    expect(conn('SQL Server via URL').connection).toMatchObject({
      host: 'sqlurl.example.com', port: 1444, defaultDatabase: 'UrlDb', ssl: true, trustServerCertificate: true, username: 'url_sa',
    })
    expect(conn('Oracle custom URL').connection).toMatchObject({
      host: 'ora-url.example.com', port: 1522, serviceName: 'URLPDB', options: { connectionMethod: 'manual' }, username: 'url_ora', password: 'url-ora-secret',
    })
    expect(conn('SQLite via URL').connection).toMatchObject({ defaultDatabase: '/data/from-url.db' })
    for (const name of ['Postgres via URL', 'MySQL via URL', 'SQL Server via URL', 'Oracle custom URL', 'SQLite via URL']) {
      expect(conn(name).warnings).toEqual([])
    }
  })

  it('imports the first SSH jump host as the bastion', () => {
    expect(conn('Postgres via jump host').connection).toMatchObject({
      sshHost: 'inner-ssh.internal', sshPort: 22, sshMode: 'userpass', sshUsername: 'inner', sshPassword: 'inner-ssh-secret',
      sshBastionHost: 'jump.example.com', sshBastionHostPort: 2200, sshBastionUsername: 'jumper',
      sshBastionMode: 'keyfile', sshBastionKeyfile: '/home/me/.ssh/jump_key', sshBastionKeyfilePassword: 'jump-key-pass',
    })
  })

  it('takes SSH settings from the network profile a connection uses', () => {
    const m = conn('Postgres via network profile')
    expect(m.connection).toMatchObject({
      host: 'profiled-db.internal', password: 'profiled-secret',
      sshEnabled: true, sshHost: 'corp-bastion.example.com', sshMode: 'userpass', sshUsername: 'corp', sshPassword: 'corp-ssh-secret',
    })
    expect(m.warnings).toEqual([])
  })

  it('warns about SOCKS proxies', () => {
    const m = conn('MySQL via SOCKS proxy')
    expect(m.connection).toMatchObject({ host: 'proxied-mysql.internal', password: 'proxied-secret' })
    expect(m.connection).not.toHaveProperty('sshEnabled')
    expect(m.warnings).toEqual(['SOCKS proxies are not supported; imported without the proxy'])
  })

  it('never leaves undefined values that would override Beekeeper defaults', () => {
    for (const m of mapped.values()) {
      if (m.connection) expect(Object.values(m.connection)).not.toContain(undefined)
    }
  })
})

describe('mapDBeaverConnection edge cases', () => {
  const map = (conn: any, credentials = {}) => {
    const storage = emptyStorage({ c1: conn }, credentials)
    return mapDBeaverConnection('c1', conn, { storage, defaultStorage: storage })
  }

  it('falls back to plaintext credentials from old DBeaver versions', () => {
    const m = map({ provider: 'postgresql', driver: 'postgres-jdbc', name: 'Old', configuration: { host: 'h', user: 'legacy', password: 'plain' } })
    expect(m.connection).toMatchObject({ username: 'legacy', password: 'plain' })
  })

  it('maps legacy driver ids that DBeaver migrates', () => {
    expect(resolveConnectionType({ provider: 'generic', driver: 'sqlite_jdbc' })).toBe('sqlite')
    expect(resolveConnectionType({ provider: 'mssql', driver: 'mssql_jdbc_ms_new' })).toBe('sqlserver')
    expect(resolveConnectionType({ provider: 'generic', driver: 'aws_redshift' })).toBe('redshift')
    expect(resolveConnectionType({ provider: 'postgresql', driver: 'postgres-greenplum-jdbc' })).toBe('postgresql')
    // unknown driver of a known provider, e.g. a user-defined driver
    expect(resolveConnectionType({ provider: 'mysql', driver: 'my-custom-mysql' })).toBe('mysql')
    expect(resolveConnectionType({ provider: 'mssql', driver: 'sybase_jtds' })).toBeNull()
    expect(resolveConnectionType({ provider: 'jaybird', driver: 'jaybird_embedded' })).toBeNull()
    expect(resolveConnectionType({ provider: 'generic', driver: 'csvjdbc' })).toBeNull()
  })

  it('drops the SSH password when the handler does not save passwords', () => {
    const m = map(
      { provider: 'postgresql', driver: 'postgres-jdbc', name: 'x', configuration: { host: 'h', handlers: { ssh_tunnel: { enabled: true, 'save-password': false, properties: { host: 'b' } } } } },
      { c1: { 'network/ssh_tunnel': { user: 'u', password: 'stale' } } }
    )
    expect(m.connection).toMatchObject({ sshEnabled: true, sshUsername: 'u' })
    expect(m.connection).not.toHaveProperty('sshPassword')
  })

  it('ignores disabled handlers', () => {
    const m = map({ provider: 'postgresql', driver: 'postgres-jdbc', name: 'x', configuration: { host: 'h', handlers: { ssh_tunnel: { enabled: false, properties: { host: 'b' } } } } })
    expect(m.connection).not.toHaveProperty('sshEnabled')
  })

  it('warns about inline SSH keys, extra jump hosts and missing profiles', () => {
    const m = map({
      provider: 'postgresql', driver: 'postgres-jdbc', name: 'x',
      configuration: {
        host: 'h', 'config-profile': 'global-profile',
        handlers: { ssh_tunnel: { enabled: true, 'save-password': true, properties: {
          host: 'b', authType: 'PUBLIC_KEY', 'jumpServer0.enabled': 'true', 'jumpServer0.host': 'j0', 'jumpServer1.enabled': 'true', 'jumpServer1.host': 'j1',
        } } },
      },
    }, { c1: { 'network/ssh_tunnel': { user: 'u', keyValue: '-----BEGIN OPENSSH PRIVATE KEY-----' } } })
    expect(m.connection).toMatchObject({ sshMode: 'keyfile', sshBastionHost: 'j0', sshBastionMode: 'userpass' })
    expect(m.warnings).toEqual([
      'Network profile "global-profile" is not in this project (it may be a global DBeaver profile), so its settings are not imported',
      'The SSH private key is stored inside DBeaver rather than in a file; set a key file after importing',
      'Only the first of 2 SSH jump hosts is imported',
    ])
  })

  it('ignores jump hosts beyond the declared count', () => {
    const m = map({
      provider: 'postgresql', driver: 'postgres-jdbc', name: 'x',
      configuration: { host: 'h', handlers: { ssh_tunnel: { enabled: true, properties: { host: 'b', 'jumpServer.count': '0', 'jumpServer0.enabled': 'true', 'jumpServer0.host': 'stale' } } } },
    })
    expect(m.connection).toMatchObject({ sshHost: 'b' })
    expect(m.connection).not.toHaveProperty('sshBastionHost')
  })

  it('skips SQLite connections without a file and keeps in-memory DuckDB', () => {
    expect(map({ provider: 'sqlite', driver: 'sqlite_jdbc', name: 'x', configuration: {} })).toMatchObject({ connection: null, skipReason: 'No SQLite database file is set' })
    expect(map({ provider: 'duckdb', driver: 'duckdb_jdbc', name: 'x', configuration: {} }).connection).toMatchObject({ defaultDatabase: ':memory:' })
  })

  it('maps SQL Server instances, encryption and legacy auth settings', () => {
    const m = map({
      provider: 'sqlserver', driver: 'microsoft', name: 'x',
      configuration: {
        host: 'sql.local', properties: { instanceName: 'SQLEXPRESS', encrypt: 'true' },
        'provider-properties': { '@dbeaver-authentication@': 'WINDOWS_INTEGRATED' },
      },
    }, { c1: { '#connection': { user: 'u', password: 'p' } } })
    expect(m.connection).toMatchObject({ host: 'sql.local\\SQLEXPRESS', ssl: true, trustServerCertificate: false, windowsAuthEnabled: true })
    expect(m.connection).not.toHaveProperty('password')
  })

  it('warns about authentication Beekeeper cannot reproduce', () => {
    expect(map({ provider: 'postgresql', driver: 'postgres-jdbc', name: 'x', configuration: { host: 'h', 'auth-model': 'shell_command' } }).warnings)
      .toEqual(['DBeaver gets this password from a shell command, so no password is imported'])
    expect(map({ provider: 'oracle', driver: 'oracle_thin', name: 'x', configuration: { host: 'h', database: 's' } }, { c1: { '#connection': { user: 'sys', 'oracle.logon-as': 'sysdba' } } }).warnings)
      .toEqual(['Logging in as SYSDBA is not supported; imported as a normal login'])
    expect(map({ provider: 'sqlserver', driver: 'microsoft', name: 'x', configuration: { host: 'h', 'auth-model': 'sqlserver_msi' } }).warnings)
      .toEqual(['SQL Server authentication "msi" is not supported; imported with SQL Server authentication'])
  })

  it('uses the connection name or id for the Beekeeper name', () => {
    expect(map({ provider: 'postgresql', driver: 'postgres-jdbc', name: '  ', configuration: { host: 'h' } }).name).toBe('c1')
  })
})

describe('stripSecrets', () => {
  it('removes passwords, passphrases and tokens', () => {
    const stripped = stripSecrets({
      name: 'x', username: 'u', password: 'p', sshPassword: 's', sshKeyfilePassword: 'k', sshBastionPassword: 'b', sshBastionKeyfilePassword: 'bk',
      libsqlOptions: { mode: 'url', authToken: 't' },
    })
    expect(stripped).toEqual({ name: 'x', username: 'u', libsqlOptions: { mode: 'url' } })
  })
})

describe('rgbToLabelColor', () => {
  it('maps DBeaver colors to the nearest label color', () => {
    expect(rgbToLabelColor('255,255,255')).toBe('default')
    expect(rgbToLabelColor('128,128,128')).toBe('default')
    expect(rgbToLabelColor('250,207,207')).toBe('red')
    // DBeaver's colors before 22.x
    expect(rgbToLabelColor('247,159,129')).toBe('red')
    expect(rgbToLabelColor('196,255,181')).toBe('green')
    expect(rgbToLabelColor('255,160,0')).toBe('orange')
    expect(rgbToLabelColor('255,200,0')).toBe('yellow')
    expect(rgbToLabelColor('0,120,255')).toBe('blue')
    expect(rgbToLabelColor('128,0,255')).toBe('purple')
    expect(rgbToLabelColor('255,0,200')).toBe('pink')
    expect(rgbToLabelColor('nonsense')).toBeUndefined()
  })
})
