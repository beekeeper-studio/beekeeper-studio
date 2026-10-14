// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import XLSX from 'xlsx'
import {
  XlsxWriter,
  writeXlsxFile,
  escapeXml,
  sanitizeSheetName,
  columnName,
  cellXml,
  crc32,
  crc32Js,
  XLSX_MAX_CELL_LENGTH,
} from '@/lib/export/xlsxWriter'

function readSheet(filePath: string) {
  const workbook = XLSX.read(fs.readFileSync(filePath))
  const name = workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null })
  return { name, rows }
}

describe('xlsxWriter helpers', () => {
  it('calculates crc32 checksums, with and without native support', () => {
    const data = Buffer.from('123456789')
    expect(crc32(data)).toBe(0xCBF43926)
    expect(crc32Js(data)).toBe(0xCBF43926)
    // incremental, the way zip entries are checksummed
    const split = crc32Js(Buffer.from('6789'), crc32Js(Buffer.from('12345')))
    expect(split).toBe(0xCBF43926)
  })

  it('builds spreadsheet column names', () => {
    expect(columnName(0)).toBe('A')
    expect(columnName(25)).toBe('Z')
    expect(columnName(26)).toBe('AA')
    expect(columnName(701)).toBe('ZZ')
    expect(columnName(702)).toBe('AAA')
    expect(columnName(16383)).toBe('XFD')
  })

  it('sanitizes sheet names', () => {
    expect(sanitizeSheetName('public/users:2024?')).toBe('public_users_2024_')
    expect(sanitizeSheetName("'quoted'")).toBe('quoted')
    expect(sanitizeSheetName('a'.repeat(40))).toHaveLength(31)
    expect(sanitizeSheetName('History')).toBe('Sheet1')
    expect(sanitizeSheetName('')).toBe('Sheet1')
    expect(sanitizeSheetName(undefined)).toBe('Sheet1')
  })

  it('escapes xml and characters xml cannot hold', () => {
    expect(escapeXml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
    expect(escapeXml('bell\u0007')).toBe('bell_x0007_')
    // text that already looks like an escape must survive the round trip
    expect(escapeXml('_x0041_')).toBe('_x005F_x0041_')
    expect(escapeXml('tab\tnewline\n')).toBe('tab\tnewline\n')
  })

  it('types cells by value', () => {
    expect(cellXml('A1', null)).toBe('')
    expect(cellXml('A1', undefined)).toBe('')
    expect(cellXml('A1', 42)).toBe('<c r="A1"><v>42</v></c>')
    expect(cellXml('A1', NaN)).toContain('t="inlineStr"')
    expect(cellXml('A1', true)).toBe('<c r="A1" t="b"><v>1</v></c>')
    expect(cellXml('A1', new Uint8Array([0xde, 0xad]))).toContain('<t>dead</t>')
    expect(cellXml('A1', { a: 1 })).toContain('<t>{&quot;a&quot;:1}</t>')
    expect(cellXml('A1', ' padded')).toContain('xml:space="preserve"')
    expect(cellXml('A1', 'x', 1)).toBe('<c r="A1" s="1" t="inlineStr"><is><t>x</t></is></c>')
  })
})

describe('XlsxWriter', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-xlsx-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('writes a workbook that round trips', async () => {
    const filePath = path.join(dir, 'out.xlsx')
    const result = await writeXlsxFile(filePath, ['id', 'name', 'active', 'notes'], [
      [1, 'Ann <admin>', true, null],
      [2.5, 'Bob & co', false, 'line one\nline two'],
      [3, '_x0041_', null, 'bell\u0007'],
    ], 'users')

    expect(result).toEqual({ truncated: false, rowCount: 3 })
    const { name, rows } = readSheet(filePath)
    expect(name).toBe('users')
    expect(rows).toEqual([
      ['id', 'name', 'active', 'notes'],
      [1, 'Ann <admin>', true, null],
      [2.5, 'Bob & co', false, 'line one\nline two'],
      [3, '_x0041_', null, 'bell\u0007'],
    ])
  })

  it('writes a valid workbook with no rows at all', async () => {
    const filePath = path.join(dir, 'empty.xlsx')
    await writeXlsxFile(filePath, null, [])
    const { name, rows } = readSheet(filePath)
    expect(name).toBe('Sheet1')
    expect(rows).toEqual([])
  })

  it('truncates long cells to the excel limit', async () => {
    const filePath = path.join(dir, 'long.xlsx')
    await writeXlsxFile(filePath, ['text'], [['x'.repeat(XLSX_MAX_CELL_LENGTH + 10)]])
    const { rows } = readSheet(filePath)
    expect((rows[1][0] as string).length).toBe(XLSX_MAX_CELL_LENGTH)
  })

  it('stops at the row limit, counting the header', async () => {
    const filePath = path.join(dir, 'limited.xlsx')
    const writer = new XlsxWriter(filePath)
    writer.maxRows = 3
    await writer.open()
    await writer.write(writer.headerXml(['n']))
    await writer.writeRows([[1], [2], [3], [4]])
    expect(writer.rowXml([5])).toBeNull()
    await writer.close()

    expect(writer.truncated).toBe(true)
    expect(writer.rowCount).toBe(3)
    expect(readSheet(filePath).rows).toEqual([['n'], [1], [2]])
  })

  it('streams many rows', async () => {
    const filePath = path.join(dir, 'many.xlsx')
    const rows = Array.from({ length: 20000 }, (_v, i) => [i, `row ${i} ${'*'.repeat(i % 50)}`])
    const result = await writeXlsxFile(filePath, ['id', 'text'], rows)
    expect(result).toEqual({ truncated: false, rowCount: 20000 })

    const read = readSheet(filePath).rows
    expect(read).toHaveLength(20001)
    expect(read[20000]).toEqual([19999, `row 19999 ${'*'.repeat(19999 % 50)}`])
  })

  it('rejects when the file cannot be written', async () => {
    const filePath = path.join(dir, 'missing', 'out.xlsx')
    await expect(writeXlsxFile(filePath, ['a'], [[1]])).rejects.toThrow()
  })
})
