// Vendored replacement for @libsql/knex-libsql (MIT), rebased on knex's
// better-sqlite3 dialect and driven by the `libsql` package directly. This
// avoids the upstream package's @libsql/sqlite3 -> sqlite3 -> node-gyp -> tar
// dependency chain.
//
// libsql exposes a better-sqlite3-compatible API (prepare/statement.reader/
// statement.all()/run() -> { changes, lastInsertRowid }/columns()), so
// _query/processResponse/the SQL compilers and the single-connection pool
// default are all inherited from the better-sqlite3 dialect unchanged — only
// the driver and connection acquisition differ. (cf. ./knex-duckdb.)
import Client_BetterSQLite3 from "knex/lib/dialects/better-sqlite3/index.js";
import type Libsql from "libsql";

/**
 * libsql loads its native addon as soon as it's required, and it publishes no
 * win32-arm64 build. The utility process imports every database client at
 * startup, so a top-level import there would break every connection type, not
 * just LibSQL. Always load it through here, on first use.
 */
export function loadLibsql(): typeof Libsql {
  try {
    return require("libsql");
  } catch (e) {
    if (process.platform === "win32" && process.arch === "arm64") {
      throw new Error(
        "LibSQL is not supported on Windows ARM64: the libsql driver has no native build for this platform."
      );
    }
    throw e;
  }
}

class Client_Libsql extends Client_BetterSQLite3 {
  _driver() {
    return loadLibsql();
  }

  async acquireRawConnection() {
    // @ts-ignore
    const settings = this.connectionSettings;
    // Reuse a caller-supplied connection (e.g. a shared :memory: db). A function
    // form is supported so callers can resolve the instance lazily.
    if (settings.connectionInstance) {
      return typeof settings.connectionInstance === "function"
        ? settings.connectionInstance()
        : settings.connectionInstance;
    }
    return new (this as any).driver(settings.filename, {
      authToken: settings.authToken,
      syncUrl: settings.syncUrl,
      syncPeriod: settings.syncPeriod,
      readonly: !!settings.readonly,
    });
  }

  async destroyRawConnection(connection: { close(): void }) {
    // Don't close a connection we didn't open — the caller owns its lifecycle.
    // @ts-ignore
    if (this.connectionSettings.connectionInstance) return;
    return connection.close();
  }
}

Object.assign(Client_Libsql.prototype, {
  dialect: "libsql",
  driverName: "libsql",
});

export default Client_Libsql;
