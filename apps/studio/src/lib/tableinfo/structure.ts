import Papa from "papaparse";
import { markdownTable } from "markdown-table";
import _ from "lodash";
import { ColumnDefinition, Tabulator } from "tabulator-tables";

export type StructureCopyFormat = "csv" | "json" | "markdown";

export const structureCopyFormats: { format: StructureCopyFormat; name: string }[] = [
  { format: "csv", name: "CSV" },
  { format: "json", name: "JSON" },
  { format: "markdown", name: "Markdown" },
];

export interface StructureColumn {
  field: string;
  title: string;
}

/**
 * Tabulator columns that only render row controls (the drag handle, the trash
 * button) have no data behind them, so they're dropped.
 */
function isDataColumn(column: ColumnDefinition): boolean {
  return !!column && !!column.field && column.field !== "trash-button" && !column.rowHandle;
}

/** Turn tabulator column definitions into the columns we copy and search. */
export function structureColumns(columns: ColumnDefinition[]): StructureColumn[] {
  return (columns || [])
    .filter(isDataColumn)
    .map((c) => ({ field: c.field, title: _.toString(c.title) || c.field }));
}

/** The columns a live tabulator instance is actually showing. */
export function tabulatorStructureColumns(tabulator: Tabulator): StructureColumn[] {
  if (!tabulator) return [];
  const definitions = tabulator
    .getColumns()
    .filter((column) => column.isVisible())
    .map((column) => column.getDefinition());
  return structureColumns(definitions);
}

/** Flatten a cell value into something that fits in a csv / markdown cell. */
export function stringifyValue(value: any): string {
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

export interface StructureFilterParams {
  /** Already lowercased and trimmed by the caller */
  term: string;
  fields: string[];
}

/**
 * Tabulator filter function. A row is kept when any of the searched fields
 * contains the term, so it reads as a plain "find it anywhere" search rather
 * than a per-column match.
 */
export function structureFilter(
  row: Record<string, any>,
  params: StructureFilterParams
): boolean {
  if (!params.term) return true;
  return params.fields.some((field) =>
    stringifyValue(row[field]).toLowerCase().includes(params.term)
  );
}
