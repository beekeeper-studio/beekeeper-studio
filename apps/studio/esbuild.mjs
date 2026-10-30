#!/usr/bin/env node
import esbuild from 'esbuild';
import { spawn, exec, fork } from 'child_process'
import path from 'path';
import _ from 'lodash'
import fs from 'fs'

// NOTE: keep in sync with src/common/globals.ts -> plugins.ensureInstalled
const ensureInstalled = [
  "@beekeeperstudio/bks-ai-shell",
  "@beekeeperstudio/bks-er-diagram",
];

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

const externals = ['better-sqlite3', 'sqlite3',
        'sequelize', 'reflect-metadata',
        'cassandra-driver', 'mysql2', 'ssh2', 'mysql',
        'oracledb', '@electron/remote', "@google-cloud/bigquery",
        'pg-query-stream', 'electron', '@duckdb/node-api',
        '@mongosh/browser-runtime-electron', '@mongosh/service-provider-node-driver',
        'mongodb-client-encryption', 'sqlanywhere', 'ws', 'kerberos', 'msnodesqlv8',
        ...ensureInstalled,
      ]

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
  external: [...externals, '*.woff', '*.woff2', '*.ttf', '*.svg', '*.png'],
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
  plugins: [getElectronPlugin("Main")]
}

const utilityArgs = {
  ...commonArgs,
  entryPoints: ['src-commercial/entrypoints/utility.ts'],
  alias: aliasFor('utilityLogger.ts'),
  plugins: [getElectronPlugin("Utility")]
}

// The bks command. It runs under plain node (or the app binary with
// ELECTRON_RUN_AS_NODE), so it is a self-contained bundle with no externals,
// and it must never pull in electron or the rest of the app: src/cli talks to
// the running app over its socket and nothing else.
function cliBoundaryPlugin() {
  return {
    name: 'cli-boundary-plugin',
    setup(build) {
      build.onResolve({ filter: /^(electron|@\/|@commercial\/|@shared\/|@bksLogger|assets\/)/ }, (args) => {
        if (args.path.startsWith('@/cli/')) return null
        return {
          errors: [{
            text: `dist/cli.js must not import "${args.path}" (from ${path.relative('.', args.importer)}). ` +
              'src/cli has to stay free of electron and app code.',
          }],
        }
      })
    },
  }
}

const cliArgs = {
  platform: 'node',
  entryPoints: ['src/cli/index.ts'],
  outfile: 'dist/cli.js',
  bundle: true,
  external: [],
  sourcemap: false,
  minify: false,
  banner: { js: '#!/usr/bin/env node' },
  define: {
    'process.env.NODE_ENV': env
  },
  // a CLI rebuild has no reason to restart electron
  plugins: [cliBoundaryPlugin(), getElectronPlugin("CLI", () => {})]
}

if(isWatching) {
  const main = await esbuild.context(mainArgs)
  const utility = await esbuild.context(utilityArgs)
  const cli = await esbuild.context(cliArgs)
  await Promise.all([main.watch(), utility.watch(), cli.watch()])
} else {
  await Promise.all([
    esbuild.build(mainArgs),
    esbuild.build(utilityArgs),
    esbuild.build(cliArgs),
  ])
}
// launch electron
