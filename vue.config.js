const webpack = require('webpack');

const externals = ['sqlite3', 'sequelize', 'mysql', 'typeorm', 'reflect-metadata', 'cassandra-driver']
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
          target: ['snap', 'deb', 'rpm', 'appImage']
        },
        deb: {
          publish: [
            {
              provider: 'github'
            }, 
            {
              provider: 'bintray',
              user: 'rathboma',
              repo: 'releases',
              package: 'beekeeper-studio',
              owner: 'beekeeper-studio'
            },
          ]
        },
        appImage: {
          publish: ['github']
        },
        snap: {
          publish: ['github', 'snapStore']
        },
        rpm: {
          publish: ['github']
        },

        win: {
          icon: './public/icons/png/512x512.png'
        }
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
