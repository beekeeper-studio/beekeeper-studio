import { DBTestUtil } from "../../../../lib/db";
import { JsonExporter } from '../../../../../src/lib/export/formats/json'
import tmp from 'tmp'
import fs from 'fs'

describe("CSV Exporter", () => {
  let dbfile;
  let util

  beforeAll(async () => {
    dbfile = tmp.fileSync()

    const config = {
      client: 'sqlite',
    }
    util = new DBTestUtil(config, dbfile.name, { dialect: 'sqlite' })
    util.extraTables = 1
    await util.setupdb()
    // addresses has one entry
    await util.knex.schema.createTable("toexport", (t) => {
      t.string("name")
    })
    await util.knex("toexport").insert([
      { name: 'foo' },
      { name: 'bar' },
      { name: 'ba\nz' }
    ]);

  })

  afterAll(async () => {
    await util.disconnect()
  })

  it("should create a simple json export", async () => {
    const filename = tmp.tmpNameSync()
    const exporter = new JsonExporter(
      filename,
      util.connection,
      { name: 'toexport' },
      '',
      '',
      [],
      { deleteOnAbort: true, chunkSize: 1 },
      { prettyprint: false }
    )
    await exporter.exportToFile()
    const result = fs.readFileSync(filename, { encoding: 'utf-8' })
    const parsed = JSON.parse(result)

    // it parses as valid JSON, and each row contains the correct column names
    expect(parsed.length).toBe(3)
    expect(Object.keys(parsed[0])).toStrictEqual(['name'])
  })
})
