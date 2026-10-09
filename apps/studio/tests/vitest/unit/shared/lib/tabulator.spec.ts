import helpers, { MAX_CELL_CHARS } from '@/shared/lib/tabulator'

const toHex = (bytes: Uint8Array) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')

beforeAll(() => {
  (window as any).bksConfig = { ui: { general: { binaryEncoding: 'hex' } } }
})

describe('niceString', () => {
  it('keeps the legacy truncate length of 256', () => {
    expect(MAX_CELL_CHARS).toBe(256)
  })

  it('returns full binary conversion when truncate is false', () => {
    expect(helpers.niceString(new Uint8Array([1, 2, 3]), false, 'hex')).toBe('010203')
    expect(helpers.niceString(new Uint8Array([104, 105]), false, 'base64')).toBe('aGk=')
  })

  it('truncates large binaries to MAX_CELL_CHARS', () => {
    const bigBinary = Uint8Array.from({ length: 4096 }, (_, i) => i % 256)
    const result = helpers.niceString(bigBinary, true, 'hex')

    expect(result.length).toBe(MAX_CELL_CHARS)
    // truncated cells keep the `...` cue, same as an over-long string
    expect(result.endsWith('...')).toBe(true)
    // only the first bytes are needed to render a truncated cell
    expect(result.startsWith(toHex(bigBinary.subarray(0, 126)))).toBe(true)
  })

  it('never stringifies typed arrays element-by-element', () => {
    // Uint8Array.prototype.toString joins every element into a decimal string,
    // which for multi-MB blobs allocates ~4x the bytes as characters. The old
    // implementation called value.toString() before the binary branch, so pin
    // the fix with a poisoned toString.
    const u8 = new Uint8Array([1, 2, 3])
    Object.defineProperty(u8, 'toString', {
      value: () => { throw new Error('niceString must not call toString on typed arrays') },
    })

    expect(helpers.niceString(u8, true, 'hex')).toBe('010203')
    expect(helpers.niceString(u8, false, 'hex')).toBe('010203')
    // also via the mongodb-style wrapper branch
    expect(helpers.niceString({ buffer: u8 }, true, 'hex')).toBe('010203')
  })

  it('handles multi-MB binaries without touching the whole buffer', () => {
    const bigBinary = new Uint8Array(5 * 1024 * 1024)
    bigBinary[0] = 0xde
    bigBinary[1] = 0xad

    const result = helpers.niceString(bigBinary, true, 'hex')
    expect(result.length).toBe(MAX_CELL_CHARS)
    expect(result.startsWith('dead')).toBe(true)
  })

  it('truncates large wrapped buffers (mongodb style) to MAX_CELL_CHARS', () => {
    const value = { buffer: new Uint8Array(4096) }
    const result = helpers.niceString(value, true, 'hex')

    expect(result.length).toBe(MAX_CELL_CHARS)
  })

  it('marks truncated base64 binaries with an ellipsis too', () => {
    const bigBinary = Uint8Array.from({ length: 4096 }, (_, i) => i % 256)
    const result = helpers.niceString(bigBinary, true, 'base64')

    expect(result.length).toBe(MAX_CELL_CHARS)
    expect(result.endsWith('...')).toBe(true)
  })

  it('does not truncate a binary that exactly fills a cell', () => {
    // 128 bytes is exactly 256 hex chars -- the whole value fits, so no cue
    const exact = Uint8Array.from({ length: 128 }, (_, i) => i % 256)
    const result = helpers.niceString(exact, true, 'hex')

    expect(result).toBe(toHex(exact))
    expect(result.endsWith('...')).toBe(false)
  })

  it('does not truncate short values', () => {
    expect(helpers.niceString(new Uint8Array([1, 2]), true, 'hex')).toBe('0102')
    expect(helpers.niceString('foo', true)).toBe('foo')
  })

  it('stringifies scalars, arrays and objects like before', () => {
    expect(helpers.niceString(123, true)).toBe('123')
    expect(helpers.niceString(true, true)).toBe('true')
    expect(helpers.niceString('x'.repeat(300), true).length).toBe(MAX_CELL_CHARS)
    expect(helpers.niceString([1, 2], true)).toBe('[1,2]')
    expect(helpers.niceString({ a: 1 }, true)).toBe('{"a":1}')
  })
})

describe('cellFormatter', () => {
  const makeCell = (value: any) => ({ getValue: () => value })

  it('renders binaries as truncated hex instead of a decimal join', () => {
    expect(helpers.cellFormatter(makeCell(new Uint8Array([1, 2, 3])))).toBe('<pre>010203</pre>')
  })

  it('renders strings like before', () => {
    expect(helpers.cellFormatter(makeCell('foo'))).toBe('<pre>foo</pre>')
  })
})
