var unitConfig = require('./jest.config')

unitConfig.testMatch = ["**/tests/integration/**/*.spec.[jt]s?(x)"]

module.exports = unitConfig