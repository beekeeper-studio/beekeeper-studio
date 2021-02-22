import { DBConnection } from '../../../../src/lib/db/clients'
import { Export } from '../../../../src/lib/export/export'
import _ from 'lodash'

class DummyExport extends Export {}

jest.mock('../../../../src/lib/db/clients', () => {
    return {
        DBConnection: jest.fn().mockImplementation(() => {
            const FakeData = [
                {id: 1, firstName: 'John', lastName: 'Doe'},
                {id: 2, firstName: 'Jane', lastName: 'Doe'},
                {id: 3, firstName: 'Alex', lastName: 'Doe'},
            ]
            
            return {
                selectTop: (
                    table, 
                    offset, 
                    limit, 
                    orderBy, 
                    filters, 
                    schema
                ) => {
                    return {
                        result: FakeData.slice(offset, offset + limit),
                        totalRecords: FakeData.length
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
        dummyExport = new DummyExport('fakeFile', dummyConnection, { schema: '', name: 'table'}, [], {})
    })

    it('should create a unique id', () => {
        const firstId = dummyExport.id
        expect(firstId).toHaveLength
        dummyExport.id = dummyExport.generateId()
        expect(dummyExport.id).not.toEqual(firstId)
    })

    it('should receive chunked results', async () => {
        const results = await dummyExport.getChunk(1, 1)
        expect(results).toEqual({ result: [{id: 2, firstName: 'Jane', lastName: 'Doe'}], totalRecords: 3 })
    })

    it('should receive the first row', async () => {
        const results = await dummyExport.getFirstRow()
        expect(results).toEqual({id: 1, firstName: 'John', lastName: 'Doe'})
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
})