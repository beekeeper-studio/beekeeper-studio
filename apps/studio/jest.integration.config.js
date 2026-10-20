/* eslint-disable */
const { resolve } = require('path')
/* eslint-enable */

// Jest now only runs the legacy integration tree (tests/integration/). Unit
// tests run under vitest (vitest.config.mjs); specs migrated to vitest live
// under tests/vitest/, which the testMatch below never reaches. See
// tests/VITEST_MIGRATION.md.
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  maxWorkers: 1,

  testPathIgnorePatterns: [
    "/codemirror/",
    "/tests/integration/macos/",
    '/node_modules/',
  ],

  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'mjs',
    // src (and ui-kit) imports can reach .vue files
    'vue',
    'ts',
  ],
  transformIgnorePatterns: ['node_modules/(?!uuid)/'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/dist_electron/',
  ],
  // support the same @ -> src alias mapping in source code
  moduleNameMapper: {
    '^@libsql/core/(.*)': resolve(__dirname, '../../node_modules/@libsql/core/lib-cjs/$1'),
    '^@marimo-team/codemirror-languageserver$':
      '<rootDir>/tests/__mocks__/marimo-codemirror-languageserver.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared(.*)$': '<rootDir>/src/shared/$1',
    '^@commercial(.*)$': '<rootDir>/src-commercial/$1',
    '^@bksLogger$': '<rootDir>/src/lib/log/mainLogger.ts',
    '^@tests(.*)$': '<rootDir>/tests/$1',
    '^@beekeeperstudio/ui-kit$': resolve(__dirname, '../ui-kit/lib/index.ts'),
  },
  testMatch: ["**/tests/integration/**/*.spec.[jt]s?(x)"],
  transform: {
    '^.+\\.vue$': require.resolve('@vue/vue2-jest'),
    '.+\\.(css|styl|less|sass|scss|jpg|jpeg|png|svg|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|avif)$':
      require.resolve('jest-transform-stub'),
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '^.+\\.mjs$': require.resolve('babel-jest'),
    '^.+\\.tsx?$': [require.resolve('ts-jest'), { babelConfig: true, isolatedModules: true}],
    '^.+\\.ini$': '<rootDir>/tests/transformers/jest-raw-text-transformer.js',
  },
  setupFiles: ['./tests/init/env-setup.js'],
  testEnvironment: 'node',
  silent: false,
  globals: {
    fetch: global.fetch,
    // just to keep config.ts happy in debug mode
    localStorage: {}
  },
}
