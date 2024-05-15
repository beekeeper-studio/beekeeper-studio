/* eslint-disable */
const webpack = require('webpack');
const path = require('path');
/* eslint-enable */

const nodeExternals = [
  'fs', 'path', 'os', 'stream',
  'child_process', 'crypto', 'http', 'tls', 'https', 'net',
  'dns', 'zlib', 'timers'
]

const externals = ['better-sqlite3',
  'sequelize', 'typeorm', 'reflect-metadata',
  'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb', 'oracledb', 'kerberos'
]

const p = process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : 'app://./'
module.exports = {
  transpileDependencies: ['@aws-sdk/*', 'tabulator-tables'],
  publicPath: p,
  outputDir: path.resolve(__dirname, "dist/renderer"),
  configureWebpack: {
    devtool: 'source-map',
    plugins: [
      new webpack.IgnorePlugin(/pg-native/, /pg/),
      // new webpack.IgnorePlugin(/kerberos/, /cassandra-driver/),
      new webpack.ProvidePlugin({
        diff_match_patch: 'diff-match-patch',
        DIFF_EQUAL: ['diff-match-patch', 'DIFF_EQUAL'],
        DIFF_INSERT: ['diff-match-patch', 'DIFF_INSERT'],
        DIFF_DELETE: ['diff-match-patch', 'DIFF_DELETE'],
      }),
    ],

    externals: [...externals],
    node: false,
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, '../../shared/src')
      }
    },
    module: {
      rules: [
        {
          test: /node_modules[/\\](iconv-lite)[/\\].+/,
          resolve: {
            aliasFields: ['main']
          }
        }
      ]
    }

  },
  css: {
    loaderOptions: {
      sass: {
        implementation: require('sass')
      }
    }
  }
}
