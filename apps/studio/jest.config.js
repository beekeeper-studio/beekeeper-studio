/* eslint-disable */
const path = require('path')
const { resolve } = require('path')
/* eslint-enable */

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  maxWorkers: 1,

  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'mjs',
    // tell Jest to handle *.vue files
    'vue',
    'ts',
    'mjs',
  ],
  transformIgnorePatterns: ['node_modules/(?!uuid)/'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/dist_electron/',
  ],
  // support the same @ -> src alias mapping in source code
  moduleNameMapper: {
    '^@libsql/core/(.*)': resolve(__dirname, '../../node_modules/@libsql/core/lib-cjs/$1'),
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared(.*)$': '<rootDir>/src/shared/$1',
    '^@commercial(.*)$': '<rootDir>/src-commercial/$1',
    '^@bksLogger$': '<rootDir>/src/lib/log/bksLogger.ts',
    '^@tests(.*)$': '<rootDir>/tests/$1',
  },
  // serializer for snapshots
  snapshotSerializers: [
    'jest-serializer-vue'
  ],
  testMatch: [
    '**/tests/unit/**/*.spec.[jt]s?(x)',
    '**/__tests__/*.[jt]s?(x)'
  ],
  // https://github.com/facebook/jest/issues/6766
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname')
  ],
  transform: {
    // NOTE (@day): this won't work anymore, need to switch to vite
    // '^.+\\.vue$': require.resolve('@vue/vue2-jest'),
    '^.+\\.vue$': require.resolve('@vue/vue2-jest'),
    '.+\\.(css|styl|less|sass|scss|jpg|jpeg|png|svg|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|avif)$':
      require.resolve('jest-transform-stub'),
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '^.+\\.mjs$': require.resolve('babel-jest'),
    '^.+\\.tsx?$': [require.resolve('ts-jest'), { babelConfig: true, isolatedModules: true}],
    '^.+\\.ini$': '<rootDir>/tests/transformers/jest-raw-text-transformer.js',
  },
  setupFilesAfterEnv: ['./tests/init/setup.js'],
  setupFiles: ['./tests/init/env-setup.js'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: "http://localhost",
    "browsers": [
      "chrome",
    ]
  },

}
