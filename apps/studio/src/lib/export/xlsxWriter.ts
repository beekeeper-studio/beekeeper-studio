import fs from 'fs'
import zlib from 'zlib'
import { EventEmitter } from 'events'

// Hard limits imposed by Excel
// https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3
export const XLSX_MAX_ROWS = 1_048_576
export const XLSX_MAX_COLUMNS = 16_384
export const XLSX_MAX_CELL_LENGTH = 32_767

// The zip writer below doesn't do zip64, so every entry has to stay under 4GB.
// Leave plenty of headroom for the zip structure itself.
const MAX_SHEET_BYTES = 0xF0000000

const HEADER_STYLE = 1

// ---------------------------------------------------------------------------
// Minimal streaming zip writer (deflate + data descriptors, no zip64)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

// zlib.crc32 only exists in newer versions of node
const nativeCrc32: ((data: Buffer, value?: number) => number) | undefined = (zlib as any).crc32

export function crc32Js(data: Buffer, previous = 0): number {
  let crc = ~previous
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return ~crc >>> 0
}

export function crc32(data: Buffer, previous = 0): number {
  return nativeCrc32 ? nativeCrc32(data, previous) : crc32Js(data, previous)
}

interface ZipEntryRecord {
  name: Buffer
  offset: number
  crc: number
  compressedSize: number
  size: number
}

function dosDateTime(date: Date): { time: number, date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/** Resolves on 'drain', rejects if the stream errors or closes first */
function drained(stream: EventEmitter): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.off('drain', onDrain)
      stream.off('error', onError)
      stream.off('close', onClose)
    }
    const onDrain = () => { cleanup(); resolve() }
    const onError = (e: Error) => { cleanup(); reject(e) }
    const onClose = () => { cleanup(); reject(new Error('Stream closed before drain')) }
    stream.on('drain', onDrain)
    stream.on('error', onError)
    stream.on('close', onClose)
  })
}

// bit 3: sizes + crc follow the data in a descriptor, bit 11: utf-8 file names
const ZIP_FLAGS = 0x0808
const ZIP_VERSION = 20
const ZIP_DEFLATE = 8
// rows are tiny, batch them up rather than handing zlib one row at a time
const FLUSH_CHARS = 64 * 1024

class ZipEntryWriter {
  crc = 0
  size = 0
  compressedSize = 0
  private deflate = zlib.createDeflateRaw()
  private pump: Promise<void>
  private error?: Error
  private pending: string[] = []
  private pendingChars = 0

  constructor(private writeRaw: (chunk: Buffer) => Promise<void>) {
    // errors surface through write() / end(), never as an uncaught 'error' event
    this.deflate.on('error', (e) => { this.error ??= e })
    this.pump = (async () => {
      try {
        for await (const chunk of this.deflate) {
          this.compressedSize += chunk.length
          await this.writeRaw(chunk)
        }
      } catch (e) {
        this.error ??= e
        throw e
      }
    })()
    this.pump.catch(() => null)
  }

  async write(data: string): Promise<void> {
    if (this.error) throw this.error
    if (!data) return
    this.pending.push(data)
    this.pendingChars += data.length
    if (this.pendingChars >= FLUSH_CHARS) {
      await this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.error) throw this.error
    if (!this.pending.length) return
    const buf = Buffer.from(this.pending.join(''), 'utf8')
    this.pending = []
    this.pendingChars = 0
    this.crc = crc32(buf, this.crc)
    this.size += buf.length
    if (!this.deflate.write(buf)) {
      try {
        await drained(this.deflate)
      } catch (e) {
        throw this.error ?? e
      }
    }
  }

  async end(): Promise<void> {
    await this.flush()
    this.deflate.end()
    await this.pump
  }

  destroy() {
    this.deflate.destroy()
  }
}

class ZipWriter {
  private out: fs.WriteStream
  private offset = 0
  private entries: ZipEntryRecord[] = []
  private current?: ZipEntryWriter
  private error?: Error
  private stamp = dosDateTime(new Date())

  constructor(filePath: string) {
    this.out = fs.createWriteStream(filePath)
    this.out.on('error', (e) => { this.error = e })
  }

  private async writeRaw(chunk: Buffer): Promise<void> {
    if (this.error) throw this.error
    this.offset += chunk.length
    if (!this.out.write(chunk)) {
      try {
        await drained(this.out)
      } catch (e) {
        throw this.error ?? e
      }
    }
  }

  async startEntry(fileName: string): Promise<ZipEntryWriter> {
    if (this.current) throw new Error('Previous zip entry has not been finished')
    const name = Buffer.from(fileName, 'utf8')
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(ZIP_VERSION, 4)
    header.writeUInt16LE(ZIP_FLAGS, 6)
    header.writeUInt16LE(ZIP_DEFLATE, 8)
    header.writeUInt16LE(this.stamp.time, 10)
    header.writeUInt16LE(this.stamp.date, 12)
    // crc + sizes (14-25) are zero, they live in the data descriptor
    header.writeUInt16LE(name.length, 26)
    header.writeUInt16LE(0, 28)

    this.entries.push({ name, offset: this.offset, crc: 0, compressedSize: 0, size: 0 })
    await this.writeRaw(Buffer.concat([header, name]))
    this.current = new ZipEntryWriter((chunk) => this.writeRaw(chunk))
    return this.current
  }

