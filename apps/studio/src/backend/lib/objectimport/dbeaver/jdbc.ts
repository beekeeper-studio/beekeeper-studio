// Parses the JDBC URLs DBeaver stores for connections configured in "URL" mode.
// Covers the forms used by the drivers the importer maps: hierarchical URLs
// (postgresql, redshift, mysql, mariadb, clickhouse, trino, snowflake, ...),
// SQL Server's `;key=value` style, Oracle thin descriptors, and file URLs.

export interface JdbcUrl {
  /** Everything between `jdbc:` and `//` (or the first `:` for opaque URLs), e.g. `postgresql`, `mysql:loadbalance`, `jtds:sqlserver` */
  protocol: string
  host?: string
  port?: number
  /** Additional `host[:port]` entries of a multi-host URL are dropped */
  multipleHosts?: boolean
  /** First path segment: the database (or catalog, for Trino) */
  database?: string
  /** The full path after the host, without the leading `/` (Firebird database paths) */
  path?: string
  /** For opaque URLs (`sqlite:<file>`, `dbeaver:libsql:<url>`), everything after the protocol */
  opaque?: string
  /** Query string and `;key=value` properties. Keys are lower-cased. */
  params: Record<string, string>
  user?: string
  password?: string
}

const OPAQUE_PROTOCOLS = ['sqlite', 'duckdb', 'dbeaver:libsql'];

export function parseJdbcUrl(url: string): JdbcUrl | null {
  let rest = url?.trim();
  if (!rest) return null;
  if (rest.toLowerCase().startsWith('jdbc:')) rest = rest.slice(5);

  const opaque = OPAQUE_PROTOCOLS.find((p) => rest.toLowerCase().startsWith(`${p}:`));
  if (opaque) {
    return parseOpaque(opaque, rest.slice(opaque.length + 1));
  }
  if (rest.toLowerCase().startsWith('oracle:')) {
    return parseOracleUrl(rest);
  }

  const schemeEnd = rest.indexOf('://');
  if (schemeEnd < 0) {
    // e.g. jdbc:postgresql:mydb (localhost) or Jaybird's legacy firebirdsql:host/port:path
    return parseSchemeless(rest);
  }
  const protocol = rest.slice(0, schemeEnd).toLowerCase();
  // BigQuery nests the API endpoint URL and then appends ;key=value properties
  if (protocol === 'bigquery') {
    return { protocol, params: parseProperties(rest.slice(schemeEnd + 3)) };
  }
  return { protocol, ...parseHierarchical(rest.slice(schemeEnd + 3)) };
}

function parseHierarchical(rest: string): Omit<JdbcUrl, 'protocol'> {
  const params: Record<string, string> = {};

  // query string and ;properties can both appear (SQL Server uses only ;)
  const queryStart = rest.indexOf('?');
  if (queryStart >= 0) {
    Object.assign(params, parseQuery(rest.slice(queryStart + 1)));
    rest = rest.slice(0, queryStart);
  }
  const propsStart = rest.indexOf(';');
  if (propsStart >= 0) {
    Object.assign(params, parseProperties(rest.slice(propsStart + 1)));
    rest = rest.slice(0, propsStart);
  }

  const slash = rest.indexOf('/');
  let authority = slash >= 0 ? rest.slice(0, slash) : rest;
  const path = slash >= 0 ? rest.slice(slash + 1) : undefined;

  const result: Omit<JdbcUrl, 'protocol'> = { params };
  const at = authority.lastIndexOf('@');
  if (at >= 0) {
    const [user, ...password] = authority.slice(0, at).split(':');
    result.user = safeDecode(user);
    if (password.length) result.password = safeDecode(password.join(':'));
    authority = authority.slice(at + 1);
  }

  const hosts = authority.split(',').filter((h) => h.length > 0);
  if (hosts.length > 0) {
    Object.assign(result, parseHostPort(hosts[0]));
    if (hosts.length > 1) result.multipleHosts = true;
  }
  if (path) {
    result.path = safeDecode(path);
    const database = path.split('/')[0];
    if (database) result.database = safeDecode(database);
  }
  return result;
}

function parseSchemeless(rest: string): JdbcUrl | null {
  const colon = rest.indexOf(':');
  if (colon < 0) return null;
  const protocol = rest.slice(0, colon).toLowerCase();
  const target = rest.slice(colon + 1);
  if (protocol.startsWith('firebird')) {
    // firebirdsql:host[/port]:path
    const match = target.match(/^([^/:]+)(?:\/(\d+))?:(.+)$/);
    if (match) {
      return { protocol, host: match[1], port: match[2] ? Number(match[2]) : undefined, path: match[3], database: match[3], params: {} };
    }
    return { protocol, path: target, database: target, params: {} };
  }
  // postgresql:database
  const [database, query] = target.split('?');
  return { protocol, database: database || undefined, params: query ? parseQuery(query) : {} };
}

