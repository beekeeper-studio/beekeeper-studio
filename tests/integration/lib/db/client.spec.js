import { SavedConnection } from '@/entity/saved_connection'
import connectionProvider from '@/lib/connection-provider'

const dbType = process.env.CONNECTION_TYPE
const password = dbType.includes('mssql') ? 'Password@1' : 'password'
const user = dbType.includes('mssql') ? 'sa' : 'test'


let config = null
let connection = null

beforeAll(() => {
  config = new SavedConnection()
  config.connectionType = dbType
  config.username = user
  config.password = password
  config.host = 'localhost'
  config.port = 9000
  config.defaultDatabase = 'test'
  connection = connectionProvider.for(config)
})

describe('selectTop', () => {
  it('canary passes', () => {
    expect(true).toBe(true)
  })

  it('returns correctly with a normal table', async () => {

    const response = await connection.selectTop(
      'people',
      0,
      10,
      'first_name'
    )
    expect(response.totalRecords).toBe(1)
    // for this to work:
    // 0. Set an environment variable to determine which DB to test
    // 1. Start a [db] from tests/docker-compose, and wait for it
    // 2. Run a migration to create a `saved connection`
    // 3. before test: create a table in [db]
    // 4. Run test
  })
})