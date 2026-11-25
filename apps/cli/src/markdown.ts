import { markdownTable } from "markdown-table";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r\n|\r|\n/g, "<br>");
}

export function yesNo(value: unknown): string {
  return value ? "yes" : "no";
}

export function table(headers: string[], rows: unknown[][]): string {
  return markdownTable([headers, ...rows.map((row) => row.map(cell))]);
}

export function warningsBlock(warnings?: string[]): string[] {
  if (!warnings || warnings.length === 0) return [];
  return ["", "**Warnings**", ...warnings.map((w) => `- ${cell(w)}`)];
}
