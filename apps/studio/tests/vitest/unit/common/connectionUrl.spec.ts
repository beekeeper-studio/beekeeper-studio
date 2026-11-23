import { describe, it, expect } from 'vitest'
import { parseConnectionUrl, ParsedConnectionUrl } from '@/common/connectionUrl'
import { looksLikeConnectionPaste } from '@/common/hostPaste'

// Pins the exact fields parseConnectionUrl returns for a given text. The rule under test:
// a key is present only when the text states that value, so applying the result can never
// clear a user, password, port or database the text did not mention.

const cases: { text: string, expected: ParsedConnectionUrl }[] = [
  // --- bare host and host:port: nothing but what was typed ---
  { text: 'db.example.com', expected: { host: 'db.example.com' } },
  { text: 'localhost', expected: { host: 'localhost' } },
  { text: '10.0.0.4', expected: { host: '10.0.0.4' } },
  { text: 'db.example.com:5433', expected: { host: 'db.example.com', port: 5433 } },
  { text: 'localhost:3306', expected: { host: 'localhost', port: 3306 } },
  { text: '10.0.0.4:3307', expected: { host: '10.0.0.4', port: 3307 } },
  { text: '[::1]:5432', expected: { host: '::1', port: 5432 } },
  { text: 'postgres://[2001:db8::1]:5433/app', expected: { connectionType: 'postgres', host: '2001:db8::1', port: 5433, defaultDatabase: 'app' } },
  { text: 'db.example.com:5433/app', expected: { host: 'db.example.com', port: 5433, defaultDatabase: 'app' } },
  { text: 'db.example.com/app', expected: { host: 'db.example.com', defaultDatabase: 'app' } },

  // --- URLs with no credentials ---
  { text: 'postgres://db.example.com', expected: { connectionType: 'postgres', host: 'db.example.com' } },
  { text: 'postgres://db.example.com:5433', expected: { connectionType: 'postgres', host: 'db.example.com', port: 5433 } },
  {
    text: 'postgresql://db.example.com:5433/app',
    expected: { connectionType: 'postgresql', host: 'db.example.com', port: 5433, defaultDatabase: 'app' },
  },
  { text: 'mysql://db.example.com/app', expected: { connectionType: 'mysql', host: 'db.example.com', defaultDatabase: 'app' } },
  { text: 'mssql://db.example.com:1444', expected: { connectionType: 'mssql', host: 'db.example.com', port: 1444 } },

  // --- credentials: user only, user and password, awkward passwords ---
  {
    text: 'postgres://bob@db.example.com:5433/app',
    expected: { connectionType: 'postgres', host: 'db.example.com', port: 5433, username: 'bob', defaultDatabase: 'app' },
  },
  {
    text: 'postgres://bob:pw@db.example.com:5433/app',
    expected: {
      connectionType: 'postgres', host: 'db.example.com', port: 5433,
      username: 'bob', password: 'pw', defaultDatabase: 'app',
    },
  },
  {
    text: 'postgres://bob:@db.example.com',
    expected: { connectionType: 'postgres', host: 'db.example.com', username: 'bob', password: '' },
  },
  {
    text: 'mysql://bob:p@ss:w0rd@db.example.com:3307/app',
    expected: {
      connectionType: 'mysql', host: 'db.example.com', port: 3307,
      username: 'bob', password: 'p@ss:w0rd', defaultDatabase: 'app',
    },
  },
  {
    text: 'postgres://bob%40corp:p%2Fw@db.example.com',
    expected: { connectionType: 'postgres', host: 'db.example.com', username: 'bob@corp', password: 'p/w' },
  },
  {
    text: 'mysql://bob:p#ss@db.example.com/app',
    expected: { connectionType: 'mysql', host: 'db.example.com', username: 'bob', password: 'p#ss', defaultDatabase: 'app' },
  },
  { text: 'bob@db.example.com', expected: { host: 'db.example.com', username: 'bob' } },
  {
    text: 'bob:pw@db.example.com:5433',
    expected: { host: 'db.example.com', port: 5433, username: 'bob', password: 'pw' },
  },

  // --- flags ---
  {
    text: 'postgres://db.example.com/app?sslmode=require',
    expected: { connectionType: 'postgres', host: 'db.example.com', defaultDatabase: 'app', ssl: true },
  },
  {
    text: 'postgres://db.example.com/app?sslmode=disable',
    expected: { connectionType: 'postgres', host: 'db.example.com', defaultDatabase: 'app' },
  },
  {
    text: 'mssql://db.example.com:1433/app?TrustServerCertificate=true',
    expected: {
      connectionType: 'mssql', host: 'db.example.com', port: 1433,
      defaultDatabase: 'app', trustServerCertificate: true,
    },
  },
  {
    text: 'mssql://db.example.com/app?TrustServerCertificate=false',
    expected: { connectionType: 'mssql', host: 'db.example.com', defaultDatabase: 'app' },
  },
  { text: 'https://db.example.com:8443', expected: { connectionType: 'https', host: 'db.example.com', port: 8443, ssl: true } },

  // --- detected types ---
  {
    text: 'postgres://cluster.abc.us-east-1.redshift.amazonaws.com:5439/dev',
    expected: {
      connectionType: 'redshift', host: 'cluster.abc.us-east-1.redshift.amazonaws.com',
      port: 5439, defaultDatabase: 'dev',
    },
  },
  {
    text: 'cockroachdb://db.example.com:26257/defaultdb',
    expected: {
      connectionType: 'cockroachdb', host: 'db.example.com', port: 26257, defaultDatabase: 'defaultdb',
      cockroach: { cluster: undefined, jwtAuthEnabled: false },
    },
  },

  // --- files ---
  { text: '/a/b/c/database.sqlite', expected: { connectionType: 'sqlite', defaultDatabase: '/a/b/c/database.sqlite' } },
  { text: '~/a.db', expected: { connectionType: 'sqlite', defaultDatabase: '~/a.db' } },
  { text: '/a/b/c.duckdb', expected: { connectionType: 'duckdb', defaultDatabase: '/a/b/c.duckdb' } },
]

