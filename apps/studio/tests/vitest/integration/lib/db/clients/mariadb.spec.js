import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '@tests/lib/db'
import { runCommonTests } from '@tests/vitest/integration/lib/db/clients/all'
import { runBksFieldTests } from "./bksFieldTests";

describe("MariaDB Tests", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container;
  let util

  beforeAll(async () => {
    container = await new GenericContainer("mariadb")
      .withName("maria")
      .withEnvironment({
        "MYSQL_ROOT_PASSWORD": "test",
        "MYSQL_DATABASE": "test"
      })
      .withExposedPorts(3306)
      .withStartupTimeout(dbtimeout)
      .start()
    const config = {
      client: 'mariadb',
      host: container.getHost(),
      port: container.getMappedPort(3306),
      user: 'root',
      password: 'test'
    }
    util = new DBTestUtil(config, "test", { dialect: 'mysql'})
    await util.setupdb()
  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })

  runBksFieldTests({
    connection: () => util.connection,
    table: "bks_types",
    setup: `
      CREATE TABLE bks_types (
        -- BINARY
        binary_col BINARY(8), varbinary_col VARBINARY(8), tinyblob_col TINYBLOB,
        blob_col BLOB, mediumblob_col MEDIUMBLOB, longblob_col LONGBLOB,

        -- NUMBER
        tinyint_col TINYINT, smallint_col SMALLINT, mediumint_col MEDIUMINT,
        int_col INT, bigint_col BIGINT, decimal_col DECIMAL(10,2),
        float_col FLOAT, double_col DOUBLE, bit_col BIT(8),

        -- STRING
        char_col CHAR(10), varchar_col VARCHAR(255), tinytext_col TINYTEXT,
        text_col TEXT, mediumtext_col MEDIUMTEXT, longtext_col LONGTEXT,
        enum_col ENUM('a', 'b'), set_col SET('a', 'b'), json_col JSON,
        binary_collation_col CHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,

        -- DATETIME
        date_col DATE, datetime_col DATETIME, timestamp_col TIMESTAMP NULL,
        time_col TIME, year_col YEAR,

        -- BOOLEAN
        boolean_col BOOLEAN, tinyint1_col TINYINT(1)
      );
    `,
    // prettier-ignore
    expectedResults: {
      BINARY: ["binary_col", "varbinary_col", "tinyblob_col", "blob_col",
        "mediumblob_col", "longblob_col"],
      STRING: ["char_col", "varchar_col", "tinytext_col", "text_col",
        "mediumtext_col", "longtext_col", "enum_col", "set_col", "json_col",
        "binary_collation_col"],
      NUMBER: ["tinyint_col", "smallint_col", "mediumint_col", "int_col",
        "bigint_col", "decimal_col", "float_col", "double_col", "bit_col"],
      DATETIME: ["date_col", "datetime_col", "timestamp_col", "time_col",
        "year_col"],
      BOOLEAN: ["boolean_col", "tinyint1_col"],
      OBJECTID: [],
      SURREALID: [],
      UNKNOWN: [],
    },
  });
})
