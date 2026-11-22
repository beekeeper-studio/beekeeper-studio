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
  // Set when the port was typed into the Host field SSMS-style (`host,1444`). It is an
  // explicit choice, so it wins over the Port field.
  port?: number
  // `(localdb)\Instance`: a per-user LocalDB instance, reachable over named pipes only.
  localDb?: boolean
}

// SSMS accepts these as "this machine". They reach the driver untranslated and die at DNS
// resolution (getaddrinfo ENOTFOUND .), so map them onto a name the resolver knows.
const LOCAL_MACHINE_ALIASES = ['.', '(local)']

const LOCALDB_HOST = '(localdb)'

// SSMS lets the protocol be forced with a prefix. TCP is the only protocol the drivers
// speak, so `tcp:` is simply dropped; the others are left in place to fail visibly.
const TCP_PREFIX = /^tcp:/i

// `host,port` and `host\instance,port`, the SSMS way to name a port.
const TRAILING_PORT = /^(.*),\s*(\d+)$/

export const SQL_SERVER_LOCALDB_UNSUPPORTED =
  'LocalDB instances are not supported: they accept named pipe connections only. ' +
  'Connect to a SQL Server instance that has TCP/IP enabled, such as localhost\\SQLEXPRESS.'

// Separates an SSMS-style `,port` suffix (and the `tcp:` prefix) from the rest of the value,
// which keeps its `\instance` part.
function splitPort(raw: string): { value: string, port?: number } {
  const value = (raw || '').trim().replace(TCP_PREFIX, '').trim()
  const match = value.match(TRAILING_PORT)
  if (match) {
    const port = Number(match[2])
    if (port > 0 && port <= 65535) return { value: match[1].trim(), port }
  }
  return { value }
}

// For the connection form: when the Host field holds `host,port`, returns the host and port
// to put in their own fields. Null when there is nothing to move.
export function sqlServerHostFieldSplit(raw: string): { host: string, port: number } | null {
  const { value, port } = splitPort(raw)
  if (port === undefined) return null
  // The Port field treats 1433 as "look the instance up", so `host\instance,1433` cannot be
  // expressed across the two fields. Left as typed; parseSqlServerHost honours it on connect.
  if (port === 1433 && value.includes('\\')) return null
  return { host: value, port }
}

export function parseSqlServerHost(raw: string): ParsedSqlServerHost {
  const split = splitPort(raw)
  const value = split.value
  const port = split.port

  // Split on the FIRST backslash: `host\a\b` has no valid reading other than instance
  // `a\b`, and letting it through unchanged produces a worse error than the driver's.
  const separator = value.indexOf('\\')
  const rawHost = separator === -1 ? value : value.slice(0, separator)
  const rawInstance = separator === -1 ? '' : value.slice(separator + 1)

  const host = rawHost.trim()
  const instanceName = rawInstance.trim()
  const lowerHost = host.toLowerCase()

  const result: ParsedSqlServerHost = {
    host: LOCAL_MACHINE_ALIASES.includes(lowerHost) ? 'localhost' : host,
    instanceName: instanceName || undefined,
  }
  if (port !== undefined) result.port = port
  if (lowerHost === LOCALDB_HOST) result.localDb = true
  return result
}
