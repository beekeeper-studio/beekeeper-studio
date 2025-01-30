// eslint-disable-next-line
var unitConfig = require('./jest.config')

unitConfig.testMatch = ["**/tests/integration/**/*.spec.[jt]s?(x)"]
const config = {
  ...unitConfig,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  silent: false,
  globals: {
    fetch: global.fetch,
    // just to keep config.ts happy in debug mode
    localStorage: {}
  },

}

module.exports = config
