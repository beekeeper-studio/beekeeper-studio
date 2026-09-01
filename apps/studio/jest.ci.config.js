/* eslint-disable */
var integrationConfig = require('./jest.integration.config')

integrationConfig.testPathIgnorePatterns = ["/tests\/integration\/lib\/db/", "/tests\/integration\/rds/", "/codemirror/"]
module.exports = integrationConfig