import { testOnly } from '../../../../../src/lib/db/clients/postgresql'


describe("Postgres UNIT tests (no connection required)", () => {
  it("should pass a canary test", () => {
    expect(1).toBe(1)
  })

  it("Should parseRowQueryResult when array", () => {
    const f = testOnly.parseRowQueryResult
    const data = {
      command: 'SELECT',
      fields: [{name: 'foo'}],
      rows: [['bananas'], ['apples']]
    }

    const expected = {
      rows: [{c0: 'bananas'}, {c0: 'apples'}],
      fields: [{id: 'c0', name: 'foo', dataType: 'user-defined'}],
      rowCount: 2,
      affectedRows: undefined,
      command: 'SELECT'
    }
    expect(f(data, undefined, true)).toStrictEqual(expected)


  })

  it("should parseRowQueryResult when object", () => {
    const f = testOnly.parseRowQueryResult
    const data = {
      command: 'SELECT',
      fields: [{name: 'foo'}],
      rows: [{foo: 'bananas'}, {foo: 'apples'}]
    }

    const expected = {
      rows: [{foo: 'bananas'}, {foo: 'apples'}],
      fields: [{id: 'foo', name: 'foo', dataType: 'user-defined'}],
      rowCount: 2,
      affectedRows: undefined,
      command: 'SELECT'
    }
    expect(f(data, undefined, false)).toStrictEqual(expected)
  })
})