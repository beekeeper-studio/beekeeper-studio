import { Command, InvalidArgumentError, OutputConfiguration } from "commander";
import { isCliError } from "./protocol";
import {
  CliClient,
  formatErrorPayload,
  isConnectError,
  notRunningMessage,
} from "./CliClient";
import commandDefinitions from "./commands";
import { defaultCliSocketPath } from "./socketPath";

const formats = ["json", "markdown"] as const;

export type CliOutputFormat = (typeof formats)[number];

function parseFormat(value: string): CliOutputFormat {
  const format = value.trim().toLowerCase();
  const normalized = format === "md" ? "markdown" : format;
  if (!formats.includes(normalized as CliOutputFormat)) {
    throw new InvalidArgumentError(
      `Expected one of: ${formats.join(", ")}.`,
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

  for (const definition of commandDefinitions) {
    const command = new Command(definition.name)
      .configureHelp({ showGlobalOptions: true })
      .showHelpAfterError()
      .description(definition.description);
    for (const argument of definition.arguments ?? []) {
      command.addArgument(argument);
    }
    for (const option of definition.options ?? []) {
      command.addOption(option);
    }
    command.action(async function (this: Command) {
      const globals = program.opts<{
        socket: string;
        timeout: number;
        format: CliOutputFormat;
      }>();
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
      const formatter = definition.formatters?.[globals.format];
      const formatted = formatter
        ? formatter(result)
        : JSON.stringify(result, null, 2);
      const output = program.configureOutput();
      output.writeOut(formatted + "\n");
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
