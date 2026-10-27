import { describe, it, expect } from 'vitest'
import {
  assertJsonSerializable,
  serializeArray,
  serializeBigInt,
  serializeRow,
} from '@/services/plugin/utils'

describe('serializeBigInt', () => {
  it('converts safe bigints to numbers', () => {
    expect(serializeBigInt(BigInt(1))).toBe(1)
    expect(serializeBigInt(BigInt(-42))).toBe(-42)
    expect(serializeBigInt(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('converts unsafe bigints to strings without losing precision', () => {
    expect(serializeBigInt(BigInt('9007199254740992'))).toBe('9007199254740992')
    expect(serializeBigInt(BigInt('9223372036854775807'))).toBe('9223372036854775807')
    expect(serializeBigInt(BigInt('-9223372036854775808'))).toBe('-9223372036854775808')
  })

  it('passes other values through', () => {
    const obj = { a: 1 }
    expect(serializeBigInt(2.5)).toBe(2.5)
    expect(serializeBigInt('x')).toBe('x')
    expect(serializeBigInt(null)).toBe(null)
    expect(serializeBigInt(undefined)).toBe(undefined)
    expect(serializeBigInt(obj)).toBe(obj)
  })
})

describe('serializeArray', () => {
  it('serializes each item', () => {
    expect(serializeArray([BigInt(1), 'a', BigInt('9223372036854775807')]))
      .toEqual([1, 'a', '9223372036854775807'])
  })
})

describe('serializeRow', () => {
  it('serializes every value of the row', () => {
    const row = { a: BigInt(1), b: 2.5, c: 'x', d: null, e: BigInt('9223372036854775807') }
    const serialized = serializeRow(row)
    expect(serialized).toEqual({ a: 1, b: 2.5, c: 'x', d: null, e: '9223372036854775807' })
    expect(() => JSON.stringify(serialized)).not.toThrow()
  })
})

describe('assertJsonSerializable', () => {
  it('accepts JSON values', () => {
    expect(() => assertJsonSerializable({ rows: [{ a: 1 }] }, 'setData')).not.toThrow()
  })

  it('throws a readable error for bigints', () => {
    expect(() => assertJsonSerializable({ a: BigInt(1) }, 'setData'))
      .toThrow(/^setData value is not JSON-serializable: /)
  })
})
