import { CliEntity } from "@/cli/protocol";
import { CliReply } from "@/cli/replies/CliReply";
import { connectionLine, table, warningsBlock } from "@/cli/markdown";

// FIXME: the result is partly untyped (Record<string, any>).
export class EntitiesReply extends CliReply<
  { entities: CliEntity[]; warnings?: string[] } & Record<string, any>
> {
  markdown(): string {
    const result = this.json();
    const lines = connectionLine(result);
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
  }
}
