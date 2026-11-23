import {
  Argument,
  Command,
  InvalidArgumentError,
  Option,
  OutputConfiguration,
} from "@commander-js/extra-typings";
import {
  connectionOption,
  fileOption,
  formatOption,
  parseTableName,
  readSql,
  schemaOption,
  send,
  tableTarget,
  ENTITY_TYPE_ALIASES,
  EntityTypeAlias,
  resolveEntityTypes,
  formatErrorPayload,
  defaultCliSocketPath,
  notRunningMessage,
} from "./helpers";
import {
  CliClient,
  isConnectError,
  isCliError,
} from "@beekeeperstudio/cli-client";

/**
 * The `bks` program. Each command sends its request to the running app and
 * prints the result; help and usage errors are printed by commander, which
 * then exits the process.
 */
export function createProgram(options: {
  /** Throws error without exiting the process. Useful for testing. */
  preventExit?: boolean;
  /** Where help, errors and command results are written. Defaults to stdout and stderr. */
  output?: OutputConfiguration;
  version: string;
}): Command {
  const program = new Command("bks")
    .version(options.version, "-v, --version", "Output the version number")
    .description(
      "Runs read-only commands against a database connection that is already open in the Beekeeper Studio desktop app.",
    )
    .configureHelp({ showGlobalOptions: true })
    .showHelpAfterError("(add --help for usage)")
    .addOption(
      new Option(
        "--socket <path>",
        "Socket the app listens on (beekeeper-studio cli prints it).",
      )
        .env("BKS_CLI_SOCKET")
        .default(defaultCliSocketPath(), "the app's socket"),
    )
    .addOption(
      new Option(
        "--timeout <ms>",
        "Give up waiting for the app after this many milliseconds. 0 waits forever",
      )
        .argParser((value) => {
          const timeout = Number(value);
          if (!Number.isInteger(timeout) || timeout < 0) {
            throw new InvalidArgumentError(
              "Expected a whole number of milliseconds.",
            );
          }
          return timeout;
        })
        .default(5000),
    )
    .addHelpText(
      "after",
      `
Examples:
  bks connections
  bks tables --schema public
  bks structure users --schema public
  bks query "select id, email from users limit 10"
  bks create-tab query "select id, email from users limit 10"`,
    );

  let client: CliClient;

  program.hook("preAction", () => {
    const globals = program.opts();
    client = new CliClient({
      socketPath: globals.socket,
      timeout: globals.timeout,
    });
    client.on("error", (error) => {
      if (isConnectError(error)) {
        program.error(notRunningMessage(globals.socket));
      }
      if (isCliError(error)) {
        program.error(formatErrorPayload(error.toPayload()));
      }
    });
  });

  if (options.preventExit) {
    program.exitOverride();
  }
  if (options.output) {
    program.configureOutput(options.output);
  }

  // =========== Commands ============

  program
    .command("connections")
    .description("List the connections currently open in the app")
    .addOption(formatOption)
    .action(async (opts, command) => {
      await send(command, async () => {
        const reply = await client.connections();
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  program
    .command("schemas")
    .description("List the schemas in the connected database")
    .addOption(connectionOption)
    .addOption(formatOption)
    .action(async (opts, command) => {
      await send(command, async () => {
        const reply = await client.schemas({ connection: opts.connection });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  program
    .command("tables")
    .description("List tables (same as entities --type table)")
    .addOption(connectionOption)
    .addOption(schemaOption)
    .addOption(formatOption)
    .action(async (opts, command) => {
      await send(command, async () => {
        const reply = await client.entities({
          connection: opts.connection,
          schema: opts.schema,
          entityTypes: ["table"],
        });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  program
    .command("entities")
    .description("List tables, views, materialized views and routines")
    .addOption(connectionOption)
    .addOption(schemaOption)
    .addOption(
      new Option("-t, --type <types...>", "Only these types").choices(
        Object.keys(ENTITY_TYPE_ALIASES) as EntityTypeAlias[],
      ),
    )
    .addOption(formatOption)
    .action(async (opts, command) => {
      await send(command, async () => {
        const reply = await client.entities({
          connection: opts.connection,
          schema: opts.schema,
          entityTypes: resolveEntityTypes(opts.type),
        });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  program
    .command("structure")
    .description(
      "Columns, keys, indexes, relations, triggers and DDL of a table or view",
    )
    .addArgument(
      new Argument(
        "<name>",
        "Table or view, optionally as schema.name",
      ).argParser(parseTableName),
    )
    .addOption(connectionOption)
    .addOption(schemaOption)
    .addOption(formatOption)
    .action(async (name, opts, command) => {
      await send(command, async () => {
        const reply = await client.structure({
          connection: opts.connection,
          ...tableTarget(name, opts.schema),
        });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  program
    .command("query")
    .description(
      "Run a read-only SQL statement and print the results (at most 20,000 rows per result)",
    )
    .addArgument(
      new Argument("[sql...]", "SQL to run, or - to read it from stdin"),
    )
    .addOption(connectionOption)
    .addOption(fileOption)
    .addOption(formatOption)
    .action(async (words, opts, command) => {
      const sql = await readSql(command, words, opts.file, {
        required: true,
      });
      await send(command, async () => {
        const reply = await client.query({
          connection: opts.connection,
          sql: sql as string,
        });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  const createTab = program
    .command("create-tab")
    .description("Open a new tab and switch to that tab");

  createTab
    .command("query")
    .description(
      "Open a new query tab, prefilled with the SQL. The SQL is not run",
    )
    .addArgument(
      new Argument(
        "[sql...]",
        "SQL to put in the tab, or - to read it from stdin",
      ),
    )
    .addOption(connectionOption)
    .addOption(fileOption)
    .action(async (words, opts, command) => {
      const sql = await readSql(command, words, opts.file, {
        required: false,
      });
      await send(command, async () => {
        const reply = await client.createTab({
          connection: opts.connection,
          tab: "query",
          sql,
        });
        return reply.raw();
      });
    });

  program
    .command("switch-tab")
    .description("Switch to an open tab")
    .addArgument(new Argument("<id>", "Id of the tab"))
    .addOption(connectionOption)
    .action(async (id, opts, command) => {
      await send(command, async () => {
        const reply = await client.switchTab({
          connection: opts.connection,
          tabId: id,
        });
        return reply.raw();
      });
    });

  return program;
}
