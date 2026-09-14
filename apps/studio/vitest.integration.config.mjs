import { defineConfig } from 'vitest/config'
import { plugins, resolveOptions, baseTest } from './vitest.shared.mjs'

// Integration tests (vitest side of the jest.integration.config.js suite).
// Specs live under tests/vitest/integration/; jest keeps everything still in
// tests/integration/.
export default defineConfig({
  plugins,
  resolve: resolveOptions,
  test: {
    ...baseTest,
    environment: 'node',
    // for specs that opt into jsdom via an @vitest-environment docblock
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: ['tests/vitest/integration/**/*.spec.?([mc])[jt]s?(x)'],
    setupFiles: [
      './tests/init/vitest-env-setup.mjs',
      './tests/init/vitest-integration-setup.mjs',
    ],
    // jest.setTimeout(...) raised jest's hook timeout too; vitest splits test and
    // hook timeouts. Containers/DB setup start in beforeAll, so keep hooks roomy.
    hookTimeout: 120000,
  },
})
