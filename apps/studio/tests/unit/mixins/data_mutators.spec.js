import mutators from "../../../src/mixins/data_mutators"


describe("cellFormatter", () => {

  it("Should only render escaped html", () => {
    const input = {
      getValue: () => '<a>foo</a>'
    }

    const formatted = mutators.methods.cellFormatter(input)

    expect(formatted).toBe('<pre>&lt;a&gt;foo&lt;/a&gt;</pre>')

  })

  it('Should render a unixtime', () => {
    const input = {
      getValue: () => '8640000000000000',
    }

    const params = {
      isPK: false
    }

    const formatted = mutators.methods.cellFormatter(input, params)
    expect(formatted).toBe('<div class="cell-link-wrapper" title="+275760-09-13T00:00:00.000Z in unixtime">8640000000000000</div>')
    expect(mutators.methods.cellFormatter(input, { isPK: true })).toBe('<pre>8640000000000000</pre>')
  })

})