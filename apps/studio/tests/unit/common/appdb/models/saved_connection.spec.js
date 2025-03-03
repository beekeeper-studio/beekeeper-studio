// eslint-disable-next-line
const { TestOrmConnection } = require("@tests/lib/TestOrmConnection")
const { SavedConnection } = require("../../../../../src/common/appdb/models/saved_connection")


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
