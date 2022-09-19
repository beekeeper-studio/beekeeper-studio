import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"
import os from 'os'
import fs from 'fs'
import path from 'path'
import data_mutators from '../../../../../src/mixins/data_mutators';
import { itShouldInsertGoodData, itShouldNotInsertBadData, itShouldApplyAllTypesOfChanges, itShouldNotCommitOnChangeError, runCommonTests } from './all'

const TEST_VERSIONS = [
  {version: '5.7'}, 
  { version: '8', socket: false},
  { version: '8', socket: true }
]


function testWith(tag, socket = false) {
  describe(`Mysql [${tag} socket? ${socket}]`, () => {

    let container;
    let util

    beforeAll(async () => {
      const timeoutDefault = 5000
      jest.setTimeout(dbtimeout)
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-'));
      fs.chmodSync(temp, "777")
      container = await new GenericContainer("mysql", tag)
        .withName("testmysql")
        .withEnv("MYSQL_ROOT_PASSWORD", "test")
        .withEnv("MYSQL_DATABASE", "test")
        .withExposedPorts(3306)
        .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
        .withBindMount(temp, '/var/run/mysqld/', 'rw')
        .start()
      jest.setTimeout(timeoutDefault)
      const config = {
        client: 'mysql',
        host: container.getContainerIpAddress(),
        port: container.getMappedPort(3306),
        user: 'root',
        password: 'test'
      }
      if (socket) {
        config.host = 'somefakehost'
        config.socketPathEnabled = true
        config.socketPath = path.join(temp, 'mysqld.sock')
      }
      util = new DBTestUtil(config, "test", { dialect: 'mysql' })
      await util.setupdb()

      const functionDDL = `
        CREATE FUNCTION isEligible(
        age INTEGER,
        bananas varchar(30)
        )
        RETURNS VARCHAR(20)
        DETERMINISTIC
        BEGIN
        IF age > 18 THEN
        RETURN ("yes");
        ELSE
        RETURN ("No");
        END IF;
        END
    `

      const routine1DDL = `
    CREATE PROCEDURE proc_userdetails(IN uid INT)
      BEGIN
      SELECT id, name, email, status FROM user WHERE id = uid;
      END
    `
      const routine2DDL = `
      CREATE PROCEDURE no_parameters()
        BEGIN
        SELECT id, name, email, status FROM user limit 10;
        END
    `
      await util.knex.schema.raw(functionDDL)
      await util.knex.schema.raw(routine1DDL)
      await util.knex.schema.raw(routine2DDL)
    })

    afterAll(async () => {
      if (util.connection) {
        await util.connection.disconnect()
      }
      if (container) {
        await container.stop()
      }
    })

    describe("Common Tests", () => {
      runCommonTests(() => util)
    })

    it("Should fetch routines correctly", async () => {
      const routines = await util.connection.listRoutines()
      expect(routines.length).toBe(3)
      const procedures = routines.filter((r) => (r.type === 'procedure'))
      const functions = routines.filter((r) => (r.type === 'function'))

      expect(functions.length).toBe(1)
      expect(procedures.length).toBe(2)

      expect(procedures.map((p) => (p.name))).toMatchObject(['no_parameters', 'proc_userdetails'])
      expect(functions.map((p) => (p.name))).toMatchObject(['isEligible'])

      expect(procedures.find((p) => (p.name === 'proc_userdetails')).routineParams.length).toBe(1)
      expect(procedures.find((p) => (p.name === 'no_parameters')).routineParams.length).toBe(0)
      expect(functions.find((p) => (p.name === 'isEligible')).routineParams.length).toBe(2)
    })

    it("Should not think there are params when there aren't", async () => {
      const runner = util.connection.query('SELECT CONCAT("A", "?", "B") as a limit 1')
      const results = await runner.execute()
      expect(results[0].rows[0]['c0']).toEqual('A?B')
    })

    it("Should insert bit values properly", async() => {
      await util.knex.schema.createTable("insertbits", (table) => {
        table.integer("id").primary()
        table.specificType("thirtytwo", "bit(32)")
        table.specificType("onebit", "bit(1)")
      })

      const inserts = [
        {
          table: 'insertbits',
          data: [
            { id: 1, onebit: '1', thirtytwo: "b'00000000000000000000010000000000'"},
          ]
        }
      ]
      await util.connection.applyChanges({ inserts })
      const data = await util.connection.selectTop('insertbits', 0, 10, [])


      expect(data.result.length).toBe(1)
      const single = data_mutators.methods.bit1Mutator(data.result[0].onebit)
      expect(single).toBe(1)
    })

    it("Should update bit values properly", async () => {
      await util.knex.schema.createTable("withbits", (table) => {
        table.integer("id").primary()
        table.specificType("thirtytwo", "bit(32)")
        table.specificType("onebit", "bit(1)")
      })

      await util.knex("withbits").insert({ id: 1, thirtytwo: 1, onebit: 1 })

      const basics = {
        primaryKeys: [
          { column: 'id', value: 1}
        ],
        table: 'withbits',
      }

      const values = [
        {
          value: '1',
          column: 'onebit',
          columnType: 'bit(1)',
          ...basics
        },
        {
          value: "b'00000000000000000000010000000000'",
          column: 'thirtytwo',
          columnType: 'bit(32)',
          ...basics
        }
      ]
      const results = await util.connection.applyChanges({ updates: values })
      expect(results.length).toBe(2)
      const fixed = data_mutators.methods.bitMutator(results[1].thirtytwo)
      expect(fixed).toBe("b'00000000000000000000010000000000'")
    })


  })


}

TEST_VERSIONS.forEach(({ version, socket }) => testWith(version, socket))

