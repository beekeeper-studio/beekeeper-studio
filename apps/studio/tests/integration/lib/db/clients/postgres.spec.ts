import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests, runReadOnlyTests } from './all'
import { TableInsert } from '../../../../../src/lib/db/models'
import { errorMessages } from '../../../../../src/lib/db/clients/utils'
import { PostgresClient, STQOptions } from '../../../../../src/lib/db/clients/postgresql'
import { safeSqlFormat } from '@/common/utils';
import _ from 'lodash';
import { createServer } from '@commercial/backend/lib/db/server'
import { PostgresTestDriver } from './postgres/container'
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_VERSIONS = [
  { version: '9.3', socket: false, readonly: false },
  { version: '9.3', socket: false, readonly: true },
  { version: '9.4', socket: false, readonly: false },
  { version: '9.4', socket: false, readonly: true },
  { version: '16.4', socket: true, readonly: false },
  { version: '16.4', socket: false, readonly: true },
  { version: '16.4', socket: false, readonly: false },
] as const

type TestVersion = typeof TEST_VERSIONS[number]['version']
let configUsed = null

function testWith(dockerTag: TestVersion, socket = false, readonly = false) {
  describe(`Postgres [${dockerTag} - socket? ${socket} - database read-only mode? ${readonly}]`, () => {
    jest.setTimeout(dbtimeout)

    let container: StartedTestContainer;
    let util: DBTestUtil

    beforeAll(async () => {
      // environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
      // container = environment.getContainer("psql_1")

      await PostgresTestDriver.start(dockerTag, socket, readonly)

      container = PostgresTestDriver.container
      util = new DBTestUtil(PostgresTestDriver.config, "banana", PostgresTestDriver.utilOptions)
      await util.setupdb()
      configUsed = PostgresTestDriver.config

      await util.knex.schema.createTable('witharrays', (table) => {
        table.integer("id").primary()
        table.specificType('names', 'TEXT []')
        table.text("normal")
      })

      await util.knex.raw(
        `CREATE TYPE this_is_a_mood AS ENUM ('sad', 'ok', 'happy');`
      )

      await util.knex.raw(`
        CREATE TABLE
          public.moody_people (
            id serial NOT NULL,
            current_mood this_is_a_mood NULL DEFAULT 'sad'::this_is_a_mood
          );
      `)

      await util.knex.raw(`
        CREATE TABLE
          public.extra_moody_people (
            id serial NOT NULL,
            current_moods this_is_a_mood[] NULL DEFAULT '{sad, happy}'
          );
      `)

      if (dockerTag == '16.4') {
        await util.knex.raw(`
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

          CREATE TABLE parent (
            id INTEGER PRIMARY KEY
          );
          CREATE TABLE child (
            name VARCHAR(100)
          ) INHERITS (parent);
        `);
      }

      await util.knex.raw(`
          CREATE SCHEMA schema1;
          CREATE TABLE schema1.duptable (
            "id" INTEGER PRIMARY KEY
          );
          CREATE SCHEMA schema2;
          CREATE TABLE schema2.duptable (
            "id" INTEGER PRIMARY KEY
          );
        `);

      await util.knex.raw(`
          CREATE SCHEMA "1234";
          CREATE TABLE "1234"."5678" (
            "id" SERIAL PRIMARY KEY,
            "9101" INTEGER
          );
        `);

      await util.knex("witharrays").insert({ id: 1, names: ['a', 'b', 'c'], normal: 'foo' })

      // test table for issue-1442 "BUG: INTERVAL columns receive wrong value when cloning row"
      await util.knex.schema.createTable('test_intervals', (table) => {
        table.integer('id').primary()
        table.specificType('amount_of_time', 'interval')
      })

      await util.knex.raw(`
       CREATE TABLE public.test_pk_script (
          first_key character varying(255) NOT NULL,
          second_key character varying(255) NOT NULL,
          PRIMARY KEY (first_key, second_key)
        );
      `)
    })

    afterAll(async () => {
      await util.disconnect()
      if (container) {
        await container.stop()
      }

    })

    it("Should connect to localhost without SSL even if redshiftOptions isn't empty", async () => {
      configUsed.redshiftOptions = { iamAuthenticationEnabled: false }
      const server = createServer(configUsed)
      const connection = server.createConnection('banana')
      await connection.connect()
      await connection.listTables()
    })

    it("Should allow me to update rows with an empty array", async () => {
      const columns = await util.connection.listTableColumns("witharrays")
      const nameColumn = columns.find((c) => c.columnName === "names")
      const updates = [
        {
          value: "[]",
          column: "names",
          primaryKeys: [{
            column: 'id', value: 1
          }],
          columnType: "_text",
          columnObject: nameColumn,
          table: "witharrays"
        }
      ]

      if (util.connection.readOnlyMode) {
        await expect(util.connection.applyChanges({ updates, inserts: [], deletes: [] })).rejects.toThrow(errorMessages.readOnly)
      } else {
        const result = await util.connection.applyChanges({ updates, inserts: [], deletes: [] })
        expect(result).toMatchObject([
          { id: 1, names: [], normal: 'foo' }
        ])
      }
    })

    it("Should be able to get a table create script without erroring", async () => {
      // checking that create table script with a custom type can be retrieved.
      const result = await util.connection.getTableCreateScript("moody_people")
      expect(result).not.toBeNull()
    })

    it("Should be able to get a table create script with more than a column as primary key", async () => {
      const result = await util.connection.getTableCreateScript("test_pk_script")

      expect(result).not.toBeNull()
      expect(result).toStrictEqual('CREATE TABLE public.test_pk_script (\n' +
        '  first_key character varying(255) NOT NULL,\n' +
        '  second_key character varying(255) NOT NULL\n' +
        ');\n' +
        '\n' +
        'ALTER TABLE public.test_pk_script ADD CONSTRAINT test_pk_script_pkey PRIMARY KEY (first_key, second_key)')
    });

    it("Should allow me to insert a row with an array", async () => {
      const newRow: TableInsert = {
        table: 'witharrays',
        schema: 'public',
        data: [
          { names: [], id: 2, normal: 'xyz' }
        ]
      }

      if (util.connection.readOnlyMode) {
        await expect(util.connection.applyChanges(
          { updates: [], inserts: [newRow], deletes: [] }
        )).rejects.toThrow(errorMessages.readOnly)
      } else {
        const result = await util.connection.applyChanges(
          { updates: [], inserts: [newRow], deletes: [] }
        )
        expect(result).not.toBeNull()
      }
    })

    it("Should allow me to update rows with array types", async () => {
      const columns = await util.connection.listTableColumns("witharrays")
      const nameColumn = columns.find((c) => c.columnName === "names")

      const updates = [{
        value: ["x", "y", "z"],
        column: "names",
        columnObject: nameColumn,
        primaryKeys: [
          { column: 'id', value: 1 }
        ],
        columnType: "_text",
        table: "witharrays",
      },
      {
        value: 'Bananas',
        table: 'witharrays',
        column: 'normal',
        primaryKeys: [
          { column: 'id', value: 1 }
        ],
        columnType: 'text',
      }
      ]
      if (util.connection.readOnlyMode) {
        await expect(util.connection.applyChanges({ updates, inserts: [], deletes: [] })).rejects.toThrow(errorMessages.readOnly)
      } else {
        const result = await util.connection.applyChanges({ updates, inserts: [], deletes: [] })
        expect(result).toMatchObject([{ id: 1, names: ['x', 'y', 'z'], normal: 'Bananas' }])
      }

    })


    it("Should allow me to update rows with array types when passed as string", async () => {
      const columns = await util.connection.listTableColumns("witharrays")
      const nameColumn = columns.find((c) => c.columnName === "names")

      const updates = [{
        value: '["x", "y", "z"]',
        column: "names",
        columnObject: nameColumn,
        primaryKeys: [
          { column: 'id', value: 1 }
        ],
        columnType: "_text",
        table: "witharrays",
      },
      {
        value: 'Bananas',
        table: 'witharrays',
        column: 'normal',
        primaryKeys: [
          { column: 'id', value: 1 }
        ],
        columnType: 'text',
      }
      ]

      if (util.connection.readOnlyMode) {
        await expect(util.connection.applyChanges({ updates, inserts: [], deletes: [] })).rejects.toThrow(errorMessages.readOnly)
      } else {
        const result = await util.connection.applyChanges({ updates, inserts: [], deletes: [] })
        expect(result).toMatchObject([{ id: 1, names: ['x', 'y', 'z'], normal: 'Bananas' }])
      }
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
      expect(retrievedData).toStrictEqual({
        id: 1,
        amount_of_time: insertedValue // should still be the string not an object
      })
    })

    it("Should be able to list partitions for a table", async () => {
      if (dockerTag == '16.4') {
        const partitions = await util.connection.listTablePartitions('partitionedtable');

        expect(partitions.length).toBe(3);
      }
    })


    // regression test for Bug #1564 "BUG: Tables appear twice in UI"
    it("Should not have duplicate tables for tables with the same name in different schemas", async () => {
      const tables = await util.connection.listTables({ schema: null });
      const schema1 = tables.filter((t) => t.schema == "schema1");
      const schema2 = tables.filter((t) => t.schema == "schema2");

      expect(schema1.length).toBe(1);
      expect(schema2.length).toBe(1);
    });

    // regression test for Bug #1572 "Only schemas that show are now information_schema and pg_catalog"
    it("Numeric names should still be pulled back in queries", async () => {
      const tables = await util.connection.listTables({ schema: '1234' });
      const columns = await util.connection.listTableColumns('5678', '1234');

      expect(tables.length).toBe(1);
      expect(tables[0].name).toBe('5678');
      expect(columns.map((c) => c.columnName).includes('9101'));
    });

    // regression tests for Bug #1583 "Only parent table shows in UI when using INHERITS"
    it("Inherited tables should NOT behave like partitioned tables", async () => {
      if (dockerTag == '16.4') {
        const tables = await util.connection.listTables({ schema: 'public', tables: ['parent', 'child'] });
        const partitions = await util.connection.listTablePartitions('parent');
        const parent = tables.find((value) => value.name == 'parent');
        const child = tables.find((value) => value.name == 'child');

        expect(partitions.length).toBe(0);
        expect(parent.parenttype).toBe(null);
        expect(child.parenttype).toBe('r');
      }
    })

    it("Partitions should have parenttype 'p'", async () => {
      if (dockerTag == '16.4') {
        const tables = await util.connection.listTables({ schema: 'public', tables: ['partition_1', 'another_partition', 'party'] });
        const partition1 = tables.find((value) => value.name == 'partition_1');
        const another = tables.find((value) => value.name == 'another_partition');
        const party = tables.find((value) => value.name == 'party');

        expect(partition1.parenttype).toBe('p');
        expect(another.parenttype).toBe('p');
        expect(party.parenttype).toBe('p');
      }
    })
    // END regression tests for Bug #1583

    it("should build select top query with inline parameters", async () => {
      const client = new PostgresClient(null, null);
      const fmt = (sql: string) =>
        safeSqlFormat(sql, { language: 'postgresql' })

      const options: STQOptions = {
        table: "jobs",
        offset: 0,
        limit: 100,
        orderBy: [{ field: "hourly_rate", dir: "ASC" }],
        filters: [
          {
            field: "job_name",
            type: "in",
            value: ["Programmer", "Surgeon's Assistant"],
          },
        ],
        selects: ["*"],
        schema: "public",
        version: {
          version: "",
          number: 0,
          hasPartitions: false,
        },
      }

      const { query: defaultQuery } = client.buildSelectTopQueries(options)
      const { query: inlineParams } = client.buildSelectTopQueries({
        ...options,
        inlineParams: true
      })

      const expectedDefault = `SELECT * FROM "public"."jobs" WHERE "job_name" IN ($1,$2) ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`
      const expectedInline = `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`

      expect(fmt(defaultQuery)).toBe(fmt(expectedDefault))
      expect(fmt(inlineParams)).toBe(fmt(expectedInline))
    });

    // regression test for #1734
    it("should be able to insert to a table with a ? in a column name", async () => {
      // We have enough coverage of read only mode.
      if (util.connection.readOnlyMode) return;

      const data = {
        str_col: 'hello?',
        another_str_col: '???'
      };
      data['approved?'] = true;
      const newRow: TableInsert = {
        table: 'withquestionmark',
        schema: 'public',
        data: [
          data
        ]
      }

      const query = await util.connection.query(`
        CREATE TABLE IF NOT EXISTS public.withquestionmark (
          "approved?" boolean NULL DEFAULT false,
          str_col character varying(255) NOT NULL,
          another_str_col character varying(255) NOT NULL PRIMARY KEY
        );
      `);

      await query.execute();

      const payload = { updates: [], inserts: [newRow], deletes: [] }
      const result = await util.connection.applyChanges(payload)
      expect(result).not.toBeNull()
    })

    it("should be able to list table columns with correct types", async () => {
      await util.knex.schema.createTable('various_types', (table) => {
        table.integer("id").primary()
        table.specificType('amount', 'double precision')
      })

      const columns = await util.connection.listTableColumns('various_types', 'public');
      expect(columns.map((row) => _.pick(row, ['columnName', 'dataType']))).toEqual([
        {
          columnName: 'id',
          dataType: 'int4(32,0)'
        },
        {
          columnName: 'amount',
          dataType: 'float8(53)'
        }
      ])
    })

    it("should be able to define array column correctly", async () => {
      const arrayTable = await util.connection.listTableColumns('witharrays');
      const enumTable = await util.connection.listTableColumns('moody_people');
      const enumArrayTable = await util.connection.listTableColumns('extra_moody_people');

      const arrayColumn = arrayTable.find((col) => col.columnName === 'names')
      const enumColumn = enumTable.find((col) => col.columnName === 'current_mood')
      const enumArrayColumn = enumArrayTable.find((col) => col.columnName === 'current_moods')

      expect(arrayColumn.array).toBeTruthy()
      expect(enumColumn.array).toBeFalsy()
      expect(enumArrayColumn.array).toBeTruthy()
    })

    it("Should be able to add comments to columns and retrieve them", async () => {
      // Create a test table with column comments
      await util.knex.schema.createTable('comment_test', (table) => {
        table.integer("id").primary().comment('Primary key');
        table.string("name").comment('Name of the person');
      });

      // Retrieve the columns and check for comments
      const columns = await util.connection.listTableColumns('comment_test', 'public');
      const idColumn = columns.find((col) => col.columnName === 'id');
      const nameColumn = columns.find((col) => col.columnName === 'name');

      expect(idColumn.comment).toBe('Primary key');
      expect(nameColumn.comment).toBe('Name of the person');
    });

    if (dockerTag === '16.4') {
      it("should list indexes with info", async () => {
        await util.knex.schema.createTable('has_indexes_2', (table) => {
          table.specificType("text", "varchar(255) UNIQUE NULLS NOT DISTINCT")
        })
        const indexes = await util.connection.listTableIndexes('has_indexes_2')
        expect(indexes[0].nullsNotDistinct).toBeTruthy()
      })
    }

    describe("Common Tests", () => {
      if (readonly) {
        runReadOnlyTests(() => util)
      } else {
        runCommonTests(() => util, { dbReadOnlyMode: readonly })
      }
    })
  })
}

