import { CliReply } from "@/cli/replies/CliReply";
import { connectionLine } from "@/cli/markdown";

// FIXME: the result is partly untyped (Record<string, any>).
export class SchemasReply extends CliReply<
  { schemas: string[] } & Record<string, any>
> {
  markdown(): string {
    const result = this.json();
    const lines = connectionLine(result);
    const schemas = result.schemas || [];
    lines.push(
      schemas.length === 0
        ? "No schemas."
        : schemas.map((s) => `- ${s}`).join("\n"),
    );
    return lines.join("\n");
  }
}
