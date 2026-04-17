import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import os from 'os'
import fs from 'fs'
import path from 'path'
import data_mutators from '../../../../../src/mixins/data_mutators';
import { errorMessages } from '../../../../../src/lib/db/clients/utils'
import { runCommonTests, runReadOnlyTests } from './all'
import MySQL5_4KnexClient from '@/shared/lib/knex-mysql5_4'

const TEST_VERSIONS = [
  { version: '5.1', image: 'vettadock/mysql-old', options: { knexClient: MySQL5_4KnexClient, skipTransactions: true } },
  {version: '5.7'},
  {version: '5.7', readonly: true},
  { version: '8', socket: false, readonly: true},
  { version: '8', socket: false},
  { version: '8', socket: true }
]

function testWith(tag, socket = false, readonly = false, image = 'mysql', options = {}) {
  describe(`Mysql [${tag} socket? ${socket}]`, () => {
    jest.setTimeout(dbtimeout)

    let container;
    /** @type {DBTestUtil} */
    let util

    beforeAll(async () => {
      const timeoutDefault = 5000
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-'));
      fs.chmodSync(temp, "777")
      container = await new GenericContainer(`${image}:${tag}`)
        .withName("testmysql")
        .withEnvironment({
          "MYSQL_ROOT_PASSWORD": "test",
          "MYSQL_DATABASE": "test"
        })
        .withExposedPorts(3306)
        .withStartupTimeout(dbtimeout)
        .withBindMounts([{
          source: temp,
          target: '/var/run/mysqld/',
          mode: 'rw'
        }])
        .start()
      await container.exec([
        'mysql', '-u', 'root', '-e',
        `
          CREATE DATABASE IF NOT EXISTS test;
          GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'test';
          GRANT USAGE ON *.* TO 'root'@'%' WITH GRANT OPTION;
          FLUSH PRIVILEGES;
        `,
      ])
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
      util = new DBTestUtil(config, "test", { dialect: 'mysql', skipGeneratedColumns: true, ...options })
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

      // This version doesn't have routine params
      if (tag !== '5.1') {
        expect(procedures.find((p) => (p.name === 'proc_userdetails')).routineParams.length).toBe(1)
        expect(procedures.find((p) => (p.name === 'no_parameters')).routineParams.length).toBe(0)
        expect(functions.find((p) => (p.name === 'isEligible')).routineParams.length).toBe(2)
      }
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
      const applyChanges = () => util.connection.applyChanges({
        inserts: [{
          table: 'unsigned_integers',
          data: [{ number: -1, tiny_number: -1 }],
        }]
      })
      if (tag === '5.1') {
        await expect(applyChanges()).resolves.not.toThrowError()
      } else {
        await expect(applyChanges()).rejects.toThrowError()
      }
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

    it("should parse all binary type columns", async () => {
      await util.knex.raw(`
        CREATE TABLE binary_data_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            binary_fixed BINARY(16),         -- Fixed-length binary data
            binary_var VARBINARY(255),       -- Variable-length binary data
            tiny_blob TINYBLOB,              -- Very small binary data (up to 255 bytes)
            regular_blob BLOB,               -- Small binary data (up to 64 KB)
            medium_blob MEDIUMBLOB,          -- Medium binary data (up to 16 MB)
            large_blob LONGBLOB              -- Large binary data (up to 4 GB)
        );
      `);
      await util.knex.raw(`
        INSERT INTO binary_data_types (
          binary_fixed, binary_var, tiny_blob,
          regular_blob, medium_blob, large_blob
        )
        VALUES (
          CAST('small_value' AS BINARY(16)), 'var_data', 'tiny',
          'blob', 'medium', 'large'
        );
      `)

      const expectedBksFields = [
        { name: 'id', bksType: 'UNKNOWN' },
        { name: 'binary_fixed', bksType: 'BINARY' },
        { name: 'binary_var', bksType: 'BINARY' },
        { name: 'tiny_blob', bksType: 'BINARY' },
        { name: 'regular_blob', bksType: 'BINARY' },
        { name: 'medium_blob', bksType: 'BINARY' },
        { name: 'large_blob', bksType: 'BINARY' },
      ]

      const columns = await util.connection.listTableColumns('binary_data_types')
      expect(columns.map((c) => c.bksField)).toStrictEqual(expectedBksFields)

      const { fields } = await util.connection.selectTop('binary_data_types', 0, 10, [], [])
      expect(fields).toStrictEqual(expectedBksFields)
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

    // Regression test: https://github.com/beekeeper-studio/beekeeper-studio/issues/2640
    it("Should handle columns with binary collation", async () => {
      if (tag == "5.1") return;

      await util.knex.raw(`
        CREATE TABLE binary_collation (
          id int(10) unsigned NOT NULL AUTO_INCREMENT,
          uuid char(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
          name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uuid (uuid)
        ) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
      `);

      await util.knex.raw(`
        INSERT INTO binary_collation (id, uuid, name) VALUES
          (3, 'HIVsRcGKkPFtW', 'lorem'),
          (1, 'Qwsogvtv82FCd', 'ipsum'),
          (5, 'YnFzw1gLeOb1', 'dolor'),
          (2, 'razxDUgYGNAdQ', 'sit'),
          (4, 'yhjMzLPhuIDl', 'amet');
      `);

      const expectedBksFields = [
        { name: 'id', bksType: 'UNKNOWN' },
        { name: 'uuid', bksType: 'UNKNOWN' },
        { name: 'name', bksType: 'UNKNOWN' },
      ];

      const columns = await util.connection.listTableColumns('binary_collation');
      expect(columns.map((c) => c.bksField)).toStrictEqual(expectedBksFields);

      const { fields } = await util.connection.selectTop('binary_collation', 0, 10, [], []);
      expect(fields).toStrictEqual(expectedBksFields);

    })

    describe("Column Reordering", () => {
      beforeEach(async () => {
        if (readonly) return;

        // Drop table if it exists from previous test
        await util.knex.schema.dropTableIfExists("column_reorder_test")
      })

      it("Should reorder columns while preserving NOT NULL constraint", async () => {
        if (readonly) return;

        // Create table with NOT NULL columns
        await util.knex.schema.createTable("column_reorder_test", (table) => {
          table.integer("id").primary()
          table.string("first_name", 100).notNullable()
          table.string("last_name", 100).notNullable()
          table.integer("age")
        })

        // Get initial column order
        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder: move last_name to first position (after id)
        const newOrder = [
          initialColumns[0], // id
          initialColumns[2], // last_name
          initialColumns[1], // first_name
          initialColumns[3], // age
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        // Verify new column order
        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("last_name")
        expect(reorderedColumns[2].columnName).toBe("first_name")
        expect(reorderedColumns[3].columnName).toBe("age")

        // Verify NOT NULL constraint preserved on last_name
        expect(reorderedColumns[1].nullable).toBe(false)
        expect(reorderedColumns[2].nullable).toBe(false)

        // Verify we can't insert null values
        const insertWithNull = async () => {
          await util.knex("column_reorder_test").insert({
            id: 1,
            last_name: null,
            first_name: "John",
            age: 30
          })
        }
        await expect(insertWithNull()).rejects.toThrow()
      })

      it("Should reorder columns while preserving DEFAULT values", async () => {
        if (readonly) return;

        // Create table with default values
        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            name VARCHAR(100),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            score INT DEFAULT 0
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder: move status to second position
        const newOrder = [
          initialColumns[0], // id
          initialColumns[2], // status (with DEFAULT 'active')
          initialColumns[1], // name
          initialColumns[3], // created_at
          initialColumns[4], // score
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        // Verify column order
        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")
        expect(reorderedColumns[1].columnName).toBe("status")

        // Verify DEFAULT value preserved
        expect(reorderedColumns[1].defaultValue).toBe("active")

        // Test that default value works
        await util.knex("column_reorder_test").insert({
          id: 1,
          name: "Test"
        })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result[0].status).toBe("active")
        expect(result[0].score).toBe(0)
      })

      it("Should reorder columns while preserving AUTO_INCREMENT", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            name VARCHAR(100),
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Move AUTO_INCREMENT column to first position
        const newOrder = [
          initialColumns[1], // id (with AUTO_INCREMENT)
          initialColumns[0], // name
          initialColumns[2], // email
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        // Verify column order
        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")
        expect(reorderedColumns[0].columnName).toBe("id")

        // Verify AUTO_INCREMENT preserved
        expect(reorderedColumns[0].extra).toBe("auto_increment")

        // Test that AUTO_INCREMENT still works
        await util.knex("column_reorder_test").insert({ name: "User1", email: "user1@test.com" })
        await util.knex("column_reorder_test").insert({ name: "User2", email: "user2@test.com" })

        const results = await util.knex("column_reorder_test").select()
        expect(results.length).toBe(2)
        expect(results[0].id).toBe(1)
        expect(results[1].id).toBe(2)
      })

      it("Should reorder columns with multiple attributes (NOT NULL, DEFAULT, extra)", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            score INT DEFAULT 100,
            description TEXT
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Complex reordering
        const newOrder = [
          initialColumns[0], // id (AUTO_INCREMENT, PRIMARY KEY)
          initialColumns[2], // status (NOT NULL, DEFAULT 'pending')
          initialColumns[3], // score (DEFAULT 100)
          initialColumns[1], // name (NOT NULL)
          initialColumns[4], // description
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        // Verify column order and all attributes
        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[0].extra).toBe("auto_increment")

        expect(reorderedColumns[1].columnName).toBe("status")
        expect(reorderedColumns[1].nullable).toBe(false)
        expect(reorderedColumns[1].defaultValue).toBe("pending")

        expect(reorderedColumns[2].columnName).toBe("score")
        expect(reorderedColumns[2].defaultValue).toBe("100")

        expect(reorderedColumns[3].columnName).toBe("name")
        expect(reorderedColumns[3].nullable).toBe(false)

        // Test inserting data with defaults
        await util.knex("column_reorder_test").insert({ name: "TestUser" })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result[0].status).toBe("pending")
        expect(result[0].score).toBe(100)
        expect(result[0].name).toBe("TestUser")

        // Test that NOT NULL constraint still works
        if (tag !== '5.1') { // MySQL 5.1 doesn't properly enforce NOT NULL in some cases
          const insertWithoutName = async () => {
            await util.knex("column_reorder_test").insert({ status: "active" })
          }
          await expect(insertWithoutName()).rejects.toThrow()
        }
      })

      it("Should move column to FIRST position", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT,
            name VARCHAR(100) NOT NULL DEFAULT 'unknown',
            age INT
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Move 'name' to first position
        const newOrder = [
          initialColumns[1], // name (NOT NULL, DEFAULT 'unknown')
          initialColumns[0], // id
          initialColumns[2], // age
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        expect(reorderedColumns[0].columnName).toBe("name")
        expect(reorderedColumns[0].nullable).toBe(false)
        expect(reorderedColumns[0].defaultValue).toBe("unknown")

        // Test that attributes work correctly
        await util.knex("column_reorder_test").insert({ id: 1, age: 25 })
        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result[0].name).toBe("unknown")
      })

      it("Should handle reordering columns with UNSIGNED attribute", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT UNSIGNED NOT NULL,
            count INT UNSIGNED DEFAULT 0,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns
        const newOrder = [
          initialColumns[2], // name
          initialColumns[0], // id (UNSIGNED, NOT NULL)
          initialColumns[1], // count (UNSIGNED, DEFAULT 0)
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        expect(reorderedColumns[0].columnName).toBe("name")
        expect(reorderedColumns[1].columnName).toBe("id")
        expect(reorderedColumns[2].columnName).toBe("count")

        // Verify UNSIGNED is preserved (unsigned is part of dataType in MySQL)
        expect(reorderedColumns[1].dataType).toContain("unsigned")
        expect(reorderedColumns[2].dataType).toContain("unsigned")
        expect(reorderedColumns[1].nullable).toBe(false)
        expect(reorderedColumns[2].defaultValue).toBe("0")

        // Test that unsigned constraint works
        const insertNegative = async () => {
          await util.knex("column_reorder_test").insert({
            id: -1,
            name: "Test"
          })
        }
        if (tag !== '5.1') { // MySQL 5.1 doesn't properly enforce unsigned
          await expect(insertNegative()).rejects.toThrow()
        }
      })

      it("Should preserve all attributes when reordering multiple columns", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            username VARCHAR(50) NOT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL,
            score INT UNSIGNED DEFAULT 0
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Completely reorder all columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[2], // username
          initialColumns[1], // email
          initialColumns[6], // score
          initialColumns[3], // status
          initialColumns[5], // updated_at
          initialColumns[4], // created_at
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("username")
        expect(reorderedColumns[2].columnName).toBe("email")
        expect(reorderedColumns[3].columnName).toBe("score")
        expect(reorderedColumns[4].columnName).toBe("status")
        expect(reorderedColumns[5].columnName).toBe("updated_at")
        expect(reorderedColumns[6].columnName).toBe("created_at")

        // Verify all attributes preserved
        expect(reorderedColumns[0].extra).toBe("auto_increment")
        expect(reorderedColumns[1].nullable).toBe(false)
        expect(reorderedColumns[2].nullable).toBe(false)
        expect(reorderedColumns[3].defaultValue).toBe("0")
        expect(reorderedColumns[4].defaultValue).toBe("active")

        // Test actual functionality
        await util.knex("column_reorder_test").insert({
          email: "test@example.com",
          username: "testuser"
        })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result[0].status).toBe("active")
        expect(result[0].score).toBe(0)
        expect(result[0].email).toBe("test@example.com")
      })

      it("Should preserve generated columns when reordering other columns", async () => {
        // MySQL 5.1 doesn't support generated columns (introduced in 5.7.6)
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            quantity INT,
            price DECIMAL(10, 2),
            total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder regular columns but keep generated column in place
        const newOrder = [
          initialColumns[0], // id
          initialColumns[4], // name
          initialColumns[1], // quantity
          initialColumns[2], // price
          initialColumns[3], // total (generated)
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify new column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("name")
        expect(reorderedColumns[2].columnName).toBe("quantity")
        expect(reorderedColumns[3].columnName).toBe("price")
        expect(reorderedColumns[4].columnName).toBe("total")

        // Verify generated column is still marked as generated
        expect(reorderedColumns[4].generated).toBe(true)

        // Verify the generation expression is preserved
        expect(reorderedColumns[4].generationExpression).toBeTruthy()
        expect(reorderedColumns[4].generationExpression.toLowerCase()).toContain("quantity")
        expect(reorderedColumns[4].generationExpression.toLowerCase()).toContain("price")

        // Test that generated column still works
        await util.knex("column_reorder_test").insert({
          id: 1,
          name: "Widget",
          quantity: 5,
          price: 10.50
        })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result[0].total).toBe("52.50")
      })

      it("Should preserve STORED generated columns when moving them", async () => {
        // MySQL 5.1 doesn't support generated columns (introduced in 5.7.6)
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            first_name VARCHAR(50),
            last_name VARCHAR(50),
            full_name VARCHAR(101) AS (CONCAT(first_name, ' ', last_name)) STORED,
            email VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Move the generated column to a different position
        const newOrder = [
          initialColumns[0], // id
          initialColumns[3], // full_name (STORED generated) - moving this!
          initialColumns[1], // first_name
          initialColumns[2], // last_name
          initialColumns[4], // email
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify new column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("full_name")
        expect(reorderedColumns[2].columnName).toBe("first_name")
        expect(reorderedColumns[3].columnName).toBe("last_name")
        expect(reorderedColumns[4].columnName).toBe("email")

        // Verify generated column attributes are preserved
        expect(reorderedColumns[1].generated).toBe(true)
        expect(reorderedColumns[1].generationExpression).toBeTruthy()
        expect(reorderedColumns[1].generationExpression.toLowerCase()).toContain("concat")

        // Test that the generated column still works correctly
        await util.knex("column_reorder_test").insert({
          id: 1,
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com"
        })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result[0].full_name).toBe("John Doe")
      })

      it("Should preserve VIRTUAL generated columns when reordering", async () => {
        // MySQL 5.1 doesn't support generated columns (introduced in 5.7.6)
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            price DECIMAL(10, 2),
            tax_rate DECIMAL(5, 2),
            tax_amount DECIMAL(10, 2) AS (price * tax_rate / 100) VIRTUAL,
            description TEXT
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns including moving the virtual generated column
        const newOrder = [
          initialColumns[0], // id
          initialColumns[4], // description
          initialColumns[1], // price
          initialColumns[3], // tax_amount (VIRTUAL generated)
          initialColumns[2], // tax_rate
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify new column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("description")
        expect(reorderedColumns[2].columnName).toBe("price")
        expect(reorderedColumns[3].columnName).toBe("tax_amount")
        expect(reorderedColumns[4].columnName).toBe("tax_rate")

        // Verify generated column is still marked as generated
        expect(reorderedColumns[3].generated).toBe(true)
        expect(reorderedColumns[3].generationExpression).toBeTruthy()

        // Test that the virtual generated column still calculates correctly
        await util.knex("column_reorder_test").insert({
          id: 1,
          price: 100.00,
          tax_rate: 8.50,
          description: "Test product"
        })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(parseFloat(result[0].tax_amount)).toBeCloseTo(8.50, 2)
      })

      it("Should preserve multiple generated columns when reordering", async () => {
        // MySQL 5.1 doesn't support generated columns (introduced in 5.7.6)
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            width DECIMAL(10, 2),
            height DECIMAL(10, 2),
            depth DECIMAL(10, 2),
            area DECIMAL(10, 2) AS (width * height) STORED,
            volume DECIMAL(10, 2) AS (width * height * depth) STORED,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder everything including both generated columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[6], // name
          initialColumns[1], // width
          initialColumns[4], // area (generated)
          initialColumns[2], // height
          initialColumns[3], // depth
          initialColumns[5], // volume (generated)
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify new column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("name")
        expect(reorderedColumns[2].columnName).toBe("width")
        expect(reorderedColumns[3].columnName).toBe("area")
        expect(reorderedColumns[4].columnName).toBe("height")
        expect(reorderedColumns[5].columnName).toBe("depth")
        expect(reorderedColumns[6].columnName).toBe("volume")

        // Verify both generated columns are still marked as generated
        expect(reorderedColumns[3].generated).toBe(true)
        expect(reorderedColumns[6].generated).toBe(true)

        // Verify generation expressions are preserved
        expect(reorderedColumns[3].generationExpression).toBeTruthy()
        expect(reorderedColumns[3].generationExpression.toLowerCase()).toContain("width")
        expect(reorderedColumns[3].generationExpression.toLowerCase()).toContain("height")

        expect(reorderedColumns[6].generationExpression).toBeTruthy()
        expect(reorderedColumns[6].generationExpression.toLowerCase()).toContain("width")
        expect(reorderedColumns[6].generationExpression.toLowerCase()).toContain("height")
        expect(reorderedColumns[6].generationExpression.toLowerCase()).toContain("depth")

        // Test that both generated columns still calculate correctly
        await util.knex("column_reorder_test").insert({
          id: 1,
          name: "Box",
          width: 10.0,
          height: 5.0,
          depth: 2.0
        })

        const result = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(parseFloat(result[0].area)).toBeCloseTo(50.0, 2)
        expect(parseFloat(result[0].volume)).toBeCloseTo(100.0, 2)
      })

      it("Should preserve generated columns with complex expressions", async () => {
        // MySQL 5.1 doesn't support generated columns (introduced in 5.7.6)
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            status VARCHAR(20),
            priority INT,
            urgency INT,
            importance_score INT AS (priority * 2 + urgency * 3) STORED,
            is_critical VARCHAR(3) AS (IF(priority > 8 AND urgency > 8, 'Yes', 'No')) VIRTUAL
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[5], // is_critical (VIRTUAL generated)
          initialColumns[1], // status
          initialColumns[2], // priority
          initialColumns[3], // urgency
          initialColumns[4], // importance_score (STORED generated)
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify new column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("is_critical")
        expect(reorderedColumns[2].columnName).toBe("status")
        expect(reorderedColumns[3].columnName).toBe("priority")
        expect(reorderedColumns[4].columnName).toBe("urgency")
        expect(reorderedColumns[5].columnName).toBe("importance_score")

        // Verify both generated columns are preserved
        expect(reorderedColumns[1].generated).toBe(true)
        expect(reorderedColumns[5].generated).toBe(true)

        // Test that complex expressions still work
        await util.knex("column_reorder_test").insert({
          id: 1,
          status: "active",
          priority: 9,
          urgency: 9
        })

        await util.knex("column_reorder_test").insert({
          id: 2,
          status: "pending",
          priority: 5,
          urgency: 3
        })

        const result1 = await util.knex("column_reorder_test").select().where({ id: 1 })
        expect(result1[0].importance_score).toBe(45) // 9*2 + 9*3 = 45
        expect(result1[0].is_critical).toBe("Yes")

        const result2 = await util.knex("column_reorder_test").select().where({ id: 2 })
        expect(result2[0].importance_score).toBe(19) // 5*2 + 3*3 = 19
        expect(result2[0].is_critical).toBe("No")
      })

      it("Should preserve column comments when reordering", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY COMMENT 'Primary identifier',
            username VARCHAR(50) NOT NULL COMMENT 'User login name',
            email VARCHAR(255) COMMENT 'Contact email address',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time'
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[2], // email
          initialColumns[1], // username
          initialColumns[3], // created_at
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("email")
        expect(reorderedColumns[2].columnName).toBe("username")
        expect(reorderedColumns[3].columnName).toBe("created_at")

        // Verify comments are preserved
        expect(reorderedColumns[0].comment).toBe("Primary identifier")
        expect(reorderedColumns[1].comment).toBe("Contact email address")
        expect(reorderedColumns[2].comment).toBe("User login name")
        expect(reorderedColumns[3].comment).toBe("Record creation time")
      })

      it("Should preserve ON UPDATE CURRENT_TIMESTAMP", async () => {
        // MySQL 5.1 only allows one TIMESTAMP with CURRENT_TIMESTAMP
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            data VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[3], // updated_at (with ON UPDATE)
          initialColumns[1], // data
          initialColumns[2], // created_at
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("updated_at")
        expect(reorderedColumns[2].columnName).toBe("data")
        expect(reorderedColumns[3].columnName).toBe("created_at")

        // Verify ON UPDATE is preserved (it's in the extra field)
        expect(reorderedColumns[1].extra).toContain("on update")
        if (reorderedColumns[3].extra) {
          expect(reorderedColumns[3].extra).not.toContain("on update")
        }

        // Test that ON UPDATE still works
        await util.knex("column_reorder_test").insert({
          id: 1,
          data: "initial"
        })

        const result1 = await util.knex("column_reorder_test").select().where({ id: 1 })
        const initialUpdatedAt = result1[0].updated_at

        // Wait a moment and update
        await new Promise(resolve => setTimeout(resolve, 1000))
        await util.knex("column_reorder_test").where({ id: 1 }).update({ data: "modified" })

        const result2 = await util.knex("column_reorder_test").select().where({ id: 1 })
        const laterUpdatedAt = result2[0].updated_at

        // updated_at should have changed
        expect(laterUpdatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime())
      })

      it("Should preserve ZEROFILL attribute", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            code INT(5) ZEROFILL,
            amount DECIMAL(10,2),
            quantity INT(3) ZEROFILL
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[3], // quantity (ZEROFILL)
          initialColumns[1], // code (ZEROFILL)
          initialColumns[2], // amount
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("quantity")
        expect(reorderedColumns[2].columnName).toBe("code")
        expect(reorderedColumns[3].columnName).toBe("amount")

        // Verify ZEROFILL is preserved (it's part of dataType)
        expect(reorderedColumns[1].dataType.toLowerCase()).toContain("zerofill")
        expect(reorderedColumns[2].dataType.toLowerCase()).toContain("zerofill")
        expect(reorderedColumns[3].dataType.toLowerCase()).not.toContain("zerofill")
      })

      it("Should preserve character set and collation", async () => {
        if (readonly || tag === '5.1') return; // MySQL 5.1 has limited charset support

        await util.knex.schema.raw(`
          CREATE TABLE column_reorder_test (
            id INT PRIMARY KEY,
            name_utf8 VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
            name_bin VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
            description TEXT
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_reorder_test")

        // Reorder columns
        const newOrder = [
          initialColumns[0], // id
          initialColumns[2], // name_bin
          initialColumns[3], // description
          initialColumns[1], // name_utf8
        ]

        await util.connection.alterTable({
          table: "column_reorder_test",
          reorder: {
            oldOrder: initialColumns,
            newOrder: newOrder
          }
        })

        const reorderedColumns = await util.connection.listTableColumns("column_reorder_test")

        // Verify column order
        expect(reorderedColumns[0].columnName).toBe("id")
        expect(reorderedColumns[1].columnName).toBe("name_bin")
        expect(reorderedColumns[2].columnName).toBe("description")
        expect(reorderedColumns[3].columnName).toBe("name_utf8")

        // Verify charset/collation is preserved (check via raw query since it may not be in dataType)
        const showCreateResult = await util.knex.raw('SHOW CREATE TABLE column_reorder_test')
        const createStatement = showCreateResult[0][0]['Create Table']

        // Both columns should still have their specific charsets
        expect(createStatement).toContain("utf8mb4_unicode_ci")
        expect(createStatement).toContain("utf8mb4_bin")
      })
    })

    describe("Column Alterations", () => {
      beforeEach(async () => {
        if (readonly) return;

        // Drop table if it exists from previous test
        await util.knex.schema.dropTableIfExists("column_alter_test")
      })

      it("Should alter column data type while preserving collation", async () => {
        if (readonly || tag === '5.1') return; // MySQL 5.1 has limited charset support

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].collation).toBe("utf8mb4_unicode_ci")

        // Alter the data type from VARCHAR(100) to VARCHAR(255)
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "name",
            newValue: "varchar(255)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify data type changed
        expect(alteredColumns[1].dataType).toBe("varchar(255)")

        // Verify collation is preserved
        expect(alteredColumns[1].collation).toBe("utf8mb4_unicode_ci")

        // Verify character set is preserved
        expect(alteredColumns[1].characterSet).toBe("utf8mb4")
      })

      it("Should alter column name while preserving collation", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            old_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].collation).toBe("utf8mb4_bin")

        // Alter the column name
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "columnName",
            columnName: "old_name",
            newValue: "new_name",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify name changed
        expect(alteredColumns[1].columnName).toBe("new_name")

        // Verify collation is preserved
        expect(alteredColumns[1].collation).toBe("utf8mb4_bin")

        // Verify character set is preserved
        expect(alteredColumns[1].characterSet).toBe("utf8mb4")
      })

      it("Should alter nullable status while preserving generated column expression", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            quantity INT,
            price DECIMAL(10, 2),
            total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].nullable).toBe(true)
        expect(initialColumns[3].generated).toBe(true)

        // Alter quantity to NOT NULL
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "nullable",
            columnName: "quantity",
            newValue: false,
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify nullable changed
        expect(alteredColumns[1].nullable).toBe(false)

        // Verify generated column is still generated
        expect(alteredColumns[3].generated).toBe(true)
        expect(alteredColumns[3].generationExpression).toBeTruthy()
        expect(alteredColumns[3].generationExpression.toLowerCase()).toContain("quantity")
        expect(alteredColumns[3].generationExpression.toLowerCase()).toContain("price")

        // Test that the generated column still works
        await util.knex("column_alter_test").insert({
          id: 1,
          quantity: 5,
          price: 10.50
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].total).toBe("52.50")
      })

      it("Should alter data type of generated column (should preserve generation expression)", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            first_name VARCHAR(50),
            last_name VARCHAR(50),
            full_name VARCHAR(101) AS (CONCAT(first_name, ' ', last_name)) STORED
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[3].generated).toBe(true)
        expect(initialColumns[3].dataType).toBe("varchar(101)")

        // Alter the generated column's data type
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "full_name",
            newValue: "varchar(200)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify data type changed
        expect(alteredColumns[3].dataType).toBe("varchar(200)")

        // Verify it's still a generated column
        expect(alteredColumns[3].generated).toBe(true)
        expect(alteredColumns[3].generationExpression).toBeTruthy()
        expect(alteredColumns[3].generationExpression.toLowerCase()).toContain("concat")

        // Test that the generated column still works
        await util.knex("column_alter_test").insert({
          id: 1,
          first_name: "John",
          last_name: "Doe"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].full_name).toBe("John Doe")
      })

      it("Should alter column name of generated column (should use CHANGE and preserve expression)", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            width DECIMAL(10, 2),
            height DECIMAL(10, 2),
            old_area DECIMAL(10, 2) AS (width * height) STORED
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[3].columnName).toBe("old_area")
        expect(initialColumns[3].generated).toBe(true)

        // Rename the generated column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "columnName",
            columnName: "old_area",
            newValue: "new_area",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify name changed
        expect(alteredColumns[3].columnName).toBe("new_area")

        // Verify it's still a generated column with the same expression
        expect(alteredColumns[3].generated).toBe(true)
        expect(alteredColumns[3].generationExpression).toBeTruthy()
        expect(alteredColumns[3].generationExpression.toLowerCase()).toContain("width")
        expect(alteredColumns[3].generationExpression.toLowerCase()).toContain("height")

        // Test that the generated column still works
        await util.knex("column_alter_test").insert({
          id: 1,
          width: 10.0,
          height: 5.0
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(parseFloat(result[0].new_area)).toBeCloseTo(50.0, 2)
      })

      it("Should alter column with DEFAULT_GENERATED (MySQL 8+ generated defaults)", async () => {
        // DEFAULT_GENERATED requires MySQL 8.0.13+
        if (readonly || tag !== '8') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            uuid VARCHAR(36) DEFAULT (UUID()),
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")

        // In MySQL 8, generated defaults show up in the 'extra' field
        expect(initialColumns[1].defaultValue).toBeTruthy()

        // Alter the data type of the column with generated default
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "uuid",
            newValue: "varchar(50)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify data type changed
        expect(alteredColumns[1].dataType).toBe("varchar(50)")

        // Verify the generated default is preserved
        expect(alteredColumns[1].defaultValue).toBeTruthy()

        // Test that the generated default still works
        await util.knex("column_alter_test").insert({
          id: 1,
          name: "Test"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        // UUID should be generated
        expect(result[0].uuid).toBeTruthy()
        expect(result[0].uuid.length).toBeGreaterThan(0)
      })

      it("Should alter column name with DEFAULT_GENERATED", async () => {
        // DEFAULT_GENERATED requires MySQL 8.0.13+
        if (readonly || tag !== '8') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            old_timestamp TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].columnName).toBe("old_timestamp")

        // Rename the column with generated default
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "columnName",
            columnName: "old_timestamp",
            newValue: "new_timestamp",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify name changed
        expect(alteredColumns[1].columnName).toBe("new_timestamp")

        // Verify the generated default is preserved
        expect(alteredColumns[1].defaultValue).toBeTruthy()

        // Test that the generated default still works
        await util.knex("column_alter_test").insert({
          id: 1,
          name: "Test"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].new_timestamp).toBeTruthy()
      })

      it("Should alter multiple properties of a column simultaneously", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            old_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'default' COMMENT 'Old comment'
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].columnName).toBe("old_name")
        expect(initialColumns[1].dataType).toBe("varchar(50)")
        expect(initialColumns[1].defaultValue).toBe("default")
        expect(initialColumns[1].nullable).toBe(true)

        // Alter multiple properties at once
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [
            {
              changeType: "columnName",
              columnName: "old_name",
              newValue: "new_name",
            },
            {
              changeType: "dataType",
              columnName: "old_name",
              newValue: "varchar(100)",
            },
            {
              changeType: "nullable",
              columnName: "old_name",
              newValue: false,
            },
            {
              changeType: "defaultValue",
              columnName: "old_name",
              newValue: "new_default",
            },
            {
              changeType: "comment",
              columnName: "old_name",
              newValue: "New comment",
            }
          ],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify all changes applied
        expect(alteredColumns[1].columnName).toBe("new_name")
        expect(alteredColumns[1].dataType).toBe("varchar(100)")
        expect(alteredColumns[1].nullable).toBe(false)
        expect(alteredColumns[1].defaultValue).toBe("new_default")
        expect(alteredColumns[1].comment).toBe("New comment")

        // Verify collation is preserved
        expect(alteredColumns[1].collation).toBe("utf8mb4_unicode_ci")
        expect(alteredColumns[1].characterSet).toBe("utf8mb4")

        // Test that NOT NULL and default work
        await util.knex("column_alter_test").insert({
          id: 1
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].new_name).toBe("new_default")
      })

      it("Should alter column with AUTO_INCREMENT (should preserve extra)", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[0].extra).toBe("auto_increment")
        expect(initialColumns[0].dataType).toContain("int")

        // Alter the data type of AUTO_INCREMENT column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "id",
            newValue: "bigint",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify data type changed
        expect(alteredColumns[0].dataType).toContain("bigint")

        // Verify AUTO_INCREMENT is preserved
        expect(alteredColumns[0].extra).toBe("auto_increment")

        // Test that AUTO_INCREMENT still works
        await util.knex("column_alter_test").insert({ name: "User1" })
        await util.knex("column_alter_test").insert({ name: "User2" })

        const results = await util.knex("column_alter_test").select()
        expect(results.length).toBe(2)
        expect(results[0].id).toBe(1)
        expect(results[1].id).toBe(2)
      })

      it("Should alter column with ON UPDATE CURRENT_TIMESTAMP", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].extra).toContain("on update")

        // Alter the nullable status of the timestamp column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "nullable",
            columnName: "updated_at",
            newValue: false,
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify nullable changed
        expect(alteredColumns[1].nullable).toBe(false)

        // Verify ON UPDATE is preserved
        expect(alteredColumns[1].extra).toContain("on update")

        // Test that ON UPDATE still works
        await util.knex("column_alter_test").insert({
          id: 1,
          name: "initial"
        })

        const result1 = await util.knex("column_alter_test").select().where({ id: 1 })
        const initialUpdatedAt = result1[0].updated_at

        // Wait a moment and update
        await new Promise(resolve => setTimeout(resolve, 1000))
        await util.knex("column_alter_test").where({ id: 1 }).update({ name: "modified" })

        const result2 = await util.knex("column_alter_test").select().where({ id: 1 })
        const laterUpdatedAt = result2[0].updated_at

        // updated_at should have changed
        expect(laterUpdatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime())
      })

      it("Should alter column with UNSIGNED and ZEROFILL", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            code INT(5) UNSIGNED ZEROFILL,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].dataType.toLowerCase()).toContain("unsigned")
        expect(initialColumns[1].dataType.toLowerCase()).toContain("zerofill")

        // Alter the nullable status
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "nullable",
            columnName: "code",
            newValue: false,
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify nullable changed
        expect(alteredColumns[1].nullable).toBe(false)

        // Verify UNSIGNED and ZEROFILL are preserved
        expect(alteredColumns[1].dataType.toLowerCase()).toContain("unsigned")
        expect(alteredColumns[1].dataType.toLowerCase()).toContain("zerofill")
      })

      it("Should alter VIRTUAL generated column", async () => {
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            price DECIMAL(10, 2),
            tax_rate DECIMAL(5, 2),
            tax_amount DECIMAL(10, 2) AS (price * tax_rate / 100) VIRTUAL
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[3].generated).toBe(true)
        expect(initialColumns[3].dataType).toBe("decimal(10,2)")

        // Alter the data type of the virtual generated column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "tax_amount",
            newValue: "decimal(12,2)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify data type changed
        expect(alteredColumns[3].dataType).toBe("decimal(12,2)")

        // Verify it's still a VIRTUAL generated column
        expect(alteredColumns[3].generated).toBe(true)
        expect(alteredColumns[3].generationExpression).toBeTruthy()

        // Test that the generated column still works
        await util.knex("column_alter_test").insert({
          id: 1,
          price: 100.00,
          tax_rate: 8.50
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(parseFloat(result[0].tax_amount)).toBeCloseTo(8.50, 2)
      })

      it("Should alter column with ENUM type while preserving values", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            status ENUM('pending', 'active', 'inactive') DEFAULT 'pending',
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].dataType).toContain("enum")
        expect(initialColumns[1].defaultValue).toBe("pending")

        // Alter the comment
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "comment",
            columnName: "status",
            newValue: "User status",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify comment changed
        expect(alteredColumns[1].comment).toBe("User status")

        // Verify ENUM type and default are preserved
        expect(alteredColumns[1].dataType).toContain("enum")
        expect(alteredColumns[1].defaultValue).toBe("pending")

        // Test that default still works
        await util.knex("column_alter_test").insert({
          id: 1,
          name: "Test"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].status).toBe("pending")
      })

      it("Should alter column with index (index should be preserved)", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            email VARCHAR(100),
            name VARCHAR(100)
          )
        `)

        // Create an index on the email column
        await util.knex.schema.raw(`
          CREATE INDEX idx_email ON column_alter_test (email)
        `)

        const initialIndexes = await util.connection.listTableIndexes("column_alter_test")
        const emailIndex = initialIndexes.find(idx => idx.name === 'idx_email')
        expect(emailIndex).toBeTruthy()
        expect(emailIndex.columns[0].name).toBe('email')

        // Alter the indexed column's data type
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "email",
            newValue: "varchar(255)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns.find(c => c.columnName === 'email').dataType).toBe("varchar(255)")

        // Verify index is still there
        const alteredIndexes = await util.connection.listTableIndexes("column_alter_test")
        const emailIndexAfter = alteredIndexes.find(idx => idx.name === 'idx_email')
        expect(emailIndexAfter).toBeTruthy()
        expect(emailIndexAfter.columns[0].name).toBe('email')

        // Test that the index still works
        await util.knex("column_alter_test").insert([
          { id: 1, email: "test1@example.com", name: "User1" },
          { id: 2, email: "test2@example.com", name: "User2" }
        ])

        const result = await util.knex("column_alter_test").where({ email: "test1@example.com" })
        expect(result.length).toBe(1)
        expect(result[0].name).toBe("User1")
      })

      it("Should alter column name with index (index should follow the column)", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            old_email VARCHAR(100),
            name VARCHAR(100)
          )
        `)

        await util.knex.schema.raw(`
          CREATE INDEX idx_email ON column_alter_test (old_email)
        `)

        // Rename the indexed column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "columnName",
            columnName: "old_email",
            newValue: "new_email",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns.find(c => c.columnName === 'new_email')).toBeTruthy()
        expect(alteredColumns.find(c => c.columnName === 'old_email')).toBeFalsy()

        // Verify index still exists and references the new column name
        const alteredIndexes = await util.connection.listTableIndexes("column_alter_test")
        const emailIndex = alteredIndexes.find(idx => idx.name === 'idx_email')
        expect(emailIndex).toBeTruthy()
        expect(emailIndex.columns[0].name).toBe('new_email')
      })

      it("Should alter column with foreign key (FK should be preserved)", async () => {
        if (readonly) return;

        // Create parent table
        await util.knex.schema.raw(`
          CREATE TABLE parent_table (
            id INT PRIMARY KEY,
            name VARCHAR(100)
          ) ENGINE=InnoDB
        `)

        // Create child table with foreign key
        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            parent_id INT,
            data VARCHAR(100),
            CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES parent_table(id)
          ) ENGINE=InnoDB
        `)

        const initialRelations = await util.connection.getTableKeys("column_alter_test")
        const fkConstraint = initialRelations.find(r => r.constraintName === 'fk_parent' || r.fromColumn === 'parent_id')
        expect(fkConstraint).toBeTruthy()

        // Alter a different column (not the FK column)
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "data",
            newValue: "varchar(255)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns.find(c => c.columnName === 'data').dataType).toBe("varchar(255)")

        // Verify FK constraint is still there
        const alteredRelations = await util.connection.getTableKeys("column_alter_test")
        const fkConstraintAfter = alteredRelations.find(r => r.constraintName === 'fk_parent' || r.from_column === 'parent_id')
        expect(fkConstraintAfter).toBeTruthy()

        // Test that FK constraint still works
        await util.knex("parent_table").insert({ id: 1, name: "Parent1" })
        await util.knex("column_alter_test").insert({ id: 1, parent_id: 1, data: "Test data" })

        // Should fail to insert with non-existent parent_id
        const insertInvalid = async () => {
          await util.knex("column_alter_test").insert({ id: 2, parent_id: 999, data: "Invalid" })
        }
        await expect(insertInvalid()).rejects.toThrow()
      })

      it("Should alter SET type column while preserving values", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            permissions SET('read', 'write', 'delete') DEFAULT 'read',
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].dataType).toContain("set")
        expect(initialColumns[1].defaultValue).toBe("read")

        // Alter the nullable status
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "nullable",
            columnName: "permissions",
            newValue: false,
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify nullable changed
        expect(alteredColumns[1].nullable).toBe(false)

        // Verify SET type and default are preserved
        expect(alteredColumns[1].dataType).toContain("set")
        expect(alteredColumns[1].defaultValue).toBe("read")

        // Test that SET type still works
        await util.knex("column_alter_test").insert({
          id: 1,
          permissions: "read,write",
          name: "Test"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].permissions).toContain("read")
        expect(result[0].permissions).toContain("write")
      })

      it("Should alter column with CHECK constraint (MySQL 8.0.16+)", async () => {
        // CHECK constraints require MySQL 8.0.16+
        if (readonly || tag !== '8') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            age INT CHECK (age >= 18),
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].columnName).toBe("age")

        // Alter the data type of the column with CHECK constraint
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "age",
            newValue: "smallint",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns[1].dataType).toContain("smallint")

        // Test that CHECK constraint still works
        await util.knex("column_alter_test").insert({
          id: 1,
          age: 25,
          name: "Valid User"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        expect(result[0].age).toBe(25)

        // Should fail to insert with age < 18
        const insertInvalid = async () => {
          await util.knex("column_alter_test").insert({
            id: 2,
            age: 15,
            name: "Invalid User"
          })
        }
        await expect(insertInvalid()).rejects.toThrow()
      })

      it("Should alter JSON column while preserving type", async () => {
        // JSON type requires MySQL 5.7.8+
        if (readonly || tag === '5.1') return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            metadata JSON,
            name VARCHAR(100)
          )
        `)

        const initialColumns = await util.connection.listTableColumns("column_alter_test")
        expect(initialColumns[1].dataType).toBe("json")

        // Alter the comment
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "comment",
            columnName: "metadata",
            newValue: "Stores user metadata",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")

        // Verify comment changed
        expect(alteredColumns[1].comment).toBe("Stores user metadata")

        // Verify JSON type is preserved
        expect(alteredColumns[1].dataType).toBe("json")

        // Test that JSON functionality still works
        await util.knex("column_alter_test").insert({
          id: 1,
          metadata: JSON.stringify({ key: "value", count: 42 }),
          name: "Test"
        })

        const result = await util.knex("column_alter_test").select().where({ id: 1 })
        const metadata = result[0].metadata
        expect(metadata.key).toBe("value")
        expect(metadata.count).toBe(42)
      })

      it("Should alter primary key column while preserving PK constraint", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            name VARCHAR(100)
          )
        `)

        const initialKeys = await util.connection.getPrimaryKeys("column_alter_test")
        expect(initialKeys.length).toBe(1)
        expect(initialKeys[0].columnName).toBe("id")

        // Alter the data type of the primary key column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "id",
            newValue: "bigint",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns[0].dataType).toContain("bigint")

        // Verify PRIMARY KEY constraint is still there
        const alteredKeys = await util.connection.getPrimaryKeys("column_alter_test")
        expect(alteredKeys.length).toBe(1)
        expect(alteredKeys[0].columnName).toBe("id")

        // Test that PK constraint still works
        await util.knex("column_alter_test").insert({ id: 1, name: "User1" })

        // Should fail to insert duplicate PK
        const insertDuplicate = async () => {
          await util.knex("column_alter_test").insert({ id: 1, name: "User2" })
        }
        await expect(insertDuplicate()).rejects.toThrow()
      })

      it("Should alter column with composite index", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            email VARCHAR(100)
          )
        `)

        // Create a composite index
        await util.knex.schema.raw(`
          CREATE INDEX idx_fullname ON column_alter_test (first_name, last_name)
        `)

        const initialIndexes = await util.connection.listTableIndexes("column_alter_test")
        const compositeIndex = initialIndexes.find(idx => idx.name === 'idx_fullname')
        expect(compositeIndex).toBeTruthy()
        expect(compositeIndex.columns.length).toBe(2)

        // Alter one of the columns in the composite index
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "first_name",
            newValue: "varchar(150)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns.find(c => c.columnName === 'first_name').dataType).toBe("varchar(150)")

        // Verify composite index is still there
        const alteredIndexes = await util.connection.listTableIndexes("column_alter_test")
        const compositeIndexAfter = alteredIndexes.find(idx => idx.name === 'idx_fullname')
        expect(compositeIndexAfter).toBeTruthy()
        expect(compositeIndexAfter.columns.length).toBe(2)
        expect(compositeIndexAfter.columns[0].name).toBe('first_name')
        expect(compositeIndexAfter.columns[1].name).toBe('last_name')
      })

      it("Should alter column with UNIQUE constraint", async () => {
        if (readonly) return;

        await util.knex.schema.raw(`
          CREATE TABLE column_alter_test (
            id INT PRIMARY KEY,
            username VARCHAR(50) UNIQUE,
            email VARCHAR(100)
          )
        `)

        const initialIndexes = await util.connection.listTableIndexes("column_alter_test")
        const uniqueIndex = initialIndexes.find(idx => idx.columns.some(c => c.name === 'username') && idx.unique)
        expect(uniqueIndex).toBeTruthy()

        // Alter the UNIQUE column
        await util.connection.alterTable({
          table: "column_alter_test",
          alterations: [{
            changeType: "dataType",
            columnName: "username",
            newValue: "varchar(100)",
          }],
        })

        const alteredColumns = await util.connection.listTableColumns("column_alter_test")
        expect(alteredColumns.find(c => c.columnName === 'username').dataType).toBe("varchar(100)")

        // Verify UNIQUE constraint is still there
        const alteredIndexes = await util.connection.listTableIndexes("column_alter_test")
        const uniqueIndexAfter = alteredIndexes.find(idx => idx.columns.some(c => c.name === 'username') && idx.unique)
        expect(uniqueIndexAfter).toBeTruthy()

        // Test that UNIQUE constraint still works
        await util.knex("column_alter_test").insert({ id: 1, username: "user1", email: "user1@test.com" })

        const insertDuplicate = async () => {
          await util.knex("column_alter_test").insert({ id: 2, username: "user1", email: "user2@test.com" })
        }
        await expect(insertDuplicate()).rejects.toThrow()
      })
    })

    describe("Param tests", () => {
      it("Should be able to handle positional (?) params", async () => {
        await util.paramTest(['?']);
      })
    })
  })

}

TEST_VERSIONS.forEach(({ version, socket, readonly, image, options }) => testWith(version, socket, readonly, image, options ))

