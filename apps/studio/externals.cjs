// Single source of truth for which packages ship as raw node_modules.
//
// esbuild bundles everything imported by main/preload/utility into dist/,
// except `externals` (native modules and packages that break when bundled).
// electron-builder would still pack the entire production dependency tree
// as raw node_modules; electron-builder-config.js uses these lists to
// exclude everything that is already bundled into dist/.

// NOTE: keep bundledPlugins in sync with src/common/globals.ts -> plugins.ensureInstalled
const bundledPlugins = [
  "@beekeeperstudio/bks-ai-shell",
  "@beekeeperstudio/bks-er-diagram",
];

// Left un-bundled by esbuild, resolved from node_modules at runtime.
const externals = [
  'better-sqlite3',
  'sqlite3',
  'sequelize',
  'reflect-metadata',
  'cassandra-driver',
  'mysql2',
  'ssh2',
  'mysql',
  'oracledb',
  '@electron/remote',
  '@google-cloud/bigquery',
  'pg-query-stream',
  'electron',
  '@duckdb/node-api',
  '@mongosh/browser-runtime-electron',
  '@mongosh/service-provider-node-driver',
  'mongodb-client-encryption',
  'sqlanywhere',
  'ws',
  'kerberos',
];

// Bundled by esbuild, but they locate their platform-specific .node
// binaries with dynamic requires that resolve from node_modules at runtime,
// so the raw packages must ship too.
const runtimeResolved = [
  'libsql',
];

module.exports = { externals, bundledPlugins, runtimeResolved };
