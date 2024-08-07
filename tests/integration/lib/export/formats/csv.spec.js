import { DBTestUtil } from "../../../../lib/db";
import { CsvExporter } from '../../../../../src/lib/export/formats/csv'
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
    await util.knex.schema.createTable("toexport", (t)=> {
      t.string("name")
    })
    await util.knex("toexport").insert([
      { name: 'foo'},
      { name: 'bar'},
      { name: 'ba\nz'}
    ]);

  })

  afterAll(async () => {
    await util.disconnect()
  })

  it("should create a simple csv export", async () => {
    const filename = tmp.tmpNameSync()
    const exporter = new CsvExporter(
      filename,
      util.connection,
      { name: 'toexport'},
      '',
      '',
      [],
      { deleteOnAbort: true, chunkSize: 1},
      { header: true, delimiter: ','}
    )
    await exporter.exportToFile()
    const result = fs.readFileSync(filename, { encoding: 'utf-8'})
    expect(result).toEqual('name\nfoo\nbar\n"ba\nz"\n')
  })
})
