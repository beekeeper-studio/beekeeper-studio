import fs from "fs";
import path from "path";
import { text } from "stream/consumers";
import {
  Argument,
  Command,
  InvalidArgumentError,
  Option,
  OutputConfiguration,
} from "commander";
import {
  CLI_ENTITY_TYPES,
  CliCommandName,
  CliEntityType,
  isCliError,
} from "./protocol";
import {
  CliClient,
  formatErrorPayload,
  isConnectError,
  notRunningMessage,
} from "./CliClient";
import { formatResult } from "./format";
import { defaultCliSocketPath } from "./socketPath";

export type CliOutputFormat = "json" | "markdown";

export const CLI_OUTPUT_FORMATS: CliOutputFormat[] = ["json", "markdown"];

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

function singleValue(value: string, previous: string | undefined): string {
  if (previous !== undefined) {
    throw new InvalidArgumentError("Given more than once.");
  }
  const text = value.trim();
  if (!text) {
    throw new InvalidArgumentError("Needs a value.");
  }
  return text;
}

function parseFormat(value: string): CliOutputFormat {
  const format = value.trim().toLowerCase();
  const normalized = format === "md" ? "markdown" : format;
  if (!CLI_OUTPUT_FORMATS.includes(normalized as CliOutputFormat)) {
    throw new InvalidArgumentError(
      `Expected one of: ${CLI_OUTPUT_FORMATS.join(", ")}.`,
    );
  }
  return normalized as CliOutputFormat;
}

function parseTimeout(value: string): number {
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 0) {
    throw new InvalidArgumentError("Expected a whole number of milliseconds.");
  }
  return timeout;
}

interface GlobalOptions {
  socket: string;
  timeout: number;
  format: CliOutputFormat;
}

const connectionOption = new Option(
  "-c, --connection <name>",
  "Open connection to use (its name or id). Required when more than one open connection has CLI access enabled",
).argParser(singleValue);

const schemaOption = new Option(
  "-s, --schema <schema>",
  "Only this schema",
).argParser(singleValue);

interface CliCommandDefinition {
  name: string;
  /** The app command the result comes from. Picks how it is printed. */
  resultOf: CliCommandName;
  description: string;
  arguments: Argument[];
  options: Option[];
  /** Sends the request. `command` holds the parsed arguments and options. */
  run(client: CliClient, command: Command): Promise<unknown>;
}

const CLI_COMMAND_DEFINITIONS: CliCommandDefinition[] = [
  {
    name: "connections",
    resultOf: "connections",
    description: "List the connections currently open in the app",
    arguments: [],
    options: [],
    run: (client) => client.call("connections", {}),
  },
  {
    name: "list-schemas",
    resultOf: "list-schemas",
    description: "List the schemas in the connected database",
    arguments: [],
    options: [connectionOption],
    run(client, command) {
      const opts = command.opts();
      return client.call("list-schemas", {
        connection: opts.connection,
      });
    },
  },
  {
    name: "list-tables",
    resultOf: "list-entities",
    description: "List tables (same as list-entities --entity-type table)",
    arguments: [],
    options: [connectionOption, schemaOption],
    run(client, command) {
      const opts = command.opts();
      return client.call("list-entities", {
        connection: opts.connection,
        schema: opts.schema,
        entityTypes: ["table"],
      });
    },
  },
  {
    name: "list-entities",
    resultOf: "list-entities",
    description: "List tables, views, materialized views and routines",
    arguments: [],
    options: [
      connectionOption,
      schemaOption,
      new Option(
        "-t, --entity-type <type>",
        "table, view, materialized-view or routine. Repeat the flag or comma-separate to combine",
      ).argParser(parseEntityTypes),
    ],
    run(client, command) {
      const opts = command.opts();
      return client.call("list-entities", {
        connection: opts.connection,
        schema: opts.schema,
        entityTypes: opts.entityType,
      });
    },
  },
  {
    name: "structure",
    resultOf: "structure",
    description:
      "Columns, keys, indexes, relations, triggers and DDL of a table or view",
    arguments: [
      new Argument("<name>", "Table or view, optionally as schema.name"),
    ],
    options: [connectionOption, schemaOption],
    run(client, command) {
      const opts = command.opts();
      let name = command.processedArgs[0] as string;
      let schema = opts.schema;
      const parts = name.split(".");
      // `schema.table` is a common way to write it; split when no explicit schema was given.
      if (!schema && parts.length === 2 && parts[0] && parts[1]) {
        schema = parts[0];
        name = parts[1];
      }
      return client.call("structure", {
        connection: opts.connection,
        schema,
        name,
      });
    },
  },
  {
    name: "query",
    resultOf: "query",
    description:
      "Run a read-only SQL statement and print the results (at most 20,000 rows per result)",
    arguments: [
      new Argument("[sql...]", "SQL to run, or - to read it from stdin"),
    ],
    options: [
      connectionOption,
      new Option("--file <path>", "Read the SQL from a file").argParser(
        singleValue,
      ),
    ],
    async run(client, command) {
      const opts = command.opts();
      const words = command.processedArgs[0] as string[];
      let sql = words.join(" ").trim();
      if (opts.file && sql) {
        command.error("error: pass either SQL text or --file, not both.");
      }
      if (!opts.file && !sql) {
        command.error(
          "error: query needs SQL text, --file <path>, or - to read stdin.",
        );
      }
      if (opts.file) {
        sql = await fs.promises.readFile(path.resolve(opts.file), "utf8");
      } else if (sql === "-") {
        sql = await text(process.stdin);
      }
      if (!sql.trim()) {
        command.error("error: no SQL to run, the input was empty.");
      }
      return client.call("query", { connection: opts.connection, sql });
    },
  },
];

