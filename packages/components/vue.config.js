const fixEmitDeclarationFilesForTypeScript = {
  chainWebpack: (config) => {
    if (1) {
      config.module.rule('ts').uses.delete('cache-loader');
      config.module
        .rule('ts')
        .use('ts-loader')
        .loader('ts-loader')
        .tap((options) => ({
          ...options,
          transpileOnly: false,
          happyPackMode: false,
        }));
    }
  },
  parallel: false,
};

module.exports = {
  ...fixEmitDeclarationFilesForTypeScript
}