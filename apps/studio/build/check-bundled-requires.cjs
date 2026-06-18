#!/usr/bin/env node
/*
 * Guardrail for the deps/devDependencies externals convention.
 *
 * esbuild bundles the backend into dist/ and leaves a handful of packages as
 * runtime require()s (the `dependencies` block, plus a few optional/transitive
 * drivers). electron-builder ships `dependencies` (and their closure) and
 * prunes `devDependencies`. So every package esbuild leaves external MUST be
 * resolvable at runtime in the packaged app; if one points at a package that
 * now lives in devDependencies it would only blow up as MODULE_NOT_FOUND after
 * packaging.
 *
 * This reads the esbuild metafiles (written by esbuild.mjs) and asserts that
 * every externalized import is one of:
 *   - a Node builtin (or electron, provided by the runtime),
 *   - a `dependencies` entry (shipped raw + its closure),
 *   - a known optional/transitive driver that ships inside a dependency's
 *     subtree or is gracefully absent,
 *   - a bundled plugin delivered via electron-builder extraResources.
 *
 * Anything else is a require() that would be missing at runtime.
 */
const fs = require('fs')
const path = require('path')
const { builtinModules } = require('module')

const studioDir = path.resolve(__dirname, '..')
const pkg = require(path.join(studioDir, 'package.json'))

// Optional/transitive drivers a bundled package may require() at runtime. They
// either ship inside a kept dependency's subtree or are optional and absent by
// design. Keep in sync with `forceExternal` in esbuild.mjs.
const OPTIONAL_EXTERNALS = new Set([
  'sqlite3',
  'sequelize',
  'mysql',
  'pg-query-stream',
  'mongodb-client-encryption',
  'kerberos',
])

// Bundled plugins ship via electron-builder `extraResources`, not node_modules.
const BUNDLED_PLUGINS = new Set([
  '@beekeeperstudio/bks-ai-shell',
  '@beekeeperstudio/bks-er-diagram',
])

const allowed = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'electron',
  'beekeeper-studio', // self-reference; ships its own package.json
  ...Object.keys(pkg.dependencies || {}),
  ...OPTIONAL_EXTERNALS,
  ...BUNDLED_PLUGINS,
])

/** Reduce an import path to its npm package name. */
function packageName(importPath) {
  if (importPath.startsWith('@')) {
    return importPath.split('/').slice(0, 2).join('/')
  }
  return importPath.split('/')[0]
}

// node_modules roots to probe for "is this package actually installed?".
const resolvePaths = [studioDir, path.resolve(studioDir, '../..')]

/**
 * Optional drivers that a bundled library require()s inside a try/catch (e.g.
 * typeorm's sql.js / @sap/hana-client, mongodb's snappy) are left external by
 * esbuild but were never installed. They can never be MODULE_NOT_FOUND
 * regressions because they were never shipped or bundled — only flag packages
 * that genuinely exist on disk.
 */
function isInstalled(name) {
  try {
    require.resolve(`${name}/package.json`, { paths: resolvePaths })
    return true
  } catch {
    try {
      require.resolve(name, { paths: resolvePaths })
      return true
    } catch {
      return false
    }
  }
}

const metafiles = ['dist/metafile-main.json', 'dist/metafile-utility.json']
const externalImports = new Set()

for (const rel of metafiles) {
  const file = path.join(studioDir, rel)
  if (!fs.existsSync(file)) {
    console.error(`Missing ${rel}. Run \`yarn build:esbuild\` first.`)
    process.exit(1)
  }
  const meta = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const output of Object.values(meta.outputs)) {
    for (const imp of output.imports || []) {
      if (imp.external) externalImports.add(imp.path)
    }
  }
}

const violations = []
for (const imp of externalImports) {
  const name = packageName(imp)
  if (allowed.has(name) || allowed.has(imp)) continue
  // Not in the shipped set. Only a problem if it actually exists on disk — an
  // installed package that is externalized but lives in devDependencies would
  // be pruned by electron-builder and throw MODULE_NOT_FOUND when required.
  if (isInstalled(name)) {
    violations.push(`${imp}  (package: ${name})`)
  }
}

if (violations.length) {
  console.error(
    'Externalized imports that will not ship in the packaged app:\n  ' +
      violations.sort().join('\n  ') +
      '\n\nEither add the package to "dependencies" in apps/studio/package.json ' +
      'so it ships raw, or let esbuild bundle it (keep it in devDependencies).'
  )
  process.exit(1)
}

console.log(
  `check-bundled-requires: OK — ${externalImports.size} externalized imports, all shippable.`
)
