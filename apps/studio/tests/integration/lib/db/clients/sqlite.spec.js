import { DBTestUtil } from "../../../../lib/db";
import { writeFileSync } from "fs";
import tmp from "tmp";
import { runCommonTests, runReadOnlyTests } from "./all";
import knex from "knex";
import Client_BetterSQLite3 from "knex/lib/dialects/better-sqlite3";

const TEST_VERSIONS = [
  { mode: "memory", readOnly: false },
  { mode: "file", readOnly: false },
  { mode: "file", readOnly: true },
];

function testWith(options) {
  describe(`SQLite [${options.mode}] - read-only mode? ${options.readOnly}`, () => {
    let dbfile;
    /** @type {DBTestUtil} */
    let util

    beforeAll(async () => {
      let dbName;
      if (options.mode === "file") {
        dbfile = tmp.fileSync();
        dbName = dbfile.name;
      } else {
        dbName = "";
      }

      const config = {
        client: 'sqlite',
        readOnlyMode: options.readOnly,
      }
      util = new DBTestUtil(config, dbName, {
        dialect: "sqlite",
        knex: knex({
          client: options.mode !== "memory"
            ? "better-sqlite3"
            : class extends Client_BetterSQLite3 {
              acquireRawConnection() {
                // We want to use the same connection when opening
                // in-memory database
                return util.connection._rawConnection
              }
            },
          connection: {
            filename: dbName,
          },
        }),
      })
      util.extraTables = 1
      await util.setupdb()

      await util.knex.schema.createTable('withbooleans', (table) => {
        table.integer('id').primary()
        table.specificType('flag', 'boolean')
      })
      await util.knex('withbooleans').insert([
        { id: 1, flag: 1 },
        { id: 2, flag: 0 },
        { id: 3, flag: 0 },
      ])
      const dotTableCreator = "CREATE TABLE `foo.bar`(id integer, name varchar(255))"
      const dotInsert = "INSERT INTO `foo.bar`(id, name) values(1, 'Dot McDot')"

      await util.knex.schema.raw(dotTableCreator);
      await util.knex.schema.raw(dotInsert);
    })

    afterAll(async () => {
      await util.disconnect()
      if (dbfile) {
        dbfile.removeCallback();
      }
    })

    describe("Common Tests", () => {
      if (options.readOnly) {
        runReadOnlyTests(() => util)
      } else {
        runCommonTests(() => util)
      }
    })

    it("Should work properly with tables that have dots in them", async () => {
      const keys = await util.connection.getPrimaryKeys("foo.bar")
      expect(keys).toMatchObject([])
      const r = await util.connection.selectTop("foo.bar", 0, 10, [{ field: 'id', dir: 'ASC' }])
      const result = r.result.map((r) => r.name || r.NAME)
      expect(result).toMatchObject(['Dot McDot'])
      const tcRes = await util.connection.getTableCreateScript("foo.bar")
      expect(tcRes).not.toBeNull()
      // shouldn't error
      await util.connection.getTableReferences("foo.bar")
    })

    if (!options.readOnly) {
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

      it("Should apply changes to boolean values correctly", async () => {
        function n(value) {
          if (options.mode === 'memory') {
            return BigInt(value)
          } else {
            return value
          }
        }
        const updates = [
          { id: n(1), expect: false, toBe: n(0) },
          { id: n(2), expect: true, toBe: n(1) },
          { id: n(3), expect: null, toBe: null },
        ]

        const inserts = [
          { id: n(4), expect: false, toBe: n(0) },
          { id: n(5), expect: true, toBe: n(1) },
          { id: n(6), expect: null, toBe: null },
        ]

        await expect(util.connection.applyChanges({
            inserts: inserts.map(({ id, expect }) => ({
              table: 'withbooleans',
              data: [{ id, flag: expect }],
            })),
            updates: updates.map(({ id, expect }) => ({
              table: 'withbooleans',
              column: 'flag',
              primaryKeys: [{ column: 'id', value: id }],
              value: expect,
            })),
          })
        ).resolves.toBeTruthy();

        const results = await util.knex
          .select()
          .table('withbooleans')
          .orderBy('id')

        expect(results).toEqual([
          ...updates.map(({ id, toBe }) => ({ id, flag: toBe })),
          ...inserts.map(({ id, toBe }) => ({ id, flag: toBe })),
        ])
      });

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
    }
  })
}

TEST_VERSIONS.forEach(testWith)

describe('SQLite - invalid db file', () => {
  /** @type {tmp.FileResult} */
  let dbfile
  let dbName
  /** @type {DBTestUtil} */
  let util

  beforeAll(() => {
    dbfile = tmp.fileSync()
    dbName = dbfile.name
    writeFileSync(dbfile.name, "some data to make it invalid sqlite file", "utf8")

    util = new DBTestUtil({
      client: 'sqlite',
    },
    dbName,
    {
      dialect: "sqlite",
      knex: knex({
        client: "better-sqlite3",
        connection: {
          filename: dbName,
        },
      }),
    })
  })

  afterAll(async () => {
    await util?.disconnect()
    dbfile?.removeCallback()
  })

  test('should throw error on connecting', () => {
    expect.assertions(1)
    return expect(util.connection.connect()).rejects.toHaveProperty('message', 'file is not a database')
  })
})
