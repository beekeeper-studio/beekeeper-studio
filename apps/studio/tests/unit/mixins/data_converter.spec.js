import data_converter from "../../../src/mixins/data_converter"


describe("data converter", () => {
  it("Should convert a regular result object", () => {
    const rows = [
      {foo: 1, bar: [2.1, 2.2], ignoreme: 3},
      {foo: 3, bar: [4.1, 4.2]},
    ]

    const data = { rows }

    const columns = [
      { field: "foo" },
      { field: 'bar' }
    ]

    const expected = [
      { foo: 1, bar: '{2.1,2.2}' },
      { foo: 3, bar: '{4.1,4.2}' },
    ]

    const result = data_converter.methods.dataToTableData(data, columns)
    expect(result).toStrictEqual(expected)
  })
})
