import { SavedConnection } from '../../../../../src/common/appdb/models/saved_connection'

describe("CockroachDB", () => {

  it("Should parse a cockroach cloud connection url", () => {
    const config = new SavedConnection()
    const url = "postgresql://matthew:password@free.1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dbks-tester-12345"
    config.parse(url)
    expect(config.options.cluster).toBe("bks-tester-12345")
    expect(config.connectionType).toBe('cockroachdb')
  })

})