describe('parseConnectionUrl', () => {
  cases.forEach(({ text, expected }) => {
    it(`reads '${text}'`, () => {
      // toStrictEqual: an extra key (say `username: undefined`) fails the test.
      expect(parseConnectionUrl(text)).toStrictEqual(expected)
    })
  })

  describe('never names a user or password the text does not contain', () => {
    const withoutCredentials = cases.filter(({ text }) => !text.includes('@'))

    it('covers a meaningful number of inputs', () => {
      expect(withoutCredentials.length).toBeGreaterThan(15)
    })

    withoutCredentials.forEach(({ text }) => {
      it(`'${text}' has no username or password key`, () => {
        const result = parseConnectionUrl(text)
        expect('username' in result).toBe(false)
        expect('password' in result).toBe(false)
      })
    })

    it('names a user but no password when only a user is given', () => {
      const result = parseConnectionUrl('postgres://bob@db.example.com')
      expect(result.username).toBe('bob')
      expect('password' in result).toBe(false)
    })

    it('does not name an empty user', () => {
      const result = parseConnectionUrl('postgres://@db.example.com')
      expect('username' in result).toBe(false)
      expect(result.host).toBe('db.example.com')
    })
  })

  it('omits the port and database when the text has none', () => {
    const result = parseConnectionUrl('postgres://bob:pw@db.example.com')
    expect('port' in result).toBe(false)
    expect('defaultDatabase' in result).toBe(false)
  })

  it('throws on text that is not a connection', () => {
    expect(() => parseConnectionUrl('myserver\\SQL2019')).toThrow()
  })
})

describe('looksLikeConnectionPaste', () => {
  const yes = [
    'db.example.com:5433', 'localhost:3306', '10.0.0.4:3307', '[::1]:5432', '  db.example.com:5433  ',
    'postgres://db.example.com', 'postgres://bob:pw@db.example.com:5433/app', 'bob@db.example.com',
  ]
  const no = [
    '', 'db.example.com', 'localhost', '10.0.0.4', '::1', 'fe80::1', 'myserver\\SQL2019', 'myserver,1444',
    'db.example.com:', 'db.example.com:abc', 'two words:5432', 'my server',
  ]

  yes.forEach((text) => it(`treats '${text}' as a connection`, () => {
    expect(looksLikeConnectionPaste(text)).toBe(true)
  }))
  no.forEach((text) => it(`leaves '${text}' to paste as plain text`, () => {
    expect(looksLikeConnectionPaste(text)).toBe(false)
  }))
})
