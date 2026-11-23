import { QueryResult } from "../protocol";
import { CliReply } from "./CliReply";
import { connectionLine, table } from "../markdown";

export class QueryReply extends CliReply<QueryResult> {
  markdown(): string {
    const result = this.json();
    const lines = connectionLine(result);
    const results = result.results || [];
    if (results.length === 0) {
      lines.push("The query returned no results.");
    }
    results.forEach((r, index) => {
      if (index > 0) lines.push("");
      const title = results.length > 1 ? `## Result ${index + 1}` : "## Result";
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
  }
}
