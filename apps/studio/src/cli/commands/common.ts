import { markdownTable } from "markdown-table";
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import { CLI_ENTITY_TYPES, CliEntityType } from "@/cli/protocol";
import { CliClient } from "@/cli/CliClient";
import type { CliOutputFormat } from "@/cli/program";

const ENTITY_TYPE_ALIASES: Record<string, CliEntityType> = {
  table: "table",
  tables: "table",
  view: "view",
  views: "view",
  "materialized-view": "materialized-view",
  "materialized-views": "materialized-view",
  materialized_view: "materialized-view",
  matview: "materialized-view",
  matviews: "materialized-view",
  routine: "routine",
  routines: "routine",
  function: "routine",
  functions: "routine",
  procedure: "routine",
  procedures: "routine",
};

export function parseEntityTypes(
  value: string,
  previous: CliEntityType[] = [],
): CliEntityType[] {
  const raw = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (raw.length === 0) {
    throw new InvalidArgumentError("Needs a value.");
  }
  const types = [...previous];
  for (const item of raw) {
    const type = ENTITY_TYPE_ALIASES[item];
    if (!type) {
      throw new InvalidArgumentError(
        `Unknown entity type "${item}". Expected one of: ${CLI_ENTITY_TYPES.join(", ")}.`,
      );
    }
    if (!types.includes(type)) {
      types.push(type);
    }
  }
  return types;
}

export function singleValue(
  value: string,
  previous: string | undefined,
): string {
  if (previous !== undefined) {
    throw new InvalidArgumentError("Given more than once.");
  }
  const text = value.trim();
  if (!text) {
    throw new InvalidArgumentError("Needs a value.");
  }
  return text;
}

export const connectionOption = new Option(
  "-c, --connection <name>",
  "Open connection to use (its name or id). Required when more than one open connection has CLI access enabled",
).argParser(singleValue);

export const schemaOption = new Option(
  "-s, --schema <schema>",
  "Only this schema",
).argParser(singleValue);

export interface CliCommandDefinition {
  name: string;
  description: string;
  arguments?: Argument[];
  options?: Option[];
  /** Formats without an entry print the result as JSON. */
  formatters?: Partial<Record<CliOutputFormat, (result: any) => string>>;
  /** Sends the request. `command` holds the parsed arguments and options. */
  run(client: CliClient, command: Command): Promise<unknown>;
}

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

export function connectionLine(result: any): string[] {
  return result?.connection?.name
    ? [`Connection: ${result.connection.name}`, ""]
    : [];
}
