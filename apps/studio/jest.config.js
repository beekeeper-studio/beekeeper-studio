const path = require('path')
const { resolve } = require('path')
const { defaults } = require('jest-config')

module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  transformIgnorePatterns: [
    'node_modules/(?!xel)'
  ],
  // transform: {
  //   "\\.js$": "<rootDir>/node_modules/babel-jest"
  // },
  moduleNameMapper: {
    '^@shared/(.*)$': resolve(__dirname, '../../shared/src/$1'),
    '^@/(.*)$': resolve(__dirname, 'src/$1')
  }
}
