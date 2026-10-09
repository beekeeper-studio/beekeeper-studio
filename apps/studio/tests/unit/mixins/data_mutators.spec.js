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

describe("binary cell rendering", () => {

  const bigBinary = new Uint8Array(5 * 1024 * 1024)
  bigBinary[0] = 0xde
  bigBinary[1] = 0xad

  const makeCell = (value, params = {}) => ({
    getValue: () => value,
    getElement: () => document.createElement('a'),
    getColumn: () => ({ getDefinition: () => ({ binaryEncoding: 'hex', ...params }) }),
  })

  const hexOf = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')

  it('cellFormatter truncates large binaries to 256 chars', () => {
    const formatted = mutators.methods.cellFormatter(makeCell(bigBinary), { binaryEncoding: 'hex' })
    const content = formatted.replace(/^<pre>/, '').replace(/<\/pre>$/, '')

    expect(content.length).toBeLessThanOrEqual(256)
    expect(content.endsWith('...')).toBe(true)
    expect(content.startsWith(hexOf(bigBinary.subarray(0, 126)))).toBe(true)
  })

  it('cellFormatter renders small binaries in full', () => {
    expect(mutators.methods.cellFormatter(makeCell(new Uint8Array([1, 2])), { binaryEncoding: 'hex' })).toBe('<pre>0102</pre>')
  })

  it('cellTooltip previews large binaries without full conversion', () => {
    const tooltip = mutators.methods.cellTooltip(null, makeCell(bigBinary))

    // lodash truncate with length 15 keeps 12 chars + '...' omission
    expect(tooltip).toBe(`${hexOf(bigBinary.subarray(0, 6))}... (as hex string)`)
  })
})
