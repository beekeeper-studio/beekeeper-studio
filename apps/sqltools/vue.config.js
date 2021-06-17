const path = require('path')

module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, '../shared/src'),
        "@studio": path.resolve(__dirname, 'src')
      }
    },
  }
}