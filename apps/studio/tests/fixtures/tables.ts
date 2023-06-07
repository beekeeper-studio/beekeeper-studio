import { TableOrView } from "../../src/lib/db/models";

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
