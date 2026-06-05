import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

// NOTE: points at a StarRocks server running on the LAN for now. Swap this for a
// testcontainer (starrocks/allin1-ubuntu, port 9030) once one is available in CI.
const STARROCKS_HOST = process.env.STARROCKS_HOST || '192.168.1.55'
const STARROCKS_PORT = Number(process.env.STARROCKS_PORT || 9030)

describe("StarRocks Tests", () => {
  jest.setTimeout(dbtimeout)

  let util

  beforeAll(async () => {
    const config = {
      client: 'starrocks',
      host: STARROCKS_HOST,
      port: STARROCKS_PORT,
      user: 'root',
      password: ''
    }
    util = new DBTestUtil(config, "test", { dialect: 'mysql' })
    await util.setupdb()
  })

  afterAll(async () => {
    await util.disconnect()
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })
})
