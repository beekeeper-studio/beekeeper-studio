import { defineConfig } from 'vitest/config'
import { plugins, resolveOptions, baseTest } from './vitest.shared.mjs'

// Unit tests (vitest side of the jest.config.js suite). Specs live under
// tests/vitest/unit/; jest keeps everything still in tests/unit/.
export default defineConfig({
  plugins,
  resolve: resolveOptions,
  test: {
    ...baseTest,
    environment: 'jsdom',
    // jest ran jsdom at http://localhost; vitest's default differs
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: ['tests/vitest/unit/**/*.spec.?([mc])[jt]s?(x)'],
    setupFiles: ['./tests/init/vitest-env-setup.mjs', './tests/init/setup.js'],
  },
})
