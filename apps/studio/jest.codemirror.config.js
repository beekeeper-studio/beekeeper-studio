/* eslint-disable */
var unitConfig = require('./jest.config')

module.exports = {
  ...unitConfig,
  testMatch: ["**/tests/integration/codemirror/**/*.spec.[jt]s?(x)"],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: "http://localhost",
    browsers: ["chrome"]
  },
  setupFilesAfterEnv: [
    ...unitConfig.setupFilesAfterEnv,
    '<rootDir>/tests/integration/codemirror/setup.js'
  ]
}
