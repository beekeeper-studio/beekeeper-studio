import mutators from "../../../src/mixins/data_mutators"


describe("cellFormatter", () => {

  it("Should only render escaped html", () => {
    const input = {
      getValue: () => '<a>foo</a>'
    }

    const formatted = mutators.methods.cellFormatter(input)

    expect(formatted).toBe('<pre>&lt;a&gt;foo&lt;/a&gt;</pre>')

  })

})