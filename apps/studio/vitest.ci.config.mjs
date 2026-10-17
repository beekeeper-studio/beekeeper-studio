import { defineConfig, mergeConfig } from 'vitest/config'
import integrationConfig from './vitest.integration.config.mjs'

// `yarn test:ci` / `yarn vitest:ci`: the integration suite minus the specs that
// need docker databases (those run in the per-database CI matrix instead).
export default mergeConfig(
  integrationConfig,
  defineConfig({
    test: {
      exclude: ['tests/vitest/integration/lib/db/**'],
    },
  })
)
