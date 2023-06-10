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
    schema: "public",
    name: "CASE_sensitive_table",
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
];

export const dbHint: DBHint = {
  tableWordList: {
    my_table: {
      name: "my_table",
      text: "my_table",
      type: "table",
      schema: "public",
    },
    "special+table": {
      name: "special+table",
      text: '"special+table"',
      type: "table",
      schema: "public",
    },
    cache_inval_bgw_job: {
      name: "cache_inval_bgw_job",
      text: "cache_inval_bgw_job",
      type: "table",
      schema: "_timescaledb_cache",
    },
    CASE_SENSITIVE_table: {
      name: "CASE_SENSITIVE_table",
      text: '"CASE_SENSITIVE_table"',
      type: "table",
      schema: "public",
    },
    CASE_sensitive_table: {
      name: "CASE_sensitive_table",
      text: '"CASE_sensitive_table"',
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
      name: "CASE_SENSITIVE_table",
      text: '"CASE_SENSITIVE_table"',
      type: "table",
      schema: "public",
    },
    {
      name: "CASE_sensitive_table",
      text: '"CASE_sensitive_table"',
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
  ],
  schemaWordList: {
    public: { name: "public", text: "public", type: "schema" },
    _timescaledb_cache: {
      name: "_timescaledb_cache",
      text: "_timescaledb_cache",
      type: "schema",
    },
  },
};
