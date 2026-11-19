import { Option } from "commander";
import { CliEntity } from "@/cli/protocol";
import {
  CliCommandDefinition,
  connectionLine,
  connectionOption,
  parseEntityTypes,
  schemaOption,
  table,
  warningsBlock,
} from "./common";

const listEntities: CliCommandDefinition = {
  name: "list-entities",
  description: "List tables, views, materialized views and routines",
  options: [
    connectionOption,
    schemaOption,
    new Option(
      "-t, --entity-type <type>",
      "table, view, materialized-view or routine. Repeat the flag or comma-separate to combine",
    ).argParser(parseEntityTypes),
  ],
  run(client, command) {
    const opts = command.opts();
    return client.call("listEntities", {
      connection: opts.connection,
      schema: opts.schema,
      entityTypes: opts.entityType,
    });
  },
  formatters: {
    markdown(
      result: { entities: CliEntity[]; warnings?: string[] } & Record<
        string,
        any
      >,
    ): string {
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
    },
  },
};

export default listEntities;
