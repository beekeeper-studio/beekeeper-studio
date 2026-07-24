const fs = require('fs')
const path = require('path')

const stylesheets = [
  path.resolve(__dirname, '../../../src/assets/styles/app/_layout.scss'),
  path.resolve(__dirname, '../../../../ui-kit/lib/styles/_layout.scss'),
]

describe('dropdown search styles', () => {
  test('hide selected vue-select text while searching', () => {
    const searchingSelectedRule = /&\.vs--searching\s+\.vs__selected\s*{[^}]*display:\s*none/

    for (const stylesheet of stylesheets) {
      expect(fs.readFileSync(stylesheet, 'utf8')).toMatch(searchingSelectedRule)
    }
  })
})
