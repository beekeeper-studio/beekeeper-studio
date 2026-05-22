import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runCommonTests, runReadOnlyTests } from "./all";
import knex from "knex";
import { ClickhouseKnexClient } from "@shared/lib/knex-clickhouse";
import fs from 'fs';
import path from 'path';
import { identify } from 'sql-query-identifier';

const TEST_VERSIONS = [
  { tag: 'latest', readOnly: false, dropInformation: false },
  { tag: 'latest', readOnly: false, dropInformation: true },
  { tag: 'latest', readOnly: true, dropInformation: false },
  { tag: '24.2', readOnly: false, dropInformation: false },
  { tag: '24.2', readOnly: false, dropInformation: true },
  { tag: '24.2', readOnly: true, dropInformation: false },
] as const

function testWith(options: typeof TEST_VERSIONS[number]) {
  describe(`Clickhouse [${options.tag} read-only mode? ${options.readOnly}]`, () => {
    jest.setTimeout(dbtimeout);

    let container: StartedTestContainer;
    let util: DBTestUtil;

    beforeAll(async () => {
      const timeoutDefault = 5000;
      container = await new GenericContainer(`clickhouse/clickhouse-server:${options.tag}`)
        .withName(`clickhouse-server-readonly-${options.readOnly.toString()}`)
        .withEnvironment({
          CLICKHOUSE_USER: "username",
          CLICKHOUSE_PASSWORD: "password",
          CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1",
        })
        .withExposedPorts(8123)
        .withStartupTimeout(dbtimeout)
        .start();
      jest.setTimeout(timeoutDefault);

      await container.exec([
        "clickhouse-client",
        "--query",
        "CREATE DATABASE my_database;",
      ]);

      if (options.dropInformation) {
        // ensure that our driver works even if information schema isn't present, as it may not be on
        // more legacy systems
        await container.exec([
          "clickhouse-client",
          "--query",
          "DROP DATABASE IF EXISTS information_schema"
        ])
        await container.exec([
          "clickhouse-client",
          "--query",
          "DROP DATABASE IF EXISTS INFORMATION_SCHEMA"
        ])
      }

      const url = `http://${container.getHost()}:${container.getMappedPort(
        8123
      )}/`;

      const config = {
        client: "clickhouse",
        url,
        user: "username",
        password: "password",
        readOnlyMode: options.readOnly,
      } as IDbConnectionServerConfig;

      util = new DBTestUtil(config, "my_database", {
        dialect: "clickhouse",
        knex: knex({
          client: ClickhouseKnexClient,
          connection: {
            // @ts-expect-error
            url,
            user: config.user,
            password: config.password,
            database: "my_database",
          },
        }),
        queryTestsTableCreationQuery: 'CREATE TABLE one_record (one INTEGER) ENGINE = MergeTree ORDER BY (one)',
      });

      await util.setupdb();

      const query = fs.readFileSync(path.resolve(__dirname, './scripts/clickhouse.init.sql'), 'utf-8');
      const statements = identify(query, { strict: false })
      for (const statement of statements) {
        await util.knex.schema.raw(statement.text);
      }
    });

    afterAll(async () => {
      await util.disconnect();
      await container.stop();
    });

    describe("Common Tests", () => {
      if (options.readOnly) {
        runReadOnlyTests(() => util);
      } else {
        runCommonTests(() => util);
      }
    });

    // TODO (azmi): These materialized views tests should be in common tests.
    // They're here for now to fix clickhouse
    it("should list materialized views correctly", async () => {
      const views = await util.connection.listMaterializedViews()
      expect(views).toStrictEqual([
        {
          entityType: "materialized-view",
          name: "up_down_votes_per_day_mv",
        },
      ])
    })

    // TODO (azmi): These materialized views tests should be in common tests.
    // They're here for now to fix clickhouse
    it("should list materialized views columns correctly", async () => {
      const views = await util.connection.listMaterializedViewColumns('up_down_votes_per_day_mv')
      expect(views).toStrictEqual([
        {
          columnName: "Day",
          dataType: "Date",
          tableName: "up_down_votes_per_day_mv",
        },
        {
          columnName: "UpVotes",
          dataType: "UInt64",
          tableName: "up_down_votes_per_day_mv",
        },
        {
          columnName: "DownVotes",
          dataType: "UInt64",
          tableName: "up_down_votes_per_day_mv",
        },
      ])
    })

    // Generated columns showing as NULL when browsing but returning values
    // when selected directly.
    // https://github.com/beekeeper-studio/beekeeper-studio/issues/2982
    it("should query table with generated columns", async () => {
      await util.knex.schema.raw(`
        CREATE TABLE ch_generated_column
        (
            MinimumLevel UInt8, Cost UInt16, ProductValueMultiplier Float32,
            CostPerProductValueMultiplier Float32 MATERIALIZED Cost / ProductValueMultiplier -- This is the generated (materialized) column
        )
        ENGINE = MergeTree()
        ORDER BY MinimumLevel;
      `)
      await util.knex.schema.raw(`
        INSERT INTO ch_generated_column (MinimumLevel, Cost, ProductValueMultiplier)
        VALUES (1, 7, 1);
      `)
      const { result } = await util.connection.selectTop('ch_generated_column', 0, 10, [], [])
      expect(result).toStrictEqual([
        {
          Cost: 7,
          CostPerProductValueMultiplier: 7,
          MinimumLevel: 1,
          ProductValueMultiplier: 1,
        }
      ])
    })

    describe("Formats in select queries", () => {
      it("queries with default format", async () => {
        const sql = "SELECT 'a' AS first, 2 AS second";
        const query = await util.connection.query(sql);
        const result = (await query.execute())[0];
        expect(result.rows).toStrictEqual([{ c0: "a", c1: 2 }]);
        expect(result.fields).toStrictEqual([
          { id: "c0", name: "first", dataType: "String" },
          { id: "c1", name: "second", dataType: "UInt8" },
        ]);
      });

      it("queries with non-default format", async () => {
        const sql = "SELECT 'a' AS first, 2 AS second FORMAT JSON";
        const query = await util.connection.query(sql);
        const result = (await query.execute())[0];
        expect(result.fields).toStrictEqual([{ id: "c0", name: "Result" }]);
        /** Make it easier to test by removing all whitespaces and elapsed prop. */
        const format = (str: string) =>
          str.replaceAll(/\s/g, "").replaceAll(/"elapsed":\d+\.\d+,/g, "");
        expect(format(result.rows[0].c0)).toStrictEqual(
          format(`
          {
            "meta": [
              {
                "name": "first",
                "type": "String"
              },
              {
                "name": "second",
                "type": "UInt8"
              }
            ],
            "data": [
              {
                "first": "a",
                "second": 2
              }
            ],
            "rows": 1,
            "statistics": {
              "elapsed": 0.000852375,
              "rows_read": 1,
              "bytes_read": 1
            }
          }
        `)
        );
      });

      // Regression: multiline SELECT with FORMAT clause must be routed
      // through client.exec() (raw stream), not client.query() (structured
      // JSON). Before the `s` flag fix on RE_SELECT_FORMAT the `.+` in the
      // regex did not match newlines, so a query like:
      //   SELECT\n  'a'\nFORMAT JSON
      // was incorrectly treated as a normal SELECT (structured path).
      it("queries with FORMAT clause in a multiline SELECT", async () => {
        const sql = "SELECT\n  'a' AS first,\n  2 AS second\nFORMAT JSON";
        const query = await util.connection.query(sql);
        const result = (await query.execute())[0];
        // When FORMAT is detected the query goes through the exec/stream
        // path and returns a single "Result" field with the raw response.
        expect(result.fields).toStrictEqual([{ id: "c0", name: "Result" }]);
        const parsed = JSON.parse(result.rows[0].c0);
        expect(parsed.data).toStrictEqual([{ first: "a", second: 2 }]);
      });

      it("queries with FORMAT clause in a multiline SELECT (CSV)", async () => {
        const sql = "SELECT\n  1 AS num,\n  'hello' AS word\nFORMAT CSV";
        const query = await util.connection.query(sql);
        const result = (await query.execute())[0];
        expect(result.fields).toStrictEqual([{ id: "c0", name: "Result" }]);
        // CSV output should contain the values but not be structured JSON
        expect(result.rows[0].c0).toContain("hello");
      });
    });

    // Regression: rawExecuteQuery previously passed the full multi-statement
    // `query` string to client.exec() instead of the individual
    // `statement.text`. ClickHouse does not support multi-statement
    // queries, so sending the unsplit string caused exec() to fail.
    // The fix ensures each parsed statement is sent individually.
    describe("rawExecuteQuery uses statement.text not query", () => {
      if (!options.readOnly) {
        it("should successfully execute a non-SELECT statement that was parsed from a multi-statement string", async () => {
          // Non-SELECT statements go through the exec() path. Before the
          // fix, exec() received the full multi-statement `query` string
          // which ClickHouse rejects. After the fix it receives just the
          // individual `statement.text`.
          const tableName = "raw_exec_regression";
          await util.knex.schema.raw(`DROP TABLE IF EXISTS ${tableName}`);

          const sql = `CREATE TABLE ${tableName} (id UInt32) ENGINE = MergeTree ORDER BY id; INSERT INTO ${tableName} VALUES (1)`;
          const query = await util.connection.query(sql);
          await expect(query.execute()).resolves.toBeDefined();

          const countQuery = await util.connection.query(`SELECT count() AS cnt FROM ${tableName}`);
          const countResult = (await countQuery.execute())[0];
          expect(Number(countResult.rows[0].c0)).toBe(1);

          await util.knex.schema.raw(`DROP TABLE IF EXISTS ${tableName}`);
        });

        it("should successfully execute an INSERT parsed from a multi-statement string", async () => {
          await util.knex.schema.raw(`
            CREATE TABLE IF NOT EXISTS raw_exec_insert_test (val UInt32)
            ENGINE = MergeTree ORDER BY val
          `);
          await util.knex.schema.raw("TRUNCATE TABLE raw_exec_insert_test");

          // Two INSERTs — both go through exec(). Before the fix the
          // full string "INSERT ...;INSERT ..." was sent, which ClickHouse
          // would reject.
          const sql = "INSERT INTO raw_exec_insert_test VALUES (1); INSERT INTO raw_exec_insert_test VALUES (2)";
          const query = await util.connection.query(sql);
          await expect(query.execute()).resolves.toBeDefined();

          const countQuery = await util.connection.query("SELECT count() AS cnt FROM raw_exec_insert_test");
          const countResult = (await countQuery.execute())[0];
          expect(Number(countResult.rows[0].c0)).toBe(2);
        });
      }

      it("should successfully execute a SELECT with FORMAT parsed from a multi-statement string", async () => {
        // A SELECT with FORMAT goes through the exec() path (not the
        // query() path). Before the fix, exec() received the full
        // multi-statement string, causing ClickHouse to error.
        const sql = "SELECT 1 AS a FORMAT JSON; SELECT 2 AS b FORMAT CSV";
        const query = await util.connection.query(sql);
        const results = await query.execute();
        expect(results).toHaveLength(2);

        // First result: FORMAT JSON — should be raw JSON string
        const parsed = JSON.parse(results[0].rows[0].c0);
        expect(parsed.data).toStrictEqual([{ a: 1 }]);

        // Second result: FORMAT CSV — should contain the value
        expect(results[1].rows[0].c0).toContain("2");
      });
    });
  });
}

TEST_VERSIONS.forEach(testWith);
