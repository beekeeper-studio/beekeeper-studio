import listEntities from "./listEntities";
import { CliCommandDefinition, connectionOption, schemaOption } from "./common";

const listTables: CliCommandDefinition = {
  name: "list-tables",
  description: "List tables (same as list-entities --entity-type table)",
  options: [connectionOption, schemaOption],
  run(client, command) {
    const opts = command.opts();
    return client.call("listEntities", {
      connection: opts.connection,
      schema: opts.schema,
      entityTypes: ["table"],
    });
  },
  formatters: listEntities.formatters,
};

export default listTables;
