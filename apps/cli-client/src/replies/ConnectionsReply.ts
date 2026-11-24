import { ConnectionsResult } from "../protocol";
import { CliReply } from "./CliReply";
import { table, yesNo } from "../markdown";

export class ConnectionsReply extends CliReply<ConnectionsResult> {
  markdown(): string {
    const result = this.json();
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
  }
}
