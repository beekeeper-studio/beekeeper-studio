
const externals = ['sqlite3', 'sequelize', 'mysql', 'typeorm', 'reflect-metadata']
module.exports = {
  pluginOptions: {
    electronBuilder: {
      externals
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
