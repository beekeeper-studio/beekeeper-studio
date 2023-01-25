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
    util = new DBTestUtil(config, dbfile.name, { dialect: 'sqlite'})
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

  describe("Issue-1399 Regresstion Tests", () => {
    let row
    beforeAll( async() => {
      row = await prepareBug1399TestData(util)
    }, 3267)

    // All SQLite integer-type columns store & return BigInts not Numbers
    // so test an 18-digit BigInt stored in EACH type of integer column
    // doesn't get rounded down to a (15-significant-digit) Number on retrieval
    test("value inserted into INT column should ==== the value selected back out", async () => {
      await Bug1399TestInt(row)
    })
    test("value inserted into BIGINT column should ==== the value selected back out", async () => {
      await Bug1399TestBigInt(row)
    })
    test("value inserted into UNSIGNED BIGINT column should ==== the value selected back out", async () => {
      await Bug1399TestUnsignedBigInt(row)
    })
  })

  const Bug1399TestInt = (resultRow) => {
    expect( resultRow.test_int.toString()     ).toBe( BigInt( '326335020369620480' ).toString() )
  }
  const Bug1399TestBigInt = async (resultRow) => {
    expect( resultRow.test_bigint.toString()  ).toBe( BigInt( '326335020369620480' ).toString() )
  }
  const Bug1399TestUnsignedBigInt = async (resultRow) => {
    expect( resultRow.test_ubigint.toString() ).toBe( BigInt( '326335020369620480' ).toString() )
  }

  const prepareBug1399TestData = async function(util) {
    const drop = await util.connection.query('DROP TABLE IF EXISTS test_bug1399')
    await drop.execute()

    // create a test table that has various integer-type columns to detect the bug
    const create_sql = `
      CREATE TABLE test_bug1399 (
        id integer not null primary key autoincrement,
        test_int INT,
        test_bigint BIGINT,
        test_ubigint UNSIGNED BIG INT
      );
    `
    const create_query = await util.connection.query(create_sql)
    await create_query.execute()

    // and insert integers (with more than 15 significant digits) into them
    const insert_bigints_sql = `
      INSERT INTO test_bug1399 VALUES (
        null,
        326335020369620480,
        326335020369620480,
        326335020369620480
      );
    `
    const insert_bigints_query = await util.connection.query(insert_bigints_sql)
    await insert_bigints_query.execute()

    // then select those same big integers back out, and return the row
    const r = await util.connection.selectTop('test_bug1399')
    const result = r.result

    expect(result.length).toBe(1)
    return { ...result[0] }
  }
})
