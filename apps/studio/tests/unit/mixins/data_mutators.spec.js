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

describe("relativeTimeFor", () => {
  // $bks.timeAgo is provided app-wide by BeekeeperPlugin
  const ctx = { $bks: { timeAgo: () => '3 days ago' } }
  const relativeTimeFor = (dt, v) => mutators.methods.relativeTimeFor.call(ctx, dt, v)

  it("should describe date columns relative to now", () => {
    expect(relativeTimeFor('timestamp with time zone', '2026-08-09T14:30:00Z')).toBe('3 days ago')
    expect(relativeTimeFor('date', new Date('2026-08-09'))).toBe('3 days ago')
  })

  it("should ignore non-date columns", () => {
    expect(relativeTimeFor('text', '2026-08-09')).toBe(null)
    expect(relativeTimeFor('int4', 123)).toBe(null)
  })

  // Intervals are durations, not points in time
  it("should ignore intervals", () => {
    expect(relativeTimeFor('interval', '1 day')).toBe(null)
    expect(relativeTimeFor('interval year to month', '1 year')).toBe(null)
  })

  it("should handle missing or unparseable values", () => {
    expect(relativeTimeFor(undefined, '2026-08-09')).toBe(null)
    expect(relativeTimeFor('date', null)).toBe(null)
    expect(relativeTimeFor('date', 'not a date')).toBe(null)
  })
})
