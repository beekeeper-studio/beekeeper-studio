import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { OpenTab } from '@/common/appdb/models/OpenTab'
import { UsedQuery } from '@/common/appdb/models/used_query'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers'

const WORKSPACE_ID = -1

// Tabs, pins, hidden entities and query history are all keyed on a
// saved_connection id. null, 0 and -1 all mean "no connection" - a session on
// a connection that was never saved, or a caller that lost track of the id.
// None of them may be written or matched: -1 is a shared bucket every unsaved
// session would pile into, and an absent id drops out of a TypeORM criteria
// object entirely, turning a scoped delete into "every connection's rows".
const NO_CONNECTION = [null, undefined, 0, -1]

async function savedConnection() {
  const c = new SavedConnection()
  c.connectionType = 'postgresql'
  c.name = 'My Conn'
  c.host = 'db.example.com'
  await c.save()
  return c
}

async function openTabFor(connectionId: number, title: string, deletedAt?: Date) {
  const tab = new OpenTab()
  tab.tabType = 'query'
  tab.title = title
  tab.connectionId = connectionId
  tab.workspaceId = WORKSPACE_ID
  tab.position = 1
  tab.unsavedQueryText = 'select 1'
  await tab.save()

  if (deletedAt) {
    await OpenTab.getRepository().createQueryBuilder()
      .update().set({ deletedAt }).where('id = :id', { id: tab.id }).execute()
  }
  return tab
}

describe('connection-scoped writes', () => {
  beforeEach(async () => await TestOrmConnection.connect())
  afterEach(async () => await TestOrmConnection.disconnect())

  it.each(NO_CONNECTION)('clearDeletedTabs(%p) deletes nothing', async (connectionId) => {
    const saved = await savedConnection()
    const longAgo = new Date()
    longAgo.setDate(longAgo.getDate() - 30)
    await openTabFor(saved.id, 'closed tab', longAgo)

    await TabHistoryHandlers['appdb/tabhistory/clearDeletedTabs']({
      workspaceId: WORKSPACE_ID,
      connectionId,
    } as any)

    expect(await OpenTab.count({ withDeleted: true })).toBe(1)
  })

  it.each(NO_CONNECTION)('does not save a tab keyed on %p', async (connectionId) => {
    await AppDbHandlers['appdb/tabs/save']({
      obj: {
        tabType: 'query', title: 'scratch', position: 1,
        connectionId, workspaceId: WORKSPACE_ID,
      },
      options: {},
    } as any)

    expect(await OpenTab.count({ withDeleted: true })).toBe(0)
  })

  it.each(NO_CONNECTION)('does not save query history keyed on %p', async (connectionId) => {
    await AppDbHandlers['appdb/usedQuery/save']({
      obj: { text: 'select 1', connectionId, workspaceId: WORKSPACE_ID },
      options: {},
    } as any)

    expect(await UsedQuery.count()).toBe(0)
  })

  it('still saves against a real connection', async () => {
    const saved = await savedConnection()

    const tab = await AppDbHandlers['appdb/tabs/save']({
      obj: {
        tabType: 'query', title: 'real tab', position: 1,
        connectionId: saved.id, workspaceId: WORKSPACE_ID,
      },
      options: {},
    } as any)

    expect(tab.id).toBeTruthy()
    expect(await OpenTab.count()).toBe(1)
  })
})