  async finishEntry(): Promise<void> {
    const entry = this.current
    if (!entry) return
    await entry.end()
    this.current = undefined

    const record = this.entries[this.entries.length - 1]
    record.crc = entry.crc
    record.compressedSize = entry.compressedSize
    record.size = entry.size

    const descriptor = Buffer.alloc(16)
    descriptor.writeUInt32LE(0x08074b50, 0)
    descriptor.writeUInt32LE(record.crc, 4)
    descriptor.writeUInt32LE(record.compressedSize, 8)
    descriptor.writeUInt32LE(record.size, 12)
    await this.writeRaw(descriptor)
  }

  async addFile(fileName: string, content: string): Promise<void> {
    const entry = await this.startEntry(fileName)
    await entry.write(content)
    await this.finishEntry()
  }

  async close(): Promise<void> {
    await this.finishEntry()
    const centralStart = this.offset
    for (const entry of this.entries) {
      const header = Buffer.alloc(46)
      header.writeUInt32LE(0x02014b50, 0)
      header.writeUInt16LE(ZIP_VERSION, 4)
      header.writeUInt16LE(ZIP_VERSION, 6)
      header.writeUInt16LE(ZIP_FLAGS, 8)
      header.writeUInt16LE(ZIP_DEFLATE, 10)
      header.writeUInt16LE(this.stamp.time, 12)
      header.writeUInt16LE(this.stamp.date, 14)
      header.writeUInt32LE(entry.crc, 16)
      header.writeUInt32LE(entry.compressedSize, 20)
      header.writeUInt32LE(entry.size, 24)
      header.writeUInt16LE(entry.name.length, 28)
      // extra length, comment length, disk number, internal + external attrs are all zero
      header.writeUInt32LE(entry.offset, 42)
      await this.writeRaw(Buffer.concat([header, entry.name]))
    }
    const centralSize = this.offset - centralStart

    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    end.writeUInt16LE(this.entries.length, 8)
    end.writeUInt16LE(this.entries.length, 10)
    end.writeUInt32LE(centralSize, 12)
    end.writeUInt32LE(centralStart, 16)
    await this.writeRaw(end)

    if (this.error) throw this.error
    // wait for the file handle to be released, not just flushed, so the
    // file can be handed straight to another app
    await new Promise<void>((resolve, reject) => {
      this.out.once('close', resolve)
      this.out.end((err?: Error | null) => { if (err) reject(err) })
    })
  }

  destroy() {
    this.current?.destroy()
    this.out.destroy()
  }
}

// ---------------------------------------------------------------------------
// Spreadsheet XML
// ---------------------------------------------------------------------------

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

const CONTENT_TYPES = XML_DECL +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const ROOT_RELS = XML_DECL +
  `<Relationships xmlns="${NS_PKG_REL}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
  '</Relationships>'

const WORKBOOK_RELS = XML_DECL +
  `<Relationships xmlns="${NS_PKG_REL}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>` +
  '</Relationships>'

// cellXfs: 0 = default, 1 = bold (header row)
const STYLES = XML_DECL +
  `<styleSheet xmlns="${NS_MAIN}">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

function workbookXml(sheetName: string): string {
  return XML_DECL +
    `<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
}

function sheetStartXml(freezeHeader: boolean): string {
  const views = freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : ''
  return XML_DECL + `<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">${views}<sheetData>`
}

const SHEET_END_XML = '</sheetData></worksheet>'

// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Excel reads _xHHHH_ as an escaped character, so escape the underscore of
    // anything that already looks like one, then encode the characters XML can't hold
    .replace(/_(x[0-9A-Fa-f]{4}_)/g, '_x005F_$1')
    .replace(INVALID_XML_CHARS, (c) => `_x${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}_`)
}

/** Excel sheet names: max 31 chars, none of \ / ? * [ ] :, can't start/end with ' and can't be 'History' */
export function sanitizeSheetName(name?: string | null): string {
  const cleaned = (name || '')
    .replace(/[\\/?*[\]:]/g, '_')
    .replace(/^'+|'+$/g, '')
    .trim()
    .slice(0, 31)
    .trim()
  if (!cleaned || cleaned.toLowerCase() === 'history') return 'Sheet1'
  return cleaned
}

