// @ts-nocheck
import { createClient } from "@clickhouse/client";

import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runCommonTests } from "./all";
import knex from "knex";
import { ClickhouseKnexClient } from "../../../../../../../shared/src/lib/knex-clickhouse-temp";
import { ClickHouseData } from "@shared/lib/dialects/clickhouse";

// TODO read only mode
describe(`Clickhouse [read-only mode?]`, () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let util: DBTestUtil;

  beforeAll(async () => {
    const timeoutDefault = 5000;
    container = await new GenericContainer("clickhouse/clickhouse-server")
      .withName("some-clickhouse-server")
      .withEnv("CLICKHOUSE_USER", "username")
      .withEnv("CLICKHOUSE_PASSWORD", "password")
      .withEnv("CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT", "1")
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
      readOnlyMode: false, // TODO read only
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

  // it("Clickhouse", async () => {
  //   const config = util.server.getServerConfig();
  //   const client = createClient({
  //     url: config.url,
  //     username: config.user,
  //     password: config.password,
  //     database: util.connection.database.database,
  //   });
  //   function streamToString(stream) {
  //     const chunks = [];
  //     return new Promise((resolve, reject) => {
  //       stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  //       stream.on("error", (err) => reject(err));
  //       stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  //     });
  //   }
  //   async function run(query: string, exec = false) {
  //     console.log({ query });
  //       const res = await client.exec({ query });
  //       const str = await streamToString(res.stream)
  //       console.log(str);
  //     try {
  //       const json = JSON.parse(str)
  //       console.log(json)
  //     } catch (e) {
  //     }
  //     // if (exec) {
  //     // } else {
  //     //   const res = await client.query({ query });
  //     //   console.log({ query, result: (await res.json()).data });
  //     // }
  //   }
  //   await run("SELECT 1 as one FORMAT JSON");
  //   await run("CREATE TABLE test (id Int8) ENGINE = Memory");
  //   await run("INSERT INTO test VALUES (1)", true);
  //   await run("SELECT * FROM test FORMAT JSON");
  //   await run("TRUNCATE TABLE test");
  //   await run("SELECT * FROM test FORMAT JSON");
  // });

  describe("Common Tests", () => {
    runCommonTests(() => util, {
      disabledFeatures: {
        ...ClickHouseData.disabledFeatures,
        transactions: true,
      },
    });
    // if (options.readOnly) {
    //   runReadOnlyTests(() => util)
    // } else {
    //   runCommonTests(() => util)
    // }
  });

});
