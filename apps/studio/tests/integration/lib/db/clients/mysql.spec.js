import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import os from 'os'
import fs from 'fs'
import path from 'path'
import data_mutators from '../../../../../src/mixins/data_mutators';
import { errorMessages } from '../../../../../src/lib/db/clients/utils'
import { runCommonTests, runReadOnlyTests } from './all'

const TEST_VERSIONS = [
  {version: '5.7'},
  {version: '5.7', readonly: true},
  { version: '8', socket: false, readonly: true},
  { version: '8', socket: false},
  { version: '8', socket: true }
]


function testWith(tag, socket = false, readonly = false) {
  describe(`Mysql [${tag} socket? ${socket}]`, () => {
    jest.setTimeout(dbtimeout)

    let container;
    /** @type {DBTestUtil} */
    let util

    beforeAll(async () => {
      const timeoutDefault = 5000
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-'));
      fs.chmodSync(temp, "777")
      container = await new GenericContainer("mysql", tag)
        .withName("testmysql")
        .withEnv("MYSQL_ROOT_PASSWORD", "test")
        .withEnv("MYSQL_DATABASE", "test")
        .withExposedPorts(3306)
        .withStartupTimeout(dbtimeout)
        .withBindMount(temp, '/var/run/mysqld/', 'rw')
        .start()
      jest.setTimeout(timeoutDefault)
      const config = {
        client: 'mysql',
        host: container.getHost(),
        port: container.getMappedPort(3306),
        user: 'root',
        password: 'test',
        readOnlyMode: readonly
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

      const dotTableCreator = "CREATE TABLE `foo.bar`(id integer, name varchar(255))"
      const dotInsert = "INSERT INTO `foo.bar`(id, name) values(1, 'Dot McDot')"
      await util.knex.schema.raw(functionDDL)
      await util.knex.schema.raw(routine1DDL)
      await util.knex.schema.raw(routine2DDL)
      await util.knex.schema.raw("CREATE TABLE bittable(id int, bitcol bit NOT NULL)");
      await util.knex.schema.raw(dotTableCreator);
      await util.knex.schema.raw(dotInsert);
    })

    afterAll(async () => {
      await util.disconnect()
      if (container) {
        await container.stop()
      }
    })

    describe("Common Tests", () => {
      if (readonly) {
        runReadOnlyTests(() => util)
      } else {
        runCommonTests(() => util, { dbReadOnlyMode: readonly })
      }
    })

    it("Should work properly with tables that have dots in them", async () => {
      const keys = await util.connection.getPrimaryKeys("foo.bar")
      expect(keys).toMatchObject([])
      const r = await util.connection.selectTop("foo.bar", 0, 10, [{field: 'id', dir: 'ASC'}])
      const result = r.result.map((r) => r.name || r.NAME)
      expect(result).toMatchObject(['Dot McDot'])
      const tcRes = await util.connection.getTableCreateScript("foo.bar")
      expect(tcRes).not.toBeNull()
      // shouldn't error
      await util.connection.getTableReferences("foo.bar")
      const properties = await util.connection.getTableProperties("foo.bar")
      expect(properties).not.toBeNull()
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
      const runner = await util.connection.query('SELECT CONCAT("A", "?", "B") as a limit 1')
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

      if (util.connection.readOnlyMode) {
        await expect(util.connection.applyChanges({ inserts })).rejects.toThrow(errorMessages.readOnly)
      } else {
        await util.connection.applyChanges({ inserts })
        const data = await util.connection.selectTop('insertbits', 0, 10, [])

        expect(data.result.length).toBe(1)
        const single = data_mutators.methods.bit1Mutator(data.result[0].onebit)
        expect(single).toBe(1)
      }
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

      if (util.connection.readOnlyMode) {
        await expect(util.connection.applyChanges({ updates: values })).rejects.toThrow(errorMessages.readOnly)
      } else {
        const results = await util.connection.applyChanges({ updates: values })
        expect(results.length).toBe(2)
        const fixed = data_mutators.methods.bitMutator('mysql', results[1].thirtytwo)
        expect(fixed).toBe("b'00000000000000000000010000000000'")
      }

    })


    it("should be able to create / alter unsigned columns", async () => {
      if (util.connection.readOnlyMode) {
        // skip this in read only mode
        // TODO: make this appropriately fail if the connection is read only
        return;
      }
      await util.knex.schema.createTable("unsigned_integers", (table) => {
        table.integer("number").primary()
      })

      await util.connection.alterTable({
        table: "unsigned_integers",
        adds: [{ columnName: "tiny_number", dataType: "tinyint unsigned" }],
        alterations: [{
          changeType: "dataType",
          columnName: "number",
          newValue: "int unsigned",
        }],
      })
      await expect(util.connection.applyChanges({
        inserts: [{
          table: 'unsigned_integers',
          data: [{ number: -1, tiny_number: -1 }],
        }]
      })).rejects.toThrowError()
    })

    // Regression test for #1945 -> cloning with bit fields doesn't work
    it("Should be able to insert with bit fields", async () => {
      if (readonly) return;

      const changes = {
        inserts: [
          {
            table: 'bittable',
            data: [
              {
                id: 1,
                bitcol: 0
              },
              {
                id: 2,
                bitcol: true
              }
            ]
          }
        ]
      };

      await util.connection.applyChanges(changes);

      const results = await util.knex.select().table('bittable');
      expect(results.length).toBe(2);

      const firstResult = { ...results[0] };
      const secondResult = { ...results[1] };

      expect(firstResult.bitcol[0]).toBe(0)
      expect(secondResult.bitcol[0]).toBe(1)
    })

    describe("Index Prefixes", () => {
      beforeAll(async () => {
        await util.knex.schema.createTable("has_prefix_indexes", (table) => {
          table.specificType("one", "text")
          table.specificType("two", "blob")
        })
        await util.knex.schema.raw("CREATE INDEX text_index ON has_prefix_indexes (one(10))")
      })

      it("Should be able to list indexes with custom prefixes correctly", async () => {
        const indexes = await util.connection.listTableIndexes('has_prefix_indexes')
        expect(indexes[0].columns[0].prefix).toBe('10')
      })

      it("Should be able to create indexes with custom prefixes correctly", async () => {
        if (readonly) return

        await util.connection.alterIndex({
          table: 'has_prefix_indexes',
          additions: [{
            name: 'custom_prefix_index',
            columns: [{ name: 'two', order: 'ASC', prefix: 5 }],
          }],
        })

        const indexes = await util.connection.listTableIndexes('has_prefix_indexes')
        expect(indexes[1].columns[0].prefix).toBe('5')

        await util.knex.schema.raw("DROP INDEX custom_prefix_index ON has_prefix_indexes")
      })
    })
  })


}

TEST_VERSIONS.forEach(({ version, socket, readonly }) => testWith(version, socket, readonly))

