#!/usr/bin/env node
import esbuild from 'esbuild';
import vuePlugin from 'esbuild-vue'
import {sassPlugin} from 'esbuild-sass-plugin'
import { copy } from 'esbuild-plugin-copy';
import postcss from 'postcss'
import copyAssets from 'postcss-copy-assets';
import { spawn } from 'child_process'
import path from 'path';
const isWatching = process.argv[2] === 'watch';





const externals = ['better-sqlite3', 'sqlite3',
        'sequelize', 'reflect-metadata',
        'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb', 'mysql',
        'oracledb', '@electron/remote', "@google-cloud/bigquery",
        'pg-query-stream', 'electron'

      ]

let electron = null

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
      if (electron) {
        process.kill(electron.pid, 'SIGINT')
      }
      // start electron again
      electron = spawn(path.join('../../node_modules/electron/dist/electron'), ['.'], { stdio: 'inherit' })

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
        process.kill(electron.pid, 'SIGUSR2')
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
        process.kill(electron.pid, 'SIGINT')
      }
      // start electron again
      electron = spawn(path.join('../../node_modules/electron/dist/electron'), ['.'], { stdio: 'inherit' })

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
    plugins: [electronUtilityPlugin]
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
    Promise.all([main.watch(), renderer.watch(), utility.watch()])
  } else {
    Promise.all([
      esbuild.build(mainArgs),
      esbuild.build(rendererArgs),
      esbuild.build(utilityArgs)
    ])
  }
// launch electron
