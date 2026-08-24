import { readFileSync } from 'fs'
import { resolve } from 'path'
import vue from 'vite-ng-plugin-vue2'
import viteConfig from './vite.config.mjs'

// Specs listed here run under vitest and are ignored by jest (the jest.*.config.js
// files read the same list). Migrating a spec = port its jest APIs + add it here.
export const migratedSpecs = JSON.parse(
  readFileSync(resolve(__dirname, 'tests/vitest-migrated.json'), 'utf8')
)

export function migrated(prefix) {
  return migratedSpecs.filter((p) => p.startsWith(prefix))
}

// Importing a .ini file yields its raw text as the default export.
// Replaces tests/transformers/jest-raw-text-transformer.js.
function rawIni() {
  return {
    name: 'bks:raw-ini',
    enforce: 'pre',
    load(id) {
      if (id.endsWith('.ini')) {
        return `export default ${JSON.stringify(readFileSync(id, 'utf8'))};`
      }
    },
  }
}

export const plugins = [vue(), rawIni()]

// Path aliases come from the renderer vite config (one source of truth for @,
// @shared, @commercial, assets) with test-only entries prepended — array form is
// first-match-wins:
// - @beekeeperstudio/ui-kit resolves to lib source, same as jest did; regex with
//   $ anchor because an object-form key is a prefix match and would also rewrite
//   subpath imports (@beekeeperstudio/ui-kit/vue/* must keep resolving through
//   the built dist, which needs `yarn lib:build` first, same as CI).
// - @tests exists only for tests.
// - @bksLogger maps to mainLogger (jest parity); the renderer's rendererLogger
//   entry is filtered out rather than shadowed.
// Not ported from jest's moduleNameMapper (CJS-resolver workarounds; vitest
// resolves the packages' own `import` conditions): the
// @marimo-team/codemirror-languageserver stub and the @libsql/core -> lib-cjs
// remap. Re-add here if a migrated spec trips on them.
export const alias = [
  { find: /^@beekeeperstudio\/ui-kit$/, replacement: resolve(__dirname, '../ui-kit/lib/index.ts') },
  { find: /^@tests(.*)$/, replacement: resolve(__dirname, 'tests') + '$1' },
  { find: '@bksLogger', replacement: resolve(__dirname, 'src/lib/log/mainLogger.ts') },
  ...Object.entries(viteConfig.resolve.alias)
    .filter(([find]) => find !== '@bksLogger')
    .map(([find, replacement]) => ({ find, replacement })),
]

export const resolveOptions = {
  alias,
  // Same reasoning as apps/ui-kit/vite.config.ts: duplicate copies of vue break
  // $store/plugin injection and duplicate @codemirror/state copies break CM6.
  dedupe: ['vue', '@codemirror/state', '@codemirror/view'],
}

// pool 'forks' is what makes the electron-as-node wrapper work: tinypool forks
// process.execPath (the electron binary) and ELECTRON_RUN_AS_NODE=1 is inherited,
// so workers are node-mode electron with the right native-module ABI.
// fileParallelism false = jest maxWorkers: 1.
export const baseTest = {
  pool: 'forks',
  fileParallelism: false,
}
