#!/usr/bin/env node
/*
 * Guardrail for the deps/devDependencies externals convention.
 *
 * esbuild bundles the backend into dist/ and leaves a handful of packages as
 * runtime require()s. electron-builder ships the production `dependencies`
 * closure and prunes `devDependencies`. So every package esbuild leaves
 * external MUST be reachable in that closure at runtime; if one points at a
 * package that now lives only in devDependencies it would blow up as
 * MODULE_NOT_FOUND, but only after packaging.
 *
 * Rather than mirror esbuild's external list (which would have to be kept in
 * sync by hand), this derives "what will ship" from the same single source of
 * truth esbuild uses: the package.json `dependencies` block and its installed
 * dependency closure — exactly what electron-builder packs. It reads the
 * esbuild metafiles and flags any externalized import whose package is NOT in
 * that closure (nor a Node builtin / electron / the app itself) yet exists on
 * disk — i.e. a real package that has been pushed into devDependencies and will
 * be pruned.
 *
 * Optional drivers a bundled library require()s inside a try/catch but that are
 * not installed (typeorm's sql.js, mongodb's snappy, ...) are ignored: they
 * were never shipped or bundled, so they can't regress.
 */
const fs = require('fs')
const path = require('path')
const { builtinModules } = require('module')

const studioDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(studioDir, '../..')
const pkg = require(path.join(studioDir, 'package.json'))

// node_modules roots to probe. Yarn hoists most packages to the repo root.
const nodeModulesRoots = [studioDir, repoRoot]

/** Locate a package's package.json, preferring a parent's nested node_modules. */
function findPackageJson(name, fromDir) {
  const candidates = []
  if (fromDir) candidates.push(path.join(fromDir, 'node_modules', name, 'package.json'))
  for (const root of nodeModulesRoots) {
    candidates.push(path.join(root, 'node_modules', name, 'package.json'))
  }
  return candidates.find((p) => fs.existsSync(p)) || null
}

/**
 * Walk the installed production dependency closure of `dependencies`, following
 * each package's own dependencies + optionalDependencies. This mirrors what
 * electron-builder ships (devDependencies, and uninstalled optional deps, are
 * excluded by construction since we only follow packages found on disk).
 */
function productionClosure() {
  const shipped = new Set()
  const stack = Object.keys(pkg.dependencies || {}).map((name) => ({ name, fromDir: studioDir }))
  while (stack.length) {
    const { name, fromDir } = stack.pop()
    if (shipped.has(name)) continue
    const pkgJson = findPackageJson(name, fromDir)
    if (!pkgJson) continue // optional dep that isn't installed -> not shipped
    shipped.add(name)
    const data = JSON.parse(fs.readFileSync(pkgJson, 'utf8'))
    const dir = path.dirname(pkgJson)
    const children = [
      ...Object.keys(data.dependencies || {}),
      ...Object.keys(data.optionalDependencies || {}),
    ]
    for (const child of children) {
      if (!shipped.has(child)) stack.push({ name: child, fromDir: dir })
    }
  }
  return shipped
}

const allowed = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'electron', // provided by the runtime, kept in devDependencies
  'beekeeper-studio', // self-reference; ships its own package.json
  ...productionClosure(),
])

/** Reduce an import path to its npm package name. */
function packageName(importPath) {
  if (importPath.startsWith('@')) {
    return importPath.split('/').slice(0, 2).join('/')
  }
  return importPath.split('/')[0]
}

/** Is the package present on disk at all (vs. an uninstalled optional require)? */
function isInstalled(name) {
  return Boolean(findPackageJson(name))
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
  // Not in the shipped closure. Only a problem if it actually exists on disk —
  // an installed package that is externalized but lives in devDependencies gets
  // pruned by electron-builder and throws MODULE_NOT_FOUND when required.
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
