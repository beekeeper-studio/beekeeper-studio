import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DBTestUtil } from '@tests/lib/db'
import { XlsxExporter } from '@/lib/export/formats/xlsx'
import { ExportStatus } from '@/lib/export/models'
import tmp from 'tmp'
import fs from 'fs'
import XLSX from 'xlsx'

function readSheet(filePath: string) {
  const workbook = XLSX.read(fs.readFileSync(filePath))
  const name = workbook.SheetNames[0]
  return {
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null }),
  }
}

class LimitedXlsxExporter extends XlsxExporter {
  protected async openOutput(): Promise<void> {
    await super.openOutput()
    // header + 2 rows, rather than writing a million rows to hit the real limit
    ;(this as any).writer.maxRows = 3
  }
}

describe('XLSX Exporter', () => {
  let dbfile: tmp.FileResult
  let util: DBTestUtil

  beforeAll(async () => {
    dbfile = tmp.fileSync()
    util = new DBTestUtil({ client: 'sqlite' } as any, dbfile.name, { dialect: 'sqlite' })
    util.extraTables = 1
    await util.setupdb()
    await util.knex.schema.createTable('toexport', (t) => {
      t.integer('id')
      t.string('name')
      t.float('amount')
    })
    await util.knex('toexport').insert([
      { id: 1, name: 'foo', amount: 1.5 },
      { id: 2, name: 'bar & <baz>', amount: null },
      { id: 3, name: 'multi\nline', amount: 3 },
    ])
  })

  afterAll(async () => {
    await util.disconnect()
  })

  function exporter(cls: typeof XlsxExporter, filePath: string, filters: any[] = []) {
    return new cls(
      filePath,
      util.connection,
      { name: 'toexport' } as any,
      '',
      '',
      filters,
      { deleteOnAbort: true, chunkSize: 1 },
      {}
    )
  }

  it('exports a table to a workbook', async () => {
    const filePath = tmp.tmpNameSync({ postfix: '.xlsx' })
    const exp = exporter(XlsxExporter, filePath)
    await exp.exportToFile()

    expect(exp.status).toBe(ExportStatus.Completed)
    expect(exp.truncated).toBe(false)
    const { name, rows } = readSheet(filePath)
    expect(name).toBe('toexport')
    expect(rows).toEqual([
      ['id', 'name', 'amount'],
      [1, 'foo', 1.5],
      [2, 'bar & <baz>', null],
      [3, 'multi\nline', 3],
    ])
  })

  it('applies filters', async () => {
    const filePath = tmp.tmpNameSync({ postfix: '.xlsx' })
    const exp = exporter(XlsxExporter, filePath, [{ field: 'id', type: '>', value: '1' }])
    await exp.exportToFile()

    expect(readSheet(filePath).rows).toEqual([
      ['id', 'name', 'amount'],
      [2, 'bar & <baz>', null],
      [3, 'multi\nline', 3],
    ])
  })

  it('exports a query', async () => {
    const filePath = tmp.tmpNameSync({ postfix: '.xlsx' })
    const exp = new XlsxExporter(
      filePath,
      util.connection,
      null,
      'select name, id * 10 as big from toexport order by id',
      'my query',
      [],
      { deleteOnAbort: true, chunkSize: 2 },
      {}
    )
    await exp.exportToFile()

    const { name, rows } = readSheet(filePath)
    expect(name).toBe('my query')
    expect(rows).toEqual([
      ['name', 'big'],
      ['foo', 10],
      ['bar & <baz>', 20],
      ['multi\nline', 30],
    ])
  })

  it('stops reading once the sheet is full', async () => {
    const filePath = tmp.tmpNameSync({ postfix: '.xlsx' })
    const exp = exporter(LimitedXlsxExporter, filePath)
    await exp.exportToFile()

    expect(exp.status).toBe(ExportStatus.Completed)
    expect(exp.truncated).toBe(true)
    expect(readSheet(filePath).rows).toEqual([
      ['id', 'name', 'amount'],
      [1, 'foo', 1.5],
      [2, 'bar & <baz>', null],
    ])
  })

  it('removes the file when the export fails', async () => {
    const filePath = tmp.tmpNameSync({ postfix: '.xlsx' })
    const exp = new XlsxExporter(
      filePath,
      util.connection,
      null,
      'select * from table_that_does_not_exist',
      'broken',
      [],
      { deleteOnAbort: true, chunkSize: 2 },
      {}
    )
    await exp.exportToFile()

    expect(exp.status).toBe(ExportStatus.Error)
    expect(fs.existsSync(filePath)).toBe(false)
  })
})
