import { describe, it, expect } from 'vitest'
import {
  buildSessionVariablesQuery,
  parseSessionVariables,
  sessionVariablesFromUrl,
} from '@/lib/db/clients/mysql/sessionVariables'

describe('buildSessionVariablesQuery', () => {
  it('returns null with nothing to set', () => {
    expect(buildSessionVariablesQuery(undefined)).toBeNull()
    expect(buildSessionVariablesQuery([])).toBeNull()
    expect(buildSessionVariablesQuery([{ name: '  ', value: 'x' }])).toBeNull()
  })

  it('sets every variable in one statement', () => {
    const sql = buildSessionVariablesQuery([
      { name: 'collation_connection', value: 'utf8mb4_unicode_520_ci' },
      { name: ' wait_timeout ', value: ' 28800 ' },
    ])
    expect(sql).toBe(
      'SET SESSION collation_connection = utf8mb4_unicode_520_ci, SESSION wait_timeout = 28800'
    )
  })

  it.each([
    ['utf8mb4_unicode_520_ci', 'utf8mb4_unicode_520_ci'],
    ['ON', 'ON'],
    ['DEFAULT', 'DEFAULT'],
    ['-1', '-1'],
    ['0.5', '0.5'],
    ['READ-COMMITTED', "'READ-COMMITTED'"],
    ['+00:00', "'+00:00'"],
    ["'+00:00'", "'+00:00'"],
    ['"Europe/London"', "'Europe/London'"],
    ['STRICT_TRANS_TABLES,NO_ZERO_DATE', "'STRICT_TRANS_TABLES,NO_ZERO_DATE'"],
    ["''", "''"],
    ['', "''"],
  ])('formats %j as %s', (value, expected) => {
    expect(buildSessionVariablesQuery([{ name: 'v', value }])).toBe(`SET SESSION v = ${expected}`)
  })

  it('escapes values so they cannot break out of the string', () => {
    const sql = buildSessionVariablesQuery([{ name: 'sql_mode', value: "x'; DROP TABLE users; --" }])
    expect(sql).toBe("SET SESSION sql_mode = 'x\\'; DROP TABLE users; --'")
  })

  it('accepts component-scoped names', () => {
    expect(buildSessionVariablesQuery([{ name: 'component.var_1', value: '1' }]))
      .toBe('SET SESSION component.var_1 = 1')
  })

  it.each(['sql mode', 'a;b', '@@sql_mode', '1abc', 'a.b.c', 'x=1'])(
    'rejects the invalid name %j',
    (name) => {
      expect(() => buildSessionVariablesQuery([{ name, value: '1' }]))
        .toThrow(/Invalid session variable name/)
    }
  )
})

describe('parseSessionVariables', () => {
  it('splits on commas and semicolons outside of quotes', () => {
    expect(parseSessionVariables("a=1, b='x,y';c=\"p;q\"")).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: "'x,y'" },
      { name: 'c', value: '"p;q"' },
    ])
  })

  it('keeps everything after the first = in the value', () => {
    expect(parseSessionVariables('optimizer_switch=index_merge=off')).toEqual([
      { name: 'optimizer_switch', value: 'index_merge=off' },
    ])
  })

  it('skips empty and malformed pairs', () => {
    expect(parseSessionVariables(',a=1,,novalue,=x,')).toEqual([{ name: 'a', value: '1' }])
  })
})

describe('sessionVariablesFromUrl', () => {
  it('reads the raw sessionVariables param', () => {
    expect(
      sessionVariablesFromUrl("mysql://host/db?ssl=true&sessionVariables=time_zone='+00:00',sql_mode=ANSI")
    ).toEqual([
      { name: 'time_zone', value: "'+00:00'" },
      { name: 'sql_mode', value: 'ANSI' },
    ])
  })

  it('decodes percent-encoded values', () => {
    expect(sessionVariablesFromUrl('mysql://host/db?sessionVariables=time_zone%3D%27%2B00%3A00%27'))
      .toEqual([{ name: 'time_zone', value: "'+00:00'" }])
  })

  it('returns nothing without the param', () => {
    expect(sessionVariablesFromUrl('mysql://host/db')).toEqual([])
    expect(sessionVariablesFromUrl('mysql://host/db?ssl=true')).toEqual([])
  })
})
