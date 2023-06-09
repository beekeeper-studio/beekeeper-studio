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
    MY_TABLE: {
      name: "my_table",
      text: "my_table",
      type: "table",
      schema: "public",
    },
    "SPECIAL+TABLE": {
      name: "special+table",
      text: '"special+table"',
      type: "table",
      schema: "public",
    },
    CACHE_INVAL_BGW_JOB: {
      name: "cache_inval_bgw_job",
      text: "cache_inval_bgw_job",
      type: "table",
      schema: "_timescaledb_cache",
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
      name: "cache_inval_bgw_job",
      text: "cache_inval_bgw_job",
      type: "table",
      schema: "_timescaledb_cache",
    },
  ],
  schemaWordList: {
    PUBLIC: { name: "public", text: "public", type: "schema" },
    _TIMESCALEDB_CACHE:
    {
      name: "_timescaledb_cache",
      text: "_timescaledb_cache",
      type: "schema",
    },
  }
};
