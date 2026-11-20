import { BeekeeperPlugin } from '@/plugins/BeekeeperPlugin'

describe('BeekeeperPlugin.jsonKeys', () => {
  it('maps each field to a unique key named after its column title', () => {
    // SELECT 1 num, 2 num, 3 num_2
    const columns = [
      { title: 'num', field: 'c0' },
      { title: 'num', field: 'c1' },
      { title: 'num_2', field: 'c2' },
    ]
    const keys = BeekeeperPlugin.jsonKeys(['c0', 'c1', 'c2'], columns)

    // the second "num" gets a suffix, skipping num_2 because a real column has that name
    expect(Object.fromEntries(keys)).toEqual({ c0: 'num', c1: 'num_3', c2: 'num_2' })
  })
})
