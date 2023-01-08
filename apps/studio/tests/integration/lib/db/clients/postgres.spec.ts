import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"
import { runCommonTests } from './all'
import { IDbConnectionServerConfig } from '@/lib/db/client'
import { TableInsert } from '../../../../../src/lib/db/models'
import os from 'os'
import fs from 'fs'
import path from 'path'
const TEST_VERSIONS = [
  //{ version: '9.3', socket: false},
  //{ version: '9.4', socket: false},
  { version: 'latest', socket: false }
  // { version: 'latest', socket: true },
]

function testWith(dockerTag, socket = false) {
  describe(`Postgres [${dockerTag} - socket? ${socket}]`, () => {
    let container: StartedTestContainer;
    let util: DBTestUtil


    beforeAll(async () => {
      const timeoutDefault = 10000
      jest.setTimeout(dbtimeout)
      // environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
      // container = environment.getContainer("psql_1")

      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'psql-'));
      container = await new GenericContainer("postgres", dockerTag)
        .withEnv("POSTGRES_PASSWORD", "example")
        .withEnv("POSTGRES_DB", "banana")
        .withExposedPorts(5432)
        .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
        .withBindMount(path.join(temp, "postgresql"), "/var/run/postgresql", "rw")
        .start()
      jest.setTimeout(timeoutDefault)
      const config: IDbConnectionServerConfig = {
        client: 'postgresql',
        host: container.getContainerIpAddress(),
        port: container.getMappedPort(5432),
        user: 'postgres',
        password: 'example',
        osUser: 'foo',
        ssh: null,
        sslCaFile: null,
        sslCertFile: null,
        sslKeyFile: null,
        sslRejectUnauthorized: false,
        ssl: false,
        domain: null,
        socketPath: null,
        socketPathEnabled: false,
      }

      if (socket) {
        config.host = 'notarealhost'
        config.socketPathEnabled = true
        config.socketPath = path.join(temp, "postgresql")
      }

      util = new DBTestUtil(config, "banana", { dialect: 'postgresql', defaultSchema: 'public' })
      await util.setupdb()

      await util.knex.schema.createTable('witharrays', (table) => {
        table.integer("id").primary()
        table.specificType('names', 'TEXT []')
        table.text("normal")
      })

      await util.knex("witharrays").insert({ id: 1, names: ['a', 'b', 'c'], normal: 'foo' })

      // test table for issue-1442 "BUG: INTERVAL columns receive wrong value when cloning row"
      await util.knex.schema.createTable('test_intervals', (table) => {
        table.integer('id').primary()
        table.specificType('amount_of_time', 'interval')
      })

    })

    afterAll(async () => {
      if (util.connection) {
        await util.connection.disconnect()
      }
      if (container) {
        await container.stop()
      }
    })


    it("Should allow me to update rows with an empty array", async () => {
      const updates = [
        {
          value: "[]",
          column: "names",
          primaryKeys: [{
            column: 'id', value: 1
          }],
          columnType: "_text",
          table: "witharrays"
        }
      ]

      const result = await util.connection.applyChanges({ updates, inserts: [], deletes: []})
      expect(result).toMatchObject([
        { id: 1, names: [], normal: 'foo' }
      ])
    })

    it("Should allow me to insert a row with an array", async () => {
      const newRow: TableInsert = {
        table:'witharrays',
        schema: 'public',
        data: [
          {names: '[]', id: 2, normal: 'xyz'}
        ]
      }

      const result = await util.connection.applyChanges(
        { updates: [], inserts: [newRow], deletes: []}
      )
      expect(result).not.toBeNull()
    })

    it("Should allow me to update rows with array types", async () => {

      const updates = [{
        value: '["x", "y", "z"]',
        column: "names",
        primaryKeys: [
          { column: 'id', value: 1}
        ],
        columnType: "_text",
        table: "witharrays",
      },
      {
        value: 'Bananas',
        table: 'witharrays',
        column: 'normal',
        primaryKeys: [
          { column: 'id', value: 1}
        ],
        columnType: 'text',
      }
      ]
      const result = await util.connection.applyChanges({ updates, inserts: [], deletes: [] })
      expect(result).toMatchObject([{ id: 1, names: ['x', 'y', 'z'], normal: 'Bananas' }])
    })

    // regression test for Bug #1442 "BUG: INTERVAL columns receive wrong value when cloning row"
    it("Shouldn't CLONE a 15 minute interval value as 15 seconds (issue-1442)", async () => {

      // insert a valid pg interval value
      // in "postgres" IntervalStyle https://www.postgresql.org/docs/15/datatype-datetime.html#DATATYPE-INTERVAL-INPUT
      const insertedValue = "00:15:00";
      console.info(`insertedValue: ${insertedValue}`)

      await util.knex("test_intervals").insert({
        id: 1,
        amount_of_time: insertedValue
      })

      // select the inserted row back out
      let results = await util.knex.select().table('test_intervals')
      expect(results.length).toBe(1)
      const originalRow = results[0]

      const retrievedValue = originalRow.amount_of_time
      console.info('retrievedValue: ', retrievedValue)

      // expect(results[0]).toStrictEqual({
      //   id: 1,
      //   // comes back in default "postgres" IntervalStyle https://www.postgresql.org/docs/15/datatype-datetime.html#DATATYPE-INTERVAL-INPUT
      //   amount_of_time: '1 year 2 mons 3 days 04:05:06'
      // })

      // not in "JSONFriendly" style, as it did before this bugfix
      // "amount_of_time": PostgresInterval { "years": 1, "months": 2, "days": 3, "hours": 4, "minutes": 5, "seconds": 6 },

      // then clone it
      const clonedData = { ...originalRow }

      // bump the pk id
      clonedData.id = 2

      console.log('clonedData: ', clonedData)

      // expect ( clonedRow ).toStrictEqual({
      //   id: 2,
      //   amount_of_time: '1 year 2 mons 3 days 04:05:06'
      // })

      // and re-insert the cloned row
      // await expect(util.connection.applyChanges({ inserts: [{ table: 'test_intervals', data: clonedRow }] })).rejects.not.toThrow()
      // await util.connection.applyChanges({ inserts: [ { ...clonedRow } ] })
      await util.knex("test_intervals").insert( clonedData )

      // we should get back the same, unchanged, interval (amount of time)
      results = await util.knex.select().table('test_intervals')
      expect(results.length).toBe(2)

      const clonedRow = results[1]
      console.log('clonedRow: ', clonedRow)

      const clonedValue = clonedRow.amount_of_time
      console.log('clonedValue: ', clonedValue)

      expect( clonedValue ).toEqual( retrievedValue )


      // const data = await util.connection.selectTop('test_intervals', 0, 2, [])
      // expect(data.result.length).toBe(2)
      // const theNewRow = data.result[1]
      // nope

      // const theNewRow = Mutators.mutateRow(row, this.columns?.map((c) => c.dataType), this.preserveComplex)

      // expect( theNewRow ).toStrictEqual( { ...clonedRow, wtf: "?" } )

    })

    describe("Common Tests", () => {
      runCommonTests(() => util)
    })


  })
}

TEST_VERSIONS.forEach(({ version, socket }) => testWith(version, socket))
