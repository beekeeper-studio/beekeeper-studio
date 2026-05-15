/* eslint-disable */
var integrationConfig = require('./jest.integration.config')

// Restrict execution to the RDS suite and drop the RDS ignore pattern the
// base integration config adds to keep this suite out of normal CI runs.
integrationConfig.testMatch = ["**/tests/integration/rds/**/*.spec.[jt]s?(x)"]
integrationConfig.testPathIgnorePatterns = [
  "/codemirror/",
  "/tests/integration/macos/",
]
integrationConfig.maxWorkers = 1
integrationConfig.testTimeout = 120000

module.exports = integrationConfig
