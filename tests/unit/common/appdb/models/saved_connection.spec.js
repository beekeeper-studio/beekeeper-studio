const { SavedConnection } = require("../../../../../src/common/appdb/models/saved_connection")



describe("Saved Connection", () => {
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