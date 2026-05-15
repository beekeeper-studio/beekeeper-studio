import { DBTestUtil, dbtimeout } from "@tests/lib/db"
import { PostgresTestDriver } from "./container"
import { Mutators } from "@/lib/data/tools"


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

    // Row 1: a proper JSONB object
    await util.knex('jsontest').insert({id: 1, data: { 'foo': 'bar'}})
    // Row 2: a JSONB string scalar (node-postgres returns this as a JS string)
    await util.knex.raw(`INSERT INTO jsontest VALUES (2, to_jsonb('hello'::text))`)
    // Row 3: a JSONB string scalar whose text value looks like a JSON object
    await util.knex.raw(`INSERT INTO jsontest VALUES (3, to_jsonb('{"foo":"bar"}'::text))`)

  })

  it("Should deserialize JSONB object to a JS object", async () => {
    const result = await util.connection.selectTop('jsontest', 0, 1, [{ field: 'id', dir: 'ASC'}], [])
    const data = result.result[0].data
    expect(data).toEqual({'foo': 'bar'})
    expect(typeof data).toBe('object')
  })

  it("Should deserialize JSONB string scalar to a JS string", async () => {
    const result = await util.connection.selectTop('jsontest', 0, 3, [{ field: 'id', dir: 'ASC'}], [])
    const row2 = result.result[1]
    expect(typeof row2.data).toBe('string')
    expect(row2.data).toBe('hello')
  })

  it("Should display JSONB object and JSONB string scalar differently via jsonMutator", async () => {
    const result = await util.connection.selectTop('jsontest', 0, 3, [{ field: 'id', dir: 'ASC'}], [])

    const objectValue = result.result[0].data   // JSONB object {foo: bar}
    const stringScalar = result.result[1].data  // JSONB string scalar 'hello'
    const jsonLikeScalar = result.result[2].data // JSONB string scalar '{"foo":"bar"}'

    const mutatedObject = String(Mutators.jsonMutator(objectValue))
    const mutatedScalar = Mutators.jsonMutator(stringScalar)
    const mutatedJsonLike = Mutators.jsonMutator(jsonLikeScalar)

    // Object displays without outer quotes
    expect(mutatedObject).toBe('{"foo":"bar"}')

    // String scalar displays WITH outer quotes (the bug was these looked the same)
    expect(mutatedScalar).toBe('"hello"')

    // JSON-like string scalar displays with outer quotes and escaped inner quotes
    expect(mutatedJsonLike).toBe('"{\\"foo\\":\\"bar\\"}"')

    // The key check: the JSON-like string scalar must look different from the object
    expect(mutatedJsonLike).not.toBe(mutatedObject)
  })
})
