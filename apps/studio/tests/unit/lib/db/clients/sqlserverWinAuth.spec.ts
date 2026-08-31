import { buildWindowsAuthConnStr, setConnStrClause } from '@/lib/db/clients/sqlserverWinAuth'

// Verifies the exact clauses passed to the msnodesqlv8 (ODBC) driver for SQL Server
// integrated (Kerberos/Windows) auth, without needing a live server. The integration suite
// (sqlserver-kerberos.spec.ts) proves the end-to-end behaviour; this pins the conn-string
// mapping so a regression in driver inputs is caught in the fast unit run.

// A representative base string as emitted by mssql/msnodesqlv8 before patching.
const BASE = 'Driver={ODBC Driver 17 for SQL Server};Server=db.example.com,1433;Database=master;Trusted_Connection=false'
const DRIVER = 'ODBC Driver 18 for SQL Server'

describe('buildWindowsAuthConnStr', () => {
  it('always pins the discovered driver and forces Trusted_Connection=yes', () => {
    const s = buildWindowsAuthConnStr(BASE, { driver: DRIVER })
    expect(s).toContain(`Driver={${DRIVER}}`)
    expect(s).toMatch(/Trusted_Connection=yes/i)
    expect(s).not.toMatch(/Trusted_Connection=false/i)
  })

  it("encryptionMode 'on' encrypts and trusts the certificate", () => {
    const s = buildWindowsAuthConnStr(BASE, { driver: DRIVER, encryptionMode: 'on' })
    expect(s).toContain('Encrypt=yes')
    expect(s).toContain('TrustServerCertificate=yes')
    expect(s).not.toContain('Encrypt=no')
    expect(s).not.toContain('Encrypt=strict')
  })

  it("defaults to 'on' when no encryptionMode is given", () => {
    const s = buildWindowsAuthConnStr(BASE, { driver: DRIVER })
    expect(s).toContain('Encrypt=yes')
    expect(s).toContain('TrustServerCertificate=yes')
  })

  it("encryptionMode 'off' disables encryption and does not trust/validate", () => {
    const s = buildWindowsAuthConnStr(BASE, { driver: DRIVER, encryptionMode: 'off' })
    expect(s).toContain('Encrypt=no')
    expect(s).not.toContain('Encrypt=yes')
    expect(s).not.toContain('TrustServerCertificate')
    expect(s).not.toContain('ServerCertificate')
  })

  it("encryptionMode 'strict' requests strict and never trusts the certificate", () => {
    const s = buildWindowsAuthConnStr(BASE, { driver: DRIVER, encryptionMode: 'strict' })
    expect(s).toContain('Encrypt=strict')
    expect(s).not.toContain('TrustServerCertificate')
    // No cert provided -> no ServerCertificate clause. Boundary-anchored so it doesn't
    // collide with the TrustServerCertificate substring.
    expect(s).not.toMatch(/(?:^|;)ServerCertificate=/)
  })

  it("encryptionMode 'strict' pins a ServerCertificate when provided", () => {
    const s = buildWindowsAuthConnStr(BASE, {
      driver: DRIVER,
      encryptionMode: 'strict',
      serverCertificate: '/etc/ssl/mssql.pem',
    })
    expect(s).toContain('Encrypt=strict')
    expect(s).toContain('ServerCertificate=/etc/ssl/mssql.pem')
  })

  it('only emits ServerCertificate in strict mode', () => {
    const onCert = buildWindowsAuthConnStr(BASE, {
      driver: DRIVER,
      encryptionMode: 'on',
      serverCertificate: '/etc/ssl/mssql.pem',
    })
    // Boundary-anchored: 'on' mode emits TrustServerCertificate (which contains the
    // substring "ServerCertificate"), but must NOT emit a standalone ServerCertificate clause.
    expect(onCert).not.toMatch(/(?:^|;)ServerCertificate=/)
  })

  it('applies an explicit ServerSPN override when provided, and omits it otherwise', () => {
    const withSpn = buildWindowsAuthConnStr(BASE, {
      driver: DRIVER,
      serverSpn: 'MSSQLSvc/db.example.com:1433',
    })
    expect(withSpn).toContain('ServerSPN=MSSQLSvc/db.example.com:1433')

    const withoutSpn = buildWindowsAuthConnStr(BASE, { driver: DRIVER })
    expect(withoutSpn).not.toContain('ServerSPN')
  })
})

describe('setConnStrClause', () => {
  it('replaces an existing clause in place (case-insensitive key)', () => {
    expect(setConnStrClause('a=1;Encrypt=no;b=2', 'Encrypt', 'yes')).toBe('a=1;Encrypt=yes;b=2')
  })

  it('appends a missing clause', () => {
    expect(setConnStrClause('a=1', 'Encrypt', 'yes')).toBe('a=1;Encrypt=yes')
  })

  it('appends cleanly when the string has a trailing separator', () => {
    expect(setConnStrClause('a=1;', 'Encrypt', 'yes')).toBe('a=1;Encrypt=yes')
  })
})