function parseOpaque(protocol: string, target: string): JdbcUrl {
  if (protocol === 'dbeaver:libsql') {
    return { protocol, opaque: target, params: {} };
  }
  // sqlite:/path/to/db, sqlite:file:/path?mode=ro, duckdb: (in-memory)
  let file = target;
  const query = file.indexOf('?');
  const params = query >= 0 ? parseQuery(file.slice(query + 1)) : {};
  if (query >= 0) file = file.slice(0, query);
  if (file.startsWith('file:')) file = file.slice(5);
  return { protocol, opaque: file, path: file, params };
}

export interface OracleConnectTarget {
  kind: 'service' | 'sid' | 'descriptor' | 'alias'
  host?: string
  port?: number
  /** service name, SID or TNS alias */
  name?: string
  /** the full connect descriptor, for `descriptor` */
  descriptor?: string
  ssl: boolean
}

// jdbc:oracle:thin:[user/password]@<target>
function parseOracleUrl(rest: string): JdbcUrl | null {
  const at = rest.indexOf('@');
  if (at < 0) return null;
  const head = rest.slice(0, at);
  const target = rest.slice(at + 1);
  // head is oracle:<thin|oci>:[user/password]
  const [protocol, credentials] = splitOnce(head, head.indexOf(':', 'oracle:'.length));
  const result: JdbcUrl = { protocol: protocol.toLowerCase(), opaque: target, params: {} };
  if (credentials) {
    const [user, password] = credentials.split('/');
    if (user) result.user = user;
    if (password) result.password = password;
  }
  const parsed = parseOracleConnectTarget(target);
  if (parsed.host) result.host = parsed.host;
  if (parsed.port) result.port = parsed.port;
  if (parsed.name) result.database = parsed.name;
  return result;
}

export function parseOracleConnectTarget(target: string): OracleConnectTarget {
  const trimmed = target.trim();
  if (trimmed.startsWith('(')) {
    return { kind: 'descriptor', descriptor: trimmed, ssl: /\(\s*PROTOCOL\s*=\s*TCPS\s*\)/i.test(trimmed) };
  }
  let rest = trimmed;
  let ssl = false;
  const scheme = rest.match(/^(tcps?):\/\//i);
  if (scheme) {
    ssl = scheme[1].toLowerCase() === 'tcps';
    rest = rest.slice(scheme[0].length);
  }
  rest = rest.replace(/^\/\//, '');
  // strip EZConnect ?parameters
  rest = rest.split('?')[0];

  // host:port:SID (old thin syntax)
  const sid = rest.match(/^([^:/]+):(\d+):([^:/]+)$/);
  if (sid) {
    return { kind: 'sid', host: sid[1], port: Number(sid[2]), name: sid[3], ssl };
  }
  // host[:port]/service[:server][/instance]
  const service = rest.match(/^([^:/]+)(?::(\d+))?\/([^:/]+)/);
  if (service) {
    return { kind: 'service', host: service[1], port: service[2] ? Number(service[2]) : undefined, name: service[3], ssl };
  }
  return { kind: 'alias', name: rest, ssl };
}

function parseHostPort(value: string): { host?: string, port?: number } {
  // [ipv6]:port
  const bracketed = value.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracketed) {
    return { host: bracketed[1], port: bracketed[2] ? Number(bracketed[2]) : undefined };
  }
  const colon = value.lastIndexOf(':');
  if (colon >= 0 && /^\d+$/.test(value.slice(colon + 1))) {
    return { host: value.slice(0, colon) || undefined, port: Number(value.slice(colon + 1)) };
  }
  return { host: value || undefined };
}

function parseQuery(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [key, value] = splitOnce(pair, pair.indexOf('='));
    params[safeDecode(key).toLowerCase()] = safeDecode(value ?? '');
  }
  return params;
}

function parseProperties(props: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of props.split(';')) {
    const [key, value] = splitOnce(pair, pair.indexOf('='));
    // segments without '=' aren't properties (e.g. BigQuery's endpoint URL)
    if (value !== undefined && key.trim()) params[key.trim().toLowerCase()] = value.trim();
  }
  return params;
}

function splitOnce(value: string, index: number): [string, string | undefined] {
  return index < 0 ? [value, undefined] : [value.slice(0, index), value.slice(index + 1)];
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
