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
        const insertWithoutName = async () => {
          await util.knex("column_reorder_test").insert({ status: "active" })
        }
        await expect(insertWithoutName()).rejects.toThrow()
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
    })

    describe("Param tests", () => {
      it("Should be able to handle positional (?) params", async () => {
        await util.paramTest(['?']);
      })
    })
  })

}

TEST_VERSIONS.forEach(({ version, socket, readonly, image, options }) => testWith(version, socket, readonly, image, options ))

