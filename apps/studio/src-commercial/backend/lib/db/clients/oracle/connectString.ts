// Builds the connect string for a "Manual Host and Port" Oracle connection. Pure, so the
// exact value handed to node-oracledb can be unit-tested without a live server.

export type OracleIdentifierType = 'serviceName' | 'sid'

export interface OracleConnectStringParts {
  host: string
  port: number | string
  ssl?: boolean
  // Stored in the connection's serviceName column for both identifier types.
  identifier?: string | null
  identifierType?: OracleIdentifierType | null
}

export function buildOracleConnectString(parts: OracleConnectStringParts): string {
  const isSid = parts.identifierType === 'sid'
  const identifier = (parts.identifier || '').trim()

  // Without this the string becomes `host:1521/null` and the listener answers with an
  // error about a service the user never typed.
  if (!identifier) {
    throw new Error(isSid ? 'SID is required' : 'Service Name is required')
  }

  if (isSid) {
    // Easy Connect reads `host:port/name` as a service name, so a SID needs a full
    // descriptor. Works in both thin and thick mode.
    const protocol = parts.ssl ? 'TCPS' : 'TCP'
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=${protocol})(HOST=${parts.host})(PORT=${parts.port}))` +
      `(CONNECT_DATA=(SID=${identifier})))`
  }

  const scheme = parts.ssl ? 'tcps://' : ''
  return `${scheme}${parts.host}:${parts.port}/${identifier}`
}
