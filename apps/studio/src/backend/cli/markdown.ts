import { markdownTable } from "markdown-table";
import type {
  ConnectionsResult,
  EntitiesResult,
  QueryResult,
  SavedQueriesResult,
  SchemasResult,
  StructureResult,
} from "@beekeeperstudio/rpc";

function cell(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
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

function yesNo(value: unknown): string {
  return value ? "yes" : "no";
}

function table(headers: string[], rows: unknown[][]): string {
  return markdownTable([headers, ...rows.map((row) => row.map(cell))]);
}

function warningsBlock(warnings?: string[]): string[] {
  if (!warnings || warnings.length === 0) {
    return [];
  }
  return ["", "**Warnings**", ...warnings.map((w) => `- ${cell(w)}`)];
}

const markdownFormatters = {
  connections(result: ConnectionsResult): string {
    const connections = result.connections;
    if (!connections || connections.length === 0) {
      return "No open connections.";
    }
    return table(
      ["Name", "Id", "Type", "Default database", "Read only", "Approved"],
      connections.map((c) => [
        c.name,
        c.id,
        c.connectionType,
        c.defaultDatabase,
        yesNo(c.readOnlyMode),
        yesNo(c.approved),
      ]),
    );
  },

  schemas(result: SchemasResult): string {
    const schemas = result.schemas || [];
    if (schemas.length === 0) {
      return "No schemas.";
    }
    return schemas.map((s) => `- ${s}`).join("\n");
  },

  entities(result: EntitiesResult): string {
    const lines: string[] = [];
    const entities = result.entities || [];
    if (entities.length === 0) {
      lines.push("No entities found.");
    } else {
      const hasRoutines = entities.some((e) => e.entityType === "routine");
      const headers = [
        "Schema",
        "Name",
        "Type",
        ...(hasRoutines ? ["Routine type", "Returns"] : []),
      ];
      lines.push(
        table(
          headers,
          entities.map((e) => [
            e.schema ?? "",
            e.name,
            e.entityType,
            ...(hasRoutines ? [e.routineType ?? "", e.returnType ?? ""] : []),
          ]),
        ),
      );
    }
    lines.push(...warningsBlock(result.warnings));
    return lines.join("\n");
  },

  structure(result: StructureResult): string {
    const fullName = result.schema
      ? `${result.schema}.${result.name}`
      : result.name;
    const lines: string[] = [];
    lines.push(`# ${fullName} (${result.entityType})`);
    if (result.description) {
      lines.push("", String(result.description));
    }

    lines.push("", "## Columns");
    const columns = result.columns || [];
    if (columns.length === 0) {
      lines.push("No columns.");
    } else {
      lines.push(
        table(
          ["Name", "Type", "Nullable", "Default", "Primary key"],
          columns.map((c) => [
            c.name,
            c.dataType,
            c.nullable === undefined ? "" : yesNo(c.nullable),
            c.defaultValue ?? "",
            c.primaryKey ? "yes" : "",
          ]),
        ),
      );
    }

    if (result.entityType === "table") {
      lines.push(
        "",
        "## Primary key",
        (result.primaryKeys || []).length
          ? result.primaryKeys.join(", ")
          : "None",
      );

      const indexes = result.indexes || [];
      lines.push("", "## Indexes");
      lines.push(
        indexes.length === 0
          ? "None"
          : table(
              ["Name", "Columns", "Unique", "Primary"],
              indexes.map((i) => [
                i.name,
                (i.columns || [])
                  .map((c) => (c.order ? `${c.name} ${c.order}` : c.name))
                  .join(", "),
                yesNo(i.unique),
                yesNo(i.primary),
              ]),
            ),
      );

      const relations = result.relations || [];
      lines.push("", "## Foreign keys");
      lines.push(
        relations.length === 0
          ? "None"
          : table(
              [
                "Name",
                "From column",
                "To table",
                "To column",
                "On update",
                "On delete",
              ],
              relations.map((r) => [
                r.constraintName ?? "",
                Array.isArray(r.fromColumn)
                  ? r.fromColumn.join(", ")
                  : r.fromColumn,
                r.toSchema ? `${r.toSchema}.${r.toTable}` : r.toTable,
                Array.isArray(r.toColumn) ? r.toColumn.join(", ") : r.toColumn,
                r.onUpdate ?? "",
                r.onDelete ?? "",
              ]),
            ),
      );

      const triggers = result.triggers || [];
      lines.push("", "## Triggers");
      lines.push(
        triggers.length === 0
          ? "None"
          : table(
              ["Name", "Timing", "Event", "Action"],
              triggers.map((t) => [t.name, t.timing, t.manipulation, t.action]),
            ),
      );
    }

    if (result.createScript) {
      lines.push(
        "",
        "## Create script",
        "```sql",
        String(result.createScript).trimEnd(),
        "```",
      );
    }

    lines.push(...warningsBlock(result.warnings));
    return lines.join("\n");
  },

  query(result: QueryResult): string {
    const lines: string[] = [];
    const results = result.results || [];
    if (results.length === 0) {
      lines.push("The query returned no results.");
    }
    results.forEach((r, index) => {
      if (index > 0) {
        lines.push("");
      }
      const title = results.length > 1 ? `## Result ${index + 1}` : "## Result";
      const parts: string[] = [];
      if (r.command) {
        parts.push(String(r.command));
      }
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

  savedQueries(result: SavedQueriesResult): string {
    if (result.savedQueries.length === 0) {
      return "No saved queries.";
    }
    return table(
      ["Id", "Title", "Excerpt", "Updated"],
      result.savedQueries.map((q) => [q.id, q.title, q.excerpt, q.updatedAt]),
    );
  },
};

type MarkdownFormatters = typeof markdownFormatters;

export function toMarkdown<K extends keyof MarkdownFormatters>(
  kind: K,
  result: Parameters<MarkdownFormatters[K]>[0],
): string {
  const format = markdownFormatters[kind] as (result: unknown) => string;
  return format(result);
}
