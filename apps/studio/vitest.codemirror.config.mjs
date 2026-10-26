import { defineConfig } from 'vitest/config'
import { plugins, resolveOptions, baseTest } from './vitest.shared.mjs'

// `yarn test:codemirror`: the CodeMirror completion specs, which need a DOM
// plus the layout stubs in tests/vitest/integration/codemirror/setup.js.
export default defineConfig({
  plugins,
  resolve: resolveOptions,
  test: {
    ...baseTest,
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: ['tests/vitest/integration/codemirror/**/*.spec.?([mc])[jt]s?(x)'],
    setupFiles: [
      './tests/init/vitest-env-setup.mjs',
      './tests/init/setup.js',
      './tests/vitest/integration/codemirror/setup.js',
    ],
    hookTimeout: 120000,
  },
})
