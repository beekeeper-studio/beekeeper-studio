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

    // MySQL User Management Tests
    if (!readonly && (tag === '5.1' || (tag === '8' && !socket))) {
      describe('MySQL User Management Tests', () => {
        let rootConnection;

        beforeAll(async () => {
          rootConnection = util.connection;
          
          // Clean up with version-compatible syntax
          try {
            if (tag !== '5.1') {
              const dropResult1 = await rootConnection.query(`DROP USER IF EXISTS 'test_priv_user'@'%'`);
              await dropResult1.execute();
              const dropResult2 = await rootConnection.query(`DROP USER IF EXISTS 'test_user_short'@'%'`);
              await dropResult2.execute();
              const dropResult3 = await rootConnection.query(`DROP USER IF EXISTS 'test_user_short'@'localhost'`);
              await dropResult3.execute();
            }
          } catch (error) {
            // Ignore errors during cleanup
          }
          
          const createDbResult = await rootConnection.query(`CREATE DATABASE IF NOT EXISTS test_priv_schema`);
          await createDbResult.execute();
        });

        afterAll(async () => {
          try {
            if (tag !== '5.1') {
              const dropResult1 = await rootConnection.query(`DROP USER IF EXISTS 'test_priv_user'@'%'`);
              await dropResult1.execute();
              const dropResult2 = await rootConnection.query(`DROP USER IF EXISTS 'test_user_short'@'%'`);
              await dropResult2.execute();
              const dropResult3 = await rootConnection.query(`DROP USER IF EXISTS 'test_user_short'@'localhost'`);
              await dropResult3.execute();
              const dropResult4 = await rootConnection.query(`DROP USER IF EXISTS 'test_limits_user'@'%'`);
              await dropResult4.execute();
            }
            const dropDbResult = await rootConnection.query(`DROP DATABASE IF EXISTS test_priv_schema`);
            await dropDbResult.execute();
          } catch (error) {
            // Ignore errors during cleanup
          }
        });

        it('should create a user', async () => {
          const userName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const result = await rootConnection.query(`CREATE USER '${userName}'@'%' IDENTIFIED BY 'abc123'`);
          await result.execute();
          
          const queryResult = await rootConnection.query(`SELECT User, Host FROM mysql.user WHERE User='${userName}'`);
          const rows = await queryResult.execute();
          expect(rows[0].rows.length).toBeGreaterThan(0);
        });

        it('should list users', async () => {
          const userName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const queryResult = await rootConnection.query(`SELECT User, Host FROM mysql.user`);
          const rows = await queryResult.execute();
          expect(Array.isArray(rows[0].rows)).toBeTruthy();
          
          // For MySQL 5.1, check by column index, for newer versions check by property name
          if (tag === '5.1') {
            expect(rows[0].rows.some((u) => u.c0 === userName || u.User === userName)).toBeTruthy();
          } else {
            expect(rows[0].rows.some((u) => u.User === userName || u.c0 === userName)).toBeTruthy();
          }
        });

        it('should get user authentication details', async () => {
          // Skip this test for MySQL 5.1 as it doesn't have the plugin column
          if (tag === '5.1') return;
          
          const userName = 'test_priv_user';
          const queryResult = await rootConnection.query(
            `SELECT plugin AS Authentication_Type, authentication_string FROM mysql.user WHERE User='${userName}' AND Host='%'`
          );
          const rows = await queryResult.execute();
          // Check both property name and column index as MySQL returns differently
          expect(rows[0].rows[0].Authentication_Type !== undefined || rows[0].rows[0].c0 !== undefined).toBeTruthy();
        });

        it('should get user resource limits', async () => {
          const userName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const queryResult = await rootConnection.query(
            `SELECT max_questions, max_updates, max_connections, max_user_connections FROM mysql.user WHERE User='${userName}' AND Host='%'`
          );
          const rows = await queryResult.execute();
          
          // Check both property names and column indices
          const row = rows[0].rows[0];
          expect(row.max_questions !== undefined || row.c0 !== undefined).toBeTruthy();
          expect(row.max_updates !== undefined || row.c1 !== undefined).toBeTruthy();
          expect(row.max_connections !== undefined || row.c2 !== undefined).toBeTruthy();
          expect(row.max_user_connections !== undefined || row.c3 !== undefined).toBeTruthy();
        });

        it('should get user privileges', async () => {
          const userName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const queryResult = await rootConnection.query(
            `SELECT Super_priv, Create_priv, Drop_priv, Grant_priv, Insert_priv, Update_priv, Delete_priv FROM mysql.user WHERE User='${userName}' AND Host='%'`
          );
          const rows = await queryResult.execute();
          
          // Check both property names and column indices
          const row = rows[0].rows[0];
          expect(row.Super_priv !== undefined || row.c0 !== undefined).toBeTruthy();
        });

        it('should show grants for user', async () => {
          const userName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const queryResult = await rootConnection.query(`SHOW GRANTS FOR '${userName}'@'%'`);
          const rows = await queryResult.execute();
          expect(Array.isArray(rows[0].rows)).toBeTruthy();
        });

        it('should set and update password', async () => {
          // Skip ALTER USER for MySQL 5.1 as it doesn't support this syntax
          if (tag === '5.1') return;
          
          const userName = 'test_priv_user';
          const updateResult = await rootConnection.query(`ALTER USER '${userName}'@'%' IDENTIFIED BY 'def456'`);
          await updateResult.execute();
          
          const queryResult = await rootConnection.query(
            `SELECT User, Host, authentication_string FROM mysql.user WHERE User='${userName}'`
          );
          const rows = await queryResult.execute();
          expect(rows[0].rows[0].authentication_string !== null || rows[0].rows[0].c2 !== null).toBeTruthy();
        });

        it('should change host', async () => {
          const userName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const renameResult = await rootConnection.query(`RENAME USER '${userName}'@'%' TO '${userName}'@'localhost'`);
          await renameResult.execute();
          
          const queryResult = await rootConnection.query(`SELECT User, Host FROM mysql.user WHERE User='${userName}'`);
          const rows = await queryResult.execute();
          expect(rows[0].rows[0].Host === 'localhost' || rows[0].rows[0].c1 === 'localhost').toBeTruthy();
        });

        it('should rename user', async () => {
          // Use shorter username for MySQL 5.1 (16 char limit)
          const oldUserName = tag === '5.1' ? 'test_priv_user' : 'test_priv_user';
          const newUserName = tag === '5.1' ? 'test_user_short' : 'test_user_short';
          
          const renameResult = await rootConnection.query(`RENAME USER '${oldUserName}'@'localhost' TO '${newUserName}'@'localhost'`);
          await renameResult.execute();
          
          const queryResult = await rootConnection.query(`SELECT User, Host FROM mysql.user WHERE User='${newUserName}'`);
          const rows = await queryResult.execute();
          expect(rows[0].rows[0].User === newUserName || rows[0].rows[0].c0 === newUserName).toBeTruthy();
        });

        it('should set limits when creating user', async () => {
          // Skip WITH clause for MySQL 5.1 as it doesn't support this syntax
          if (tag === '5.1') return;
          
          // Clean up any existing user first
          try {
            const dropResult = await rootConnection.query(`DROP USER IF EXISTS 'test_limits_user'@'%'`);
            await dropResult.execute();
          } catch (error) {
            // Ignore if user doesn't exist
          }
          
          const createResult = await rootConnection.query(
            `CREATE USER 'test_limits_user'@'%' IDENTIFIED BY 'password' WITH MAX_QUERIES_PER_HOUR 10 MAX_UPDATES_PER_HOUR 20 MAX_CONNECTIONS_PER_HOUR 30 MAX_USER_CONNECTIONS 40`
          );
          await createResult.execute();
          
          const queryResult = await rootConnection.query(`SELECT max_questions, max_updates, max_connections, max_user_connections FROM mysql.user WHERE User='test_limits_user'`);
          const rows = await queryResult.execute();
          const row = rows[0].rows[0];
          expect(row.max_questions === 10 || row.c0 === 10).toBeTruthy();
          expect(row.max_updates === 20 || row.c1 === 20).toBeTruthy();
          expect(row.max_connections === 30 || row.c2 === 30).toBeTruthy();
          expect(row.max_user_connections === 40 || row.c3 === 40).toBeTruthy();
          
          // Clean up
          const cleanupResult = await rootConnection.query(`DROP USER 'test_limits_user'@'%'`);
          await cleanupResult.execute();
        });

        it('should grant privileges on schema', async () => {
          const userName = tag === '5.1' ? 'test_user_short' : 'test_user_short';
          const grantResult = await rootConnection.query(`GRANT SELECT, INSERT ON test_priv_schema.* TO '${userName}'@'localhost'`);
          await grantResult.execute();
          
          const queryResult = await rootConnection.query(`SHOW GRANTS FOR '${userName}'@'localhost'`);
          const rows = await queryResult.execute();
          const grants = rows[0].rows.map(row => Object.values(row)[0]);
          expect(grants.some(grant => grant.includes('SELECT'))).toBeTruthy();
          expect(grants.some(grant => grant.includes('INSERT'))).toBeTruthy();
        });

        it('should revoke all privileges', async () => {
          const userName = tag === '5.1' ? 'test_user_short' : 'test_user_short';
          const revokeResult = await rootConnection.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${userName}'@'localhost'`);
          await revokeResult.execute();
          
          const queryResult = await rootConnection.query(`SHOW GRANTS FOR '${userName}'@'localhost'`);
          const rows = await queryResult.execute();
          const grants = rows[0].rows.map(row => Object.values(row)[0]);
          expect(grants.every(grant => grant.startsWith('GRANT USAGE'))).toBeTruthy();
        });

        it('should expire password', async () => {
          // Skip password expiration for MySQL 5.1 as it doesn't support ALTER USER
          if (tag === '5.1') return;
          
          const userName = 'test_user_short';
          const expireResult = await rootConnection.query(`ALTER USER '${userName}'@'localhost' PASSWORD EXPIRE`);
          await expireResult.execute();
          
          const queryResult = await rootConnection.query(
            `SELECT password_expired FROM mysql.user WHERE User = '${userName}' AND Host = 'localhost'`
          );
          const rows = await queryResult.execute();
          const row = rows[0].rows[0];
          expect((row.password_expired === 'Y' || row.password_expired === 1) || (row.c0 === 'Y' || row.c0 === 1)).toBeTruthy();
        });

        it('should delete a user', async () => {
          const userName = tag === '5.1' ? 'test_user_short' : 'test_user_short';
          const dropResult = await rootConnection.query(`DROP USER '${userName}'@'localhost'`);
          await dropResult.execute();
          
          const queryResult = await rootConnection.query(`SELECT User, Host FROM mysql.user WHERE User='${userName}'`);
          const rows = await queryResult.execute();
          expect(rows[0].rows.length).toBe(0);
        });
      });
    }

  })
}

TEST_VERSIONS.forEach(({ version, socket, readonly, image, options }) => testWith(version, socket, readonly, image, options ))

