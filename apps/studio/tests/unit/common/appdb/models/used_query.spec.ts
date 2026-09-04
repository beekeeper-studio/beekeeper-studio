import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { UsedQuery } from '@/common/appdb/models/used_query'

function buildUsedQuery(overrides: Partial<UsedQuery> = {}) {
  const query = new UsedQuery()
  query.text = 'select 1'
  query.excerpt = 'select 1'
  query.connectionId = 1
  Object.assign(query, overrides)
  return query
}

describe('UsedQuery origin fields', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('defaults new history records to app origin', async () => {
    const query = buildUsedQuery()
    await query.save()

    const saved = await UsedQuery.findOneBy({ id: query.id })
    expect(saved.origin).toBe('app')
  })

  it('persists plugin origin and plugin ID', async () => {
    const query = buildUsedQuery({
      origin: 'plugin',
      pluginId: 'example-plugin'
    })
    await query.save()

    const saved = await UsedQuery.findOneBy({ id: query.id })
    expect(saved.origin).toBe('plugin')
    expect(saved.pluginId).toBe('example-plugin')
  })
})
