import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'Test Connection'
  Object.assign(c, overrides)
  return c
}

describe('AppDbHandlers - appdb/saved/save', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('preserves connectionFolderId in the returned result', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Work'
    await folder.save()

    const conn = buildConnection()
    await conn.save()

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, connectionFolderId: folder.id },
      options: undefined
    })

    expect(result.connectionFolderId).toBe(folder.id)
  })

  it('writes connectionFolderId to the database', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Staging'
    await folder.save()

    const conn = buildConnection()
    await conn.save()

    await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, connectionFolderId: folder.id },
      options: undefined
    })

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.connectionFolderId).toBe(folder.id)
  })

  it('can move a connection from one folder to another', async () => {
    const folderA = new ConnectionFolder()
    folderA.name = 'Folder A'
    await folderA.save()

    const folderB = new ConnectionFolder()
    folderB.name = 'Folder B'
    await folderB.save()

    const conn = buildConnection({ connectionFolderId: folderA.id })
    await conn.save()

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, connectionFolderId: folderB.id },
      options: undefined
    })

    expect(result.connectionFolderId).toBe(folderB.id)

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.connectionFolderId).toBe(folderB.id)
  })

  it('rejects saving a new connection with no name', async () => {
    const conn = buildConnection()
    delete conn.name

    await expect(
      AppDbHandlers['appdb/saved/save']({ obj: conn, options: undefined })
    ).rejects.toThrow(/name/i)

    expect(await SavedConnection.count()).toBe(0)
  })

  it('rejects saving a new connection with an empty-string name', async () => {
    const conn = buildConnection({ name: '' })

    await expect(
      AppDbHandlers['appdb/saved/save']({ obj: conn, options: undefined })
    ).rejects.toThrow(/name/i)

    expect(await SavedConnection.count()).toBe(0)
  })

  it('rejects updating an existing connection to have no name', async () => {
    const conn = buildConnection()
    await conn.save()

    await expect(
      AppDbHandlers['appdb/saved/save']({
        obj: { ...conn, name: '' },
        options: undefined
      })
    ).rejects.toThrow(/name/i)

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.name).toBe('Test Connection')
  })

  it('rejects saving a batch when any connection has no name', async () => {
    const good = buildConnection({ name: 'Good One' })
    const bad = buildConnection({ name: '' })

    await expect(
      AppDbHandlers['appdb/saved/save']({ obj: [good, bad], options: undefined })
    ).rejects.toThrow(/name/i)

    expect(await SavedConnection.count()).toBe(0)
  })
})
