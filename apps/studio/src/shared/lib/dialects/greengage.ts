import { PostgresData } from "./postgresql";

export const GreengageData = {
  ...PostgresData,
  textEditorMode: "text/x-ggsql" as const,
};
