import data_converter from "../../../src/mixins/data_converter"


describe("data converter", () => {
  it("Should convert a regular result object", () => {
    const rows = [
      {foo: 1, bar: 2, ignoreme: 3},
      {foo: 3, bar: 4}
    ]

    const data = { rows }

    const columns = [
      { field: "foo" },
      { field: 'bar' }
    ]

    const expected = [
      { foo: 1, bar: 2},
      { foo: 3, bar: 4}
    ]

    const result = data_converter.methods.dataToTableData(data, columns)
    expect(result).toStrictEqual(expected)
  })

  it("Should convert an array result", () => {
    const rows = [
      [1,2,3],
      [3,4]
    ]
    const data = { rows }
    const columns = [
      { field: 'f0', title: 'foo'},
      { field: 'f1', title: 'bar' }
    ]
    const expected = [
      { f0: 1, f1: 2},
      { f0: 3, f1: 4}
    ]
    const result = data_converter.methods.dataToTableData(data, columns)
    expect(result).toStrictEqual(expected)
  })
})