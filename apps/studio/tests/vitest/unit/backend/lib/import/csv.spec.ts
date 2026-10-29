import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import CsvImporter from '@commercial/backend/lib/import/formats/csv'
import Papa from 'papaparse'

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  const createReadStream = vi.fn().mockReturnValue('mock-stream')
  return { ...actual, default: { ...actual, createReadStream }, createReadStream }
})

vi.mock('papaparse', () => {
  const parse = vi.fn()
  return { default: { parse }, parse }
})

const mockOptions = {
  columnDelimeter: ',',
  quoteCharacter: '"',
  escapeCharacter: '"',
  newlineCharacter: '',
  useHeaders: true,
  trimWhitespaces: false,
  nullableValues: [],
  importMap: [],
}

function makeImporter() {
  const connection = {} as any
  const table = { name: 'test_table', schema: null } as any
  const importer = new CsvImporter('/fake/file.csv', mockOptions, connection, table)
  importer.importScriptOptions = {
    storeValues: { runAsUpsert: false },
    executeOptions: { multiple: true },
  }
  return importer
}

describe('CsvImporter error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets a human-readable error message when PapaParse reports chunk errors', async () => {
    const importer = makeImporter()
    const parseErrors = [
      { type: 'Delimiter', code: 'UndetectableDelimiter', message: 'Unable to auto-detect delimiting character; please try another extension.' },
    ]

    ;(Papa.parse as Mock).mockImplementationOnce(async (_stream, opts) => {
      const mockParser = { abort: vi.fn(), pause: vi.fn(), resume: vi.fn() }
      await opts.chunk({ data: [], errors: parseErrors }, mockParser)
      opts.complete({ meta: { aborted: true, fields: [] }, data: [] })
    })

    const result = await importer.read(
      importer.getImporterOptions({ isPreview: false }),
      { connection: {} },
    )

    expect(result.error).toBe('Unable to auto-detect delimiting character; please try another extension.')
    expect(result.error).not.toContain('[object Object]')
  })

  it('de-duplicates repeated error messages across chunks', async () => {
    const importer = makeImporter()
    const parseErrors = [
      { message: 'Repeated error' },
      { message: 'Repeated error' },
    ]

    ;(Papa.parse as Mock).mockImplementationOnce(async (_stream, opts) => {
      const mockParser = { abort: vi.fn(), pause: vi.fn(), resume: vi.fn() }
      await opts.chunk({ data: [], errors: parseErrors }, mockParser)
      opts.complete({ meta: { aborted: true, fields: [] }, data: [] })
    })

    const result = await importer.read(
      importer.getImporterOptions({ isPreview: false }),
      { connection: {} },
    )

    expect(result.error).toBe('Repeated error')
  })
})
