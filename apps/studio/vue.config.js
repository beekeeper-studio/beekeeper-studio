/* eslint-disable */
const webpack = require('webpack');
const path = require('path');
/* eslint-enable */

const fpmOptions = [
  "--after-install=build/deb-postinstall"
]

if (  process.env.PI_BUILD ) {
  fpmOptions.push("--architecture")
  fpmOptions.push("armhf")
}
const externals = ['better-sqlite3',
  'sequelize', 'typeorm', 'reflect-metadata',
  'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb', 'oracledb', '@electron/remote',
  'libsql',
]
module.exports = {
  transpileDependencies: ['@aws-sdk/*', 'tabulator-tables'],
  pluginOptions: {
    electronBuilder: {
      nodeModulesPath: ['./node_modules', '../../node_modules'],
      chainWebpackMainProcess: config => {
        config.module
          .rule('babel')
          .test(/\.js$/)
          .use('babel')
          .loader('babel-loader')

          .options({
            presets: [
              ['@babel/preset-env', {
                modules: false,
                targets: {
                    esmodules: true
                  }
              }],
          ],
            plugins: [
              ['@babel/plugin-proposal-decorators', {legacy: true}],
              ['@babel/plugin-proposal-class-properties', {loose: true}],
              ['@babel/plugin-proposal-private-methods', { loose: true }],
              ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
            ]
          })
      },
      nodeIntegration: true,
      externals,
      builderOptions: {
        appId: "io.beekeeperstudio.desktop",
        productName: "Beekeeper Studio",
        releaseInfo: {
          releaseNotesFile: "build/release-notes.md"
        },
        files: ['**/*', 'public/icons/**/*', '!**/node_gyp_bins/*'],
        afterSign: "electron-builder-notarize",
        afterPack: "./build/afterPack.js",
        extraResources: [
          {
            from: './extra_resources/demo.db',
            to: 'demo.db'
          },
          {
            from: 'build/launcher-script.sh',
            to: 'launcher-script.sh'
          },
          {
            from: './vendor',
            to: 'vendor'
          },
          {
            from: './public',
            to: 'public'
          }
        ],
        fileAssociations: [
          {
            ext: 'db',
            name: 'SQLite db file',
            mimeType: 'application/vnd.sqlite3',
          },
          {
            ext: 'sqlite3',
            name: 'SQLite sqlite3 file',
            mimeType: 'application/vnd.sqlite3'
          },
          {
            ext: 'sqlite',
            name: 'SQLite sqlite file',
            mimeType: 'application/vnd.sqlite3'
          }
        ],
        protocols: [
          {
            name: "Amazon Redshift URL scheme",
            schemes: ["redshift"],
            role: "Editor"
          },
          {
            name: "CockroachDB URL scheme",
            schemes: ["cockroachdb", "cockroach"],
            role: "Editor"
          },
          {
            name: "MariaDB URL scheme",
            schemes: ["mariadb"],
            role: "Editor"
          },
          {
            name: "TiDB URL scheme",
            schemes: ["tidb"],
            role: "Editor"
          },
          {
            name: "MySQL URL scheme",
            schemes: ["mysql"],
            role: "Editor"
          },
          {
            name: "PostgreSQL URL scheme",
            schemes: ["postgresql", "postgres", "psql"],
            role: "Editor"
          },
          {
            name: "SQLite URL scheme",
            schemes: ["sqlite"],
            role: "Editor"
          },
          {
            name: "SQL Server URL scheme",
            schemes: ["sqlserver", "microsoftsqlserver", "mssql"],
            role: "Editor"
          }
        ],
        mac: {
          entitlements: "./build/entitlements.mac.plist",
          entitlementsInherit: "./build/entitlements.mac.plist",
          icon: './public/icons/mac/bk-icon.icns',
          category: "public.app-category.developer-tools",
          "hardenedRuntime": true,
          publish: ['github']
        },
        linux: {
          icon: './public/icons/png/',
          category: "Development",
          target: [
            'snap',
            'deb',
            'appImage'
          ],
          desktop: {
            'StartupWMClass': 'beekeeper-studio'
          },
        },
        deb: {
          publish: [
            'github'
          ],
          fpm: fpmOptions,
          // when we upgrade Electron we need to check these
          depends: ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils", "libatspi2.0-0", "libuuid1", "libsecret-1-0", "gnupg"]
        },
        appImage: {
          publish: ['github'],
        },
        snap: {
          publish: [
            'github',
            'snapStore'
          ],
          environment: {
            "ELECTRON_SNAP": "true"
          },
          plugs: ["default", "ssh-keys", "removable-media", "mount-observe"]
        },
        win: {
          icon: './public/icons/png/512x512.png',
          target: ['nsis', 'portable'],
          publish: ['github'],
          sign: "./build/win/sign.js",
        },
        portable: {
          "artifactName": "${productName}-${version}-portable.exe",
        }
      }
    }
  },
  configureWebpack: {
    devtool: 'source-map',
    plugins: [
      new webpack.IgnorePlugin(/pg-native/, /pg/),
      new webpack.IgnorePlugin(/kerberos/, /cassandra-driver/),
      new webpack.ProvidePlugin({
        diff_match_patch: 'diff-match-patch',
        DIFF_EQUAL: ['diff-match-patch', 'DIFF_EQUAL'],
        DIFF_INSERT: ['diff-match-patch', 'DIFF_INSERT'],
        DIFF_DELETE: ['diff-match-patch', 'DIFF_DELETE'],
      }),
    ],

    externals: {
    //   // Possible drivers for knex - we'll ignore them
    //   // 'sqlite3': 'sqlite3',
    //   'mariasql': 'mariasql',
    //   // 'mssql': 'mssql',
      'mysql': 'mysql',
      'oracle': 'oracle',
      'strong-oracle': 'strong-oracle',
      '@libsql/sqlite3': 'commonjs @libsql/sqlite3',
      // 'oracledb': 'oracledb',
    //   // 'pg': 'pg',
    //   // 'pg-query-stream': 'pg-query-stream'
    },
    node: {
      dns: 'mock'
    },
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
        },
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
