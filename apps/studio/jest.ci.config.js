// eslint-disable-next-line
var integrationConfig = require('./jest.integration.config')

integrationConfig.testPathIgnorePatterns = ["/tests\/integration\/lib\/db/"]
module.exports = integrationConfig