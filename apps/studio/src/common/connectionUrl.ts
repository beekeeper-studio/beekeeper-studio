import { ConnectionString } from 'connection-string'

// Reads a connection URL (or a bare `host:port`, or a SQLite/DuckDB file path) into the
// connection fields it names. Pure, so input/output can be unit-tested without the app
// database, and shared by SavedConnection.parse and pasting into the Host field.
//
// A key is present ONLY when the text states that value. Callers apply the keys that are
// there and leave everything else alone, so text with no user in it never clears a user.

export interface ParsedConnectionUrl {
  // The URL protocol as written (`postgres`, `mssql`, `https`, ...) or a detected type.
  // Not validated here: SavedConnection's connectionType setter maps and checks it.
  connectionType?: string
  host?: string
  port?: number
  username?: string
  password?: string
  defaultDatabase?: string
  ssl?: true
  trustServerCertificate?: true
  cockroach?: { cluster?: string, jwtAuthEnabled: boolean }
}

const FILE_ENDINGS = [
  { connectionType: 'sqlite', options: ['.db', '.sqlite', '.sqlite3'] },
  { connectionType: 'duckdb', options: ['.duckdb', '.ddb'] },
]

// Throws when the text cannot be read as a connection at all.
export function parseConnectionUrl(url: string): ParsedConnectionUrl {
  if (!url.includes('://')) {
    for (const { connectionType, options } of FILE_ENDINGS) {
      if (options.find((e) => url.endsWith(e))) {
        return { connectionType, defaultDatabase: url }
      }
    }
  }

  const result: ParsedConnectionUrl = {}

  // Credentials are cut out by hand: passwords routinely hold characters (`@`, `/`, `#`)
  // that a URL parser would read as structure.
  let cleanedUrl = url
  if (url.includes('@')) {
    const lastAtIndex = url.lastIndexOf('@')
    let firstDoubleSlash = url.indexOf('//') + 2
    if (firstDoubleSlash === 1) firstDoubleSlash = 0
    const credentials = url.substring(firstDoubleSlash, lastAtIndex)

    const [user, ...passwordParts] = credentials.split(':')
    if (user) result.username = decodeURIComponent(user)
    if (passwordParts.length > 0) result.password = decodeURIComponent(passwordParts.join(':'))

    cleanedUrl = url.substring(0, firstDoubleSlash) + url.substring(lastAtIndex + 1)
  }

  // encodeURI escapes the brackets of an IPv6 literal, which would leave a host of `[`.
  const encodedUrl = encodeURI(cleanedUrl).replace(/%5B/gi, '[').replace(/%5D/gi, ']')
  const parsed = new ConnectionString(encodedUrl)
  // Only read for its `options` param, and the step that rejects text that is not a
  // connection at all. When credentials were cut out above, the raw text still holds them
  // and a password containing `@`, `:` or `#` would be rejected: use the clean parse then.
  let parsedUncoded: ConnectionString
  try {
    parsedUncoded = new ConnectionString(url)
  } catch (ex) {
    if (cleanedUrl === url) throw ex
    parsedUncoded = parsed
  }

  if (parsed.protocol) result.connectionType = parsed.protocol
  if (parsed.hostname && parsed.hostname.includes('redshift.amazonaws.com')) {
    result.connectionType = 'redshift'
  }

  const cockroachOptions = parsedUncoded.params?.options || ''
  const hasCockroachJwtOption =
    /--crdb:jwt_auth_enabled=true/.test(cockroachOptions) ||
    /--crdb(?::|%3A)jwt_auth_enabled(?:=|%3D)true/i.test(url)
  const hasCockroachClusterOption =
    /--cluster=([A-Za-z0-9\-_]+)/.test(cockroachOptions) ||
    /--cluster(?:=|%3D)[A-Za-z0-9\-_]+/i.test(url)
  const hasCockroachProtocol = ['cockroach', 'cockroachdb'].includes(parsed.protocol as string)

  if ((parsed.hostname && parsed.hostname.includes('cockroachlabs.cloud')) || hasCockroachJwtOption || hasCockroachClusterOption || hasCockroachProtocol) {
    result.connectionType = 'cockroachdb'
    const clusterMatch = cockroachOptions.match(/--cluster=([A-Za-z0-9\-_]+)/)
    result.cockroach = {
      cluster: clusterMatch ? clusterMatch[1] : undefined,
      jwtAuthEnabled: hasCockroachJwtOption,
    }
  }

  if (parsed.params?.sslmode && parsed.params.sslmode !== 'disable') result.ssl = true
  if (cleanedUrl.startsWith('https://')) result.ssl = true

  if (parsed.params?.TrustServerCertificate && parsed.params.TrustServerCertificate === 'true') {
    result.trustServerCertificate = true
  }

  // Drivers take an IPv6 address without the URL brackets.
  if (parsed.hostname) result.host = parsed.hostname.replace(/^\[(.*)\]$/, '$1')
  if (parsed.port) result.port = parsed.port
  if (result.username === undefined && parsed.user) result.username = parsed.user
  if (result.password === undefined && parsed.password) result.password = parsed.password
  if (parsed.path) result.defaultDatabase = parsed.path.join('/')

  return result
}
