// eslint-disable-next-line
var unitConfig = require('./jest.config')

unitConfig.testMatch = ["**/tests/integration/**/*.spec.[jt]s?(x)"]
const config = {
  ...unitConfig,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/init/matchers.js'],
  silent: false,
  globals: {
    fetch: global.fetch,
    // just to keep config.ts happy in debug mode
    localStorage: {}
  },
  testPathIgnorePatterns: ["/codemirror/"]
}

module.exports = config
