// Single source of truth for which package names are resolvable at runtime
// in the *packaged* app, derived from externals.cjs.
//
// esbuild bundles all backend (main/preload/utility) code into dist/ except
// the `externals`, which stay as runtime `require()`s resolved from
// node_modules. electron-builder-config.js excludes everything *not* needed
// from the packed node_modules; this module computes that keep-set so the
// config and the bundle-require check agree on exactly what ships.

const path = require('path')
const fs = require('fs')
const { externals, runtimeResolved } = require('../externals.cjs')

const STUDIO_ROOT = path.resolve(__dirname, '..')

// electron is provided by the Electron runtime, not packed from node_modules;
// walking its (dev-only) dependency tree would needlessly keep packages that
// happen to share names with bundled production deps.
const keepModules = [...externals.filter((name) => name !== 'electron'), ...runtimeResolved]

// Node-style resolution: look for name in fromDir/node_modules, then walk up.
// Nested copies matter — a package may depend on an older major of a hoisted
// name (e.g. socksv5 -> ip-address@9, which needs sprintf-js while the
// hoisted ip-address@10 doesn't), and electron-builder's own hoister can
// promote that nested copy to the top level of the packed app.
function resolvePackageDir(fromDir, name) {
  let dir = fromDir
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name)
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

// Transitive closure (by package name) of the given modules' runtime deps,
// walking every reachable installed copy so version-specific deps are kept.
function dependencyClosure(moduleNames, fromDir = STUDIO_ROOT) {
  const names = new Set()
  const seenDirs = new Set()
  const queue = moduleNames
    .map((name) => ({ name, dir: resolvePackageDir(fromDir, name) }))
    .filter((entry) => entry.dir != null)
  while (queue.length > 0) {
    const { name, dir } = queue.pop()
    const realDir = fs.realpathSync(dir)
    names.add(name)
    if (seenDirs.has(realDir)) continue
    seenDirs.add(realDir)
    const pkg = JSON.parse(fs.readFileSync(path.join(realDir, 'package.json'), 'utf8'))
    const deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.optionalDependencies || {})]
    for (const dep of deps) {
      const depDir = resolvePackageDir(realDir, dep)
      if (depDir != null) {
        queue.push({ name: dep, dir: depDir })
      }
    }
  }
  return names
}

// Package names that ship as raw node_modules in the packaged app.
function packagedModuleNames() {
  return dependencyClosure(keepModules)
}

module.exports = {
  STUDIO_ROOT,
  keepModules,
  resolvePackageDir,
  dependencyClosure,
  packagedModuleNames,
}
