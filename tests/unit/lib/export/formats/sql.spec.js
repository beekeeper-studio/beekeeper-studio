import { DBConnection } from '@/lib/db/clients'
import { SqlExporter } from '@/lib/export'

jest.mock('@/lib/db/clients', () => {
  return {
    DBConnection: jest.fn().mockImplementation(() => {
      return {
        getTableCreateScript: (table, schema) => {
          return [schema, table].join('#')
        },
        connectionType: 'mysql'
      };
    }),
  };
});

describe('SQL Export Class Unit Test', () => {
  const fakeData = { id: 1, firstName: 'John', lastName: 'Doe' }
  const options = { chunkSize: 1, deleteOnAbort: true }
  const outputOptions = { createTable: true, schema: true }
  let dummyExport

  beforeAll(() => {
    const dummyConnection = new DBConnection()

    dummyExport = new SqlExporter('fakeFile', dummyConnection, { schema: 'schema', name: 'table' }, [], options, outputOptions)
  })

  afterEach(() => {
    jest.clearAllMocks();
    dummyExport.outputOptions = outputOptions
  })

  it('Should generate the header correctly', async () => {
    const headerOne = await dummyExport.getHeader(fakeData)

    dummyExport.outputOptions = { createTable: true, schema: false }

    const headerTwo = await dummyExport.getHeader(fakeData)

    expect(headerOne).toEqual('schema#table')
    expect(headerTwo).toEqual('#table')
  })

  it('Should not generate a header if disabled in options', async () => {
    dummyExport.outputOptions = { createTable: false, schema: true }
    const header = await dummyExport.getHeader(fakeData)

    expect(header).toBeNull
  })

  it('Should not generate a footer', async () => {
    const footerRow = await dummyExport.getFooter()

    expect(footerRow).toBeUndefined()
  })

  it('Should format the data correctly', () => {
    const dataOne = dummyExport.formatChunk([fakeData])

    dummyExport.outputOptions = { createTable: false, schema: false }

    const dataTwo = dummyExport.formatChunk([fakeData])

    expect(dataOne).toEqual(["insert into `schema`.`table` (`firstName`, `id`, `lastName`) values ('John', 1, 'Doe')"])
    expect(dataTwo).toEqual(["insert into `table` (`firstName`, `id`, `lastName`) values ('John', 1, 'Doe')"])
  })

})
