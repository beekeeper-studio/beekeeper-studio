#!/usr/bin/env node
import esbuild from 'esbuild';
import vuePlugin from 'esbuild-vue'
import {sassPlugin} from 'esbuild-sass-plugin'
const isWatching = process.argv[2] === 'watch';

const externals = ['better-sqlite3', 'sqlite3',
        'sequelize', 'reflect-metadata',
        'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb', 'mysql',
        'oracledb', '@electron/remote', "@google-cloud/bigquery",
        'pg-query-stream', 'electron'

      ]

// const makeAllPackagesExternalPlugin = {
//   name: 'make-all-packages-external',
//   setup(build) {
//     let filter = /^[^./]|^\.[^./]|^\.\.[^/]/ // Must not start with "/" or "./" or "../"
//     build.onResolve({ filter }, args => ({ path: args.path, external: true }))
//   },
// }


  const args = {
    platform: 'node',
    minify: !isWatching,
    entryPoints: ['src/background.ts', 'src/main.ts'],
    outdir: 'dist',
    publicPath: '.',
    external: [...externals, '*.woff', '*.woff2', '*.ttf', '*.svg', '*.png'],
    bundle: true,
    plugins: [sassPlugin(), vuePlugin()]
  }


  if(isWatching) {
    const context = await esbuild.context(args)
    await context.watch()
  } else {
    await esbuild.build(args)
  }
// launch electron
