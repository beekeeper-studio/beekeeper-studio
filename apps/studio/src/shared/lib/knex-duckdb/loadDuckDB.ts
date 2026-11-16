import type * as DuckDB from "@duckdb/node-api";

/**
 * @duckdb/node-api loads its native binding as soon as it's required. The
 * utility process imports every database client at startup, so a top-level
 * import would let a missing or broken binding (no build for this
 * architecture, a failed install) break every connection type, not just
 * DuckDB. Always load it through here, on first use.
 */
export function loadDuckDB(): typeof DuckDB {
  try {
    return require("@duckdb/node-api");
  } catch (e) {
    throw new Error(`The DuckDB driver could not be loaded on ${process.platform}-${process.arch}: ${e.message}`);
  }
}
