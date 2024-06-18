import { parseIndexColumn, testOnly } from '../../../../../src/lib/db/clients/mysql'


describe("MySQL UNIT tests (no connection required)", () => {
  it("should pass a canary test", () => {
    expect(1).toBe(1)
  })

  it("should parse empty fields", () => {
    const expected = []
    const result = testOnly.parseFields(undefined, false)
    expect(result).toMatchObject(expected)
    expect(testOnly.parseFields(undefined, true)).toMatchObject(expected)
  })

  it("should parse object fields", () => {
    const expected = [{ id: 'name', name: 'name'}]
    const result = testOnly.parseFields([{name: 'name'}])
    expect(result).toMatchObject(expected)
  })

  it("should parse index column for alter index", () => {
    const samples = {
      "title": { name: 'title', order: 'ASC', prefix: null },
      "title DESC": { name: 'title', order: 'DESC', prefix: null },
      "title(10) DESC": { name: 'title', order: 'DESC', prefix: 10 },
      "title (10) DESC": { name: 'title', order: 'DESC', prefix: 10 },
      // "desc(5)": { name: 'desc(5)', order: 'ASC', prefix: null },
      // "desc(5)(5)": { name: 'desc(5)', order: 'ASC', prefix: '5' },
      // "desc(5) (5)": { name: 'desc(5)', order: 'ASC', prefix: '5' },
    }
    for (const [input, output] of Object.entries(samples)) {
      expect(parseIndexColumn(input)).toMatchObject(output)
    }
  })

})
