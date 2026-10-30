import { describe, it, expect } from 'vitest'
import { sanitizeForJson } from '@/lib/cli/json'

describe('sanitizeForJson', () => {
  it('passes plain json through', () => {
    const value = { a: 1, b: 'two', c: [true, null, 1.5], d: { e: 'f' } }
    expect(sanitizeForJson(value)).toEqual(value)
    expect(JSON.stringify(sanitizeForJson(value))).toBe(JSON.stringify(value))
  })

  it('turns undefined, NaN and functions into null', () => {
    expect(sanitizeForJson(undefined)).toBeNull()
    expect(sanitizeForJson({ a: undefined, b: NaN, c: () => 1 })).toEqual({ a: null, b: null, c: null })
    expect(sanitizeForJson([undefined, Infinity])).toEqual([null, null])
  })

  it('converts bigints to numbers when safe, strings otherwise', () => {
    expect(sanitizeForJson(BigInt(42))).toBe(42)
    expect(sanitizeForJson(BigInt(-7))).toBe(-7)
    const huge = BigInt('9007199254740993')
    expect(sanitizeForJson(huge)).toBe('9007199254740993')
    expect(() => JSON.stringify(sanitizeForJson({ n: huge }))).not.toThrow()
  })

  it('encodes binary values as hex', () => {
    expect(sanitizeForJson(Buffer.from('deadbeef', 'hex'))).toEqual({ type: 'binary', encoding: 'hex', data: 'deadbeef' })
    expect(sanitizeForJson(new Uint8Array([1, 2, 255]))).toEqual({ type: 'binary', encoding: 'hex', data: '0102ff' })
    const view = new Uint8Array(new Uint8Array([9, 9, 1, 2]).buffer, 2, 2)
    expect(sanitizeForJson(view).data).toBe('0102')
  })

  it('formats dates as iso strings', () => {
    expect(sanitizeForJson(new Date(Date.UTC(2024, 0, 2, 3, 4, 5)))).toBe('2024-01-02T03:04:05.000Z')
    expect(sanitizeForJson(new Date('nope'))).toBeNull()
  })

  it('handles maps, sets and objects with toJSON', () => {
    expect(sanitizeForJson(new Map([['a', 1]]))).toEqual({ a: 1 })
    expect(sanitizeForJson(new Set([1, 2]))).toEqual([1, 2])
    expect(sanitizeForJson({ toJSON: () => ({ decimal: '1.50' }) })).toEqual({ decimal: '1.50' })
  })

  it('does not loop on circular references but keeps shared ones', () => {
    const shared = { x: 1 }
    const circular: any = { shared, again: shared }
    circular.self = circular
    expect(sanitizeForJson(circular)).toEqual({ shared: { x: 1 }, again: { x: 1 }, self: '[circular]' })
  })
})
