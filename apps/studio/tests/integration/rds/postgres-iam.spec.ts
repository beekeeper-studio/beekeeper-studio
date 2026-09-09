import { DBTestUtil, dbtimeout } from '../../lib/db'
import { runCommonTests } from '../lib/db/clients/all'
import { IamAuthType } from '@/lib/db/types'
import { RdsTestDriver } from './_shared/driver'
import { setupCredentialsFile, teardownCredentialsFile } from './_shared/credentials-file'

const AUTH_METHODS: IamAuthType[] = [
  IamAuthType.Key,
  IamAuthType.File,
  IamAuthType.CLI,
]

function testWith(authType: IamAuthType) {
  describe(`Postgres RDS [auth: ${authType}]`, () => {
    jest.setTimeout(dbtimeout)

    let driver: RdsTestDriver
    let util: DBTestUtil

    beforeAll(async () => {
      if (authType === IamAuthType.File) setupCredentialsFile()

      driver = new RdsTestDriver({ engine: 'pg', authType })
      await driver.init()

      util = new DBTestUtil(driver.config, driver.database, driver.utilOptions)
      await util.setupdb()
    })

    afterAll(async () => {
      if (util) await util.disconnect()
      if (authType === IamAuthType.File) teardownCredentialsFile()
    })

    describe('Common Tests', () => {
      runCommonTests(() => util)
    })

    describe('IAM token refresh', () => {
      it('generates a fresh token and continues querying', async () => {
        const token = await driver.generateToken()
        expect(token).toEqual(expect.any(String))
        expect(token.length).toBeGreaterThan(0)

        const tables = await util.connection.listTables()
        expect(Array.isArray(tables)).toBe(true)
      })
    })
  })
}

AUTH_METHODS.forEach(testWith)
