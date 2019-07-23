const MonacoEditorPlugin = require('monaco-editor-webpack-plugin')
module.exports = {
  configureWebpack: {
    plugins: [
      new MonacoEditorPlugin({
        languages: ['sql']
      })
    ]

  }
}
