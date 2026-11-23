import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validate } from 'class-validator'
import { TestOrmConnection } from "@tests/lib/TestOrmConnection"
import { SavedConnection } from "@/common/appdb/models/saved_connection"


describe("Saved Connection", () => {

  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it("should let me save and retrieve", async () => {
    const conn = new SavedConnection()
    conn.connectionType = 'sqlite'
    conn.defaultDatabase = ':memory:'
    conn.name = "banana"
    await conn.save()
    const updatedAll = await SavedConnection.find()
    const updated = updatedAll[0]
    expect(updatedAll.length).toBe(1)
    expect(updated.id).not.toBeNull()
    expect(updated.name).toBe('banana')

  })

  it("should reject a connection with an empty-string name via class-validator", async () => {
    const conn = new SavedConnection()
    conn.connectionType = 'sqlite'
    conn.defaultDatabase = ':memory:'
    conn.name = ""
    const errors = await validate(conn)
    expect(errors.some(e => e.property === 'name')).toBe(true)
  })

  it("should reject a connection with no name via class-validator", async () => {
    const conn = new SavedConnection()
    conn.connectionType = 'sqlite'
    conn.defaultDatabase = ':memory:'
    const errors = await validate(conn)
    expect(errors.some(e => e.property === 'name')).toBe(true)
  })

  const urls = [
    { t: 'sqlite', p: '/a/b/c/database.sqlite3'},
    { t: 'sqlite', p: '/a/b/c/database.sqlite'},
    { t: 'sqlite', p: '~/a.db'},
    { t: 'sqlite', p: 'b.sqlite3'},
    { t: 'duckdb', p: '/a/b/c.duckdb'},
    { t: 'duckdb', p: '/a.ddb'},
    { t: 'duckdb', p: 'a.duckdb'},
  ]

  urls.forEach(({ t, p}) => {
    it(`Should resolve '${p}' as '${t}'`, () => {
      const c = new SavedConnection()
      c.parse(p)
      expect(c.connectionType).toBe(t)
    })
  })

  it("demonstrating new databases for each test", async () => {
    const count = await SavedConnection.count()
    expect(count).toBe(0)
  })

  it("should update itself from a url", () => {
    const testCases = {
      "one:123": {host: 'one', port: 123},
      "postgresql://host:123": {connectionType: 'postgresql', host: 'host', port: 123},
      "user:password@host:12345": {host: 'host', port: 12345, username: 'user', password: 'password'},
      "superduperhost.db": {defaultDatabase: 'superduperhost.db', connectionType: 'sqlite'},
      "some/path.sqlite3": {connectionType: 'sqlite', defaultDatabase: 'some/path.sqlite3'},
      "/Path/to file/with space.sqlite": { connectionType: 'sqlite', defaultDatabase: "/Path/to file/with space.sqlite"},
      "postgresql://database.db": {connectionType: 'postgresql', host: 'database.db'},
      "mysql://user:p+ssword@localhost/mydatabase": {
        connectionType: "mysql",
        username: "user",
        password: "p+ssword",
        host: "localhost",
        defaultDatabase: "mydatabase"
      },
      "mysql://user:p@ssword@localhost/mydatabase": {
        connectionType: "mysql",
        username: "user",
        password: "p@ssword",
        host: "localhost",
        defaultDatabase: "mydatabase"
      },
      "postgresql://matthew:pa+sword@free.1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dbks-tester-12345": {
        connectionType: "cockroachdb",
        username: "matthew",
        password: "pa+sword",
        host: "free.1.cockroachlabs.cloud",
        port: 26257,
        defaultDatabase: "defaultdb"
      },
      "postgresql://matthew:pa@sword@free.1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dbks-tester-12345": {
        connectionType: "cockroachdb",
        username: "matthew",
        password: "pa@sword",
        host: "free.1.cockroachlabs.cloud",
        port: 26257,
        defaultDatabase: "defaultdb"
      },
      "postgresql://matthew:jwt-token@free.1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dbks-tester-12345%20--crdb%3Ajwt_auth_enabled%3Dtrue": {
        connectionType: "cockroachdb",
        username: "matthew",
        password: "jwt-token",
        host: "free.1.cockroachlabs.cloud",
        port: 26257,
        defaultDatabase: "defaultdb",
        options: {
          connectionMethod: "manual",
          cluster: "bks-tester-12345",
          jwtAuthEnabled: true
        }
      },
      "postgresql://hector:jwt-token@crdb.example.test:26257/system?options=--crdb%3Ajwt_auth_enabled%3Dtrue": {
        connectionType: "cockroachdb",
        username: "hector",
        password: "jwt-token",
        host: "crdb.example.test",
        port: 26257,
        defaultDatabase: "system",
        options: {
          connectionMethod: "manual",
          cluster: undefined,
          jwtAuthEnabled: true
        }
      },
      "postgresql://user:p+ssword@default.cluster.redshift.amazonaws.com:5439/database": {
        connectionType: "redshift",
        username: "user",
        password: "p+ssword",
        host: "default.cluster.redshift.amazonaws.com",
        port: 5439,
        defaultDatabase: "database"
      },
      "postgresql://user:p@ssword@default.cluster.redshift.amazonaws.com:5439/database": {
        connectionType: "redshift",
        username: "user",
        password: "p@ssword",
        host: "default.cluster.redshift.amazonaws.com",
        port: 5439,
        defaultDatabase: "database"
      },
      "postgresql://user:pass%20word@localhost:5432/mydb": {
        connectionType: "postgresql",
        username: "user",
        password: "pass word",
        host: "localhost",
        port: 5432,
        defaultDatabase: "mydb"
      },
      "mysql://user%40name:p%40ss%3Aword@localhost/db": {
        connectionType: "mysql",
        username: "user@name",
        password: "p@ss:word",
        host: "localhost",
        defaultDatabase: "db"
      },
    }

    Object.keys(testCases).forEach(url => {
      const expected = testCases[url]
      const subject = new SavedConnection()
      subject.host = "anotherhost"
      subject.connectionType = "unknown"

      subject.parse(url)
      Object.keys(expected).forEach(key => {
        expect(subject[key]).toStrictEqual(expected[key])
      })
    })

  })
})

