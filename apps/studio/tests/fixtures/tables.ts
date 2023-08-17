import { PostgresData } from "../../../../shared/src/lib/dialects/postgresql";
import { SqliteData } from "../../../../shared/src/lib/dialects/sqlite";
import { TableOrView } from "../../src/lib/db/models";
import { DBHint } from "../../src/lib/editor";

export const tableOrViews: TableOrView[] = [
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
    name: "CASE_SENSITIVE_table",
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

export const dbHint: DBHint = {
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
    '"CASE_SENSITIVE_table"': {
      name: "CASE_SENSITIVE_table",
      text: '"CASE_SENSITIVE_table"',
      type: "table",
      schema: "public",
    },
    CASE_SENSITIVE_table: {
      name: "CASE_SENSITIVE_table",
      text: "CASE_SENSITIVE_table",
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
      name: "CASE_SENSITIVE_table",
      text: '"CASE_SENSITIVE_table"',
      type: "table",
      schema: "public",
    },
    {
      name: "CASE_SENSITIVE_table",
      text: "CASE_SENSITIVE_table",
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

export const tableOrViewsWithoutSchema: TableOrView[] = [
  {
    name: "my_table",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
  {
    name: "UppercasedTable",
    tabletype: "r",
    parenttype: null,
    entityType: "table",
    columns: [],
  },
];

export const dbHintWithoutSchema: DBHint = {
  defaultTableWordList: {
    my_table: {
      name: "my_table",
      text: "my_table",
      type: "table",
    },
    UppercasedTable: {
      name: "UppercasedTable",
      text: "UppercasedTable",
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
      name: "UppercasedTable",
      text: "UppercasedTable",
      type: "table",
    },
  ],
  schemaWordList: {},
  dialect: SqliteData,
};
