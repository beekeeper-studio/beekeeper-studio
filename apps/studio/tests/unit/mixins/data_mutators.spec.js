import mutators, { buildFormatterWithTooltip } from "../../../src/mixins/data_mutators"


describe("cellFormatter", () => {

  it("Should only render escaped html", () => {
    const input = {
      getValue: () => '<a>foo</a>',
      getElement: () => document.createElement('a'),

    }

    const formatted = mutators.methods.cellFormatter(input)

    expect(formatted).toBe('<pre>&lt;a&gt;foo&lt;/a&gt;</pre>')

  })

  it('Should render a unixtime', () => {
    const input = {
      getValue: () => '8640000000000000',
      getElement: () => document.createElement('a'),
    }

    const badInput = {
      getValue: () => '8640000000000005',
      getElement: () => document.createElement('a'),
    }

    const params = {
      isPK: false
    }

    const formatted = mutators.methods.cellFormatter(input, params)
    expect(formatted).toBe('<div class="cell-link-wrapper" title="+275760-09-13T00:00:00.000Z in unixtime">8640000000000000</div>')
    expect(mutators.methods.cellFormatter(input, { isPK: true })).toBe('<pre>8640000000000000</pre>')
    expect(mutators.methods.cellFormatter(badInput, params)).toBe('<pre>8640000000000005</pre>')
  })

  it('render tooltip with escaped html', () => {
    const formatted = buildFormatterWithTooltip('<a>ne-er do-well</a>', '<a>ne-er do-well</a>', 'launch')

    const shouldBe = '<div class="cell-link-wrapper">&lt;a&gt;ne-er do-well&lt;/a&gt;<i class="material-icons fk-link" title="&lt;a&gt;ne-er do-well&lt;/a&gt;">launch</i></div>'

    expect(formatted).toBe(shouldBe)
  })

})
