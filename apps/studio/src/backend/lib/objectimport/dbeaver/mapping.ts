import _ from 'lodash';
import { IConnection, SshMode } from '@/common/interfaces/IConnection';
import { AzureAuthType, ConnectionType, SnowflakeAuthType } from '@/lib/db/types';
import { JdbcUrl, OracleConnectTarget, parseJdbcUrl, parseOracleConnectTarget } from './jdbc';
import { DBeaverConnection, DBeaverConnectionConfig, DBeaverHandlerConfig, DBeaverStorage } from './types';

// DBeaver driver ids, including the legacy ids that DBeaver still migrates from
// (the <replace provider=".." driver=".."/> entries in each plugin.xml).
const DRIVER_TYPES: Record<string, ConnectionType> = {
  'postgres-jdbc': 'postgresql',
  'postgresql': 'postgresql',
  'postgresql_generic': 'postgresql',
  'postgres-timescale-jdbc': 'postgresql',
  'postgres-yugabytedb-jdbc': 'postgresql',
  'postgres-greenplum-jdbc': 'postgresql',
  'greenplum-jdbc': 'postgresql',
  'cloudberry-jdbc': 'postgresql',
  'postgres-cloudberry-jdbc': 'postgresql',
  'greengage-jdbc': 'greengage',
  'postgres-greengage-jdbc': 'greengage',
  'postgres-redshift-jdbc': 'redshift',
  'aws_redshift': 'redshift',
  'aws_redshift_42': 'redshift',
  'postgres-cockroach-jdbc': 'cockroachdb',
  'mysql8': 'mysql',
  'mysql5': 'mysql',
  'mysql3': 'mysql',
  'mysql_ndb': 'mysql',
  'mariaDB': 'mariadb',
  'tidb': 'tidb',
  'starrocks': 'starrocks',
  'starRocks': 'starrocks',
  'microsoft': 'sqlserver',
  'azure': 'sqlserver',
  'babelfish': 'sqlserver',
  'jtds': 'sqlserver',
  'mssql': 'sqlserver',
  'mssql_ms': 'sqlserver',
  'mssql_jdbc_ms': 'sqlserver',
  'mssql_jdbc_ms_new': 'sqlserver',
  'mssql_jdbc_azure': 'sqlserver',
  'mssql_jdbc_jtds': 'sqlserver',
  'mssql_jdbc_legacy': 'sqlserver',
  'mssql_jtds_legacy': 'sqlserver',
  'mssql_jdbc_babelfish': 'sqlserver',
  'oracle_thin': 'oracle',
  'oracle': 'oracle',
  'oracle_oci': 'oracle',
  'sqlite_jdbc': 'sqlite',
  'sqlite_xerial': 'sqlite',
  'sqlite_zentus': 'sqlite',
  'sqlite_ch_werner': 'sqlite',
  'libsql_jdbc': 'libsql',
  'duckdb_jdbc': 'duckdb',
  'jaybird': 'firebird',
  'firebird_jaybird': 'firebird',
  'firebird_jaybird3': 'firebird',
  'com_clickhouse': 'clickhouse',
  'yandex_clickhouse': 'clickhouse',
  'snowflake_jdbc': 'snowflake',
  'snowflake_generic': 'snowflake',
  'google_bigquery_jdbc': 'bigquery',
  'google_bigquery_jdbc_simba': 'bigquery',
  'trino_jdbc': 'trino',
  'prestosql_jdbc': 'trino',
};

// For drivers not listed above (user-defined drivers, drivers added in newer DBeaver versions).
const PROVIDER_TYPES: Record<string, ConnectionType> = {
  postgresql: 'postgresql',
  greenplum: 'postgresql',
  greengage: 'greengage',
  mysql: 'mysql',
  tidb: 'tidb',
  starrocks: 'starrocks',
  sqlserver: 'sqlserver',
  mssql: 'sqlserver',
  oracle: 'oracle',
  sqlite: 'sqlite',
  duckdb: 'duckdb',
  jaybird: 'firebird',
  clickhouse: 'clickhouse',
  snowflake: 'snowflake',
  bigquery: 'bigquery',
};

