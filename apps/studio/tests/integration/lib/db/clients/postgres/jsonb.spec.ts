import { DBTestUtil, dbtimeout } from "@tests/lib/db"
import { PostgresTestDriver } from "./container"


let util: DBTestUtil

describe("When working with JSONB", () => {


  beforeAll(async () => {
   jest.setTimeout(dbtimeout)

    await PostgresTestDriver.start('16.4', false, false)
    util = new DBTestUtil(
      PostgresTestDriver.config,
      'banana',
      PostgresTestDriver.utilOptions
    )

    await util.setupdb()

    await util.knex.schema.createTable('jsontest', (table) => {
      table.integer('id').primary()
      table.specificType('data', 'jsonb')
    })

    await util.knex('jsontest').insert({id: 1, data: { 'foo': 'bar'}})

  })

  it("Should deserialize JSONB to an object", async () => {
    const result = await util.connection.selectTop('jsontest', 0, 1, [], [])
    const data = result.result[0].data
    expect(data).toEqual({'foo': 'bar'})
  })
})
