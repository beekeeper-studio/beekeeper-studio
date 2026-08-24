import { defineConfig } from 'vitest/config'
import { plugins, resolveOptions, baseTest, migrated } from './vitest.shared.mjs'

// Integration tests (vitest side of the jest.integration.config.js suite).
// Only specs listed in tests/vitest-migrated.json run here; jest keeps the rest.
export default defineConfig({
  plugins,
  resolve: resolveOptions,
  test: {
    ...baseTest,
    environment: 'node',
    // for specs that opt into jsdom via an @vitest-environment docblock
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: migrated('tests/integration/'),
    setupFiles: [
      './tests/init/vitest-env-setup.mjs',
      './tests/init/vitest-integration-setup.mjs',
    ],
    // jest.setTimeout(...) raised jest's hook timeout too; vitest splits test and
    // hook timeouts. Containers/DB setup start in beforeAll, so keep hooks roomy.
    hookTimeout: 120000,
  },
})
