const path = require('path')

module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  }

}