// Drivers under a mapped provider that Beekeeper can't connect to.
const UNSUPPORTED_DRIVERS = new Set(['jaybird_embedded', 'sybase_jtds', 'sybase_jconn', 'sypase_jconn']);

const POSTGRES_FAMILY: ConnectionType[] = ['postgresql', 'redshift', 'cockroachdb', 'greengage'];
const MYSQL_FAMILY: ConnectionType[] = ['mysql', 'mariadb', 'tidb', 'starrocks'];
// Beekeeper doesn't tunnel these through SSH
const NO_SSH_TYPES: ConnectionType[] = ['sqlite', 'duckdb', 'libsql', 'bigquery', 'snowflake'];

// Colors of DBeaver's built-in connection types (DBPConnectionType), used when the
// data-sources file doesn't list them.
const BUILTIN_CONNECTION_TYPE_COLORS: Record<string, string> = {
  dev: '255,255,255',
  test: '214,250,207',
  prod: '250,207,207',
};

const SQLSERVER_LEGACY_AUTH: Record<string, string> = {
  SQL_SERVER_PASSWORD: 'sqlserver_database',
  WINDOWS_INTEGRATED: 'sqlserver_windows',
  NTLM: 'sqlserver_ntlm',
  AD_PASSWORD: 'sqlserver_ad_password',
  AD_MSI: 'sqlserver_msi',
  AD_INTERACTIVE: 'sqlserver_mfa',
  AD_INTEGRATED: 'sqlserver_ad_integrated',
  OTHER: 'sqlserver_custom',
};

// Auth models that need nothing beyond username/password (or are handled per type below).
const PLAIN_AUTH_MODELS = new Set([
  '', 'native', 'oracle_native', 'sqlserver_database', 'snowflake_snowflake', 'libsql_token_jdbc', 'google_bigquery',
]);

const JUMP_SERVER_LIMIT = 5;

const SECRET_FIELDS = ['password', 'sshPassword', 'sshKeyfilePassword', 'sshBastionPassword', 'sshBastionKeyfilePassword'];

/** A copy of a mapped connection without passwords, passphrases or tokens. */
export function stripSecrets(connection: Partial<IConnection>): Partial<IConnection> {
  const stripped = _.omit(connection, SECRET_FIELDS);
  if (stripped.libsqlOptions) {
    stripped.libsqlOptions = _.omit(stripped.libsqlOptions, 'authToken') as typeof stripped.libsqlOptions;
  }
  return stripped;
}

export interface MappingContext {
  storage: DBeaverStorage
  /** data-sources.json of the same project: holds connection types and network profiles */
  defaultStorage: DBeaverStorage
}

export interface MappedConnection {
  /** DBeaver connection id */
  id: string
  name: string
  folder: string | null
  /** DBeaver `provider/driver` */
  driver: string
  connectionType: ConnectionType | null
  /** null when the connection can't be imported */
  connection: Partial<IConnection> | null
  skipReason?: string
  hasPassword: boolean
  warnings: string[]
}

interface ResolvedHandler {
  properties: Record<string, string>
  user?: string
  password?: string
  /** secure properties saved in credentials-config.json (jump host passwords, inline keys and certificates) */
  secrets: Record<string, string>
}

export function resolveConnectionType(conn: Pick<DBeaverConnection, 'provider' | 'driver' | 'original-provider' | 'original-driver'>): ConnectionType | null {
  const drivers = [conn.driver, conn['original-driver']].filter(Boolean);
  if (drivers.some((d) => UNSUPPORTED_DRIVERS.has(d))) return null;
  for (const driver of drivers) {
    if (DRIVER_TYPES[driver]) return DRIVER_TYPES[driver];
  }
  for (const provider of [conn.provider, conn['original-provider']]) {
    if (provider && PROVIDER_TYPES[provider]) return PROVIDER_TYPES[provider];
  }
  return null;
}

