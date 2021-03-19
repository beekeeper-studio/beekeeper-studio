import { DBConnection } from '@/lib/db/clients'
import { JsonExporter } from '@/lib/export/formats/json'

jest.mock('@/lib/db/clients', () => {
  return {
    DBConnection: jest.fn().mockImplementation()
  };
});

describe('JSON Export Class Unit Test', () => {
  const fakeData = { id: 1, firstName: 'John', lastName: 'Doe' }
  const options = { chunkSize: 1, deleteOnAbort: true }
  const outputOptions = { prettyprint: false }
  let dummyExport

  beforeAll(() => {
    const dummyConnection = new DBConnection()

    dummyExport = new JsonExporter('fakeFile', dummyConnection, { schema: '', name: 'table' }, [], options, outputOptions)
  })

  afterEach(() => {
    jest.clearAllMocks();
    dummyExport.outputOptions = outputOptions
  })

  it('Should generate the header correctly', async () => {
    const headerRow = await dummyExport.getHeader(fakeData)

    expect(headerRow).toEqual('[')
  })

  it('Should generate the footer correctly', async () => {
    const footerRow = await dummyExport.getFooter()

    expect(footerRow).toEqual(']')
  })

  it('Should format the data correctly', () => {
    const dataOne = dummyExport.formatChunk([fakeData])

    dummyExport.outputOptions = { prettyprint: true }

    const dataTwo = dummyExport.formatChunk([fakeData])

    const prettyRow = `  {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe"
  },`

    expect(dataOne).toEqual(['  {"id":1,"firstName":"John","lastName":"Doe"},'])
    expect(dataTwo).toEqual([prettyRow])
  })

})
