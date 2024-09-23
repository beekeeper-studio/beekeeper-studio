import { checkEmptyFilters, isBlank } from "@/common/utils"


describe("isBlank", () => {
  it("should be truthy for obviously blank things", () => {
    const list = ['', null, undefined, {}, new Set(), NaN]

    list.forEach((i) => expect(isBlank(i)).toBe(true))
  })

  it("should be falsy for numbers and such", () => {
    const list = [0, ' ', '123', { a: 1}, new Set([1, 2, 3])]
    list.forEach((i) => expect(isBlank(i)).toBe(false))
  })
})

describe("checkEmptyFilters", () => {

  const truthyCases = [
    [[{ type: '>', value: '' }], true],
    [[{ type: '>', value: '' }, { type: '>', value: '' }], true],
    [[{ type: '>', value: null }], true],
    [[{ type: '>', value: undefined }], true],
    [[], true],
  ]

  const falsyCases = [
    [[{ type: '>', value: ' ' }], false],
    [[{ type: '>', value: 'foo' }, { type: '>', value: '' }], false],
    [[{ type: '>', value: '' }, { type: '>', value: 'foo' }], false],
    [[{ type: '>', value: 0 }], false],
    [[{ type: '>', value: '1,2,3' }], false],
    [[], true],
  ]

  const allCases = [...truthyCases, ...falsyCases]

  allCases.forEach(([input, expected]) => {
    it(`${JSON.stringify(input)} should produce: ${expected}`, () => {
      expect(checkEmptyFilters(input)).toBe(expected)
    })
  })




})
