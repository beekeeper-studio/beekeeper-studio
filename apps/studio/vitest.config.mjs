import { defineConfig } from 'vitest/config'
import { plugins, resolveOptions, baseTest, migrated } from './vitest.shared.mjs'

// Unit tests (vitest side of the jest.config.js suite). Only specs listed in
// tests/vitest-migrated.json run here; jest keeps the rest.
export default defineConfig({
  plugins,
  resolve: resolveOptions,
  test: {
    ...baseTest,
    environment: 'jsdom',
    // jest ran jsdom at http://localhost; vitest's default differs
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: migrated('tests/unit/'),
    setupFiles: ['./tests/init/vitest-env-setup.mjs', './tests/init/setup.js'],
  },
})
