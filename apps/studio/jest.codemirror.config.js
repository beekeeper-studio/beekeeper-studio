/* eslint-disable */
var integrationConfig = require('./jest.integration.config')

module.exports = {
  ...integrationConfig,
  testMatch: ["**/tests/integration/codemirror/**/*.spec.[jt]s?(x)"],
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: "http://localhost",
    browsers: ["chrome"]
  },
  globals: {},
  setupFilesAfterEnv: [
    './tests/init/setup.js',
    '<rootDir>/tests/integration/codemirror/setup.js'
  ]
}
