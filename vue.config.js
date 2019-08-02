
const externals = ['sqlite3', 'sequelize', 'mysql']
module.exports = {
  pluginOptions: {
    electronBuilder: {
      externals
    }
  },
  configureWebpack: {
    plugins: [
    ],
    // externals
  }
}
