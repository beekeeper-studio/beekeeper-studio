#!/usr/bin/env node
import esbuild from 'esbuild';
import { spawn, exec, fork } from 'child_process'
import path from 'path';
import _ from 'lodash'
import fs from 'fs'
import electronBin from 'electron'

// NOTE: keep in sync with src/common/globals.ts -> plugins.ensureInstalled
const ensureInstalled = [
  "@beekeeperstudio/bks-ai-shell",
  "@beekeeperstudio/bks-er-diagram",
];

const isWatching = process.argv[2] === 'watch';

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

// Debounce the separate main and utility build completions so closely timed
// onEnd hooks can share one Electron restart.
const restartElectron = _.debounce(() => {
  const previousElectron = electron
  electron = null
  if (previousElectron) {
    previousElectron.kill('SIGINT')
  }

  const nextElectron = spawn(electronBin, ['.'], { stdio: 'inherit' })
  electron = nextElectron
  nextElectron.on('error', (error) => {
    console.error('electron process error', error)
    if (electron === nextElectron) {
      electron = null
      process.exit(1)
    }
  })
  nextElectron.on('exit', (code, signal) => {
    const wasReplaced = electron !== nextElectron
    console.log('electron exited', { pid: nextElectron.pid, code, signal, wasReplaced })
    if (wasReplaced) return

    electron = null
    if (!signal) process.exit(code ?? 1)
  })
  console.log('spawned electron, pid: ', nextElectron.pid)
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

if(isWatching) {
  const main = await esbuild.context(mainArgs)
  const utility = await esbuild.context(utilityArgs)
  await Promise.all([main.watch(), utility.watch()])
} else {
  await Promise.all([
    esbuild.build(mainArgs),
    esbuild.build(utilityArgs),
  ])
}
// launch electron
