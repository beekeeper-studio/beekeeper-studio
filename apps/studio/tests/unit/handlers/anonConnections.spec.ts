import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

// A session on a connection that was never saved runs on an anonymous saved
// connection (SavedConnection.anon): a real id for its tabs, pins and history
// to be keyed on, that's never listed and goes away on disconnect.

async function newConfig(overrides: any = {}): Promise<any> {
  const fresh = await AppDbHandlers['appdb/saved/new']({ init: null })
  return {
    ...fresh,
    connectionType: 'postgresql',
    host: 'db.example.com',
    username: 'app',
    password: 'hunter2',
    sshPassword: 'ssh-secret',
    ...overrides,
  }
}

async function save(overrides: any = {}) {
  return await AppDbHandlers['appdb/saved/save']({ obj: await newConfig(overrides), options: {} })
}

describe('anonymous connections', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  describe('listing saved connections', () => {
    let saved: any
    let anon: any

    beforeEach(async () => {
      saved = await save({ name: 'Prod', host: 'prod.example.com' })
      anon = await save({ name: 'Prod copy', anon: true })
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

    it('leaves anonymous connections out of search', async () => {
      expect(ids(await AppDbHandlers['appdb/saved/search']({ searchText: 'prod' }))).toEqual([saved.id])
    })

    it('still finds an anonymous connection by id', async () => {
      expect((await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: anon.id } })).id).toBe(anon.id)
    })
  })

  describe('saving', () => {
    let folder: ConnectionFolder

    beforeEach(async () => {
      folder = new ConnectionFolder()
      folder.name = 'Work'
      await folder.save()
    })

    it('keeps no passwords or folder for an anonymous connection', async () => {
      const anon = await save({ name: 'x', anon: true, connectionFolderId: folder.id })

      const row = await SavedConnection.findOneBy({ id: anon.id })
      expect(row.password).toBeNull()
      expect(row.sshPassword).toBeNull()
      expect(row.connectionFolderId).toBeNull()
      // so the folder can still be deleted
      await expect(folder.remove()).resolves.toBeTruthy()
    })

    it('keeps them once it is saved for real', async () => {
      const anon = await save({ name: 'x', anon: true })

      await AppDbHandlers['appdb/saved/save']({
        obj: { ...(await newConfig()), id: anon.id, name: 'Kept', anon: false, connectionFolderId: folder.id },
        options: {},
      })

      const row = await SavedConnection.findOneBy({ id: anon.id })
      expect(row.password).toBe('hunter2')
      expect(row.connectionFolderId).toBe(folder.id)
    })
  })

  it('never links a recent connection to an anonymous one', async () => {
    const anon = await save({ name: 'x', anon: true })

    const used = await UsedConnection.recordUse({ ...(await newConfig()), id: anon.id, anon: true })

    expect(used.connectionId).toBeNull()
  })
})
