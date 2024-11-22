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
  { tag: 'latest', readOnly: false },
  { tag: 'latest', readOnly: true },
  { tag: '24.2', readOnly: false },
  { tag: '24.2', readOnly: true },
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
    });
  });
}

TEST_VERSIONS.forEach(testWith);
