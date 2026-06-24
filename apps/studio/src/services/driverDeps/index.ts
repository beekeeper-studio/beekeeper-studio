export { default as DriverDepManager } from "./DriverDepManager";
export { default as DriverDepFileManager } from "./DriverDepFileManager";
export { default as DriverDepRegistry } from "./DriverDepRegistry";
export * from "./types";

import DriverDepRegistry from "./DriverDepRegistry";
import OracleInstantClientProvider from "./providers/OracleInstantClientProvider";

/**
 * Built-in driver dependency providers.
 *
 * To add a new dependency: implement a {@link DriverDepProvider} in
 * `./providers/`, then add it to this list. See
 * `docs/development/driver-dependencies.md` for a walkthrough.
 */
const DEFAULT_PROVIDERS = [
  new OracleInstantClientProvider(),
];

export function createDefaultRegistry(): DriverDepRegistry {
  const registry = new DriverDepRegistry();
  for (const provider of DEFAULT_PROVIDERS) {
    registry.register(provider);
  }
  return registry;
}
