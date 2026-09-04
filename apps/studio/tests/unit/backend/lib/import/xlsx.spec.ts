import XlsxImporter from '@commercial/backend/lib/import/formats/xlsx'
import XLSX from 'xlsx'

jest.mock('xlsx', () => ({
  set_fs: jest.fn(),
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}))

const mockOptions = {
  trimWhitespaces: false,
  nullableValues: [],
  importMap: [{ fileColumn: 'name', tableColumn: 'name' }],
}

function makeImporter(connection: any) {
  const table = { name: 'test_table', schema: null } as any
  const importer = new XlsxImporter('/fake/file.xlsx', mockOptions, connection, table)
  importer.importScriptOptions = {
    storeValues: { runAsUpsert: false },
    executeOptions: { multiple: true },
  }
  return importer
}

function mockWorkbook() {
  (XLSX.readFile as jest.Mock).mockReturnValue({
    SheetNames: ['Sheet1'],
    Sheets: { Sheet1: {} },
  })
  ;(XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([{ name: 'row1' }])
}

describe('XlsxImporter error handling (bug #4468)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorkbook()
  })

  it('surfaces nested driver error detail instead of the generic message', async () => {
    // Shaped like an mssql RequestError: generic top-level message with
    // the real cause in precedingErrors.
    const driverError = new Error('Transaction has been aborted.') as any
    driverError.precedingErrors = [
      new Error("Conversion failed when converting date and/or time from character string."),
    ]

    const connection = {
      getImportSQL: jest.fn().mockResolvedValue('INSERT INTO test_table ...'),
      importLineReadCommand: jest.fn().mockRejectedValue(driverError),
    }

    const importer = makeImporter(connection)

    await expect(
      importer.read({ isPreview: false }, { connection: {} })
    ).rejects.toThrow(
      'Transaction has been aborted.; Conversion failed when converting date and/or time from character string.'
    )
  })

  it('does not produce "[object Object]" for non-Error rejections', async () => {
    const connection = {
      getImportSQL: jest.fn().mockResolvedValue('INSERT INTO test_table ...'),
      importLineReadCommand: jest.fn().mockRejectedValue({ message: 'driver blew up' }),
    }

    const importer = makeImporter(connection)

    const err = await importer.read({ isPreview: false }, { connection: {} }).catch(e => e)
    expect(err.message).toBe('driver blew up')
    expect(err.message).not.toContain('[object Object]')
  })

  it('still returns parsed data when the import succeeds', async () => {
    const connection = {
      getImportSQL: jest.fn().mockResolvedValue('INSERT INTO test_table ...'),
      importLineReadCommand: jest.fn().mockResolvedValue(undefined),
    }

    const importer = makeImporter(connection)
    const result = await importer.read({ isPreview: false }, { connection: {} })

    expect(result.data).toEqual([{ name: 'row1' }])
    expect(connection.importLineReadCommand).toHaveBeenCalled()
  })
})
