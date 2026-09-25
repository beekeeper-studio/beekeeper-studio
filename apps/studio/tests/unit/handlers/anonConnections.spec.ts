import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { OpenTab } from '@/common/appdb/models/OpenTab'
import { PinnedEntity } from '@/common/appdb/models/PinnedEntity'
import { HiddenEntity } from '@/common/appdb/models/HiddenEntity'
import { HiddenSchema } from '@/common/appdb/models/HiddenSchema'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { connectionToSave } from '@/store/anonConnection'

const LOCAL_WORKSPACE = -1
const CLOUD_WORKSPACE = 5

// A session on a connection that was never saved runs on an anonymous saved
// connection (SavedConnection.anon): a real id for its tabs, pins and history
// to be keyed on, that's never listed and goes away on disconnect.

function unsavedConfig(overrides: any = {}): any {
  return {
    id: null,
    connectionType: 'postgresql',
    name: null,
    host: 'db.example.com',
    port: 5432,
    username: 'app',
    password: 'hunter2',
    sshPassword: 'ssh-secret',
    defaultDatabase: 'analytics',
    ...overrides,
  }
}

async function savedConnection(name = 'Prod') {
  const c = new SavedConnection()
  c.connectionType = 'postgresql'
  c.name = name
  c.host = 'prod.example.com'
  await c.save()
  return c
}

async function createAnon(config = unsavedConfig()): Promise<number> {
  return await AppDbHandlers['appdb/saved/createAnon']({ config })
}

// Session state as the core interface persists it: keyed on the connection
// and the workspace it belongs to.
async function sessionStateFor(connectionId: number, workspaceId = LOCAL_WORKSPACE) {
  const saved = { id: connectionId, workspaceId } as any

  const tab = new OpenTab()
  tab.tabType = 'query'
  tab.title = `tab for ${connectionId}`
  tab.connectionId = connectionId
  tab.workspaceId = workspaceId
  tab.position = 1
  await tab.save()

  const table = { name: 'users', schema: 'public', entityType: 'table' } as any
  await new PinnedEntity().withProps({ table, db: 'analytics', saved }).save()
  await new HiddenEntity().withProps({ table, db: 'analytics', saved }).save()
  await new HiddenSchema().withProps({ name: 'audit', db: 'analytics', saved }).save()
}

async function sessionStateCount(connectionId: number, workspaceId = LOCAL_WORKSPACE) {
  const where = { connectionId, workspaceId }
  return {
    tabs: await OpenTab.count({ where, withDeleted: true }),
    pins: await PinnedEntity.countBy(where),
    hiddenEntities: await HiddenEntity.countBy(where),
    hiddenSchemas: await HiddenSchema.countBy(where),
  }
}

const NOTHING = { tabs: 0, pins: 0, hiddenEntities: 0, hiddenSchemas: 0 }
const ONE_OF_EACH = { tabs: 1, pins: 1, hiddenEntities: 1, hiddenSchemas: 1 }