// parse() applies what the text states and nothing else. The form relies on this when a
// URL or host:port is pasted over a connection that already has credentials filled in.
describe("SavedConnection.parse keeps fields the text does not mention", () => {
  function existing() {
    const c = new SavedConnection()
    c.connectionType = "postgresql"
    c.host = "old.example.com"
    c.port = 6543
    c.username = "existing_user"
    c.password = "existing_password"
    c.defaultDatabase = "existing_db"
    return c
  }

  const keepsCredentials = [
    "db.example.com",
    "db.example.com:5433",
    "10.0.0.4:3307",
    "[::1]:5432",
    "postgres://db.example.com",
    "postgres://db.example.com:5433",
    "postgres://db.example.com:5433/app",
    "postgres://db.example.com/app?sslmode=require",
  ]

  keepsCredentials.forEach((text) => {
    it(`keeps the user and password for '${text}'`, () => {
      const c = existing()
      expect(c.parse(text)).toBe(true)
      expect(c.username).toBe("existing_user")
      expect(c.password).toBe("existing_password")
    })
  })

  it("replaces only the host for a bare host", () => {
    const c = existing()
    c.parse("db.example.com")
    expect(c.host).toBe("db.example.com")
    expect(c.port).toBe(6543)
    expect(c.defaultDatabase).toBe("existing_db")
  })

  it("replaces the host and port for host:port, keeping the database", () => {
    const c = existing()
    c.parse("db.example.com:5433")
    expect(c.host).toBe("db.example.com")
    expect(c.port).toBe(5433)
    expect(c.defaultDatabase).toBe("existing_db")
    expect(c.connectionType).toBe("postgresql")
  })

  it("replaces the user and keeps the password when only a user is given", () => {
    const c = existing()
    c.parse("postgres://bob@db.example.com")
    expect(c.username).toBe("bob")
    expect(c.password).toBe("existing_password")
  })

  it("replaces both when the text has both", () => {
    const c = existing()
    c.parse("postgres://bob:pw@db.example.com:5433/app")
    expect(c.username).toBe("bob")
    expect(c.password).toBe("pw")
    expect(c.host).toBe("db.example.com")
    expect(c.port).toBe(5433)
    expect(c.defaultDatabase).toBe("app")
  })

  it("leaves everything alone when the text cannot be parsed", () => {
    const c = existing()
    expect(c.parse("myserver\\SQL2019")).toBe(false)
    expect(c.host).toBe("old.example.com")
    expect(c.username).toBe("existing_user")
    expect(c.password).toBe("existing_password")
  })
})
