
const externals = ['sqlite3', 'sequelize', 'mysql', 'typeorm', 'reflect-metadata']
module.exports = {
  pluginOptions: {
    electronBuilder: {
      externals,
      builderOptions: {
        appId: "io.beekeeperstudio.desktop",
        productName: "Beekeeper Studio",
        files: ['**/*', 'build/icon.*'],
        mac: {
          icon: 'build/icon.png',
          category: "public.app-category.developer-tools"
        },
        linux: {
          icon: 'build/icon.png',
          target: ['AppImage', 'deb', 'rpm', 'snap'],
          category: "Development",
        },
        win: {
          icon: 'build/icon.png'
        }
      }
    }
  },
  configureWebpack: {
    plugins: [
    ],
    module: {
      rules: [
        {
          test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
          resolve: {
            aliasFields: ['main']
          }
        }
      ]
    }

    // externals
  }
}
