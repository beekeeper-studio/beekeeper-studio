const path = require('path')
const { resolve } = require('path')

module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  moduleNameMapper: {
    '^@shared/(.*)': resolve(__dirname, '../../shared/src/$1'),
    '^@/(.*)': resolve(__dirname, '../src/$1')
  }
}
