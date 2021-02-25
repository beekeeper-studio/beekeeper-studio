import { DBConnection } from '@/lib/db/clients'
import { CsvExporter } from '@/lib/export/formats/csv' 

jest.mock('@/lib/db/clients', () => {
  return {
    DBConnection: jest.fn().mockImplementation()
  };
});

describe('CSV Export Class Unit Test', () => {
  const fakeData = { id: 1, firstName: 'John', lastName: 'Doe' }
  const options = { chunkSize: 1, deleteOnAbort: true }
  const outputOptions = { header: true, delimiter: ';' }
  let dummyExport

  beforeAll(() => {
    const dummyConnection = new DBConnection()

    dummyExport = new CsvExporter('fakeFile', dummyConnection, { schema: '', name: 'table' }, [], options, outputOptions)
  })

  afterEach(() => {
    jest.clearAllMocks();
    dummyExport.outputOptions = outputOptions
  })

  it('Should generate the header correctly', async () => {
    const headerRowOne = await dummyExport.getHeader(fakeData)

    dummyExport.outputOptions = { header: true, delimiter: '#' }

    const headerRowTwo = await dummyExport.getHeader(fakeData)

    expect(headerRowOne).toEqual('id;firstName;lastName')
    expect(headerRowTwo).toEqual('id#firstName#lastName')
  })

  it('Should not generate a header if disabled in options', async () => {
    dummyExport.outputOptions = { header: false, delimiter: ';' }
    const headerRow = await dummyExport.getHeader(fakeData)

    expect(headerRow).toBeNull
  })

  it('Should format the data correctly', () => {
    const dataOne = dummyExport.formatChunk([fakeData])

    dummyExport.outputOptions = { header: true, delimiter: '#' }

    const dataTwo = dummyExport.formatChunk([fakeData])

    expect(dataOne).toEqual(['1;John;Doe'])
    expect(dataTwo).toEqual(['1#John#Doe'])
  })

})
