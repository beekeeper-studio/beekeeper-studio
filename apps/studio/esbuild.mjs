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

const electronMainPlugin = {
  name: "electron-main-process-restarter",
  setup(build) {
    if (!isWatching) return
    build.onStart(() => console.log("ESBUILD: Building Main 🏗"))
    build.onEnd(() => {
      console.log("ESBUILD: Built Main ✅")
      if (electron) {
        process.kill(electron.pid, 'SIGTERM')
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
    plugins: [electronMainPlugin]
  }

  const rendererArgs = {
    ...commonArgs,
    entryPoints: ['src/main.ts'],
    plugins: [
      electronRendererPlugin,
      vuePlugin(),
      copy({
        resolveFrom: "cwd",
        assets: [{
          from: ['../../node_modules/material-icons/**/*.woff*'],
          to: ['./dist/material-icons']
        },
        {
          from: ['./src/index.html'],
          to: './dist/'
        },
        {
          from: '../../node_modules/typeface-roboto/**/*.woff*',
          to: './dist/'
        }
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
    Promise.all([main.watch(), renderer.watch()])
  } else {
    Promise.all([
      esbuild.build(mainArgs),
      esbuild.build(rendererArgs)
    ])
  }
// launch electron
