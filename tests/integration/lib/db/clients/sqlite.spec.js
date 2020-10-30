import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"
import tmp from 'tmp'

describe("Sqlite Tests", () => {
  let dbfile;
  let util

  beforeAll(async () => {
    dbfile = tmp.fileSync()
    
    const config = {
      client: 'sqlite',
    }
    util = new DBTestUtil(config, dbfile.name)
    util.expectedTables = 6
    await util.setupdb()

  })

  afterAll(async () => {
    if (util.connection) {
      await util.connection.disconnect()
    }
  })

  it("Should pass standard tests", async () => {
    await util.testdb()
  })
})