// Pure helpers for normalising what a user types into the SQL Server Host field.
// Extracted so the exact values handed to the driver can be unit-tested without a live
// server -- see tests/vitest/unit, and sqlserverWinAuth.ts for the same pattern.
//
// mssql splits `host\instance` itself and then throws the port away
// (lib/tedious/connection-pool.js), which forces a SQL Browser lookup. Parsing here keeps
// config.server free of backslashes so that split never runs and the client decides.

export interface ParsedSqlServerHost {
  host: string
  instanceName?: string
}

// SSMS accepts these as "this machine". They reach the driver untranslated and die at DNS
// resolution (getaddrinfo ENOTFOUND .), so map them onto a name the resolver knows.
const LOCAL_MACHINE_ALIASES = ['.', '(local)', '(localdb)']

// SSMS, sqlcmd and the Azure portal may prefix the protocol (`tcp:host`), which means nothing
// to tedious. It carries no information the form needs, so it is dropped like whitespace.
const PROTOCOL_PREFIX = /^tcp:/i

// Those tools also write the port after a comma (`host,1433`, `host\instance,1433`). The port
// belongs in the Port field and is NOT read from here when connecting: a pasted value is
// split into the two fields by the form (applySqlServerHostPaste), and a typed one fails with
// an error that says so (sqlServerHostPortHint).
const TRAILING_PORT = /^(.*),\s*(\d+)$/

export function parseSqlServerHost(raw: string): ParsedSqlServerHost {
  const value = (raw || '').trim().replace(PROTOCOL_PREFIX, '').trim()

  // Split on the FIRST backslash: `host\a\b` has no valid reading other than instance
  // `a\b`, and letting it through unchanged produces a worse error than the driver's.
  const separator = value.indexOf('\\')
  const rawHost = separator === -1 ? value : value.slice(0, separator)
  const rawInstance = separator === -1 ? '' : value.slice(separator + 1)

  const host = rawHost.trim()
  const instanceName = rawInstance.trim()

  return {
    host: LOCAL_MACHINE_ALIASES.includes(host.toLowerCase()) ? 'localhost' : host,
    instanceName: instanceName || undefined,
  }
}

export interface SqlServerHostPort {
  // The Host value with the protocol prefix and port removed; any `\instance` is kept.
  host: string
  port?: number
}

// Separates a trailing `,port` from a Host value. Anything outside the TCP range is not a
// port and is left in place.
export function splitSqlServerHostPort(raw: string): SqlServerHostPort {
  const value = (raw || '').trim().replace(PROTOCOL_PREFIX, '').trim()
  const withPort = TRAILING_PORT.exec(value)
  const port = withPort ? Number(withPort[2]) : NaN
  if (!withPort || !(port >= 1 && port <= 65535)) return { host: value }
  return { host: withPort[1].trim(), port }
}

// What the Host and Port fields should hold after `pasted` replaces the selection
// [selectionStart, selectionEnd) of `current`, or null when the result carries no port and
// the paste should go ahead untouched.
export function applySqlServerHostPaste(
  current: string,
  selectionStart: number,
  selectionEnd: number,
  pasted: string
): { host: string, port: number } | null {
  const before = (current || '').slice(0, selectionStart)
  const after = (current || '').slice(selectionEnd)
  const { host, port } = splitSqlServerHostPort(`${before}${pasted || ''}${after}`)
  return port === undefined ? null : { host, port }
}

// Shown when a connection fails and the Host field holds a port: the driver's own error is a
// DNS failure on `host,1433` (or a browser timeout for `host\instance,1433`) and never says why.
export function sqlServerHostPortHint(rawHost: string): string | null {
  const { host, port } = splitSqlServerHostPort(rawHost)
  if (port === undefined) return null
  return `The Host field contains a port ("${(rawHost || '').trim()}"). ` +
    `Enter ${host} as the Host and ${port} in the Port field.`
}
