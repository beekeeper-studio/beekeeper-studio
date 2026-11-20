import { ConnectionsResult } from "@/cli/protocol";
import { CliReply } from "@/cli/replies/CliReply";
import { table, yesNo } from "@/cli/markdown";

export class ConnectionsReply extends CliReply<ConnectionsResult> {
  markdown(): string {
    const result = this.json();
    const connections = result.connections;
    if (!connections || connections.length === 0) {
      return "No open connections.";
    }
    return table(
      ["Name", "Id", "Type", "Host", "Database", "Read only", "CLI enabled"],
      connections.map((c) => [
        c.name,
        c.id,
        c.connectionType,
        c.host,
        c.database,
        yesNo(c.readOnlyMode),
        yesNo(c.cliEnabled),
      ]),
    );
  }
}
