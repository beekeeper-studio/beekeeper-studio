import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'
import { runBksTypeTests } from "./bksType";

describe("MariaDB Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    container = await new GenericContainer("mariadb")
      .withName("maria")
      .withEnvironment({
        "MYSQL_ROOT_PASSWORD": "test",
        "MYSQL_DATABASE": "test"
      })
      .withExposedPorts(3306)
      .withStartupTimeout(dbtimeout)
      .start()
    jest.setTimeout(timeoutDefault)
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

  describe("BksField tests", () => {
    beforeAll(async () => {
      await util.knex.schema.createTable("bks_types", (table) => {
        table.specificType("tinyint_col", "TINYINT");
        table.specificType("smallint_col", "SMALLINT");
        table.specificType("mediumint_col", "MEDIUMINT");
        table.specificType("int_col", "INT");
        table.specificType("bigint_col", "BIGINT");
        table.specificType("decimal_col", "DECIMAL(10,2)");
        table.specificType("float_col", "FLOAT");
        table.specificType("double_col", "DOUBLE");
        table.specificType("bit_col", "BIT(8)");
        table.specificType("char_col", "CHAR(10)");
        table.specificType("varchar_col", "VARCHAR(255)");
        table.specificType("tinytext_col", "TINYTEXT");
        table.specificType("text_col", "TEXT");
        table.specificType("mediumtext_col", "MEDIUMTEXT");
        table.specificType("longtext_col", "LONGTEXT");
        table.specificType("enum_col", "ENUM('a', 'b')");
        table.specificType("set_col", "SET('a', 'b')");
        table.specificType("json_col", "JSON");
        table.specificType(
          "binary_collation_col",
          "CHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
        );
        table.specificType("date_col", "DATE");
        table.specificType("datetime_col", "DATETIME");
        table.specificType("timestamp_col", "TIMESTAMP NULL");
        table.specificType("time_col", "TIME");
        table.specificType("year_col", "YEAR");
        table.specificType("boolean_col", "BOOLEAN");
        table.specificType("tinyint1_col", "TINYINT(1)");
        table.specificType("binary_col", "BINARY(8)");
        table.specificType("varbinary_col", "VARBINARY(8)");
        table.specificType("tinyblob_col", "TINYBLOB");
        table.specificType("blob_col", "BLOB");
        table.specificType("mediumblob_col", "MEDIUMBLOB");
        table.specificType("longblob_col", "LONGBLOB");
      });
    });

    afterAll(async () => {
      await util.knex.schema.dropTable("bks_types");
    });

    runBksTypeTests({
      connection: () => util.connection,
      table: "bks_types",
      expectedResults: {
        BINARY: [
          "binary_col",
          "varbinary_col",
          "tinyblob_col",
          "blob_col",
          "mediumblob_col",
          "longblob_col",
        ],
        STRING: [
          "char_col",
          "varchar_col",
          "tinytext_col",
          "text_col",
          "mediumtext_col",
          "longtext_col",
          "enum_col",
          "set_col",
          "json_col",
          "binary_collation_col",
        ],
        NUMBER: [
          "tinyint_col",
          "smallint_col",
          "mediumint_col",
          "int_col",
          "bigint_col",
          "decimal_col",
          "float_col",
          "double_col",
          "bit_col",
        ],
        DATETIME: [
          "date_col",
          "datetime_col",
          "timestamp_col",
          "time_col",
          "year_col",
        ],
        BOOLEAN: ["boolean_col", "tinyint1_col"],
        OBJECTID: [],
        SURREALID: [],
        UNKNOWN: [],
      },
    });
  });
})
