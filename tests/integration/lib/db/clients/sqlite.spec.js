import { DBTestUtil } from '../../../../lib/db'
import tmp from 'tmp'
import { itShouldInsertGoodData, itShouldNotInsertBadData, itShouldApplyAllTypesOfChanges, itShouldNotCommitOnChangeError, runCommonTests } from './all'

describe("Sqlite Tests", () => {
  let dbfile;
  let util

  beforeAll(async () => {
    dbfile = tmp.fileSync()
    
    const config = {
      client: 'sqlite',
    }
    util = new DBTestUtil(config, dbfile.name)
    util.extraTables = 1
    await util.setupdb()

  })

  afterAll(async () => {
    if (util.connection) {
      await util.connection.disconnect()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  it("Should allow me to create a trigger", async () => {
    const trigger = `
     CREATE TRIGGER sqlmods
         AFTER UPDATE
            ON addresses
      FOR EACH ROW
          WHEN old.state IS NULL
      BEGIN
          UPDATE addresses
            SET state = 'NY'
          WHERE rowid = NEW.rowid;
      END; 
    `
    expect(async () => {
      const q = await util.connection.query(trigger)
      await q.execute()
    }).not.toThrowError()
  })

})