TEST_VERSIONS.forEach(({ version, socket, readonly }) => testWith(version, socket, readonly))

describe(`Postgres (custom socket port connection)`, () => {
  jest.setTimeout(dbtimeout)

  let temp: string;
  let container: StartedTestContainer;
  beforeAll(async () => {
      const startupTimeout = dbtimeout * 2;
      temp = fs.mkdtempSync(path.join(os.tmpdir(), 'psql-'));
      container = await new GenericContainer(`postgres`)
        .withEnvironment({ "POSTGRES_PASSWORD": "example" })
        .withHealthCheck({
          test: ["CMD-SHELL", "psql -h localhost -U postgres -c \"select 1\" -d banana > /dev/null"],
          interval: 2000,
          timeout: 3000,
          retries: 10,
          startPeriod: 5000,
        })
        .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
        // .withWaitStrategy(Wait.forHealthCheck())
        .withBindMounts([{
          source: path.join(temp, "postgresql"),
          target: "/var/run/postgresql",
          mode: "rw"
        }])
        .withStartupTimeout(startupTimeout)
        .withExposedPorts(5433)
        .withCommand(['postgres', '-p', '5433'])
        .start()
  })

  afterAll(async () => {
    await container?.stop()
  })

  it("should be able to connect", async () => {
    const server = createServer({
      client: 'postgresql',
      host: 'notarealhost',
      port: 5433,
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
      socketPath: path.join(temp, "postgresql"),
      socketPathEnabled: true,
      readOnlyMode: false,
    })
    const connection = server.createConnection()
    await connection.connect()
    const results = await connection.executeQuery("SELECT 1 as a")
    expect(results[0].rows[0]).toEqual({ a: 1 })
    await connection.disconnect()
  })
})
