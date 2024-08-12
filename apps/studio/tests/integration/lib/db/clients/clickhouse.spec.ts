import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runCommonTests, runReadOnlyTests } from "./all";
import knex from "knex";
import { ClickhouseKnexClient } from "@shared/lib/knex-clickhouse";

function testWith(options = { readOnly: false }) {
  describe(`Clickhouse [read-only mode? ${options.readOnly}]`, () => {
    jest.setTimeout(dbtimeout);

    let container: StartedTestContainer;
    let util: DBTestUtil;

    beforeAll(async () => {
      const timeoutDefault = 5000;
      container = await new GenericContainer("clickhouse/clickhouse-server")
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
        nullDateTime: "1970-01-01 00:00:00",
      });

      await util.setupdb();
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

testWith({ readOnly: false });
testWith({ readOnly: true });
