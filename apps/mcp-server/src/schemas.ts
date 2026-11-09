import * as z from "zod/v4";

export const connectionParam = z
  .string()
  .optional()
  .describe(
    "Name or id of the open connection to use. Required when more than " +
      "one open connection has CLI access enabled."
  );

export const schemaParam = z.string().optional().describe("Only this schema.");

export const entityTypesParam = z
  .array(z.enum(["table", "view", "materialized-view", "routine"]))
  .optional()
  .describe("Entity types to include. Defaults to every type.");
