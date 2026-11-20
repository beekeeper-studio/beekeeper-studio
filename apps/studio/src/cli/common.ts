import fs from "fs";
import path from "path";
import { text } from "stream/consumers";
import {
  CommandUnknownOpts,
  InvalidArgumentError,
  Option,
} from "@commander-js/extra-typings";
import { isCliError } from "@/cli/protocol";
import { formatErrorPayload } from "@/cli/CliClient";

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

const formats = ["json", "md"] as const;

export type CliOutputFormat = (typeof formats)[number];

export const formatOption = new Option("-f, --format <format>", "Output format")
  .choices(formats)
  .default("json");

export const connectionOption = new Option(
  "-c, --connection <name>",
  "Open connection to use (its name or id). Required when more than one open connection has CLI access enabled",
).argParser(singleValue);

export const schemaOption = new Option(
  "-s, --schema <schema>",
  "Only this schema",
).argParser(singleValue);

export const fileOption = new Option(
  "--file <path>",
  "Read the SQL from a file",
).argParser(singleValue);

/**
 * The SQL from `[sql...]` words, `--file`, or stdin when the words are `-`.
 * Returns undefined when nothing was given and it is not required.
 */
export async function readSql(
  command: CommandUnknownOpts,
  words: string[],
  file: string | undefined,
  { required }: { required: boolean },
): Promise<string | undefined> {
  let sql = words.join(" ").trim();
  if (file && sql) {
    command.error("error: pass either SQL text or --file, not both.");
  }
  if (!file && !sql) {
    if (!required) {
      return undefined;
    }
    command.error(
      `error: ${command.name()} needs SQL text, --file <path>, or - to read stdin.`,
    );
  }
  if (file) {
    sql = await fs.promises.readFile(path.resolve(file), "utf8");
  } else if (sql === "-") {
    sql = await text(process.stdin);
  }
  if (!sql.trim()) {
    command.error("error: no SQL to run, the input was empty.");
  }
  return sql;
}

interface TableName {
  /** The argument exactly as given. */
  text: string;
  name: string;
  schema?: string;
}

/** Splits a `<name>` argument given as `schema.name`. */
export function parseTableName(text: string): TableName {
  const parts = text.split(".");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { text, schema: parts[0], name: parts[1] };
  }
  return { text, name: text };
}

/** With `--schema`, a dotted name is a name that contains a dot, not `schema.name`. */
export function tableTarget(
  table: TableName,
  schema: string | undefined,
): {
  name: string;
  schema?: string;
} {
  if (schema) {
    return { name: table.text, schema };
  }
  return { name: table.name, schema: table.schema };
}

/** Runs `request` and prints the text it returns, or the error it failed with. */
export async function send(
  command: CommandUnknownOpts,
  request: () => Promise<string>,
): Promise<void> {
  let output: string;
  try {
    output = await request();
  } catch (error) {
    if (isCliError(error)) {
      command.error(formatErrorPayload(error.toPayload()));
    }
    throw error;
  }
  command.configureOutput().writeOut(output + "\n");
}
