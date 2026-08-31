import { SqlServerEncryptionMode } from '@/lib/db/types'

// Pure helpers for building the msnodesqlv8 (ODBC) connection string used by SQL Server
// integrated (Kerberos/Windows) authentication. Extracted so the exact clauses passed to the
// driver can be unit-tested without a live server -- see tests/unit.

export interface WindowsAuthConnStrOptions {
  driver: string
  encryptionMode?: SqlServerEncryptionMode
  serverCertificate?: string
  serverSpn?: string
}

// Set a connection-string clause, replacing it in place or appending it when mssql's generated
// string omits it -- so the discovered driver / Trusted_Connection / Encrypt are never silently
// dropped.
export function setConnStrClause(connStr: string, key: string, value: string): string {
  const re = new RegExp(`${key}=[^;]*`, 'i')
  return re.test(connStr)
    ? connStr.replace(re, `${key}=${value}`)
    : `${connStr.replace(/;?\s*$/, '')};${key}=${value}`
}

// Patch the connection string for integrated auth: pin the discovered ODBC driver, force
// Trusted_Connection, translate the encryption mode into Encrypt / TrustServerCertificate /
// ServerCertificate clauses, and apply an optional SPN override. Set explicitly so behaviour is
// deterministic regardless of driver defaults:
//   off    -> no encryption
//   on     -> encrypt, trust the cert (no validation; works for self-signed)
//   strict -> TDS 8.0 encrypt + validate; pin ServerCertificate when provided (requires Driver 18)
export function buildWindowsAuthConnStr(connStr: string, opts: WindowsAuthConnStrOptions): string {
  let s = setConnStrClause(connStr, 'Driver', `{${opts.driver}}`)
  s = setConnStrClause(s, 'Trusted_Connection', 'yes')

  const mode = opts.encryptionMode || 'on'
  if (mode === 'strict') {
    s = setConnStrClause(s, 'Encrypt', 'strict')
    if (opts.serverCertificate) s = setConnStrClause(s, 'ServerCertificate', opts.serverCertificate)
  } else if (mode === 'on') {
    s = setConnStrClause(s, 'Encrypt', 'yes')
    s = setConnStrClause(s, 'TrustServerCertificate', 'yes')
  } else {
    s = setConnStrClause(s, 'Encrypt', 'no')
  }

  if (opts.serverSpn) s = setConnStrClause(s, 'ServerSPN', opts.serverSpn)
  return s
}
