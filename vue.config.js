const webpack = require('webpack');

const externals = ['sqlite3', 'sequelize', 'typeorm', 'reflect-metadata', 'cassandra-driver', 'mysql2', 'ssh2']
module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      externals,
      builderOptions: {
        appId: "io.beekeeperstudio.desktop",
        productName: "Beekeeper Studio",
        files: ['**/*', 'public/icons/**/*'],
        afterSign: "electron-builder-notarize",
        mac: {
          entitlements: "./build/entitlements.mac.plist",
          icon: './public/icons/mac/bk-icon.icns',
          category: "public.app-category.developer-tools",
          "hardenedRuntime": true
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
            'github',
            {
              provider: 'bintray',
              user: 'rathboma',
              repo: 'releases',
              package: 'beekeeper-studio',
              owner: 'beekeeper-studio',
              distribution: 'disco',
              component: 'main'
            },
          ],
          fpm: [
            "--after-install=build/deb-postinstall"
          ],
          depends: ["libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libappindicator3-1, libsecret-1-0", "gnupg"]
        },
        appImage: {
          publish: ['github']
        },
        snap: {
          publish: [
            'github',
            'snapStore'
          ],
          environment: {
            "ELECTRON_SNAP": "true"
          },
          plugs: ["default", "ssh-keys"]
        },
        win: {
          icon: './public/icons/png/512x512.png',
          target: ['nsis', 'portable']
        },
        portable: {
          "artifactName": "${productName}-${version}-portable.exe",
        },
      }
    }
  },
  configureWebpack: {
    plugins: [
      new webpack.IgnorePlugin(/pg-native/, /pg/),
      new webpack.IgnorePlugin(/kerberos/, /cassandra-driver/)
    ],
    node: {
      dns: 'mock'
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

    // externals
  }
}
