#!/usr/bin/env node
import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { spawn, exec, fork } from 'child_process'
import path from 'path';
import _ from 'lodash'
import fs from 'fs'

// NOTE: keep in sync with src/common/globals.ts -> plugins.ensureInstalled
const ensureInstalled = [
  "@beekeeperstudio/bks-ai-shell",
  "@beekeeperstudio/bks-er-diagram",
];

// Packages esbuild must leave as runtime require()s even though they are not
// direct `dependencies`. Three kinds live here:
//   - `electron`: provided by the runtime, kept in devDependencies.
//   - optional/transitive drivers a bundled package may require() at runtime
//     (e.g. mongodb -> kerberos / mongodb-client-encryption, knex -> the
//     pg-query-stream / sqlite3 / mysql / sequelize dialects). The native ones
//     ship inside a kept dependency's own subtree; bundling them would break
//     the native binary, so they must stay external.
//   - the bundled plugins, which ship via electron-builder `extraResources`
//     rather than as node_modules.
//
// esbuild-node-externals matches string patterns by exact equality, so a regex
// is needed to also cover subpath imports (e.g. `electron` and `electron/main`).
const asExternalPattern = (name) =>
  new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`)

const forceExternal = [
  'electron',
  'sqlite3', 'sequelize', 'mysql', 'pg-query-stream',
  'mongodb-client-encryption', 'kerberos',
  ...ensureInstalled,
].map(asExternalPattern)

const isWatching = process.argv[2] === 'watch';

function getElectronBinary() {
  const winLinux = path.join('../../node_modules/electron/dist/electron')
  const mac = path.join('../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
  const result = process.platform === 'darwin' ? mac : winLinux
  return path.resolve(result)
}

let electronBin
try {
  electronBin = getElectronBinary()
  console.log("Path to electron: ", electronBin)
} catch (err) {
  console.error(err)
  throw new Error(err)
}

// Externalize exactly the packages that ship raw as node_modules. The
// `dependencies` block in package.json is the single source of truth for that
// set (native modules + anything that breaks when bundled); everything else
// lives in devDependencies and gets bundled into dist/. This keeps the bundler
// and electron-builder (which ships `dependencies` and prunes devDependencies)
// in agreement by construction.
const nodeExternals = nodeExternalsPlugin({
  packagePath: path.resolve('./package.json'),
  devDependencies: false,
  forceExternalList: forceExternal,
})

let electron = null
/** @type {fs.FSWatcher[]} */
const configWatchers = {}

// Debounced because the main and utility builds run as separate esbuild
// contexts (different @bksLogger alias each); their onEnd hooks both
// call this, and 500ms is enough to coalesce their finish into one
// electron restart.
const restartElectron = _.debounce(() => {
  if (electron) {
    process.kill(electron.pid, 'SIGINT')
  }
  // start electron again
  electron = spawn(electronBin, ['.'], { stdio: 'inherit' })
  electron.on('exit', (code, signal) => {
    console.log('electron exited', code, signal)
    if (!signal) process.exit()
  })
  console.log('spawned electron, pid: ', electron.pid)

}, 500)

function watchConfig(file) {
  if (configWatchers[file]) return
  const watcher = fs.watch(file, () => {
    console.log(`Detected change in ${file}, rebuilding...`);
    restartElectron()
  })
  configWatchers[file] = watcher
}

function getElectronPlugin(name, action = () => restartElectron()) {
  return {
    name: `${name}-plugin`,
    setup(build) {
      if (!isWatching) return
      build.onStart(() => console.log(`ESBUILD: Building ${name}  🏗`))
      build.onEnd(() => {
        console.log(`ESBUILD: Built ${name} ✅`)
        action()
        watchConfig('default.config.ini')
        watchConfig('local.config.ini')
        watchConfig('system.config.ini')
      })
    }
  }
}



const env = isWatching ? '"development"' : '"production"';
const commonArgs = {
  platform: 'node',
  publicPath: '.',
  outdir: 'dist',
  bundle: true,
  external: ['*.woff', '*.woff2', '*.ttf', '*.svg', '*.png'],
  sourcemap: true,
  minify: false,
  define: {
    'process.env.NODE_ENV': env
  }
}

// `@bksLogger` resolves to a different file per build so each process
// gets a logger flavored for its electron-log entry point — main+preload
// share electron-log/main (the IPC sink for renderer messages), utility
// runs electron-log/node. The ambient declaration in src/lib/log/
// bksLogger.d.ts keeps the IDE / tsc happy with a base-Logger type.
const aliasFor = (loggerFile) => ({
  '@bksLogger': path.resolve('./src/lib/log/' + loggerFile),
})

const mainArgs = {
  ...commonArgs,
  entryPoints: ['src-commercial/entrypoints/main.ts', 'src-commercial/entrypoints/preload.ts'],
  alias: aliasFor('mainLogger.ts'),
  plugins: [nodeExternals, getElectronPlugin("Main")]
}

const utilityArgs = {
  ...commonArgs,
  entryPoints: ['src-commercial/entrypoints/utility.ts'],
  alias: aliasFor('utilityLogger.ts'),
  plugins: [nodeExternals, getElectronPlugin("Utility")]
}

if(isWatching) {
  const main = await esbuild.context(mainArgs)
  const utility = await esbuild.context(utilityArgs)
  await Promise.all([main.watch(), utility.watch()])
} else {
  // Emit metafiles so build/check-bundled-requires.cjs can verify that every
  // package esbuild left as a runtime require() actually ships at runtime.
  const [main, utility] = await Promise.all([
    esbuild.build({ ...mainArgs, metafile: true }),
    esbuild.build({ ...utilityArgs, metafile: true }),
  ])
  fs.writeFileSync('dist/metafile-main.json', JSON.stringify(main.metafile))
  fs.writeFileSync('dist/metafile-utility.json', JSON.stringify(utility.metafile))
}
// launch electron