export function columnName(index: number): string {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function stringCell(ref: string, value: string, style: number): string {
  let text = value
  if (text.length > XLSX_MAX_CELL_LENGTH) {
    text = text.slice(0, XLSX_MAX_CELL_LENGTH)
  }
  const space = /^\s|\s$|[\t\n\r]/.test(text) ? ' xml:space="preserve"' : ''
  const s = style ? ` s="${style}"` : ''
  return `<c r="${ref}"${s} t="inlineStr"><is><t${space}>${escapeXml(text)}</t></is></c>`
}

export function cellXml(ref: string, value: unknown, style = 0): string {
  if (value === null || value === undefined) return ''
  const s = style ? ` s="${style}"` : ''
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? `<c r="${ref}"${s}><v>${value}</v></c>`
      : stringCell(ref, String(value), style)
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`
  }
  if (typeof value === 'bigint') return stringCell(ref, value.toString(), style)
  if (value instanceof Date) {
    return stringCell(ref, isNaN(value.getTime()) ? String(value) : value.toISOString(), style)
  }
  if (ArrayBuffer.isView(value)) {
    return stringCell(ref, Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('hex'), style)
  }
  if (typeof value === 'object') return stringCell(ref, JSON.stringify(value), style)
  return stringCell(ref, String(value), style)
}

/**
 * Streams a single-sheet .xlsx file to disk, a row at a time, so arbitrarily
 * large results can be written without holding them in memory.
 *
 * Rows past Excel's limits are dropped and `truncated` is set.
 */
export class XlsxWriter {
  truncated = false
  rowCount = 0
  maxRows = XLSX_MAX_ROWS

  private zip?: ZipWriter
  private sheet?: ZipEntryWriter
  private started = false
  private sheetBytes = 0
  private columnRefs: string[] = []

  constructor(public filePath: string, private sheetName = 'Sheet1') {}

  async open(): Promise<void> {
    this.zip = new ZipWriter(this.filePath)
    await this.zip.addFile('[Content_Types].xml', CONTENT_TYPES)
    await this.zip.addFile('_rels/.rels', ROOT_RELS)
    await this.zip.addFile('xl/workbook.xml', workbookXml(sanitizeSheetName(this.sheetName)))
    await this.zip.addFile('xl/_rels/workbook.xml.rels', WORKBOOK_RELS)
    await this.zip.addFile('xl/styles.xml', STYLES)
    this.sheet = await this.zip.startEntry('xl/worksheets/sheet1.xml')
  }

  private columnRef(index: number): string {
    if (!this.columnRefs[index]) {
      this.columnRefs[index] = columnName(index)
    }
    return this.columnRefs[index]
  }

  private buildRow(values: unknown[], style: number): string | null {
    if (this.rowCount >= this.maxRows) {
      this.truncated = true
      return null
    }
    const rowNumber = this.rowCount + 1
    const cells = values
      .slice(0, XLSX_MAX_COLUMNS)
      .map((v, i) => cellXml(`${this.columnRef(i)}${rowNumber}`, v, style))
      .join('')

    let xml = `<row r="${rowNumber}">${cells}</row>`
    if (!this.started) {
      xml = sheetStartXml(style === HEADER_STYLE) + xml
    }

    const bytes = Buffer.byteLength(xml, 'utf8')
    if (this.sheetBytes + bytes + SHEET_END_XML.length > MAX_SHEET_BYTES) {
      this.truncated = true
      return null
    }
    this.started = true
    this.sheetBytes += bytes
    this.rowCount += 1
    return xml
  }

  /**
   * XML for a bold, frozen header row. Must be the first row.
   */
  headerXml(names: string[]): string {
    if (this.started) throw new Error('The header must be the first row of the sheet')
    return this.buildRow(names, HEADER_STYLE) ?? ''
  }

  /**
   * XML for a data row, or null if the sheet is full.
   */
  rowXml(values: unknown[]): string | null {
    return this.buildRow(values, 0)
  }

  /** Write xml produced by headerXml / rowXml */
  async write(xml: string): Promise<void> {
    if (!this.sheet) throw new Error('XlsxWriter is not open')
    await this.sheet.write(xml)
  }

  async writeRows(rows: unknown[][]): Promise<void> {
    for (const row of rows) {
      const xml = this.rowXml(row)
      if (xml === null) break
      await this.write(xml)
    }
  }

  async close(): Promise<void> {
    if (!this.zip || !this.sheet) throw new Error('XlsxWriter is not open')
    const start = this.started ? '' : sheetStartXml(false)
    await this.sheet.write(start + SHEET_END_XML)
    await this.zip.close()
    this.zip = undefined
    this.sheet = undefined
  }

  destroy(): void {
    this.zip?.destroy()
    this.zip = undefined
    this.sheet = undefined
  }
}

/** Write a complete sheet from in-memory rows */
export async function writeXlsxFile(
  filePath: string,
  header: string[] | null,
  rows: unknown[][],
  sheetName?: string
): Promise<{ truncated: boolean, rowCount: number }> {
  const writer = new XlsxWriter(filePath, sheetName)
  try {
    await writer.open()
    if (header?.length) {
      await writer.write(writer.headerXml(header))
    }
    await writer.writeRows(rows)
    await writer.close()
  } catch (e) {
    writer.destroy()
    throw e
  }
  const dataRows = header?.length ? writer.rowCount - 1 : writer.rowCount
  return { truncated: writer.truncated, rowCount: dataRows }
}
