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
  testPathIgnorePatterns: [
    "/codemirror/",
    "/tests/integration/macos/",
    // migrated-to-vitest specs, inherited from the unit config
    ...unitConfig.testPathIgnorePatterns,
  ]
}

module.exports = config
