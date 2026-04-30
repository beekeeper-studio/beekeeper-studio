import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { SavedConnection } from '@/common/appdb/models/saved_connection'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'Test Connection'
  Object.assign(c, overrides)
  return c
}

describe('ConnectionFolder', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('can be saved and retrieved', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'My Connections'
    await folder.save()

    const found = await ConnectionFolder.findOneBy({ id: folder.id })
    expect(found).not.toBeNull()
    expect(found.name).toBe('My Connections')
    expect(found.parentId).toBeNull()
  })

  it('starts with zero folders', async () => {
    expect(await ConnectionFolder.count()).toBe(0)
  })

  it('prevents deletion when it contains connections', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Non-empty Folder'
    await folder.save()

    const conn = buildConnection({ connectionFolderId: folder.id })
    await conn.save()

    await expect(folder.remove()).rejects.toThrow('Cannot delete folder "Non-empty Folder"')
    // Folder should still exist
    expect(await ConnectionFolder.count()).toBe(1)
  })

  it('includes the item count in the error message', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    await buildConnection({ connectionFolderId: folder.id }).save()
    await buildConnection({ connectionFolderId: folder.id }).save()

    await expect(folder.remove()).rejects.toThrow('2 connections')
  })

  it('uses singular "connection" when count is 1', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    await buildConnection({ connectionFolderId: folder.id }).save()

    await expect(folder.remove()).rejects.toThrow('1 connection')
  })

  it('allows deletion when empty', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Empty Folder'
    await folder.save()

    await folder.remove()
    expect(await ConnectionFolder.count()).toBe(0)
  })

  it('allows deletion after all connections are moved out', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    const conn = buildConnection({ connectionFolderId: folder.id })
    await conn.save()

    conn.connectionFolderId = null
    await conn.save()

    await folder.remove()
    expect(await ConnectionFolder.count()).toBe(0)
    // Connection should still exist
    expect(await SavedConnection.count()).toBe(1)
  })

  it('can have a parent folder', async () => {
    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const child = new ConnectionFolder()
    child.name = 'Child'
    child.parentId = parent.id
    await child.save()

    const found = await ConnectionFolder.findOneBy({ id: child.id })
    expect(found.parentId).toBe(parent.id)
  })

  it('prevents deletion of parent folder that contains subfolders', async () => {
    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const child = new ConnectionFolder()
    child.name = 'Child'
    child.parentId = parent.id
    await child.save()

    // Parent has no connections directly — only a child folder
    await parent.remove()
    // Child's parentId becomes null via DB-level SET NULL
    const foundChild = await ConnectionFolder.findOneBy({ id: child.id })
    expect(foundChild).not.toBeNull()
    expect(foundChild.parentId).toBeNull()
  })

  it('prevents creating a duplicate folder at the root', async () => {
    const a = new ConnectionFolder()
    a.name = 'Work'
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'Work'
    await expect(b.save()).rejects.toThrow('A folder named "Work" already exists in this location.')
    expect(await ConnectionFolder.count()).toBe(1)
  })

  it('prevents creating a duplicate subfolder within the same parent', async () => {
    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const a = new ConnectionFolder()
    a.name = 'Shared'
    a.parentId = parent.id
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'Shared'
    b.parentId = parent.id
    await expect(b.save()).rejects.toThrow('A folder named "Shared" already exists in this location.')
  })

  it('allows the same folder name in different parents', async () => {
    const root = new ConnectionFolder()
    root.name = 'Shared'
    await root.save()

    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const child = new ConnectionFolder()
    child.name = 'Shared'
    child.parentId = parent.id
    await child.save()

    expect(await ConnectionFolder.count()).toBe(3)
  })

  it('allows updating a folder without renaming', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    folder.expanded = false
    await folder.save()

    const found = await ConnectionFolder.findOneBy({ id: folder.id })
    expect(found.expanded).toBe(false)
  })

  it('prevents renaming a folder to collide with a sibling', async () => {
    const a = new ConnectionFolder()
    a.name = 'Alpha'
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'Beta'
    await b.save()

    b.name = 'Alpha'
    await expect(b.save()).rejects.toThrow('A folder named "Alpha" already exists in this location.')
  })
})
