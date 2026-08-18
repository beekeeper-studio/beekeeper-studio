import Papa from "papaparse";
import { markdownTable } from "markdown-table";
import _ from "lodash";
import { ColumnDefinition } from "tabulator-tables";

export type StructureCopyFormat = "csv" | "json" | "markdown";

export const structureCopyFormats: { format: StructureCopyFormat; label: string }[] = [
  { format: "csv", label: "Copy as CSV" },
  { format: "json", label: "Copy as JSON" },
  { format: "markdown", label: "Copy as Markdown" },
];

export interface StructureColumn {
  field: string;
  title: string;
}

/**
 * Tabulator columns that only render row controls (the drag handle, the trash
 * button) have no data behind them, so they're dropped before copying.
 */
function isDataColumn(column: ColumnDefinition): boolean {
  return !!column && !!column.field && column.field !== "trash-button" && !column.rowHandle;
}

/** Turn tabulator column definitions into the columns we actually copy. */
export function structureColumns(columns: ColumnDefinition[]): StructureColumn[] {
  return (columns || [])
    .filter(isDataColumn)
    .map((c) => ({ field: c.field, title: _.toString(c.title) || c.field }));
}

/** Flatten a cell value into something that fits in a csv / markdown cell. */
function stringifyValue(value: any): string {
  if (_.isNil(value)) return "";
  if (_.isArray(value)) return value.map(stringifyValue).join(", ");
  if (_.isDate(value)) return value.toISOString();
  if (_.isTypedArray(value)) return value.toString();
  if (_.isObject(value)) return JSON.stringify(value);
  return _.toString(value);
}

/**
 * Markdown tables are line based and pipe delimited, so anything that looks
 * like structure (a check constraint, a trigger body) has to be neutralized.
 */
function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r\n|\r|\n/g, "<br>");
}

export function formatStructure(
  data: Record<string, any>[],
  columns: StructureColumn[],
  format: StructureCopyFormat
): string {
  const rows = data || [];

  if (format === "json") {
    const objects = rows.map((row) => {
      const result: Record<string, any> = {};
      columns.forEach((c) => {
        const value = row[c.field];
        result[c.title] = _.isUndefined(value) ? null : value;
      });
      return result;
    });
    return JSON.stringify(objects, null, 2);
  }

  const headers = columns.map((c) => c.title);
  const cells = rows.map((row) => columns.map((c) => stringifyValue(row[c.field])));

  if (format === "csv") {
    return Papa.unparse(
      { fields: headers, data: cells },
      { quotes: false, escapeFormulae: false }
    );
  }

  return markdownTable([headers, ...cells.map((row) => row.map(escapeMarkdown))]);
}