export function mapDBeaverConnection(id: string, conn: DBeaverConnection, ctx: MappingContext): MappedConnection {
  const cfg: DBeaverConnectionConfig = conn.configuration ?? {};
  const warnings: string[] = [];
  const name = conn.name?.trim() || id;
  const folder = conn.folder?.trim() || null;
  const driver = `${conn.provider}/${conn.driver}`;
  const connectionType = resolveConnectionType(conn);
  const result: MappedConnection = { id, name, folder, driver, connectionType, connection: null, hasPassword: false, warnings };

  if (!connectionType) {
    result.skipReason = `DBeaver driver ${driver} has no Beekeeper Studio equivalent`;
    return result;
  }

  const secure = ctx.storage.credentials[id] ?? {};
  const auth = { ...cfg.credentials, ...secure['#connection'] };
  // plaintext values win, as in DataSourceSerializerModern
  const username = cfg.user || auth.user || undefined;
  const password = cfg.password || auth.password || undefined;

  const useUrl = cfg.configurationType === 'URL' || (!cfg.host && !cfg.database && !cfg.server && !!cfg.url);
  const url = useUrl && cfg.url ? parseJdbcUrl(cfg.url) : null;
  if (useUrl && !url) {
    warnings.push('The JDBC URL could not be parsed, so its host and database are not imported');
  }
  if (url?.multipleHosts) {
    warnings.push('Only the first host of the multi-host JDBC URL is imported');
  }
  const params = { ...lowerKeys(cfg.properties), ...url?.params };
  const providerProps = cfg['provider-properties'] ?? {};
  const handlers = resolveHandlers(id, cfg, ctx, warnings);

  const c: Partial<IConnection> = {
    name,
    connectionType,
    readOnlyMode: !!conn['read-only'],
    labelColor: labelColor(cfg, ctx),
  };

  const server = () => {
    c.host = url?.host ?? cfg.host;
    c.port = toPort(url?.port ?? cfg.port);
    c.defaultDatabase = url?.database ?? cfg.database;
    c.username = url?.user ?? username;
    c.password = url?.password ?? password;
  };

  switch (connectionType) {
    case 'sqlite':
    case 'duckdb': {
      const file = url?.path ?? cfg.database;
      if (!file && connectionType === 'sqlite') {
        result.skipReason = 'No SQLite database file is set';
        return result;
      }
      c.defaultDatabase = file || ':memory:';
      break;
    }
    case 'libsql': {
      c.defaultDatabase = url?.opaque ?? cfg.server ?? cfg.database;
      c.libsqlOptions = { mode: 'url', authToken: password };
      break;
    }
    case 'bigquery': {
      const oauthType = params.oauthtype;
      c.bigQueryOptions = {
        projectId: params.projectid ?? cfg.database,
        keyFilename: params.oauthpvtkeypath || undefined,
      };
      if (oauthType && oauthType !== '0') {
        warnings.push('BigQuery user account (OAuth) sign-in is not imported; set a service account key file');
      }
      break;
    }
    case 'snowflake': {
      const host = url?.host ?? cfg.host ?? '';
      c.snowflakeOptions = {
        authType: SnowflakeAuthType.Default,
        accountId: host.replace(/\.snowflakecomputing\.com$/i, '') || undefined,
        defaultWarehouse: params.warehouse || cfg.server || providerProps.warehouse || undefined,
      };
      c.defaultDatabase = params.db ?? cfg.database;
      c.username = username;
      c.password = password;
      const authenticator = params.authenticator || providerProps['@dbeaver-authenticator@'];
      if (authenticator && authenticator.toLowerCase() !== 'snowflake') {
        warnings.push(`Snowflake authenticator "${authenticator}" is not supported; imported with password authentication`);
      }
      break;
    }
    case 'oracle':
      server();
      applyOracle(c, cfg, url, handlers, warnings);
      break;
    case 'sqlserver':
      server();
      applySqlServer(c, cfg, params, handlers, warnings);
      break;
    case 'firebird':
      server();
      c.defaultDatabase = url?.path ?? cfg.database;
      break;
    default:
      server();
  }

  applySsl(c, connectionType, handlers, params, url, warnings);
  if (handlers.ssh_tunnel) {
    if (NO_SSH_TYPES.includes(connectionType)) {
      warnings.push('SSH tunnels are not supported for this connection type; imported without the tunnel');
    } else {
      applySsh(c, handlers.ssh_tunnel, warnings);
    }
  }
  if (handlers.socks_proxy) {
    warnings.push('SOCKS proxies are not supported; imported without the proxy');
  }

  checkAuthModel(cfg['auth-model'] ?? '', connectionType, { ...cfg['auth-properties'], ...auth }, warnings);
  if (cfg.bootstrap?.query?.length) {
    warnings.push('Bootstrap queries that DBeaver runs on connect are not imported');
  }
  if (Object.values(cfg.events ?? {}).some((e) => e?.enabled)) {
    warnings.push('Shell commands run around connecting are not imported');
  }

  result.connection = _.omitBy(c, _.isUndefined);
  result.hasPassword = !!(c.password || c.libsqlOptions?.authToken);
  return result;
}

