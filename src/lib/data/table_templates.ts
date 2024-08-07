import { createdAtColumn, idColumn, Template } from "@shared/lib/dialects/template";

export const BasicTable: Template = new Template({
  name: "Table",
  description: "A table",
  tableName: "untitled_table",
  schemaName: "public"
}, [
  idColumn,
  createdAtColumn,
])