import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { DockerComposeEnvironment } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '@tests/lib/db'
import { runCommonTests } from './all';
import { runBksFieldTests } from "./bksFieldTests";

describe("CockroachDB Tests", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container;
  let util
  let environment
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    environment = await new DockerComposeEnvironment("tests/docker", "cockroachdb.yml").up()
    container = environment.getContainer('test_cockroachdb')
    const config = {
      client: 'cockroachdb',
      host: container.getHost(),
      port: container.getMappedPort(26257),
      user: 'root',
    }
    util = new DBTestUtil(config, "defaultdb", {dialect: 'postgresql', version: '7.2', skipPkQuote: true, defaultSchema: 'public'})
    await util.setupdb();

    await util.knex.raw(`
      CREATE TABLE public.test_indexes (
        first_name text NOT NULL,
        last_name text NOT NULL,
        data jsonb NOT NULL DEFAULT '{"a": {"b": ["foo", "bar"]}}'::jsonb
      );

      CREATE INDEX single_column ON test_indexes (first_name);
      CREATE INDEX multi_column ON test_indexes (first_name, last_name);
      CREATE INDEX single_expression ON test_indexes (lower(first_name));
      CREATE INDEX multi_expression ON test_indexes (lower(first_name), lower(last_name));
      CREATE INDEX expression_with_comma ON test_indexes ((lower(first_name) || ', ' || lower(last_name)));
      CREATE INDEX expression_with_double_quote ON test_indexes (('"' || first_name));
      CREATE INDEX expression_with_jsonb_operator ON test_indexes ((data #>> '{a,b,1}'));
    `);

  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
    if (environment) {
      await environment.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  it("should be able to list basic indexes", async () => {
    const indexes = await util.connection.listTableIndexes('test_indexes')
    // cockroach adds a pkey index
    expect(indexes.length).toBe(8)
    expect(indexes.find((idx) => idx.name === 'single_column').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'multi_column').columns.length).toBe(2)
    expect(indexes.find((idx) => idx.name === 'single_expression').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'multi_expression').columns.length).toBe(2)
    expect(indexes.find((idx) => idx.name === 'expression_with_comma').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'expression_with_double_quote').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'expression_with_jsonb_operator').columns.length).toBe(1)
  })

  runBksFieldTests({
    connection: () => util.connection,
    table: "bks_types",
    setup: `
      CREATE TABLE bks_types (
        -- BINARY
        bytea_col BYTEA,

        -- NUMBER
        smallint_col SMALLINT, integer_col INTEGER, bigint_col BIGINT,
        decimal_col DECIMAL(10,2), real_col REAL, double_col DOUBLE PRECISION,

        -- STRING
        char_col CHAR(10), varchar_col VARCHAR(255), text_col TEXT,
        uuid_col UUID, json_col JSON, jsonb_col JSONB, inet_col INET,
        bit_col BIT(8),

        -- DATETIME
        date_col DATE, time_col TIME, timetz_col TIMETZ,
        timestamp_col TIMESTAMP, timestamptz_col TIMESTAMPTZ,
        interval_col INTERVAL,

        -- BOOLEAN
        boolean_col BOOLEAN,

        PRIMARY KEY (integer_col)
      );
    `,
    // prettier-ignore
    expectedResults: {
      BINARY: ["bytea_col"],
      STRING: ["char_col", "varchar_col", "text_col", "uuid_col", "json_col",
        "jsonb_col", "inet_col", "bit_col"],
      NUMBER: ["smallint_col", "integer_col", "bigint_col", "decimal_col",
        "real_col", "double_col"],
      DATETIME: ["date_col", "time_col", "timetz_col", "timestamp_col",
        "timestamptz_col", "interval_col"],
      BOOLEAN: ["boolean_col"],
      OBJECTID: [],
      SURREALID: [],
      UNKNOWN: [],
    },
  });
})
