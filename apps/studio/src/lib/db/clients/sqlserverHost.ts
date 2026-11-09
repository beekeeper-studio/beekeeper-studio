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

export function parseSqlServerHost(raw: string): ParsedSqlServerHost {
  const value = (raw || '').trim()

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
