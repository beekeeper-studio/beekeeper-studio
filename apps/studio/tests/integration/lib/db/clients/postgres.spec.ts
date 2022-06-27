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

      await util.knex("witharrays").insert({ id: 1, names: ['a', 'b', 'c'], normal: 'foo' })
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

    describe("Common Tests", () => {
      runCommonTests(() => util)
    })


  })
}

TEST_VERSIONS.forEach(({ version, socket }) => testWith(version, socket))