describe('anonymous connections', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  describe('createAnon', () => {
    it('stores only enough to identify the connection', async () => {
      const id = await createAnon(unsavedConfig({ connectionFolderId: 3 }))

      const anon = await SavedConnection.findOneBy({ id })
      expect(anon.anon).toBe(true)
      expect(anon.host).toBe('db.example.com')
      expect(anon.password).toBeNull()
      expect(anon.sshPassword).toBeNull()
      expect(anon.connectionFolderId).toBeNull()
      expect(anon.workspaceId).toBe(LOCAL_WORKSPACE)
    })

    it('never reuses a saved connection\'s id', async () => {
      const saved = await savedConnection()

      expect(await createAnon()).not.toEqual(saved.id)
    })
  })

  describe('listing saved connections', () => {
    let saved: SavedConnection
    let anonId: number

    beforeEach(async () => {
      saved = await savedConnection('Prod')
      anonId = await createAnon(unsavedConfig({ name: 'Prod copy' }))
    })

    const ids = (conns: any[]) => conns.map((c) => c.id)

    it('leaves anonymous connections out of find', async () => {
      expect(ids(await AppDbHandlers['appdb/saved/find']({}))).toEqual([saved.id])
      expect(ids(await AppDbHandlers['appdb/saved/find']({ options: { where: { host: 'db.example.com' } } }))).toEqual([])
    })

    it('leaves anonymous connections out of the folder tree', async () => {
      // how the sidebar and the import picker load the root of the tree
      const root = await AppDbHandlers['appdb/saved/find']({ options: { params: { connectionFolderIds: [] } } as any })

      expect(ids(root)).toEqual([saved.id])
    })

    it('leaves anonymous connections out of search and count', async () => {
      expect(ids(await AppDbHandlers['appdb/saved/search']({ searchText: 'prod' }))).toEqual([saved.id])
      expect(await AppDbHandlers['appdb/saved/count']({})).toBe(1)
    })

    it('still finds an anonymous connection by id, or when asked for one', async () => {
      expect((await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: anonId } })).id).toBe(anonId)
      expect(ids(await AppDbHandlers['appdb/saved/find']({ options: { where: { anon: true } } }))).toEqual([anonId])
    })
  })

  describe('removeAnon', () => {
    it('removes the connection and its session state', async () => {
      const anonId = await createAnon()
      await sessionStateFor(anonId)

      await AppDbHandlers['appdb/saved/removeAnon']({ id: anonId })

      expect(await SavedConnection.findOneBy({ id: anonId })).toBeNull()
      expect(await sessionStateCount(anonId)).toEqual(NOTHING)
    })

    it('leaves every other connection\'s session state alone', async () => {
      const saved = await savedConnection()
      await sessionStateFor(saved.id)
      const anonId = await createAnon()
      await sessionStateFor(anonId)
      // a cloud connection can have the same id as a local row
      await sessionStateFor(anonId, CLOUD_WORKSPACE)

      await AppDbHandlers['appdb/saved/removeAnon']({ id: anonId })

      expect(await sessionStateCount(saved.id)).toEqual(ONE_OF_EACH)
      expect(await sessionStateCount(anonId, CLOUD_WORKSPACE)).toEqual(ONE_OF_EACH)
    })

    it('keeps a connection that was saved during its session', async () => {
      const anonId = await createAnon()
      await sessionStateFor(anonId)
      // Save Connection from the core interface, on the local workspace
      const session = { ...unsavedConfig(), id: anonId, anon: true, name: 'Kept' }
      await AppDbHandlers['appdb/saved/save']({ obj: connectionToSave(session, false), options: {} })

      await AppDbHandlers['appdb/saved/removeAnon']({ id: anonId })

      const kept = await SavedConnection.findOneBy({ id: anonId })
      expect(kept.anon).toBe(false)
      expect(kept.name).toBe('Kept')
      expect(await sessionStateCount(anonId)).toEqual(ONE_OF_EACH)
      expect((await AppDbHandlers['appdb/saved/find']({})).map((c) => c.id)).toEqual([anonId])
    })

    it('does nothing without an id', async () => {
      const saved = await savedConnection()
      await sessionStateFor(saved.id)
      // another window's session
      const otherAnon = await createAnon()
      await sessionStateFor(otherAnon)

      // TypeORM drops a null/undefined from a where, so these would otherwise
      // match the other session's anonymous connection
      for (const id of [null, undefined, 0, -1]) {
        await AppDbHandlers['appdb/saved/removeAnon']({ id })
      }

      expect(await SavedConnection.count()).toBe(2)
      expect(await sessionStateCount(saved.id)).toEqual(ONE_OF_EACH)
      expect(await sessionStateCount(otherAnon)).toEqual(ONE_OF_EACH)
    })
  })

  it('never links a recent connection to an anonymous one', async () => {
    const anonId = await createAnon()
    // built the way the connection screen builds one
    const fresh = await AppDbHandlers['appdb/saved/new']({ init: unsavedConfig() })

    const used = await UsedConnection.recordUse({ ...fresh, id: anonId, anon: true })

    expect(used.connectionId).toBeNull()
  })
})
