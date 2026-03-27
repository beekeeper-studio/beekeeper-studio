export { default as DriverDepManager } from "./DriverDepManager";
export { default as DriverDepFileManager } from "./DriverDepFileManager";
export { default as DriverDepRegistry } from "./DriverDepRegistry";
export * from "./types";

import DriverDepRegistry from "./DriverDepRegistry";
import OracleInstantClientProvider, {
  ORACLE_INSTANT_CLIENT_REQUIREMENT_ID,
} from "./providers/OracleInstantClientProvider";
import type { DriverRequirement } from "./types";

const ORACLE_REQUIREMENT: DriverRequirement = {
  id: ORACLE_INSTANT_CLIENT_REQUIREMENT_ID,
  name: "Oracle Instant Client",
  settingKey: "oracleInstantClient",
  required: false,
};

export function createDefaultRegistry(): DriverDepRegistry {
  const registry = new DriverDepRegistry();
  registry.register(
    ORACLE_REQUIREMENT,
    new OracleInstantClientProvider(),
    ["oracle"]
  );
  return registry;
}
