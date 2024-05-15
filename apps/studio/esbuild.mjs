#!/usr/bin/env node
import esbuild from 'esbuild';
import vuePlugin from 'esbuild-vue'
import {sassPlugin} from 'esbuild-sass-plugin'
import { copy } from 'esbuild-plugin-copy';
import postcss from 'postcss'
import copyAssets from 'postcss-copy-assets';
const isWatching = process.argv[2] === 'watch';

const externals = ['better-sqlite3', 'sqlite3',
        'sequelize', 'reflect-metadata',
        'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb', 'mysql',
        'oracledb', '@electron/remote', "@google-cloud/bigquery",
        'pg-query-stream', 'electron'

      ]


  // FIXME: Move from Sass to regular CSS (remove sassplugin)
  const args = {
    platform: 'node',
    minify: !isWatching,
    entryPoints: ['src/background.ts', 'src/main.ts'],
    outdir: 'dist',
    publicPath: '.',
    sourcemap: true,
    external: [...externals, '*.woff', '*.woff2', '*.ttf', '*.svg', '*.png'],
    bundle: true,
    plugins: [
      sassPlugin({
        async transform(source, resolveDir, filePath) {
          const { css } = await postcss().use(copyAssets({ base: `dist` })).process(source, { from: filePath, to: `dist/main.css` });
          return css;
        }
      }),
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

    })]
  }


  if(isWatching) {
    const context = await esbuild.context(args)
    await context.watch()
  } else {
    await esbuild.build(args)
  }
// launch electron