function applyOracle(c: Partial<IConnection>, cfg: DBeaverConnectionConfig, url: JdbcUrl | null, handlers: Record<string, ResolvedHandler>, warnings: string[]) {
  const providerProps = cfg['provider-properties'] ?? {};
  const mode = (providerProps['@dbeaver-connection-type@'] || 'BASIC').toUpperCase();
  // CUSTOM is the Oracle page's own "URL" option
  const customUrl = url ?? (mode === 'CUSTOM' && cfg.url ? parseJdbcUrl(cfg.url) : null);

  let target: OracleConnectTarget;
  if (customUrl?.opaque) {
    target = parseOracleConnectTarget(customUrl.opaque);
    c.host = target.host;
    c.port = target.port;
    c.username = customUrl.user ?? c.username;
    c.password = customUrl.password ?? c.password;
  } else if (mode === 'TNS') {
    target = { kind: 'alias', name: cfg.database, ssl: false };
    const tnsPath = providerProps['@dbeaver-tns-path@'];
    if (tnsPath) {
      warnings.push(`DBeaver reads the TNS alias from ${tnsPath}; set the Oracle TNS_ADMIN override to the same directory`);
    }
  } else {
    const isSid = providerProps['@dbeaver-sid-service@'] === 'SID';
    target = { kind: isSid ? 'sid' : 'service', host: cfg.host, port: toPort(cfg.port), name: cfg.database, ssl: false };
  }

  c.ssl = target.ssl;
  if (target.kind === 'service') {
    c.options = { connectionMethod: 'manual' };
    c.host = target.host ?? c.host;
    c.port = target.port ?? c.port;
    c.serviceName = target.name;
    c.defaultDatabase = undefined;
    if (!target.name) warnings.push('No Oracle service name is set');
    return;
  }

  let connectionString = target.name;
  if (target.kind === 'descriptor') {
    connectionString = target.descriptor;
  } else if (target.kind === 'sid') {
    // node-oracledb's Easy Connect syntax only takes service names
    const protocol = target.ssl ? 'TCPS' : 'TCP';
    connectionString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=${protocol})(HOST=${target.host})(PORT=${target.port ?? 1521}))(CONNECT_DATA=(SID=${target.name})))`;
  }
  if (!connectionString) {
    warnings.push('No Oracle connection string or service name is set');
  }
  c.options = { connectionMethod: 'connectionString', connectionString };
  c.defaultDatabase = undefined;
  if (handlers.ssh_tunnel) {
    warnings.push('SSH tunnels do not apply to Oracle connection strings; connect through the tunnel manually or use a service name');
  }
}

function applySqlServer(c: Partial<IConnection>, cfg: DBeaverConnectionConfig, params: Record<string, string>, handlers: Record<string, ResolvedHandler>, warnings: string[]) {
  const providerProps = cfg['provider-properties'] ?? {};

  // DBeaver forces encrypt=false unless the SSL tab or a driver property enables it
  const sslHandler = handlers.mssql_ssl;
  if (sslHandler && (sslHandler.properties['ssl.keystore'] || sslHandler.properties.sslKeyStore)) {
    warnings.push('SSL key stores are not supported; configure certificate files instead');
  }
  if (sslHandler || ['true', 'yes', 'strict', 'mandatory'].includes((params.encrypt ?? '').toLowerCase())) {
    c.ssl = true;
    c.trustServerCertificate = providerProps.sslTrustServerCertificate === 'true' || params.trustservercertificate === 'true';
  }

  const instance = params.instancename;
  if (instance && c.host && !c.host.includes('\\')) {
    c.host = `${c.host}\\${instance}`;
  }
  c.defaultDatabase = params.databasename ?? params.database ?? c.defaultDatabase;
  if (params.domain) c.domain = params.domain;

  let authModel = cfg['auth-model'] || SQLSERVER_LEGACY_AUTH[providerProps['@dbeaver-authentication@']] || '';
  if (!authModel && (providerProps['@dbeaver-connection-windows-auth@'] === 'true' || params.integratedsecurity === 'true')) {
    authModel = 'sqlserver_windows';
  }

  switch (authModel) {
    case 'sqlserver_windows':
      c.windowsAuthEnabled = true;
      c.username = undefined;
      c.password = undefined;
      break;
    case 'sqlserver_ntlm': {
      // DBeaver takes the domain from user@DOMAIN; DOMAIN\user is accepted too
      const user = c.username ?? '';
      const at = user.indexOf('@');
      const slash = user.indexOf('\\');
      if (at > 0) {
        c.username = user.slice(0, at);
        c.domain = user.slice(at + 1);
      } else if (slash > 0) {
        c.domain = user.slice(0, slash);
        c.username = user.slice(slash + 1);
      }
      if (!c.domain) warnings.push('NTLM authentication needs a domain; set one before connecting');
      break;
    }
    case 'sqlserver_ad_password':
    case 'sqlserver_mfa':
      c.azureAuthOptions = { azureAuthEnabled: true, azureAuthType: AzureAuthType.AccessToken };
      if (authModel === 'sqlserver_ad_password') {
        warnings.push('Active Directory password authentication is imported as Entra ID single sign-on');
      }
      break;
    case 'sqlserver_msi':
    case 'sqlserver_ad_integrated':
    case 'sqlserver_custom':
      warnings.push(`SQL Server authentication "${authModel.replace('sqlserver_', '')}" is not supported; imported with SQL Server authentication`);
      break;
  }
}

function applySsl(c: Partial<IConnection>, type: ConnectionType, handlers: Record<string, ResolvedHandler>, params: Record<string, string>, url: JdbcUrl | null, warnings: string[]) {
  const trueish = (v?: string) => ['true', 'yes', '1'].includes((v ?? '').toLowerCase());
  const certificateFiles = (p: Record<string, string>, legacy = false) => ({
    sslCaFile: p['ssl.ca.cert'] || (legacy ? p.rootCert : undefined) || undefined,
    sslCertFile: p['ssl.client.cert'] || (legacy ? p.clientCert : undefined) || undefined,
    sslKeyFile: p['ssl.client.key'] || (legacy ? p.clientKey : undefined) || undefined,
  });
  const checkHandler = (handler: ResolvedHandler) => {
    if (handler.properties['ssl.method'] === 'KEYSTORE' || handler.properties['ssl.keystore']) {
      warnings.push('SSL key stores are not supported; configure certificate files instead');
    }
    if (Object.keys(handler.secrets).some((k) => k.startsWith('ssl.') && k.endsWith('.value'))) {
      warnings.push('SSL certificates stored inside DBeaver are not imported; point to certificate files instead');
    }
  };

  if (POSTGRES_FAMILY.includes(type)) {
    const handler = handlers.postgre_ssl;
    if (handler) {
      checkHandler(handler);
      const p = handler.properties;
      const mode = (p.sslMode || '').toLowerCase();
      Object.assign(c, certificateFiles(p, !p['ssl.method']));
      c.ssl = mode !== 'disable';
      c.sslRejectUnauthorized = mode ? ['verify-ca', 'verify-full'].includes(mode) : !!c.sslCaFile;
      if ((p.sslFactory || '').includes('NonValidatingFactory')) c.sslRejectUnauthorized = false;
    } else {
      const mode = (params.sslmode || '').toLowerCase();
      if (['require', 'verify-ca', 'verify-full'].includes(mode) || (trueish(params.ssl) && mode !== 'disable')) {
        c.ssl = true;
        c.sslCaFile = params.sslrootcert || undefined;
        c.sslCertFile = params.sslcert || undefined;
        c.sslKeyFile = params.sslkey || undefined;
        c.sslRejectUnauthorized = ['verify-ca', 'verify-full'].includes(mode);
      }
    }
  } else if (MYSQL_FAMILY.includes(type)) {
    const handler = handlers.mysql_ssl;
    if (handler) {
      checkHandler(handler);
      Object.assign(c, certificateFiles(handler.properties));
      c.ssl = true;
      c.sslRejectUnauthorized = trueish(handler.properties['ssl.verify.server']);
    } else {
      // Connector/J (sslMode=REQUIRED|VERIFY_CA|VERIFY_IDENTITY) and MariaDB (sslMode=trust|verify-ca|verify-full)
      const mode = (params.sslmode || '').toLowerCase().replace('_', '-');
      const verify = ['verify-ca', 'verify-identity', 'verify-full'].includes(mode) || trueish(params.verifyservercertificate);
      if (verify || ['required', 'trust'].includes(mode) || trueish(params.usessl) || trueish(params.requiressl)) {
        c.ssl = true;
        c.sslRejectUnauthorized = verify;
      }
    }
  } else if (type === 'clickhouse') {
    const handler = handlers['clickhouse-ssl'];
    if (handler) {
      checkHandler(handler);
      Object.assign(c, certificateFiles(handler.properties));
      c.ssl = true;
      c.sslRejectUnauthorized = (handler.properties['ssl.mode'] || 'strict').toLowerCase() !== 'none';
    } else if (trueish(params.ssl) || url?.protocol.endsWith(':https')) {
      c.ssl = true;
    }
  } else if (type === 'trino') {
    if (trueish(params.ssl)) c.ssl = true;
  }
}

function applySsh(c: Partial<IConnection>, ssh: ResolvedHandler, warnings: string[]) {
  const p = ssh.properties;
  c.sshEnabled = true;
  c.sshHost = p.host;
  c.sshPort = toPort(p.port) ?? 22;
  c.sshUsername = ssh.user;
  const mode = sshMode(p.authType);
  c.sshMode = mode;
  if (mode === 'keyfile') {
    c.sshKeyfile = p.keyPath || undefined;
    c.sshKeyfilePassword = ssh.password;
    if (!p.keyPath && ssh.secrets.keyValue) {
      warnings.push('The SSH private key is stored inside DBeaver rather than in a file; set a key file after importing');
    }
  } else if (mode === 'userpass') {
    c.sshPassword = ssh.password;
  }
  const keepAliveMs = Number(p.aliveInterval);
  if (keepAliveMs > 0) {
    c.sshKeepaliveInterval = Math.max(1, Math.round(keepAliveMs / 1000));
  }
  // the tunnel can point somewhere other than the connection's host
  if (p.remoteHost) c.host = p.remoteHost;
  if (toPort(p.remotePort)) c.port = toPort(p.remotePort);

  // Jump hosts (DBeaver 23.1+) sit in front of the SSH host, which is what a Beekeeper bastion does.
  const declared = Number.parseInt(p['jumpServer.count'], 10);
  const count = Math.min(Number.isNaN(declared) ? JUMP_SERVER_LIMIT : declared, JUMP_SERVER_LIMIT);
  const jumps: string[] = [];
  for (let i = 0; i < count && p[`jumpServer${i}.enabled`] === 'true'; i++) {
    jumps.push(`jumpServer${i}.`);
  }
  if (jumps.length === 0) return;
  const jump = jumps[0];
  const jumpMode = sshMode(p[`${jump}authType`]);
  const jumpPassword = ssh.secrets[`${jump}password`] || undefined;
  c.sshBastionHost = p[`${jump}host`];
  c.sshBastionHostPort = toPort(p[`${jump}port`]) ?? 22;
  c.sshBastionUsername = p[`${jump}name`] || undefined;
  c.sshBastionMode = jumpMode;
  if (jumpMode === 'keyfile') {
    c.sshBastionKeyfile = p[`${jump}keyPath`] || undefined;
    c.sshBastionKeyfilePassword = jumpPassword;
  } else if (jumpMode === 'userpass') {
    c.sshBastionPassword = jumpPassword;
  }
  if (jumps.length > 1) {
    warnings.push(`Only the first of ${jumps.length} SSH jump hosts is imported`);
  }
}

function sshMode(authType?: string): SshMode {
  switch ((authType || 'PASSWORD').toUpperCase()) {
    case 'PUBLIC_KEY': return 'keyfile';
    case 'AGENT': return 'agent';
    default: return 'userpass';
  }
}

function checkAuthModel(authModel: string, type: ConnectionType, auth: Record<string, string>, warnings: string[]) {
  if (type === 'oracle' && auth['oracle.logon-as']) {
    warnings.push(`Logging in as ${auth['oracle.logon-as'].toUpperCase()} is not supported; imported as a normal login`);
  }
  if (PLAIN_AUTH_MODELS.has(authModel) || authModel.startsWith('sqlserver_')) return;
  switch (authModel) {
    case 'postgres_pgpass':
      warnings.push('DBeaver reads this password from a pgpass file, so no password is imported');
      break;
    case 'shell_command':
      warnings.push('DBeaver gets this password from a shell command, so no password is imported');
      break;
    case 'oracle_os':
      warnings.push('Oracle OS authentication is not supported; imported with username and password authentication');
      break;
    default:
      warnings.push(`Authentication method "${authModel}" is not supported; imported with username and password authentication`);
  }
}

// Enabled network handlers (SSH, SSL, proxy), with their saved secrets. A network
// profile's handlers replace the connection's own, as DataSourceDescriptor does on connect.
function resolveHandlers(id: string, cfg: DBeaverConnectionConfig, ctx: MappingContext, warnings: string[]): Record<string, ResolvedHandler> {
  const handlers: Record<string, ResolvedHandler> = {};
  const secure = ctx.storage.credentials[id] ?? {};
  for (const [handlerId, handler] of Object.entries(cfg.handlers ?? {})) {
    if (handler?.enabled) {
      handlers[handlerId] = resolveHandler(handler, secure[`network/${handlerId}`]);
    }
  }

  const profileName = cfg['config-profile'];
  if (profileName) {
    const profiles = ctx.defaultStorage.dataSources['network-profiles'] ?? {};
    const [profileId, profile] = Object.entries(profiles).find(([key, p]) => key === profileName || p?.name === profileName) ?? [];
    if (!profile) {
      warnings.push(`Network profile "${profileName}" is not in this project (it may be a global DBeaver profile), so its settings are not imported`);
    } else {
      const profileSecrets = ctx.defaultStorage.credentials[`profile:${profileId}`] ?? {};
      for (const [handlerId, handler] of Object.entries(profile.handlers ?? {})) {
        if (handler?.enabled) {
          handlers[handlerId] = resolveHandler(handler, profileSecrets[`network/${handlerId}/profile/${profile.name ?? profileId}`]);
        }
      }
    }
  }
  return handlers;
}

function resolveHandler(handler: DBeaverHandlerConfig, saved: Record<string, string> = {}): ResolvedHandler {
  const { user, password, ...secrets } = { ...handler.credentials, ...saved };
  return {
    properties: handler.properties ?? {},
    user: handler.user || user || undefined,
    // DBeaver drops a saved handler password unless the handler saves passwords
    password: handler.password || (handler['save-password'] ? password : undefined) || undefined,
    secrets,
  };
}

function labelColor(cfg: DBeaverConnectionConfig, ctx: MappingContext): string | undefined {
  const type = cfg.type;
  const rgb = cfg.color
    || (type && (ctx.defaultStorage.dataSources['connection-types']?.[type]?.color
      || ctx.storage.dataSources['connection-types']?.[type]?.color
      || BUILTIN_CONNECTION_TYPE_COLORS[type]));
  return rgb ? rgbToLabelColor(rgb) : undefined;
}

/** Nearest Beekeeper label color for a DBeaver `r,g,b` color, by hue. */
export function rgbToLabelColor(value: string): string | undefined {
  const rgb = value.split(',').map((v) => Number(v.trim()) / 255);
  if (rgb.length !== 3 || rgb.some((v) => !Number.isFinite(v))) return undefined;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta < 0.08) return 'default';

  let hue: number;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;

  if (hue < 20 || hue >= 345) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 70) return 'yellow';
  if (hue < 170) return 'green';
  if (hue < 260) return 'blue';
  if (hue < 290) return 'purple';
  return 'pink';
}

function toPort(value: unknown): number | undefined {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
}

function lowerKeys(obj?: Record<string, string>): Record<string, string> {
  return _.mapKeys(obj ?? {}, (_v, k) => k.toLowerCase());
}
