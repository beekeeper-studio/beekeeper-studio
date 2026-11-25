import { SchemasResult } from "../protocol";
import { CliReply } from "./CliReply";

export class SchemasReply extends CliReply<SchemasResult> {
  markdown(): string {
    const result = this.json();
    const lines: string[] = [];
    const schemas = result.schemas || [];
    lines.push(
      schemas.length === 0
        ? "No schemas."
        : schemas.map((s) => `- ${s}`).join("\n"),
    );
    return lines.join("\n");
  }
}
