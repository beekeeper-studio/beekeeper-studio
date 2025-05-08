/* eslint-disable */
var integrationConfig = require('./jest.integration.config')

integrationConfig.testPathIgnorePatterns = ["/tests\/integration\/lib\/db/", "/codemirror/"]
module.exports = integrationConfig