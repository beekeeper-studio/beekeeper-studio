import { openTargetsFromParsedArgs } from '@/background/lib/openTargets'

describe('openTargetsFromParsedArgs', () => {
  it('accepts positional connection URLs and database files', () => {
    const targets = openTargetsFromParsedArgs({
      _: ['postgresql://user@localhost/example', './example.db'],
    })

    expect(targets).toEqual([
      'postgresql://user@localhost/example',
      './example.db',
    ])
  })

  it('accepts long and short URL options', () => {
    const targets = openTargetsFromParsedArgs({
      _: [],
      url: 'mysql://user@localhost/example',
      u: 'redis://localhost',
    })

    expect(targets).toEqual([
      'mysql://user@localhost/example',
      'redis://localhost',
    ])
  })

  it('accepts repeated URL options and ignores non-string values', () => {
    const targets = openTargetsFromParsedArgs({
      _: [42, 'example.sqlite'],
      url: ['postgresql://localhost/first', true],
      u: ['postgresql://localhost/second', ''],
    })

    expect(targets).toEqual([
      'example.sqlite',
      'postgresql://localhost/first',
      'postgresql://localhost/second',
    ])
  })
})
