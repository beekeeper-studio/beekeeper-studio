import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { UsedQuery } from '@/common/appdb/models/used_query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

function buildUsedQuery(overrides: Partial<UsedQuery> = {}) {
  const query = new UsedQuery()
  query.text = 'select 1'
  query.excerpt = 'select 1'
  query.connectionId = 1
  Object.assign(query, overrides)
  return query
}

describe('UsedQuery', () => {
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

  it('searches full SQL beyond the excerpt without loading query text', async () => {
    const excerpt = `select ${' '.repeat(243)}`
    const matching = buildUsedQuery({
      excerpt,
      text: `${excerpt}from customer_orders`
    })
    const nonmatching = buildUsedQuery({
      text: 'select * from products',
      excerpt: 'select * from products'
    })
    await matching.save()
    await nonmatching.save()

    const results = await UsedQuery.search(UsedQuery, 'CuStOmEr')

    expect(results.map((query) => query.id)).toEqual([matching.id])
    expect(results[0].excerpt).toBe(excerpt)
    expect(results[0].text).toBeUndefined()
  })
})
