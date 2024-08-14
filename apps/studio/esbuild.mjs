#!/usr/bin/env node
import esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { spawn, exec, fork } from 'child_process'
import path from 'path';
const isWatching = process.argv[2] === 'watch';
import _ from 'lodash'
import { close, open, utimes } from 'fs'
import fs from 'fs'



if (!fs.existsSync('./tmp')){
    fs.mkdirSync('./tmp');
}

const touch = path => {
  return new Promise((resolve, reject) => {
    const time = new Date();
    utimes(path, time, time, err => {
      if (err) {
        return open(path, 'w', (err, fd) => {
          if (err) return reject(err);
          close(fd, err => (err ? reject(err) : resolve(fd)));
        });
      }
      resolve();
    });
  });
};



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
        'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb', 'mysql',
        'oracledb', '@electron/remote', "@google-cloud/bigquery",
        'pg-query-stream', 'electron'

      ]

let electron = null

const restartElectron = _.debounce(() => {
  if (electron) {
    process.kill(electron.pid, 'SIGINT')
  }
  // start electron again
  electron = spawn(electronBin, ['.'], { stdio: 'inherit' })
  electron.on('exit', (code, signal) => console.log('electron exited', code, signal))
  console.log('spawned electron, pid: ', electron.pid)

}, 500)


function getElectronPlugin(name, action = () => restartElectron()) {
  return {
    name: `${name}-plugin`,
    setup(build) {
      if (!isWatching) return
      build.onStart(() => console.log(`ESBUILD: Building ${name}  🏗`))
      build.onEnd(() => {
        console.log(`ESBUILD: Built ${name} ✅`)
        action()
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

  const mainArgs = {
    ...commonArgs,
    entryPoints: ['src/background.ts', 'src/utility.ts', 'src/preload.ts'],
    plugins: [getElectronPlugin("Main")]
  }

  if(isWatching) {
    const main = await esbuild.context(mainArgs)
    Promise.all([main.watch()])
  } else {
    Promise.all([
      esbuild.build(mainArgs),
    ])
  }
// launch electron
