import { CliConnectionSummary } from "@/cli/protocol";
import { CliCommandDefinition, table, yesNo } from "./common";

const connections: CliCommandDefinition = {
  name: "connections",
  description: "List the connections currently open in the app",
  run: (client) => client.call("connections"),
  formatters: {
    markdown({ connections }: { connections: CliConnectionSummary[] }): string {
      if (!connections || connections.length === 0)
        return "No open connections.";
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
    },
  },
};

export default connections;
