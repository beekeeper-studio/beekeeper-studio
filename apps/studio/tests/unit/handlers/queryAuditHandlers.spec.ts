import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import { QueryAudit } from '@/common/appdb/models/QueryAudit'

async function saveQuery(obj: any) {
  return await AppDbHandlers['appdb/query/save']({ obj, options: undefined })
}

async function listAudits(queryId: number) {
  return await AppDbHandlers['appdb/queryAudit/find']({
    options: { where: { favoriteQueryId: queryId }, order: { revision: 'DESC' } },
  })
}

function newQuery(overrides: Record<string, any> = {}) {
  return { title: 'My Query', text: 'select 1', excerpt: 'select 1', ...overrides }
}

describe('Query audit handlers', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('records a create audit when a new query is saved', async () => {
    const saved = await saveQuery(newQuery())

    const audits = await listAudits(saved.id)
    expect(audits).toHaveLength(1)
    expect(audits[0].action).toBe('create')
    expect(audits[0].revision).toBe(1)
    expect(Number.isNaN(new Date(audits[0].createdAt).getTime())).toBe(false)
  })

  it('records an update audit when title or text changes', async () => {
    const saved = await saveQuery(newQuery())
    await saveQuery({ ...saved, text: 'select 2' })

    const audits = await listAudits(saved.id)
    expect(audits.map((a) => a.action)).toEqual(['update', 'create'])
    expect(audits[0].revision).toBe(2)
  })

  it('does not record an audit when nothing relevant changed', async () => {
    const saved = await saveQuery(newQuery())
    // Re-save with only a position change.
    await saveQuery({ ...saved, position: 5 })

    const audits = await listAudits(saved.id)
    expect(audits).toHaveLength(1)
  })

  it('records a create from current state when a query has no history yet', async () => {
    // Simulate a query whose history is missing (e.g. predates the feature;
    // real upgrades get a baseline via the migration backfill).
    const saved = await saveQuery(newQuery({ text: 'original' }))
    await QueryAudit.getRepository().delete({ favoriteQueryId: saved.id })
    expect(await QueryAudit.count()).toBe(0)

    await saveQuery({ ...saved, text: 'edited' })

    const audits = await listAudits(saved.id)
    expect(audits.map((a) => a.action)).toEqual(['create'])
    const detail = await AppDbHandlers['appdb/queryAudit/get']({
      queryId: saved.id,
      auditId: audits[0].id,
    })
    expect(detail.values.text).toBe('edited')
  })

  it('returns snapshot values, previousAuditId and changes from get', async () => {
    const saved = await saveQuery(newQuery({ text: 'select 1' }))
    await saveQuery({ ...saved, text: 'select 12' })

    const audits = await listAudits(saved.id)
    const latest = await AppDbHandlers['appdb/queryAudit/get']({
      queryId: saved.id,
      auditId: audits[0].id,
    })

    expect(latest.values.text).toBe('select 12')
    expect(latest.previousAuditId).toBe(audits[1].id)
    expect(latest.changedFields).toContain('text')
    expect(latest.changes.text).toEqual({ added: 1, removed: 0 })
  })

  it('restores a prior revision and records a new audit', async () => {
    const saved = await saveQuery(newQuery({ text: 'v1' }))
    await saveQuery({ ...saved, text: 'v2' })

    const audits = await listAudits(saved.id)
    const createAudit = audits.find((a) => a.action === 'create')

    const restored = await AppDbHandlers['appdb/queryAudit/restore']({
      queryId: saved.id,
      auditId: createAudit.id,
    })
    expect(restored.text).toBe('v1')

    const fromDb = await FavoriteQuery.getRepository()
      .createQueryBuilder('q')
      .select(['q.id', 'q.text'])
      .where('q.id = :id', { id: saved.id })
      .getOne()
    expect(fromDb.text).toBe('v1')

    const after = await listAudits(saved.id)
    expect(after).toHaveLength(3)
    expect(after[0].action).toBe('update')
  })

  it('deletes audits when the query is removed', async () => {
    const saved = await saveQuery(newQuery())
    await saveQuery({ ...saved, text: 'changed' })
    expect(await QueryAudit.count()).toBeGreaterThan(0)

    await AppDbHandlers['appdb/query/remove']({ obj: saved })

    expect(await QueryAudit.count()).toBe(0)
  })
})
