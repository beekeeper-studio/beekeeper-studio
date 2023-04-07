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
  { version: '9.3', socket: false},
  { version: '9.4', socket: false},
  { version: 'latest', socket: false },
  { version: 'latest', socket: true },
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

      if (dockerTag == 'latest') {
        await util.connection.executeQuery(`
          CREATE TABLE partitionedtable (
            recordId SERIAL,
            number INT
          ) PARTITION BY RANGE(number);
          CREATE TABLE partition_1 PARTITION OF partitionedtable
          FOR VALUES FROM (0) TO (10);
          CREATE TABLE another_partition PARTITION OF partitionedtable
          FOR VALUES FROM (11) TO (20);
          CREATE TABLE party PARTITION OF partitionedtable
          FOR VALUES FROM (21) TO (30);
        `);
      }

      await util.connection.executeQuery(`
          CREATE SCHEMA schema1;
          CREATE TABLE schema1.duptable (
            "id" INTEGER PRIMARY KEY
          );
          CREATE SCHEMA schema2;
          CREATE TABLE schema2.duptable (
            "id" INTEGER PRIMARY KEY
          );
        `);

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
    it("Should clone interval values in pg-intervalStyle format not json (issue-1442)", async () => {

      // insert a valid pg interval value as a "postgres IntervalStyle" string
      // https://www.postgresql.org/docs/15/datatype-datetime.html#DATATYPE-INTERVAL-INPUT
      const insertedValue = "00:15:00";

      const insertedData = {
        id: 1,
        amount_of_time: insertedValue
      };
      console.info('inserted data: ', insertedData)
      await util.knex("test_intervals").insert(insertedData)

      // select the inserted row back out
      const results = await util.knex.select().table('test_intervals')
      expect(results.length).toBe(1)
      const retrievedData = results[0]
      console.log('retrieved data: ', retrievedData)

      // retrieved interval value should be the same interval (string) "00:15:00"
      expect ( retrievedData ).toStrictEqual({
        id: 1,
        amount_of_time: insertedValue // should still be the string not an object
      })
    })

    it("Should be able to list partitions for a table", async () => {
      if (dockerTag == 'latest') {
        const partitions = await util.connection.listTablePartitions('partitionedtable');

        expect(partitions.length).toBe(3);
      }
    })

    // regression test for Bug #1564 "BUG: Tables appear twice in UI"
    it("Should not have duplicate tables for tables with the same name in different schemas", async () => {
      const tables = await util.connection.listTables();
      const schema1 = tables.filter((t) => t.schema == "schema1");
      const schema2 = tables.filter((t) => t.schema == "schema2");

      expect(schema1.length).toBe(1);
      expect(schema2.length).toBe(1);
    });

    describe("Common Tests", () => {
      runCommonTests(() => util)
    })


  })
}

TEST_VERSIONS.forEach(({ version, socket }) => testWith(version, socket))
