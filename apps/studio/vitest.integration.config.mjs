import { configDefaults, defineConfig } from 'vitest/config'
import { plugins, resolveOptions, baseTest } from './vitest.shared.mjs'

// Integration tests. Specs live under tests/vitest/integration/. The codemirror
// specs need jsdom and have their own config (vitest.codemirror.config.mjs).
export default defineConfig({
  plugins,
  resolve: resolveOptions,
  test: {
    ...baseTest,
    environment: 'node',
    // for specs that opt into jsdom via an @vitest-environment docblock
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: ['tests/vitest/integration/**/*.spec.?([mc])[jt]s?(x)'],
    exclude: [...configDefaults.exclude, 'tests/vitest/integration/codemirror/**'],
    setupFiles: [
      './tests/init/vitest-env-setup.mjs',
      './tests/init/vitest-integration-setup.mjs',
    ],
    // Containers/DB setup start in beforeAll, so keep hooks roomy.
    hookTimeout: 120000,
  },
})
