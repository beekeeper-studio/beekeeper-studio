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
  savedQueryId,
  singleValue,
  formatErrorPayload,
  notRunningMessage,
} from "./helpers";
import {
  Client,
  isConnectError,
  isCliError,
  defaultCliSocketPath,
  DEFAULT_CLI_TIMEOUT,
} from "@beekeeperstudio/cli";
import { detectClientName } from "./clientName";

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
  /** Who the app is told is calling. Detected from the parent processes when left out. */
  clientName?: string;
}): Command {
  const program = new Command("bks")
    .version(options.version, "-v, --version", "Output the version number")
    .description(
      "Runs commands against a database connection that is already open in the Beekeeper Studio desktop app. A client has to be approved first: run request-approval.",
    )
    .configureHelp({ showGlobalOptions: true })
    .showHelpAfterError("(add --help for usage)")
    .addOption(
      new Option(
        "--socket <path>",
        "Socket the app listens on.",
      )
        .env("BKS_CLI_SOCKET")
        .default(defaultCliSocketPath(), "the app's socket"),
    )
    .addOption(
      new Option(
        "--timeout <ms>",
        "Stop waiting for the app after this many milliseconds (0 waits forever)",
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
        .default(DEFAULT_CLI_TIMEOUT),
    )
    .addHelpText(
      "after",
      `
Examples:
  bks connections
  bks tables --schema public
  bks structure users --schema public
  bks query "select id, email from users limit 10"
  bks create-tab query "select id, email from users limit 10"
  bks request-approval
  bks saved-queries list

The client name shown in the approval dialog is detected from the parent
processes. Set BKS_CLI_CLIENT to name it explicitly.`,
    );

  let client: Client;

  program.hook("preAction", () => {
    const globals = program.opts();
    client = new Client({
      socketPath: globals.socket,
      timeout: globals.timeout,
      clientName: options.clientName ?? detectClientName(),
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
        const reply = await client.getConnections();
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
        const reply = await client.getSchemas({ connection: opts.connection });
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
        const reply = await client.getEntities({
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
        const reply = await client.getEntities({
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
        const reply = await client.getTableStructure({
          connection: opts.connection,
          ...tableTarget(name, opts.schema),
        });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  program
    .command("query")
    .description(
      "Run SQL and print the results (at most 20,000 rows per result). Only the statement types the client was approved for run",
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
        const reply = await client.runQuery({
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
        const reply = await client.openTab({
          connection: opts.connection,
          tab: "query",
          sql,
        });
        return String(reply.json().tabId);
      });
    });

  program
    .command("switch-tab")
    .description("Switch to an open tab")
    .addArgument(new Argument("<id>", "Id of the tab"))
    .addOption(connectionOption)
    .action(async (id, opts, command) => {
      await send(command, async () => {
        await client.switchTab({
          connection: opts.connection,
          tabId: Number(id),
        });
        return "";
      });
    });

  program
    .command("request-approval")
    .alias("r")
    .description(
      "Ask for access to a connection. Opens a dialog in the app and waits until it is answered",
    )
    .addOption(connectionOption)
    .action(async (opts, command) => {
      await send(command, async () => {
        const reply = await client.requestApproval({ connection: opts.connection });
        return reply.raw();
      });
    });

  const savedQueries = program
    .command("saved-queries")
    .description("Read and write the queries saved in the app");

  savedQueries
    .command("list")
    .description("List the saved queries")
    .addOption(connectionOption)
    .addOption(formatOption)
    .action(async (opts, command) => {
      await send(command, async () => {
        const reply = await client.getSavedQueries({ connection: opts.connection });
        return opts.format === "md" ? reply.markdown() : reply.raw();
      });
    });

  savedQueries
    .command("get")
    .description("Print a saved query, its SQL included")
    .addArgument(new Argument("<id>", "Id of the saved query").argParser(savedQueryId))
    .addOption(connectionOption)
    .action(async (id, opts, command) => {
      await send(command, async () => {
        const reply = await client.getSavedQuery({ connection: opts.connection, id });
        return reply.raw();
      });
    });

  savedQueries
    .command("create")
    .description("Save a new query")
    .addArgument(new Argument("<title>", "Title of the saved query"))
    .addArgument(
      new Argument("[sql...]", "SQL to save, or - to read it from stdin"),
    )
    .addOption(connectionOption)
    .addOption(fileOption)
    .action(async (title, words, opts, command) => {
      const sql = await readSql(command, words, opts.file, { required: true });
      await send(command, async () => {
        const reply = await client.createSavedQuery({
          connection: opts.connection,
          title,
          text: sql as string,
        });
        return reply.raw();
      });
    });

  savedQueries
    .command("update")
    .description("Change the title or the SQL of a saved query")
    .addArgument(new Argument("<id>", "Id of the saved query").argParser(savedQueryId))
    .addArgument(
      new Argument("[sql...]", "New SQL, or - to read it from stdin"),
    )
    .addOption(new Option("--title <title>", "New title").argParser(singleValue))
    .addOption(connectionOption)
    .addOption(fileOption)
    .action(async (id, words, opts, command) => {
      const sql = await readSql(command, words, opts.file, { required: false });
      if (sql === undefined && opts.title === undefined) {
        command.error("error: pass a new --title, new SQL, or both.");
      }
      await send(command, async () => {
        const reply = await client.updateSavedQuery({
          connection: opts.connection,
          id,
          title: opts.title,
          text: sql,
        });
        return reply.raw();
      });
    });

  return program;
}
