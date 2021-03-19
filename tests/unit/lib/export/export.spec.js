import fs from 'fs'
import { DBConnection } from '@/lib/db/clients'
import { Export } from '@/lib/export/export'

class DummyExport extends Export { }

jest.mock('@/lib/db/clients', () => {
  return {
    DBConnection: jest.fn().mockImplementation(() => {
      const fakeData = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Doe' },
        { id: 3, firstName: 'Alex', lastName: 'Doe' },
      ]

      return {
        selectTop: (table, offset, limit) => {
          return {
            result: fakeData.slice(offset, offset + limit),
            totalRecords: fakeData.length
          }
        }
      };
    }),
  };
});

describe('Export Class Unit Test', () => {
  let dummyExport

  beforeAll(() => {
    const dummyConnection = new DBConnection()
    const options = { chunkSize: 1, deleteOnAbort: true }
    dummyExport = new DummyExport('fakeFile', dummyConnection, { schema: '', name: 'table' }, [], options, {})
  })

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should create a unique id', () => {
    const firstId = dummyExport.id
    expect(firstId).toHaveLength
    dummyExport.id = dummyExport.generateId()
    expect(dummyExport.id).not.toEqual(firstId)
  })

  it('should receive chunked results', async () => {
    const results = await dummyExport.getChunk(1, 1)
    expect(results).toEqual({ result: [{ id: 2, firstName: 'Jane', lastName: 'Doe' }], totalRecords: 3 })
  })

  it('should receive the first row', async () => {
    const results = await dummyExport.getFirstRow()
    expect(results).toEqual({ id: 1, firstName: 'John', lastName: 'Doe' })
  })

  it('should calculate the time left', () => {
    dummyExport.lastChunkTime = Date.now() - 1000
    dummyExport.countExported = dummyExport.chunkSize
    dummyExport.countTotal = dummyExport.chunkSize * 100
    dummyExport.calculateTimeLeft()

    expect(dummyExport.timeLeft).not.toEqual(0)
    expect(dummyExport.lastChunkTime).not.toEqual(1)
  })

  it('should abort the export', () => {
    dummyExport.abort()
    expect(dummyExport.status).toEqual(Export.Status.Aborted)
  })

  it('should pause the export', () => {
    dummyExport.pause()
    expect(dummyExport.status).toEqual(Export.Status.Paused)
  })

  it('should hide the export notification', () => {
    dummyExport.hide()
    expect(dummyExport.showNotification).toEqual(false)
  })

  it('should delete the export file', async () => {
    jest.spyOn(fs.promises, 'unlink').mockImplementation()
    dummyExport.deleteFile()
    expect(fs.promises.unlink).toHaveBeenCalledWith(dummyExport.filePath)
  })

  it('should write string line to file', async () => {
    jest.spyOn(fs.promises, 'appendFile').mockImplementation()
    dummyExport.writeToFile('test')
    expect(fs.promises.appendFile).toHaveBeenCalledWith(dummyExport.filePath, 'test\n')
    expect(fs.promises.appendFile).toHaveBeenCalledTimes(1)
  })

  it('should try to write all chunks to file', async () => {
    dummyExport.getHeader = () => null
    dummyExport.getFooter = () => null
    dummyExport.formatChunk = () => ['a', 'b', 'c']

    jest.spyOn(fs.promises, 'open').mockImplementation()
    jest.spyOn(fs.promises, 'appendFile').mockImplementation()
    jest.spyOn(fs.promises, 'stat').mockImplementation(() => Promise.resolve({ size: 1 }))
    jest.spyOn(dummyExport, 'initExport')
    jest.spyOn(dummyExport, 'exportData')
    jest.spyOn(dummyExport, 'formatChunk')
    jest.spyOn(dummyExport, 'finalizeExport')

    await dummyExport.exportToFile()

    expect(dummyExport.error).toBeNull()
    expect(fs.promises.open).toHaveBeenCalled()
    expect(fs.promises.appendFile).toHaveBeenCalledTimes(9)
    expect(dummyExport.initExport).toHaveBeenCalledTimes(1)
    expect(dummyExport.exportData).toHaveBeenCalledTimes(3)
    expect(dummyExport.formatChunk).toHaveBeenCalledTimes(3)
    expect(dummyExport.finalizeExport).toHaveBeenCalledTimes(1)
  })
})
