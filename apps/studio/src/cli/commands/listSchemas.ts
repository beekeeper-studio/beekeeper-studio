import {
  CliCommandDefinition,
  connectionLine,
  connectionOption,
} from "./common";

const listSchemas: CliCommandDefinition = {
  name: "list-schemas",
  description: "List the schemas in the connected database",
  options: [connectionOption],
  run(client, command) {
    const opts = command.opts();
    return client.call("listSchemas", {
      connection: opts.connection,
    });
  },
  formatters: {
    markdown(result: { schemas: string[] } & Record<string, any>): string {
      const lines = connectionLine(result);
      const schemas = result.schemas || [];
      lines.push(
        schemas.length === 0
          ? "No schemas."
          : schemas.map((s) => `- ${s}`).join("\n"),
      );
      return lines.join("\n");
    },
  },
};

export default listSchemas;
