import { StartedTestContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '@tests/lib/db'
import { runCommonTests } from './all'
import { PostgresTestDriver } from './postgres/container'

describe('Greengage tests', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let util: DBTestUtil

  beforeAll(async () => {
    await PostgresTestDriver.start('16.4', false, false)
    container = PostgresTestDriver.container

    const config = {
      ...PostgresTestDriver.config,
      client: 'greengage' as const,
    }
    util = new DBTestUtil(config, 'banana', {
      dialect: 'greengage',
      defaultSchema: 'public',
      ...PostgresTestDriver.utilOptions,
    })
    await util.setupdb()
  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
  })

  describe('Common tests (postgres syntax)', () => {
    runCommonTests(() => util)
  })
})
