import { describe, it, expect } from 'vitest'
import { uniqueColumnNames } from '@/common/utils'

describe('uniqueColumnNames', () => {
  it('suffixes duplicates in order', () => {
    expect(uniqueColumnNames(['a', 'b', 'a', 'a'])).toEqual(['a', 'b', 'a_2', 'a_3'])
    expect(uniqueColumnNames([undefined as any, undefined as any])).toEqual(['', '_2'])
  })
})
