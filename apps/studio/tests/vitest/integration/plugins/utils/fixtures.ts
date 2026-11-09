import type { TableOrView } from "@/lib/db/models";

export const tables: TableOrView[] = [
  {
    name: "users",
    schema: "public",
    entityType: "table",
    columns: [
      { columnName: "id", dataType: "integer" },
      { columnName: "name", dataType: "varchar" },
      { columnName: "email", dataType: "varchar" },
    ],
  } as TableOrView,
  {
    name: "orders",
    schema: "public",
    entityType: "table",
    columns: [
      { columnName: "id", dataType: "integer" },
      { columnName: "user_id", dataType: "integer" },
      { columnName: "total", dataType: "decimal" },
    ],
  } as TableOrView,
  {
    name: "products",
    schema: "private",
    entityType: "table",
    columns: [
      { columnName: "id", dataType: "integer" },
      { columnName: "name", dataType: "varchar" },
      { columnName: "price", dataType: "decimal" },
    ],
  } as TableOrView,
  {
    name: "categories",
    schema: "private",
    entityType: "table",
    columns: [
      { columnName: "id", dataType: "integer" },
      { columnName: "name", dataType: "varchar" },
    ],
  } as TableOrView,
  {
    name: "reviews",
    schema: null,
    entityType: "table",
    columns: [
      { columnName: "id", dataType: "integer" },
      { columnName: "rating", dataType: "integer" },
    ],
  } as TableOrView,
];
