// eslint-disable-next-line
var unitConfig = require('./jest.config')

// Opt-in suite for the Tailscale SSH regression (#4358). Kept separate from
// test:integration because it needs docker and pulls Tailscale/headscale images.
// Run via `yarn test:tailscale`.
unitConfig.testMatch = ["**/tests/tailscale/**/*.spec.[jt]s?(x)"]
const config = {
  ...unitConfig,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  silent: false,
  maxWorkers: 1,
  // Tailnet convergence + image pulls are slow.
  testTimeout: 360_000,
  globals: {
    fetch: global.fetch,
    // just to keep config.ts happy in debug mode
    localStorage: {}
  },
}

module.exports = config
