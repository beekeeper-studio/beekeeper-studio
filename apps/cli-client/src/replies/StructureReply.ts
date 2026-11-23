import { StructureResult } from "../protocol";
import { CliReply } from "./CliReply";
import { connectionLine, table, warningsBlock, yesNo } from "../markdown";

export class StructureReply extends CliReply<StructureResult> {
  markdown(): string {
    const result = this.json();
    const fullName = result.schema
      ? `${result.schema}.${result.name}`
      : result.name;
    const lines = connectionLine(result);
    lines.push(`# ${fullName} (${result.entityType})`);
    if (result.description) lines.push("", String(result.description));

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
                Array.isArray(r.toColumn)
                  ? r.toColumn.join(", ")
                  : r.toColumn,
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
              triggers.map((t) => [
                t.name,
                t.timing,
                t.manipulation,
                t.action,
              ]),
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
  }
}