/**
 * The `bks` program. Each command sends its request to the running app and
 * prints the result; help and usage errors are printed by commander, which
 * then exits the process.
 */
export function createProgram(options?: {
  /** Throws error without exiting the process. Useful for testing. */
  preventExit?: boolean;
  /** Where help, errors and command results are written. Defaults to stdout and stderr. */
  output?: OutputConfiguration;
}): Command {
  const program = new Command("bks")
    .usage("<command> [options]")
    .description(
      "Runs read-only commands against a database connection that is already open in the Beekeeper Studio desktop app.",
    )
    .configureHelp({ showGlobalOptions: true })
    .showHelpAfterError()
    .helpCommand(true)
    .option(
      "--socket <path>",
      "Socket the app listens on (beekeeper-studio cli prints it). Overrides BKS_CLI_SOCKET",
      defaultCliSocketPath(),
    )
    .option(
      "--timeout <ms>",
      "Give up waiting for the app after this many milliseconds. 0 waits forever",
      parseTimeout,
      5000,
    )
    .option(
      "-f, --format <format>",
      "Output format: json or markdown",
      parseFormat,
      "json",
    )
    .addHelpText(
      "after",
      `
Environment:
  BKS_CLI_SOCKET            Socket the app listens on, when it is not in the default
                            location (beekeeper-studio cli prints it)
  BKS_CLI_DEV=1             Talk to a development build of the app

Examples:
  bks connections
  bks list-tables --schema public
  bks structure users --schema public
  bks query "select id, email from users limit 10"
  bks query --file ./report.sql --format markdown
  echo "select count(*) from orders" | bks query -`,
    );
  if (options?.preventExit) {
    program.exitOverride();
  }
  if (options?.output) {
    program.configureOutput(options.output);
  }

  for (const definition of CLI_COMMAND_DEFINITIONS) {
    const command = new Command(definition.name)
      .configureHelp({ showGlobalOptions: true })
      .showHelpAfterError()
      .description(definition.description);
    for (const argument of definition.arguments) {
      command.addArgument(argument);
    }
    for (const option of definition.options) {
      command.addOption(option);
    }
    command.action(async function (this: Command) {
      const globals = program.opts<GlobalOptions>();
      const client = new CliClient({
        socketPath: globals.socket,
        timeout: globals.timeout,
      });
      let result: unknown;
      try {
        result = await definition.run(client, command);
      } catch (error) {
        if (isConnectError(error)) {
          command.error(notRunningMessage(globals.socket));
        }
        if (isCliError(error)) {
          command.error(formatErrorPayload(error.toPayload()));
        }
        throw error;
      }
      program
        .configureOutput()
        .writeOut(formatResult(definition.resultOf, result, globals.format) + "\n");
    });
    if (options?.preventExit) {
      command.exitOverride();
    }
    if (options?.output) {
      command.configureOutput(options.output);
    }
    program.addCommand(command);
  }

  return program;
}
