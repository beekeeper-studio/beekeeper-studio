import { SchemasResult } from "@/cli/protocol";
import { CliReply } from "@/cli/replies/CliReply";
import { connectionLine } from "@/cli/markdown";

export class SchemasReply extends CliReply<SchemasResult> {
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
