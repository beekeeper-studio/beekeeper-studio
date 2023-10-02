import { MysqlData } from "../../../../shared/src/lib/dialects/mysql";
import { PostgresData } from "../../../../shared/src/lib/dialects/postgresql";
import { SqliteData } from "../../../../shared/src/lib/dialects/sqlite";
import { SqlServerData } from "../../../../shared/src/lib/dialects/sqlserver";
import { TableOrView } from "../../src/lib/db/models";
import { DBHint } from "../../src/lib/editor";
import _ from "lodash";

export const tables: TableOrView[] = [
  {
    schema: "public",
    name: "my_table",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    schema: "public",
    name: "special+table",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    schema: "public",
    name: "MixedCase",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    schema: "_timescaledb_cache",
    name: "my_table",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    schema: "_timescaledb_cache",
    name: "cache_inval_bgw_job",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    schema: "schema with spaces",
    name: "testtable",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
];

export const postgresDBHint: DBHint = {
  defaultSchema: "public",
  defaultTableWordList: {
    my_table: {
      name: "my_table",
      text: "my_table",
      type: "table",
      schema: "public",
    },
    '"special+table"': {
      name: "special+table",
      text: '"special+table"',
      type: "table",
      schema: "public",
    },
    "special+table": {
      name: "special+table",
      text: "special+table",
      type: "table",
      schema: "public",
    },
    '"MixedCase"': {
      name: "MixedCase",
      text: '"MixedCase"',
      type: "table",
      schema: "public",
    },
    MixedCase: {
      name: "MixedCase",
      text: "MixedCase",
      type: "table",
      schema: "public",
    },
  },
  tableWords: [
    {
      name: "my_table",
      text: "my_table",
      type: "table",
      schema: "public",
    },
    {
      name: "special+table",
      text: '"special+table"',
      type: "table",
      schema: "public",
    },
    {
      name: "special+table",
      text: "special+table",
      type: "table",
      schema: "public",
    },
    {
      name: "MixedCase",
      text: '"MixedCase"',
      type: "table",
      schema: "public",
    },
    {
      name: "MixedCase",
      text: "MixedCase",
      type: "table",
      schema: "public",
    },
    {
      name: "my_table",
      text: "my_table",
      type: "table",
      schema: "_timescaledb_cache",
    },
    {
      name: "cache_inval_bgw_job",
      text: "cache_inval_bgw_job",
      type: "table",
      schema: "_timescaledb_cache",
    },
    {
      name: "testtable",
      text: "testtable",
      type: "table",
      schema: "schema with spaces",
    },
  ],
  schemaWordList: {
    public: { name: "public", text: "public", type: "schema" },
    _timescaledb_cache: {
      name: "_timescaledb_cache",
      text: "_timescaledb_cache",
      type: "schema",
    },
    "schema with spaces": {
      name: "schema with spaces",
      text: '"schema with spaces"',
      type: "schema",
    },
  },
  dialect: PostgresData,
};

export const sqlServerDBHint: DBHint = _.chain(postgresDBHint)
  .thru(omitQuotes)
  .assign({ dialect: SqlServerData })
  .value();

export const tablesWithoutSchema: TableOrView[] = [
  {
    name: "my_table",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    name: "MixedCase",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
];

export const sqliteDBHint: DBHint = {
  defaultTableWordList: {
    my_table: {
      name: "my_table",
      text: "my_table",
      type: "table",
    },
    MixedCase: {
      name: "MixedCase",
      text: "MixedCase",
      type: "table",
    },
  },
  tableWords: [
    {
      name: "my_table",
      text: "my_table",
      type: "table",
    },
    {
      name: "MixedCase",
      text: "MixedCase",
      type: "table",
    },
  ],
  schemaWordList: {},
  dialect: SqliteData,
};

export const mysqlDBHint: DBHint = {
  ...sqliteDBHint,
  dialect: MysqlData,
};

function omitQuotes(dbHint: DBHint): DBHint {
  return {
    ...dbHint,
    defaultTableWordList: _.omit(dbHint.defaultTableWordList, [
      '"special+table"',
      '"MixedCase"',
    ]),
    tableWords: dbHint.tableWords.filter(
      (t) => t.text !== '"special+table"' && t.text !== '"MixedCase"'
    ),
    schemaWordList: {
      ...dbHint.schemaWordList,
      "schema with spaces": {
        name: "schema with spaces",
        text: "schema with spaces",
        type: "schema",
      },
    },
  };
}
