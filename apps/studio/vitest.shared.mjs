import { readFileSync } from 'fs'
import { resolve } from 'path'
import vue from 'vite-ng-plugin-vue2'

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

// Ports jest.config.js moduleNameMapper. Array form: order matters, regexes keep
// jest's anchored semantics. The ui-kit alias points at lib source, same as jest;
// subpath imports (@beekeeperstudio/ui-kit/vue/*) fall through to the workspace
// package's exports map, which needs `yarn lib:build` first (same as CI).
// Not ported (jest CJS-resolver workarounds; vitest resolves the packages' own
// `import` conditions): the @marimo-team/codemirror-languageserver stub and the
// @libsql/core -> lib-cjs remap. Re-add here if a migrated spec trips on them.
export const alias = [
  { find: /^@beekeeperstudio\/ui-kit$/, replacement: resolve(__dirname, '../ui-kit/lib/index.ts') },
  { find: /^@shared(.*)$/, replacement: resolve(__dirname, 'src/shared') + '$1' },
  { find: /^@commercial(.*)$/, replacement: resolve(__dirname, 'src-commercial') + '$1' },
  { find: /^@tests(.*)$/, replacement: resolve(__dirname, 'tests') + '$1' },
  { find: '@bksLogger', replacement: resolve(__dirname, 'src/lib/log/mainLogger.ts') },
  { find: 'assets', replacement: resolve(__dirname, 'src/assets') },
  { find: /^@\/(.*)$/, replacement: resolve(__dirname, 'src') + '/$1' },
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
