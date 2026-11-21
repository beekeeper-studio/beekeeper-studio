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

  // Each of these was reproduced in the running app via "Import from URL".
  describe("postgres / mysql url import edge cases", () => {
    const parse = (url) => {
      const c = new SavedConnection()
      expect(c.parse(url)).toBe(true)
      return c
    }

    it("keeps host, port and database when the url has no credentials", () => {
      const c = parse("postgres://localhost:15432/mydb")
      expect(c.host).toBe("localhost")
      expect(c.port).toBe(15432)
      expect(c.defaultDatabase).toBe("mydb")
    })

    it("parses an IPv6 host", () => {
      const c = parse("postgresql://postgres:example@[::1]:15432/postgres")
      expect(c.host).toBe("::1")
      expect(c.port).toBe(15432)
      expect(c.defaultDatabase).toBe("postgres")
    })

    it("does not treat an @ in a query parameter as the credentials separator", () => {
      const c = parse("postgresql://postgres:example@localhost:15432/postgres?application_name=me@work")
      expect(c.host).toBe("localhost")
      expect(c.port).toBe(15432)
      expect(c.username).toBe("postgres")
      expect(c.password).toBe("example")
      expect(c.defaultDatabase).toBe("postgres")
    })

    it("decodes a percent-encoded database name", () => {
      const pg = parse("postgresql://postgres:example@localhost:15432/my%20db")
      expect(pg.defaultDatabase).toBe("my db")
      const my = parse("mysql://root:example@localhost:3306/my%20db")
      expect(my.defaultDatabase).toBe("my db")
    })
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
