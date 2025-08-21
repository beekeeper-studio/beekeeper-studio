import mutators, { buildFormatterWithTooltip } from "../../../src/mixins/data_mutators"


describe("cellFormatter", () => {

  it("Should only render escaped html", () => {
    const input = {
      getValue: () => '<a>foo</a>',
      getElement: () => document.createElement('a'),
      getColumn: () => ({ getDefinition: () => ({ binaryEncoding: 'base64' }) }),
    }

    const formatted = mutators.methods.cellFormatter(input)

    expect(formatted).toBe('<pre>&lt;a&gt;foo&lt;/a&gt;</pre>')

  })

  it('tooltip render a unixtime', () => {
    const params = {
      formatterParams : {
        fk: false,
        fkOnClick: () => null,
        isPK: false
      }
    }
    const paramsHavePk = {
      formatterParams : {
        fk: false,
        fkOnClick: () => null,
        isPK: true
      }
    }

    const input = {
      getValue: () => '8640000000000000',
      getElement: () => document.createElement('a'),
      getColumn: () => ({ getDefinition: () => params }),
    }

    const inputPK = {
      getValue: () => '8640000000000000',
      getElement: () => document.createElement('a'),
      getColumn: () => ({ getDefinition: () => paramsHavePk}),
    }

    const badInput = {
      getValue: () => '8640000000000005',
      getElement: () => document.createElement('a'),
      getColumn: () => ({ getDefinition: () => params }),
    }

    expect(mutators.methods.cellTooltip(null, input)).toBe('8640000000000000 (+275760-09-13T00:00:00.000Z in unixtime)')
    expect(mutators.methods.cellTooltip(null, inputPK)).toBe('8640000000000000')
    expect(mutators.methods.cellTooltip(null, badInput)).toBe('8640000000000005')
  })

  it('render tooltip with escaped html', () => {
    const formatted = buildFormatterWithTooltip('<a>ne-er do-well</a>', '<a>ne-er do-well</a>', 'launch')

    const shouldBe = '<div class="cell-link-wrapper">&lt;a&gt;ne-er do-well&lt;/a&gt;<i class="material-icons fk-link" title="&lt;a&gt;ne-er do-well&lt;/a&gt;">launch</i></div>'

    expect(formatted).toBe(shouldBe)
  })

})
