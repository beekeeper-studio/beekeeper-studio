#!/usr/bin/env node
import esbuild from 'esbuild';
import vuePlugin from 'esbuild-vue'
import {sassPlugin} from 'esbuild-sass-plugin'
import { copy } from 'esbuild-plugin-copy';
import postcss from 'postcss'
import copyAssets from 'postcss-copy-assets';
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
  console.log('forked electron, pid: ', electron.pid)

}, 500)

const tabulatorPlugin = {
  name: 'tabulator-tables resolver',
  setup(build) {
    build.onResolve({ filter: /^tabulator-tables$/ }, async (args) => {
      const result = await build.resolve('../../node_modules/tabulator-tables/dist/js/tabulator_esm.js', {
        kind: 'import-statement',
        resolveDir: path.dirname(args.path),
      })

      if (result.errors.length > 0) {
        return { errors: result.errors }
      }

      return {
        path: result.path
      }
    });
  },
}


const electronMainPlugin = {
  name: "electron-main-process-restarter",
  setup(build) {
    if (!isWatching) return
    build.onStart(() => console.log("ESBUILD: Building Main 🏗"))
    build.onEnd(() => {
      console.log("ESBUILD: Built Main ✅")
      restartElectron()
    })
  }
}


const electronRendererPlugin = {
  name: 'example',
  setup(build) {
    if (!isWatching) return
    build.onStart(() => {
      console.log("ESBUILD: Building Renderer 🏗")
    })
    build.onEnd(async (result) => {
      console.log("ESBUILD: Built Renderer ✅")
      if (electron) {
        console.log("electron pid", electron.pid)
        // electron.send('renderer')
        // electron.kill('SIGUSR2')
        touch('./tmp/restart-renderer')
      }
    })
  },
}


const electronUtilityPlugin = {
  name: "electron-utility-process-restarter",
  setup(build) {
    if (!isWatching) return
    build.onStart(() => console.log("ESBUILD: Building Utility 🏗"))
    build.onEnd(() => {
      console.log("ESBUILD: Built Utility ✅")
      if (electron) {
        restartElectron()
        console.log("electron pid", electron.pid)
        // electron.send('utility')
        // electron.kill('SIGUSR1')
        // touch('./tmp/restart-utility')

      }
    })
  }
}

  const commonArgs = {
    platform: 'node',
    publicPath: '.',
    outdir: 'dist',
    bundle: true,
    external: [...externals, '*.woff', '*.woff2', '*.ttf', '*.svg', '*.png'],
    sourcemap: isWatching,
    minify: !isWatching
  }

  const mainArgs = {
    ...commonArgs,
    entryPoints: ['src/background.ts'],
    plugins: [electronMainPlugin,
    copy({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['./src/index.html'],
          to: './dist/'
        },
      ]
    })]
  }

  const utilityArgs = {
    ...commonArgs,
    entryPoints: ['src/utility.ts'],
    plugins: [electronUtilityPlugin],
    // import.meta.url is undefined in esbuild
    define: { 'import.meta.url': '_importMetaUrl' },
    banner: {
      js: "const _importMetaUrl=require('url').pathToFileURL(__filename);",
    },
  }

  const rendererArgs = {
    ...commonArgs,
    entryPoints: ['src/main.ts'],
    plugins: [
      tabulatorPlugin,
      electronRendererPlugin,
      vuePlugin(),
      copy({
        resolveFrom: "cwd",
        assets: [
          {
            from: ['../../node_modules/material-icons/**/*.woff*'],
            to: ['./dist/material-icons']
          },
          {
            from: './src/assets/logo.svg',
            to: 'dist/assets/'
          },
          {
            from: './src/assets/fonts/**/*',
            to: 'dist/fonts'
          },
          {
            from: './src/assets/icons/**/*',
            to: 'dist/icons'
          },
          {
            from: './src/assets/images/**/*',
            to: 'dist/images'
          },
          {
            from: '../../node_modules/typeface-roboto/**/*.woff*',
            to: './dist/'
          },
          {
            from: '../../node_modules/xel/**/*.svg',
            to: './dist/node_modules/xel'
          },
        ]
      }),
      sassPlugin({
        async transform(source, resolveDir, filePath) {
          const { css } = await postcss().use(copyAssets({ base: `dist` })).process(source, { from: filePath, to: `dist/main.css` });
          return css;
        }
      }),

    ]
  }


  if(isWatching) {
    const main = await esbuild.context(mainArgs)
    const renderer = await esbuild.context(rendererArgs)
    const utility = await esbuild.context(utilityArgs)
    await utility.rebuild()
    await renderer.rebuild()
    Promise.all([main.watch(), renderer.watch(), utility.watch()])
  } else {
    Promise.all([
      esbuild.build(mainArgs),
      esbuild.build(rendererArgs),
      esbuild.build(utilityArgs)
    ])
  }
// launch electron
