#!/usr/bin/env node
/*
 * Loads every native module Beekeeper Studio ships and fails if one that should
 * work on this platform doesn't. The utility process imports every database
 * client at startup, so a single native module that can't load (no build for
 * this arch, a failed rebuild) can break all connections, not just its own
 * database.
 *
 * Run it under Electron, after `yarn install`, so modules load with the ABI
 * they were rebuilt for:
 *
 *   ELECTRON_RUN_AS_NODE=1 yarn workspace beekeeper-studio electron ../../bin/check-native-modules.js
 */
const path = require('path')
const { createRequire } = require('module')

// Resolve modules the way the packaged app does: from apps/studio.
const appRequire = createRequire(path.resolve(__dirname, '../apps/studio/package.json'))

const target = `${process.platform}-${process.arch}`

const sqliteVersion = (Database) => new Database(':memory:').prepare('select sqlite_version() as v').get().v

/*
 * required: fail the check if the module doesn't load (default true).
 * unsupported: targets where upstream publishes no build, and the module can't
 *   be built from source. Keep this list in step with the platform notes in
 *   docs/installation/windows.md.
 */
const modules = [
  { name: 'better-sqlite3', check: sqliteVersion },
  {
    name: '@duckdb/node-api',
    check: async ({ DuckDBInstance }) => {
      const instance = await DuckDBInstance.create(':memory:')
      const connection = await instance.connect()
      const reader = await connection.runAndReadAll('select version()')
      const [[version]] = reader.getRows()
      connection.closeSync()
      return version
    },
  },
  { name: 'libsql', unsupported: ['win32-arm64'], check: sqliteVersion },
  { name: 'sqlanywhere', check: (sqlanywhere) => sqlanywhere.createConnection() && 'loaded' },
  // Thin mode is pure JS; thick mode loads its binary only in initOracleClient.
  { name: 'oracledb', check: (oracledb) => oracledb.versionString },
  { name: 'msnodesqlv8' },
  { name: 'kerberos' },
  { name: 'ssh2' },
  { name: 'snowflake-sdk' },
  // Optional dependencies of the MongoDB shell, it runs without them.
  { name: 'mongodb-client-encryption', required: false, unsupported: ['win32-arm64'] },
  { name: 'os-dns-native', required: false },
  { name: 'win-export-certificate-and-key', required: false, platforms: ['win32'] },
]

async function checkModule({ name, check }) {
  const mod = appRequire(name)
  return check ? String(await check(mod)) : 'loaded'
}

async function main() {
  console.log(`Checking native modules for ${target} (electron ${process.versions.electron || 'n/a'}, node ${process.versions.node})`)
  const failures = []

  for (const mod of modules) {
    if (mod.platforms && !mod.platforms.includes(process.platform)) continue

    const expectedToFail = (mod.unsupported || []).includes(target)
    try {
      const result = await checkModule(mod)
      const note = expectedToFail ? ` (listed as unsupported on ${target}, remove it from the list)` : ''
      console.log(`  ok    ${mod.name}: ${result}${note}`)
    } catch (e) {
      const message = e.message.split('\n')[0]
      if (expectedToFail) {
        console.log(`  skip  ${mod.name}: not supported on ${target}`)
      } else if (mod.required === false) {
        console.log(`  warn  ${mod.name}: ${message}`)
      } else {
        console.log(`  FAIL  ${mod.name}: ${message}`)
        failures.push(mod.name)
      }
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} native module(s) failed to load on ${target}: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log('\nAll required native modules loaded.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
