import fs from "fs";
import path from "path";
import { text } from "stream/consumers";
import { Argument, Option } from "commander";
import { CliQueryResult } from "@/cli/protocol";
import {
  CliCommandDefinition,
  connectionLine,
  connectionOption,
  singleValue,
  table,
} from "./common";

const query: CliCommandDefinition = {
  name: "query",
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
  formatters: {
    markdown(
      result: { results: CliQueryResult[] } & Record<string, any>,
    ): string {
      const lines = connectionLine(result);
      const results = result.results || [];
      if (results.length === 0) {
        lines.push("The query returned no results.");
      }
      results.forEach((r, index) => {
        if (index > 0) lines.push("");
        const title =
          results.length > 1 ? `## Result ${index + 1}` : "## Result";
        const parts: string[] = [];
        if (r.command) parts.push(String(r.command));
        if (r.columns.length > 0) {
          parts.push(
            r.truncated
              ? `first ${r.rowCount} of ${r.totalRowCount} rows (limit ${r.maxRows})`
              : `${r.rowCount} row${r.rowCount === 1 ? "" : "s"}`,
          );
        }
        // drivers report 0 changes for a select; only statements without a result set show it
        if (
          r.columns.length === 0 &&
          r.affectedRows !== null &&
          r.affectedRows !== undefined
        ) {
          parts.push(
            `${r.affectedRows} row${r.affectedRows === 1 ? "" : "s"} affected`,
          );
        }
        lines.push(parts.length ? `${title} (${parts.join(", ")})` : title);
        if (r.columns.length > 0) {
          lines.push(
            table(
              r.columns,
              r.rows.map((row) => r.columns.map((c) => row[c])),
            ),
          );
        }
      });
      return lines.join("\n");
    },
  },
};

export default query;
