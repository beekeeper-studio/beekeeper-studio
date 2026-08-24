/* eslint-disable */
var integrationConfig = require('./jest.integration.config')

// spread instead of replace so the migrated-to-vitest ignores survive
integrationConfig.testPathIgnorePatterns = [...integrationConfig.testPathIgnorePatterns, "/tests\/integration\/lib\/db/"]
module.exports = integrationConfig