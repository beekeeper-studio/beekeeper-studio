// eslint-disable-next-line
var integrationConfig = require('./jest.integration.config')

const config = {
  ...integrationConfig,
  testMatch: ["**/tests/integration/windows/**/*.spec.[jt]s?(x)"],
  testPathIgnorePatterns: ["/codemirror/"],
}

module.exports = config
